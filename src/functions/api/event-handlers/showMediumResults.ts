import { ExecuteLogEntry, MediumResultLogEntry } from '../../../game-data';
import { extractLogOfPeriod, prevPeriod } from '../../../game-utils';
import StatusEventHandler from './SatusEventHandler';

/**
 * Shows the result of mediums' ability.
 * A medium can know if the person executed the day before was a werewolf or not.
 */
const showMediumResults: StatusEventHandler = (game, pushLog) => {
  const { day, period } = game.status;
  if (!(period === 'day' && day >= 1)) return game;
  const executeEntry = extractLogOfPeriod(game, {
    day: game.status.day - 1,
    period: 'day'
  }).find(l => l.type === 'execute') as ExecuteLogEntry | undefined;
  if (!executeEntry) return game; // no execution vote was held
  const target = executeEntry.target;
  if (target === 'NOBODY') return game; // nobody was executed the day before

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
