import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, Swords, Trophy, Lock, X, LogOut, ShieldCheck, Eye, Check, User } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TeamsView from './components/TeamsView';
import MatchesView from './components/MatchesView';
import CreateMatchForm from './components/CreateMatchForm';
import ScoringView from './components/ScoringView';
import MatchStats from './components/MatchStats';
import PinGate, { getStoredPin, setStoredPin } from './components/PinGate';
import AuthGate, { getSession, clearSession } from './components/AuthGate';
import { useApp } from './store';
import LeaguesView from './components/LeaguesView';

type View = 'dashboard' | 'teams' | 'matches' | 'leagues';

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leagues', label: 'Leagues', icon: Trophy },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'matches', label: 'Matches', icon: Swords },
];

export default function App() {
  const { state } = useApp();
  const [view, setView] = useState<View>('dashboard');

  // Auth state
  const existingSession = getSession();
  const [currentUserId, setCurrentUserId] = useState<string | null>(existingSession?.userId || null);
  const [currentUserName, setCurrentUserName] = useState<string>(existingSession?.userName || '');
  const [isGuest, setIsGuest] = useState(false);

  // Legacy admin (kept for backward compat)
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinGate, setShowPinGate] = useState(false);
  const [showResetPin, setShowResetPin] = useState(false);
  const [resetPinStep, setResetPinStep] = useState<'verify' | 'new'>('verify');
  const [resetOldPin, setResetOldPin] = useState('');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [resetError, setResetError] = useState('');

  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);
  const [statsMatchId, setStatsMatchId] = useState<string | null>(null);

  const [landingCode, setLandingCode] = useState('');
  const [landingError, setLandingError] = useState('');
  
  const [showScorerCreate, setShowScorerCreate] = useState(false);
  const [createdMatch, setCreatedMatch] = useState<any>(null);
  const [viewingLeagueId, setViewingLeagueId] = useState<string | null>(null);
  const [showLeagueCreate, setShowLeagueCreate] = useState(false);
  const [viewerTab, setViewerTab] = useState<'matches' | 'leagues'>('matches');
  const [scorerLeagueCode, setScorerLeagueCode] = useState('');

  const isLoggedIn = !!currentUserId;

  // Show auth gate if not logged in and not guest
  if (!isLoggedIn && !isGuest) {
    return (
      <AuthGate
        onLogin={(userId, userName) => {
          setCurrentUserId(userId);
          setCurrentUserName(userName);
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
    setIsAdmin(false);
    setScoringMatchId(null);
    setStatsMatchId(null);
  }

  // Admin login via PIN (legacy)
  function handleAdminLogin() { setShowPinGate(true); }
  function handlePinSuccess() { setIsAdmin(true); setShowPinGate(false); }
  function handlePinCancel() { setShowPinGate(false); }
  function handleAdminLogout() { setIsAdmin(false); setScoringMatchId(null); }

  function handleScoreMatch(matchId: string) {
    const match = state.matches.find(m => m.id === matchId);
    if (!match || match.isComplete) return;
    // Allow scoring for: match owner, or legacy admin
    const isMatchOwner = currentUserId && match.ownerId === currentUserId;
    if (isAdmin || isMatchOwner || isLoggedIn) {
      setScoringMatchId(matchId);
    }
  }

  function handleResetPin() {
    const current = getStoredPin();
    if (resetPinStep === 'verify') {
      if (resetOldPin === current) { setResetPinStep('new'); setResetError(''); }
      else { setResetError('Incorrect current PIN'); }
    } else {
      if (resetNewPin.length !== 4 || !/^\d{4}$/.test(resetNewPin)) { setResetError('PIN must be exactly 4 digits'); return; }
      if (resetNewPin !== resetConfirmPin) { setResetError('PINs do not match'); return; }
      setStoredPin(resetNewPin);
      setShowResetPin(false); setResetPinStep('verify');
      setResetOldPin(''); setResetNewPin(''); setResetConfirmPin(''); setResetError('');
    }
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
          <LeaguesView isAdmin={isLoggedIn} focusLeagueId={viewingLeagueId} currentUserId={currentUserId || undefined} onScoreMatch={handleScoreMatch} />
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

                {/* Admin toggle for legacy support */}
                {!isAdmin && (
                  <button
                    onClick={handleAdminLogin}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white/70 text-[11px] font-bold rounded-lg transition-all"
                    title="Global Admin Login"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                )}
                {isAdmin && (
                  <>
                    <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-[11px] text-white font-bold tracking-wide">ADMIN</span>
                    </div>
                    {getStoredPin() && (
                      <button onClick={() => { setShowResetPin(true); setResetPinStep('verify'); setResetError(''); setResetOldPin(''); setResetNewPin(''); setResetConfirmPin(''); }}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Change Admin PIN">
                        <Lock className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={handleAdminLogout} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Exit Admin">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}

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
          </div>
        </div>
      </header>

      {isAdmin ? (
        <>
          <nav className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex gap-1">
                {navItems.map(item => (
                  <button key={item.id} onClick={() => setView(item.id)}
                    className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-all relative ${view === item.id ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}>
                    <item.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                    {view === item.id && (
                      <motion.div layoutId="nav-indicator" className="absolute bottom-0 left-2 right-2 h-[2px] bg-emerald-400 rounded-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <AnimatePresence mode="wait">
              {view === 'dashboard' && (
                <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                  <Dashboard onNavigate={(v) => setView(v as View)} onScoreMatch={handleScoreMatch} isAdmin={isAdmin} onViewStats={setStatsMatchId} />
                </motion.div>
              )}
              {view === 'teams' && (
                <motion.div key="teams" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                  <TeamsView isAdmin={isAdmin} />
                </motion.div>
              )}
              {view === 'matches' && (
                <motion.div key="matches" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                  <MatchesView onScoreMatch={handleScoreMatch} onViewStats={setStatsMatchId} isAdmin={isAdmin} currentUserId={currentUserId || undefined} />
                </motion.div>
              )}
              {view === 'leagues' && (
                <motion.div key="leagues" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                  <LeaguesView isAdmin={isAdmin} currentUserId={currentUserId || undefined} onScoreMatch={handleScoreMatch} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </>
      ) : showScorerCreate ? (
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
                  <Check className="w-10 h-10 text-emerald-400" />
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
          </div>

          {viewerTab === 'matches' ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-bold text-white">All Matches</h2>
                {isLoggedIn && (
                  <button onClick={() => setShowScorerCreate(true)}
                    className="px-4 py-2 bg-slate-800 text-slate-200 text-sm font-bold rounded-lg hover:bg-slate-700 transition-all border border-slate-700">
                    + Create Match as Scorer
                  </button>
                )}
                {isGuest && (
                  <button onClick={() => setIsGuest(false)}
                    className="px-4 py-2 bg-emerald-500/15 text-emerald-400 text-sm font-bold rounded-lg hover:bg-emerald-500/25 transition-all border border-emerald-500/30">
                    Login to Create Match
                  </button>
                )}
              </div>
              <div>
                <MatchesView onScoreMatch={handleScoreMatch} onViewStats={setStatsMatchId} isAdmin={isLoggedIn} currentUserId={currentUserId || undefined} />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-bold text-white">All Leagues</h2>
                {isLoggedIn && (
                  <button onClick={() => setShowLeagueCreate(true)}
                    className="px-4 py-2 bg-amber-500/15 text-amber-400 text-sm font-bold rounded-lg hover:bg-amber-500/25 transition-all border border-amber-500/30">
                    <Trophy className="w-3.5 h-3.5 inline mr-1.5" />Create League
                  </button>
                )}
                {isGuest && (
                  <button onClick={() => setIsGuest(false)}
                    className="px-4 py-2 bg-emerald-500/15 text-emerald-400 text-sm font-bold rounded-lg hover:bg-emerald-500/25 transition-all border border-emerald-500/30">
                    Login to Create League
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showLeagueCreate && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <LeaguesView isAdmin={true} inlineCreate onDone={() => setShowLeagueCreate(false)}
                      onStartMatch={(code) => { setShowLeagueCreate(false); setScorerLeagueCode(code); setShowScorerCreate(true); }}
                      currentUserId={currentUserId || undefined} />
                  </motion.div>
                )}
              </AnimatePresence>

              <LeaguesView isAdmin={isLoggedIn} currentUserId={currentUserId || undefined} onScoreMatch={handleScoreMatch} />
            </>
          )}
        </main>
      )}

      {/* Reset PIN Modal */}
      <AnimatePresence>
        {showResetPin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={() => setShowResetPin(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800/60 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Change Admin PIN</h3>
                </div>
                <button onClick={() => setShowResetPin(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {resetPinStep === 'verify' ? (
                <div className="space-y-3">
                  <label className="block text-xs text-slate-400 font-medium">Current PIN</label>
                  <input type="password" inputMode="numeric" maxLength={4} value={resetOldPin}
                    onChange={e => { setResetOldPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setResetError(''); }}
                    placeholder="Enter current 4-digit PIN"
                    className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white text-center tracking-[0.5em] focus:outline-none focus:border-emerald-500/50" autoFocus />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1.5">New PIN</label>
                    <input type="password" inputMode="numeric" maxLength={4} value={resetNewPin}
                      onChange={e => { setResetNewPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setResetError(''); }}
                      placeholder="Enter new 4-digit PIN"
                      className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white text-center tracking-[0.5em] focus:outline-none focus:border-emerald-500/50" autoFocus />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1.5">Confirm New PIN</label>
                    <input type="password" inputMode="numeric" maxLength={4} value={resetConfirmPin}
                      onChange={e => { setResetConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setResetError(''); }}
                      placeholder="Re-enter new PIN"
                      className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white text-center tracking-[0.5em] focus:outline-none focus:border-emerald-500/50" />
                  </div>
                </div>
              )}
              {resetError && <p className="text-xs text-rose-400 font-medium text-center">{resetError}</p>}
              <button onClick={handleResetPin}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-900/40 transition-all">
                {resetPinStep === 'verify' ? 'Verify' : 'Update PIN'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
