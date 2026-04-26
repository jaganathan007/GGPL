import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Play } from 'lucide-react';
import { useApp } from '../store';
import type { Match } from '../types';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface CreateMatchFormProps {
  onCancel: () => void;
  onCreated: (match: Match) => void;
}

export default function CreateMatchForm({ onCancel, onCreated }: CreateMatchFormProps) {
  const { state, dispatch } = useApp();
  const { teams } = state;
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  
  // New Team State
  const [isCreatingTeam, setIsCreatingTeam] = useState<1 | 2 | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShort, setNewTeamShort] = useState('');
  const [newTeamPlayers, setNewTeamPlayers] = useState<string[]>([]);
  const [currentPlayerName, setCurrentPlayerName] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalOvers, setTotalOvers] = useState(10);
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<'bat'|'bowl'|''>('');

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault();
    if (!team1Id || !team2Id || team1Id === team2Id) return;
    setFormStep(2);
  }

  function handleAddPlayer(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!currentPlayerName.trim()) return;
    setNewTeamPlayers([...newTeamPlayers, currentPlayerName.trim()]);
    setCurrentPlayerName('');
  }

  function handleRemovePlayer(index: number) {
    setNewTeamPlayers(newTeamPlayers.filter((_, i) => i !== index));
  }

  function handleCreateTeam(slot: 1 | 2) {
    if (!newTeamName.trim() || !newTeamShort.trim()) return;

    const players = newTeamPlayers.map(name => ({
      id: uid(),
      name,
      role: 'Batsman' as const,
      battingStyle: 'Right-hand bat' as const,
      bowlingStyle: 'Right-arm medium' as const,
    }));

    const team = {
      id: uid(),
      name: newTeamName.trim(),
      shortName: newTeamShort.trim().toUpperCase().slice(0, 3),
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
      players
    };
    dispatch({ type: 'ADD_TEAM', payload: team });
    if (slot === 1) setTeam1Id(team.id);
    if (slot === 2) setTeam2Id(team.id);
    setIsCreatingTeam(null);
    setNewTeamName('');
    setNewTeamShort('');
    setNewTeamPlayers([]);
    setCurrentPlayerName('');
  }

  function handleCreateMatch() {
    if (!team1Id || !team2Id || team1Id === team2Id || !tossWinner || !tossDecision) return;
    const match: Match = {
      id: uid(),
      viewerCode: generateOTP(),
      adminCode: generateOTP(),
      team1Id,
      team2Id,
      toss: { winnerId: tossWinner, decision: tossDecision as 'bat'|'bowl' },
      date,
      venue: venue.trim() || 'TBD',
      totalOvers,
      innings: [],
      isComplete: false,
      result: '',
    };
    dispatch({ type: 'ADD_MATCH', payload: match });
    onCreated(match);
  }

  // Remove the restriction so they can create teams if there are < 2
  /*
  if (teams.length < 2) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center max-w-md mx-auto w-full">
        <p className="text-amber-400 mb-4 font-medium">You need at least 2 teams created by the Global Admin before you can create a match.</p>
        <button onClick={onCancel} className="px-6 py-2 bg-slate-800 text-white rounded-lg">Close</button>
      </div>
    );
  }
  */

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl backdrop-blur-md overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">
          {formStep === 1 ? 'New Match Details' : 'Match Toss'}
        </h3>
        <button type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-300 transition-colors bg-slate-800/50 p-1.5 rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {formStep === 1 ? (
          <motion.form key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleNextStep} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Team 1 Selection / Creation */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Team 1</label>
                {isCreatingTeam === 1 ? (
                  <div className="space-y-2 bg-slate-950/50 p-2 rounded-xl border border-emerald-500/30">
                    <input autoFocus placeholder="Team Name" value={newTeamName} onChange={e=>setNewTeamName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white" />
                    <input placeholder="Short (e.g. IND)" value={newTeamShort} onChange={e=>setNewTeamShort(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white" />
                    
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 space-y-2">
                      <div className="flex gap-1">
                        <input 
                          placeholder="Player name..." 
                          value={currentPlayerName} 
                          onChange={e=>setCurrentPlayerName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlayer(); }}}
                          className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white" 
                        />
                        <button type="button" onClick={() => handleAddPlayer()} className="text-xs px-2 bg-slate-700 text-slate-300 rounded font-medium hover:bg-slate-600">Add</button>
                      </div>
                      {newTeamPlayers.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {newTeamPlayers.map((p, i) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded">
                              {p} <button type="button" onClick={() => handleRemovePlayer(i)} className="hover:text-emerald-200"><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <button type="button" onClick={() => setIsCreatingTeam(null)} className="flex-1 text-xs py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700">Cancel</button>
                      <button type="button" onClick={() => handleCreateTeam(1)} className="flex-1 text-xs py-1 bg-emerald-500 text-white rounded font-bold hover:bg-emerald-400">Save Team</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <select
                      value={team1Id}
                      onChange={e => setTeam1Id(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                      required={!isCreatingTeam}
                    >
                      <option value="">Select team...</option>
                      {teams.filter(t => t.id !== team2Id).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => { setIsCreatingTeam(1); setNewTeamName(''); setNewTeamShort(''); setNewTeamPlayers([]); setCurrentPlayerName(''); }} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">+ Create New Team</button>
                  </div>
                )}
              </div>

              {/* Team 2 Selection / Creation */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Team 2</label>
                {isCreatingTeam === 2 ? (
                  <div className="space-y-2 bg-slate-950/50 p-2 rounded-xl border border-emerald-500/30">
                    <input autoFocus placeholder="Team Name" value={newTeamName} onChange={e=>setNewTeamName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white" />
                    <input placeholder="Short (e.g. AUS)" value={newTeamShort} onChange={e=>setNewTeamShort(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white" />
                    
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 space-y-2">
                      <div className="flex gap-1">
                        <input 
                          placeholder="Player name..." 
                          value={currentPlayerName} 
                          onChange={e=>setCurrentPlayerName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlayer(); }}}
                          className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white" 
                        />
                        <button type="button" onClick={() => handleAddPlayer()} className="text-xs px-2 bg-slate-700 text-slate-300 rounded font-medium hover:bg-slate-600">Add</button>
                      </div>
                      {newTeamPlayers.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {newTeamPlayers.map((p, i) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded">
                              {p} <button type="button" onClick={() => handleRemovePlayer(i)} className="hover:text-emerald-200"><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <button type="button" onClick={() => setIsCreatingTeam(null)} className="flex-1 text-xs py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700">Cancel</button>
                      <button type="button" onClick={() => handleCreateTeam(2)} className="flex-1 text-xs py-1 bg-emerald-500 text-white rounded font-bold hover:bg-emerald-400">Save Team</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <select
                      value={team2Id}
                      onChange={e => setTeam2Id(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                      required={!isCreatingTeam}
                    >
                      <option value="">Select team...</option>
                      {teams.filter(t => t.id !== team1Id).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => { setIsCreatingTeam(2); setNewTeamName(''); setNewTeamShort(''); setNewTeamPlayers([]); setCurrentPlayerName(''); }} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">+ Create New Team</button>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Venue</label>
              <input
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Local Ground"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Total Overs</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={totalOvers}
                  onChange={e => setTotalOvers(Number(e.target.value))}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={!team1Id || !team2Id}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Toss <Play className="w-4 h-4 fill-current" />
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800">
              <p className="text-center text-sm font-semibold text-slate-300 mb-4">Who won the toss?</p>
              <div className="grid grid-cols-2 gap-3">
                {[team1Id, team2Id].map(tId => {
                  const t = teams.find(x => x.id === tId);
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => setTossWinner(tId)}
                      className={`py-3.5 rounded-xl border-2 transition-all ${tossWinner === tId ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                    >
                      {t?.name}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {tossWinner && (
                  <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="pt-6 overflow-hidden">
                    <p className="text-center text-sm font-semibold text-slate-300 mb-4">What did they choose?</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button"
                        onClick={() => setTossDecision('bat')}
                        className={`py-4 flex flex-col items-center justify-center border-2 rounded-xl transition-all ${tossDecision === 'bat' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                      >
                        <span className="text-2xl mb-1.5">🏏</span> Bat
                      </button>
                      <button 
                        type="button"
                        onClick={() => setTossDecision('bowl')}
                        className={`py-4 flex flex-col items-center justify-center border-2 rounded-xl transition-all ${tossDecision === 'bowl' ? 'bg-violet-500/20 border-violet-500 text-violet-400 font-bold shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                      >
                        <span className="text-2xl mb-1.5">🎯</span> Bowl
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex gap-3">
              <button type="button" onClick={() => setFormStep(1)} className="px-6 py-3.5 bg-slate-800 text-slate-300 font-semibold rounded-xl hover:bg-slate-700 transition-colors">
                Back
              </button>
              <button
                type="button"
                onClick={handleCreateMatch}
                disabled={!tossWinner || !tossDecision}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-5 h-5" /> Finish & Get Codes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
