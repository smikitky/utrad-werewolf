import { DivineLogEntry, DivineResultLogEntry } from '../../../game-data';
import { extractLogOfPeriod, prevPeriod } from '../../../game-utils';
import StatusEventHandler from './SatusEventHandler';

/**
 * Shows the result of divines during the last night.
 */
const showDivineResults: StatusEventHandler = (game, pushLog) => {
  const { day, period } = game.status;
  if (period !== 'day') return game;
  const lastNightLog = extractLogOfPeriod(game, prevPeriod(game.status));
  const divineLog = lastNightLog.filter(
    l =>
      l.type === 'divine' &&
      game.agents.find(a => a.agentId === l.agent)!.life === 'alive'
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
