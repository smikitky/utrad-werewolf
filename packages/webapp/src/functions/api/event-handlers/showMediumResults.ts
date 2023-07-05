import { ExecuteLogEntry, MediumResultLogEntry } from '../../../game-data';
import { extractLogOfPeriod, prevPeriod } from '../../../game-utils';
import StatusEventHandler from './SatusEventHandler';

/**
 * Shows the result of mediums' ability.
 * A medium can know if the person executed was a werewolf or not.
 */
const showMediumResults: StatusEventHandler = (game, pushLog) => {
  const { day, period } = game.status;
  if (!(period === 'night' && day >= 1)) return game;
  const executeEntry = extractLogOfPeriod(game, prevPeriod(game.status)).find(
    l => l.type === 'execute'
  ) as ExecuteLogEntry | undefined;
  if (!executeEntry) return game; // no execution vote was held
  const target = executeEntry.target;
  if (target === 'NOBODY') return game; // nobody was executed

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
