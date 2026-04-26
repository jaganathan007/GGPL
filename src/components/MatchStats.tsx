import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, MapPin, Calendar, Clock, Award, TrendingUp, Target, Zap } from 'lucide-react';
import { useApp } from '../store';
import type { Match, Team, BattingEntry, BowlingEntry } from '../types';

interface Props {
  matchId: string;
  onBack: () => void;
}

function getTeam(teams: Team[], id: string) {
  return teams.find(t => t.id === id);
}

function getPlayerName(teams: Team[], teamId: string, playerId: string): string {
  const team = getTeam(teams, teamId);
  return team?.players.find(p => p.id === playerId)?.name || 'Unknown';
}

function getStrikeRate(runs: number, balls: number): string {
  if (balls === 0) return '0.00';
  return ((runs / balls) * 100).toFixed(1);
}

function getEconomy(runs: number, overs: number): string {
  if (overs === 0) return '0.00';
  // overs stored as e.g. 3.4 meaning 3 overs 4 balls => need to convert properly
  const fullOvers = Math.floor(overs);
  const partialBalls = Math.round((overs - fullOvers) * 10);
  const totalBalls = fullOvers * 6 + partialBalls;
  if (totalBalls === 0) return '0.00';
  return ((runs / totalBalls) * 6).toFixed(2);
}

function getInningsTotal(match: Match, idx: number): number {
  const inn = match.innings[idx];
  if (!inn) return 0;
  return inn.battingEntries.reduce((s, e) => s + e.runs, 0) + inn.extras;
}

function getInningsWickets(match: Match, idx: number): number {
  const inn = match.innings[idx];
  if (!inn) return 0;
  return inn.battingEntries.filter(e => !e.isNotOut).length;
}

function getInningsOvers(match: Match, idx: number): number {
  const inn = match.innings[idx];
  if (!inn) return 0;
  return inn.bowlingEntries.reduce((s, e) => s + e.overs, 0);
}

function bestBatter(entries: BattingEntry[]): BattingEntry | undefined {
  return [...entries].sort((a, b) => b.runs - a.runs || a.balls - b.balls)[0];
}

function bestBowler(entries: BowlingEntry[]): BowlingEntry | undefined {
  return [...entries].sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)[0];
}

export default function MatchStats({ matchId, onBack }: Props) {
  const { state } = useApp();
  const match = state.matches.find(m => m.id === matchId);

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Match not found.</p>
      </div>
    );
  }

  const team1 = getTeam(state.teams, match.team1Id);
  const team2 = getTeam(state.teams, match.team2Id);

  // Determine Man of the Match
  let motm: { name: string; teamColor: string; reason: string } | null = null;
  const allPerformers: { name: string; teamColor: string; score: number; reason: string }[] = [];
  match.innings.forEach(inn => {
    const batTeam = getTeam(state.teams, inn.battingTeamId);
    const bowlTeam = getTeam(state.teams, inn.bowlingTeamId);
    inn.battingEntries.forEach(e => {
      const name = getPlayerName(state.teams, inn.battingTeamId, e.playerId);
      // Score = runs + bonus for SR
      const sr = e.balls > 0 ? (e.runs / e.balls) * 100 : 0;
      const score = e.runs * 2 + (sr > 150 ? 20 : sr > 120 ? 10 : 0);
      allPerformers.push({ name, teamColor: batTeam?.color || '#10b981', score, reason: `${e.runs}(${e.balls})` });
    });
    inn.bowlingEntries.forEach(e => {
      const name = getPlayerName(state.teams, inn.bowlingTeamId, e.playerId);
      const score = e.wickets * 30 + (e.wickets >= 3 ? 25 : 0) - e.runsConceded;
      allPerformers.push({ name, teamColor: bowlTeam?.color || '#10b981', score, reason: `${e.wickets}/${e.runsConceded}` });
    });
  });
  if (allPerformers.length > 0) {
    const best = allPerformers.sort((a, b) => b.score - a.score)[0];
    motm = { name: best.name, teamColor: best.teamColor, reason: best.reason };
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 shadow-lg shadow-emerald-900/30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{team1?.shortName || '??'}</span>
              <span className="text-[10px] text-emerald-100/50 font-bold">VS</span>
              <span className="text-sm font-bold text-white">{team2?.shortName || '??'}</span>
            </div>
            <p className="text-[10px] text-emerald-100/60">Match Stats & Scorecard</p>
          </div>
          {match.isComplete && (
            <div className="ml-auto flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[10px] text-white font-semibold">COMPLETED</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Match Info Bar */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {match.venue}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {match.date}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {match.totalOvers} overs</span>
        </div>

        {/* Score Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-700/40 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold" style={{ background: team1?.color || '#10b981' }}>
                {team1?.shortName.slice(0, 2) || '??'}
              </div>
              <p className="text-xs font-semibold text-slate-300">{team1?.name}</p>
              <p className="text-3xl font-extrabold text-white mt-1">
                {getInningsTotal(match, 0)}<span className="text-lg text-slate-500">/{getInningsWickets(match, 0)}</span>
              </p>
              <p className="text-xs text-slate-500">({getInningsOvers(match, 0)} ov)</p>
            </div>
            <div className="px-4">
              <span className="text-xs text-slate-600 font-bold tracking-widest">VS</span>
            </div>
            <div className="text-center flex-1">
              <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold" style={{ background: team2?.color || '#10b981' }}>
                {team2?.shortName.slice(0, 2) || '??'}
              </div>
              <p className="text-xs font-semibold text-slate-300">{team2?.name}</p>
              <p className="text-3xl font-extrabold text-white mt-1">
                {match.innings.length > 1 ? (
                  <>{getInningsTotal(match, 1)}<span className="text-lg text-slate-500">/{getInningsWickets(match, 1)}</span></>
                ) : <span className="text-slate-600">—</span>}
              </p>
              <p className="text-xs text-slate-500">{match.innings.length > 1 ? `(${getInningsOvers(match, 1)} ov)` : ''}</p>
            </div>
          </div>
          {match.result && (
            <div className="mt-4 text-center">
              <p className="text-sm font-bold text-emerald-400">{match.result}</p>
            </div>
          )}
        </motion.div>

        {/* Man of the Match */}
        {motm && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-amber-500/70 uppercase tracking-wider font-semibold">Man of the Match</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 rounded-full" style={{ background: motm.teamColor }} />
                <p className="text-sm font-bold text-white">{motm.name}</p>
                <span className="text-xs text-slate-400">({motm.reason})</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Innings Scorecards */}
        {match.innings.map((inn, innIdx) => {
          const batTeam = getTeam(state.teams, inn.battingTeamId);
          const bowlTeam = getTeam(state.teams, inn.bowlingTeamId);
          const total = inn.battingEntries.reduce((s, e) => s + e.runs, 0) + inn.extras;
          const wickets = inn.battingEntries.filter(e => !e.isNotOut).length;
          const best = bestBatter(inn.battingEntries);
          const bestBowl = bestBowler(inn.bowlingEntries);

          return (
            <motion.div
              key={innIdx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + innIdx * 0.1 }}
              className="bg-slate-900/60 border border-slate-800/50 rounded-2xl overflow-hidden"
            >
              {/* Innings Header */}
              <div className="px-4 py-3 bg-slate-800/30 border-b border-slate-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: batTeam?.color || '#10b981' }} />
                  <span className="text-sm font-bold text-white">{batTeam?.name || '?'}</span>
                  <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded">{innIdx === 0 ? '1st' : '2nd'} Innings</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-white">{total}<span className="text-sm text-slate-500">/{wickets}</span></span>
                </div>
              </div>

              {/* Batting Scorecard */}
              <div className="px-4 py-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800/30">
                      <th className="text-left py-2 font-medium">Batter</th>
                      <th className="text-right py-2 font-medium w-10">R</th>
                      <th className="text-right py-2 font-medium w-10">B</th>
                      <th className="text-right py-2 font-medium w-10">4s</th>
                      <th className="text-right py-2 font-medium w-10">6s</th>
                      <th className="text-right py-2 font-medium w-14">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inn.battingEntries.map((entry, i) => {
                      const isBest = best && entry.playerId === best.playerId;
                      return (
                        <tr key={i} className={`border-b border-slate-800/20 ${isBest ? 'bg-emerald-500/5' : ''}`}>
                          <td className="py-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-medium ${entry.isNotOut ? 'text-slate-200' : 'text-slate-400'}`}>
                                {getPlayerName(state.teams, inn.battingTeamId, entry.playerId)}
                              </span>
                              {entry.isNotOut && entry.balls > 0 && <span className="text-emerald-400 text-[9px]">*</span>}
                              {isBest && <Zap className="w-3 h-3 text-amber-400" />}
                            </div>
                            {!entry.isNotOut && <span className="text-[9px] text-slate-600">out</span>}
                          </td>
                          <td className="text-right py-2 font-bold text-white">{entry.runs}</td>
                          <td className="text-right py-2 text-slate-400">{entry.balls}</td>
                          <td className="text-right py-2 text-blue-400">{entry.fours}</td>
                          <td className="text-right py-2 text-amber-400">{entry.sixes}</td>
                          <td className="text-right py-2 text-slate-400">{getStrikeRate(entry.runs, entry.balls)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {inn.extras > 0 && (
                  <div className="flex items-center justify-between py-2 text-xs text-slate-500 border-b border-slate-800/20">
                    <span>Extras</span>
                    <span className="font-medium text-slate-400">{inn.extras}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 text-xs font-bold">
                  <span className="text-slate-300">Total</span>
                  <span className="text-white">{total}/{wickets}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="px-4">
                <div className="h-px bg-slate-800/60" />
              </div>

              {/* Bowling Scorecard */}
              <div className="px-4 py-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800/30">
                      <th className="text-left py-2 font-medium">Bowler</th>
                      <th className="text-right py-2 font-medium w-10">O</th>
                      <th className="text-right py-2 font-medium w-10">M</th>
                      <th className="text-right py-2 font-medium w-10">R</th>
                      <th className="text-right py-2 font-medium w-10">W</th>
                      <th className="text-right py-2 font-medium w-14">ER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inn.bowlingEntries.map((entry, i) => {
                      const isBest = bestBowl && entry.playerId === bestBowl.playerId;
                      return (
                        <tr key={i} className={`border-b border-slate-800/20 ${isBest ? 'bg-violet-500/5' : ''}`}>
                          <td className="py-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-slate-200">
                                {getPlayerName(state.teams, inn.bowlingTeamId, entry.playerId)}
                              </span>
                              {isBest && <Target className="w-3 h-3 text-violet-400" />}
                            </div>
                          </td>
                          <td className="text-right py-2 text-slate-400">{entry.overs}</td>
                          <td className="text-right py-2 text-slate-400">{entry.maidens}</td>
                          <td className="text-right py-2 text-white font-bold">{entry.runsConceded}</td>
                          <td className="text-right py-2 font-bold text-violet-400">{entry.wickets}</td>
                          <td className="text-right py-2 text-slate-400">{getEconomy(entry.runsConceded, entry.overs)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          );
        })}

        {/* Match Highlights */}
        {match.innings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Match Highlights</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {match.innings.map((inn, innIdx) => {
                const batTeam = getTeam(state.teams, inn.battingTeamId);
                const totalRuns = inn.battingEntries.reduce((s, e) => s + e.runs, 0) + inn.extras;
                const totalFours = inn.battingEntries.reduce((s, e) => s + e.fours, 0);
                const totalSixes = inn.battingEntries.reduce((s, e) => s + e.sixes, 0);
                const highestScore = Math.max(...inn.battingEntries.map(e => e.runs), 0);
                return (
                  <div key={innIdx} className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: batTeam?.color || '#10b981' }} />
                      <span className="text-[10px] text-slate-400 font-medium">{batTeam?.shortName} — {innIdx === 0 ? '1st' : '2nd'}</span>
                    </div>
                    <div className="bg-slate-800/40 rounded-lg p-2 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">Total</span>
                        <span className="text-white font-bold">{totalRuns}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">Fours</span>
                        <span className="text-blue-400 font-bold">{totalFours}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">Sixes</span>
                        <span className="text-amber-400 font-bold">{totalSixes}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">Highest</span>
                        <span className="text-emerald-400 font-bold">{highestScore}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Back Button */}
        <div className="text-center pt-2 pb-6">
          <button
            onClick={onBack}
            className="px-6 py-2.5 bg-slate-800/60 border border-slate-700/50 text-sm text-slate-300 font-medium rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all"
          >
            ← Back to Matches
          </button>
        </div>
      </div>
    </div>
  );
}
