import { extractLogOfPeriod, nextPeriod } from '../../../game-utils';
import StatusChecker from './StatusChecker';

const checkPeriodFinish: StatusChecker = game => {
  const { day, period, votePhase } = game.status;
  const alivePeople = game.agents.filter(a => a.life === 'alive');
  const seers = alivePeople.filter(a => a.role === 'seer');
  const hunters = alivePeople.filter(a => a.role === 'hunter');

  if (Object.keys(game.log).length === 0) {
    return {
      event: 'periodStart',
      nextStatus: { day: 0, period: 'night', votePhase: 'chat' }
    };
  }

  const periodLog = extractLogOfPeriod(game);

  if (game.finishedAt) return null;

  const seersCheck =
    period === 'day' ||
    (period === 'night' &&
      (seers.every(s =>
        periodLog.some(l => l.type === 'divine' && l.agent === s.agentId)
      ) ||
        alivePeople.length <= 1));

  const huntersCheck =
    period === 'day' ||
    day === 0 ||
    (period === 'night' &&
      (hunters.every(s =>
        periodLog.some(l => l.type === 'protect' && l.agent === s.agentId)
      ) ||
        alivePeople.length <= 1));

  const canFinishThisPeriod =
    votePhase === 'settled' && seersCheck && huntersCheck;
  if (canFinishThisPeriod) {
    return { event: 'periodStart', nextStatus: nextPeriod(game.status) };
  }
  return null;
};

export default checkPeriodFinish;
