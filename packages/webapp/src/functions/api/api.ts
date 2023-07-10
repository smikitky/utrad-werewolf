import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { config } from 'dotenv';
import fb from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import produce from 'immer';
import {
  AgentCount,
  AgentId,
  AgentInfo,
  AgentRole,
  AgentStatus,
  AttackVoteLogEntry,
  ChatLogEntry,
  defaultAgentCount,
  DivineLogEntry,
  Game,
  GameStatus,
  LogEntry,
  OverLogEntry,
  GuardLogEntry,
  StatusLogEntry,
  StatusLogEvent,
  UserEntries,
  VoteLogEntry,
  Team,
  UserEntry,
  Mark,
  marks
} from '../../game-data.js';
import {
  Lang,
  extractLogOfPeriod,
  isValidAgentCount,
  shuffleArray
} from '../../game-utils.js';
import StatusEventHandler, {
  PushLog
} from './event-handlers/SatusEventHandler.js';
import showDivineResults from './event-handlers/showDivineResults.js';
import showGameResult from './event-handlers/showGameResult.js';
import showKilledResult from './event-handlers/showKilledResult.js';
import showMediumResults from './event-handlers/showMediumResults.js';
import checkChatFinish from './status-checkers/checkChatFinish.js';
import checkNewGame from './status-checkers/checkNewGame.js';
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

const assignRoles = (userIds: string[], roles: AgentRole[]): AgentInfo[] => {
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
  if (event.httpMethod !== 'POST')
    throw jsonResponse(405, 'Method not allowed');
  if (!event.headers['content-type']?.startsWith('application/json'))
    throw jsonResponse(400, 'Invalid content-type');
  try {
    return JSON.parse(
      Buffer.from(
        event.body!,
        event.isBase64Encoded ? 'base64' : 'utf8'
      ).toString('utf8')
    );
  } catch (err) {
    throw jsonResponse(400, 'JSON parse error');
  }
};

const checkAuth = async (event: HandlerEvent): Promise<string> => {
  const idToken = event.headers['authorization']?.replace(/^Bearer /, '');
  if (!idToken) throw jsonResponse(401, 'Unauthorized');
  const uidOverride = event.headers['x-godmode-uid-override'];

  if (
    process.env.MASTER_PASS &&
    uidOverride &&
    idToken === process.env.MASTER_PASS
  ) {
    return uidOverride;
  }

  const decodedToken = await getAuth().verifyIdToken(idToken);

  // Check god mode
  if (uidOverride) {
    // console.log('God mode request detected.');
    const canBeGod = await db.ref(`/users/${decodedToken.uid}/canBeGod`).get();
    if (canBeGod.val() !== true) throw jsonResponse(403, 'Forbidden');
    return uidOverride;
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
  | 'ping'
  | 'matchNewGame'
  | 'addUser'
  | 'setProfile'
  | 'deleteGame'
  | 'setGameAttributes'
  | 'abortGame'
  | 'getGameLog'
  | 'talk'
  | 'whisper'
  | 'over'
  | 'vote'
  | 'attackVote'
  | 'divine'
  | 'guard';

type GameRequestData = {
  type: GameRequestType;
  payload: ReqPayload;
};

type ModeHandler = <P>(params: {
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
    let finishData: Game | null = null;
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
        if (g.finishedAt) finishData = g;
        return g;
      } catch (err) {
        error = err;
        return; // abort the transaction
      }
    });
    if (finishData as Game | null) await finalizeGame(gameId, finishData!);
    if (error) throw error;
    if (res.committed) return jsonResponse(200, 'OK');
    return jsonResponse(500, 'Failed to update game');
  };
};

const asGod = (
  handler: (params: {
    uid: string;
    payload: any;
    game?: Game;
  }) => Promise<HandlerResponse>
): ModeHandler => {
  return async ({ uid, payload }) => {
    const user = (await db.ref('users').child(uid).get()).val();
    if (!user.canBeGod) return jsonResponse(403, 'You are not a god');
    const gameId = payload.gameId as string | undefined;
    let game = undefined;
    if (gameId) {
      const gameRef = db.ref(`games/${gameId}`);
      game = (await gameRef.get()).val() as Game;
      if (!game) return jsonResponse(404, 'Game not found');
    }
    return handler({ uid, payload, game });
  };
};

const agentStatus = (agents: AgentInfo[]): AgentStatus[] => {
  return agents.map(a => ({ agentId: a.agentId, life: a.life }));
};

const finalizeGame = async (gameId: string, game: Game): Promise<void> => {
  await releaseUsers(game!.agents.map(a => a.userId));

  const winner = game.winner;
  if (!winner) throw new Error('Game is not finished');
  const numAgents = game.agents.length;
  await db
    .ref('userHistory')
    .update(
      Object.fromEntries(
        game.agents.map(a => [
          `${a.userId}/${gameId}`,
          { finishedAt: now(), numAgents, winner, role: a.role }
        ])
      )
    );
  await db
    .ref(`globalHistory/${gameId}`)
    .set({ finishedAt: now(), numAgents, winner });
};

const releaseUsers = async (userIds: string[]): Promise<void> => {
  const usersRef = db.ref('users');
  await usersRef.update(
    Object.fromEntries(userIds.map(uid => [`${uid}/currentGameId`, null]))
  );
};

const handleMatchNewGame: ModeHandler = async ({ uid, payload }) => {
  const agentCount = (payload.agentCount as AgentCount) ?? defaultAgentCount;

  if (!isValidAgentCount(agentCount))
    return jsonResponse(400, 'Invalid agent count');

  const roles = Object.entries(agentCount).flatMap(([role, count]) =>
    new Array<AgentRole>(count).fill(role as AgentRole)
  ) as AgentRole[];
  const count = roles.length;

  const gameRef = db.ref('games').push();
  const gameId = gameRef.key!;
  const usersRef = db.ref('users');
  let pickedUsers: string[] = [];
  const res = await usersRef.transaction((data: UserEntries) => {
    // Pick the current user and other users waiting for a match
    if (data) {
      const waitingUsers = Object.entries(data).filter(
        ([userId, entry]) =>
          userId !== uid &&
          entry.onlineStatus === true &&
          entry.ready === true &&
          !entry.currentGameId
      );
      // pick random users
      if (waitingUsers.length < count - 1) return data;
      pickedUsers = shuffleArray(waitingUsers)
        .slice(0, count - 1)
        .map(([uid]) => uid);
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
  const agents = assignRoles(shuffleArray([uid, ...pickedUsers]), roles);
  const initialGame: Game = {
    startedAt: now(),
    agents,
    status: { day: 0, period: 'night', votePhase: 'chat' },
    log: {}
  };
  const game = movePhase(initialGame);
  await gameRef.set(game);
  if (game.finishedAt) await finalizeGame(gameId, game);

  return jsonResponse(200, { gameId });
};

const handleAbortGame = asGod(async ({ uid, payload, game }) => {
  const gameId = payload.gameId as string;
  if (!game) return jsonResponse(400, 'gameId is required');

  const userIds = game.agents.map(a => a.userId);
  await db
    .ref(`games/${gameId}`)
    .update({ finishedAt: now(), wasAborted: true });
  const numAgents = game.agents.length;
  await db
    .ref('userHistory')
    .update(
      Object.fromEntries(
        game.agents.map(a => [
          `${a.userId}/${gameId}`,
          { finishedAt: now(), wasAborted: true, numAgents, role: a.role }
        ])
      )
    );
  await db.ref(`globalHistory/${gameId}`).set({
    finishedAt: now(),
    wasAborted: true,
    numAgents
  });

  releaseUsers(userIds);

  return jsonResponse(200, 'OK');
});

const handleAddUser = asGod(async ({ payload }) => {
  const newUid = payload.newUid as string;
  const name = (payload.name as string) ?? 'bot';
  if (typeof newUid !== 'string' || !newUid)
    return jsonResponse(400, 'newUid is required');
  if (/[^a-zA-Z0-9_-]/.test(newUid)) return jsonResponse(400, 'Invalid newUid');

  const usersRef = db.ref('users').child(newUid);
  await usersRef.set({
    createdAt: now(),
    name,
    onlineStatus: true,
    ready: true
  });
  return jsonResponse(200, 'OK');
});

const handleSetProfile: ModeHandler = async ({ uid, payload }) => {
  const {
    target = uid,
    updates: { name, lang, canBeGod }
  } = payload as {
    target?: string;
    updates: {
      name?: string;
      lang?: Lang;
      canBeGod?: boolean;
    };
  };

  const user = (await db.ref('users').child(uid).get()).val();
  if (target !== uid) {
    if (!user.canBeGod) return jsonResponse(403, 'You are not a god');
  }

  if (name && name.length > 20) return jsonResponse(400, 'Name is too long');
  if (lang && !['en', 'ja'].includes(lang))
    return jsonResponse(400, 'Invalid lang');
  if (typeof canBeGod === 'boolean') {
    if (!user.canBeGod) return jsonResponse(403, 'You are not a god');
    if (uid === target && !canBeGod)
      return jsonResponse(400, 'You cannot remove your own god privilege');
  }

  const userRef = db.ref('users').child(target);
  const targetUser = (await userRef.get()).val() as Partial<UserEntry>;
  await userRef.update({
    createdAt: targetUser?.createdAt ?? now(),
    name: name ?? targetUser.name ?? 'new user',
    lang: lang ?? targetUser.lang ?? 'en',
    canBeGod: canBeGod ?? targetUser.canBeGod ?? false
  });
  return jsonResponse(200, 'OK');
};

const handleDeleteGame = asGod(async ({ payload, game }) => {
  const gameId = payload.gameId as string;
  if (!game) return jsonResponse(400, 'gameId is required');
  if (!game.finishedAt)
    return jsonResponse(400, 'You cannot remove an unfinished game');

  const userIds = game.agents.map(a => a.userId);
  await db.ref().update({
    [`/games/${gameId}`]: null,
    [`/globalHistory/${gameId}`]: null,
    ...Object.fromEntries(
      userIds.map(uid => [`/userHistory/${uid}/${gameId}`, null])
    )
  });
  return jsonResponse(200, 'OK');
});

const handleSetGameAttributes = asGod(async ({ payload, game }) => {
  const gameId = payload.gameId as string;
  if (!game) return jsonResponse(400, 'gameId is required');

  const mark = payload.mark as Mark | null;
  if (mark && !marks.includes(mark as Mark)) {
    return jsonResponse(400, 'Invalid mark');
  }

  const userIds = game.agents.map(a => a.userId);
  await db.ref().update({
    [`/games/${gameId}/mark`]: mark,
    [`/globalHistory/${gameId}/mark`]: mark,
    ...Object.fromEntries(
      userIds.map(uid => [`/userHistory/${uid}/${gameId}/mark`, mark])
    )
  });
  return jsonResponse(200, 'OK');
});

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
    checkNewGame,
    checkChatFinish,
    checkVoteFinish,
    checkPeriodFinish
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
        if (nextGame.finishedAt) break;
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

const handleGetGameLog: ModeHandler = async ({ uid, payload }) => {
  const gameId = payload.gameId as string;
  if (!gameId) return jsonResponse(400, 'gameId is required');
  const gameRef = db.ref(`games/${gameId}`);
  const game = (await gameRef.once('value')).val() as Game;
  if (!game) return jsonResponse(404, 'Game not found');
  return jsonResponse(200, game);
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

    const periodLog = extractLogOfPeriod(game);
    if (periodLog.some(l => l.type === 'over' && l.agent === myAgent.agentId))
      throw jsonResponse(400, 'You have already finished your talk');
    if (
      periodLog.filter(l => l.type === type && l.agent === myAgent.agentId)
        .length >= 10
    )
      throw jsonResponse(
        400,
        'You cannot make a statement more than 10 times in one period'
      );

    return pushLog<ChatLogEntry>(game, {
      type,
      agent: myAgent.agentId,
      content
    });
  }
);

const handleOver = makeGameHandler(({ game, myAgent }) => {
  const periodLog = extractLogOfPeriod(game);

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
    if (type === 'attackVote' && targetAgent.role === 'werewolf')
      throw jsonResponse(400, 'You cannot attack a werewolf');

    const periodLog = extractLogOfPeriod(game).filter(
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

const handleDivineGuard = makeGameHandler(
  ({ requestType, game, myAgent, payload }) => {
    const { day, period } = game.status;
    const type = requestType as 'divine' | 'guard';
    const target = payload.target as AgentId;

    if (type === 'divine' && myAgent.role !== 'seer')
      throw jsonResponse(400, 'You are not a seer');
    if (type === 'guard' && myAgent.role !== 'bodyguard')
      throw jsonResponse(400, 'You are not a bodyguard');
    if (game.status.period !== 'night' || (type === 'guard' && day === 0))
      throw jsonResponse(400, `This action is not allowed in this period`);
    const targetAgent = game.agents.find(a => a.agentId === target);
    if (!targetAgent) throw jsonResponse(400, 'Invalid target');
    if (targetAgent.agentId === myAgent.agentId)
      throw jsonResponse(400, `You cannot ${type} yourself`);
    if (targetAgent.life !== 'alive')
      throw jsonResponse(400, `The target you tried to ${type} is dead`);

    const periodLog = extractLogOfPeriod(game);
    if (periodLog.some(l => l.type === type && l.agent === myAgent.agentId))
      throw jsonResponse(400, 'You have already selected your target');

    return pushLog<DivineLogEntry | GuardLogEntry>(game, {
      type,
      agent: myAgent.agentId,
      target
    });
  }
);

export const handler: Handler = async (event, context) => {
  try {
    const { type, payload } = parseInput(event) as GameRequestData;

    if (type === 'ping')
      return jsonResponse(200, { message: 'pong', timestamp: now() });

    const uid = await checkAuth(event);
    const handlers: { [key in GameRequestType]: ModeHandler } = {
      ping: (() => {}) as any, // never called
      matchNewGame: handleMatchNewGame,
      addUser: handleAddUser,
      setProfile: handleSetProfile,
      deleteGame: handleDeleteGame,
      setGameAttributes: handleSetGameAttributes,
      abortGame: handleAbortGame,
      getGameLog: handleGetGameLog,
      talk: handleChat,
      whisper: handleChat,
      over: handleOver,
      vote: handleVote,
      attackVote: handleVote,
      divine: handleDivineGuard,
      guard: handleDivineGuard
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
