import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Key, ChevronDown, ChevronUp, Swords, X, Check, Users } from 'lucide-react';
import { useApp } from '../store';
import type { League, Match } from '../types';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

interface Props {
  currentUserId?: string;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  onScoreMatch?: (matchId: string) => void;
  onViewStats?: (matchId: string) => void;
}

type Mode = 'landing' | 'host' | 'join';

export default function TournamentsView({ currentUserId, isLoggedIn, isAdmin, onScoreMatch, onViewStats }: Props) {
  const { state, dispatch } = useApp();
  const { leagues, teams, matches } = state;

  const allTournaments = (leagues || []).filter((l) => l.isTournament);
  const myTournaments = currentUserId
    ? allTournaments.filter((l) => l.ownerId === currentUserId)
    : allTournaments;

  const joinedTournamentIds = new Set(
    currentUserId
      ? matches
          .filter((m) => m.ownerId === currentUserId && m.leagueCode)
          .map((m) => allTournaments.find((l) => l.code === m.leagueCode)?.id)
          .filter(Boolean as unknown as <T>(x: T | undefined) => x is T)
      : []
  );
  const joinedTournaments = allTournaments.filter(
    (l) => joinedTournamentIds.has(l.id) && l.ownerId !== currentUserId
  );

  const [mode, setMode] = useState<Mode>('landing');
  const [hostName, setHostName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createdTournament, setCreatedTournament] = useState<League | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleHost(e: React.FormEvent) {
    e.preventDefault();
    if (!hostName.trim()) return;
    const t: League = {
      id: uid(),
      name: hostName.trim(),
      code: generateCode(),
      editorCode: generateCode(),
      ownerId: currentUserId,
      isTournament: true,
    };
    dispatch({ type: 'ADD_LEAGUE', payload: t });
    setCreatedTournament(t);
    setHostName('');
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    const found = allTournaments.find((l) => l.code === code);
    if (!found) {
      setJoinError('No tournament found with that code. Please check and try again.');
      return;
    }
    setJoinError('');
    setExpandedId(found.id);
    setMode('landing');
    setJoinCode('');
  }

  const canAct = isLoggedIn || isAdmin;

  function tournamentMatches(code: string) {
    return matches.filter((m) => m.leagueCode === code);
  }

  function teamName(id: string) {
    return teams.find((t) => t.id === id)?.name || 'Unknown';
  }
  function teamShort(id: string) {
    return teams.find((t) => t.id === id)?.shortName || '??';
  }
  function teamColor(id: string) {
    return teams.find((t) => t.id === id)?.color || '#64748b';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> Tournaments
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Host your own or join an existing tournament</p>
        </div>
        {mode !== 'landing' && (
          <button
            onClick={() => { setMode('landing'); setCreatedTournament(null); setJoinError(''); }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {mode === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {canAct ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <button
                  onClick={() => { setMode('host'); setCreatedTournament(null); }}
                  className="group bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/30 hover:border-amber-400/60 rounded-2xl p-6 text-left transition-all hover:shadow-lg hover:shadow-amber-900/20"
                >
                  <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-500/30 transition-colors">
                    <Trophy className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Host a Tournament</h3>
                  <p className="text-xs text-slate-400">Create a new tournament and invite others with a code</p>
                </button>

                <button
                  onClick={() => { setMode('join'); }}
                  className="group bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-6 text-left transition-all hover:shadow-lg hover:shadow-cyan-900/20"
                >
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-cyan-500/30 transition-colors">
                    <Key className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Join a Tournament</h3>
                  <p className="text-xs text-slate-400">Enter a tournament code to view matches and join the action</p>
                </button>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-6 text-center mb-8">
                <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Log in to host or join tournaments</p>
              </div>
            )}

            {myTournaments.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" /> My Tournaments
                </h3>
                {myTournaments.map((t) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    matches={tournamentMatches(t.code)}
                    expanded={expandedId === t.id}
                    onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    onScoreMatch={onScoreMatch}
                    onViewStats={onViewStats}
                    teamName={teamName}
                    teamShort={teamShort}
                    teamColor={teamColor}
                    isOwner={t.ownerId === currentUserId}
                    onDelete={() => dispatch({ type: 'DELETE_LEAGUE', payload: t.id })}
                    canAct={!!canAct}
                  />
                ))}
              </div>
            )}

            {joinedTournaments.length > 0 && (
              <div className="space-y-3 mt-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-cyan-400" /> Joined Tournaments
                </h3>
                {joinedTournaments.map((t) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    matches={tournamentMatches(t.code)}
                    expanded={expandedId === t.id}
                    onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    onScoreMatch={onScoreMatch}
                    onViewStats={onViewStats}
                    teamName={teamName}
                    teamShort={teamShort}
                    teamColor={teamColor}
                    isOwner={false}
                    onDelete={() => {}}
                    canAct={!!canAct}
                  />
                ))}
              </div>
            )}

            {myTournaments.length === 0 && joinedTournaments.length === 0 && canAct && (
              <div className="text-center py-10 text-slate-500 text-sm">
                No tournaments yet. Host one or join with a code above!
              </div>
            )}
          </motion.div>
        )}

        {mode === 'host' && (
          <motion.div key="host" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {createdTournament ? (
              <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Trophy className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Tournament Created!</h3>
                <p className="text-xs text-slate-400">Share this code with participants to join your tournament</p>
                <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Tournament Code</p>
                  <p className="text-3xl font-mono font-bold text-amber-400 tracking-[0.2em]">{createdTournament.code}</p>
                </div>
                <button
                  onClick={() => { setMode('landing'); setCreatedTournament(null); }}
                  className="w-full py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all border border-slate-700"
                >
                  Back to Tournaments
                </button>
              </div>
            ) : (
              <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 space-y-5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" /> Host a New Tournament
                </h3>
                <form onSubmit={handleHost} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Tournament Name</label>
                    <input
                      autoFocus
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="e.g. Summer Cup 2026"
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setMode('landing')}
                      className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all border border-slate-700">
                      Cancel
                    </button>
                    <button type="submit" disabled={!hostName.trim()}
                      className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" /> Create
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div key="join" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 space-y-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" /> Join a Tournament
              </h3>
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Tournament Code</label>
                  <input
                    autoFocus
                    value={joinCode}
                    onChange={(e) => { setJoinCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8)); setJoinError(''); }}
                    placeholder="Enter 6-digit code"
                    className={`w-full bg-slate-950/50 border ${joinError ? 'border-red-500/50' : 'border-slate-700/50'} rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all uppercase font-mono tracking-widest`}
                  />
                  {joinError && <p className="text-xs text-red-400 mt-1">{joinError}</p>}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setMode('landing')}
                    className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all border border-slate-700">
                    Cancel
                  </button>
                  <button type="submit" disabled={joinCode.length < 4}
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                    <Key className="w-4 h-4" /> Join
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CardProps {
  tournament: League;
  matches: Match[];
  expanded: boolean;
  onToggle: () => void;
  onScoreMatch?: (id: string) => void;
  onViewStats?: (id: string) => void;
  teamName: (id: string) => string;
  teamShort: (id: string) => string;
  teamColor: (id: string) => string;
  isOwner: boolean;
  onDelete: () => void;
  canAct: boolean;
}

function TournamentCard({ tournament, matches, expanded, onToggle, onScoreMatch, onViewStats, teamName, teamShort, teamColor, isOwner, onDelete, canAct }: CardProps) {
  const liveMatches = matches.filter((m) => !m.isComplete);
  const finishedMatches = matches.filter((m) => m.isComplete);

  return (
    <motion.div layout className="bg-slate-900/60 border border-slate-800/50 rounded-2xl overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
          <Trophy className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white truncate">{tournament.name}</h4>
          <p className="text-xs text-slate-500">
            Code: <span className="font-mono text-amber-400/80">{tournament.code}</span>
            {' - '}{matches.length} match{matches.length !== 1 ? 'es' : ''}
            {liveMatches.length > 0 && <span className="ml-1 text-green-400 font-semibold">- {liveMatches.length} live</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {isOwner && canAct && (
            <button onClick={onDelete} className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-all" title="Delete">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onToggle} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-all">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-slate-800/50 px-4 pb-4 pt-3 space-y-3">
              {matches.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4 italic">No matches in this tournament yet.</p>
              ) : (
                <>
                  {liveMatches.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Live</p>
                      {liveMatches.map((m) => (
                        <MatchRow key={m.id} match={m} teamName={teamName} teamShort={teamShort} teamColor={teamColor} onScore={onScoreMatch} onStats={onViewStats} isLive />
                      ))}
                    </div>
                  )}
                  {finishedMatches.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Finished</p>
                      {finishedMatches.map((m) => (
                        <MatchRow key={m.id} match={m} teamName={teamName} teamShort={teamShort} teamColor={teamColor} onScore={onScoreMatch} onStats={onViewStats} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface MRProps {
  match: Match;
  teamName: (id: string) => string;
  teamShort: (id: string) => string;
  teamColor: (id: string) => string;
  onScore?: (id: string) => void;
  onStats?: (id: string) => void;
  isLive?: boolean;
}

function MatchRow({ match, teamName, teamShort, teamColor, onScore, onStats, isLive }: MRProps) {
  const score = (idx: number) => {
    const inn = match.innings[idx];
    if (!inn) return '-';
    return `${inn.battingEntries.reduce((s, e) => s + e.runs, 0) + inn.extras}/${inn.battingEntries.filter((e) => !e.isNotOut).length}`;
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ background: teamColor(match.team1Id) }}>
            {teamShort(match.team1Id).slice(0, 2)}
          </div>
          <span className="text-xs font-semibold text-white truncate">{teamName(match.team1Id)}</span>
          {match.innings[0] && <span className="text-xs font-mono text-slate-300 ml-auto whitespace-nowrap">{score(0)}</span>}
        </div>
        <span className="text-[10px] text-slate-600 font-bold">vs</span>
        <div className="flex-1 flex items-center gap-1.5 min-w-0 justify-end">
          {match.innings[1] && <span className="text-xs font-mono text-slate-300 mr-auto whitespace-nowrap">{score(1)}</span>}
          <span className="text-xs font-semibold text-white truncate">{teamName(match.team2Id)}</span>
          <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ background: teamColor(match.team2Id) }}>
            {teamShort(match.team2Id).slice(0, 2)}
          </div>
        </div>
      </div>
      {match.result && <p className="text-[10px] text-amber-400/80 mt-1.5 text-center">{match.result}</p>}
      <div className="flex gap-1.5 mt-2 justify-end">
        {isLive && onScore && (
          <button onClick={() => onScore(match.id)} className="px-2.5 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-lg hover:bg-green-500/30 transition-colors flex items-center gap-1">
            <Swords className="w-3 h-3" /> Score
          </button>
        )}
        {!isLive && onStats && (
          <button onClick={() => onStats(match.id)} className="px-2.5 py-1 bg-slate-700/60 text-slate-300 text-[10px] font-bold rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1">
            <Users className="w-3 h-3" /> Stats
          </button>
        )}
      </div>
    </div>
  );
}
