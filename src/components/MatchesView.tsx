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

function getInningsTotal(match: Match, idx: number): number {
  const inn = match.innings[idx];
  if (!inn) return 0;
  return inn.battingEntries.reduce((s, e) => s + e.runs, 0) + inn.extras;
}

function getInningsWickets(match: Match, idx: number): number {
  const inn = match.innings[idx];
  if (!inn) return 0;
  return inn.battingEntries.filter(e => !e.isNotOut).length;
}

function getInningsOvers(match: Match, idx: number): number {
  const inn = match.innings[idx];
  if (!inn) return 0;
  return inn.bowlingEntries.reduce((s, e) => s + e.overs, 0);
}

interface MatchesViewProps {
  onScoreMatch: (matchId: string) => void;
  onViewStats?: (matchId: string) => void;
  isAdmin: boolean;
  isGlobalAdmin?: boolean;
  currentUserId?: string;
}

const TEAM_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

export default function MatchesView({ onScoreMatch, onViewStats, isAdmin, isGlobalAdmin, currentUserId }: MatchesViewProps) {
  const { state, dispatch } = useApp();
  const { teams, matches, leagues } = state;
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [customTeam1Name, setCustomTeam1Name] = useState('');
  const [customTeam2Name, setCustomTeam2Name] = useState('');
  const [isCreatingTeam1, setIsCreatingTeam1] = useState(teams.length < 2);
  const [isCreatingTeam2, setIsCreatingTeam2] = useState(teams.length < 2);
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalOvers, setTotalOvers] = useState(10);
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<'bat'|'bowl'|''>('');
  const [createdMatch, setCreatedMatch] = useState<Match | null>(null);

  function resetForm() {
    setTeam1Id('');
    setTeam2Id('');
    setCustomTeam1Name('');
    setCustomTeam2Name('');
    setIsCreatingTeam1(teams.length < 2);
    setIsCreatingTeam2(teams.length < 2);
    setVenue('');
    setDate(new Date().toISOString().slice(0, 10));
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
        }
      });
      finalTeam2Id = newId;
    }

    let finalTossWinner = tossWinner;
    if (tossWinner === 'team1') {
      finalTossWinner = finalTeam1Id;
    } else if (tossWinner === 'team2') {
      finalTossWinner = finalTeam2Id;
    } else if (tossWinner === team1Id) {
      finalTossWinner = finalTeam1Id;
    } else if (tossWinner === team2Id) {
      finalTossWinner = finalTeam2Id;
    }

    const match: Match = {
      id: uid(),
      viewerCode: generateOTP(),
      adminCode: generateOTP(),
      team1Id: finalTeam1Id,
      team2Id: finalTeam2Id,
      toss: { winnerId: finalTossWinner, decision: tossDecision as 'bat'|'bowl' },
      date,
      venue: venue.trim() || 'TBD',
      totalOvers,
      innings: [],
      isComplete: false,
      result: '',
      ownerId: currentUserId,
    };
    dispatch({ type: 'ADD_MATCH', payload: match });
    setCreatedMatch(match);
  }

  const liveMatches = matches.filter(m => !m.isComplete);
  const completedMatches = matches.filter(m => m.isComplete);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Matches</h2>
          <p className="text-xs text-slate-400">{matches.length} match{matches.length !== 1 ? 'es' : ''} total</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> New Match
          </button>
        )}
      </div>

      {/* Match Form */}
      <AnimatePresence>
        {showForm && isAdmin && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={(e) => e.preventDefault()}
            className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-5 overflow-hidden"
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
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <Check className="w-4 h-4 text-emerald-400" /> Match Setup Complete!
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-slate-500 text-[9px] font-sans font-bold uppercase tracking-wider mb-1">Viewer Code</div>
                      <div className="text-emerald-400 font-bold text-sm tracking-wider">{createdMatch.viewerCode}</div>
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
                    className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-400 transition-colors"
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
                      {teams.length >= 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingTeam1(!isCreatingTeam1);
                            setTeam1Id('');
                            setCustomTeam1Name('');
                          }}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium"
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
                        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all font-semibold"
                        required
                      />
                    ) : (
                      <select
                        value={team1Id}
                        onChange={e => setTeam1Id(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all font-semibold"
                        required
                      >
                        <option value="">Select team...</option>
                        {teams.filter(t => t.id !== team2Id).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-slate-400 font-medium">Team 2</label>
                      {teams.length >= 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingTeam2(!isCreatingTeam2);
                            setTeam2Id('');
                            setCustomTeam2Name('');
                          }}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium"
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
                        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all font-semibold"
                        required
                      />
                    ) : (
                      <select
                        value={team2Id}
                        onChange={e => setTeam2Id(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all font-semibold"
                        required
                      >
                        <option value="">Select team...</option>
                        {teams.filter(t => t.id !== team1Id).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Venue</label>
                    <input
                      value={venue}
                      onChange={e => setVenue(e.target.value)}
                      placeholder="e.g. Local Ground"
                      className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Total Overs</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={totalOvers}
                      onChange={e => setTotalOvers(Number(e.target.value))}
                      className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={
                      (isCreatingTeam1 ? !customTeam1Name.trim() : !team1Id) ||
                      (isCreatingTeam2 ? !customTeam2Name.trim() : !team2Id) ||
                      (isCreatingTeam1 ? customTeam1Name.trim() : team1Id) === (isCreatingTeam2 ? customTeam2Name.trim() : team2Id)
                    }
                    className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next: Toss <Play className="w-3.5 h-3.5 fill-current" />
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
                      {isCreatingTeam1 ? customTeam1Name || 'Team 1' : teams.find(x => x.id === team1Id)?.name}
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
                      {isCreatingTeam2 ? customTeam2Name || 'Team 2' : teams.find(x => x.id === team2Id)?.name}
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
                            className={`py-3 flex flex-col items-center justify-center border rounded-xl transition-all ${tossDecision === 'bat' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'}`}
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
                    className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-lg hover:shadow-lg hover:shadow-emerald-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    <Check className="w-4 h-4" /> Create Match
                  </button>
                </div>
              </motion.div>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">In Progress</h3>
          </div>
          <div className="space-y-3">
            {liveMatches.map(match => {
              const t1 = teams.find(t => t.id === match.team1Id);
              const t2 = teams.find(t => t.id === match.team2Id);
              return (
                <motion.div
                  key={match.id}
                  layout
                  className="bg-slate-900/60 border border-emerald-500/15 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                      <MapPin className="w-3 h-3" /> {match.venue}
                      <span className="mx-1">•</span>
                      <Calendar className="w-3 h-3" /> {match.date}
                      <span className="mx-1">•</span>
                      <Clock className="w-3 h-3" /> {match.totalOvers} ov
                    </div>
                    {(() => { const lg = match.leagueCode && (leagues || []).find((l: League) => l.code === match.leagueCode); return lg ? (
                      <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <Trophy className="w-3 h-3" />{lg.name}
                      </span>
                    ) : null; })()}
                    {match.toss && (
                      <div className="mt-2 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-400/90 inline-flex items-center gap-1.5 font-medium">
                        <span className="text-xs">🪙</span> {teams.find(t => t.id === match.toss!.winnerId)?.name} elected to {match.toss!.decision}
                      </div>
                    )}
                  </div>
                  {(isGlobalAdmin || currentUserId) && (
                    <div className={`mb-4 flex gap-3 text-xs bg-slate-950/50 p-2 rounded-lg border border-slate-800/60`}>
                      <div className={`flex-1 text-center ${(isGlobalAdmin || (currentUserId && match.ownerId === currentUserId)) ? 'border-r border-slate-800/60' : ''}`}>
                        <p className="text-slate-500 text-[9px] uppercase tracking-widest font-bold mb-0.5">Viewer Code</p>
                        <p className="text-emerald-400 font-mono tracking-wider font-bold">{match.viewerCode}</p>
                      </div>
                      {(isGlobalAdmin || (currentUserId && match.ownerId === currentUserId)) && (
                        <div className="flex-1 text-center">
                          <p className="text-slate-500 text-[9px] uppercase tracking-widest font-bold mb-0.5">Scorer Code</p>
                          <p className="text-amber-400 font-mono tracking-wider font-bold">{match.adminCode}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-6 mb-3">
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: t1?.color || '#10b981' }}>
                        {t1?.shortName.slice(0, 2) || '??'}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-300">{t1?.name || 'Unknown'}</p>
                        <p className="text-lg font-extrabold text-white">
                          {getInningsTotal(match, 0)}/{getInningsWickets(match, 0)}
                          <span className="text-xs text-slate-500 font-medium ml-1">({getInningsOvers(match, 0)} ov)</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-600 font-bold">VS</span>
                    <div className="flex-1 flex items-center gap-3 justify-end text-right">
                      <div>
                        <p className="text-xs font-semibold text-slate-300">{t2?.name || 'Unknown'}</p>
                        <p className="text-lg font-extrabold text-white">
                          {match.innings.length > 1
                            ? <>{getInningsTotal(match, 1)}/{getInningsWickets(match, 1)}<span className="text-xs text-slate-500 font-medium ml-1">({getInningsOvers(match, 1)} ov)</span></>
                            : <span className="text-slate-600">—</span>}
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: t2?.color || '#10b981' }}>
                        {t2?.shortName.slice(0, 2) || '??'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* Resume Scoring - only for match owner or global admin on live matches */}
                    {(isGlobalAdmin || (currentUserId && (match.ownerId === currentUserId || !match.ownerId))) && !match.isComplete && (
                      <button
                        onClick={() => onScoreMatch(match.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500/15 text-emerald-400 text-sm font-semibold rounded-lg hover:bg-emerald-500/25 transition-colors border border-emerald-500/20"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Resume Scoring
                      </button>
                    )}
                    {onViewStats && match.innings.length > 0 && (
                      <button
                        onClick={() => onViewStats(match.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-violet-500/10 text-violet-400 text-sm font-semibold rounded-lg hover:bg-violet-500/20 transition-colors"
                      >
                        <BarChart3 className="w-3.5 h-3.5" /> {isAdmin ? '' : 'View'} Stats
                      </button>
                    )}
                    {(isGlobalAdmin || (currentUserId && (match.ownerId === currentUserId || !match.ownerId))) && (
                      <button
                        onClick={() => dispatch({ type: 'DELETE_MATCH', payload: match.id })}
                        className="px-3 py-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800/50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Matches */}
      {completedMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Completed</h3>
          </div>
          <div className="space-y-2">
            {completedMatches.slice().reverse().map(match => {
              const t1 = teams.find(t => t.id === match.team1Id);
              const t2 = teams.find(t => t.id === match.team2Id);
              return (
                <div
                  key={match.id}
                  className="bg-slate-900/40 border border-slate-800/40 rounded-xl p-3 group hover:border-slate-700/50 transition-all cursor-pointer"
                  onClick={() => onViewStats?.(match.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: t1?.color || '#10b981' }} />
                        <span className="text-xs font-semibold text-slate-300">{t1?.shortName || '??'}</span>
                        <span className="text-sm font-bold text-white">{getInningsTotal(match, 0)}/{getInningsWickets(match, 0)}</span>
                      </div>
                      <span className="text-[10px] text-slate-600">vs</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: t2?.color || '#10b981' }} />
                        <span className="text-xs font-semibold text-slate-300">{t2?.shortName || '??'}</span>
                        <span className="text-sm font-bold text-white">{getInningsTotal(match, 1)}/{getInningsWickets(match, 1)}</span>
                      </div>
                      {(() => { const lg = match.leagueCode && (leagues || []).find((l: League) => l.code === match.leagueCode); return lg ? (
                        <span className="ml-2 px-1.5 py-0.5 bg-amber-500/10 text-amber-400/70 text-[9px] font-bold rounded">{lg.name}</span>
                      ) : null; })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] text-emerald-400/80 font-medium max-w-[160px] text-right truncate hidden sm:block">{match.result}</p>
                      <Eye className="w-3.5 h-3.5 text-slate-600 group-hover:text-violet-400 transition-colors" />
                      {(isGlobalAdmin || (currentUserId && (match.ownerId === currentUserId || !match.ownerId))) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_MATCH', payload: match.id }); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {matches.length === 0 && !showForm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-16 h-16 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Swords className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400 mb-1">No matches yet.</p>
          <p className="text-xs text-slate-500 mb-4">Create a match to start scoring.</p>
        </motion.div>
      )}
    </div>
  );
}
