import React, { useMemo } from 'react';
import { useApp } from '../store';
import { motion } from 'framer-motion';
import {
  Wifi,
  Calendar,
  CheckCircle,
  Users,
  TrendingUp,
  ArrowRight,
  Trophy,
  Activity,
  PlayCircle,
  Crosshair,
  Award
} from 'lucide-react';
import type { Team, Match } from '../types';

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
  const inn = match.innings[inningsIndex]; if (!inn) return 0;
  return inn.battingEntries.reduce((s, e) => s + e.runs, 0) + inn.extras;
}
function getInningsWickets(match: Match, inningsIndex: number): number {
  const inn = match.innings[inningsIndex]; if (!inn) return 0;
  return inn.battingEntries.filter(e => !e.isNotOut).length;
}
function getInningsOvers(match: Match, inningsIndex: number): number {
  const inn = match.innings[inningsIndex]; if (!inn) return 0;
  return inn.bowlingEntries.reduce((s, e) => s + e.overs, 0);
}

export default function Dashboard({ onNavigate, onScoreMatch, isAdmin, currentUserId }: DashboardProps) {
  const { state } = useApp();
  const { teams, matches, leagues } = state;

  // Filter matches
  const liveMatches = matches.filter(m => !m.isComplete && m.innings.length > 0);
  const upcomingMatches = matches.filter(m => !m.isComplete && m.innings.length === 0);
  const completedMatches = matches.filter(m => m.isComplete);

  const userTeams = currentUserId ? teams.filter(t => t.ownerId === currentUserId) : teams;
  
  // Win rate
  let winRate = 0;
  let userWins = 0;
  if (currentUserId && completedMatches.length > 0) {
    userWins = completedMatches.filter(m => {
      const winner = getTeam(teams, m.winnerId || '');
      return winner?.ownerId === currentUserId;
    }).length;
    winRate = Math.round((userWins / completedMatches.length) * 100);
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (teams.length === 0 && matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="bg-slate-900/50 p-8 rounded-full border border-slate-800">
          <Trophy className="w-16 h-16 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Welcome to Cricverse</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            You don't have any teams or matches yet. Let's get started by creating a team or joining a league!
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => onNavigate('teams')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
          >
            Create Team
          </button>
          <button
            onClick={() => onNavigate('create-match')}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors border border-slate-700"
          >
            Create Match
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 1. Hero Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden bg-gradient-to-r from-slate-800 via-indigo-900 to-violet-900 rounded-2xl p-8 border border-indigo-500/30 shadow-xl"
      >
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
          <Trophy className="w-48 h-48 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Cricket Unites Worlds</h1>
              <p className="text-slate-300 font-medium mt-1">Track • Score • Analyse • Celebrate</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('create-match')}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg"
              >
                Create Match
              </button>
              <button
                onClick={() => onNavigate('leagues')}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium backdrop-blur-sm transition-all border border-white/20"
              >
                Join League
              </button>
              <button
                onClick={() => onNavigate('teams')}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium backdrop-blur-sm transition-all border border-white/20"
              >
                Create Team
              </button>
              <button
                onClick={() => onNavigate('matches')}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium backdrop-blur-sm transition-all border border-white/20"
              >
                Explore
              </button>
            </div>
          </div>
          <div className="mt-6 md:mt-0 md:ml-8 text-right hidden sm:block">
            <p className="text-2xl text-indigo-200/80" style={{ fontFamily: 'Caveat, cursive' }}>
              "More Than a Game,<br/>A Universe"
            </p>
          </div>
        </div>
      </motion.div>

      {/* 2. Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            icon: Wifi,
            value: liveMatches.length,
            label: 'Live Matches',
            subtitle: 'Match in progress',
            color: 'text-rose-400',
            bg: 'bg-rose-500/20'
          },
          {
            icon: Calendar,
            value: upcomingMatches.length,
            label: 'Upcoming Matches',
            subtitle: 'Scheduled matches',
            color: 'text-amber-400',
            bg: 'bg-amber-500/20'
          },
          {
            icon: CheckCircle,
            value: completedMatches.length,
            label: 'Completed Matches',
            subtitle: 'Total completed',
            color: 'text-cyan-400',
            bg: 'bg-cyan-500/20'
          },
          {
            icon: Users,
            value: userTeams.length,
            label: 'My Teams',
            subtitle: 'Teams you manage',
            color: 'text-blue-400',
            bg: 'bg-blue-500/20'
          },
          {
            icon: TrendingUp,
            value: `${winRate}%`,
            label: 'Win Rate',
            subtitle: `${userWins} wins out of ${completedMatches.length}`,
            color: 'text-violet-400',
            bg: 'bg-violet-500/20'
          }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/70 border border-slate-800/60 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
              <p className="text-sm font-medium text-slate-300">{stat.label}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Match Section */}
          {liveMatches.length > 0 && (
            <motion.div variants={itemVariants}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></span>
                  Live Match
                </h2>
                <button
                  onClick={() => onNavigate('matches')}
                  className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  View All Live <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                {liveMatches.map((match, idx) => {
                  if (idx > 0) return null; // Show only first live match
                  
                  const t1 = getTeam(teams, match.team1Id);
                  const t2 = getTeam(teams, match.team2Id);
                  const league = leagues.find(l => l.code === match.leagueCode);
                  
                  const inn1Total = getInningsTotal(match, 0);
                  const inn1Wickets = getInningsWickets(match, 0);
                  const inn1Overs = getInningsOvers(match, 0);
                  
                  const inn2Total = match.innings.length > 1 ? getInningsTotal(match, 1) : 0;
                  const inn2Wickets = match.innings.length > 1 ? getInningsWickets(match, 1) : 0;
                  const inn2Overs = match.innings.length > 1 ? getInningsOvers(match, 1) : 0;

                  return (
                    <div key={match.id} className="relative z-10">
                      <div className="text-center mb-6">
                        <p className="text-indigo-400 text-sm font-semibold tracking-wider uppercase">
                          {league?.name || 'GGPL Premier League'}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">Match 1 • Group Stage</p>
                      </div>

                      <div className="flex justify-between items-center mb-8">
                        <div className="flex-1 text-center">
                          <div className="flex justify-center items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t1?.color || '#3b82f6' }}></div>
                            <span className="text-xl font-bold text-white">{t1?.shortName}</span>
                          </div>
                          <div className="text-3xl font-black text-white">
                            {inn1Total}/{inn1Wickets}
                          </div>
                          <div className="text-slate-400 text-sm">
                            ({Math.floor(inn1Overs / 6)}.{inn1Overs % 6} overs)
                          </div>
                        </div>

                        <div className="px-4">
                          <div className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-xs font-bold tracking-widest animate-pulse">
                            LIVE
                          </div>
                        </div>

                        <div className="flex-1 text-center">
                          <div className="flex justify-center items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t2?.color || '#ef4444' }}></div>
                            <span className="text-xl font-bold text-white">{t2?.shortName}</span>
                          </div>
                          {match.innings.length > 1 ? (
                            <>
                              <div className="text-3xl font-black text-white">
                                {inn2Total}/{inn2Wickets}
                              </div>
                              <div className="text-slate-400 text-sm">
                                ({Math.floor(inn2Overs / 6)}.{inn2Overs % 6} overs)
                              </div>
                            </>
                          ) : (
                            <div className="text-slate-500 italic mt-4">Yet to bat</div>
                          )}
                        </div>
                      </div>

                      {match.innings.length > 1 && (
                        <div className="text-center bg-slate-800/50 rounded-xl py-3 mb-6">
                          <p className="text-amber-400 font-medium">
                            {t2?.shortName} need {inn1Total + 1 - inn2Total} runs in {match.totalOvers * 6 - inn2Overs} balls
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-4 gap-4 pt-6 border-t border-slate-800">
                        <div className="col-span-2 bg-slate-950/50 rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-2 font-semibold">CURRENT BATSMEN</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-300">Player 1*</span>
                              <span className="text-white font-bold">45 (32)</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-300">Player 2</span>
                              <span className="text-white font-bold">12 (8)</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-slate-950/50 rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-2 font-semibold">CURRENT BOWLER</p>
                          <div className="flex flex-col justify-center h-full pb-4">
                            <span className="text-slate-300 text-sm truncate">Bowler 1</span>
                            <span className="text-white font-bold">2-24 (3.4)</span>
                          </div>
                        </div>
                        <div className="bg-slate-950/50 rounded-lg p-3 flex flex-col justify-center text-center">
                          <p className="text-xs text-slate-500 mb-1 font-semibold">RUN RATE</p>
                          <span className="text-xl font-bold text-white">8.54</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <button 
                          onClick={() => onScoreMatch(match.id)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                          <PlayCircle className="w-4 h-4" /> Go to Scoring
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Bottom 3-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Upcoming Matches */}
            <motion.div variants={itemVariants} className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" /> Upcoming
              </h3>
              <div className="space-y-3">
                {upcomingMatches.slice(0, 4).map(match => {
                  const t1 = getTeam(teams, match.team1Id);
                  const t2 = getTeam(teams, match.team2Id);
                  return (
                    <div key={match.id} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                      <div className="flex justify-between text-xs text-slate-500 mb-2">
                        <span>{new Date(match.date).toLocaleDateString()}</span>
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">Group Stage</span>
                      </div>
                      <div className="flex justify-between items-center font-medium text-white text-sm">
                        <span>{t1?.shortName}</span>
                        <span className="text-slate-600 text-xs">vs</span>
                        <span>{t2?.shortName}</span>
                      </div>
                    </div>
                  );
                })}
                {upcomingMatches.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">No upcoming matches</p>
                )}
              </div>
            </motion.div>

            {/* Recent Results */}
            <motion.div variants={itemVariants} className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-cyan-400" /> Recent Results
              </h3>
              <div className="space-y-3">
                {completedMatches.slice(0, 3).map(match => {
                  const t1 = getTeam(teams, match.team1Id);
                  const t2 = getTeam(teams, match.team2Id);
                  const winner = getTeam(teams, match.winnerId || '');
                  return (
                    <div key={match.id} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: winner?.color || '#34d399' }}></div>
                      <div className="pl-2">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span className="truncate pr-2">{winner ? `${winner.shortName} won` : match.result}</span>
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">T20</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className={match.winnerId === t1?.id ? "text-white font-bold" : "text-slate-400"}>
                            {t1?.shortName}
                          </span>
                          <span className="text-slate-600 text-xs">-</span>
                          <span className={match.winnerId === t2?.id ? "text-white font-bold" : "text-slate-400"}>
                            {t2?.shortName}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {completedMatches.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">No recent matches</p>
                )}
              </div>
            </motion.div>

            {/* League Standings */}
            <motion.div variants={itemVariants} className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" /> Standings
              </h3>
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="px-2 py-2 font-medium">Team</th>
                      <th className="px-2 py-2 font-medium text-center">P</th>
                      <th className="px-2 py-2 font-medium text-center">W</th>
                      <th className="px-2 py-2 font-medium text-center">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 bg-slate-900/50 text-white">
                    {teams.slice(0, 5).map((team, idx) => {
                      // simple mock calculations
                      const teamMatches = completedMatches.filter(m => m.team1Id === team.id || m.team2Id === team.id);
                      const wins = teamMatches.filter(m => m.winnerId === team.id).length;
                      return (
                        <tr key={team.id} className="hover:bg-slate-800/50">
                          <td className="px-2 py-2 flex items-center gap-2">
                            <span className="text-slate-500 text-[10px] w-3">{idx + 1}</span>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }}></div>
                            <span className="font-medium truncate max-w-[60px]">{team.shortName}</span>
                          </td>
                          <td className="px-2 py-2 text-center text-slate-400">{teamMatches.length}</td>
                          <td className="px-2 py-2 text-center text-cyan-400">{wins}</td>
                          <td className="px-2 py-2 text-center font-bold text-indigo-400">{wins * 2}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {teams.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4 bg-slate-900/50">No teams found</p>
                )}
              </div>
            </motion.div>

          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          
          {/* Quick Score Panel */}
          <motion.div variants={itemVariants} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="mb-5">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-blue-400" /> Quick Score
              </h3>
              <p className="text-xs text-slate-400 mt-1">Fast scoring for active matches</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '+1 Run', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
                { label: '+4 Runs', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
                { label: '+6 Runs', color: 'bg-cyan-600 hover:bg-cyan-700 text-white' },
                { label: 'Wicket', color: 'bg-rose-600 hover:bg-rose-700 text-white' },
                { label: 'Wide', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
                { label: 'No Ball', color: 'border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10' }
              ].map((btn, i) => (
                <button
                  key={i}
                  disabled={liveMatches.length === 0}
                  onClick={() => liveMatches[0] && onScoreMatch(liveMatches[0].id)}
                  className={`py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${btn.color}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity Panel */}
          <motion.div variants={itemVariants} className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-violet-400" /> Activity
              </h3>
              <button className="text-xs text-indigo-400 hover:text-indigo-300">View All →</button>
            </div>
            
            <div className="space-y-4">
              {completedMatches.slice(0, 4).map((match, i) => {
                const winner = getTeam(teams, match.winnerId || '');
                return (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="mt-1 w-2 h-2 rounded-full bg-cyan-500 shrink-0"></div>
                    <div>
                      <p className="text-sm text-slate-300">
                        <span className="font-bold text-white">{winner?.name || 'A team'}</span> won a match against {getTeam(teams, match.team1Id === winner?.id ? match.team2Id : match.team1Id)?.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(match.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
              {completedMatches.length === 0 && (
                <p className="text-slate-500 text-sm text-center">No recent activity</p>
              )}
            </div>
          </motion.div>

          {/* My Teams Panel */}
          <motion.div variants={itemVariants} className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" /> My Teams
              </h3>
              <button onClick={() => onNavigate('teams')} className="text-xs text-indigo-400 hover:text-indigo-300">
                View All →
              </button>
            </div>
            
            <div className="space-y-3">
              {userTeams.slice(0, 3).map(team => (
                <div key={team.id} className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-inner" style={{ backgroundColor: team.color }}>
                    {team.shortName}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{team.name}</p>
                    <p className="text-xs text-slate-500">{team.players.length} Members</p>
                  </div>
                </div>
              ))}
              {userTeams.length === 0 && (
                <button
                  onClick={() => onNavigate('teams')}
                  className="w-full py-3 border border-dashed border-slate-700 text-slate-400 rounded-xl hover:text-white hover:border-slate-500 transition-colors text-sm"
                >
                  + Create your first team
                </button>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
