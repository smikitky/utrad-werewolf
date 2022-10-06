import { extractLogOfPeriod } from '../utils';
import StatusChecker from './StatusChecker';

const checkDayFinish: StatusChecker = game => {
  const { day, period, votePhase } = game.status;
  const alivePeople = game.agents.filter(a => a.life === 'alive');
  const seers = alivePeople.filter(a => a.role === 'seer');
  const periodLog = extractLogOfPeriod(game, day, period);
  const canFinishThisPeriod =
    votePhase === 'settled' &&
    (period === 'day' ||
      (period === 'night' &&
        seers.every(s =>
          periodLog.some(l => l.type === 'divine' && l.agent === s.agentId)
        )));
  if (canFinishThisPeriod) {
    return {
      event: 'periodStart',
      nextStatus: {
        day: period === 'day' ? day : day + 1,
        period: period === 'day' ? 'night' : 'day',
        votePhase: 'chat'
      }
    };
  }
  return null;
};

export default checkDayFinish;
