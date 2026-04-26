import { useState, useCallback } from 'react';

export interface BatterState {
  playerId: string; name: string; runs: number; balls: number;
  fours: number; sixes: number; isOut: boolean;
}
export interface BowlerState {
  playerId: string; name: string; overs: number; maidens: number;
  runs: number; wickets: number; currentOverBalls: number; currentOverRuns: number;
}
export interface BallEvent {
  type: 'run'|'wicket'|'wide'|'noball'; runs: number;
  striker: string; bowler: string; over: number; ball: number;
}
export type Phase = 'setup'|'batting'|'wicket'|'over_end'|'innings_end'|'target_reached';

export interface EngineSnapshot {
  phase: Phase; batters: BatterState[]; strikerIdx: number; nonStrikerIdx: number;
  bowlers: BowlerState[]; currentBowlerIdx: number; extras: number;
  ballLog: BallEvent[]; oversCompleted: number; ballsInOver: number;
  lastBowlerIdx: number; maxOvers: number; target: number | null;
}

export function useScoringEngine() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [batters, setBatters] = useState<BatterState[]>([]);
  const [strikerIdx, setStrikerIdx] = useState(0);
  const [nonStrikerIdx, setNonStrikerIdx] = useState(1);
  const [bowlers, setBowlers] = useState<BowlerState[]>([]);
  const [currentBowlerIdx, setCurrentBowlerIdx] = useState(0);
  const [extras, setExtras] = useState(0);
  const [ballLog, setBallLog] = useState<BallEvent[]>([]);
  const [oversCompleted, setOversCompleted] = useState(0);
  const [ballsInOver, setBallsInOver] = useState(0);
  const [lastBowlerIdx, setLastBowlerIdx] = useState(-1);
  const [maxOvers, setMaxOvers] = useState(20);
  const [target, setTarget] = useState<number | null>(null);

  const totalRuns = batters.reduce((s,b)=>s+b.runs,0) + extras;
  const totalWickets = batters.filter(b=>b.isOut).length;
  const totalOvers = oversCompleted + ballsInOver/10;

  const striker = batters[strikerIdx];
  const nonStriker = batters[nonStrikerIdx];
  const currentBowler = bowlers[currentBowlerIdx];

  const startInnings = useCallback((s: {id:string,name:string}, ns: {id:string,name:string}, b: {id:string,name:string}, totalOversLimit: number, inningsTarget: number | null) => {
    setBatters([
      {playerId:s.id,name:s.name,runs:0,balls:0,fours:0,sixes:0,isOut:false},
      {playerId:ns.id,name:ns.name,runs:0,balls:0,fours:0,sixes:0,isOut:false},
    ]);
    setStrikerIdx(0); setNonStrikerIdx(1);
    setBowlers([{playerId:b.id,name:b.name,overs:0,maidens:0,runs:0,wickets:0,currentOverBalls:0,currentOverRuns:0}]);
    setCurrentBowlerIdx(0); setPhase('batting');
    setExtras(0); setBallLog([]); setOversCompleted(0); setBallsInOver(0);
    setMaxOvers(totalOversLimit); setTarget(inningsTarget);
  }, []);

  const rotateStrike = useCallback(() => {
    setStrikerIdx(prev => {
      const tmp = prev;
      setNonStrikerIdx(tmp);
      return nonStrikerIdx;
    });
  }, [nonStrikerIdx]);

  const handleRun = useCallback((r: number) => {
    if (phase !== 'batting') return;
    // Compute new total inline (before async state updates)
    const newTotal = totalRuns + r;

    setBatters(prev => prev.map((b,i) => i===strikerIdx
      ? {...b, runs:b.runs+r, balls:b.balls+1, fours:r===4?b.fours+1:b.fours, sixes:r===6?b.sixes+1:b.sixes}
      : b));
    setBowlers(prev => prev.map((b,i) => i===currentBowlerIdx
      ? {...b, runs:b.runs+r, currentOverBalls:b.currentOverBalls+1, currentOverRuns:b.currentOverRuns+r}
      : b));
    const newBalls = ballsInOver + 1;
    setBallsInOver(newBalls);
    setBallLog(prev => [...prev, {type:'run',runs:r,striker:striker?.name||'',bowler:currentBowler?.name||'',over:oversCompleted,ball:newBalls}]);
    if (r%2===1) rotateStrike();

    // Check if target reached (2nd innings)
    if (target !== null && newTotal >= target) {
      if (newBalls === 6) {
        setBowlers(prev => prev.map((b,i) => i===currentBowlerIdx ? {...b, overs:b.overs+1, currentOverBalls:0, currentOverRuns:0} : b));
        setOversCompleted(prev=>prev+1); setBallsInOver(0);
      }
      setPhase('target_reached');
      return;
    }

    if (newBalls === 6) {
      setBowlers(prev => prev.map((b,i) => {
        if (i!==currentBowlerIdx) return b;
        const newOvers = b.overs+1;
        const isMaiden = b.currentOverRuns+r === 0;
        return {...b, overs:newOvers, maidens:isMaiden?b.maidens+1:b.maidens, currentOverBalls:0, currentOverRuns:0};
      }));
      const newOversCompleted = oversCompleted + 1;
      setOversCompleted(newOversCompleted); setBallsInOver(0);
      setLastBowlerIdx(currentBowlerIdx);
      rotateStrike();
      if (newOversCompleted >= maxOvers) {
        setPhase('innings_end');
      } else {
        setPhase('over_end');
      }
    }
  }, [phase,strikerIdx,currentBowlerIdx,ballsInOver,oversCompleted,maxOvers,target,totalRuns,striker,currentBowler,rotateStrike]);

  const handleWicket = useCallback(() => {
    if (phase !== 'batting') return;
    setBatters(prev => prev.map((b,i) => i===strikerIdx ? {...b, isOut:true, balls:b.balls+1} : b));
    setBowlers(prev => prev.map((b,i) => i===currentBowlerIdx
      ? {...b, wickets:b.wickets+1, runs:b.runs, currentOverBalls:b.currentOverBalls+1}
      : b));
    const newBalls = ballsInOver + 1;
    setBallsInOver(newBalls);
    setBallLog(prev => [...prev, {type:'wicket',runs:0,striker:striker?.name||'',bowler:currentBowler?.name||'',over:oversCompleted,ball:newBalls}]);
    if (newBalls === 6) {
      setBowlers(prev => prev.map((b,i) => i===currentBowlerIdx ? {...b, overs:b.overs+1, currentOverBalls:0, currentOverRuns:0} : b));
      const newOversCompleted = oversCompleted + 1;
      setOversCompleted(newOversCompleted); setBallsInOver(0);
      setLastBowlerIdx(currentBowlerIdx);
      if (newOversCompleted >= maxOvers) {
        setPhase('innings_end');
        return;
      }
    }
    setPhase('wicket');
  }, [phase,strikerIdx,currentBowlerIdx,ballsInOver,oversCompleted,maxOvers,striker,currentBowler]);

  const handleWide = useCallback(() => {
    if (phase !== 'batting') return;
    const newTotal = totalRuns + 1;
    setExtras(prev=>prev+1);
    setBowlers(prev => prev.map((b,i) => i===currentBowlerIdx ? {...b, runs:b.runs+1, currentOverRuns:b.currentOverRuns+1} : b));
    setBallLog(prev => [...prev, {type:'wide',runs:1,striker:'',bowler:currentBowler?.name||'',over:oversCompleted,ball:ballsInOver}]);
    if (target !== null && newTotal >= target) { setPhase('target_reached'); }
  }, [phase,currentBowlerIdx,currentBowler,oversCompleted,ballsInOver,target,totalRuns]);

  const handleNoBall = useCallback(() => {
    if (phase !== 'batting') return;
    const newTotal = totalRuns + 1;
    setExtras(prev=>prev+1);
    setBowlers(prev => prev.map((b,i) => i===currentBowlerIdx ? {...b, runs:b.runs+1, currentOverRuns:b.currentOverRuns+1} : b));
    setBallLog(prev => [...prev, {type:'noball',runs:1,striker:'',bowler:currentBowler?.name||'',over:oversCompleted,ball:ballsInOver}]);
    if (target !== null && newTotal >= target) { setPhase('target_reached'); }
  }, [phase,currentBowlerIdx,currentBowler,oversCompleted,ballsInOver,target,totalRuns]);

  const selectNewBatter = useCallback((p: {id:string,name:string}) => {
    const newBatter: BatterState = {playerId:p.id,name:p.name,runs:0,balls:0,fours:0,sixes:0,isOut:false};
    setBatters(prev => {
      const next = [...prev, newBatter];
      setStrikerIdx(next.length - 1);
      return next;
    });
    if (oversCompleted >= maxOvers) {
      setPhase('innings_end');
    } else if (ballsInOver === 0 && oversCompleted > 0 && batters.filter(b=>!b.isOut).length > 0) {
      setPhase('over_end');
    } else {
      setPhase('batting');
    }
  }, [ballsInOver, oversCompleted, maxOvers, batters]);

  const selectNewBowler = useCallback((p: {id:string,name:string}) => {
    const existingIdx = bowlers.findIndex(b => b.playerId === p.id);
    if (existingIdx >= 0) {
      setCurrentBowlerIdx(existingIdx);
    } else {
      setBowlers(prev => {
        const next = [...prev, {playerId:p.id,name:p.name,overs:0,maidens:0,runs:0,wickets:0,currentOverBalls:0,currentOverRuns:0}];
        setCurrentBowlerIdx(next.length - 1);
        return next;
      });
    }
    setPhase('batting');
  }, [bowlers]);

  const endInnings = useCallback(() => { setPhase('innings_end'); }, []);

  // ── Persistence ──
  const exportState = useCallback((): EngineSnapshot => ({
    phase, batters, strikerIdx, nonStrikerIdx, bowlers, currentBowlerIdx,
    extras, ballLog, oversCompleted, ballsInOver, lastBowlerIdx, maxOvers, target,
  }), [phase, batters, strikerIdx, nonStrikerIdx, bowlers, currentBowlerIdx, extras, ballLog, oversCompleted, ballsInOver, lastBowlerIdx, maxOvers, target]);

  const importState = useCallback((s: EngineSnapshot) => {
    setPhase(s.phase); setBatters(s.batters); setStrikerIdx(s.strikerIdx);
    setNonStrikerIdx(s.nonStrikerIdx); setBowlers(s.bowlers);
    setCurrentBowlerIdx(s.currentBowlerIdx); setExtras(s.extras);
    setBallLog(s.ballLog); setOversCompleted(s.oversCompleted);
    setBallsInOver(s.ballsInOver); setLastBowlerIdx(s.lastBowlerIdx);
    setMaxOvers(s.maxOvers); setTarget(s.target);
  }, []);

  return {
    phase, batters, striker, nonStriker, strikerIdx, nonStrikerIdx,
    bowlers, currentBowler, currentBowlerIdx, lastBowlerIdx,
    extras, totalRuns, totalWickets, totalOvers, oversCompleted, ballsInOver, ballLog, maxOvers, target,
    startInnings, handleRun, handleWicket, handleWide, handleNoBall,
    selectNewBatter, selectNewBowler, endInnings, setPhase,
    exportState, importState,
  };
}
