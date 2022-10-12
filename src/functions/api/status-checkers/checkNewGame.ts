import { extractLogOfPeriod } from '../../../game-utils';
import StatusChecker from './StatusChecker';

const checkNewGame: StatusChecker = game => {
  const { day, period, votePhase } = game.status;
  if (!(day === 0 && period === 'night')) return null;
  const periodLog = extractLogOfPeriod(game);
  if (periodLog.length === 0) {
    return { event: 'periodStart', nextStatus: {} };
  } else {
    return null;
  }
};

export default checkNewGame;
