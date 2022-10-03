import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { config } from 'dotenv';
import fb from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
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
  GamePeriod,
  LogEntry,
  OverLogEntry,
  ResultLogEntry,
  roleCombinations,
  StatusLogEntry,
  StatusLogEvent,
  team,
  UserEntries,
  VoteLogEntry,
  VotePhase
} from '../../src/game-data.js';

export const connection = (async () => {
  config(); // Loads environment variables from .env file

  if (!process.env.GCP_CREDENTIALS)
    throw new Error('GCP_CREDENTIALS is not set');
  const credentials = JSON.parse(
    Buffer.from(process.env.GCP_CREDENTIALS, 'base64').toString()
  );
  fb.initializeApp({
    credential: fb.credential.cert(credentials),
    databaseURL: 'https://utrad-warewolf-default-rtdb.firebaseio.com/'
  });
  const db = fb.database();
  return { db };
})();

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

const shuffle = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const assignRoles = (userIds: string[], count: number = 5): AgentInfo[] => {
  const roles = roleCombinations.get(count);
  if (!roles) throw jsonResponse(400, 'Invalid player count');
  const shuffled = shuffle(roles);
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

interface ReqPayload {
  gameId?: string;
  [key: string]: unknown;
}

type ReqType =
  | 'matchNewGame'
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
  db: fb.database.Database;
  uid: string;
  payload: any;
  newPushId: () => string;
}) => Promise<HandlerResponse>;

type PushLog = <T extends LogEntry>(entry: Omit<T, 'timestamp'>) => void;

const makePushLog = (game: Game, newPushId: () => string) => {
  return <T extends LogEntry>(entry: Omit<T, 'timestamp'>) => {
    game.log[newPushId()] = {
      timestamp: fb.database.ServerValue.TIMESTAMP,
      ...entry
    } as T;
  };
};

type GameHandler = (params: {
  myAgent: AgentInfo;
  payload: ReqPayload;
  game: Game;
  pushLog: PushLog;
}) => Game;

const makeGameHandler = (handler: GameHandler): ModeHandler => {
  return async ({ newPushId, db, uid, payload }) => {
    const gameId = payload.gameId;
    if (!gameId) return jsonResponse(400, 'gameId is required');
    const gameRef = db.ref(`games/${gameId}`);

    let error: any = null;
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
        const pushLog = makePushLog(game, newPushId);
        return handler({ pushLog, myAgent, payload, game });
      } catch (err) {
        error = err;
        return; // abort the transaction
      }
    });
    if (error) throw error;
    if (res.committed) return jsonResponse(200, 'OK');
    return jsonResponse(500, 'Failed to update game');
  };
};

const agentStatus = (agents: AgentInfo[]): AgentStatus[] => {
  return agents.map(a => ({ agentId: a.agentId, life: a.life }));
};

const handleMatchNewGame: ModeHandler = async ({
  newPushId,
  db,
  uid,
  payload
}) => {
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
      pickedUsers = shuffle(waitingUsers)
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
  if (pickedUsers.length < 4) {
    // return jsonResponse(400, 'Not enough players');
  }
  const agents = assignRoles([uid, ...pickedUsers], count);
  const initialGame: Game = {
    startedAt: now(),
    agents,
    status: { day: 0, period: 'night', votePhase: 'chat' },
    log: {
      [newPushId()]: {
        timestamp: fb.database.ServerValue.TIMESTAMP,
        type: 'status',
        day: 0,
        period: 'night',
        votePhase: 'chat',
        event: 'periodStart',
        agents: agentStatus(agents)
      }
    }
  };
  // Proceed the game phase when necessary (chat phase may be skipped)
  const pushLog = makePushLog(initialGame, newPushId);
  const game = movePhase(initialGame, pushLog);
  await gameRef.set(game);
  return jsonResponse(200, { gameId });
};

const extractLogOfPeriod = (
  game: Game,
  day: number,
  period: GamePeriod
): LogEntry[] => {
  let logDay = 0;
  let logPeriod = 'nightTime';
  return Object.values(game.log).filter(l => {
    if (l.type === 'status') {
      logDay = l.day;
      logPeriod = l.period;
    }
    return logDay === day && logPeriod === period;
  });
};

/**
 * Check the agent who gained the most votes
 * @param entries - Log entries from one vote phase
 * @param chooseRandom - When there are two or more agents with the most votes,
 *   choose one randomly
 * @returns The agentId who gained the most votes, or null
 */
const checkVoteSettelment = (
  entries: BaseVoteLogEntry[],
  chooseRandom?: boolean
) => {
  if (entries.length === 0) throw new Error('No vote entries');
  const votes = entries.map(e => e.target);
  const voteCount = votes.reduce(
    (acc, v) => acc.set(v, (acc.get(v) ?? 0) + 1),
    new Map<AgentId, number>()
  );
  const maxVote = Math.max(...voteCount.values());
  const topAgents = [...voteCount.entries()].filter(([a, v]) => v === maxVote);
  if (topAgents.length === 1) {
    return topAgents[0][0];
  } else if (chooseRandom) {
    return topAgents[Math.floor(Math.random() * topAgents.length)][0];
  } else {
    return null;
  }
};

/**
 * This is the "game master" function of this program. It reads the existing
 * log and proceeds the game day/period/phase when necessary.
 * @returns Next game status
 */
const movePhase = (game: Game, pushLog: PushLog): Game => {
  const { day, period, votePhase } = game.status;
  const periodLog = extractLogOfPeriod(game, day, period);

  const pushState = (
    event: StatusLogEvent,
    day: number,
    period: GamePeriod,
    votePhase: VotePhase
  ) => {
    game.status = { day, period, votePhase };
    pushLog<StatusLogEntry>({
      type: 'status',
      day,
      period,
      votePhase,
      event,
      agents: agentStatus(game.agents)
    });
  };

  // Start of a period. Adds log entries from the actions of the previous period.
  if (periodLog.length === 0 && day > 0) {
    const prevPeriodLog = extractLogOfPeriod(
      game,
      period === 'day' ? day - 1 : day,
      period === 'day' ? 'night' : 'day'
    );
    // Record divining results during the last night
    if (period === 'day') {
      (
        prevPeriodLog.filter(l => l.type === 'divine') as DivineLogEntry[]
      ).forEach(l => {
        pushLog<DivineResultLogEntry>({
          type: 'divineResult',
          agent: l.agent,
          target: l.target
        });
      });
    }
  }

  const alivePeople = game.agents.filter(a => a.life === 'alive');
  const werewolves = alivePeople.filter(a => a.role === 'werewolf');
  // Voters can also talk/whisper in the chat phase
  const voters = period === 'day' ? alivePeople : werewolves;

  if (votePhase === 'chat') {
    // The chat phase ends when:
    // 1) There is only one voter in a night period (no need to discuss)
    // 2) All voters finished their talk/whisper by indicating 'over'
    const chatPhaseFinished =
      (period === 'night' && voters.length === 1) ||
      voters.every(c =>
        periodLog.some(l => l.type === 'over' && l.agent === c.agentId)
      );
    if (chatPhaseFinished) {
      if (day === 0) {
        // Day-0 does not have an attack voting phase
        pushState('voteSettle', day, period, 'settled');
      } else {
        pushState('voteStart', day, period, 1);
      }
      return movePhase(game, pushLog);
    }
  }

  if (typeof votePhase === 'number') {
    // A vote phase ends when all agents who can cast a vote have cast their votes
    const voteType = period === 'day' ? 'vote' : 'attackVote';
    const voteLog = periodLog.filter(
      l => l.type === voteType && l.votePhase === votePhase
    ) as BaseVoteLogEntry[];
    const allVotesCast = voters.every(v =>
      voteLog.some(l => l.agent === v.agentId)
    );
    if (allVotesCast) {
      const voteResult = checkVoteSettelment(voteLog);
      if (voteResult || votePhase >= 2) {
        pushState('voteSettle', day, period, 'settled');
        return movePhase(game, pushLog);
      } else {
        // The result was a tie, proceed to the next vote round
        pushState('voteStart', day, period, votePhase + 1);
        return movePhase(game, pushLog);
      }
    }
  }

  if (votePhase === 'settled') {
    const seers = alivePeople.filter(a => a.role === 'seer');
    const canFinishThisPeriod =
      period === 'day' ||
      (period === 'night' &&
        seers.every(s =>
          periodLog.some(l => l.type === 'divine' && l.agent === s.agentId)
        ));
    if (canFinishThisPeriod) {
      if (day > 0) {
        // Kill the agent who gained the most votes
        const voteType = period === 'day' ? 'vote' : 'attackVote';
        const lastVotePhase = Math.max(
          ...(
            periodLog.filter(l => l.type === voteType) as BaseVoteLogEntry[]
          ).map(l => l.votePhase)
        );
        const killedAgent = checkVoteSettelment(
          periodLog.filter(
            l => l.type === voteType && l.votePhase === lastVotePhase
          ) as BaseVoteLogEntry[],
          true
        );
        game.agents.find(a => a.agentId === killedAgent)!.life = 'dead';
        pushLog<ExecuteLogEntry | AttackLogEntry>({
          type: period === 'day' ? 'execute' : 'attack',
          target: killedAgent!
        });
      }
      // Game end check
      const aliveWerewolves = game.agents.filter(
        a => team(a.role) === 'werewolf' && a.life === 'alive'
      ).length;
      const aliveVillagers = game.agents.filter(
        a => team(a.role) === 'villager' && a.life === 'alive'
      ).length;
      const gameEnd =
        aliveWerewolves === 0 || aliveWerewolves >= aliveVillagers;
      if (gameEnd) {
        game.finishedAt = fb.database.ServerValue.TIMESTAMP;
        pushState('gameFinish', day, period, 'settled');
        pushLog<ResultLogEntry>({
          type: 'result',
          survivingVillagers: aliveVillagers,
          survivingWerewolves: aliveWerewolves,
          winner: aliveWerewolves === 0 ? 'villager' : 'werewolf'
        });
        return game;
      } else {
        // Proceed to the next period
        pushState(
          'periodStart',
          period === 'day' ? day : day + 1,
          period === 'day' ? 'night' : 'day',
          'chat'
        );
        return movePhase(game, pushLog);
      }
    }
  }

  // No change
  return game;
};

const handleChat = makeGameHandler(({ pushLog, game, myAgent, payload }) => {
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

  pushLog<BaseTalkLogEntry>({ type, agent: myAgent.agentId, content });
  return game;
});

const handleOver = makeGameHandler(({ pushLog, game, myAgent }) => {
  const periodLog = extractLogOfPeriod(
    game,
    game.status.day,
    game.status.period
  );

  if (periodLog.some(l => l.type === 'over' && l.agent === myAgent.agentId))
    throw jsonResponse(400, 'You have already finished your talk');

  pushLog<OverLogEntry>({ type: 'over', agent: myAgent.agentId });
  return movePhase(game, pushLog);
});

const handleVote = makeGameHandler(({ pushLog, game, myAgent, payload }) => {
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
  if (type === 'attackVote' && team(targetAgent.role) !== 'villager')
    throw jsonResponse(400, 'Invalid target');

  const periodLog = extractLogOfPeriod(game, day, period);
  if (periodLog.some(l => l.type === voteType && l.agent === myAgent.agentId))
    throw jsonResponse(400, 'You have already cast your vote');

  pushLog<AttackVoteLogEntry | VoteLogEntry>({
    type,
    agent: myAgent.agentId,
    votePhase,
    target
  });
  return movePhase(game, pushLog);
});

const handleDivine = makeGameHandler(({ pushLog, game, myAgent, payload }) => {
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

  pushLog<DivineLogEntry>({ type: 'divine', agent: myAgent.agentId, target });
  return movePhase(game, pushLog);
});

export const handler: Handler = async (event, context) => {
  try {
    const { type, payload } = parseInput(event) as ReqData;
    const { db } = await connection;
    const uid = await checkAuth(event);
    const handlers: { [key in ReqType]: ModeHandler } = {
      matchNewGame: handleMatchNewGame,
      talk: handleChat,
      whisper: handleChat,
      over: handleOver,
      vote: handleVote,
      attackVote: handleVote,
      divine: handleDivine
    };
    if (!handlers[type]) throw jsonResponse(400, 'Invalid request type');
    const newPushId = () => {
      // According to the spec, this is ensured to be in chronological order
      // even multiple IDs are generated in the same millisecond
      return db.ref('/').push().key!;
    };
    return await handlers[type]({ newPushId, db, uid, payload });
  } catch (err: any) {
    if ('statusCode' in err && 'headers' in err) return err;
    console.error('Internal server error:');
    console.error(err?.message);
    if (err?.stack) console.error(err.stack);
    return jsonResponse(500, { message: 'Internal server error' });
  }
};
