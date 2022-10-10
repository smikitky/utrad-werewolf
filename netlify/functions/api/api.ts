import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { config } from 'dotenv';
import fb from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import produce from 'immer';
import {
  AgentId,
  AgentInfo,
  AgentStatus,
  AttackVoteLogEntry,
  ChatLogEntry,
  DivineLogEntry,
  Game,
  GameStatus,
  LogEntry,
  OverLogEntry,
  roleCombinations,
  StatusLogEntry,
  StatusLogEvent,
  team,
  UserEntries,
  VoteLogEntry
} from '../../../src/game-data.js';
import { extractLogOfPeriod, shuffleArray } from '../../../src/game-utils.js';
import StatusEventHandler, {
  PushLog
} from './event-handlers/SatusEventHandler.js';
import showDivineResults from './event-handlers/showDivineResults.js';
import showGameResult from './event-handlers/showGameResult.js';
import showKilledResult from './event-handlers/showKilledResult.js';
import showMediumResults from './event-handlers/showMediumResults.js';
import checkChatFinish from './status-checkers/checkChatFinish.js';
import checkGameFinish from './status-checkers/checkGameFinish.js';
import checkPeriodFinish from './status-checkers/checkPeriodFinish.js';
import checkVoteFinish from './status-checkers/checkVoteFinish.js';
import StatusChecker from './status-checkers/StatusChecker.js';
import { now } from './utils.js';

config(); // Loads environment variables from .env file

if (!process.env.GCP_CREDENTIALS) throw new Error('GCP_CREDENTIALS is not set');
const credentials = JSON.parse(
  Buffer.from(process.env.GCP_CREDENTIALS, 'base64').toString()
);
fb.initializeApp({
  credential: fb.credential.cert(credentials),
  databaseURL: process.env.FB_DATABASE_URL
});
const db = fb.database();

export const jsonResponse = (
  status: number,
  data: string | object
): HandlerResponse => {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(typeof data === 'string' ? { message: data } : data)
  };
};

const assignRoles = (userIds: string[], count: number = 5): AgentInfo[] => {
  const roles = roleCombinations.get(count);
  if (!roles) throw jsonResponse(400, 'Invalid player count');
  const shuffled = shuffleArray(roles);
  return userIds.map((userId, i) => ({
    agentId: (i + 1) as AgentId,
    role: shuffled[i],
    name: `Agent[${i + 1}]`,
    life: 'alive',
    userId
  }));
};

const parseInput = (event: HandlerEvent) => {
  if (event.headers['content-type']?.startsWith('application/json')) {
    return JSON.parse(
      Buffer.from(
        event.body!,
        event.isBase64Encoded ? 'base64' : 'utf8'
      ).toString('utf8')
    );
  }
  throw new Error('Invalid input');
};

const checkAuth = async (event: HandlerEvent): Promise<string> => {
  const idToken = event.headers['authorization']?.replace(/^Bearer /, '');
  if (!idToken) throw jsonResponse(401, 'Unauthorized');
  const decodedToken = await getAuth().verifyIdToken(idToken);

  // Check god mode
  if (event.headers['x-godmode-uid-override']) {
    console.log('God mode request detected.');
    return event.headers['x-godmode-uid-override'];
  }

  return decodedToken.uid;
};

const newPushId = () => {
  // According to the spec, this is ensured to be in chronological order
  // even multiple IDs are generated in the same millisecond
  return db.ref('/').push().key!;
};

interface ReqPayload {
  gameId?: string;
  [key: string]: unknown;
}

type GameRequestType =
  | 'matchNewGame'
  | 'addUser'
  | 'abortGame'
  | 'talk'
  | 'whisper'
  | 'over'
  | 'vote'
  | 'attackVote'
  | 'divine';

type GameRequestData = {
  type: GameRequestType;
  payload: ReqPayload;
};

type ModeHandler = (params: {
  uid: string;
  requestType: GameRequestType;
  payload: any;
}) => Promise<HandlerResponse>;

const pushLog: PushLog = <T extends LogEntry>(
  game: Game,
  entry: Omit<T, 'timestamp'>
) => {
  const pushId = newPushId();
  return produce(game, draft => {
    draft.log[pushId] = {
      timestamp: fb.database.ServerValue.TIMESTAMP,
      ...entry
    } as T;
  });
};

type GameHandler = (params: {
  game: Game;
  requestType: GameRequestType;
  myAgent: AgentInfo;
  payload: ReqPayload;
}) => Game;

/**
 * This contains the base logic shared by all request types that
 * require a game to be in progress.
 */
const makeGameHandler = (handler: GameHandler): ModeHandler => {
  return async ({ requestType, uid, payload }) => {
    const gameId = payload.gameId as string;
    if (!gameId) return jsonResponse(400, 'gameId is required');
    const gameRef = db.ref(`games/${gameId}`);

    const game = (await gameRef.once('value')).val() as Game;
    if (!game) return jsonResponse(404, 'Game not found');

    let error: any = null;
    let releasePlayers: string[] | null = null;
    const res = await gameRef.transaction((game: Game) => {
      try {
        if (!game) return null; // https://stackoverflow.com/q/16359496
        if (game.finishedAt)
          throw jsonResponse(400, 'This game is already finished');

        const myAgent = game.agents.find(a => a.userId === uid);
        if (!myAgent)
          throw jsonResponse(403, 'You are not a player of this game');
        if (myAgent.life === 'dead')
          throw jsonResponse(400, 'You are already dead');
        const g = movePhase(handler({ requestType, game, myAgent, payload }));
        if (g.finishedAt) releasePlayers = g.agents.map(a => a.userId);
        return g;
      } catch (err) {
        error = err;
        return; // abort the transaction
      }
    });
    if (releasePlayers) releaseUsers(releasePlayers);
    if (error) throw error;
    if (res.committed) return jsonResponse(200, 'OK');
    return jsonResponse(500, 'Failed to update game');
  };
};

const agentStatus = (agents: AgentInfo[]): AgentStatus[] => {
  return agents.map(a => ({ agentId: a.agentId, life: a.life }));
};

const releaseUsers = async (userIds: string[]): Promise<void> => {
  const usersRef = db.ref('users');
  await usersRef.update(
    Object.fromEntries(userIds.map(uid => [`${uid}/currentGameId`, null]))
  );
};

const handleMatchNewGame: ModeHandler = async ({ uid, payload }) => {
  const gameRef = db.ref('games').push();
  const gameId = gameRef.key!;
  const usersRef = db.ref('users');
  const { count = 5 } = payload as { count?: number };
  let pickedUsers: string[] = [];
  const res = await usersRef.transaction((data: UserEntries) => {
    // Pick the current user and other users waiting for a match
    if (data) {
      const waitingUsers = Object.entries(data).filter(
        ([userId, entry]) =>
          userId !== uid && entry.onlineStatus === true && !entry.currentGameId
      );
      // pick random users
      pickedUsers = shuffleArray(waitingUsers)
        .slice(0, count - 1)
        .map(([uid]) => uid);
      // if (pickedUsers.length < 4) return data;
      [uid, ...pickedUsers].forEach(uid => {
        data[uid].currentGameId = gameId;
      });
    }
    return data;
  });
  if (!res.committed) throw jsonResponse(500, 'Failed to assign players');
  if (pickedUsers.length + 1 < count) {
    return jsonResponse(400, 'Not enough players');
  }
  const agents = assignRoles(shuffleArray([uid, ...pickedUsers]), count);
  const initialGame: Game = {
    startedAt: now(),
    agents,
    status: { day: 0, period: 'night', votePhase: 'chat' },
    log: {
      [newPushId()]: {
        timestamp: now(),
        type: 'status',
        day: 0,
        period: 'night',
        votePhase: 'chat',
        event: 'periodStart',
        agents: agentStatus(agents)
      }
    }
  };
  const game = movePhase(initialGame);
  console.log('New game created', game);
  await gameRef.set(game);
  if (game.finishedAt) await releaseUsers([uid, ...pickedUsers]);

  return jsonResponse(200, { gameId });
};

const handleAbortGame: ModeHandler = async ({ uid, payload }) => {
  const gameId = payload.gameId as string;
  if (!gameId) return jsonResponse(400, 'gameId is required');
  const gameRef = db.ref(`games/${gameId}`);
  const game = (await gameRef.once('value')).val() as Game;
  if (!game) return jsonResponse(404, 'Game not found');

  const userIds = game.agents.map(a => a.userId);
  if (!userIds.includes(uid))
    return jsonResponse(403, 'You are not a player of this game');

  await gameRef.update({ finishedAt: now(), wasAborted: true });
  releaseUsers(userIds);

  return jsonResponse(200, 'OK');
};

const handleAddUser: ModeHandler = async ({ uid, payload }) => {
  const newUid = payload.newUid as string;
  const name = (payload.name as string) ?? 'bot';
  if (!newUid) return jsonResponse(400, 'newUid is required');
  const usersRef = db.ref('users').child(newUid);
  await usersRef.set({ createdAt: now(), name, onlineStatus: true });
  return jsonResponse(200, 'OK');
};

const capitalize = (str: string) => str[0].toUpperCase() + str.slice(1);

type EventHandlerKey<T extends StatusLogEvent> =
  | `${T}`
  | `before${Capitalize<T>}`;

/**
 * This is the "game master" function of this program. It reads the existing
 * log and proceeds the game status (day/period/phase) when necessary.
 * @returns Next game status
 */
const movePhase = (game: Game): Game => {
  const statusCheckers: StatusChecker[] = [
    checkChatFinish,
    checkVoteFinish,
    checkPeriodFinish,
    checkGameFinish
  ];

  const statusEventHandlers: {
    [event in StatusLogEvent as EventHandlerKey<event>]?: StatusEventHandler[];
  } = {
    beforePeriodStart: [showKilledResult, showGameResult],
    periodStart: [showDivineResults, showMediumResults]
  };

  const pushState = (
    game: Game,
    event: StatusLogEvent,
    nextStatus: GameStatus
  ) => {
    const tmp = produce(game, draft => {
      draft.status = nextStatus;
    });
    return pushLog<StatusLogEntry>(tmp, {
      type: 'status',
      day: nextStatus.day,
      period: nextStatus.period,
      votePhase: nextStatus.votePhase,
      event,
      agents: agentStatus(game.agents)
    });
  };

  let statusChanged = false;
  let nextGame = game;
  let loopCounter = 0;
  do {
    loopCounter++;
    statusChanged = false;
    for (let i = 0; i < statusCheckers.length; i++) {
      const checker = statusCheckers[i];
      const result = checker(nextGame);
      if (result) {
        statusChanged = true;
        const { event, nextStatus } = result;
        const preHandlers =
          statusEventHandlers[
            ('before' + capitalize(event)) as EventHandlerKey<typeof event>
          ] ?? [];
        for (const handler of preHandlers)
          nextGame = handler(nextGame, pushLog);
        nextGame = pushState(nextGame, event, {
          ...nextGame.status,
          ...nextStatus
        });
        const postHandlers = statusEventHandlers[event] ?? [];
        for (const handler of postHandlers)
          nextGame = handler(nextGame, pushLog);
        break;
      }
    }
  } while (statusChanged && !nextGame.finishedAt && loopCounter < 10);
  if (loopCounter >= 10) {
    throw new Error('Too many loops');
  }

  return nextGame;
};

const availableChatType = (
  game: Game,
  agent: AgentInfo
): 'whisper' | 'talk' | null => {
  const { day, period, votePhase } = game.status;
  if (period === 'night' && votePhase === 'chat' && agent.role === 'werewolf')
    return 'whisper';
  if (period === 'day' && votePhase === 'chat') return 'talk';
  return null;
};

const handleChat = makeGameHandler(
  ({ requestType, game, myAgent, payload }) => {
    const { day, period } = game.status;
    const type = requestType;
    const content = payload.content as string;

    const chatType = availableChatType(game, myAgent);
    if (type !== chatType)
      throw jsonResponse(400, 'You cannot do this action now');

    const periodLog = extractLogOfPeriod(game, day, period);
    if (periodLog.some(l => l.type === 'over' && l.agent === myAgent.agentId))
      throw jsonResponse(400, 'You have already finished your talk');

    return pushLog<ChatLogEntry>(game, {
      type,
      agent: myAgent.agentId,
      content
    });
  }
);

const handleOver = makeGameHandler(({ game, myAgent }) => {
  const periodLog = extractLogOfPeriod(
    game,
    game.status.day,
    game.status.period
  );

  const chatType = availableChatType(game, myAgent);
  if (!chatType) throw jsonResponse(400, 'You cannot chat now');

  if (periodLog.some(l => l.type === 'over' && l.agent === myAgent.agentId))
    throw jsonResponse(400, 'You have already finished your chat');

  return pushLog<OverLogEntry>(game, {
    type: 'over',
    chatType,
    agent: myAgent.agentId
  });
});

const handleVote = makeGameHandler(
  ({ game, requestType, myAgent, payload }) => {
    const { day, period, votePhase } = game.status;
    const type = requestType;
    const target = payload.target as AgentId;

    const voteType = period === 'day' ? 'vote' : 'attackVote';
    if (typeof votePhase !== 'number')
      throw jsonResponse(400, 'No voting is active now');
    if (voteType !== type)
      throw jsonResponse(400, 'You cannot do this action now');

    if (voteType === 'attackVote' && myAgent.role !== 'werewolf')
      throw jsonResponse(400, 'You cannot cast an attack vote');

    const targetAgent = game.agents.find(a => a.agentId === target);
    if (!targetAgent) throw jsonResponse(400, 'Invalid target');

    if (targetAgent.agentId === myAgent.agentId)
      throw jsonResponse(400, 'You cannot vote yourself');
    if (targetAgent.life !== 'alive')
      throw jsonResponse(400, 'Your vote target is dead');
    if (type === 'attackVote' && team(targetAgent.role) === 'werewolves')
      throw jsonResponse(400, 'You cannot attack a werewolf');

    const periodLog = extractLogOfPeriod(game, day, period).filter(
      l => l.type === voteType
    ) as VoteLogEntry[];
    if (
      periodLog.some(
        l =>
          l.votePhase === game.status.votePhase && l.agent === myAgent.agentId
      )
    )
      throw jsonResponse(400, 'You have already cast your vote');

    return pushLog<AttackVoteLogEntry | VoteLogEntry>(game, {
      type,
      agent: myAgent.agentId,
      votePhase,
      target
    });
  }
);

const handleDivine = makeGameHandler(({ game, myAgent, payload }) => {
  const { day, period } = game.status;
  const { target } = payload as ReqPayload & { target: AgentId };

  if (game.status.period !== 'night')
    throw jsonResponse(400, 'It is not night now');
  if (myAgent.role !== 'seer') throw jsonResponse(400, 'You are not a seer');
  const targetAgent = game.agents.find(a => a.agentId === target);
  if (!targetAgent) throw jsonResponse(400, 'Invalid target');
  if (targetAgent.agentId === myAgent.agentId)
    throw jsonResponse(400, 'You cannot divine yourself');
  if (targetAgent.life !== 'alive')
    throw jsonResponse(400, 'The target is already dead');

  const periodLog = extractLogOfPeriod(game, day, period);
  if (periodLog.some(l => l.type === 'divine' && l.agent === myAgent.agentId)) {
    throw jsonResponse(400, 'You have already selected your target');
  }

  return pushLog<DivineLogEntry>(game, {
    type: 'divine',
    agent: myAgent.agentId,
    target
  });
});

export const handler: Handler = async (event, context) => {
  try {
    const { type, payload } = parseInput(event) as GameRequestData;
    const uid = await checkAuth(event);
    const handlers: { [key in GameRequestType]: ModeHandler } = {
      matchNewGame: handleMatchNewGame,
      addUser: handleAddUser,
      abortGame: handleAbortGame,
      talk: handleChat,
      whisper: handleChat,
      over: handleOver,
      vote: handleVote,
      attackVote: handleVote,
      divine: handleDivine
    };
    if (!handlers[type]) throw jsonResponse(400, 'Invalid request type');
    return await handlers[type]({ requestType: type, uid, payload });
  } catch (err: any) {
    if ('statusCode' in err && 'headers' in err) return err;
    console.error('Internal server error:');
    console.error(err?.message);
    if (err?.stack) console.error(err.stack);
    return jsonResponse(500, { message: 'Internal server error' });
  }
};
