/**
 * One-based player identifier in a game.
 * Also determines the order of displayed players in the game.
 */
export type AgentId =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;

export const agentRoles = [
  'werewolf',
  'villager',
  'seer',
  'possessed',
  'medium',
  'hunter'
] as const;

export type AgentRole = typeof agentRoles[number];

export type Team = 'villagers' | 'werewolves';

export const team = (role: AgentRole): Team => {
  switch (role) {
    case 'villager':
    case 'seer':
    case 'possessed':
    case 'medium':
    case 'hunter':
      return 'villagers';
    case 'werewolf':
      return 'werewolves';
  }
};

export type Life = 'alive' | 'dead';

export interface AgentInfo {
  agentId: AgentId;
  role: AgentRole;
  life: Life;
  name: string;
  /**
   * System UID of the agent (must be hidden from players).
   */
  userId: string;
}

export type LogType =
  | 'status'
  | 'talk'
  | 'whisper'
  | 'over' // indicates no intention to speak more
  | 'vote' // by all surviving agents
  | 'attackVote' // by werewolves
  | 'divine' // by seer
  | 'divineResult'
  | 'mediumResult' // by medium
  | 'protect' // by hunter
  | 'protectResult'
  | 'execute' // by daytime vote
  | 'attack' // by werewolves
  | 'result';

// object is ReturnType<typeof serverTimestamp>
export type TimeStamp = number | object;

export interface BaseLogEntry {
  timestamp: TimeStamp;
  type: LogType;
}

export interface AgentStatus {
  agentId: AgentId;
  life: Life;
}

/**
 * Phase of the game, within a certain period.
 * - `chat` means the players (or werewolves) can talk to each other.
 * - A positive integer (1, 2, ...) refers to the voting round nubmer.
 * - `settled` means the voting is finished.
 *   The game may proceed to the next period if other required actions are done.
 */
export type VotePhase = 'chat' | number | 'settled';

export type GamePeriod = 'day' | 'night';

export type StatusLogEvent =
  | 'periodStart'
  | 'voteStart'
  | 'voteSettle'
  | 'gameFinish';

export interface StatusLogEntry extends BaseLogEntry {
  type: 'status';
  day: number;
  period: GamePeriod;
  votePhase: VotePhase;
  event: StatusLogEvent;
  agents: AgentStatus[];
}

export interface ActionLogEntry extends BaseLogEntry {
  type: Exclude<LogType, 'status'>;
  agent: AgentId;
}

export interface ChatLogEntry extends ActionLogEntry {
  type: 'talk' | 'whisper';
  content: string;
}

export interface TalkLogEntry extends ChatLogEntry {
  type: 'talk';
}

export interface WhisperLogEntry extends ChatLogEntry {
  type: 'whisper';
}

export interface OverLogEntry extends ActionLogEntry {
  type: 'over';
  chatType: 'talk' | 'whisper';
}

export interface DivineLogEntry extends ActionLogEntry {
  type: 'divine';
  target: AgentId;
}

export interface DivineResultLogEntry extends ActionLogEntry {
  type: 'divineResult';
  target: AgentId;
}

export interface MediumResultLogEntry extends ActionLogEntry {
  type: 'mediumResult';
  target: AgentId;
}

export interface ProtectLogEntry extends ActionLogEntry {
  type: 'protect';
  target: AgentId;
}

export interface ProtectResultLogEntry extends ActionLogEntry {
  type: 'protectResult';
  target: AgentId;
}

export interface BaseVoteLogEntry extends ActionLogEntry {
  type: 'vote' | 'attackVote';
  votePhase: number;
  target: AgentId;
}

export interface VoteLogEntry extends BaseVoteLogEntry {
  type: 'vote';
}

export interface AttackVoteLogEntry extends BaseVoteLogEntry {
  type: 'attackVote';
}

export interface KillLogEntry extends BaseLogEntry {
  type: 'execute' | 'attack';
  target: AgentId | 'NOBODY';
}

export interface ExecuteLogEntry extends KillLogEntry {
  type: 'execute';
}

export interface AttackLogEntry extends KillLogEntry {
  type: 'attack';
}

export interface ResultLogEntry extends BaseLogEntry {
  type: 'result';
  survivingVillagers: number;
  survivingWerewolves: number;
  winner: Team;
}

export type LogEntry =
  | StatusLogEntry
  | TalkLogEntry
  | WhisperLogEntry
  | OverLogEntry
  | DivineLogEntry
  | DivineResultLogEntry
  | MediumResultLogEntry
  | ProtectLogEntry
  | ProtectResultLogEntry
  | VoteLogEntry
  | AttackVoteLogEntry
  | ExecuteLogEntry
  | AttackLogEntry
  | ResultLogEntry;

export interface GameStatus {
  /**
   * Zero-based index of the in-game date.
   * Day 0 is the first day, when players are assigned roles and make their first talk.
   */
  day: number;
  /**
   * In-game time period of the day, either day or night.
   */
  period: GamePeriod;
  /**
   * Vote phase of the game, within a certain period of the day.
   */
  votePhase: VotePhase;
}

export interface LogEntries {
  [logId: string]: LogEntry;
}

/*
export interface GameRuleSet {
  maxVoteRounds: number;
  maxChat: number;
  topVoteGetterFate: 'killAll' | 'killOne';
}
*/

export interface Game {
  startedAt: TimeStamp;
  finishedAt?: TimeStamp;
  wasAborted?: boolean;
  winner?: Team;
  agents: AgentInfo[];
  status: GameStatus;
  log: LogEntries;
}

export interface GameEntries {
  [gameId: string]: Game;
}

export interface UserEntry {
  createdAt: number;
  name: string;
  onlineStatus?: boolean;
  currentGameId?: string;
}

export interface UserEntries {
  [uid: string]: UserEntry;
}

export interface Database {
  users: UserEntries;
  games: GameEntries;
}

export type AgentCount = Record<AgentRole, number>;

export const defaultAgentCount: AgentCount = {
  villager: 1,
  werewolf: 2,
  seer: 1,
  possessed: 1,
  medium: 0,
  hunter: 0
};
