import produce from 'immer';
import {
  AttackLogEntry,
  BaseVoteLogEntry,
  ExecuteLogEntry
} from '../../../../src/game-data';
import {
  extractLogOfPeriod,
  mostVotes,
  pickRandomFromArray
} from '../../../../src/game-utils';
import StatusEventHandler from './SatusEventHandler';

/**
 * Kill the agent who gained the most votes during this period.
 */
const showKilledResult: StatusEventHandler = (game, pushLog) => {
  const { day, period } = game.status;
  if (day === 0) return game;
  const voteType = period === 'day' ? 'vote' : 'attackVote';
  const periodLog = extractLogOfPeriod(game);
  const periodVoteLog = periodLog.filter(
    l => l.type === voteType
  ) as BaseVoteLogEntry[];
  if (periodVoteLog.length === 0) return game; // No vote happened
  const finalVotePhase = Math.max(0, ...periodVoteLog.map(l => l.votePhase));
  const killTarget = pickRandomFromArray(
    mostVotes(periodVoteLog.filter(l => l.votePhase === finalVotePhase))
  );

  const protectedByHunter =
    period === 'night' &&
    periodLog.some(l => l.type === 'protect' && l.target === killTarget);

  game = pushLog<AttackLogEntry | ExecuteLogEntry>(game, {
    type: period === 'day' ? 'execute' : 'attack',
    target: protectedByHunter ? 'NOBODY' : killTarget
  });
  if (!protectedByHunter)
    game = produce(game, draft => {
      draft.agents.find(a => a.agentId === killTarget)!.life = 'dead';
    });
  return game;
};

export default showKilledResult;
