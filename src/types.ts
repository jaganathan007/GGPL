export interface Player {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  createdAt: string;
}

export interface League {
  id: string;
  name: string;
  code: string;
  ownerId?: string;
  editorCode?: string;
  isTournament?: boolean;
  // Tournament-specific details
  location?: string;
  prizeCount?: number;       // number of prize positions (1, 2, 3, etc.)
  prizes?: number[];         // prize amounts per position [1st, 2nd, 3rd, ...]
  entryFee?: number;         // per team entry fee
  ballType?: string;         // 'stumper' | 'strich' | 'weight' | custom
  contact?: string;          // organizer contact
  ownerName?: string;        // display name of host
  joinedBy?: string[];       // userIds who clicked Join
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  players: Player[];
  leagueId?: string;
  ownerId?: string;
}

export interface BattingEntry {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isNotOut: boolean;
  dismissalType?: 'bowled' | 'caught' | 'lbw' | 'runout' | 'stumped' | 'hitwicket' | 'other';
  bowlerId?: string;
  fielderId?: string;
}

export interface BowlingEntry {
  playerId: string;
  overs: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
}

export interface BallEvent {
  type: 'run' | 'wicket' | 'wide' | 'noball';
  runs: number;
  striker: string;
  bowler: string;
  over: number;
  ball: number;
}

export interface Innings {
  battingTeamId: string;
  bowlingTeamId: string;
  battingEntries: BattingEntry[];
  bowlingEntries: BowlingEntry[];
  extras: number;
  ballLog?: BallEvent[];
  currentStrikerId?: string;
  currentNonStrikerId?: string;
}

export interface Toss {
  winnerId: string;
  decision: 'bat' | 'bowl';
}

export interface Match {
  id: string;
  viewerCode: string;
  adminCode: string;
  leagueCode?: string;
  team1Id: string;
  team2Id: string;
  toss?: Toss;
  date: string;
  time?: string;
  venue: string;
  totalOvers: number;
  innings: Innings[];
  isComplete: boolean;
  result: string;
  winnerId?: string;
  isTie?: boolean;
  ownerId?: string;
  completedAt?: string; // ISO timestamp set when match ends — used for 7-day auto-delete
}

