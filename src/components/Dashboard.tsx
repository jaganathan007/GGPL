import { useApp } from '../store';
import { motion } from 'framer-motion';
import { Radio, Swords, Plus, Calendar, Eye, Activity } from 'lucide-react';
import type { Team, Match, Innings } from '../types';

interface DashboardProps {
  onNavigate: (view: string) => void;
  onScoreMatch: (matchId: string) => void;
  isAdmin: boolean;
  onViewStats?: (matchId: string) => void;
  currentUserId?: string;
}

function getTeam(teams: Team[], id: string): Team | undefined {
  return teams.find(t => t.id === id);
}

function getInningsTotal(match: Match, inningsIndex: number): number {
  const inn = match.innings[inningsIndex];
  if (!inn) return 0;
  return inn.battingEntries.reduce((s, e) => s + e.runs, 0) + inn.extras;
}

function getInningsWickets(match: Match, inningsIndex: number): number {
  const inn = match.innings[inningsIndex];
  if (!inn) return 0;
  return inn.battingEntries.filter(e => !e.isNotOut).length;
}

function getInningsOvers(match: Match, inningsIndex: number): number | string {
  const inn = match.innings[inningsIndex];
  if (!inn) return 0;
  return inn.bowlingEntries.reduce((s, e) => s + e.overs, 0);
}

function getBattersState(currentInn: Innings | undefined, battingTeam: Team | undefined) {
  if (!currentInn) return { b1: null, b2: null };

  const notOutBatters = currentInn.battingEntries.filter(b => b.isNotOut);
  if (notOutBatters.length === 0) return { b1: null, b2: null };

  // 1. Check if currentStrikerId is explicitly saved in innings
  let determinedStrikerId: string | null = currentInn.currentStrikerId || null;

  // 2. Otherwise derive from ballLog
  if (!determinedStrikerId && currentInn.ballLog && currentInn.ballLog.length > 0) {
    const log = currentInn.ballLog;
    const last = log[log.length - 1];
    const lastStrikerName = last.striker || null;

    const isOddRun = (last.type === 'run' || last.type === 'noball') && last.runs % 2 === 1;
    const isEndOfOver = last.ball === 6;
    // Mid-over odd runs -> strike rotated
    // End of over with even runs -> strike rotated
    // End of over with odd runs -> crossing + change ends cancels out (stays same)
    const strikeRotated = (isOddRun && !isEndOfOver) || (!isOddRun && isEndOfOver);

    if (lastStrikerName) {
      const lastStrikerBatter = notOutBatters.find(b => {
        const p = battingTeam?.players.find(pl => pl.id === b.playerId);
        return p?.name === lastStrikerName;
      });

      if (lastStrikerBatter) {
        const otherBatter = notOutBatters.find(b => b.playerId !== lastStrikerBatter.playerId);
        if (strikeRotated && otherBatter) {
          determinedStrikerId = otherBatter.playerId;
        } else {
          determinedStrikerId = lastStrikerBatter.playerId;
        }
      }
    }
  }

  // 3. Fallback: default to first not out batter
  if (!determinedStrikerId && notOutBatters.length > 0) {
    determinedStrikerId = notOutBatters[0].playerId;
  }

  const b1 = notOutBatters[0];
  const b2 = notOutBatters[1];

  const p1 = battingTeam?.players.find(p => p.id === b1?.playerId);
  const p2 = battingTeam?.players.find(p => p.id === b2?.playerId);

  return {
    b1: b1 ? { id: b1.playerId, name: p1?.name || 'Batter 1', runs: b1.runs, balls: b1.balls, isStriker: b1.playerId === determinedStrikerId } : null,
    b2: b2 ? { id: b2.playerId, name: p2?.name || 'Batter 2', runs: b2.runs, balls: b2.balls, isStriker: b2.playerId === determinedStrikerId } : null,
  };
}

export default function Dashboard({ onNavigate, onScoreMatch, isAdmin, onViewStats, currentUserId }: DashboardProps) {
  const { state } = useApp();
  const { teams, matches } = state;

  // Filter matches
  const liveMatches = matches.filter(m => !m.isComplete && m.innings.length > 0);
  const upcomingMatches = matches.filter(m => !m.isComplete && m.innings.length === 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Live Score</h2>
        </div>
        {liveMatches.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            {liveMatches.length} Active {liveMatches.length === 1 ? 'Match' : 'Matches'}
          </span>
        )}
      </div>

      {/* Live Match Cards */}
      {liveMatches.length > 0 ? (
        <div className="space-y-6">
          {liveMatches.map((match) => {
            const currentInnIdx = match.innings.length - 1;
            const currentInn: Innings | undefined = match.innings[currentInnIdx];

            const battingTeamId = currentInn ? currentInn.battingTeamId : match.team1Id;
            const bowlingTeamId = currentInn ? currentInn.bowlingTeamId : match.team2Id;

            const battingTeam = getTeam(teams, battingTeamId);
            const bowlingTeam = getTeam(teams, bowlingTeamId);

            // Batting score
            const battingRuns = currentInn ? getInningsTotal(match, currentInnIdx) : 0;
            const battingWickets = currentInn ? getInningsWickets(match, currentInnIdx) : 0;
            const battingOvers = currentInn ? getInningsOvers(match, currentInnIdx) : 0;

            // Opponent score (if 2nd innings)
            const hasPrevInnings = match.innings.length > 1;
            const prevRuns = hasPrevInnings ? getInningsTotal(match, 0) : null;
            const prevWickets = hasPrevInnings ? getInningsWickets(match, 0) : null;
            const prevOvers = hasPrevInnings ? getInningsOvers(match, 0) : null;

            // Striker & Non-Striker with dynamic strike detection
            const { b1, b2 } = getBattersState(currentInn, battingTeam);

            // Current Bowler
            const bowlingEntries = currentInn?.bowlingEntries || [];
            const activeBowler = bowlingEntries[bowlingEntries.length - 1];
            const bowlerPlayer = bowlingTeam?.players.find(p => p.id === activeBowler?.playerId);
            const bowlerName = bowlerPlayer?.name || 'Bowler';
            const bowlerRunsConceded = activeBowler?.runsConceded ?? 0;
            const bowlerOvers = activeBowler?.overs ?? '0.0';

            const isMatchCreator = (Boolean(currentUserId) && match.ownerId === currentUserId) || isAdmin;

            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all hover:border-cyan-500/40"
              >
                {/* Main Card Content */}
                <div className="p-6 md:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    
                    {/* Left Box: Batting Team */}
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-white text-base shadow-lg ring-2 ring-slate-800"
                        style={{ backgroundColor: battingTeam?.color || '#06b6d4' }}
                      >
                        {battingTeam?.shortName?.slice(0, 3).toUpperCase() || 'BAT'}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-wide">
                          {battingTeam?.shortName || battingTeam?.name || 'Team 1'}
                        </h3>
                        <p className="text-3xl font-extrabold text-cyan-400 leading-tight">
                          {battingRuns}/{battingWickets}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">({battingOvers} ov)</p>
                      </div>
                    </div>

                    {/* Middle Section: Striker & Non-Striker with dynamic blue light */}
                    <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80 space-y-2.5">
                      {b1 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-semibold flex items-center gap-2 truncate ${b1.isStriker ? 'text-white' : 'text-slate-400'}`}>
                            {b1.isStriker ? (
                              <span className="flex items-center gap-1.5 shrink-0">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,1)] animate-pulse inline-block" />
                                <span className="text-cyan-400 font-black text-base leading-none">*</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 pl-0.5 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />
                                <span className="text-slate-500 font-normal leading-none">•</span>
                              </span>
                            )}
                            <span className="truncate">{b1.name}</span>
                          </span>
                          <span className={`whitespace-nowrap ml-2 font-bold ${b1.isStriker ? 'text-white' : 'text-slate-300'}`}>
                            {b1.runs} <span className="text-xs text-slate-500 font-normal">({b1.balls})</span>
                          </span>
                        </div>
                      )}

                      {b2 && (
                        <div className="flex items-center justify-between text-sm pt-1 border-t border-slate-800/60">
                          <span className={`font-semibold flex items-center gap-2 truncate ${b2.isStriker ? 'text-white' : 'text-slate-400'}`}>
                            {b2.isStriker ? (
                              <span className="flex items-center gap-1.5 shrink-0">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,1)] animate-pulse inline-block" />
                                <span className="text-cyan-400 font-black text-base leading-none">*</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 pl-0.5 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />
                                <span className="text-slate-500 font-normal leading-none">•</span>
                              </span>
                            )}
                            <span className="truncate">{b2.name}</span>
                          </span>
                          <span className={`whitespace-nowrap ml-2 font-bold ${b2.isStriker ? 'text-white' : 'text-slate-300'}`}>
                            {b2.runs} <span className="text-xs text-slate-500 font-normal">({b2.balls})</span>
                          </span>
                        </div>
                      )}

                      {!b1 && !b2 && (
                        <div className="text-xs text-slate-500 text-center py-2 italic">
                          Waiting for batsmen to start
                        </div>
                      )}
                    </div>

                    {/* Right Box: Bowling Team & Bowler */}
                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <div className="text-left md:text-right">
                        <h3 className="text-lg font-bold text-white tracking-wide">
                          {bowlingTeam?.shortName || bowlingTeam?.name || 'Team 2'}
                        </h3>
                        <p className="text-xl font-bold text-slate-300">
                          {hasPrevInnings ? `${prevRuns}/${prevWickets} (${prevOvers} ov)` : '-/-'}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center md:justify-end gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                          <span className="font-medium text-slate-300">{bowlerName}</span> - {bowlerRunsConceded} ({bowlerOvers})
                        </p>
                      </div>
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-white text-base shadow-lg ring-2 ring-slate-800"
                        style={{ backgroundColor: bowlingTeam?.color || '#3b82f6' }}
                      >
                        {bowlingTeam?.shortName?.slice(0, 3).toUpperCase() || 'BOWL'}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Bottom Bar: View Stats / Score Match */}
                <div className="bg-slate-950/90 border-t border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>{match.venue || 'Match in progress'} • {match.totalOvers} Overs</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onViewStats?.(match.id)}
                      className="px-5 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      View Scorecard
                    </button>
                    {isMatchCreator && (
                      <button
                        onClick={() => onScoreMatch(match.id)}
                        className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-1.5"
                      >
                        Score Match
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Empty / No Live Match State */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-5">
          <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto text-cyan-400">
            <Radio className="w-8 h-8 opacity-60" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">No Live Matches Right Now</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Start a new match or check scheduled fixtures to begin tracking scores.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('create-match')}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Match
            </button>
            {upcomingMatches.length > 0 && (
              <button
                onClick={() => onNavigate('upcoming-matches')}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold border border-slate-700 transition-all flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" /> Upcoming ({upcomingMatches.length})
              </button>
            )}
            <button
              onClick={() => onNavigate('matches')}
              className="px-5 py-2.5 bg-slate-800/60 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold border border-slate-800 transition-all flex items-center gap-2"
            >
              <Swords className="w-4 h-4" /> All Matches
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
