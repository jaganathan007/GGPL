import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, Swords, Trophy, Settings, Lock, X, LogOut, ShieldCheck, Eye } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TeamsView from './components/TeamsView';
import MatchesView from './components/MatchesView';
import ScoringView from './components/ScoringView';
import MatchStats from './components/MatchStats';
import PinGate, { getStoredPin, setStoredPin } from './components/PinGate';

type View = 'dashboard' | 'teams' | 'matches';

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'matches', label: 'Matches', icon: Swords },
];

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinGate, setShowPinGate] = useState(false);
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);
  const [statsMatchId, setStatsMatchId] = useState<string | null>(null);
  const [showResetPin, setShowResetPin] = useState(false);
  const [resetPinStep, setResetPinStep] = useState<'verify' | 'new'>('verify');
  const [resetOldPin, setResetOldPin] = useState('');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [resetError, setResetError] = useState('');

  // Admin login via PIN
  function handleAdminLogin() {
    setShowPinGate(true);
  }

  function handlePinSuccess() {
    setIsAdmin(true);
    setShowPinGate(false);
  }

  function handlePinCancel() {
    setShowPinGate(false);
  }

  function handleAdminLogout() {
    setIsAdmin(false);
    setScoringMatchId(null);
  }

  // Score match — only admin can
  function handleScoreMatch(matchId: string) {
    if (isAdmin) {
      setScoringMatchId(matchId);
    }
  }

  function handleResetPin() {
    const current = getStoredPin();
    if (resetPinStep === 'verify') {
      if (resetOldPin === current) {
        setResetPinStep('new');
        setResetError('');
      } else {
        setResetError('Incorrect current PIN');
      }
    } else {
      if (resetNewPin.length !== 4 || !/^\d{4}$/.test(resetNewPin)) {
        setResetError('PIN must be exactly 4 digits');
        return;
      }
      if (resetNewPin !== resetConfirmPin) {
        setResetError('PINs do not match');
        return;
      }
      setStoredPin(resetNewPin);
      setShowResetPin(false);
      setResetPinStep('verify');
      setResetOldPin('');
      setResetNewPin('');
      setResetConfirmPin('');
      setResetError('');
    }
  }

  // PIN gate overlay
  if (showPinGate) {
    return <PinGate onSuccess={handlePinSuccess} onCancel={handlePinCancel} />;
  }

  // Scoring view (admin only)
  if (scoringMatchId && isAdmin) {
    return (
      <ScoringView
        matchId={scoringMatchId}
        onBack={() => {
          setScoringMatchId(null);
          setView('matches');
        }}
      />
    );
  }

  // Stats view (anyone)
  if (statsMatchId) {
    return (
      <MatchStats
        matchId={statsMatchId}
        onBack={() => {
          setStatsMatchId(null);
          setView('matches');
        }}
      />
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

          {/* Role indicator + actions */}
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <>
                {/* Admin badge */}
                <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-[11px] text-white font-bold tracking-wide">ADMIN</span>
                </div>
                {/* Change PIN */}
                {getStoredPin() && (
                  <button
                    onClick={() => { setShowResetPin(true); setResetPinStep('verify'); setResetError(''); setResetOldPin(''); setResetNewPin(''); setResetConfirmPin(''); }}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Change Admin PIN"
                  >
                    <Settings className="w-4.5 h-4.5" />
                  </button>
                )}
                {/* Logout */}
                <button
                  onClick={handleAdminLogout}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Switch to Viewer"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </>
            ) : (
              <>
                {/* Viewer badge */}
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5">
                  <Eye className="w-3.5 h-3.5 text-white/60" />
                  <span className="text-[11px] text-white/70 font-semibold tracking-wide">VIEWER</span>
                </div>
                {/* Login as admin */}
                <button
                  onClick={handleAdminLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-[11px] font-bold rounded-lg transition-all"
                  title="Login as Admin"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-all relative ${
                  view === item.id
                    ? 'text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
                {view === item.id && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-emerald-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
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
              <MatchesView onScoreMatch={handleScoreMatch} onViewStats={setStatsMatchId} isAdmin={isAdmin} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Reset PIN Modal */}
      <AnimatePresence>
        {showResetPin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={() => setShowResetPin(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800/60 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
            >
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
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={resetOldPin}
                    onChange={e => { setResetOldPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setResetError(''); }}
                    placeholder="Enter current 4-digit PIN"
                    className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white text-center tracking-[0.5em] focus:outline-none focus:border-emerald-500/50"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1.5">New PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={resetNewPin}
                      onChange={e => { setResetNewPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setResetError(''); }}
                      placeholder="Enter new 4-digit PIN"
                      className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white text-center tracking-[0.5em] focus:outline-none focus:border-emerald-500/50"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1.5">Confirm New PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={resetConfirmPin}
                      onChange={e => { setResetConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setResetError(''); }}
                      placeholder="Re-enter new PIN"
                      className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white text-center tracking-[0.5em] focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>
              )}

              {resetError && (
                <p className="text-xs text-rose-400 font-medium text-center">{resetError}</p>
              )}

              <button
                onClick={handleResetPin}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-900/40 transition-all"
              >
                {resetPinStep === 'verify' ? 'Verify' : 'Update PIN'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
