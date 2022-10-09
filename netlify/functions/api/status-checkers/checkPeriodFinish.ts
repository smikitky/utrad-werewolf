import { extractLogOfPeriod, nextPeriod } from '../../../../src/game-utils';
import StatusChecker from './StatusChecker';

const checkPeriodFinish: StatusChecker = game => {
  const { day, period, votePhase } = game.status;
  const alivePeople = game.agents.filter(a => a.life === 'alive');
  const seers = alivePeople.filter(a => a.role === 'seer');
  const periodLog = extractLogOfPeriod(game, day, period);

  const seersCheck =
    period === 'day' ||
    (period === 'night' &&
      (seers.every(s =>
        periodLog.some(l => l.type === 'divine' && l.agent === s.agentId)
      ) ||
        alivePeople.length <= 1));

  const canFinishThisPeriod = votePhase === 'settled' && seersCheck;
  if (canFinishThisPeriod) {
    return { event: 'periodStart', nextStatus: nextPeriod(game.status) };
  }
  return null;
};

export default checkPeriodFinish;
