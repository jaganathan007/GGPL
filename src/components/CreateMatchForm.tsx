import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Play, ChevronLeft } from 'lucide-react';
import { useApp } from '../store';
import type { Match, Team } from '../types';

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
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Teams
  const [team1Mode, setTeam1Mode] = useState<'existing'|'new'>('existing');
  const [team1Id, setTeam1Id] = useState('');
  const [newTeam1Name, setNewTeam1Name] = useState('');
  const [newTeam1Short, setNewTeam1Short] = useState('');

  const [team2Mode, setTeam2Mode] = useState<'existing'|'new'>('existing');
  const [team2Id, setTeam2Id] = useState('');
  const [newTeam2Name, setNewTeam2Name] = useState('');
  const [newTeam2Short, setNewTeam2Short] = useState('');

  // Step 2: Players (we will store newly added player strings here)
  const [addedPlayers1, setAddedPlayers1] = useState<string[]>([]);
  const [addedPlayers2, setAddedPlayers2] = useState<string[]>([]);
  const [p1Input, setP1Input] = useState('');
  const [p2Input, setP2Input] = useState('');

  // Step 3: Match Details
  const [venue, setVenue] = useState('');
  const [leagueCode, setLeagueCode] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalOvers, setTotalOvers] = useState(10);

  // Step 4: Toss
  const [tossWinner, setTossWinner] = useState<'team1'|'team2'|''>('');
  const [tossDecision, setTossDecision] = useState<'bat'|'bowl'|''>('');

  function handleNext(target: 1|2|3|4) {
    if (target === 2) {
      if (team1Mode === 'existing' && !team1Id) return;
      if (team1Mode === 'new' && (!newTeam1Name || !newTeam1Short)) return;
      if (team2Mode === 'existing' && !team2Id) return;
      if (team2Mode === 'new' && (!newTeam2Name || !newTeam2Short)) return;
      if (team1Mode === 'existing' && team2Mode === 'existing' && team1Id === team2Id) return;
    }
    setFormStep(target);
  }

  function handleFinish() {
    let finalTeam1Id = team1Id;
    let finalTeam2Id = team2Id;

    // Process Team 1
    if (team1Mode === 'new') {
      finalTeam1Id = uid();
      const newTeam: Team = {
        id: finalTeam1Id,
        name: newTeam1Name.trim(),
        shortName: newTeam1Short.trim().toUpperCase().slice(0, 3),
        color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
        players: addedPlayers1.map(name => ({
          id: uid(), name, role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium'
        }))
      };
      dispatch({ type: 'ADD_TEAM', payload: newTeam });
    } else if (addedPlayers1.length > 0) {
      const existing = teams.find(t => t.id === team1Id);
      if (existing) {
        const updated = {
          ...existing,
          players: [
            ...existing.players,
            ...addedPlayers1.map(name => ({ id: uid(), name, role: 'Batsman' as const, battingStyle: 'Right-hand bat' as const, bowlingStyle: 'Right-arm medium' as const }))
          ]
        };
        dispatch({ type: 'UPDATE_TEAM', payload: updated });
      }
    }

    // Process Team 2
    if (team2Mode === 'new') {
      finalTeam2Id = uid();
      const newTeam: Team = {
        id: finalTeam2Id,
        name: newTeam2Name.trim(),
        shortName: newTeam2Short.trim().toUpperCase().slice(0, 3),
        color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
        players: addedPlayers2.map(name => ({
          id: uid(), name, role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium'
        }))
      };
      dispatch({ type: 'ADD_TEAM', payload: newTeam });
    } else if (addedPlayers2.length > 0) {
      const existing = teams.find(t => t.id === team2Id);
      if (existing) {
        const updated = {
          ...existing,
          players: [
            ...existing.players,
            ...addedPlayers2.map(name => ({ id: uid(), name, role: 'Batsman' as const, battingStyle: 'Right-hand bat' as const, bowlingStyle: 'Right-arm medium' as const }))
          ]
        };
        dispatch({ type: 'UPDATE_TEAM', payload: updated });
      }
    }

    const match: Match = {
      id: uid(),
      viewerCode: generateOTP(),
      adminCode: generateOTP(),
      leagueCode: leagueCode.trim().toUpperCase() || undefined,
      team1Id: finalTeam1Id,
      team2Id: finalTeam2Id,
      toss: { 
        winnerId: tossWinner === 'team1' ? finalTeam1Id : finalTeam2Id, 
        decision: tossDecision as 'bat'|'bowl' 
      },
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

  const getTeamName = (num: 1|2) => {
    if (num === 1) {
      return team1Mode === 'new' ? (newTeam1Name || 'Team 1') : (teams.find(t => t.id === team1Id)?.name || 'Team 1');
    } else {
      return team2Mode === 'new' ? (newTeam2Name || 'Team 2') : (teams.find(t => t.id === team2Id)?.name || 'Team 2');
    }
  };

  const getExistingPlayers = (num: 1|2) => {
    if (num === 1 && team1Mode === 'existing') return teams.find(t => t.id === team1Id)?.players || [];
    if (num === 2 && team2Mode === 'existing') return teams.find(t => t.id === team2Id)?.players || [];
    return [];
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl backdrop-blur-md overflow-hidden flex flex-col min-h-[500px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          {formStep > 1 && (
            <button onClick={() => handleNext((formStep - 1) as any)} className="p-1 hover:bg-slate-800 rounded-md transition-colors mr-1">
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
          )}
          {formStep === 1 && 'Step 1: Choose Teams'}
          {formStep === 2 && 'Step 2: Player Details'}
          {formStep === 3 && 'Step 3: Match Details'}
          {formStep === 4 && 'Step 4: Toss'}
        </h3>
        <button type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-300 transition-colors bg-slate-800/50 p-1.5 rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {/* STEP 1: TEAMS */}
          {formStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
              
              {/* TEAM 1 */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Team 1</label>
                  <div className="flex gap-2 bg-slate-900 p-1 rounded-lg">
                    <button type="button" onClick={() => setTeam1Mode('existing')} className={`text-[10px] px-2 py-1 rounded font-bold transition-all ${team1Mode === 'existing' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Existing</button>
                    <button type="button" onClick={() => setTeam1Mode('new')} className={`text-[10px] px-2 py-1 rounded font-bold transition-all ${team1Mode === 'new' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>New</button>
                  </div>
                </div>
                {team1Mode === 'existing' ? (
                  <select value={team1Id} onChange={e => setTeam1Id(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                    <option value="">Select team...</option>
                    {teams.map(t => <option key={t.id} value={t.id} disabled={t.id === team2Id}>{t.name}</option>)}
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input placeholder="Full Name (e.g. India)" value={newTeam1Name} onChange={e=>setNewTeam1Name(e.target.value)} className="flex-[2] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                    <input placeholder="Short" value={newTeam1Short} onChange={e=>setNewTeam1Short(e.target.value)} maxLength={4} className="flex-[1] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                )}
              </div>

              {/* TEAM 2 */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Team 2</label>
                  <div className="flex gap-2 bg-slate-900 p-1 rounded-lg">
                    <button type="button" onClick={() => setTeam2Mode('existing')} className={`text-[10px] px-2 py-1 rounded font-bold transition-all ${team2Mode === 'existing' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Existing</button>
                    <button type="button" onClick={() => setTeam2Mode('new')} className={`text-[10px] px-2 py-1 rounded font-bold transition-all ${team2Mode === 'new' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>New</button>
                  </div>
                </div>
                {team2Mode === 'existing' ? (
                  <select value={team2Id} onChange={e => setTeam2Id(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                    <option value="">Select team...</option>
                    {teams.map(t => <option key={t.id} value={t.id} disabled={t.id === team1Id}>{t.name}</option>)}
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input placeholder="Full Name (e.g. Australia)" value={newTeam2Name} onChange={e=>setNewTeam2Name(e.target.value)} className="flex-[2] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                    <input placeholder="Short" value={newTeam2Short} onChange={e=>setNewTeam2Short(e.target.value)} maxLength={4} className="flex-[1] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleNext(2)}
                disabled={(team1Mode==='existing'&&!team1Id) || (team1Mode==='new'&&(!newTeam1Name||!newTeam1Short)) || (team2Mode==='existing'&&!team2Id) || (team2Mode==='new'&&(!newTeam2Name||!newTeam2Short)) || (team1Mode==='existing'&&team2Mode==='existing'&&team1Id===team2Id)}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                Next: Players <Play className="w-4 h-4 fill-current" />
              </button>
            </motion.div>
          )}

          {/* STEP 2: PLAYERS */}
          {formStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <p className="text-xs text-slate-400">Add players to your teams. Existing players are shown in gray, new players in green.</p>
              
              {/* TEAM 1 PLAYERS */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                <label className="block text-xs text-emerald-400 font-bold uppercase tracking-wider mb-3">{getTeamName(1)}</label>
                <div className="flex gap-2 mb-3">
                  <input placeholder="Player name..." value={p1Input} onChange={e=>setP1Input(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if(p1Input.trim()) { setAddedPlayers1([...addedPlayers1, p1Input.trim()]); setP1Input(''); }}}} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  <button type="button" onClick={() => { if(p1Input.trim()) { setAddedPlayers1([...addedPlayers1, p1Input.trim()]); setP1Input(''); }}} className="px-3 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {getExistingPlayers(1).map(p => (
                    <span key={p.id} className="inline-flex items-center px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-md">{p.name}</span>
                  ))}
                  {addedPlayers1.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-md border border-emerald-500/30">
                      {p} <button type="button" onClick={() => setAddedPlayers1(addedPlayers1.filter((_, idx) => idx !== i))} className="hover:text-emerald-200 ml-1"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  {getExistingPlayers(1).length === 0 && addedPlayers1.length === 0 && <span className="text-xs text-slate-500 italic">No players yet</span>}
                </div>
              </div>

              {/* TEAM 2 PLAYERS */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                <label className="block text-xs text-emerald-400 font-bold uppercase tracking-wider mb-3">{getTeamName(2)}</label>
                <div className="flex gap-2 mb-3">
                  <input placeholder="Player name..." value={p2Input} onChange={e=>setP2Input(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if(p2Input.trim()) { setAddedPlayers2([...addedPlayers2, p2Input.trim()]); setP2Input(''); }}}} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  <button type="button" onClick={() => { if(p2Input.trim()) { setAddedPlayers2([...addedPlayers2, p2Input.trim()]); setP2Input(''); }}} className="px-3 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {getExistingPlayers(2).map(p => (
                    <span key={p.id} className="inline-flex items-center px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-md">{p.name}</span>
                  ))}
                  {addedPlayers2.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-md border border-emerald-500/30">
                      {p} <button type="button" onClick={() => setAddedPlayers2(addedPlayers2.filter((_, idx) => idx !== i))} className="hover:text-emerald-200 ml-1"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  {getExistingPlayers(2).length === 0 && addedPlayers2.length === 0 && <span className="text-xs text-slate-500 italic">No players yet</span>}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleNext(3)}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-colors"
              >
                Next: Match Details <Play className="w-4 h-4 fill-current" />
              </button>
            </motion.div>
          )}

          {/* STEP 3: MATCH DETAILS */}
          {formStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Venue</label>
                <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Local Ground" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">League Code (Optional)</label>
                <input value={leagueCode} onChange={e => setLeagueCode(e.target.value)} placeholder="e.g. SUMMER26" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:border-emerald-500/50 uppercase transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Total Overs</label>
                  <input type="number" min={1} max={50} value={totalOvers} onChange={e => setTotalOvers(Number(e.target.value))} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleNext(4)}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-colors mt-6"
              >
                Next: Toss <Play className="w-4 h-4 fill-current" />
              </button>
            </motion.div>
          )}

          {/* STEP 4: TOSS */}
          {formStep === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800">
                <p className="text-center text-sm font-semibold text-slate-300 mb-4">Who won the toss?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTossWinner('team1')}
                    className={`py-3.5 rounded-xl border-2 transition-all ${tossWinner === 'team1' ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    {getTeamName(1)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTossWinner('team2')}
                    className={`py-3.5 rounded-xl border-2 transition-all ${tossWinner === 'team2' ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    {getTeamName(2)}
                  </button>
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
              
              <button
                type="button"
                onClick={handleFinish}
                disabled={!tossWinner || !tossDecision}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-5 h-5" /> Finish & Get Codes
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
