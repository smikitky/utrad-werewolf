import {
  AgentCount,
  AgentId,
  AgentInfo,
  AgentRole,
  agentRoles,
  BaseVoteLogEntry,
  Game,
  GameStatus,
  LogEntry,
  Team,
  VotePhase
} from './game-data';

export const roleTextMap: { [key in AgentRole]: string } = {
  villager: '村人',
  werewolf: '人狼',
  seer: '占い師',
  possessed: '裏切り者',
  medium: '霊媒師',
  bodyguard: '狩人'
};

export const teamTextMap: { [key in Team]: string } = {
  villagers: '村人陣営',
  werewolves: '人狼陣営'
};

export const agentTotalCount = (counts: AgentCount) =>
  Object.values(counts).reduce((a, b) => a + b, 0) as number;

export const isValidAgentCount = (counts: AgentCount) => {
  if (typeof counts !== 'object') return false;
  if (Object.keys(counts).length !== agentRoles.length) return false;
  if (agentRoles.some(role => typeof counts[role] !== 'number')) return false;
  const total = agentTotalCount(counts);
  const totalWerewolves = counts.werewolf;
  const totalVillagers = total - totalWerewolves;
  return (
    total >= 2 && total <= 15 && totalVillagers >= 1 && totalWerewolves >= 1
  );
};

export type Action =
  | 'wait'
  | 'divine'
  | 'guard'
  | 'vote'
  | 'attackVote'
  | 'talk'
  | 'whisper'
  | 'finish';

export const agentAction = (game: Game, agent: AgentInfo): Action => {
  const { day, period, votePhase } = game.status;
  const gameFinished = !!game.finishedAt;
  const periodLog = extractLogOfPeriod(game);

  if (gameFinished) return 'finish';
  if (agent.life === 'dead') return 'wait';
  switch (period) {
    case 'day':
      if (typeof votePhase === 'number') {
        return periodLog.some(
          l =>
            l.type === 'vote' &&
            l.agent === agent.agentId &&
            l.votePhase === votePhase
        )
          ? 'wait'
          : 'vote';
      } else {
        return periodLog.some(
          l => l.type === 'over' && l.agent === agent.agentId
        )
          ? 'wait'
          : 'talk';
      }
    case 'night':
      switch (agent.role) {
        case 'villager':
        case 'possessed':
          return 'wait';
        case 'seer':
          return periodLog.some(
            l => l.type === 'divine' && l.agent === agent.agentId
          )
            ? 'wait'
            : 'divine';
        case 'medium':
          console.warn('Medium is not implemented yet');
          return 'wait';
        case 'bodyguard':
          return periodLog.some(
            l => l.type === 'guard' && l.agent === agent.agentId
          ) || day === 0
            ? 'wait'
            : 'guard';
        case 'werewolf':
          if (typeof votePhase === 'number') {
            return periodLog.some(
              l =>
                l.type === 'attackVote' &&
                l.agent === agent.agentId &&
                l.votePhase === votePhase
            )
              ? 'wait'
              : 'attackVote';
          } else if (votePhase === 'settled') {
            return 'wait';
          } else {
            return periodLog.some(
              l => l.type === 'over' && l.agent === agent.agentId
            )
              ? 'wait'
              : 'whisper';
          }
      }
  }
};

export const extractLogOfPeriod = (
  game: Game,
  status?: Omit<GameStatus, 'votePhase'>
): LogEntry[] => {
  const targetDay = status ? status.day : game.status.day;
  const targetPeriod = status ? status.period : game.status.period;
  let logDay = 0;
  let logPeriod = 'nightTime';
  return Object.values(game.log).filter(l => {
    if (l.type === 'status') {
      logDay = l.day;
      logPeriod = l.period;
    }
    return logDay === targetDay && logPeriod === targetPeriod;
  });
};

export const lastVoteEntries = (
  periodLog: LogEntry[],
  voteType: 'vote' | 'attackVote'
): BaseVoteLogEntry[] => {
  const periodVoteLog = periodLog.filter(
    l => l.type === voteType
  ) as BaseVoteLogEntry[];
  if (periodVoteLog.length === 0) return []; // No vote happened
  const finalVotePhase = Math.max(0, ...periodVoteLog.map(l => l.votePhase));
  return periodVoteLog.filter(l => l.votePhase === finalVotePhase);
};

/**
 * Check the agent who gained the most votes.
 * @param entries - Log entries from one vote phase
 * @returns An array of agentId who gained the most votes
 */
export const mostVotes = (entries: BaseVoteLogEntry[]): AgentId[] => {
  if (entries.length === 0) throw new Error('No vote entries');
  const votes = entries.map(e => e.target);
  const voteCount = votes.reduce(
    (acc, v) => acc.set(v, (acc.get(v) ?? 0) + 1),
    new Map<AgentId, number>()
  );
  const maxVote = Math.max(...voteCount.values());
  const topAgents = [...voteCount.entries()].filter(([a, v]) => v === maxVote);
  return topAgents.map(([a, v]) => a);
};

export const nextPeriod = (
  status: GameStatus,
  votePhase: VotePhase = 'chat'
): GameStatus => {
  const { day, period } = status;
  return {
    day: period === 'day' ? day : day + 1,
    period: period === 'day' ? 'night' : 'day',
    votePhase
  };
};

export const prevPeriod = (
  status: GameStatus,
  votePhase: VotePhase = 'chat'
): GameStatus => {
  const { day, period } = status;
  return {
    day: period === 'day' ? day - 1 : day,
    period: period === 'day' ? 'night' : 'day',
    votePhase
  };
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const pickRandomFromArray = <T>(arr: T[]): T => {
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
};
