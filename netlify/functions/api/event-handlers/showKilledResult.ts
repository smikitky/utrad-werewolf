import { BaseVoteLogEntry } from '../../../../src/game-data';
import { extractLogOfPeriod, mostVotes, pickRandomFromArray } from '../utils';
import StatusEventHandler from './SatusEventHandler';

/**
 * Kill the agent who gained the most votes during the last period.
 */
const showKilledResult: StatusEventHandler = game => {
  const { day, period } = game.status;
  if (day === 0) return;
  const voteType = period === 'day' ? 'attackVote' : 'vote';
  const lastPeriodVotes = extractLogOfPeriod(
    game,
    period === 'day' ? day - 1 : day,
    period === 'day' ? 'night' : 'day'
  ).filter(l => l.type === voteType) as BaseVoteLogEntry[];
  if (lastPeriodVotes.length === 0) return; // No vote happened
  const lastVotePhase = Math.max(0, ...lastPeriodVotes.map(l => l.votePhase));
  const killedAgent = pickRandomFromArray(
    mostVotes(lastPeriodVotes.filter(l => l.votePhase === lastVotePhase))
  );
  game.agents.find(a => a.agentId === killedAgent)!.life = 'dead';
  return [
    { type: period === 'day' ? 'execute' : 'attack', target: killedAgent }
  ];
};

export default showKilledResult;
