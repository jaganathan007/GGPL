import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Plus, X, Trash2, ChevronDown, ChevronUp, Users, UserPlus } from 'lucide-react';
import { useApp } from '../store';
import type { League, Team } from '../types';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateLeagueCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

interface Props {
  isAdmin: boolean;
  focusLeagueId?: string;
  inlineCreate?: boolean;
  onDone?: () => void;
}

export default function LeaguesView({ isAdmin, focusLeagueId, inlineCreate, onDone }: Props) {
  const { state, dispatch } = useApp();
  const { leagues, matches, teams } = state;
  const [showForm, setShowForm] = useState(!!inlineCreate);
  const [name, setName] = useState('');
  const [expandedLeague, setExpandedLeague] = useState<string | null>(focusLeagueId || null);
  const [createdCode, setCreatedCode] = useState('');

  // Add team state
  const [addTeamLeague, setAddTeamLeague] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShort, setNewTeamShort] = useState('');

  // Add player state
  const [addPlayerTeam, setAddPlayerTeam] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const leagueId = uid();
    const code = generateLeagueCode();
    const league: League = { id: leagueId, name: name.trim(), code };
    dispatch({ type: 'ADD_LEAGUE', payload: league });
    setName('');
    setCreatedCode(code);
    setShowForm(false);
  }

  function handleAddTeam(leagueId: string) {
    if (!newTeamName.trim() || !newTeamShort.trim()) return;
    const team: Team = {
      id: uid(),
      name: newTeamName.trim(),
      shortName: newTeamShort.trim().toUpperCase().slice(0, 4),
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
      players: [],
      leagueId,
    };
    dispatch({ type: 'ADD_TEAM', payload: team });
    setNewTeamName('');
    setNewTeamShort('');
    setAddTeamLeague(null);
  }

  function handleAddPlayer(teamId: string) {
    if (!newPlayerName.trim()) return;
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const updated = { ...team, players: [...team.players, { id: uid(), name: newPlayerName.trim() }] };
    dispatch({ type: 'UPDATE_TEAM', payload: updated });
    setNewPlayerName('');
  }

  const visibleLeagues = focusLeagueId
    ? (leagues || []).filter(l => l.id === focusLeagueId)
    : (leagues || []);

  // Inline create mode: just show create form + result
  if (inlineCreate) {
    return (
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-lg relative max-w-xl mx-auto">
        <button onClick={onDone} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        {createdCode ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto"><Trophy className="w-8 h-8 text-amber-400" /></div>
            <h3 className="text-lg font-bold text-white">League Created!</h3>
            <p className="text-sm text-slate-400">Share this code with scorers to link matches:</p>
            <p className="text-3xl font-mono font-bold text-amber-400 tracking-[0.2em] bg-slate-950/50 rounded-xl py-4 border border-slate-800">{createdCode}</p>
            <button onClick={onDone} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-all">Done</button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-white mb-6">Create New League</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">League Name</label>
                <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Championship 2026"
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all" />
              </div>
              <button type="submit" disabled={!name.trim()} className="w-full py-3.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition-colors">Create League</button>
            </form>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-emerald-400" />
          {focusLeagueId ? visibleLeagues[0]?.name || 'League' : 'Leagues & Tournaments'}
        </h2>
        {isAdmin && !focusLeagueId && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-emerald-900/40 transition-all hover:scale-[1.02]">
            <Plus className="w-4 h-4" /> New League
          </button>
        )}
      </div>

      {/* Create form (admin, full view) */}
      <AnimatePresence>
        {showForm && !inlineCreate && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-lg relative max-w-xl mx-auto">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-white mb-6">Create New League</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">League Name</label>
                <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Championship 2026"
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all" />
              </div>
              <button type="submit" disabled={!name.trim()} className="w-full py-3.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition-colors mt-2">Create League</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {visibleLeagues.map(league => {
          const leagueTeams = teams.filter(t => t.leagueId === league.id);
          const leagueMatches = matches.filter(m => m.leagueCode === league.code);
          const isExpanded = expandedLeague === league.id || !!focusLeagueId;

          // Compute Points Table
          const ptMap = new Map<string, { id: string; name: string; short: string; color: string; M: number; W: number; L: number; T: number; Pts: number }>();
          leagueTeams.forEach(t => ptMap.set(t.id, { id: t.id, name: t.name, short: t.shortName, color: t.color, M: 0, W: 0, L: 0, T: 0, Pts: 0 }));

          leagueMatches.forEach(m => {
            if (!m.isComplete) return;
            const t1 = teams.find(t => t.id === m.team1Id);
            const t2 = teams.find(t => t.id === m.team2Id);
            if (t1 && !ptMap.has(t1.id)) ptMap.set(t1.id, { id: t1.id, name: t1.name, short: t1.shortName, color: t1.color, M: 0, W: 0, L: 0, T: 0, Pts: 0 });
            if (t2 && !ptMap.has(t2.id)) ptMap.set(t2.id, { id: t2.id, name: t2.name, short: t2.shortName, color: t2.color, M: 0, W: 0, L: 0, T: 0, Pts: 0 });
            const s1 = ptMap.get(m.team1Id); const s2 = ptMap.get(m.team2Id);
            if (s1) s1.M++; if (s2) s2.M++;
            if (m.isTie) { if (s1) { s1.T++; s1.Pts++; } if (s2) { s2.T++; s2.Pts++; } }
            else if (m.winnerId) {
              if (m.winnerId === m.team1Id) { if (s1) { s1.W++; s1.Pts += 2; } if (s2) s2.L++; }
              else { if (s2) { s2.W++; s2.Pts += 2; } if (s1) s1.L++; }
            }
          });
          const pointsTable = Array.from(ptMap.values()).sort((a, b) => b.Pts - a.Pts);

          return (
            <motion.div key={league.id} layout
              className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all">
              <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">{league.name}</h3>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div><span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Code: </span>
                      <span className="text-sm font-mono text-emerald-400 font-bold tracking-widest">{league.code}</span></div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded-md">
                      <Users className="w-3.5 h-3.5 text-blue-400" /><span>{leagueTeams.length} Teams</span></div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded-md">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" /><span>{leagueMatches.length} Matches</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  {!focusLeagueId && (
                    <button onClick={() => setExpandedLeague(isExpanded ? null : league.id)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors">
                      {isExpanded ? <><ChevronUp className="w-4 h-4" /> Hide</> : <><ChevronDown className="w-4 h-4" /> Details</>}
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={() => { if (confirm('Delete this league?')) dispatch({ type: 'DELETE_LEAGUE', payload: league.id }); }}
                      className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-colors" title="Delete League">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-800/60">
                    <div className="p-5 bg-slate-950/30 space-y-6">

                      {/* Teams in this league */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Teams</h4>
                          <button onClick={() => { setAddTeamLeague(addTeamLeague === league.id ? null : league.id); setNewTeamName(''); setNewTeamShort(''); }}
                            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Add Team
                          </button>
                        </div>

                        <AnimatePresence>
                          {addTeamLeague === league.id && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                              className="mb-3 bg-slate-900/60 border border-slate-800/50 rounded-xl p-3 space-y-2 overflow-hidden">
                              <div className="flex gap-2">
                                <input placeholder="Team Name" value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                                  className="flex-[2] bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                                <input placeholder="Short" value={newTeamShort} onChange={e => setNewTeamShort(e.target.value)} maxLength={4}
                                  className="flex-[1] bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleAddTeam(league.id)} disabled={!newTeamName.trim() || !newTeamShort.trim()}
                                  className="flex-1 py-2 bg-emerald-500 text-white text-sm font-bold rounded-lg disabled:opacity-40 hover:bg-emerald-400 transition-colors">Add</button>
                                <button onClick={() => setAddTeamLeague(null)} className="px-4 py-2 text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {leagueTeams.length > 0 ? (
                          <div className="space-y-2">
                            {leagueTeams.map(team => (
                              <div key={team.id} className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                                    <span className="text-sm font-semibold text-white">{team.name}</span>
                                    <span className="text-xs text-slate-500">({team.shortName})</span>
                                  </div>
                                  <button onClick={() => { setAddPlayerTeam(addPlayerTeam === team.id ? null : team.id); setNewPlayerName(''); }}
                                    className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold">
                                    <UserPlus className="w-3 h-3" /> Add Player
                                  </button>
                                </div>

                                <AnimatePresence>
                                  {addPlayerTeam === team.id && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                      className="mb-2 overflow-hidden">
                                      <div className="flex gap-2">
                                        <input placeholder="Player name" value={newPlayerName}
                                          onChange={e => setNewPlayerName(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlayer(team.id); } }}
                                          className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
                                        <button onClick={() => handleAddPlayer(team.id)} disabled={!newPlayerName.trim()}
                                          className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg disabled:opacity-40">Add</button>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {team.players.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {team.players.map(p => (
                                      <span key={p.id} className="px-2 py-0.5 bg-slate-800/60 text-slate-300 text-[11px] rounded-md">{p.name}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-600 italic">No players yet</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 text-center py-4">No teams added yet. Click "Add Team" to get started.</p>
                        )}
                      </div>

                      {/* Points Table */}
                      <div>
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
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color }} />
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
                            No matches completed yet. Points will appear after matches finish.
                          </div>
                        )}
                      </div>

                      {/* League Matches */}
                      {leagueMatches.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Matches</h4>
                          <div className="space-y-2">
                            {leagueMatches.map(m => {
                              const t1 = teams.find(t => t.id === m.team1Id);
                              const t2 = teams.find(t => t.id === m.team2Id);
                              return (
                                <div key={m.id} className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-3 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full" style={{ background: t1?.color || '#10b981' }} />
                                      <span className="text-xs font-semibold text-slate-300">{t1?.shortName || '??'}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-600">vs</span>
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full" style={{ background: t2?.color || '#10b981' }} />
                                      <span className="text-xs font-semibold text-slate-300">{t2?.shortName || '??'}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {m.isComplete ? (
                                      <span className="text-[11px] text-emerald-400/80 font-medium truncate max-w-[160px]">{m.result}</span>
                                    ) : (
                                      <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded">LIVE</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
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

        {visibleLeagues.length === 0 && !showForm && (
          <div className="col-span-full text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
            <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No leagues found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
