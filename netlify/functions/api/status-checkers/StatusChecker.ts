import { Game, GameStatus, StatusLogEvent } from '../../../../src/game-data';

type StatusChecker = (
  game: Game
) => { event: StatusLogEvent; nextStatus: Partial<GameStatus> } | null;

export default StatusChecker;
