import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Zap, ArrowLeft } from 'lucide-react';
import { useApp } from '../store';

interface Props {
  currentUserId?: string;
}

interface BatStats {
  playerId: string; playerName: string; teamName: string; teamColor: string;
  innings: number; runs: number; balls: number; hs: number; notOuts: number;
  fours: number; sixes: number; fifties: number; hundreds: number; catches: number;
}
interface BowlStats {
  playerId: string; playerName: string; teamName: string; teamColor: string;
  overs: number; wickets: number; runs: number; maidens: number;
  bestWkts: number; bestRuns: number; threeFers: number; fiveFers: number;
}

type Tab = 'batting' | 'bowling';

export default function StatsView({ currentUserId }: Props) {
  const { state } = useApp();
  const { teams, matches } = state;
  const [tab, setTab] = useState<Tab>('batting');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const batMap: Record<string, BatStats> = {};
  const bowlMap: Record<string, BowlStats> = {};

  for (const match of matches) {
    for (const inn of match.innings) {
      for (const bat of inn.battingEntries) {
        const team = teams.find((t) => t.players.some((p) => p.id === bat.playerId));
        if (!team) continue;
        const player = team.players.find((p) => p.id === bat.playerId);
        if (!player) continue;
        if (!batMap[bat.playerId]) {
          batMap[bat.playerId] = { playerId: bat.playerId, playerName: player.name, teamName: team.name, teamColor: team.color, innings: 0, runs: 0, balls: 0, hs: 0, notOuts: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, catches: 0 };
        }
        const b = batMap[bat.playerId];
        b.innings++; b.runs += bat.runs; b.balls += bat.balls; b.fours += bat.fours; b.sixes += bat.sixes;
        if (bat.isNotOut) b.notOuts++;
        if (bat.runs > b.hs) b.hs = bat.runs;
        if (bat.runs >= 100) b.hundreds++;
        else if (bat.runs >= 50) b.fifties++;
      }
      // Count catches
      for (const bat of inn.battingEntries) {
        if (bat.fielderId && bat.dismissalType === 'caught') {
          const team = teams.find((t) => t.players.some((p) => p.id === bat.fielderId));
          if (team && batMap[bat.fielderId!]) batMap[bat.fielderId!].catches++;
        }
      }
      for (const bowl of inn.bowlingEntries) {
        const team = teams.find((t) => t.players.some((p) => p.id === bowl.playerId));
        if (!team) continue;
        const player = team.players.find((p) => p.id === bowl.playerId);
        if (!player) continue;
        if (!bowlMap[bowl.playerId]) {
          bowlMap[bowl.playerId] = { playerId: bowl.playerId, playerName: player.name, teamName: team.name, teamColor: team.color, overs: 0, wickets: 0, runs: 0, maidens: 0, bestWkts: 0, bestRuns: 999, threeFers: 0, fiveFers: 0 };
        }
        const bw = bowlMap[bowl.playerId];
        bw.overs += bowl.overs; bw.wickets += bowl.wickets; bw.runs += bowl.runsConceded; bw.maidens += bowl.maidens;
        if (bowl.wickets >= 5) bw.fiveFers++; else if (bowl.wickets >= 3) bw.threeFers++;
        if (bowl.wickets > bw.bestWkts || (bowl.wickets === bw.bestWkts && bowl.runsConceded < bw.bestRuns)) {
          bw.bestWkts = bowl.wickets; bw.bestRuns = bowl.runsConceded;
        }
      }
    }
  }

  const batters = Object.values(batMap).sort((a, b) => b.runs - a.runs);
  const bowlers = Object.values(bowlMap).filter((b) => b.wickets > 0).sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);

  function avg(runs: number, outs: number) { return outs === 0 ? (runs > 0 ? 'N/O' : '-') : (runs / outs).toFixed(1); }
  function sr(runs: number, balls: number) { return balls === 0 ? '-' : ((runs / balls) * 100).toFixed(1); }
  function econ(runs: number, overs: number) { return overs === 0 ? '-' : (runs / overs).toFixed(2); }
  function bowlAvg(runs: number, wkts: number) { return wkts === 0 ? '-' : (runs / wkts).toFixed(1); }

  // ── Detail view ──
  if (selectedId) {
    const bat = batMap[selectedId];
    const bowl = bowlMap[selectedId];
    const playerName = bat?.playerName || bowl?.playerName || 'Player';
    const teamName = bat?.teamName || bowl?.teamName || '';
    const teamColor = bat?.teamColor || bowl?.teamColor || '#64748b';
    return (
      <div className="space-y-5">
        <button onClick={() => setSelectedId(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Statistics
        </button>
        <div className="bg-slate-900/70 border border-slate-800/60 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ background: teamColor + '33', border: '2px solid ' + teamColor + '66' }}>
            {playerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{playerName}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-3 h-3 rounded-full" style={{ background: teamColor }} />
              <span className="text-sm text-slate-300">{teamName}</span>
            </div>
          </div>
        </div>

        {bat && bat.innings > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Batting Stats
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[
                { label: 'Innings', value: bat.innings },
                { label: 'Runs', value: bat.runs, hi: true },
                { label: 'Highest Score', value: bat.notOuts > 0 ? bat.hs + '*' : bat.hs },
                { label: 'Average', value: avg(bat.runs, bat.innings - bat.notOuts) },
                { label: 'Strike Rate', value: sr(bat.runs, bat.balls) },
                { label: 'Not Outs', value: bat.notOuts },
                { label: 'Hundreds (100s)', value: bat.hundreds },
                { label: 'Fifties (50s)', value: bat.fifties },
                { label: 'Fours (4s)', value: bat.fours },
                { label: 'Sixes (6s)', value: bat.sixes },
                { label: 'Balls Faced', value: bat.balls },
                { label: 'Catches', value: bat.catches },
              ].map((item) => (
                <div key={item.label} className={'rounded-xl p-3 text-center border ' + (item.hi ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-800/50 border-slate-700/30')}>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 mb-0.5 leading-tight">{item.label}</p>
                  <p className={'text-lg font-bold ' + (item.hi ? 'text-amber-400' : 'text-white')}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {bowl && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-cyan-400" /> Bowling Stats
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[
                { label: 'Overs', value: bowl.overs },
                { label: 'Wickets', value: bowl.wickets, hi: true },
                { label: 'Runs Given', value: bowl.runs },
                { label: 'Economy', value: econ(bowl.runs, bowl.overs) },
                { label: 'Average', value: bowlAvg(bowl.runs, bowl.wickets) },
                { label: 'Maidens', value: bowl.maidens },
                { label: 'Best Bowling', value: bowl.bestWkts > 0 ? bowl.bestWkts + '/' + (bowl.bestRuns === 999 ? '-' : bowl.bestRuns) : '-' },
                { label: '3-Wicket Hauls', value: bowl.threeFers },
                { label: '5-Wicket Hauls', value: bowl.fiveFers },
              ].map((item) => (
                <div key={item.label} className={'rounded-xl p-3 text-center border ' + (item.hi ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-slate-800/50 border-slate-700/30')}>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 mb-0.5 leading-tight">{item.label}</p>
                  <p className={'text-lg font-bold ' + (item.hi ? 'text-cyan-400' : 'text-white')}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Leaderboard ──
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" /> Statistics
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Tap any player to see their full performance stats</p>
      </div>
      <div className="flex bg-slate-900/60 border border-slate-800/50 rounded-xl p-1 gap-1">
        <button onClick={() => setTab('batting')}
          className={'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-all ' + (tab === 'batting' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow' : 'text-slate-400 hover:text-white')}>
          <TrendingUp className="w-3.5 h-3.5" /> Batting
        </button>
        <button onClick={() => setTab('bowling')}
          className={'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-all ' + (tab === 'bowling' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow' : 'text-slate-400 hover:text-white')}>
          <Zap className="w-3.5 h-3.5" /> Bowling
        </button>
      </div>

      {tab === 'batting' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {batters.length === 0 ? (
            <div className="text-center py-16"><BarChart3 className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-sm text-slate-500">No batting data yet. Play some matches!</p></div>
          ) : (
            <>
              <div className="grid grid-cols-[2rem_1fr_3rem_3rem_3rem_3.5rem_3.5rem] gap-x-2 px-3 pb-1">
                <span /><span className="text-[10px] text-slate-600 font-bold uppercase">Player</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Inn</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Runs</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">HS</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Avg</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">SR</span>
              </div>
              {batters.map((b, i) => (
                <motion.button key={b.playerId} onClick={() => setSelectedId(b.playerId)}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className={'w-full grid grid-cols-[2rem_1fr_3rem_3rem_3rem_3.5rem_3.5rem] gap-x-2 items-center px-3 py-3 rounded-xl border text-left cursor-pointer hover:border-cyan-500/40 transition-all group ' + (i === 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-900/50 border-slate-800/40')}>
                  <span className={'text-xs font-bold text-center ' + (i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-slate-600')}>{i + 1}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.teamColor }} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">{b.playerName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{b.teamName}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 text-right">{b.innings}</span>
                  <span className={'text-sm font-bold text-right ' + (i === 0 ? 'text-amber-400' : 'text-white')}>{b.runs}</span>
                  <span className="text-xs text-slate-300 text-right">{b.notOuts > 0 ? b.hs + '*' : b.hs}</span>
                  <span className="text-xs text-slate-300 text-right">{avg(b.runs, b.innings - b.notOuts)}</span>
                  <span className="text-xs text-slate-300 text-right">{sr(b.runs, b.balls)}</span>
                </motion.button>
              ))}
            </>
          )}
        </motion.div>
      )}

      {tab === 'bowling' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {bowlers.length === 0 ? (
            <div className="text-center py-16"><BarChart3 className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-sm text-slate-500">No bowling data yet. Play some matches!</p></div>
          ) : (
            <>
              <div className="grid grid-cols-[2rem_1fr_3rem_3rem_3.5rem_3.5rem_3.5rem] gap-x-2 px-3 pb-1">
                <span /><span className="text-[10px] text-slate-600 font-bold uppercase">Player</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Ovrs</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Wkts</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Runs</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Econ</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Best</span>
              </div>
              {bowlers.map((b, i) => (
                <motion.button key={b.playerId} onClick={() => setSelectedId(b.playerId)}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className={'w-full grid grid-cols-[2rem_1fr_3rem_3rem_3.5rem_3.5rem_3.5rem] gap-x-2 items-center px-3 py-3 rounded-xl border text-left cursor-pointer hover:border-cyan-500/40 transition-all group ' + (i === 0 ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-slate-900/50 border-slate-800/40')}>
                  <span className={'text-xs font-bold text-center ' + (i === 0 ? 'text-cyan-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-slate-600')}>{i + 1}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.teamColor }} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">{b.playerName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{b.teamName}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 text-right">{b.overs}</span>
                  <span className={'text-sm font-bold text-right ' + (i === 0 ? 'text-cyan-400' : 'text-white')}>{b.wickets}</span>
                  <span className="text-xs text-slate-300 text-right">{b.runs}</span>
                  <span className="text-xs text-slate-300 text-right">{econ(b.runs, b.overs)}</span>
                  <span className="text-xs text-slate-300 text-right">{b.bestWkts > 0 ? b.bestWkts + '/' + (b.bestRuns === 999 ? '-' : b.bestRuns) : '-'}</span>
                </motion.button>
              ))}
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
