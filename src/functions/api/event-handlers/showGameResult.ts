import produce from 'immer';
import { ResultLogEntry, team } from '../../../game-data';
import { now } from '../utils';
import StatusEventHandler from './SatusEventHandler';

const showGameResult: StatusEventHandler = (game, pushLog) => {
  const aliveWerewolves = game.agents.filter(
    a => a.role === 'werewolf' && a.life === 'alive'
  ).length;
  const aliveVillagers = game.agents.filter(
    a => a.role !== 'werewolf' && a.life === 'alive'
  ).length;
  const gameEnd = aliveWerewolves === 0 || aliveWerewolves >= aliveVillagers;
  if (!gameEnd) return game;
  const tmp = pushLog<ResultLogEntry>(game, {
    type: 'result',
    survivingVillagers: aliveVillagers,
    survivingWerewolves: aliveWerewolves,
    winner: aliveWerewolves === 0 ? 'villagers' : 'werewolves'
  });
  return produce(tmp, draft => {
    draft.finishedAt = now();
  });
};

export default showGameResult;
