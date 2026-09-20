import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Key, ChevronDown, ChevronUp, Swords, X, Check,
  Users, Search, MapPin, Phone, IndianRupee, Layers, ArrowLeft,
} from 'lucide-react';
import { useApp } from '../store';
import type { League, Match } from '../types';

function uid(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function generateCode(): string { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
const BALL_TYPES = ['Stumper Tennis', 'Strich Cricket / Tennis', 'Weight Tennis', 'Leather Ball'];
const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th'];

interface Props {
  currentUserId?: string;
  currentUserName?: string;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  onScoreMatch?: (id: string) => void;
  onViewStats?: (id: string) => void;
}

type Mode = 'landing' | 'host' | 'join';

export default function TournamentsView({ currentUserId, currentUserName, isLoggedIn, isAdmin, onScoreMatch, onViewStats }: Props) {
  const { state, dispatch } = useApp();
  const { leagues, teams, matches } = state;

  const allTournaments = useMemo(() => (leagues || []).filter((l) => l.isTournament), [leagues]);
  const myTournaments = useMemo(() =>
    currentUserId ? allTournaments.filter((l) => l.ownerId === currentUserId) : [],
  [allTournaments, currentUserId]);

  const joinedTournamentIds = useMemo(() => {
    if (!currentUserId) return new Set<string>();
    const ids = new Set<string>();
    matches.filter((m) => m.ownerId === currentUserId && m.leagueCode).forEach((m) => {
      const t = allTournaments.find((l) => l.code === m.leagueCode);
      if (t && t.ownerId !== currentUserId) ids.add(t.id);
    });
    return ids;
  }, [matches, allTournaments, currentUserId]);

  const joinedTournaments = useMemo(() =>
    allTournaments.filter((l) => joinedTournamentIds.has(l.id)),
  [allTournaments, joinedTournamentIds]);

  const [mode, setMode] = useState<Mode>('landing');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createdTournament, setCreatedTournament] = useState<League | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinedResult, setJoinedResult] = useState<League | null>(null);
  const [hostName, setHostName] = useState('');
  const [hostLocation, setHostLocation] = useState('');
  const [hostPrizeCount, setHostPrizeCount] = useState(1);
  const [hostPrizes, setHostPrizes] = useState(['', '', '', '', '']);
  const [hostEntryFee, setHostEntryFee] = useState('');
  const [hostBallType, setHostBallType] = useState('');
  const [hostContact, setHostContact] = useState('');

  const browseList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allTournaments.filter((t) =>
      !q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || (t.location || '').toLowerCase().includes(q)
    );
  }, [allTournaments, searchQuery]);

  function resetHost() {
    setHostName(''); setHostLocation(''); setHostPrizeCount(1);
    setHostPrizes(['', '', '', '', '']); setHostEntryFee('');
    setHostBallType(''); setHostContact(''); setCreatedTournament(null);
  }

  function handleHost(e: React.FormEvent) {
    e.preventDefault();
    if (!hostName.trim()) return;
    const prizes = hostPrizes.slice(0, hostPrizeCount).map((v) => Number(v) || 0);
    const t: League = {
      id: uid(), name: hostName.trim(), code: generateCode(), editorCode: generateCode(),
      ownerId: currentUserId, ownerName: currentUserName, isTournament: true,
      location: hostLocation.trim() || undefined, prizeCount: hostPrizeCount, prizes,
      entryFee: Number(hostEntryFee) || undefined,
      ballType: hostBallType || undefined, contact: hostContact.trim() || undefined,
    };
    dispatch({ type: 'ADD_LEAGUE', payload: t });
    setCreatedTournament(t);
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    const found = allTournaments.find((l) => l.code === code);
    if (!found) { setJoinError('No tournament found with that code.'); return; }
    setJoinError(''); setJoinedResult(found); setExpandedId(found.id); setJoinCode('');
  }

  function setPrize(idx: number, val: string) {
    const arr = [...hostPrizes]; arr[idx] = val; setHostPrizes(arr);
  }

  const tMatches = (code: string) => matches.filter((m) => m.leagueCode === code);
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name || 'Unknown';
  const teamShort = (id: string) => teams.find((t) => t.id === id)?.shortName || '??';
  const teamColor = (id: string) => teams.find((t) => t.id === id)?.color || '#64748b';
  const canAct = isLoggedIn || isAdmin;

  // HOST
  if (mode === 'host') {
    if (createdTournament) {
      return (
        <div className="space-y-5 max-w-lg mx-auto">
          <button onClick={() => { setMode('landing'); resetHost(); }} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Tournaments
          </button>
          <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto"><Trophy className="w-8 h-8 text-amber-400" /></div>
            <h3 className="text-lg font-bold text-white">Tournament Created!</h3>
            <p className="text-xs text-slate-400">Share this code with participants</p>
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Tournament Code</p>
              <p className="text-3xl font-mono font-bold text-amber-400 tracking-[0.2em]">{createdTournament.code}</p>
            </div>
            <button onClick={() => { setMode('landing'); resetHost(); }} className="w-full py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all border border-slate-700">Done</button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-5 max-w-lg mx-auto">
        <button onClick={() => { setMode('landing'); resetHost(); }} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> Host a Tournament</h2>
          <p className="text-xs text-slate-400 mt-0.5">Fill in the details to create your tournament</p>
        </div>
        <form onSubmit={handleHost} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tournament Name *</label>
            <input autoFocus value={hostName} onChange={(e) => setHostName(e.target.value)} required placeholder="e.g. Summer Cup 2026"
              className="w-full bg-slate-900/70 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Location</label>
            <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-700/60 rounded-xl px-4 py-3">
              <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <input value={hostLocation} onChange={(e) => setHostLocation(e.target.value)} placeholder="e.g. Chennai, Tamil Nadu"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Number of Prize Positions</label>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setHostPrizeCount(n)}
                  className={'flex-1 py-2 text-sm font-bold rounded-lg transition-all ' + (hostPrizeCount === n ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700')}>
                  {n}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {Array.from({ length: hostPrizeCount }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-amber-400 w-8 flex-shrink-0">{ORDINAL[i]}</span>
                  <div className="flex-1 flex items-center gap-1 bg-slate-900/70 border border-slate-700/60 rounded-xl px-3 py-2">
                    <IndianRupee className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <input type="number" value={hostPrizes[i]} onChange={(e) => setPrize(i, e.target.value)} placeholder="Prize amount"
                      className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Entry Fee (per team)</label>
            <div className="flex items-center gap-1 bg-slate-900/70 border border-slate-700/60 rounded-xl px-4 py-3">
              <IndianRupee className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <input type="number" value={hostEntryFee} onChange={(e) => setHostEntryFee(e.target.value)} placeholder="0 (free)"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Ball Type</label>
            <div className="flex flex-wrap gap-2">
              {BALL_TYPES.map((bt) => (
                <button key={bt} type="button" onClick={() => setHostBallType(hostBallType === bt ? '' : bt)}
                  className={'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ' + (hostBallType === bt ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/40')}>
                  {bt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Contact (phone / WhatsApp)</label>
            <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-700/60 rounded-xl px-4 py-3">
              <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <input value={hostContact} onChange={(e) => setHostContact(e.target.value)} placeholder="e.g. +91 98765 43210"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setMode('landing'); resetHost(); }}
              className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all border border-slate-700">Cancel</button>
            <button type="submit" disabled={!hostName.trim()}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Create Tournament
            </button>
          </div>
        </form>
      </div>
    );
  }

  // JOIN
  if (mode === 'join') {
    return (
      <div className="space-y-5 max-w-lg mx-auto">
        <button onClick={() => { setMode('landing'); setJoinError(''); setJoinedResult(null); }} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {joinedResult ? (
          <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto"><Key className="w-7 h-7 text-cyan-400" /></div>
            <h3 className="text-lg font-bold text-white">{joinedResult.name}</h3>
            <p className="text-xs text-slate-400">You have joined this tournament.</p>
            <button onClick={() => { setMode('landing'); setJoinedResult(null); setExpandedId(joinedResult.id); }}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl">View Tournament</button>
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2"><Key className="w-4 h-4 text-cyan-400" /> Enter Tournament Code</h3>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <input autoFocus value={joinCode} onChange={(e) => { setJoinCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8)); setJoinError(''); }}
                  placeholder="Enter 6-character code"
                  className={'w-full bg-slate-950/50 border ' + (joinError ? 'border-red-500/50' : 'border-slate-700/50') + ' rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all uppercase font-mono tracking-widest'} />
                {joinError && <p className="text-xs text-red-400 mt-1">{joinError}</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setMode('landing')} className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all border border-slate-700">Cancel</button>
                <button type="submit" disabled={joinCode.length < 4} className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                  <Key className="w-4 h-4" /> Join
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // LANDING
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> Tournaments</h2>
        <p className="text-xs text-slate-400 mt-0.5">Host your own or browse existing tournaments</p>
      </div>

      {canAct ? (
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => { setMode('host'); resetHost(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/15 border border-amber-500/40 hover:border-amber-400/70 text-amber-300 text-sm font-semibold rounded-xl transition-all">
            <Trophy className="w-4 h-4" /> Host a Tournament
          </button>
          <button onClick={() => setMode('join')}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/15 border border-cyan-500/40 hover:border-cyan-400/70 text-cyan-300 text-sm font-semibold rounded-xl transition-all">
            <Key className="w-4 h-4" /> Join with Code
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-5 text-center">
          <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Log in to host or join tournaments</p>
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, code or location..."
          className="w-full bg-slate-900/70 border border-slate-800/60 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/40 transition-all" />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {myTournaments.length > 0 && !searchQuery && (
        <Section title="My Tournaments" dot="amber">
          {myTournaments.map((t) => <TCard key={t.id} t={t} matches={tMatches(t.code)} expanded={expandedId === t.id} onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)} onScoreMatch={onScoreMatch} onViewStats={onViewStats} teamName={teamName} teamShort={teamShort} teamColor={teamColor} isOwner onDelete={() => dispatch({ type: 'DELETE_LEAGUE', payload: t.id })} />)}
        </Section>
      )}

      {joinedTournaments.length > 0 && !searchQuery && (
        <Section title="Joined Tournaments" dot="cyan">
          {joinedTournaments.map((t) => <TCard key={t.id} t={t} matches={tMatches(t.code)} expanded={expandedId === t.id} onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)} onScoreMatch={onScoreMatch} onViewStats={onViewStats} teamName={teamName} teamShort={teamShort} teamColor={teamColor} isOwner={false} onDelete={() => {}} />)}
        </Section>
      )}

      <Section title={searchQuery ? 'Search Results' : 'All Tournaments'} dot="slate" count={browseList.length}>
        {browseList.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">{searchQuery ? 'No tournaments match your search.' : 'No tournaments yet. Be the first to host one!'}</p>
        ) : (
          browseList.map((t) => <TCard key={t.id} t={t} matches={tMatches(t.code)} expanded={expandedId === t.id} onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)} onScoreMatch={onScoreMatch} onViewStats={onViewStats} teamName={teamName} teamShort={teamShort} teamColor={teamColor} isOwner={t.ownerId === currentUserId} onDelete={() => dispatch({ type: 'DELETE_LEAGUE', payload: t.id })} />)
        )}
      </Section>
    </div>
  );
}

function Section({ title, dot, count, children }: { title: string; dot: 'amber' | 'cyan' | 'slate'; count?: number; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={'w-2 h-2 rounded-full ' + (dot === 'amber' ? 'bg-amber-400' : dot === 'cyan' ? 'bg-cyan-400' : 'bg-slate-600')} />
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
        {count !== undefined && <span className="text-[10px] text-slate-600">({count})</span>}
      </div>
      {children}
    </div>
  );
}

interface TCardProps {
  t: League; matches: Match[]; expanded: boolean; onToggle: () => void;
  onScoreMatch?: (id: string) => void; onViewStats?: (id: string) => void;
  teamName: (id: string) => string; teamShort: (id: string) => string; teamColor: (id: string) => string;
  isOwner: boolean; onDelete: () => void;
}
function TCard({ t, matches, expanded, onToggle, onScoreMatch, onViewStats, teamName, teamShort, teamColor, isOwner, onDelete }: TCardProps) {
  const live = matches.filter((m) => !m.isComplete && m.innings.length > 0);
  const done = matches.filter((m) => m.isComplete);
  const upcoming = matches.filter((m) => !m.isComplete && m.innings.length === 0);
  return (
    <motion.div layout className="bg-slate-900/60 border border-slate-800/50 rounded-2xl overflow-hidden hover:border-slate-700/60 transition-all">
      <div className="p-4 flex items-start gap-3">
        <div className="w-9 h-9 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <Trophy className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h4 className="text-sm font-bold text-white">{t.name}</h4>
            {isOwner && <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 text-[9px] font-bold rounded border border-amber-500/20">HOST</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="text-[10px] text-slate-500">Code: <span className="font-mono text-amber-400/80 font-bold">{t.code}</span></span>
            {t.location && <span className="text-[10px] text-slate-500 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{t.location}</span>}
            {t.ownerName && !isOwner && <span className="text-[10px] text-slate-500">by {t.ownerName}</span>}
            <span className="text-[10px] text-slate-600">{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
            {live.length > 0 && <span className="text-[10px] text-green-400 font-semibold">{live.length} live</span>}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {t.entryFee !== undefined && t.entryFee > 0 && <span className="text-[10px] bg-slate-800/60 text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-0.5"><IndianRupee className="w-2.5 h-2.5" />{t.entryFee}/team</span>}
            {t.ballType && <span className="text-[10px] bg-slate-800/60 text-slate-300 px-2 py-0.5 rounded-md">{t.ballType}</span>}
            {t.prizes && t.prizes[0] > 0 && <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md">1st: {t.prizes[0].toLocaleString()}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isOwner && <button onClick={onDelete} className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg transition-all"><X className="w-3.5 h-3.5" /></button>}
          <button onClick={onToggle} className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg transition-all">{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-slate-800/50 px-4 pb-4 pt-3 space-y-3">
              {t.prizes && t.prizes.some((p) => p > 0) && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Prizes</p>
                  <div className="flex flex-wrap gap-2">
                    {t.prizes.map((prize, i) => prize > 0 && (
                      <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-center">
                        <p className="text-[9px] text-amber-400/70 font-bold">{['1st','2nd','3rd','4th','5th'][i]}</p>
                        <p className="text-sm font-bold text-amber-400">{prize.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {t.contact && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-500" />{t.contact}</p>}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Matches ({matches.length})</p>
                {matches.length === 0 ? <p className="text-xs text-slate-600 italic">No matches yet.</p> : (
                  <div className="space-y-1.5">
                    {live.map((m) => <MRow key={m.id} m={m} teamName={teamName} teamShort={teamShort} teamColor={teamColor} onScore={onScoreMatch} isLive />)}
                    {upcoming.map((m) => <MRow key={m.id} m={m} teamName={teamName} teamShort={teamShort} teamColor={teamColor} />)}
                    {done.map((m) => <MRow key={m.id} m={m} teamName={teamName} teamShort={teamShort} teamColor={teamColor} onStats={onViewStats} />)}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface MRowProps { m: Match; teamName: (id: string) => string; teamShort: (id: string) => string; teamColor: (id: string) => string; onScore?: (id: string) => void; onStats?: (id: string) => void; isLive?: boolean; }
function MRow({ m, teamName, teamShort, teamColor, onScore, onStats, isLive }: MRowProps) {
  const score = (idx: number) => { const inn = m.innings[idx]; if (!inn) return '-'; return `${inn.battingEntries.reduce((s, e) => s + e.runs, 0) + inn.extras}/${inn.battingEntries.filter((e) => !e.isNotOut).length}`; };
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-2.5">
      <div className="flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ background: teamColor(m.team1Id) }}>{teamShort(m.team1Id).slice(0, 2)}</div>
          <span className="text-xs font-semibold text-white truncate">{teamName(m.team1Id)}</span>
          {m.innings[0] && <span className="text-xs font-mono text-slate-300 ml-auto whitespace-nowrap">{score(0)}</span>}
        </div>
        <span className="text-[9px] text-slate-600 font-bold">vs</span>
        <div className="flex-1 flex items-center gap-1.5 min-w-0 justify-end">
          {m.innings[1] && <span className="text-xs font-mono text-slate-300 mr-auto whitespace-nowrap">{score(1)}</span>}
          <span className="text-xs font-semibold text-white truncate">{teamName(m.team2Id)}</span>
          <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ background: teamColor(m.team2Id) }}>{teamShort(m.team2Id).slice(0, 2)}</div>
        </div>
      </div>
      {m.result && <p className="text-[10px] text-amber-400/80 mt-1 text-center">{m.result}</p>}
      <div className="flex gap-1.5 mt-1.5 justify-end">
        {isLive && onScore && <button onClick={() => onScore(m.id)} className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded flex items-center gap-0.5"><Swords className="w-2.5 h-2.5" />Score</button>}
        {!isLive && m.isComplete && onStats && <button onClick={() => onStats(m.id)} className="px-2 py-0.5 bg-slate-700/60 text-slate-300 text-[10px] font-bold rounded flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />Stats</button>}
      </div>
    </div>
  );
}
