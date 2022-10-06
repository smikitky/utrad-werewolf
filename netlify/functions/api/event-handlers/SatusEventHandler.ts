import { Game, LogEntry } from '../../../../src/game-data';

type StatusEventHandler = (
  game: Game
) => undefined | Omit<LogEntry, 'timestamp'>[];

export default StatusEventHandler;
