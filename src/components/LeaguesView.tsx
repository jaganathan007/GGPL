import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Plus, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../store';
import type { League, Team } from '../types';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateLeagueCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const IPL_TEAMS = [
  { name: 'Chennai Super Kings', short: 'CSK', color: '#FBBF24' },
  { name: 'Mumbai Indians', short: 'MI', color: '#004BA0' },
  { name: 'Royal Challengers Bengaluru', short: 'RCB', color: '#EC1C24' },
  { name: 'Kolkata Knight Riders', short: 'KKR', color: '#3A225D' },
  { name: 'Rajasthan Royals', short: 'RR', color: '#EA1A85' },
  { name: 'Delhi Capitals', short: 'DC', color: '#00008B' },
  { name: 'Punjab Kings', short: 'PBKS', color: '#DD1F2D' },
  { name: 'Sunrisers Hyderabad', short: 'SRH', color: '#F26522' },
  { name: 'Lucknow Super Giants', short: 'LSG', color: '#1B008A' },
  { name: 'Gujarat Titans', short: 'GT', color: '#0B4973' },
];

interface Props {
  isAdmin: boolean;
}

export default function LeaguesView({ isAdmin }: Props) {
  const { state, dispatch } = useApp();
  const { leagues, matches, teams } = state;
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [template, setTemplate] = useState<'custom' | 'ipl'>('custom');
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const leagueId = uid();
    const league: League = {
      id: leagueId,
      name: name.trim(),
      code: generateLeagueCode(),
    };

    dispatch({ type: 'ADD_LEAGUE', payload: league });

    if (template === 'ipl') {
      IPL_TEAMS.forEach(t => {
        const team: Team = {
          id: uid(),
          name: t.name,
          shortName: t.short,
          color: t.color,
          players: [],
          leagueId: leagueId,
        };
        dispatch({ type: 'ADD_TEAM', payload: team });
      });
    }

    setName('');
    setTemplate('custom');
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-emerald-400" />
          Leagues & Tournaments
        </h2>
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-emerald-900/40 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" /> New League
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-lg relative max-w-xl mx-auto"
          >
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-6">Create New League</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">League Name</label>
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Summer Championship 2026"
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">League Template</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTemplate('custom')}
                    className={`py-4 px-4 rounded-xl border-2 transition-all text-left ${template === 'custom' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                  >
                    <div className="font-bold mb-1">Custom</div>
                    <div className="text-[10px] opacity-80">Start from scratch with no teams.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplate('ipl')}
                    className={`py-4 px-4 rounded-xl border-2 transition-all text-left ${template === 'ipl' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                  >
                    <div className="font-bold mb-1">IPL Format</div>
                    <div className="text-[10px] opacity-80">Auto-generates the 10 IPL franchise teams.</div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full py-3.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition-colors mt-2"
              >
                Create League
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {(leagues || []).map(league => {
          const leagueMatches = matches.filter(m => m.leagueCode === league.code);
          const isExpanded = expandedLeague === league.id;

          // Compute Points Table
          const pointsTableMap = new Map<string, { id: string, name: string, short: string, color: string, M: number, W: number, L: number, T: number, Pts: number }>();

          // Add teams explicitly assigned to this league
          teams.filter(t => t.leagueId === league.id).forEach(t => {
            pointsTableMap.set(t.id, { id: t.id, name: t.name, short: t.shortName, color: t.color, M: 0, W: 0, L: 0, T: 0, Pts: 0 });
          });

          // Process matches
          leagueMatches.forEach(m => {
            if (!m.isComplete) return;

            const t1 = teams.find(t => t.id === m.team1Id);
            const t2 = teams.find(t => t.id === m.team2Id);

            if (t1 && !pointsTableMap.has(t1.id)) pointsTableMap.set(t1.id, { id: t1.id, name: t1.name, short: t1.shortName, color: t1.color, M: 0, W: 0, L: 0, T: 0, Pts: 0 });
            if (t2 && !pointsTableMap.has(t2.id)) pointsTableMap.set(t2.id, { id: t2.id, name: t2.name, short: t2.shortName, color: t2.color, M: 0, W: 0, L: 0, T: 0, Pts: 0 });

            const t1Stats = pointsTableMap.get(m.team1Id);
            const t2Stats = pointsTableMap.get(m.team2Id);

            if (t1Stats) t1Stats.M += 1;
            if (t2Stats) t2Stats.M += 1;

            if (m.isTie) {
              if (t1Stats) { t1Stats.T += 1; t1Stats.Pts += 1; }
              if (t2Stats) { t2Stats.T += 1; t2Stats.Pts += 1; }
            } else if (m.winnerId) {
              if (m.winnerId === m.team1Id) {
                if (t1Stats) { t1Stats.W += 1; t1Stats.Pts += 2; }
                if (t2Stats) { t2Stats.L += 1; }
              } else if (m.winnerId === m.team2Id) {
                if (t2Stats) { t2Stats.W += 1; t2Stats.Pts += 2; }
                if (t1Stats) { t1Stats.L += 1; }
              }
            }
          });

          const pointsTable = Array.from(pointsTableMap.values()).sort((a, b) => b.Pts - a.Pts);

          return (
            <motion.div
              key={league.id}
              layout
              className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all group"
            >
              <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">{league.name}</h3>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Code: </span>
                      <span className="text-sm font-mono text-emerald-400 font-bold tracking-widest">{league.code}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded-md">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>{leagueMatches.length} Matches</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => setExpandedLeague(isExpanded ? null : league.id)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    {isExpanded ? <><ChevronUp className="w-4 h-4"/> Hide Details</> : <><ChevronDown className="w-4 h-4"/> Points Table</>}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (confirm('Delete this league? Matches will remain but lose their league association.')) {
                          dispatch({ type: 'DELETE_LEAGUE', payload: league.id });
                        }
                      }}
                      className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-colors"
                      title="Delete League"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-800/60"
                  >
                    <div className="p-5 bg-slate-950/30">
                      <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Points Table</h4>
                      {pointsTable.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                              <tr className="text-slate-500 border-b border-slate-800/60 text-xs">
                                <th className="pb-2 font-medium w-8">#</th>
                                <th className="pb-2 font-medium">Team</th>
                                <th className="pb-2 font-medium text-center w-12">M</th>
                                <th className="pb-2 font-medium text-center w-12 text-emerald-400">W</th>
                                <th className="pb-2 font-medium text-center w-12 text-rose-400">L</th>
                                <th className="pb-2 font-medium text-center w-12 text-amber-400">T</th>
                                <th className="pb-2 font-bold text-center w-16 text-white">Pts</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {pointsTable.map((team, index) => (
                                <tr key={team.id} className="hover:bg-slate-800/30 transition-colors">
                                  <td className="py-3 text-slate-500 text-xs font-semibold">{index + 1}</td>
                                  <td className="py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color }}></div>
                                      <span className="font-semibold text-white">{team.name}</span>
                                      <span className="text-xs text-slate-500">({team.short})</span>
                                    </div>
                                  </td>
                                  <td className="py-3 text-center text-slate-400">{team.M}</td>
                                  <td className="py-3 text-center text-emerald-400/80">{team.W}</td>
                                  <td className="py-3 text-center text-rose-400/80">{team.L}</td>
                                  <td className="py-3 text-center text-amber-400/80">{team.T}</td>
                                  <td className="py-3 text-center text-white font-bold text-base bg-slate-800/20">{team.Pts}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-500 text-sm">
                          No teams have been assigned or played in this league yet.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {(!leagues || leagues.length === 0) && !showForm && (
          <div className="col-span-full text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
            <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No leagues created yet.</p>
            {isAdmin && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 px-6 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
              >
                Create First League
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
