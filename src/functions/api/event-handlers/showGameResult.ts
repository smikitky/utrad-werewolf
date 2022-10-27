import produce from 'immer';
import { ResultLogEntry, Team } from '../../../game-data';
import { now } from '../utils';
import StatusEventHandler from './SatusEventHandler';

/**
 * Checks if one of the tems won the game.
 * This check is done before a new day starts (i.e., at the end of each night).
 */
const showGameResult: StatusEventHandler = (game, pushLog) => {
  const { day, period } = game.status;
  if (period !== 'night') return game;
  const aliveWerewolves = game.agents.filter(
    a => a.role === 'werewolf' && a.life === 'alive'
  ).length;
  const aliveVillagers = game.agents.filter(
    a => a.role !== 'werewolf' && a.life === 'alive'
  ).length;
  const gameEnd = aliveWerewolves === 0 || aliveWerewolves >= aliveVillagers;
  if (!gameEnd) return game;
  const winner: Team = aliveWerewolves === 0 ? 'villagers' : 'werewolves';
  const tmp = pushLog<ResultLogEntry>(game, {
    type: 'result',
    survivingVillagers: aliveVillagers,
    survivingWerewolves: aliveWerewolves,
    winner
  });
  return produce(tmp, draft => {
    draft.finishedAt = now();
    draft.winner = winner;
  });
};

export default showGameResult;
