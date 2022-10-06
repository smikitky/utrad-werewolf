import {
  AgentId,
  BaseVoteLogEntry,
  Game,
  GamePeriod,
  LogEntry
} from '../../../src/game-data';

export const extractLogOfPeriod = (
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
