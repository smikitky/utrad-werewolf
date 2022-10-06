import { team } from '../../../../src/game-data';
import StatusEventHandler from './SatusEventHandler';

const showGameResult: StatusEventHandler = game => {
  const { day } = game.status;
  if (day === 0) return;
  const aliveWerewolves = game.agents.filter(
    a => team(a.role) === 'werewolves' && a.life === 'alive'
  ).length;
  const aliveVillagers = game.agents.filter(
    a => team(a.role) === 'villagers' && a.life === 'alive'
  ).length;
  const gameEnd = aliveWerewolves === 0 || aliveWerewolves >= aliveVillagers;
  if (!gameEnd) return;
  return [
    {
      type: 'result',
      survivingVillagers: aliveVillagers,
      survivingWerewolves: aliveWerewolves,
      winner: aliveWerewolves === 0 ? 'villagers' : 'werewolves'
    }
  ];
};

export default showGameResult;
