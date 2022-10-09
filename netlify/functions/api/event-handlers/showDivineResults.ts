import {
  DivineLogEntry,
  DivineResultLogEntry
} from '../../../../src/game-data';
import { extractLogOfPeriod } from '../../../../src/game-utils';
import StatusEventHandler from './SatusEventHandler';

/**
 * Shows the result of divines during the last night.
 */
const showDivineResults: StatusEventHandler = (game, pushLog) => {
  const { day, period } = game.status;
  if (period !== 'day') return game;
  const lastNightLog = extractLogOfPeriod(game, day - 1, 'night');
  const divineLog = lastNightLog.filter(
    l => l.type === 'divine'
  ) as DivineLogEntry[];
  return divineLog.reduce(
    (game, entry) =>
      pushLog<DivineResultLogEntry>(game, {
        type: 'divineResult',
        agent: entry.agent,
        target: entry.target
      }),
    game
  );
};

export default showDivineResults;
