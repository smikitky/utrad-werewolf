import produce from 'immer';
import {
  AttackLogEntry,
  BaseVoteLogEntry,
  ExecuteLogEntry,
  GuardLogEntry,
  GuardResultLogEntry
} from '../../../game-data';
import {
  extractLogOfPeriod,
  voteEntries,
  mostVotes,
  pickRandomFromArray
} from '../../../game-utils';
import StatusEventHandler from './SatusEventHandler';
import { gl } from 'date-fns/locale';

/**
 * Kill the agent who gained the most votes during this period.
 */
const showKilledResult: StatusEventHandler = (game, pushLog) => {
  const { day, period } = game.status;
  if (day === 0) return game;
  const voteType = period === 'day' ? 'vote' : 'attackVote';
  const periodLog = extractLogOfPeriod(game);
  const lastVotes = voteEntries(periodLog, voteType, 'last');
  if (!lastVotes.length) return game; // No vote happened

  const killTarget = pickRandomFromArray(mostVotes(lastVotes));

  const successfulGuards = periodLog.filter(
    l => period === 'night' && l.type === 'guard' && l.target === killTarget
  ) as GuardLogEntry[];

  if (period === 'day') {
    game = pushLog<ExecuteLogEntry>(game, {
      type: 'execute',
      target: killTarget
    });
  } else {
    successfulGuards.forEach(l => {
      game = pushLog<GuardResultLogEntry>(game, {
        type: 'guardResult',
        agent: l.agent,
        target: killTarget
      });
    });
    game = pushLog<AttackLogEntry>(game, {
      type: 'attack',
      intendedTarget: killTarget,
      target: successfulGuards.length > 0 ? 'NOBODY' : killTarget
    });
  }

  if (!successfulGuards.length)
    game = produce(game, draft => {
      draft.agents.find(a => a.agentId === killTarget)!.life = 'dead';
    });
  return game;
};

export default showKilledResult;
