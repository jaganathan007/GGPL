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

export interface Innings {
  battingTeamId: string;
  bowlingTeamId: string;
  battingEntries: BattingEntry[];
  bowlingEntries: BowlingEntry[];
  extras: number;
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
  venue: string;
  totalOvers: number;
  innings: Innings[];
  isComplete: boolean;
  result: string;
  winnerId?: string;
  isTie?: boolean;
  ownerId?: string;
}
