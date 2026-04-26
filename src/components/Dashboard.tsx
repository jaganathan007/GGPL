import { useApp } from '../store';
import { motion } from 'framer-motion';
import { Users, Swords, Trophy, TrendingUp, ArrowRight, Zap, CalendarDays, Star, ChevronRight, BarChart3, Eye } from 'lucide-react';
import type { Team, Match } from '../types';

interface DashboardProps {
  onNavigate: (view: string) => void;
  onScoreMatch: (matchId: string) => void;
  isAdmin: boolean;
  onViewStats?: (matchId: string) => void;
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

function getInningsOvers(match: Match, inningsIndex: number): number {
  const inn = match.innings[inningsIndex];
  if (!inn) return 0;
  return inn.bowlingEntries.reduce((s, e) => s + e.overs, 0);
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export default function Dashboard({ onNavigate, onScoreMatch, isAdmin, onViewStats }: DashboardProps) {
  const { state } = useApp();
  const { teams, matches } = state;

  const completedMatches = matches.filter(m => m.isComplete);
  const liveMatches = matches.filter(m => !m.isComplete);
  const totalPlayers = teams.reduce((s, t) => s + t.players.length, 0);

  // Top run scorer
  const playerRuns: Record<string, { name: string; runs: number; teamColor: string }> = {};
  matches.forEach(m => {
    m.innings.forEach(inn => {
      const team = getTeam(teams, inn.battingTeamId);
      inn.battingEntries.forEach(entry => {
        const player = team?.players.find(p => p.id === entry.playerId);
        if (player) {
          if (!playerRuns[player.id]) playerRuns[player.id] = { name: player.name, runs: 0, teamColor: team?.color || '#10b981' };
          playerRuns[player.id].runs += entry.runs;
        }
      });
    });
  });
  const topScorer = Object.values(playerRuns).sort((a, b) => b.runs - a.runs)[0];

  // Top wicket taker
  const playerWickets: Record<string, { name: string; wickets: number; teamColor: string }> = {};
  matches.forEach(m => {
    m.innings.forEach(inn => {
      const team = getTeam(teams, inn.bowlingTeamId);
      inn.bowlingEntries.forEach(entry => {
        const player = team?.players.find(p => p.id === entry.playerId);
        if (player) {
          if (!playerWickets[player.id]) playerWickets[player.id] = { name: player.name, wickets: 0, teamColor: team?.color || '#10b981' };
          playerWickets[player.id].wickets += entry.wickets;
        }
      });
    });
  });
  const topWicketTaker = Object.values(playerWickets).sort((a, b) => b.wickets - a.wickets)[0];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Teams', value: teams.length, icon: Users, color: 'from-emerald-500 to-teal-600', onClick: () => onNavigate('teams') },
          { label: 'Matches', value: matches.length, icon: Swords, color: 'from-violet-500 to-purple-600', onClick: () => onNavigate('matches') },
          { label: 'Players', value: totalPlayers, icon: Star, color: 'from-amber-500 to-orange-600', onClick: () => onNavigate('teams') },
          { label: 'Completed', value: completedMatches.length, icon: Trophy, color: 'from-rose-500 to-pink-600', onClick: () => onNavigate('matches') },
        ].map(stat => (
          <button
            key={stat.label}
            onClick={stat.onClick}
            className="group relative overflow-hidden bg-slate-900/70 border border-slate-800/60 rounded-2xl p-4 text-left transition-all hover:border-slate-700/80 hover:shadow-lg hover:shadow-slate-900/50"
          >
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -translate-x-4 -translate-y-4 blur-2xl group-hover:opacity-20 transition-opacity`} />
            <div className={`w-9 h-9 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-2.5 shadow-lg`}>
              <stat.icon className="w-4.5 h-4.5 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{stat.label}</p>
          </button>
        ))}
      </motion.div>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Live Matches</h2>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <div className="space-y-3">
            {liveMatches.map(match => {
              const t1 = getTeam(teams, match.team1Id);
              const t2 = getTeam(teams, match.team2Id);
              return (
                <button
                  key={match.id}
                  onClick={() => isAdmin ? onScoreMatch(match.id) : onViewStats?.(match.id)}
                  className="w-full bg-gradient-to-r from-slate-900/90 to-slate-800/50 border border-emerald-500/20 rounded-2xl p-4 text-left hover:border-emerald-500/40 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="text-center min-w-[80px]">
                        <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: t1?.color || '#10b981' }} />
                        <p className="text-xs font-bold text-slate-200">{t1?.shortName || '??'}</p>
                        <p className="text-lg font-extrabold text-white">
                          {getInningsTotal(match, 0)}/{getInningsWickets(match, 0)}
                        </p>
                        <p className="text-[10px] text-slate-500">{getInningsOvers(match, 0)} ov</p>
                      </div>
                      <span className="text-[10px] text-slate-600 font-bold tracking-wider">VS</span>
                      <div className="text-center min-w-[80px]">
                        <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: t2?.color || '#10b981' }} />
                        <p className="text-xs font-bold text-slate-200">{t2?.shortName || '??'}</p>
                        <p className="text-lg font-extrabold text-white">
                          {match.innings.length > 1 ? `${getInningsTotal(match, 1)}/${getInningsWickets(match, 1)}` : '—'}
                        </p>
                        <p className="text-[10px] text-slate-500">{match.innings.length > 1 ? `${getInningsOvers(match, 1)} ov` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin ? (
                        <span className="text-[9px] text-emerald-400/60 font-semibold uppercase tracking-wider">Score</span>
                      ) : (
                        <span className="text-[9px] text-violet-400/60 font-semibold uppercase tracking-wider">View</span>
                      )}
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Recent Completed Matches */}
      {completedMatches.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Recent Results</h2>
            </div>
            <button onClick={() => onNavigate('matches')} className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {completedMatches.slice(-3).reverse().map(match => {
              const t1 = getTeam(teams, match.team1Id);
              const t2 = getTeam(teams, match.team2Id);
              return (
                <div
                  key={match.id}
                  onClick={() => onViewStats?.(match.id)}
                  className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-slate-700/60 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: t1?.color || '#10b981' }} />
                      <span className="text-xs font-semibold text-slate-300">{t1?.shortName || '??'}</span>
                      <span className="text-sm font-bold text-white">{getInningsTotal(match, 0)}/{getInningsWickets(match, 0)}</span>
                    </div>
                    <span className="text-[10px] text-slate-600">vs</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: t2?.color || '#10b981' }} />
                      <span className="text-xs font-semibold text-slate-300">{t2?.shortName || '??'}</span>
                      <span className="text-sm font-bold text-white">{getInningsTotal(match, 1)}/{getInningsWickets(match, 1)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-emerald-400/80 font-medium max-w-[140px] text-right truncate">{match.result}</p>
                    <Eye className="w-3.5 h-3.5 text-slate-600 group-hover:text-violet-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Top Performers */}
      {(topScorer || topWicketTaker) && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Top Performers</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topScorer && (
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Most Runs</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: topScorer.teamColor }} />
                  <p className="text-sm font-semibold text-white">{topScorer.name}</p>
                </div>
                <p className="text-2xl font-extrabold text-amber-400 mt-1">{topScorer.runs} <span className="text-xs text-slate-500 font-medium">runs</span></p>
              </div>
            )}
            {topWicketTaker && (
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Most Wickets</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: topWicketTaker.teamColor }} />
                  <p className="text-sm font-semibold text-white">{topWicketTaker.name}</p>
                </div>
                <p className="text-2xl font-extrabold text-violet-400 mt-1">{topWicketTaker.wickets} <span className="text-xs text-slate-500 font-medium">wickets</span></p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {teams.length === 0 && (
        <motion.div variants={itemVariants} className="text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <Trophy className="w-9 h-9 text-emerald-400/60" />
          </div>
          <h3 className="text-lg font-bold text-slate-200 mb-2">Welcome to GGPL</h3>
          <p className="text-sm text-slate-400 max-w-xs mx-auto mb-5">
            {isAdmin ? 'Get started by creating your first team and adding players.' : 'No teams have been created yet. Ask an admin to set up the tournament.'}
          </p>
          {isAdmin && (
            <button
              onClick={() => onNavigate('teams')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 transition-all hover:scale-[1.02]"
            >
              <Users className="w-4 h-4" /> Create Teams
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
