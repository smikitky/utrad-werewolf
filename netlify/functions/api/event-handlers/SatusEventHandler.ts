import { Game, LogEntry } from '../../../../src/game-data';

export type PushLog = <T extends LogEntry>(
  game: Game,
  entry: Omit<T, 'timestamp'>
) => Game;

type StatusEventHandler = (game: Game, pushLog: PushLog) => Game;

export default StatusEventHandler;
