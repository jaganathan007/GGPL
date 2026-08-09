import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Swords, Trophy, LogOut, Eye, User, Lock, ShieldCheck } from 'lucide-react';
import TeamsView from './components/TeamsView';
import MatchesView from './components/MatchesView';
import CreateMatchForm from './components/CreateMatchForm';
import ScoringView from './components/ScoringView';
import MatchStats from './components/MatchStats';
import AuthGate, { getSession, clearSession } from './components/AuthGate';
import { useApp } from './store';
import LeaguesView from './components/LeaguesView';
import PinGate from './components/PinGate';

export default function App() {
  const { state } = useApp();

  // Auth state
  const existingSession = getSession();
  const [currentUserId, setCurrentUserId] = useState<string | null>(existingSession?.userId || null);
  const [currentUserName, setCurrentUserName] = useState<string>(existingSession?.userName || '');
  const [isGuest, setIsGuest] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [showPinGate, setShowPinGate] = useState(false);
  const [pendingAdminAction, setPendingAdminAction] = useState<(() => void) | null>(null);

  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);
  const [statsMatchId, setStatsMatchId] = useState<string | null>(null);

  const [landingCode, setLandingCode] = useState('');
  const [landingError, setLandingError] = useState('');
  
  const [showScorerCreate, setShowScorerCreate] = useState(false);
  const [createdMatch, setCreatedMatch] = useState<any>(null);
  const [viewingLeagueId, setViewingLeagueId] = useState<string | null>(null);
  const [showLeagueCreate, setShowLeagueCreate] = useState(false);
  const [viewerTab, setViewerTab] = useState<'matches' | 'leagues' | 'teams'>('matches');
  const [scorerLeagueCode, setScorerLeagueCode] = useState('');

  const isLoggedIn = !!currentUserId;

  function requestAdminAccess(action?: () => void) {
    if (hasAdminAccess) {
      action?.();
      return;
    }
    setPendingAdminAction(() => action || null);
    setShowPinGate(true);
  }

  // Show auth gate if not logged in and not guest
  if (!isLoggedIn && !isGuest) {
    return (
      <AuthGate
        onLogin={(userId, userName) => {
          setCurrentUserId(userId);
          setCurrentUserName(userName);
          setHasAdminAccess(false);
        }}
        onGuest={() => setIsGuest(true)}
      />
    );
  }

  function handleLogout() {
    clearSession();
    setCurrentUserId(null);
    setCurrentUserName('');
    setIsGuest(false);
    setHasAdminAccess(false);
    setScoringMatchId(null);
    setStatsMatchId(null);
  }

  function handleScoreMatch(matchId: string) {
    const match = state.matches.find(m => m.id === matchId);
    if (!match || match.isComplete) return;
    // Allow scoring for the match owner, any logged-in user, or PIN-protected admin.
    const isMatchOwner = currentUserId && match.ownerId === currentUserId;
    if (isMatchOwner || hasAdminAccess || isLoggedIn) {
      setScoringMatchId(matchId);
      return;
    }
    requestAdminAccess(() => setScoringMatchId(matchId));
  }

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = landingCode.trim().toUpperCase();
    if (!code) return;
    const league = state.leagues?.find(l => l.code === code);
    if (league) { setLandingError(''); setViewingLeagueId(league.id); return; }
    const match = state.matches.find(m => m.viewerCode === code || m.adminCode === code);
    if (!match) { setLandingError('Invalid code. Try a match or league code.'); return; }
    setLandingError('');
    // Scorer code = authorization to score (the code itself is the secret)
    if (code === match.adminCode && !match.isComplete) { setScoringMatchId(match.id); }
    else { setStatsMatchId(match.id); }
  }

  function handlePinSuccess() {
    setHasAdminAccess(true);
    setShowPinGate(false);
    pendingAdminAction?.();
    setPendingAdminAction(null);
  }

  function handlePinCancel() {
    setShowPinGate(false);
    setPendingAdminAction(null);
  }

  // PIN gate overlay
  if (showPinGate) return <PinGate onSuccess={handlePinSuccess} onCancel={handlePinCancel} />;

  // Scoring view
  if (scoringMatchId) {
    return <ScoringView matchId={scoringMatchId} onBack={() => { setScoringMatchId(null); setLandingCode(''); }} />;
  }

  // Stats view
  if (statsMatchId) {
    return <MatchStats matchId={statsMatchId} onBack={() => { setStatsMatchId(null); setLandingCode(''); }} />;
  }

  // League viewer (non-admin)
  if (viewingLeagueId) {
    return (
      <div className="min-h-screen bg-slate-950">
        <header className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 shadow-lg shadow-emerald-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
            <div className="w-11 h-11 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-extrabold text-white tracking-tight">GGPL</h1>
              <p className="text-[11px] text-emerald-100/70 font-medium tracking-wide uppercase">Score Tracker</p>
            </div>
            <button onClick={() => { setViewingLeagueId(null); setLandingCode(''); }} className="px-4 py-2 bg-white/15 text-white text-sm font-bold rounded-lg hover:bg-white/25 transition-all">← Back</button>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <LeaguesView isAdmin={hasAdminAccess} isGlobalAdmin={hasAdminAccess} focusLeagueId={viewingLeagueId} currentUserId={currentUserId || undefined} onScoreMatch={handleScoreMatch} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 shadow-lg shadow-emerald-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-11 h-11 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-white tracking-tight">GGPL</h1>
            <p className="text-[11px] text-emerald-100/70 font-medium tracking-wide uppercase">Score Tracker</p>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                {/* User badge */}
                <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5">
                  <User className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-[11px] text-white font-bold tracking-wide">{currentUserName}</span>
                </div>

                {/* Logout */}
                <button onClick={handleLogout} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Logout">
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </>
            ) : (
              <>
                {/* Guest mode - show login button */}
                <button
                  onClick={() => setIsGuest(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-[11px] font-bold rounded-lg transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              </>
            )}
            <button
              onClick={() => requestAdminAccess()}
              className={`flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-sm text-white text-[11px] font-bold rounded-lg transition-all ${
                hasAdminAccess ? 'bg-amber-500/30 hover:bg-amber-500/40' : 'bg-white/15 hover:bg-white/25'
              }`}
              title={hasAdminAccess ? 'Admin access unlocked' : 'Enter admin PIN'}
            >
              {hasAdminAccess ? <ShieldCheck className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{hasAdminAccess ? 'Admin' : 'Admin PIN'}</span>
            </button>
          </div>
        </div>
      </header>

      {showScorerCreate ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {!createdMatch ? (
            <div className="pt-10">
              <CreateMatchForm 
                onCancel={() => { setShowScorerCreate(false); setScorerLeagueCode(''); }} 
                onCreated={(m) => setCreatedMatch(m)}
                initialLeagueCode={scorerLeagueCode || undefined}
                ownerId={currentUserId || undefined}
              />
            </div>
          ) : (
            <div className="max-w-md mx-auto pt-10">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 text-center shadow-2xl shadow-emerald-900/20">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Eye className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Match Created!</h2>
                <p className="text-slate-400 text-sm mb-8">Save these codes! You will need them to score or view the match later.</p>
                <div className="space-y-4 mb-8">
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Scorer Code (For You)</p>
                    <p className="text-3xl font-mono font-bold text-amber-400 tracking-[0.2em]">{createdMatch.adminCode}</p>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Viewer Code (Share This)</p>
                    <p className="text-3xl font-mono font-bold text-emerald-400 tracking-[0.2em]">{createdMatch.viewerCode}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setScoringMatchId(createdMatch.id); setCreatedMatch(null); setShowScorerCreate(false); }}
                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-all text-lg"
                >
                  Start Scoring Now
                </button>
              </motion.div>
            </div>
          )}
        </main>
      ) : (
        /* Viewer / Logged-in User Mode */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Search by Code */}
          <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              Find Match or League
            </h3>
            <form onSubmit={handleCodeSubmit} className="flex gap-3">
              <input
                type="text" value={landingCode}
                onChange={e => setLandingCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8))}
                placeholder="Enter Match or League Code"
                className="flex-1 bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-lg tracking-widest font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all uppercase"
              />
              <button type="submit" disabled={landingCode.length < 3}
                className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Search
              </button>
            </form>
            {landingError && <p className="text-rose-400 text-xs font-semibold mt-2">{landingError}</p>}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800/50 rounded-xl p-1">
            <button onClick={() => setViewerTab('matches')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${viewerTab === 'matches' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/30' : 'text-slate-400 hover:text-slate-200'}`}>
              <Swords className="w-4 h-4" /> Matches
            </button>
            <button onClick={() => setViewerTab('leagues')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${viewerTab === 'leagues' ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/30' : 'text-slate-400 hover:text-slate-200'}`}>
              <Trophy className="w-4 h-4" /> Leagues
            </button>
            {isLoggedIn && (
              <button onClick={() => setViewerTab('teams')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${viewerTab === 'teams' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-900/30' : 'text-slate-400 hover:text-slate-200'}`}>
                <Users className="w-4 h-4" /> My Teams
              </button>
            )}
          </div>

          {viewerTab === 'matches' ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-bold text-white">All Matches</h2>
                {(isLoggedIn || isGuest) && (
                  <button onClick={() => setShowScorerCreate(true)}
                    className="px-4 py-2 bg-slate-800 text-slate-200 text-sm font-bold rounded-lg hover:bg-slate-700 transition-all border border-slate-700">
                    + Create Match
                  </button>
                )}
              </div>
              <div>
                <MatchesView onScoreMatch={handleScoreMatch} onViewStats={setStatsMatchId} isAdmin={hasAdminAccess} isGlobalAdmin={hasAdminAccess} currentUserId={currentUserId || undefined} />
              </div>
            </>
          ) : viewerTab === 'teams' ? (
            <>
              <TeamsView isAdmin={hasAdminAccess} currentUserId={currentUserId || undefined} />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-bold text-white">All Leagues</h2>
                {(isLoggedIn || isGuest) && (
                  <button onClick={() => setShowLeagueCreate(true)}
                    className="px-4 py-2 bg-amber-500/15 text-amber-400 text-sm font-bold rounded-lg hover:bg-amber-500/25 transition-all border border-amber-500/30">
                    <Trophy className="w-3.5 h-3.5 inline mr-1.5" />Create League
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showLeagueCreate && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <LeaguesView isAdmin={true} isGlobalAdmin={false} inlineCreate onDone={() => setShowLeagueCreate(false)}
                      onStartMatch={(code) => { setShowLeagueCreate(false); setScorerLeagueCode(code); setShowScorerCreate(true); }}
                      currentUserId={currentUserId || undefined} />
                  </motion.div>
                )}
              </AnimatePresence>

              <LeaguesView isAdmin={hasAdminAccess} isGlobalAdmin={hasAdminAccess} currentUserId={currentUserId || undefined} onScoreMatch={handleScoreMatch} />
            </>
          )}
        </main>
      )}
    </div>
  );
}
