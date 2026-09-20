import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Swords, Trophy, LogOut, Eye, User, Lock, ShieldCheck, Search, Bell, Sun, Home, Radio, BarChart3, Calendar, Menu, ChevronDown, X, Clock, MapPin, Play } from 'lucide-react';
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
import TournamentsView from './components/TournamentsView';
import PlayersView from './components/PlayersView';
import StatsView from './components/StatsView';

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

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const upcomingReminders = useMemo(() => {
    return (state.matches || [])
      .filter(m => !m.isComplete && m.innings.length === 0)
      .sort((a, b) => {
        const tA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
        const tB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
        return tA - tB;
      });
  }, [state.matches]);

  const liveMatchesList = useMemo(() => {
    return (state.matches || []).filter(m => !m.isComplete && m.innings.length > 0);
  }, [state.matches]);

  const totalNotifications = upcomingReminders.length + liveMatchesList.length;

  const getTeam = (teamId: string) => (state.teams || []).find(t => t.id === teamId);

  function formatReminderDate(dateStr: string, timeStr?: string) {
    if (!dateStr) return timeStr || '';
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      let prefix = '';
      if (dateStr === todayStr) {
        prefix = 'Today';
      } else if (dateStr === tomorrowStr) {
        prefix = 'Tomorrow';
      } else {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const d = parts[0].length === 4 
            ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
            : new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          prefix = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        } else {
          prefix = dateStr;
        }
      }
      return timeStr ? `${prefix} at ${timeStr}` : prefix;
    } catch {
      return `${dateStr} ${timeStr || ''}`.trim();
    }
  }

  function handleNavigate(view: string) {
    setActiveView(view);
    setSidebarOpen(false);
    if (view === 'create-match') {
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
    const isMatchOwner = Boolean(currentUserId && match.ownerId === currentUserId);
    if (isMatchOwner || hasAdminAccess) {
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

  // Nav items from the wireframe
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'live-matches', label: 'Live Matches', icon: Radio },
    { id: 'matches', label: 'Matches', icon: Swords },
    { id: 'upcoming-matches', label: 'Upcoming Matches', icon: Calendar },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'leagues', label: 'Leagues', icon: Trophy },
    { id: 'tournaments', label: 'Tournaments', icon: Trophy },
    { id: 'players', label: 'Players', icon: User },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
  ];

  function renderMainContent() {
    if (showScorerCreate || activeView === 'create-match') {
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
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all text-lg shadow-lg shadow-cyan-900/30"
              >
                Start Scoring Now
              </button>
            </motion.div>
          </div>
        );
      }

      return (
        <div className="pt-6">
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
      
      case 'live-matches':
        return (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">Live Matches</h2>
              <p className="text-xs text-slate-400 mt-0.5">Matches currently in progress</p>
            </div>
            <MatchesView filter="live" onScoreMatch={handleScoreMatch} onViewStats={setStatsMatchId} isAdmin={hasAdminAccess} isGlobalAdmin={hasAdminAccess} currentUserId={currentUserId || undefined} />
          </>
        );

      case 'matches':
        return (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">Matches</h2>
              <p className="text-xs text-slate-400 mt-0.5">All matches — live, finished &amp; upcoming</p>
            </div>
            <MatchesView filter="all" onScoreMatch={handleScoreMatch} onViewStats={setStatsMatchId} isAdmin={hasAdminAccess} isGlobalAdmin={hasAdminAccess} currentUserId={currentUserId || undefined} />
          </>
        );

      case 'upcoming-matches':
        return (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">Upcoming Matches</h2>
              <p className="text-xs text-slate-400 mt-0.5">Scheduled fixtures</p>
            </div>
            <MatchesView filter="upcoming" onScoreMatch={handleScoreMatch} onViewStats={setStatsMatchId} isAdmin={hasAdminAccess} isGlobalAdmin={hasAdminAccess} currentUserId={currentUserId || undefined} />
          </>
        );

      case 'teams':
        return (
          <TeamsView
            isAdmin={hasAdminAccess}
            currentUserId={currentUserId || undefined}
            isLoggedIn={isLoggedIn}
          />
        );

      case 'leagues':
        return (
          <LeaguesView
            isAdmin={hasAdminAccess}
            isGlobalAdmin={hasAdminAccess}
            currentUserId={currentUserId || undefined}
            onScoreMatch={handleScoreMatch}
          />
        );

      case 'tournaments':
        return (
          <TournamentsView
            currentUserId={currentUserId || undefined}
            currentUserName={currentUserName || undefined}
            isLoggedIn={isLoggedIn}
            isAdmin={hasAdminAccess}
            onScoreMatch={handleScoreMatch}
            onViewStats={setStatsMatchId}
          />
        );

      case 'players':
        return (
          <PlayersView
            currentUserId={currentUserId || undefined}
            isLoggedIn={isLoggedIn}
            onNavigateToTeams={() => handleNavigate('teams')}
          />
        );

      case 'statistics':
        return (
          <StatsView currentUserId={currentUserId || undefined} />
        );

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
      <aside className={`fixed left-0 top-0 bottom-0 w-60 bg-slate-950 border-r border-slate-800/60 flex flex-col z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} overflow-y-auto sidebar-scroll`}>
        {/* Header area */}
        <div className="p-6 flex flex-col items-center border-b border-slate-800/60">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 rounded-2xl flex items-center justify-center mb-2.5 shadow-lg shadow-cyan-950">
            <Trophy className="w-6 h-6 text-cyan-400" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Cricverse</h1>
          <p className="text-[10px] text-cyan-400/80 font-semibold uppercase tracking-widest mt-0.5">Play Beyond Borders</p>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-5 space-y-1.5">
          {navItems.map(item => {
            const isActive = activeView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/30 font-bold' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer area */}
        <div className="p-4 mt-auto border-t border-slate-800/40">
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 font-medium">
              <span className="text-cyan-400 font-bold block mb-0.5">Good cricket,</span>
              better together!
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60 min-h-screen">
        {/* Top Bar */}
        <header className="h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60 flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          
          {/* SEARCH CODE input */}
          <form onSubmit={handleCodeSubmit} className="flex-1 max-w-md relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input 
              type="text" 
              value={landingCode}
              onChange={e => { setLandingError(''); setLandingCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8)); }}
              placeholder="SEARCH CODE" 
              className={`w-full bg-slate-900/80 border ${landingError ? 'border-red-500' : 'border-slate-800'} rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors uppercase font-medium tracking-wide`}
            />
            {landingError && (
              <div className="absolute top-full left-0 mt-1 bg-red-500/10 border border-red-500/50 text-red-400 text-xs px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50">
                {landingError}
              </div>
            )}
          </form>

          {/* Right Header Controls */}
          <div className="flex-1 flex justify-end gap-2 sm:gap-3 items-center">
            <button className="hidden sm:flex p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-colors">
              <Sun className="w-4.5 h-4.5" />
            </button>
            {/* Notifications / Reminders */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`flex p-2 rounded-xl transition-colors relative ${showNotifications ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                title="Notifications & Match Reminders"
              >
                <Bell className="w-4.5 h-4.5" />
                {totalNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-gradient-to-r from-amber-500 to-rose-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md">
                    {totalNotifications > 9 ? '9+' : totalNotifications}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-bold text-white">Notifications & Reminders</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {totalNotifications > 0 && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/30">
                            {totalNotifications} active
                          </span>
                        )}
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="p-1 text-slate-500 hover:text-slate-300 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* List */}
                    <div className="max-h-96 overflow-y-auto p-3 space-y-2.5">
                      {/* Live Matches */}
                      {liveMatchesList.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 px-1">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                            Live Now ({liveMatchesList.length})
                          </p>
                          {liveMatchesList.map(m => {
                            const t1 = getTeam(m.team1Id);
                            const t2 = getTeam(m.team2Id);
                            return (
                              <div
                                key={m.id}
                                className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 hover:border-rose-400/60 transition-all cursor-pointer"
                                onClick={() => {
                                  setShowNotifications(false);
                                  handleScoreMatch(m.id);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-white">
                                    {t1?.name || 'Team 1'} vs {t2?.name || 'Team 2'}
                                  </span>
                                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full uppercase">
                                    Live
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-500" /> {m.venue || 'Local Ground'}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Scheduled Matches */}
                      {upcomingReminders.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 px-1">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            Scheduled Fixtures ({upcomingReminders.length})
                          </p>
                          {upcomingReminders.map(m => {
                            const t1 = getTeam(m.team1Id);
                            const t2 = getTeam(m.team2Id);
                            const dateFormatted = formatReminderDate(m.date, m.time);
                            return (
                              <div
                                key={m.id}
                                className="bg-slate-800/60 border border-slate-700/60 hover:border-amber-500/40 rounded-xl p-3 transition-all cursor-pointer group"
                                onClick={() => {
                                  setShowNotifications(false);
                                  handleNavigate('upcoming-matches');
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t1?.color || '#38bdf8' }} />
                                      <span className="truncate">{t1?.name || 'Team 1'}</span>
                                      <span className="text-slate-500 text-[10px] font-normal">vs</span>
                                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t2?.color || '#f43f5e' }} />
                                      <span className="truncate">{t2?.name || 'Team 2'}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-400">
                                      <span className="flex items-center gap-1 text-amber-300 font-medium">
                                        <Clock className="w-3 h-3 text-amber-400" /> {dateFormatted}
                                      </span>
                                      <span className="flex items-center gap-1 text-slate-400">
                                        <MapPin className="w-3 h-3 text-slate-500" /> {m.venue || 'Local Ground'}
                                      </span>
                                      <span className="text-slate-500">
                                        {m.totalOvers} Ov
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Empty state */}
                      {totalNotifications === 0 && (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Bell className="w-6 h-6 text-slate-600" />
                          </div>
                          <p className="text-xs font-semibold text-slate-300">No match reminders</p>
                          <p className="text-[11px] text-slate-500 mt-1 max-w-[14rem] mx-auto">
                            When matches are scheduled or live, reminders will appear here.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setShowNotifications(false);
                          handleNavigate('upcoming-matches');
                        }}
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                      >
                        View all scheduled fixtures →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-800">
              {isLoggedIn ? (
                <div className="flex items-center gap-2 cursor-pointer group">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {currentUserName ? currentUserName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-sm font-semibold text-slate-200 hidden sm:block">{currentUserName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white hidden sm:block" />
                </div>
              ) : (
                <button onClick={() => setIsGuest(false)} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md">
                  <User className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              )}
              
              {isLoggedIn && (
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition-colors ml-1" title="Logout">
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              )}
              <button
                onClick={() => requestAdminAccess()}
                className={`p-2 rounded-xl transition-colors ml-1 ${hasAdminAccess ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                title={hasAdminAccess ? 'Admin active' : 'Enter Admin PIN'}
              >
                {hasAdminAccess ? <ShieldCheck className="w-4.5 h-4.5" /> : <Lock className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {viewingLeagueId ? (
            <div className="space-y-4">
              <button onClick={() => { setViewingLeagueId(null); setLandingCode(''); }} className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-all border border-slate-700">← Back</button>
              <LeaguesView isAdmin={hasAdminAccess} isGlobalAdmin={hasAdminAccess} focusLeagueId={viewingLeagueId} currentUserId={currentUserId || undefined} onScoreMatch={handleScoreMatch} />
            </div>
          ) : renderMainContent()}
        </main>
      </div>
    </div>
  );
}
