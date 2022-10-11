import {
  ExecuteLogEntry,
  MediumResultLogEntry
} from '../../../../src/game-data';
import { extractLogOfPeriod, prevPeriod } from '../../../../src/game-utils';
import StatusEventHandler from './SatusEventHandler';

/**
 * Shows the result of mediums' ability during the last period.
 */
const showMediumResults: StatusEventHandler = (game, pushLog) => {
  const { day, period } = game.status;
  if (!(period === 'night' || day > 0)) return game;
  const executeEntry = extractLogOfPeriod(game, prevPeriod(game.status)).find(
    l => l.type === 'execute'
  ) as ExecuteLogEntry | undefined;
  if (!executeEntry) return game;
  const target = executeEntry.target;
  if (target === 'NOBODY') return game;

  const mediums = game.agents.filter(
    p => p.role === 'medium' && p.life === 'alive'
  );

  return mediums.reduce(
    (game, medium) =>
      pushLog<MediumResultLogEntry>(game, {
        type: 'mediumResult',
        agent: medium.agentId,
        target
      }),
    game
  );
};

export default showMediumResults;
