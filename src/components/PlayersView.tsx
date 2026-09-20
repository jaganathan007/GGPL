import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { useApp } from '../store';

interface Props {
  currentUserId?: string;
  isLoggedIn?: boolean;
  onNavigateToTeams?: () => void;
}

export default function PlayersView({ currentUserId, isLoggedIn, onNavigateToTeams }: Props) {
  const { state } = useApp();
  const { teams, matches } = state;

  // Only show teams owned by the current user
  const myTeams = currentUserId
    ? teams.filter((t) => t.ownerId === currentUserId)
    : teams;

  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  // Aggregate per-player stats from all completed matches
  function getPlayerStats(playerId: string) {
    let innings = 0;
    let runs = 0;
    let balls = 0;
    let fours = 0;
    let sixes = 0;
    let hs = 0;
    let notOuts = 0;

    let wickets = 0;
    let oversBowled = 0;
    let runsConceded = 0;
    let maidens = 0;
    let bestWickets = 0;
    let bestRuns = 999;

    for (const match of matches) {
      for (const inn of match.innings) {
        // Batting
        const bat = inn.battingEntries.find((e) => e.playerId === playerId);
        if (bat) {
          innings++;
          runs += bat.runs;
          balls += bat.balls;
          fours += bat.fours;
          sixes += bat.sixes;
          if (bat.isNotOut) notOuts++;
          if (bat.runs > hs) hs = bat.runs;
        }
        // Bowling
        const bowl = inn.bowlingEntries.find((e) => e.playerId === playerId);
        if (bowl) {
          wickets += bowl.wickets;
          oversBowled += bowl.overs;
          runsConceded += bowl.runsConceded;
          maidens += bowl.maidens;
          if (bowl.wickets > bestWickets || (bowl.wickets === bestWickets && bowl.runsConceded < bestRuns)) {
            bestWickets = bowl.wickets;
            bestRuns = bowl.runsConceded;
          }
        }
      }
    }

    const dismissals = innings - notOuts;
    const avg = dismissals > 0 ? (runs / dismissals).toFixed(1) : runs > 0 ? '∞' : '-';
    const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '-';
    const economy = oversBowled > 0 ? (runsConceded / oversBowled).toFixed(1) : '-';
    const bowlAvg = wickets > 0 ? (runsConceded / wickets).toFixed(1) : '-';

    return { innings, runs, balls, fours, sixes, hs, notOuts, avg, sr, wickets, oversBowled, runsConceded, maidens, economy, bowlAvg, bestWickets, bestRuns };
  }

  const totalPlayers = myTeams.reduce((sum, t) => sum + t.players.length, 0);

  if (myTeams.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" /> Players
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">All players from your teams</p>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-16 h-16 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400 mb-4">
            {isLoggedIn
              ? "You don't have any teams yet. Create a team first to add players."
              : 'Log in to see your players.'}
          </p>
          {isLoggedIn && onNavigateToTeams && (
            <button
              onClick={onNavigateToTeams}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-500 text-white text-sm font-semibold rounded-xl shadow-lg transition-all hover:shadow-cyan-900/50"
            >
              <Users className="w-4 h-4" /> Go to Teams
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-cyan-400" /> Players
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {totalPlayers} player{totalPlayers !== 1 ? 's' : ''} across {myTeams.length} team{myTeams.length !== 1 ? 's' : ''}
        </p>
      </div>

      {myTeams.map((team) => (
        <div key={team.id} className="space-y-2">
          {/* Team Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: team.color }}>
              {team.shortName.slice(0, 2)}
            </div>
            <h3 className="text-sm font-bold text-white">{team.name}</h3>
            <span className="text-xs text-slate-500">({team.players.length} players)</span>
          </div>

          {team.players.length === 0 ? (
            <p className="text-xs text-slate-600 italic ml-9">No players added yet.</p>
          ) : (
            <div className="space-y-1.5">
              {team.players.map((player, idx) => {
                const stats = getPlayerStats(player.id);
                const isExpanded = expandedPlayer === player.id;
                const hasStats = stats.innings > 0 || stats.wickets > 0;

                return (
                  <motion.div
                    key={player.id}
                    layout
                    className="bg-slate-900/60 border border-slate-800/40 rounded-xl overflow-hidden"
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-[10px] text-slate-600 font-mono w-5 text-right flex-shrink-0">{idx + 1}</span>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: `${team.color}33`, border: `1px solid ${team.color}66` }}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{player.name}</p>
                        {hasStats && (
                          <p className="text-[10px] text-slate-500">
                            {stats.innings > 0 && `${stats.runs} runs`}
                            {stats.wickets > 0 && ` · ${stats.wickets} wkts`}
                          </p>
                        )}
                      </div>
                      {hasStats && (
                        <button
                          onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                          className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-slate-800/60 rounded-lg transition-all flex items-center gap-1"
                          title="View stats"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {isExpanded && hasStats && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-800/40 px-4 pb-4 pt-3 space-y-3">
                            {stats.innings > 0 && (
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Batting</p>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                  {[
                                    { label: 'Inn', value: stats.innings },
                                    { label: 'Runs', value: stats.runs },
                                    { label: 'HS', value: stats.hs },
                                    { label: 'Avg', value: stats.avg },
                                    { label: 'SR', value: stats.sr },
                                    { label: '4s/6s', value: `${stats.fours}/${stats.sixes}` },
                                  ].map((s) => (
                                    <div key={s.label} className="bg-slate-800/50 rounded-lg p-2 text-center">
                                      <p className="text-[9px] text-slate-500 font-bold uppercase">{s.label}</p>
                                      <p className="text-sm font-bold text-white">{s.value}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {stats.wickets > 0 && (
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Bowling</p>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                  {[
                                    { label: 'Ovrs', value: stats.oversBowled },
                                    { label: 'Wkts', value: stats.wickets },
                                    { label: 'Runs', value: stats.runsConceded },
                                    { label: 'Econ', value: stats.economy },
                                    { label: 'Best', value: `${stats.bestWickets}/${stats.bestRuns}` },
                                  ].map((s) => (
                                    <div key={s.label} className="bg-slate-800/50 rounded-lg p-2 text-center">
                                      <p className="text-[9px] text-slate-500 font-bold uppercase">{s.label}</p>
                                      <p className="text-sm font-bold text-white">{s.value}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
