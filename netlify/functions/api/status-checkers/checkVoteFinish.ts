import { BaseVoteLogEntry } from '../../../../src/game-data';
import { mostVotes, extractLogOfPeriod } from '../../../../src/game-utils';
import StatusChecker from './StatusChecker';

const checkVoteFinish: StatusChecker = game => {
  const { day, period, votePhase } = game.status;
  if (typeof votePhase !== 'number') return null;
  // A vote phase ends when all agents who can cast a vote have cast their votes
  const alivePeople = game.agents.filter(a => a.life === 'alive');
  const werewolves = alivePeople.filter(a => a.role === 'werewolf');
  const voters = period === 'day' ? alivePeople : werewolves;
  const voteType = period === 'day' ? 'vote' : 'attackVote';
  const periodLog = extractLogOfPeriod(game, day, period);
  const voteLog = periodLog.filter(
    l => l.type === voteType && l.votePhase === votePhase
  ) as BaseVoteLogEntry[];
  const allVotesCast = voters.every(v =>
    voteLog.some(l => l.agent === v.agentId)
  );
  if (allVotesCast) {
    const voteResult = mostVotes(voteLog);
    if (voteResult.length === 1 || votePhase >= 2) {
      return { event: 'voteSettle', nextStatus: { votePhase: 'settled' } };
    } else {
      // The result was a tie, proceed to the next vote round
      return {
        event: 'voteStart',
        nextStatus: { votePhase: votePhase + 1 }
      };
    }
  }
  return null;
};

export default checkVoteFinish;
