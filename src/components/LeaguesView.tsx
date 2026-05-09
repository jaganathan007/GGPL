import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Plus, X, Trash2, ChevronDown, ChevronUp, Users, UserPlus, Swords, Play, Check } from 'lucide-react';
import { useApp } from '../store';
import type { League, Team, Match } from '../types';

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
  onStartMatch?: (leagueCode: string) => void;
  currentUserId?: string;
  onMatchCreated?: (match: Match) => void;
  onScoreMatch?: (matchId: string) => void;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function LeaguesView({ isAdmin, focusLeagueId, inlineCreate, onDone, onStartMatch, currentUserId, onMatchCreated, onScoreMatch }: Props) {
  const { state, dispatch } = useApp();
  const { leagues, matches, teams } = state;
  const [showForm, setShowForm] = useState(!!inlineCreate);
  const [name, setName] = useState('');
  const [expandedLeague, setExpandedLeague] = useState<string | null>(focusLeagueId || null);
  const [createdCode, setCreatedCode] = useState('');
  const [createdLeagueId, setCreatedLeagueId] = useState('');

  // Add team state
  const [addTeamLeague, setAddTeamLeague] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShort, setNewTeamShort] = useState('');

  // Add player state
  const [addPlayerTeam, setAddPlayerTeam] = useState<string | null>(null);

  // Inline match creation state
  const [createMatchLeague, setCreateMatchLeague] = useState<string | null>(null);
  const [matchTeam1Id, setMatchTeam1Id] = useState('');
  const [matchTeam2Id, setMatchTeam2Id] = useState('');
  const [matchVenue, setMatchVenue] = useState('');
  const [matchOvers, setMatchOvers] = useState(10);
  const [matchDate, setMatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [matchTossWinner, setMatchTossWinner] = useState<'team1'|'team2'|''>('');
  const [matchTossDecision, setMatchTossDecision] = useState<'bat'|'bowl'|''>('');
  const [matchStep, setMatchStep] = useState<0|1|2>(0); // 0=teams, 1=details, 2=toss
  const [createdMatchResult, setCreatedMatchResult] = useState<Match | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const leagueId = uid();
    const code = generateLeagueCode();
    const editorCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const league: League = { id: leagueId, name: name.trim(), code, ownerId: currentUserId, editorCode };
    dispatch({ type: 'ADD_LEAGUE', payload: league });
    setName('');
    setCreatedCode(code);
    setCreatedLeagueId(leagueId);
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

  function resetMatchForm() {
    setMatchTeam1Id(''); setMatchTeam2Id('');
    setMatchVenue(''); setMatchOvers(10);
    setMatchDate(new Date().toISOString().slice(0, 10));
    setMatchTossWinner(''); setMatchTossDecision('');
    setMatchStep(0); setCreatedMatchResult(null);
  }

  function handleCreateLeagueMatch(leagueId: string) {
    const league = (leagues || []).find(l => l.id === leagueId);
    if (!league) return;
    const leagueTeams = teams.filter(t => t.leagueId === leagueId);

    const t1Id = matchTeam1Id;
    const t2Id = matchTeam2Id;
    if (!t1Id || !t2Id || t1Id === t2Id) return;

    const adminCode = generateOTP();
    const viewerCode = generateOTP();

    const match: Match = {
      id: uid(),
      viewerCode,
      adminCode,
      leagueCode: league.code,
      team1Id: t1Id,
      team2Id: t2Id,
      toss: {
        winnerId: matchTossWinner === 'team1' ? t1Id : t2Id,
        decision: matchTossDecision as 'bat' | 'bowl',
      },
      date: matchDate,
      venue: matchVenue.trim() || 'TBD',
      totalOvers: matchOvers,
      innings: [],
      isComplete: false,
      result: '',
      ownerId: currentUserId,
    };
    dispatch({ type: 'ADD_MATCH', payload: match });
    setCreatedMatchResult(match);
    onMatchCreated?.(match);
  }

  const visibleLeagues = focusLeagueId
    ? (leagues || []).filter(l => l.id === focusLeagueId)
    : (leagues || []);

  // Inline create mode: just show create form + result
  if (inlineCreate) {
    const inlineLeagueTeams = createdLeagueId ? teams.filter(t => t.leagueId === createdLeagueId) : [];
    return (
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-lg relative max-w-xl mx-auto">
        <button onClick={onDone} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        {createdCode ? (
          <div className="space-y-5">
            {/* Header with code */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto"><Trophy className="w-7 h-7 text-amber-400" /></div>
              <h3 className="text-lg font-bold text-white">League Created!</h3>
              <p className="text-xs text-slate-400">Share this code with scorers to link matches</p>
              <p className="text-2xl font-mono font-bold text-amber-400 tracking-[0.2em] bg-slate-950/50 rounded-xl py-3 border border-slate-800">{createdCode}</p>
            </div>

            {/* Add Teams */}
            <div className="border-t border-slate-800/60 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-300 flex items-center gap-1.5"><Users className="w-4 h-4 text-blue-400" /> Teams</h4>
              </div>

              {/* Add team form */}
              <div className="mb-3 bg-slate-950/40 border border-slate-800/50 rounded-xl p-3 space-y-2">
                <div className="flex gap-2">
                  <input placeholder="Team Name" value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                    className="flex-[2] bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  <input placeholder="Short" value={newTeamShort} onChange={e => setNewTeamShort(e.target.value)} maxLength={4}
                    className="flex-[1] bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  <button onClick={() => handleAddTeam(createdLeagueId)} disabled={!newTeamName.trim() || !newTeamShort.trim()}
                    className="px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-lg disabled:opacity-40 hover:bg-emerald-400 transition-colors">Add</button>
                </div>
              </div>

              {/* Team list with player add */}
              {inlineLeagueTeams.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {inlineLeagueTeams.map(team => (
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
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-2 overflow-hidden">
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
                <p className="text-xs text-slate-500 text-center py-2">Add your first team above</p>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={onDone} className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all border border-slate-700">Done</button>
              {inlineLeagueTeams.length >= 2 && (
                <button onClick={() => onStartMatch?.(createdCode)} className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-900/40 transition-all">🏏 Start a Match</button>
              )}
            </div>
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
          const isOwner = !!currentUserId && league.ownerId === currentUserId;

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
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-white">{league.name}</h3>
                    {currentUserId && league.ownerId === currentUserId && (
                      <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 text-[10px] font-bold rounded-md border border-amber-500/20">Your League</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div><span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Code: </span>
                      <span className="text-sm font-mono text-emerald-400 font-bold tracking-widest">{league.code}</span></div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded-md">
                      <Users className="w-3.5 h-3.5 text-blue-400" /><span>{leagueTeams.length} Teams</span></div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded-md">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" /><span>{leagueMatches.length} Matches</span></div>
                    {isOwner && league.editorCode && (
                      <div className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 px-2 py-1 rounded-md border border-violet-500/20">
                        <span className="text-[10px] text-violet-400/70 uppercase font-semibold">Editor Code:</span>
                        <span className="font-mono font-bold tracking-wider">{league.editorCode}</span>
                      </div>
                    )}
                    {!isOwner && league.ownerId && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/30 px-2 py-1 rounded-md">
                        <span>🔒 Owner managed</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  {!focusLeagueId && (
                    <button onClick={() => setExpandedLeague(isExpanded ? null : league.id)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors">
                      {isExpanded ? <><ChevronUp className="w-4 h-4" /> Hide</> : <><ChevronDown className="w-4 h-4" /> Details</>}
                    </button>
                  )}
                  {isOwner && (
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
                          {isOwner && (
                            <button onClick={() => { setAddTeamLeague(addTeamLeague === league.id ? null : league.id); setNewTeamName(''); setNewTeamShort(''); }}
                              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                              <Plus className="w-3.5 h-3.5" /> Add Team
                            </button>
                          )}
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
                                  {isOwner && (
                                    <button onClick={() => { setAddPlayerTeam(addPlayerTeam === team.id ? null : team.id); setNewPlayerName(''); }}
                                      className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold">
                                      <UserPlus className="w-3 h-3" /> Add Player
                                    </button>
                                  )}
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

                      {/* Create Match in League */}
                      {isOwner && leagueTeams.length >= 2 && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Create Match</h4>
                            {createMatchLeague !== league.id && (
                              <button onClick={() => { setCreateMatchLeague(league.id); resetMatchForm(); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-500/25 transition-colors border border-emerald-500/20">
                                <Swords className="w-3.5 h-3.5" /> New Match
                              </button>
                            )}
                          </div>

                          <AnimatePresence>
                            {createMatchLeague === league.id && !createdMatchResult && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="bg-slate-900/60 border border-emerald-500/15 rounded-2xl p-5 space-y-4 overflow-hidden mb-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Swords className="w-4 h-4 text-emerald-400" />
                                    <span className="text-sm font-bold text-white">
                                      {matchStep === 0 ? 'Select Teams' : matchStep === 1 ? 'Match Details' : 'Toss'}
                                    </span>
                                  </div>
                                  <button onClick={() => { setCreateMatchLeague(null); resetMatchForm(); }} className="text-slate-500 hover:text-slate-300">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Step indicator */}
                                <div className="flex items-center gap-2">
                                  {[0,1,2].map(s => (
                                    <div key={s} className={`flex-1 h-1 rounded-full transition-all ${s <= matchStep ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                                  ))}
                                </div>

                                <AnimatePresence mode="wait">
                                  {/* Step 0: Teams */}
                                  {matchStep === 0 && (
                                    <motion.div key="ms0" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
                                      <p className="text-xs text-slate-400">Only teams in <span className="text-amber-400 font-semibold">{league.name}</span> can play</p>
                                      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/50 space-y-2">
                                        <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Team 1</label>
                                        <select value={matchTeam1Id} onChange={e => setMatchTeam1Id(e.target.value)}
                                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                                          <option value="">Select team...</option>
                                          {leagueTeams.filter(t => t.id !== matchTeam2Id).map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.shortName})</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/50 space-y-2">
                                        <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Team 2</label>
                                        <select value={matchTeam2Id} onChange={e => setMatchTeam2Id(e.target.value)}
                                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                                          <option value="">Select team...</option>
                                          {leagueTeams.filter(t => t.id !== matchTeam1Id).map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.shortName})</option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* Show selected teams' players */}
                                      {matchTeam1Id && matchTeam2Id && (
                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                          {[matchTeam1Id, matchTeam2Id].map(tId => {
                                            const team = leagueTeams.find(t => t.id === tId);
                                            return team ? (
                                              <div key={tId} className="bg-slate-950/30 rounded-lg p-2.5 border border-slate-800/30">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                                                  <span className="text-[11px] font-bold text-white">{team.shortName}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                  {team.players.length > 0 ? team.players.map(p => (
                                                    <span key={p.id} className="px-1.5 py-0.5 bg-slate-800/60 text-slate-300 text-[10px] rounded">{p.name}</span>
                                                  )) : (
                                                    <span className="text-[10px] text-slate-600 italic">No players</span>
                                                  )}
                                                </div>
                                              </div>
                                            ) : null;
                                          })}
                                        </div>
                                      )}

                                      <button onClick={() => setMatchStep(1)}
                                        disabled={!matchTeam1Id || !matchTeam2Id || matchTeam1Id === matchTeam2Id}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2">
                                        Next: Details <Play className="w-4 h-4 fill-current" />
                                      </button>
                                    </motion.div>
                                  )}

                                  {/* Step 1: Match Details */}
                                  {matchStep === 1 && (
                                    <motion.div key="ms1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                                      <div>
                                        <label className="block text-xs text-slate-400 mb-1 font-medium">Venue</label>
                                        <input value={matchVenue} onChange={e => setMatchVenue(e.target.value)} placeholder="e.g. Local Ground"
                                          className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs text-slate-400 mb-1 font-medium">Date</label>
                                          <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-slate-400 mb-1 font-medium">Overs</label>
                                          <input type="number" min={1} max={50} value={matchOvers} onChange={e => setMatchOvers(Number(e.target.value))}
                                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                                        </div>
                                      </div>
                                      <div className="flex gap-2 mt-2">
                                        <button onClick={() => setMatchStep(0)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors border border-slate-700">
                                          ← Back
                                        </button>
                                        <button onClick={() => setMatchStep(2)}
                                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-colors">
                                          Next: Toss <Play className="w-4 h-4 fill-current" />
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}

                                  {/* Step 2: Toss */}
                                  {matchStep === 2 && (
                                    <motion.div key="ms2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                      <p className="text-center text-xs text-slate-400 font-medium">Who won the toss?</p>
                                      <div className="grid grid-cols-2 gap-3">
                                        {[{ key: 'team1' as const, id: matchTeam1Id }, { key: 'team2' as const, id: matchTeam2Id }].map(({ key, id }) => {
                                          const team = leagueTeams.find(t => t.id === id);
                                          return (
                                            <button key={key} onClick={() => setMatchTossWinner(key)}
                                              className={`py-3 rounded-xl border-2 transition-all text-sm font-semibold ${matchTossWinner === key ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                              {team?.name || key}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      <AnimatePresence>
                                        {matchTossWinner && (
                                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-2 overflow-hidden">
                                            <p className="text-center text-xs text-slate-400 font-medium">What did they choose?</p>
                                            <div className="grid grid-cols-2 gap-3">
                                              <button onClick={() => setMatchTossDecision('bat')}
                                                className={`py-3.5 flex flex-col items-center justify-center border-2 rounded-xl transition-all ${matchTossDecision === 'bat' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                                <span className="text-xl mb-1">🏏</span>
                                                <span className="text-xs font-bold">Bat</span>
                                              </button>
                                              <button onClick={() => setMatchTossDecision('bowl')}
                                                className={`py-3.5 flex flex-col items-center justify-center border-2 rounded-xl transition-all ${matchTossDecision === 'bowl' ? 'bg-violet-500/20 border-violet-500 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                                <span className="text-xl mb-1">🎯</span>
                                                <span className="text-xs font-bold">Bowl</span>
                                              </button>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>

                                      <div className="flex gap-2 mt-2">
                                        <button onClick={() => setMatchStep(1)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors border border-slate-700">
                                          ← Back
                                        </button>
                                        <button onClick={() => handleCreateLeagueMatch(league.id)}
                                          disabled={!matchTossWinner || !matchTossDecision}
                                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-900/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                          <Check className="w-4 h-4" /> Create Match
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            )}

                            {/* Match Created Success */}
                            {createdMatchResult && createMatchLeague === league.id && (
                              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-5 text-center space-y-3 mb-4">
                                <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                  <Check className="w-7 h-7 text-emerald-400" />
                                </div>
                                <h4 className="text-lg font-bold text-white">Match Created!</h4>
                                <p className="text-xs text-slate-400">Save these codes to score or share the match</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Scorer Code</p>
                                    <p className="text-lg font-mono font-bold text-amber-400 tracking-[0.15em]">{createdMatchResult.adminCode}</p>
                                  </div>
                                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Viewer Code</p>
                                    <p className="text-lg font-mono font-bold text-emerald-400 tracking-[0.15em]">{createdMatchResult.viewerCode}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => { setCreateMatchLeague(null); resetMatchForm(); }}
                                    className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors border border-slate-700">
                                    Done
                                  </button>
                                  {onScoreMatch && (
                                    <button onClick={() => { onScoreMatch(createdMatchResult.id); setCreateMatchLeague(null); resetMatchForm(); }}
                                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-900/40 transition-all">
                                      🏏 Start Scoring
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

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
