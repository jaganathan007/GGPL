export interface Player {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  players: Player[];
}

export interface BattingEntry {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isNotOut: boolean;
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

export interface Match {
  id: string;
  team1Id: string;
  team2Id: string;
  date: string;
  venue: string;
  totalOvers: number;
  innings: Innings[];
  isComplete: boolean;
  result: string;
}
