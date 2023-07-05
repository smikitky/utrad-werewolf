import { Game, GameStatus, StatusLogEvent } from '../../../game-data';

type StatusChecker = (
  game: Game
) => { event: StatusLogEvent; nextStatus: Partial<GameStatus> } | null;

export default StatusChecker;
