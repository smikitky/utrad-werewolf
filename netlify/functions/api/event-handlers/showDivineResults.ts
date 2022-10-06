import { DivineLogEntry } from '../../../../src/game-data';
import { extractLogOfPeriod } from '../utils';
import StatusEventHandler from './SatusEventHandler';

/**
 * Shows the result of divines during the last night.
 */
const showDivineResults: StatusEventHandler = game => {
  const { day, period } = game.status;
  if (period !== 'day') return;
  const lastNightLog = extractLogOfPeriod(game, day - 1, 'night');
  const divineLog = lastNightLog.filter(
    l => l.type === 'divine'
  ) as DivineLogEntry[];
  return divineLog.map(l => ({
    type: 'divineResult',
    agent: l.agent,
    target: l.target
  }));
};

export default showDivineResults;
