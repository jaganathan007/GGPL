import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Target, Zap, CircleDot, PartyPopper } from 'lucide-react';
import { useApp } from '../store';
import { useScoringEngine, type EngineSnapshot } from './useScoringEngine';
import type { Match, Innings } from '../types';

const SCORING_STORAGE_PREFIX = 'ggpl-scoring-';

interface ScoringPersistence {
  engineSnapshot: EngineSnapshot;
  currentInningsIdx: number;
  inningsStarted: boolean;
}

interface Props { matchId: string; onBack: () => void; }

export default function ScoringView({ matchId, onBack }: Props) {
  const { state, dispatch } = useApp();
  const match = state.matches.find(m => m.id === matchId);
  const engine = useScoringEngine();

  // Setup state
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');
  const [inningsStarted, setInningsStarted] = useState(false);
  const [currentInningsIdx, setCurrentInningsIdx] = useState(match?.innings.length === 0 ? 0 : (match?.innings.length || 1) - 1);
  const restoredRef = useRef(false);

  // ── Restore persisted scoring state on mount ──
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const saved = localStorage.getItem(SCORING_STORAGE_PREFIX + matchId);
      if (saved) {
        const data: ScoringPersistence = JSON.parse(saved);
        engine.importState(data.engineSnapshot);
        setCurrentInningsIdx(data.currentInningsIdx);
        setInningsStarted(data.inningsStarted);
      }
    } catch { /* ignore corrupt data */ }
  }, [matchId]);

  // ── Persist scoring state on every engine change ──
  useEffect(() => {
    if (!inningsStarted || engine.phase === 'setup') return;
    const data: ScoringPersistence = {
      engineSnapshot: engine.exportState(),
      currentInningsIdx,
      inningsStarted,
    };
    localStorage.setItem(SCORING_STORAGE_PREFIX + matchId, JSON.stringify(data));
  }, [engine.batters, engine.bowlers, engine.extras, engine.phase, engine.oversCompleted, engine.ballsInOver, currentInningsIdx, inningsStarted, matchId]);

  if (!match) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><p className="text-slate-400">Match not found.</p></div>;

  const team1 = state.teams.find(t => t.id === match.team1Id);
  const team2 = state.teams.find(t => t.id === match.team2Id);
  const isFirstInnings = currentInningsIdx === 0;
  const battingTeam = isFirstInnings ? team1 : team2;
  const bowlingTeam = isFirstInnings ? team2 : team1;
  const firstInnTotal = match.innings[0] ? match.innings[0].battingEntries.reduce((s,e)=>s+e.runs,0) + match.innings[0].extras : 0;
  const target = !isFirstInnings ? firstInnTotal + 1 : null;

  const battedIds = engine.batters.map(b => b.playerId);
  const availableBatters = (battingTeam?.players || []).filter(p => !battedIds.includes(p.id));
  const allBowlers = bowlingTeam?.players || [];

  // Sync engine state to match store
  useEffect(() => {
    if (!inningsStarted || engine.phase === 'setup') return;
    const innings: Innings = {
      battingTeamId: battingTeam?.id || '',
      bowlingTeamId: bowlingTeam?.id || '',
      battingEntries: engine.batters.map(b => ({
        playerId: b.playerId, runs: b.runs, balls: b.balls,
        fours: b.fours, sixes: b.sixes, isNotOut: !b.isOut,
      })),
      bowlingEntries: engine.bowlers.map(b => ({
        playerId: b.playerId, overs: b.overs + (b.currentOverBalls > 0 ? b.currentOverBalls / 10 : 0),
        maidens: b.maidens, runsConceded: b.runs, wickets: b.wickets,
      })),
      extras: engine.extras,
    };
    const newInnings = [...match.innings];
    newInnings[currentInningsIdx] = innings;
    dispatch({ type: 'UPDATE_MATCH', payload: { ...match, innings: newInnings } });
  }, [engine.batters, engine.bowlers, engine.extras, engine.phase]);

  function doStartInnings() {
    const s = battingTeam?.players.find(p => p.id === strikerId);
    const ns = battingTeam?.players.find(p => p.id === nonStrikerId);
    const b = bowlingTeam?.players.find(p => p.id === bowlerId);
    if (!s || !ns || !b) return;
    if (match.innings.length <= currentInningsIdx) {
      const newInn: Innings = { battingTeamId: battingTeam?.id||'', bowlingTeamId: bowlingTeam?.id||'', battingEntries: [], bowlingEntries: [], extras: 0 };
      dispatch({ type: 'UPDATE_MATCH', payload: { ...match, innings: [...match.innings, newInn] } });
    }
    engine.startInnings({ id: s.id, name: s.name }, { id: ns.id, name: ns.name }, { id: b.id, name: b.name }, match.totalOvers, target);
    setInningsStarted(true);
  }

  function handleEndMatch(overridePhase?: string) {
    const inn1 = match.innings[0]; const inn2 = match.innings[1];
    if (!inn1 || !inn2) return;
    const t1Score = inn1.battingEntries.reduce((s,e)=>s+e.runs,0)+inn1.extras;
    const t2Score = engine.totalRuns;
    const t1Name = state.teams.find(t=>t.id===inn1.battingTeamId)?.name||'Team 1';
    const t2Name = state.teams.find(t=>t.id===inn2.battingTeamId)?.name||'Team 2';
    let result = 'Match Tied';
    if (t1Score > t2Score) result = `${t1Name} won by ${t1Score-t2Score} runs`;
    else if (t2Score > t1Score) { const w = engine.batters.filter(b=>!b.isOut).length; result = `${t2Name} won by ${w} wickets`; }
    dispatch({ type: 'UPDATE_MATCH', payload: { ...match, isComplete: true, result } });
    // Clean up persisted scoring state
    localStorage.removeItem(SCORING_STORAGE_PREFIX + matchId);
    onBack();
  }

  function switchTo2ndInnings() {
    setCurrentInningsIdx(1); setInningsStarted(false);
    setStrikerId(''); setNonStrikerId(''); setBowlerId('');
  }

  const runsNeeded = target ? target - engine.totalRuns : null;
  const oversDisplay = `${engine.oversCompleted}.${engine.ballsInOver}`;
  const oversRemaining = match.totalOvers - engine.oversCompleted;

  // ─── SETUP PHASE ───
  if (!inningsStarted || engine.phase === 'setup') {
    return (
      <div className="min-h-screen bg-slate-950">
        <header className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 shadow-lg shadow-emerald-900/30">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={onBack} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
            <div><div className="flex items-center gap-2"><span className="text-sm font-bold text-white">{team1?.shortName}</span><span className="text-[10px] text-emerald-100/50 font-bold">VS</span><span className="text-sm font-bold text-white">{team2?.shortName}</span></div>
            <p className="text-[10px] text-emerald-100/60">{match.venue} • {match.totalOvers} overs</p></div>
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3"><Zap className="w-7 h-7 text-emerald-400"/></div>
            <h2 className="text-lg font-bold text-white">{isFirstInnings ? '1st' : '2nd'} Innings Setup</h2>
            <p className="text-xs text-slate-400 mt-1">{battingTeam?.name} batting • {bowlingTeam?.name} bowling</p>
            {target && <p className="text-xs text-amber-400 mt-1">Target: {target} runs</p>}
          </div>
          <div className="bg-slate-900/70 border border-slate-800/50 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">⚡ Striker</label>
              <select value={strikerId} onChange={e=>setStrikerId(e.target.value)} className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                <option value="">Select striker...</option>
                {(battingTeam?.players||[]).filter(p=>p.id!==nonStrikerId).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">🏏 Non-Striker</label>
              <select value={nonStrikerId} onChange={e=>setNonStrikerId(e.target.value)} className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                <option value="">Select non-striker...</option>
                {(battingTeam?.players||[]).filter(p=>p.id!==strikerId).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">🎯 Opening Bowler</label>
              <select value={bowlerId} onChange={e=>setBowlerId(e.target.value)} className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                <option value="">Select bowler...</option>
                {allBowlers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <button onClick={doStartInnings} disabled={!strikerId||!nonStrikerId||!bowlerId}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 transition-all disabled:opacity-30 disabled:pointer-events-none text-sm">
              Start Innings
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── WICKET MODAL ───
  if (engine.phase === 'wicket') {
    const canContinue = availableBatters.length > 0;
    return (
      <div className="min-h-screen bg-slate-950">
        <ScoringHeader t1={team1} t2={team2} match={match} onBack={onBack} />
        <div className="max-w-lg mx-auto px-4 py-8">
          <ScoreBar batting={battingTeam} total={engine.totalRuns} wickets={engine.totalWickets} overs={oversDisplay} maxOvers={match.totalOvers} target={target} runsNeeded={runsNeeded} />
          <div className="bg-slate-900/80 border border-rose-500/20 rounded-2xl p-5 mt-5 space-y-4">
            <div className="text-center">
              <p className="text-rose-400 text-sm font-bold mb-1">🔴 WICKET!</p>
              <p className="text-xs text-slate-400">{engine.striker?.name} is out</p>
            </div>
            {canContinue ? (
              <>
                <p className="text-xs text-slate-300 font-medium">Select next batter:</p>
                <div className="space-y-2">
                  {availableBatters.map(p => (
                    <button key={p.id} onClick={() => engine.selectNewBatter({id:p.id,name:p.name})}
                      className="w-full py-2.5 px-4 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-white hover:border-emerald-500/50 hover:bg-slate-800 transition-all text-left">
                      {p.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-xs text-slate-400">All out! No more batters available.</p>
                {isFirstInnings ? (
                  <button onClick={switchTo2ndInnings} className="px-6 py-2.5 bg-amber-500/15 text-amber-400 rounded-xl text-sm font-semibold hover:bg-amber-500/25 transition-colors">
                    Start 2nd Innings
                  </button>
                ) : (
                  <button onClick={handleEndMatch} className="px-6 py-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl text-sm font-semibold hover:bg-emerald-500/25 transition-colors">
                    <Trophy className="w-4 h-4 inline mr-1" /> End Match
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── OVER END MODAL ───
  if (engine.phase === 'over_end') {
    return (
      <div className="min-h-screen bg-slate-950">
        <ScoringHeader t1={team1} t2={team2} match={match} onBack={onBack} />
        <div className="max-w-lg mx-auto px-4 py-8">
          <ScoreBar batting={battingTeam} total={engine.totalRuns} wickets={engine.totalWickets} overs={oversDisplay} maxOvers={match.totalOvers} target={target} runsNeeded={runsNeeded} />
          <div className="bg-slate-900/80 border border-violet-500/20 rounded-2xl p-5 mt-5 space-y-4">
            <div className="text-center">
              <p className="text-violet-400 text-sm font-bold mb-1">Over {engine.oversCompleted} Complete</p>
              <p className="text-xs text-slate-400">Select bowler for next over</p>
            </div>
            <div className="space-y-2">
              {allBowlers.filter(p => {
                const lastBowler = engine.bowlers[engine.lastBowlerIdx];
                return !lastBowler || p.id !== lastBowler.playerId;
              }).map(p => (
                <button key={p.id} onClick={() => engine.selectNewBowler({id:p.id,name:p.name})}
                  className="w-full py-2.5 px-4 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-white hover:border-violet-500/50 hover:bg-slate-800 transition-all text-left flex justify-between">
                  <span>{p.name}</span>
                  {engine.bowlers.find(b=>b.playerId===p.id) && <span className="text-[10px] text-slate-500">{engine.bowlers.find(b=>b.playerId===p.id)!.overs} ov</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── TARGET REACHED (2nd innings) ───
  if (engine.phase === 'target_reached') {
    const winningTeam = battingTeam;
    const wicketsRemaining = (battingTeam?.players.length || 11) - engine.totalWickets;
    const ballsRemaining = (match.totalOvers * 6) - (engine.oversCompleted * 6 + engine.ballsInOver);
    return (
      <div className="min-h-screen bg-slate-950">
        <ScoringHeader t1={team1} t2={team2} match={match} onBack={onBack} />
        <div className="max-w-lg mx-auto px-4 py-8 text-center space-y-5">
          <ScoreBar batting={battingTeam} total={engine.totalRuns} wickets={engine.totalWickets} overs={oversDisplay} maxOvers={match.totalOvers} target={target} runsNeeded={runsNeeded} />
          <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',stiffness:200,damping:15}} className="bg-gradient-to-br from-emerald-900/40 to-teal-900/30 border border-emerald-500/30 rounded-2xl p-6 space-y-3">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-extrabold text-emerald-400">🎉 Target Reached!</h2>
            <p className="text-white font-bold text-lg">{winningTeam?.name} won by {wicketsRemaining} wicket{wicketsRemaining !== 1 ? 's' : ''}</p>
            <p className="text-xs text-slate-400">with {ballsRemaining} ball{ballsRemaining !== 1 ? 's' : ''} remaining</p>
            <button onClick={() => handleEndMatch('target_reached')} className="mt-3 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 transition-all text-sm">
              <Trophy className="w-4 h-4 inline mr-1" /> Finish Match
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── INNINGS END ───
  if (engine.phase === 'innings_end') {
    return (
      <div className="min-h-screen bg-slate-950">
        <ScoringHeader t1={team1} t2={team2} match={match} onBack={onBack} />
        <div className="max-w-lg mx-auto px-4 py-8 text-center space-y-4">
          <ScoreBar batting={battingTeam} total={engine.totalRuns} wickets={engine.totalWickets} overs={oversDisplay} maxOvers={match.totalOvers} target={target} runsNeeded={runsNeeded} />
          <p className="text-white font-bold mt-4">Innings Over</p>
          {isFirstInnings ? (
            <button onClick={switchTo2ndInnings} className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-lg text-sm">Start 2nd Innings</button>
          ) : (
            <button onClick={() => handleEndMatch()} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg text-sm"><Trophy className="w-4 h-4 inline mr-1" /> End Match</button>
          )}
        </div>
      </div>
    );
  }

  // ─── MAIN BATTING PHASE ───
  return (
    <div className="min-h-screen bg-slate-950">
      <ScoringHeader t1={team1} t2={team2} match={match} onBack={onBack} />
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <ScoreBar batting={battingTeam} total={engine.totalRuns} wickets={engine.totalWickets} overs={oversDisplay} maxOvers={match.totalOvers} target={target} runsNeeded={runsNeeded} />

        {/* Batters on crease */}
        <div className="grid grid-cols-2 gap-3">
          {[{b:engine.striker,label:'Striker',active:true},{b:engine.nonStriker,label:'Non-Striker',active:false}].map(({b,label,active}) => b && (
            <div key={b.playerId} className={`bg-slate-900/60 border rounded-xl p-3 ${active?'border-emerald-500/30':'border-slate-800/50'}`}>
              <div className="flex items-center gap-2 mb-1">
                {active && <CircleDot className="w-3 h-3 text-emerald-400"/>}
                <p className="text-xs text-slate-400">{label}</p>
              </div>
              <p className="text-sm font-bold text-white">{b.name}</p>
              <div className="flex gap-3 mt-1.5">
                <span className="text-lg font-extrabold text-white">{b.runs}</span>
                <span className="text-[10px] text-slate-500 self-end mb-0.5">({b.balls}b)</span>
                {b.fours > 0 && <span className="text-[10px] text-blue-400 self-end mb-0.5">{b.fours}×4</span>}
                {b.sixes > 0 && <span className="text-[10px] text-amber-400 self-end mb-0.5">{b.sixes}×6</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Current Bowler */}
        {engine.currentBowler && (
          <div className="bg-slate-900/40 border border-slate-800/40 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400"/>
              <span className="text-xs text-slate-400">Bowler:</span>
              <span className="text-sm font-semibold text-white">{engine.currentBowler.name}</span>
            </div>
            <span className="text-xs text-slate-500">{engine.currentBowler.overs}.{engine.currentBowler.currentOverBalls}-{engine.currentBowler.maidens}-{engine.currentBowler.runs}-{engine.currentBowler.wickets}</span>
          </div>
        )}

        {/* This Over */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">This over:</span>
          <div className="flex gap-1.5">
            {engine.ballLog.filter(e => e.over === engine.oversCompleted).map((e,i) => (
              <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                e.type==='wicket'?'bg-rose-500/20 text-rose-400':
                e.type==='wide'?'bg-amber-500/20 text-amber-400':
                e.type==='noball'?'bg-orange-500/20 text-orange-400':
                e.runs>=4?'bg-emerald-500/20 text-emerald-400':
                'bg-slate-800 text-slate-300'
              }`}>
                {e.type==='wicket'?'W':e.type==='wide'?'WD':e.type==='noball'?'NB':e.runs}
              </span>
            ))}
            {Array.from({length: Math.max(0, 6 - engine.ballLog.filter(e=>e.over===engine.oversCompleted && (e.type==='run'||e.type==='wicket')).length)}).map((_,i) => (
              <span key={`empty-${i}`} className="w-7 h-7 rounded-full bg-slate-800/40 border border-slate-700/30"/>
            ))}
          </div>
        </div>

        {/* Run Buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {[0,1,2,3].map(r => (
              <button key={r} onClick={()=>engine.handleRun(r)}
                className="py-4 bg-slate-800/80 border border-slate-700/50 rounded-xl text-xl font-bold text-white hover:bg-slate-700/80 hover:border-slate-600 active:scale-95 transition-all">
                {r}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={()=>engine.handleRun(4)} className="py-4 bg-blue-500/15 border border-blue-500/30 rounded-xl text-xl font-bold text-blue-400 hover:bg-blue-500/25 active:scale-95 transition-all">4</button>
            <button onClick={()=>engine.handleRun(5)} className="py-4 bg-slate-800/80 border border-slate-700/50 rounded-xl text-xl font-bold text-white hover:bg-slate-700/80 active:scale-95 transition-all">5</button>
            <button onClick={()=>engine.handleRun(6)} className="py-4 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xl font-bold text-amber-400 hover:bg-amber-500/25 active:scale-95 transition-all">6</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={engine.handleWicket} className="py-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-500/25 active:scale-95 transition-all">WICKET</button>
            <button onClick={engine.handleWide} className="py-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm font-bold text-orange-400 hover:bg-orange-500/20 active:scale-95 transition-all">WIDE</button>
            <button onClick={engine.handleNoBall} className="py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm font-bold text-yellow-400 hover:bg-yellow-500/20 active:scale-95 transition-all">NO BALL</button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isFirstInnings && (
            <button onClick={()=>{ engine.endInnings(); }} className="flex-1 py-2.5 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded-lg hover:bg-amber-500/20 transition-colors">End Innings</button>
          )}
          {!isFirstInnings && (
            <button onClick={handleEndMatch} className="flex-1 py-2.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1"><Trophy className="w-3.5 h-3.5"/>End Match</button>
          )}
        </div>

        {/* Mini Scorecard */}
        <div className="bg-slate-900/40 border border-slate-800/40 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-800/40 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Batting</span>
          </div>
          <div className="divide-y divide-slate-800/30">
            {engine.batters.map(b => (
              <div key={b.playerId} className="px-4 py-1.5 flex items-center justify-between text-xs">
                <span className={`font-medium ${b.isOut?'text-slate-500 line-through':'text-slate-200'}`}>{b.name}{!b.isOut && b.balls > 0 ? ' *' : ''}</span>
                <span className="text-white font-bold">{b.runs}<span className="text-slate-500 font-normal"> ({b.balls})</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──
function ScoringHeader({t1,t2,match,onBack}:{t1:any,t2:any,match:Match,onBack:()=>void}) {
  return (
    <header className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 shadow-lg shadow-emerald-900/30">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"><ArrowLeft className="w-5 h-5"/></button>
        <div><div className="flex items-center gap-2"><span className="text-sm font-bold text-white">{t1?.shortName||'??'}</span><span className="text-[10px] text-emerald-100/50 font-bold">VS</span><span className="text-sm font-bold text-white">{t2?.shortName||'??'}</span></div>
        <p className="text-[10px] text-emerald-100/60">{match.venue} • {match.totalOvers} overs</p></div>
      </div>
    </header>
  );
}

function ScoreBar({batting,total,wickets,overs,maxOvers,target,runsNeeded}:{batting:any,total:number,wickets:number,overs:string,maxOvers:number,target:number|null,runsNeeded:number|null}) {
  return (
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-700/40 rounded-2xl p-4 text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full" style={{background:batting?.color||'#10b981'}}/>
        <p className="text-xs font-semibold text-slate-300">{batting?.name||'?'}</p>
      </div>
      <p className="text-4xl font-extrabold text-white">{total}<span className="text-xl text-slate-500">/{wickets}</span></p>
      <p className="text-sm text-slate-400">{overs} / {maxOvers} overs</p>
      {target && (
        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="flex items-center gap-1 text-xs"><Target className="w-3 h-3 text-amber-400"/><span className="text-amber-400 font-semibold">Target: {target}</span></span>
          <span className="text-slate-600">•</span>
          <span className={`text-xs font-semibold ${runsNeeded!<=0?'text-emerald-400':'text-rose-400'}`}>{runsNeeded!<=0?'Target reached!':`Need ${runsNeeded}`}</span>
        </div>
      )}
    </motion.div>
  );
}
