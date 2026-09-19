import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Swords, Trophy, LogOut, Eye, User, Lock, ShieldCheck, Search, Bell, Sun, Home, Radio, BarChart3, Target, Settings, Heart, Menu, X, ChevronDown } from 'lucide-react';
import TeamsView from './components/TeamsView';
import MatchesView from './components/MatchesView';
import CreateMatchForm from './components/CreateMatchForm';
import ScoringView from './components/ScoringView';
import MatchStats from './components/MatchStats';
import AuthGate, { getSession, clearSession } from './components/AuthGate';
import { useApp } from './store';
import LeaguesView from './components/LeaguesView';
import PinGate from './components/PinGate';
import Dashboard from './components/Dashboard';

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
  const [scorerLeagueCode, setScorerLeagueCode] = useState('');

  // Navigation states
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoggedIn = !!currentUserId;

  function handleNavigate(view: string) {
    setActiveView(view);
    setSidebarOpen(false);
    if (view === 'score-tools' || view === 'create-match') {
      setShowScorerCreate(true);
    } else {
      setShowScorerCreate(false);
    }
  }

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

  const navItems = [
    { id: 'dashboard', label: 'Home/Dashboard', icon: Home },
    { id: 'live-matches', label: 'Live Matches', icon: Radio },
    { id: 'matches', label: 'Matches', icon: Swords },
    { id: 'leagues', label: 'Leagues', icon: Trophy },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'players', label: 'Players', icon: User },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'score-tools', label: 'Score Tools', icon: Target },
    { id: 'my-teams', label: 'My Teams', icon: Heart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  function renderMainContent() {
    if (showScorerCreate || activeView === 'score-tools' || activeView === 'create-match') {
      if (createdMatch) {
        return (
          <div className="max-w-md mx-auto pt-10">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-8 text-center shadow-2xl shadow-cyan-900/20">
              <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Eye className="w-10 h-10 text-cyan-400" />
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
                  <p className="text-3xl font-mono font-bold text-cyan-400 tracking-[0.2em]">{createdMatch.viewerCode}</p>
                </div>
              </div>
              <button 
                onClick={() => { setScoringMatchId(createdMatch.id); setCreatedMatch(null); setShowScorerCreate(false); handleNavigate('dashboard'); }}
                className="w-full py-4 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-400 transition-all text-lg"
              >
                Start Scoring Now
              </button>
            </motion.div>
          </div>
        );
      }

      return (
        <div className="pt-10">
          <CreateMatchForm 
            onCancel={() => { setShowScorerCreate(false); setScorerLeagueCode(''); handleNavigate('dashboard'); }} 
            onCreated={(m) => setCreatedMatch(m)}
            initialLeagueCode={scorerLeagueCode || undefined}
            ownerId={currentUserId || undefined}
          />
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} onScoreMatch={handleScoreMatch} isAdmin={hasAdminAccess} onViewStats={setStatsMatchId} currentUserId={currentUserId || undefined} />;
      case 'matches':
      case 'live-matches':
        return (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <h2 className="text-xl font-bold text-white">{activeView === 'live-matches' ? 'Live Matches' : 'All Matches'}</h2>
              {(isLoggedIn || isGuest) && (
                <button onClick={() => { setShowScorerCreate(true); setScorerLeagueCode(''); }} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-500 transition-all">+ Create Match</button>
              )}
            </div>
            <MatchesView onScoreMatch={handleScoreMatch} onViewStats={setStatsMatchId} isAdmin={hasAdminAccess} isGlobalAdmin={hasAdminAccess} currentUserId={currentUserId || undefined} />
          </>
        );
      case 'leagues':
        return (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <h2 className="text-xl font-bold text-white">All Leagues</h2>
              {(isLoggedIn || isGuest) && (
                <button onClick={() => setShowLeagueCreate(true)} className="px-4 py-2 bg-amber-500/15 text-amber-400 text-sm font-bold rounded-lg hover:bg-amber-500/25 transition-all border border-amber-500/30">
                  <Trophy className="w-3.5 h-3.5 inline mr-1.5" />Create League
                </button>
              )}
            </div>
            <AnimatePresence>
              {showLeagueCreate && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                  <LeaguesView isAdmin={true} isGlobalAdmin={false} inlineCreate onDone={() => setShowLeagueCreate(false)}
                    onStartMatch={(code) => { setShowLeagueCreate(false); setScorerLeagueCode(code); setShowScorerCreate(true); }}
                    currentUserId={currentUserId || undefined} />
                </motion.div>
              )}
            </AnimatePresence>
            <LeaguesView isAdmin={hasAdminAccess} isGlobalAdmin={hasAdminAccess} currentUserId={currentUserId || undefined} onScoreMatch={handleScoreMatch} />
          </>
        );
      case 'teams':
      case 'players':
      case 'my-teams':
        return <TeamsView isAdmin={hasAdminAccess} currentUserId={currentUserId || undefined} />;
      case 'statistics':
        return <MatchesView onScoreMatch={handleScoreMatch} onViewStats={setStatsMatchId} isAdmin={hasAdminAccess} isGlobalAdmin={hasAdminAccess} currentUserId={currentUserId || undefined} />;
      default:
        return <Dashboard onNavigate={handleNavigate} onScoreMatch={handleScoreMatch} isAdmin={hasAdminAccess} onViewStats={setStatsMatchId} currentUserId={currentUserId || undefined} />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 bottom-0 w-60 bg-slate-950 border-r border-slate-800/50 flex flex-col z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} overflow-y-auto sidebar-scroll`}>
        {/* Header area */}
        <div className="p-6 flex flex-col items-center border-b border-slate-800/50">
          <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-3">
            <Trophy className="w-7 h-7 text-blue-500" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Cricverse</h1>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Play Beyond Borders</p>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(item => {
            const isActive = activeView === item.id;
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-900/30' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Footer area */}
        <div className="p-4 mt-auto">
          <div className="bg-slate-900 border border-slate-800/50 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400 font-medium">
              <span className="text-cyan-400 block mb-1">Good cricket,</span>
              better together!
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60 min-h-screen">
        {/* Top Bar */}
        <header className="h-16 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800/50 flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          
          <form onSubmit={handleCodeSubmit} className="flex-1 max-w-md relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3" />
            <input 
              type="text" 
              value={landingCode}
              onChange={e => { setLandingError(''); setLandingCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8)); }}
              placeholder="Search code..." 
              className={`w-full bg-slate-900 border ${landingError ? 'border-red-500' : 'border-slate-800'} rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors uppercase`}
            />
            {landingError && (
              <div className="absolute top-full left-0 mt-1 bg-red-500/10 border border-red-500/50 text-red-400 text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                {landingError}
              </div>
            )}
          </form>

          <div className="flex-1 flex justify-end gap-1 sm:gap-3 items-center">
            <button className="hidden sm:block p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-full transition-colors">
              <Sun className="w-5 h-5" />
            </button>
            <button className="hidden sm:block p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-950"></span>
            </button>
            
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-800/50">
              {isLoggedIn ? (
                <div className="flex items-center gap-2 cursor-pointer group">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-inner">
                    {currentUserName ? currentUserName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-sm font-medium text-white hidden sm:block">{currentUserName}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white hidden sm:block" />
                </div>
              ) : (
                <button onClick={() => setIsGuest(false)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all">
                  <User className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              )}
              
              {isLoggedIn && (
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 rounded-lg transition-colors ml-1" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => requestAdminAccess()}
                className={`p-2 rounded-lg transition-colors ml-1 ${hasAdminAccess ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={hasAdminAccess ? 'Admin active' : 'Enter Admin PIN'}
              >
                {hasAdminAccess ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {viewingLeagueId ? (
            <div className="space-y-4">
              <button onClick={() => { setViewingLeagueId(null); setLandingCode(''); }} className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-all border border-slate-700">← Back</button>
              <LeaguesView isAdmin={hasAdminAccess} isGlobalAdmin={hasAdminAccess} focusLeagueId={viewingLeagueId} currentUserId={currentUserId || undefined} onScoreMatch={handleScoreMatch} />
            </div>
          ) : renderMainContent()}
        </main>
      </div>
    </div>
  );
}
