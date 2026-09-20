import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Play, Trophy, X, Check, Swords, MapPin, Calendar, Clock, BarChart3, Eye } from 'lucide-react';
import { useApp } from '../store';
import type { Match, League } from '../types';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getInningsForTeam(match: Match, teamId: string) {
  return match.innings.find(inn => inn.battingTeamId === teamId) || null;
}

function getInningsTotal(match: Match, teamId: string): number {
  const inn = getInningsForTeam(match, teamId);
  if (!inn) return 0;
  return inn.battingEntries.reduce((s, e) => s + e.runs, 0) + inn.extras;
}

function getInningsWickets(match: Match, teamId: string): number {
  const inn = getInningsForTeam(match, teamId);
  if (!inn) return 0;
  return inn.battingEntries.filter(e => !e.isNotOut).length;
}

function getInningsOvers(match: Match, teamId: string): number | string {
  const inn = getInningsForTeam(match, teamId);
  if (!inn) return 0;
  return inn.bowlingEntries.reduce((s, e) => s + e.overs, 0);
}

interface MatchesViewProps {
  onScoreMatch: (matchId: string) => void;
  onViewStats?: (matchId: string) => void;
  isAdmin: boolean;
  isGlobalAdmin?: boolean;
  currentUserId?: string;
  filter?: 'all' | 'live' | 'upcoming' | 'completed';
}

const TEAM_COLORS = [
  '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#10b981', '#f97316', '#14b8a6', '#6366f1',
];

export default function MatchesView({ onScoreMatch, onViewStats, isAdmin, isGlobalAdmin, currentUserId, filter = 'all' }: MatchesViewProps) {
  const { state, dispatch } = useApp();
  const { matches, leagues } = state;
  // Filter teams by owner: only show teams created by the current user
  const allTeams = state.teams;
  const myTeams = currentUserId
    ? allTeams.filter(t => t.ownerId === currentUserId)
    : allTeams;
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [customTeam1Name, setCustomTeam1Name] = useState('');
  const [customTeam2Name, setCustomTeam2Name] = useState('');
  const [isCreatingTeam1, setIsCreatingTeam1] = useState(myTeams.length < 2);
  const [isCreatingTeam2, setIsCreatingTeam2] = useState(myTeams.length < 2);
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00');
  const [totalOvers, setTotalOvers] = useState(10);
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<'bat'|'bowl'|''>('');
  const [createdMatch, setCreatedMatch] = useState<Match | null>(null);

  function resetForm() {
    setTeam1Id('');
    setTeam2Id('');
    setCustomTeam1Name('');
    setCustomTeam2Name('');
    setIsCreatingTeam1(myTeams.length < 2);
    setIsCreatingTeam2(myTeams.length < 2);
    setVenue('');
    setDate(new Date().toISOString().slice(0, 10));
    setTime('10:00');
    setTotalOvers(10);
    setTossWinner('');
    setTossDecision('');
    setFormStep(1);
    setShowForm(false);
    setCreatedMatch(null);
  }

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault();
    const t1 = isCreatingTeam1 ? customTeam1Name.trim() : team1Id;
    const t2 = isCreatingTeam2 ? customTeam2Name.trim() : team2Id;
    if (!t1 || !t2 || t1 === t2) return;
    setFormStep(2);
  }

  function handleCreateMatch() {
    const t1 = isCreatingTeam1 ? customTeam1Name.trim() : team1Id;
    const t2 = isCreatingTeam2 ? customTeam2Name.trim() : team2Id;
    if (!t1 || !t2 || t1 === t2 || !tossWinner || !tossDecision) return;

    let finalTeam1Id = team1Id;
    let finalTeam2Id = team2Id;

    if (isCreatingTeam1) {
      const newId = uid();
      dispatch({
        type: 'ADD_TEAM',
        payload: {
          id: newId,
          name: customTeam1Name.trim(),
          shortName: customTeam1Name.trim().slice(0, 4).toUpperCase(),
          color: TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)],
          players: [],
          ownerId: currentUserId,
        }
      });
      finalTeam1Id = newId;
    }

    if (isCreatingTeam2) {
      const newId = uid();
      dispatch({
        type: 'ADD_TEAM',
        payload: {
          id: newId,
          name: customTeam2Name.trim(),
          shortName: customTeam2Name.trim().slice(0, 4).toUpperCase(),
          color: TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)],
          players: [],
          ownerId: currentUserId,
        }
      });
      finalTeam2Id = newId;
    }

    let finalTossWinner = tossWinner;
    if (tossWinner === 'team1') {
      finalTossWinner = finalTeam1Id;
    } else if (tossWinner === 'team2') {
      finalTossWinner = finalTeam2Id;
    }

    const newMatch: Match = {
      id: uid(),
      viewerCode: generateOTP(),
      adminCode: generateOTP(),
      team1Id: finalTeam1Id,
      team2Id: finalTeam2Id,
      venue: venue.trim() || 'Local Ground',
      date,
      time,
      totalOvers,
      toss: {
        winnerId: finalTossWinner,
        decision: tossDecision as 'bat' | 'bowl',
      },
      innings: [],
      isComplete: false,
      result: '',
      ownerId: currentUserId,
    };

    dispatch({ type: 'ADD_MATCH', payload: newMatch });
    setCreatedMatch(newMatch);
  }

  // Categorize matches
  const upcomingMatches = matches
    .filter(m => !m.isComplete && m.innings.length === 0)
    .sort((a, b) => {
      const tA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const tB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return tA - tB;
    });

  const liveMatches = matches.filter(m => !m.isComplete && m.innings.length > 0);
  const completedMatches = matches.filter(m => m.isComplete);

  const showUpcoming = filter === 'all' || filter === 'upcoming';
  const showLive = filter === 'all' || filter === 'live';
  const showCompleted = filter === 'all' || filter === 'completed';

  return (
    <div className="space-y-6">
      {/* Header with Add Match Button (for all or upcoming views) */}
      {!showForm && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 font-medium">
            {filter === 'upcoming' && `${upcomingMatches.length} upcoming ${upcomingMatches.length === 1 ? 'fixture' : 'fixtures'}`}
            {filter === 'live' && `${liveMatches.length} live ${liveMatches.length === 1 ? 'match' : 'matches'}`}
            {filter === 'completed' && `${completedMatches.length} completed ${completedMatches.length === 1 ? 'match' : 'matches'}`}
            {filter === 'all' && `${matches.length} total matches`}
          </p>
        </div>
      )}

      {/* Match Creation Modal / Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleNextStep}
            className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200">
                {createdMatch ? 'Match Created Successfully' : formStep === 1 ? 'New Match Details' : 'Match Toss'}
              </h3>
              <button type="button" onClick={resetForm} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {createdMatch ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                    <Check className="w-4 h-4 text-cyan-400" /> Match Setup Complete!
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-slate-500 text-[9px] font-sans font-bold uppercase tracking-wider mb-1">Viewer Code</div>
                      <div className="text-cyan-400 font-bold text-sm tracking-wider">{createdMatch.viewerCode}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-slate-500 text-[9px] font-sans font-bold uppercase tracking-wider mb-1">Scorer Code</div>
                      <div className="text-amber-400 font-bold text-sm tracking-wider">{createdMatch.adminCode}</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Give the Scorer Code to the person scoring the match. They can enter it in the search box to start scoring.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={resetForm} className="px-4 py-2 text-sm bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors">
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const mId = createdMatch.id;
                      resetForm();
                      onScoreMatch(mId);
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-colors shadow-lg shadow-cyan-900/30"
                  >
                    Start Scoring <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </motion.div>
            ) : formStep === 1 ? (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-slate-400 font-medium">Team 1</label>
                      {myTeams.length >= 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingTeam1(!isCreatingTeam1);
                            setTeam1Id('');
                            setCustomTeam1Name('');
                          }}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          {isCreatingTeam1 ? 'Select Existing' : 'Create Custom'}
                        </button>
                      )}
                    </div>
                    {isCreatingTeam1 ? (
                      <input
                        type="text"
                        placeholder="Type Team 1 name..."
                        value={customTeam1Name}
                        onChange={e => setCustomTeam1Name(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-semibold"
                        required
                      />
                    ) : (
                      <select
                        value={team1Id}
                        onChange={e => setTeam1Id(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-semibold"
                        required
                      >
                        <option value="">Select team...</option>
                        {myTeams.filter(t => t.id !== team2Id).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-slate-400 font-medium">Team 2</label>
                      {myTeams.length >= 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingTeam2(!isCreatingTeam2);
                            setTeam2Id('');
                            setCustomTeam2Name('');
                          }}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          {isCreatingTeam2 ? 'Select Existing' : 'Create Custom'}
                        </button>
                      )}
                    </div>
                    {isCreatingTeam2 ? (
                      <input
                        type="text"
                        placeholder="Type Team 2 name..."
                        value={customTeam2Name}
                        onChange={e => setCustomTeam2Name(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-semibold"
                        required
                      />
                    ) : (
                      <select
                        value={team2Id}
                        onChange={e => setTeam2Id(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-semibold"
                        required
                      >
                        <option value="">Select team...</option>
                        {myTeams.filter(t => t.id !== team1Id).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Venue</label>
                    <input
                      value={venue}
                      onChange={e => setVenue(e.target.value)}
                      placeholder="e.g. Local Ground"
                      className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Time</label>
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Total Overs</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={totalOvers}
                    onChange={e => setTotalOvers(Number(e.target.value))}
                    className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-colors shadow-lg shadow-cyan-900/30"
                  >
                    Next: Toss →
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-800/50">
                  <p className="text-center text-sm font-medium text-slate-300 mb-3">Who won the toss?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTossWinner(isCreatingTeam1 ? 'team1' : team1Id)}
                      className={`py-3 rounded-xl border transition-all truncate px-2 ${
                        tossWinner === (isCreatingTeam1 ? 'team1' : team1Id)
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {isCreatingTeam1 ? customTeam1Name || 'Team 1' : allTeams.find(x => x.id === team1Id)?.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTossWinner(isCreatingTeam2 ? 'team2' : team2Id)}
                      className={`py-3 rounded-xl border transition-all truncate px-2 ${
                        tossWinner === (isCreatingTeam2 ? 'team2' : team2Id)
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {isCreatingTeam2 ? customTeam2Name || 'Team 2' : allTeams.find(x => x.id === team2Id)?.name}
                    </button>
                  </div>

                  <AnimatePresence>
                    {tossWinner && (
                      <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="pt-5 overflow-hidden">
                        <p className="text-center text-sm font-medium text-slate-300 mb-3">What did they choose?</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            type="button"
                            onClick={() => setTossDecision('bat')}
                            className={`py-3 flex flex-col items-center justify-center border rounded-xl transition-all ${tossDecision === 'bat' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                          >
                            <span className="text-lg mb-1">🏏</span> Bat
                          </button>
                          <button 
                            type="button"
                            onClick={() => setTossDecision('bowl')}
                            className={`py-3 flex flex-col items-center justify-center border rounded-xl transition-all ${tossDecision === 'bowl' ? 'bg-violet-500/20 border-violet-500 text-violet-400 font-bold shadow-[0_0_10px_rgba(139,92,246,0.2)]' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                          >
                            <span className="text-lg mb-1">🎯</span> Bowl
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <button type="button" onClick={() => setFormStep(1)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateMatch}
                    disabled={!tossWinner || !tossDecision}
                    className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-bold rounded-lg hover:shadow-lg hover:shadow-cyan-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    <Check className="w-4 h-4" /> Create Match
                  </button>
                </div>
              </motion.div>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      {/* UPCOMING MATCHES SECTION */}
      {showUpcoming && (
        <div>
          {filter === 'all' && upcomingMatches.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Upcoming Matches ({upcomingMatches.length})</h3>
            </div>
          )}
          
          {upcomingMatches.length > 0 ? (
            <div className="space-y-3">
              {upcomingMatches.map(match => {
                const t1 = allTeams.find(t => t.id === match.team1Id);
                const t2 = allTeams.find(t => t.id === match.team2Id);
                return (
                  <motion.div
                    key={match.id}
                    layout
                    className="bg-slate-900/70 border border-slate-800/80 hover:border-cyan-500/30 transition-all rounded-2xl p-5 shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                        <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md font-bold text-[10px] uppercase tracking-wider">
                          Upcoming
                        </span>
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-cyan-400" /> {match.date} {match.time ? `at ${match.time}` : ''}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400" /> {match.venue}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" /> {match.totalOvers} ov
                        </span>
                      </div>
                      {match.leagueCode && (
                        <span className="px-2.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-bold rounded-md flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          {(leagues || []).find((l: League) => l.code === match.leagueCode)?.name || match.leagueCode}
                        </span>
                      )}
                    </div>

                    {/* Teams Card */}
                    <div className="flex items-center justify-between gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800/60 mb-3.5">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md" style={{ background: t1?.color || '#06b6d4' }}>
                          {t1?.shortName?.slice(0, 3) || 'T1'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{t1?.name || 'Team 1'}</p>
                          <p className="text-[11px] text-slate-400">{t1?.players?.length || 0} Players</p>
                        </div>
                      </div>

                      <span className="px-3 py-1 bg-slate-800/80 text-slate-400 text-xs font-black rounded-lg uppercase tracking-wider">
                        VS
                      </span>

                      <div className="flex items-center gap-3 flex-1 justify-end text-right">
                        <div>
                          <p className="text-sm font-bold text-white">{t2?.name || 'Team 2'}</p>
                          <p className="text-[11px] text-slate-400">{t2?.players?.length || 0} Players</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md" style={{ background: t2?.color || '#3b82f6' }}>
                          {t2?.shortName?.slice(0, 3) || 'T2'}
                        </div>
                      </div>
                    </div>

                    {/* Toss notice if completed */}
                    {match.toss && (
                      <div className="mb-3 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-center gap-1.5 font-medium">
                        <span>🪙</span> {allTeams.find(t => t.id === match.toss!.winnerId)?.name} won toss & elected to {match.toss!.decision}
                      </div>
                    )}

                    {/* Codes & Actions */}
                    {(() => {
                      const isMatchCreator = Boolean(isGlobalAdmin || (currentUserId && (match.ownerId === currentUserId || !match.ownerId)));
                      return (
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex gap-2 text-xs">
                            <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-400">
                              Viewer: <span className="font-mono text-cyan-400 font-bold">{match.viewerCode}</span>
                            </span>
                            {isMatchCreator && (
                              <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-400">
                                Scorer: <span className="font-mono text-amber-400 font-bold">{match.adminCode}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 ml-auto">
                            {isMatchCreator && (
                              <>
                                <button
                                  onClick={() => dispatch({ type: 'DELETE_MATCH', payload: match.id })}
                                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800/60 rounded-xl transition-colors"
                                  title="Delete Match"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onScoreMatch(match.id)}
                                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-900/30 transition-all"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" /> Start Scoring
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                );
              })}
            </div>
          ) : filter === 'upcoming' ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center space-y-4">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">No Upcoming Matches</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Create a new fixture with a scheduled date and time to see it here.
                </p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-900/30 hover:from-cyan-400 hover:to-blue-500 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Schedule Match
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* LIVE MATCHES SECTION */}
      {showLive && (
        <div>
          {filter === 'all' && liveMatches.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">In Progress ({liveMatches.length})</h3>
            </div>
          )}

          {liveMatches.length > 0 ? (
            <div className="space-y-3">
              {liveMatches.map(match => {
                const t1 = allTeams.find(t => t.id === match.team1Id);
                const t2 = allTeams.find(t => t.id === match.team2Id);
                return (
                  <motion.div
                    key={match.id}
                    layout
                    className="bg-slate-900/70 border border-cyan-500/20 rounded-2xl p-4 shadow-lg shadow-cyan-950/20"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                        <MapPin className="w-3 h-3 text-cyan-400" /> {match.venue}
                        <span className="mx-1">•</span>
                        <Calendar className="w-3 h-3 text-cyan-400" /> {match.date} {match.time ? `at ${match.time}` : ''}
                        <span className="mx-1">•</span>
                        <Clock className="w-3 h-3 text-cyan-400" /> {match.totalOvers} ov
                      </div>
                      {(() => { const lg = match.leagueCode && (leagues || []).find((l: League) => l.code === match.leagueCode); return lg ? (
                        <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-bold rounded-md flex items-center gap-1">
                          <Trophy className="w-3 h-3" />{lg.name}
                        </span>
                      ) : null; })()}
                    </div>

                    <div className="flex items-center gap-6 mb-3">
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md" style={{ background: t1?.color || '#06b6d4' }}>
                          {t1?.shortName.slice(0, 3) || '??'}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-300">{t1?.name || 'Unknown'}</p>
                          <p className="text-lg font-extrabold text-white">
                            {getInningsForTeam(match, match.team1Id)
                              ? <>{getInningsTotal(match, match.team1Id)}/{getInningsWickets(match, match.team1Id)}<span className="text-xs text-slate-500 font-medium ml-1">({getInningsOvers(match, match.team1Id)} ov)</span></>
                              : <span className="text-slate-600">—</span>}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-600 font-bold">VS</span>
                      <div className="flex-1 flex items-center gap-3 justify-end text-right">
                        <div>
                          <p className="text-xs font-semibold text-slate-300">{t2?.name || 'Unknown'}</p>
                          <p className="text-lg font-extrabold text-white">
                            {getInningsForTeam(match, match.team2Id)
                              ? <>{getInningsTotal(match, match.team2Id)}/{getInningsWickets(match, match.team2Id)}<span className="text-xs text-slate-500 font-medium ml-1">({getInningsOvers(match, match.team2Id)} ov)</span></>
                              : <span className="text-slate-600">—</span>}
                          </p>
                        </div>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md" style={{ background: t2?.color || '#3b82f6' }}>
                          {t2?.shortName.slice(0, 3) || '??'}
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const isMatchCreator = Boolean(isGlobalAdmin || (currentUserId && (match.ownerId === currentUserId || !match.ownerId)));
                      return (
                        <div className="flex gap-2">
                          {isMatchCreator && (
                            <button
                              onClick={() => onScoreMatch(match.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all shadow-md shadow-cyan-900/30"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" /> Resume Scoring
                            </button>
                          )}
                          {onViewStats && (
                            <button
                              onClick={() => onViewStats(match.id)}
                              className={`${isMatchCreator ? 'px-4' : 'flex-1'} py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors border border-slate-700 flex items-center justify-center gap-1.5`}
                            >
                              <BarChart3 className="w-3.5 h-3.5" /> Stats
                            </button>
                          )}
                          {isMatchCreator && (
                            <button
                              onClick={() => dispatch({ type: 'DELETE_MATCH', payload: match.id })}
                              className="px-3 py-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800/50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </motion.div>
                );
              })}
            </div>
          ) : filter === 'live' ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center space-y-4">
              <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto text-cyan-400">
                <Play className="w-7 h-7 fill-current opacity-60" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">No Live Matches Right Now</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Select an upcoming match or create a new match to start scoring.
                </p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-900/30 hover:from-cyan-400 hover:to-blue-500 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Create Match
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* COMPLETED MATCHES SECTION */}
      {showCompleted && (
        <div>
          {filter === 'all' && completedMatches.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Completed Matches ({completedMatches.length})</h3>
            </div>
          )}
          
          {completedMatches.length > 0 ? (
            <div className="space-y-3">
              {completedMatches.slice().reverse().map(match => {
                const t1 = allTeams.find(t => t.id === match.team1Id);
                const t2 = allTeams.find(t => t.id === match.team2Id);
                const hasT1Inn = !!getInningsForTeam(match, match.team1Id);
                const hasT2Inn = !!getInningsForTeam(match, match.team2Id);
                const isT1Winner = match.winnerId === match.team1Id;
                const isT2Winner = match.winnerId === match.team2Id;

                return (
                  <motion.div
                    key={match.id}
                    layout
                    className="bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/30 rounded-2xl p-4 sm:p-5 group transition-all shadow-lg"
                  >
                    {/* Top match header */}
                    <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                        <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3" /> Finished
                        </span>
                        <span>{match.date} {match.time ? `at ${match.time}` : ''}</span>
                        <span className="text-slate-600">•</span>
                        <span>{match.venue}</span>
                        <span className="text-slate-600">•</span>
                        <span>{match.totalOvers} ov</span>
                      </div>

                      {match.result && (
                        <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold rounded-xl flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" /> {match.result}
                        </span>
                      )}
                    </div>

                    {/* Teams and Scores row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
                      {/* Team 1 */}
                      <div className={`p-3 rounded-xl border flex items-center justify-between ${
                        isT1Winner ? 'bg-cyan-950/20 border-cyan-500/40' : 'bg-slate-950/50 border-slate-800/80'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-md"
                            style={{ backgroundColor: t1?.color || '#06b6d4' }}
                          >
                            {t1?.shortName?.slice(0, 3).toUpperCase() || 'T1'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white flex items-center gap-1.5">
                              {t1?.name || 'Team 1'}
                              {isT1Winner && <span className="text-xs text-amber-400">★</span>}
                            </p>
                            <p className="text-[11px] text-slate-400">{t1?.shortName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-extrabold text-white">
                            {hasT1Inn ? `${getInningsTotal(match, match.team1Id)}/${getInningsWickets(match, match.team1Id)}` : '—'}
                          </p>
                          {hasT1Inn && <p className="text-[11px] text-slate-400">({getInningsOvers(match, match.team1Id)} ov)</p>}
                        </div>
                      </div>

                      {/* Team 2 */}
                      <div className={`p-3 rounded-xl border flex items-center justify-between ${
                        isT2Winner ? 'bg-cyan-950/20 border-cyan-500/40' : 'bg-slate-950/50 border-slate-800/80'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-md"
                            style={{ backgroundColor: t2?.color || '#3b82f6' }}
                          >
                            {t2?.shortName?.slice(0, 3).toUpperCase() || 'T2'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white flex items-center gap-1.5">
                              {t2?.name || 'Team 2'}
                              {isT2Winner && <span className="text-xs text-amber-400">★</span>}
                            </p>
                            <p className="text-[11px] text-slate-400">{t2?.shortName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-extrabold text-white">
                            {hasT2Inn ? `${getInningsTotal(match, match.team2Id)}/${getInningsWickets(match, match.team2Id)}` : '—'}
                          </p>
                          {hasT2Inn && <p className="text-[11px] text-slate-400">({getInningsOvers(match, match.team2Id)} ov)</p>}
                        </div>
                      </div>
                    </div>

                    {/* Footer with View Stats button */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/70">
                      <span className="text-xs text-slate-400">
                        Viewer Code: <span className="font-mono text-cyan-400 font-bold">{match.viewerCode}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {(isGlobalAdmin || (currentUserId && (match.ownerId === currentUserId || !match.ownerId))) && (
                          <button
                            onClick={() => dispatch({ type: 'DELETE_MATCH', payload: match.id })}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800/50 rounded-xl transition-all"
                            title="Delete Match"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onViewStats?.(match.id)}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          View Match Stats
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : filter === 'completed' ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center space-y-4">
              <div className="w-14 h-14 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <Trophy className="w-7 h-7 opacity-60" />
              </div>
              <h3 className="text-base font-bold text-white">No Finished Matches Yet</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Completed matches and their full statistics and history will appear here.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* OVERALL EMPTY STATE */}
      {matches.length === 0 && !showForm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-16 h-16 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Swords className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-300 mb-1">No matches yet</p>
          <p className="text-xs text-slate-500 mb-4">Create a match to get started.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-900/30 hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Create Match
          </button>
        </motion.div>
      )}
    </div>
  );
}
