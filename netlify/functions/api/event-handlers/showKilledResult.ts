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
 * Kill the agent who gained the most votes during the last period.
 */
const showKilledResult: StatusEventHandler = (game, pushLog) => {
  const { day, period } = game.status;
  if (day === 0) return game;
  const voteType = period === 'day' ? 'vote' : 'attackVote';
  const periodVoteLog = extractLogOfPeriod(
    game,
    game.status.day,
    game.status.period
  ).filter(l => l.type === voteType) as BaseVoteLogEntry[];
  if (periodVoteLog.length === 0) return game; // No vote happened
  const finalVotePhase = Math.max(0, ...periodVoteLog.map(l => l.votePhase));
  const killedAgent = pickRandomFromArray(
    mostVotes(periodVoteLog.filter(l => l.votePhase === finalVotePhase))
  );
  game = pushLog<AttackLogEntry | ExecuteLogEntry>(game, {
    type: period === 'day' ? 'execute' : 'attack',
    target: killedAgent
  });
  game = produce(game, draft => {
    draft.agents.find(a => a.agentId === killedAgent)!.life = 'dead';
  });
  return game;
};

export default showKilledResult;
