import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, ChevronDown, ChevronUp, Swords, X, Check,
  Users, Search, MapPin, Phone, IndianRupee, Layers, ArrowLeft,
  ListOrdered, Star, UserCheck,
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

type Mode = 'landing' | 'host' | 'my' | 'detail';

export default function TournamentsView({ currentUserId, currentUserName, isLoggedIn, isAdmin, onScoreMatch, onViewStats }: Props) {
  const { state, dispatch } = useApp();
  const { leagues, teams, matches } = state;

  const allTournaments = useMemo(() => (leagues || []).filter((l) => l.isTournament), [leagues]);

  const myHosted = useMemo(() =>
    currentUserId ? allTournaments.filter((l) => l.ownerId === currentUserId) : [],
  [allTournaments, currentUserId]);

  const myJoined = useMemo(() =>
    currentUserId ? allTournaments.filter((l) => l.ownerId !== currentUserId && (l.joinedBy || []).includes(currentUserId)) : [],
  [allTournaments, currentUserId]);

  const [mode, setMode] = useState<Mode>('landing');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTournament, setSelectedTournament] = useState<League | null>(null);
  const [myTab, setMyTab] = useState<'hosted' | 'joined'>('hosted');
  const [createdTournament, setCreatedTournament] = useState<League | null>(null);
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
      joinedBy: [],
    };
    dispatch({ type: 'ADD_LEAGUE', payload: t });
    setCreatedTournament(t);
  }

  function handleJoin(tournament: League) {
    if (!currentUserId) return;
    const updated: League = {
      ...tournament,
      joinedBy: [...(tournament.joinedBy || []), currentUserId],
    };
    dispatch({ type: 'UPDATE_LEAGUE', payload: updated });
    // update local reference too
    setSelectedTournament(updated);
  }

  function handleLeave(tournament: League) {
    if (!currentUserId) return;
    const updated: League = {
      ...tournament,
      joinedBy: (tournament.joinedBy || []).filter((id) => id !== currentUserId),
    };
    dispatch({ type: 'UPDATE_LEAGUE', payload: updated });
    setSelectedTournament(updated);
  }

  function setPrize(idx: number, val: string) {
    const arr = [...hostPrizes]; arr[idx] = val; setHostPrizes(arr);
  }

  const tMatches = (code: string) => matches.filter((m) => m.leagueCode === code);
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name || 'Unknown';
  const teamShort = (id: string) => teams.find((t) => t.id === id)?.shortName || '??';
  const teamColor = (id: string) => teams.find((t) => t.id === id)?.color || '#64748b';
  const canAct = isLoggedIn || isAdmin;

  // ── HOST FORM ──────────────────────────────────────────────────────────────
  if (mode === 'host') {
    if (createdTournament) {
      return (
        <div className="space-y-5 max-w-lg mx-auto">
          <button onClick={() => { setMode('landing'); resetHost(); }} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto"><Trophy className="w-8 h-8 text-amber-400" /></div>
            <h3 className="text-lg font-bold text-white">Tournament Created!</h3>
            <p className="text-xs text-slate-400">Share this code with participants so they can find and join</p>
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
              {[1,2,3,4,5].map((n) => (
                <button key={n} type="button" onClick={() => setHostPrizeCount(n)}
                  className={'flex-1 py-2 text-sm font-bold rounded-lg transition-all ' + (hostPrizeCount === n ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700')}>{n}</button>
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

  // ── MY TOURNAMENTS ─────────────────────────────────────────────────────────
  if (mode === 'my') {
    const list = myTab === 'hosted' ? myHosted : myJoined;
    return (
      <div className="space-y-5">
        <button onClick={() => setMode('landing')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Tournaments
        </button>
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><ListOrdered className="w-5 h-5 text-amber-400" /> My Tournaments</h2>
          <p className="text-xs text-slate-400 mt-0.5">Tournaments you hosted or joined</p>
        </div>
        {/* Tabs */}
        <div className="flex bg-slate-900/60 border border-slate-800/50 rounded-xl p-1 gap-1">
          <button onClick={() => setMyTab('hosted')}
            className={'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-all ' + (myTab === 'hosted' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow' : 'text-slate-400 hover:text-white')}>
            <Star className="w-3.5 h-3.5" /> Hosted ({myHosted.length})
          </button>
          <button onClick={() => setMyTab('joined')}
            className={'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-all ' + (myTab === 'joined' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow' : 'text-slate-400 hover:text-white')}>
            <UserCheck className="w-3.5 h-3.5" /> Joined ({myJoined.length})
          </button>
        </div>
        {list.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto mb-3">
              {myTab === 'hosted' ? <Star className="w-6 h-6 text-slate-500" /> : <UserCheck className="w-6 h-6 text-slate-500" />}
            </div>
            <p className="text-sm text-slate-500">
              {myTab === 'hosted' ? "You haven't hosted any tournaments yet." : "You haven't joined any tournaments yet."}
            </p>
            {myTab === 'hosted' && (
              <button onClick={() => { setMode('host'); resetHost(); }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm font-semibold rounded-xl">
                <Trophy className="w-4 h-4" /> Host a Tournament
              </button>
            )}
            {myTab === 'joined' && (
              <button onClick={() => setMode('landing')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-sm font-semibold rounded-xl">
                Browse Tournaments
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((t) => (
              <TCard key={t.id} t={t} onClick={() => { setSelectedTournament(t); setMode('detail'); }}
                isOwner={t.ownerId === currentUserId}
                onDelete={() => dispatch({ type: 'DELETE_LEAGUE', payload: t.id })} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── TOURNAMENT DETAIL ──────────────────────────────────────────────────────
  if (mode === 'detail' && selectedTournament) {
    // Always get latest from store
    const t = allTournaments.find((l) => l.id === selectedTournament.id) || selectedTournament;
    const tms = tMatches(t.code);
    const live = tms.filter((m) => !m.isComplete && m.innings.length > 0);
    const done = tms.filter((m) => m.isComplete);
    const upcoming = tms.filter((m) => !m.isComplete && m.innings.length === 0);
    const isOwner = t.ownerId === currentUserId;
    const hasJoined = currentUserId ? (t.joinedBy || []).includes(currentUserId) : false;
    const joinCount = (t.joinedBy || []).length;

    return (
      <div className="space-y-5">
        <button onClick={() => { setMode('landing'); setSelectedTournament(null); }}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Tournaments
        </button>

        {/* Header card */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-amber-500/20 rounded-2xl overflow-hidden">
          <div className="p-5 space-y-4">
            {/* Title + badges */}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white">{t.name}</h2>
                  {isOwner && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-md border border-amber-500/30 uppercase">HOST</span>}
                  {hasJoined && !isOwner && <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-md border border-cyan-500/30 uppercase">JOINED</span>}
                </div>
                {t.ownerName && !isOwner && <p className="text-xs text-slate-400 mt-0.5">Hosted by <span className="text-slate-300 font-semibold">{t.ownerName}</span></p>}
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoCell icon={<span className="font-mono text-amber-400 text-xs font-bold">{t.code}</span>} label="Tournament Code" />
              {t.location && <InfoCell icon={<MapPin className="w-4 h-4 text-cyan-400" />} label="Location" value={t.location} />}
              {t.ballType && <InfoCell icon={<Layers className="w-4 h-4 text-purple-400" />} label="Ball Type" value={t.ballType} />}
              {t.entryFee !== undefined && <InfoCell icon={<IndianRupee className="w-4 h-4 text-green-400" />} label="Entry Fee" value={t.entryFee > 0 ? t.entryFee.toLocaleString() + ' / team' : 'Free'} />}
              {t.contact && <InfoCell icon={<Phone className="w-4 h-4 text-blue-400" />} label="Contact" value={t.contact} />}
              <InfoCell icon={<Users className="w-4 h-4 text-slate-400" />} label="Teams Joined" value={String(joinCount)} />
            </div>

            {/* Prize structure */}
            {t.prizes && t.prizes.some((p) => p > 0) && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Prize Structure</p>
                <div className="flex flex-wrap gap-2">
                  {t.prizes.map((prize, i) => prize > 0 && (
                    <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 text-center min-w-[4.5rem]">
                      <p className="text-[9px] text-amber-400/70 font-bold uppercase">{ORDINAL[i]}</p>
                      <p className="text-base font-bold text-amber-400">{prize.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Join / Leave button */}
            {canAct && !isOwner && (
              <div className="pt-1">
                {hasJoined ? (
                  <button onClick={() => handleLeave(t)}
                    className="w-full py-3 bg-slate-800 border border-slate-700 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                    <UserCheck className="w-4 h-4 text-cyan-400" /> Joined — Leave Tournament
                  </button>
                ) : (
                  <button onClick={() => handleJoin(t)}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30">
                    <UserCheck className="w-4 h-4" /> Join Tournament
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Matches */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Swords className="w-3.5 h-3.5" /> Matches ({tms.length})
          </h3>
          {tms.length === 0 ? (
            <p className="text-xs text-slate-600 italic py-4 text-center">No matches scheduled yet.</p>
          ) : (
            <div className="space-y-2">
              {live.map((m) => <MRow key={m.id} m={m} teamName={teamName} teamShort={teamShort} teamColor={teamColor} onScore={onScoreMatch} isLive />)}
              {upcoming.map((m) => <MRow key={m.id} m={m} teamName={teamName} teamShort={teamShort} teamColor={teamColor} />)}
              {done.map((m) => <MRow key={m.id} m={m} teamName={teamName} teamShort={teamShort} teamColor={teamColor} onStats={onViewStats} />)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── LANDING ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> Tournaments</h2>
        <p className="text-xs text-slate-400 mt-0.5">Host your own or browse existing tournaments</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {canAct && (
          <button onClick={() => { setMode('host'); resetHost(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/15 border border-amber-500/40 hover:border-amber-400/70 text-amber-300 text-sm font-semibold rounded-xl transition-all">
            <Trophy className="w-4 h-4" /> Host a Tournament
          </button>
        )}
        {canAct && (
          <button onClick={() => setMode('my')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/70 border border-slate-700/60 hover:border-slate-600 text-slate-300 text-sm font-semibold rounded-xl transition-all">
            <ListOrdered className="w-4 h-4 text-amber-400" /> My Tournaments
            {(myHosted.length + myJoined.length) > 0 && (
              <span className="bg-amber-500 text-slate-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{myHosted.length + myJoined.length}</span>
            )}
          </button>
        )}
      </div>

      {/* Search */}
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

      {/* All / Search results */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-600" />
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {searchQuery ? 'Search Results' : 'All Tournaments'}
          </h3>
          <span className="text-[10px] text-slate-600">({browseList.length})</span>
        </div>
        {browseList.length === 0 ? (
          <div className="text-center py-14">
            <Trophy className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">{searchQuery ? 'No tournaments match your search.' : 'No tournaments yet. Be the first to host one!'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {browseList.map((t) => (
              <TCard key={t.id} t={t}
                onClick={() => { setSelectedTournament(t); setMode('detail'); }}
                isOwner={t.ownerId === currentUserId}
                hasJoined={currentUserId ? (t.joinedBy || []).includes(currentUserId) : false}
                onDelete={() => dispatch({ type: 'DELETE_LEAGUE', payload: t.id })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Info Cell ────────────────────────────────────────────────────────────────
function InfoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-0.5">{icon}<p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</p></div>
      {value && <p className="text-sm font-semibold text-white">{value}</p>}
    </div>
  );
}

// ── Tournament Card (list item) ──────────────────────────────────────────────
function TCard({ t, onClick, isOwner, hasJoined, onDelete }: {
  t: League; onClick: () => void; isOwner: boolean; hasJoined?: boolean; onDelete: () => void;
}) {
  const joinCount = (t.joinedBy || []).length;
  return (
    <motion.div layout className="bg-slate-900/60 border border-slate-800/50 rounded-2xl overflow-hidden hover:border-slate-700/60 transition-all cursor-pointer group"
      onClick={onClick}>
      <div className="p-4 flex items-start gap-3">
        <div className="w-9 h-9 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <Trophy className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">{t.name}</h4>
            {isOwner && <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 text-[9px] font-bold rounded border border-amber-500/20 uppercase">HOST</span>}
            {hasJoined && !isOwner && <span className="px-1.5 py-0.5 bg-cyan-500/15 text-cyan-400 text-[9px] font-bold rounded border border-cyan-500/20 uppercase">JOINED</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="text-[10px] text-slate-500">Code: <span className="font-mono text-amber-400/80 font-bold">{t.code}</span></span>
            {t.location && <span className="text-[10px] text-slate-500 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{t.location}</span>}
            {t.ownerName && !isOwner && <span className="text-[10px] text-slate-500">by {t.ownerName}</span>}
            {joinCount > 0 && <span className="text-[10px] text-slate-500">{joinCount} joined</span>}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {t.entryFee !== undefined && t.entryFee > 0 && <span className="text-[10px] bg-slate-800/60 text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-0.5"><IndianRupee className="w-2.5 h-2.5" />{t.entryFee}/team</span>}
            {t.ballType && <span className="text-[10px] bg-slate-800/60 text-slate-300 px-2 py-0.5 rounded-md">{t.ballType}</span>}
            {t.prizes && t.prizes[0] > 0 && <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md">1st: {t.prizes[0].toLocaleString()}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {isOwner && <button onClick={onDelete} className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg transition-all"><X className="w-3.5 h-3.5" /></button>}
          <ChevronDown className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

// ── Match row ────────────────────────────────────────────────────────────────
interface MRowProps { m: Match; teamName: (id: string) => string; teamShort: (id: string) => string; teamColor: (id: string) => string; onScore?: (id: string) => void; onStats?: (id: string) => void; isLive?: boolean; }
function MRow({ m, teamName, teamShort, teamColor, onScore, onStats, isLive }: MRowProps) {
  const score = (idx: number) => { const inn = m.innings[idx]; if (!inn) return '-'; return `${inn.battingEntries.reduce((s, e) => s + e.runs, 0) + inn.extras}/${inn.battingEntries.filter((e) => !e.isNotOut).length}`; };
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-2.5">
      <div className="flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ background: teamColor(m.team1Id) }}>{teamShort(m.team1Id).slice(0,2)}</div>
          <span className="text-xs font-semibold text-white truncate">{teamName(m.team1Id)}</span>
          {m.innings[0] && <span className="text-xs font-mono text-slate-300 ml-auto whitespace-nowrap">{score(0)}</span>}
        </div>
        <span className="text-[9px] text-slate-600 font-bold">vs</span>
        <div className="flex-1 flex items-center gap-1.5 min-w-0 justify-end">
          {m.innings[1] && <span className="text-xs font-mono text-slate-300 mr-auto whitespace-nowrap">{score(1)}</span>}
          <span className="text-xs font-semibold text-white truncate">{teamName(m.team2Id)}</span>
          <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ background: teamColor(m.team2Id) }}>{teamShort(m.team2Id).slice(0,2)}</div>
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
