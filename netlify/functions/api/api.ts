import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { config } from 'dotenv';
import fb from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import produce from 'immer';
import {
  AgentId,
  AgentInfo,
  AgentStatus,
  AttackLogEntry,
  AttackVoteLogEntry,
  BaseTalkLogEntry,
  BaseVoteLogEntry,
  DivineLogEntry,
  DivineResultLogEntry,
  ExecuteLogEntry,
  Game,
  GameStatus,
  LogEntry,
  OverLogEntry,
  ResultLogEntry,
  roleCombinations,
  StatusLogEntry,
  StatusLogEvent,
  team,
  UserEntries,
  VoteLogEntry
} from '../../../src/game-data.js';
import StatusEventHandler from './event-handlers/SatusEventHandler.js';
import showDivineResults from './event-handlers/showDivineResults.js';
import showGameResult from './event-handlers/showGameResult.js';
import showKilledResult from './event-handlers/showKilledResult.js';
import checkChatFinish from './status-checkers/checkChatFinish.js';
import checkDayFinish from './status-checkers/checkDayFinish.js';
import checkGameFinish from './status-checkers/checkGameFinish.js';
import checkVoteFinish from './status-checkers/checkVoteFinish.js';
import StatusChecker from './status-checkers/StatusChecker.js';
import {
  extractLogOfPeriod,
  mostVotes,
  pickRandomFromArray,
  shuffleArray
} from './utils.js';

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
    name: `Agent[${i}]`,
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
  return decodedToken.uid;
};

const now = () => fb.database.ServerValue.TIMESTAMP;

const newPushId = () => {
  // According to the spec, this is ensured to be in chronological order
  // even multiple IDs are generated in the same millisecond
  return db.ref('/').push().key!;
};

interface ReqPayload {
  gameId?: string;
  [key: string]: unknown;
}

type ReqType =
  | 'matchNewGame'
  | 'abortGame'
  | 'talk'
  | 'whisper'
  | 'over'
  | 'vote'
  | 'attackVote'
  | 'divine';

type ReqData = {
  type: ReqType;
  payload: ReqPayload;
};

type ModeHandler = (params: {
  uid: string;
  payload: any;
}) => Promise<HandlerResponse>;

const pushLog = <T extends LogEntry>(
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
  myAgent: AgentInfo;
  payload: ReqPayload;
}) => Game;

const makeGameHandler = (handler: GameHandler): ModeHandler => {
  return async ({ uid, payload }) => {
    const gameId = payload.gameId as string;
    if (!gameId) return jsonResponse(400, 'gameId is required');
    const gameRef = db.ref(`games/${gameId}`);

    let error: any = null;
    let releasePlayers: string[] | null = null;
    const res = await gameRef.transaction((game: Game) => {
      try {
        if (!game) return null; // https://stackoverflow.com/q/16359496
        if (game.finishedAt)
          throw jsonResponse(400, 'This game is already finished');

        const myAgent = game.agents.find(a => a.userId === uid);
        if (!myAgent)
          return jsonResponse(403, 'You are not a player of this game');
        if (myAgent.life === 'dead')
          return jsonResponse(400, 'You are already dead');
        const g = movePhase(handler({ game, myAgent, payload }));
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
  if (!res.committed) throw jsonResponse(500, 'Failed to create a game');
  if (pickedUsers.length < count) {
    // return jsonResponse(400, 'Not enough players');
  }
  const agents = assignRoles([uid, ...pickedUsers], count);
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
  await gameRef.set(game);
  if (game.finishedAt) await releaseUsers([uid, ...pickedUsers]);

  return jsonResponse(200, { gameId });
};

const handleAbortGame: ModeHandler = async ({ uid, payload }) => {
  const gameId = payload.gameId;
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

/**
 * This is the "game master" function of this program. It reads the existing
 * log and proceeds the game status (day/period/phase) when necessary.
 * @returns Next game status
 */
const movePhase = (game: Game): Game => {
  const statusCheckers: StatusChecker[] = [
    checkChatFinish,
    checkVoteFinish,
    checkDayFinish,
    checkGameFinish
  ];

  const statusEventHandlers: {
    [event in StatusLogEvent]?: StatusEventHandler[];
  } = {
    periodStart: [showKilledResult, showDivineResults, showGameResult]
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
        console.log('changed', checker.name, result);
        const { event, nextStatus } = result;
        nextGame = pushState(nextGame, event, {
          ...nextGame.status,
          ...nextStatus
        });
        const handlers = statusEventHandlers[event] ?? [];
        for (const handler of handlers) {
          const entries = handler(nextGame);
          if (Array.isArray(entries))
            entries.forEach(e => (nextGame = pushLog(nextGame, e)));
        }
        if (event === 'gameFinish') {
          nextGame = produce(nextGame, draft => {
            draft.finishedAt = now();
          });
        }
        break;
      }
    }
  } while (statusChanged && !nextGame.finishedAt && loopCounter < 10);
  if (loopCounter >= 10) {
    throw new Error('Too many loops');
  }

  return nextGame;
};

const handleChat = makeGameHandler(({ game, myAgent, payload }) => {
  const { day, period, votePhase } = game.status;
  const { type, content } = payload as ReqPayload & {
    type: 'talk' | 'whisper';
    content: string;
  };
  if (
    votePhase !== 'chat' ||
    (period === 'day' && type === 'whisper') ||
    (period === 'night' && type === 'talk')
  )
    throw jsonResponse(400, 'Invalid game status');

  const periodLog = extractLogOfPeriod(game, day, period);
  if (periodLog.some(l => l.type === 'over' && l.agent === myAgent.agentId))
    throw jsonResponse(400, 'You have already finished your talk');

  return pushLog<BaseTalkLogEntry>(game, {
    type,
    agent: myAgent.agentId,
    content
  });
});

const handleOver = makeGameHandler(({ game, myAgent }) => {
  const periodLog = extractLogOfPeriod(
    game,
    game.status.day,
    game.status.period
  );

  if (periodLog.some(l => l.type === 'over' && l.agent === myAgent.agentId))
    throw jsonResponse(400, 'You have already finished your talk');

  return pushLog<OverLogEntry>(game, { type: 'over', agent: myAgent.agentId });
});

const handleVote = makeGameHandler(({ game, myAgent, payload }) => {
  const { day, period, votePhase } = game.status;
  const { type, target } = payload as ReqPayload & {
    type: 'vote' | 'attackVote';
    target: AgentId;
  };

  const voteType = period === 'day' ? 'vote' : 'attackVote';
  if (typeof votePhase !== 'number' || voteType !== type)
    throw jsonResponse(400, 'Invalid game status');

  const targetAgent = game.agents.find(a => a.agentId === target);
  if (!targetAgent) throw jsonResponse(400, 'Invalid target');
  if (targetAgent.life !== 'alive') throw jsonResponse(400, 'Target is dead');
  if (type === 'attackVote' && team(targetAgent.role) !== 'villagers')
    throw jsonResponse(400, 'Invalid target');

  const periodLog = extractLogOfPeriod(game, day, period);
  if (periodLog.some(l => l.type === voteType && l.agent === myAgent.agentId))
    throw jsonResponse(400, 'You have already cast your vote');

  return pushLog<AttackVoteLogEntry | VoteLogEntry>(game, {
    type,
    agent: myAgent.agentId,
    votePhase,
    target
  });
});

const handleDivine = makeGameHandler(({ game, myAgent, payload }) => {
  const { day, period } = game.status;
  const { target } = payload as ReqPayload & { target: AgentId };

  if (game.status.period !== 'night')
    throw jsonResponse(400, 'Invalid game status');

  const targetAgent = game.agents.find(a => a.agentId === target);
  // if (targetAgent?.agentId === myAgent.agentId)
  //   throw jsonResponse(400, 'You cannot divine yourself');
  if (targetAgent?.life !== 'alive') throw jsonResponse(400, 'Invalid target');

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
    const { type, payload } = parseInput(event) as ReqData;
    const uid = await checkAuth(event);
    const handlers: { [key in ReqType]: ModeHandler } = {
      matchNewGame: handleMatchNewGame,
      abortGame: handleAbortGame,
      talk: handleChat,
      whisper: handleChat,
      over: handleOver,
      vote: handleVote,
      attackVote: handleVote,
      divine: handleDivine
    };
    if (!handlers[type]) throw jsonResponse(400, 'Invalid request type');
    return await handlers[type]({ uid, payload });
  } catch (err: any) {
    if ('statusCode' in err && 'headers' in err) return err;
    console.error('Internal server error:');
    console.error(err?.message);
    if (err?.stack) console.error(err.stack);
    return jsonResponse(500, { message: 'Internal server error' });
  }
};
