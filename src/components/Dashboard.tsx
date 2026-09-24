import { useApp } from '../store';
import { motion } from 'framer-motion';
import { Radio, Swords, Plus, Calendar, Eye, Activity, Trophy, CheckCircle, BarChart3 } from 'lucide-react';
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
  const completedMatches = matches.filter(m => m.isComplete);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* 1. LIVE SCORE SECTION */}
      <div className="space-y-4">
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
                        {battingTeam?.logo ? (
                          <img
                            src={battingTeam.logo}
                            alt={battingTeam.name}
                            className="w-14 h-14 rounded-2xl object-cover shadow-lg ring-2 ring-slate-800 flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-white text-base shadow-lg ring-2 ring-slate-800 flex-shrink-0"
                            style={{ backgroundColor: battingTeam?.color || '#06b6d4' }}
                          >
                            {battingTeam?.shortName?.slice(0, 3).toUpperCase() || 'BAT'}
                          </div>
                        )}
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
                        {bowlingTeam?.logo ? (
                          <img
                            src={bowlingTeam.logo}
                            alt={bowlingTeam.name}
                            className="w-14 h-14 rounded-2xl object-cover shadow-lg ring-2 ring-slate-800 flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-white text-base shadow-lg ring-2 ring-slate-800 flex-shrink-0"
                            style={{ backgroundColor: bowlingTeam?.color || '#3b82f6' }}
                          >
                            {bowlingTeam?.shortName?.slice(0, 3).toUpperCase() || 'BOWL'}
                          </div>
                        )}
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
          /* Notice when no live match currently */
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400">
                <Radio className="w-5 h-5 opacity-70" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">No Live Matches in Progress</h4>
                <p className="text-xs text-slate-400">Scores will appear here automatically when a match begins.</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onNavigate('create-match')}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-900/30 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Create Match
              </button>
              {upcomingMatches.length > 0 && (
                <button
                  onClick={() => onNavigate('upcoming-matches')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" /> Upcoming ({upcomingMatches.length})
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. FINISHED MATCHES / MATCH HISTORY SECTION */}
      {completedMatches.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">Finished Matches</h2>
                <p className="text-xs text-slate-400">Match history and scorecard statistics</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('statistics')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              View All Stats →
            </button>
          </div>

          <div className="space-y-3">
            {completedMatches.slice().reverse().map((match) => {
              const t1 = getTeam(teams, match.team1Id);
              const t2 = getTeam(teams, match.team2Id);

              const inn1 = match.innings[0];
              const inn2 = match.innings[1];

              const t1Inn = match.innings.find(inn => inn.battingTeamId === match.team1Id);
              const t2Inn = match.innings.find(inn => inn.battingTeamId === match.team2Id);

              const t1Runs = t1Inn ? getInningsTotal(match, match.innings.indexOf(t1Inn)) : (inn1 ? getInningsTotal(match, 0) : 0);
              const t1Wkts = t1Inn ? getInningsWickets(match, match.innings.indexOf(t1Inn)) : (inn1 ? getInningsWickets(match, 0) : 0);
              const t1Ovs = t1Inn ? getInningsOvers(match, match.innings.indexOf(t1Inn)) : (inn1 ? getInningsOvers(match, 0) : 0);

              const t2Runs = t2Inn ? getInningsTotal(match, match.innings.indexOf(t2Inn)) : (inn2 ? getInningsTotal(match, 1) : 0);
              const t2Wkts = t2Inn ? getInningsWickets(match, match.innings.indexOf(t2Inn)) : (inn2 ? getInningsWickets(match, 1) : 0);
              const t2Ovs = t2Inn ? getInningsOvers(match, match.innings.indexOf(t2Inn)) : (inn2 ? getInningsOvers(match, 1) : 0);

              const isT1Winner = match.winnerId === match.team1Id;
              const isT2Winner = match.winnerId === match.team2Id;

              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/80 border border-slate-800/90 hover:border-cyan-500/30 rounded-2xl p-5 shadow-xl transition-all"
                >
                  {/* Top metadata */}
                  <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Finished
                      </span>
                      <span>{match.date} {match.time ? `at ${match.time}` : ''}</span>
                      <span className="text-slate-600">•</span>
                      <span>{match.venue}</span>
                      <span className="text-slate-600">•</span>
                      <span>{match.totalOvers} ov</span>
                    </div>

                    {match.result && (
                      <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold rounded-xl">
                        🏆 {match.result}
                      </span>
                    )}
                  </div>

                  {/* Teams and Scores */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {/* Team 1 */}
                    <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      isT1Winner ? 'bg-cyan-950/20 border-cyan-500/40' : 'bg-slate-950/50 border-slate-800/80'
                    }`}>
                      <div className="flex items-center gap-3">
                        {t1?.logo ? (
                          <img
                            src={t1.logo}
                            alt={t1.name}
                            className="w-10 h-10 rounded-xl object-cover shadow-md border border-slate-700/50 flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-md flex-shrink-0"
                            style={{ backgroundColor: t1?.color || '#06b6d4' }}
                          >
                            {t1?.shortName?.slice(0, 3).toUpperCase() || 'T1'}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-white flex items-center gap-1.5">
                            {t1?.name || 'Team 1'}
                            {isT1Winner && <span className="text-xs text-amber-400">★</span>}
                          </p>
                          <p className="text-xs text-slate-400">{t1?.shortName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-white">
                          {t1Runs}/{t1Wkts}
                        </p>
                        <p className="text-xs text-slate-400">({t1Ovs} ov)</p>
                      </div>
                    </div>

                    {/* Team 2 */}
                    <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      isT2Winner ? 'bg-cyan-950/20 border-cyan-500/40' : 'bg-slate-950/50 border-slate-800/80'
                    }`}>
                      <div className="flex items-center gap-3">
                        {t2?.logo ? (
                          <img
                            src={t2.logo}
                            alt={t2.name}
                            className="w-10 h-10 rounded-xl object-cover shadow-md border border-slate-700/50 flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-md flex-shrink-0"
                            style={{ backgroundColor: t2?.color || '#3b82f6' }}
                          >
                            {t2?.shortName?.slice(0, 3).toUpperCase() || 'T2'}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-white flex items-center gap-1.5">
                            {t2?.name || 'Team 2'}
                            {isT2Winner && <span className="text-xs text-amber-400">★</span>}
                          </p>
                          <p className="text-xs text-slate-400">{t2?.shortName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-white">
                          {t2Runs}/{t2Wkts}
                        </p>
                        <p className="text-xs text-slate-400">({t2Ovs} ov)</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: View Stats button */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <span className="text-xs text-slate-400">
                      Viewer Code: <span className="font-mono text-cyan-400 font-bold">{match.viewerCode}</span>
                    </span>
                    <button
                      onClick={() => onViewStats?.(match.id)}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      View Match Stats
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. OVERALL EMPTY STATE (no live matches and no finished matches) */}
      {liveMatches.length === 0 && completedMatches.length === 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-5">
          <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto text-cyan-400">
            <Swords className="w-8 h-8 opacity-60" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">No Matches Yet</h3>
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
          </div>
        </div>
      )}
    </div>
  );
}
