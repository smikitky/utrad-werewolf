import { extractLogOfPeriod } from '../../../../src/game-utils';
import StatusChecker from './StatusChecker';

const checkGameFinish: StatusChecker = game => {
  const { day, period } = game.status;
  const periodLog = extractLogOfPeriod(game, day, period);
  if (periodLog.some(l => l.type === 'result')) {
    return { event: 'gameFinish', nextStatus: {} };
  }
  return null;
};

export default checkGameFinish;
