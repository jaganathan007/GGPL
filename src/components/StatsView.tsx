import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Zap } from 'lucide-react';
import { useApp } from '../store';

interface Props {
  currentUserId?: string;
}

interface BatStats {
  playerId: string;
  playerName: string;
  teamName: string;
  teamColor: string;
  innings: number;
  runs: number;
  balls: number;
  hs: number;
  notOuts: number;
  fours: number;
  sixes: number;
}

interface BowlStats {
  playerId: string;
  playerName: string;
  teamName: string;
  teamColor: string;
  overs: number;
  wickets: number;
  runs: number;
  maidens: number;
  bestWickets: number;
  bestRuns: number;
}

type Tab = 'batting' | 'bowling';

export default function StatsView({ currentUserId }: Props) {
  const { state } = useApp();
  const { teams, matches } = state;
  const [tab, setTab] = useState<Tab>('batting');

  // Build per-player aggregate stats
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
          batMap[bat.playerId] = { playerId: bat.playerId, playerName: player.name, teamName: team.name, teamColor: team.color, innings: 0, runs: 0, balls: 0, hs: 0, notOuts: 0, fours: 0, sixes: 0 };
        }
        const b = batMap[bat.playerId];
        b.innings++;
        b.runs += bat.runs;
        b.balls += bat.balls;
        b.fours += bat.fours;
        b.sixes += bat.sixes;
        if (bat.isNotOut) b.notOuts++;
        if (bat.runs > b.hs) b.hs = bat.runs;
      }

      for (const bowl of inn.bowlingEntries) {
        const team = teams.find((t) => t.players.some((p) => p.id === bowl.playerId));
        if (!team) continue;
        const player = team.players.find((p) => p.id === bowl.playerId);
        if (!player) continue;

        if (!bowlMap[bowl.playerId]) {
          bowlMap[bowl.playerId] = { playerId: bowl.playerId, playerName: player.name, teamName: team.name, teamColor: team.color, overs: 0, wickets: 0, runs: 0, maidens: 0, bestWickets: 0, bestRuns: 999 };
        }
        const bw = bowlMap[bowl.playerId];
        bw.overs += bowl.overs;
        bw.wickets += bowl.wickets;
        bw.runs += bowl.runsConceded;
        bw.maidens += bowl.maidens;
        if (bowl.wickets > bw.bestWickets || (bowl.wickets === bw.bestWickets && bowl.runsConceded < bw.bestRuns)) {
          bw.bestWickets = bowl.wickets;
          bw.bestRuns = bowl.runsConceded;
        }
      }
    }
  }

  const batters = Object.values(batMap).sort((a, b) => b.runs - a.runs);
  const bowlers = Object.values(bowlMap).filter((b) => b.wickets > 0).sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);

  function avg(runs: number, outs: number) {
    if (outs === 0) return runs > 0 ? '∞' : '-';
    return (runs / outs).toFixed(1);
  }
  function sr(runs: number, balls: number) {
    if (balls === 0) return '-';
    return ((runs / balls) * 100).toFixed(1);
  }
  function econ(runs: number, overs: number) {
    if (overs === 0) return '-';
    return (runs / overs).toFixed(1);
  }
  function bowlAvg(runs: number, wkts: number) {
    if (wkts === 0) return '-';
    return (runs / wkts).toFixed(1);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" /> Statistics
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Player performance leaderboard across all matches</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900/60 border border-slate-800/50 rounded-xl p-1 gap-1">
        <button
          onClick={() => setTab('batting')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'batting' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Batting
        </button>
        <button
          onClick={() => setTab('bowling')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'bowling' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          <Zap className="w-3.5 h-3.5" /> Bowling
        </button>
      </div>

      {tab === 'batting' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {batters.length === 0 ? (
            <div className="text-center py-16">
              <BarChart3 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No batting data available yet. Play some matches!</p>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="grid grid-cols-[2rem_1fr_3rem_3rem_3rem_3.5rem_3.5rem] gap-x-2 px-3 pb-1">
                <span />
                <span className="text-[10px] text-slate-600 font-bold uppercase">Player</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Inn</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Runs</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">HS</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Avg</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">SR</span>
              </div>
              {batters.map((b, i) => (
                <motion.div
                  key={b.playerId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`grid grid-cols-[2rem_1fr_3rem_3rem_3rem_3.5rem_3.5rem] gap-x-2 items-center px-3 py-3 rounded-xl border ${i === 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-900/50 border-slate-800/40'}`}
                >
                  <span className={`text-xs font-bold text-center ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-slate-600'}`}>
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.teamColor }} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate leading-tight">{b.playerName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{b.teamName}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 text-right">{b.innings}</span>
                  <span className={`text-sm font-bold text-right ${i === 0 ? 'text-amber-400' : 'text-white'}`}>{b.runs}</span>
                  <span className="text-xs text-slate-300 text-right">{b.hs}{b.notOuts > 0 ? '*' : ''}</span>
                  <span className="text-xs text-slate-300 text-right">{avg(b.runs, b.innings - b.notOuts)}</span>
                  <span className="text-xs text-slate-300 text-right">{sr(b.runs, b.balls)}</span>
                </motion.div>
              ))}
            </>
          )}
        </motion.div>
      )}

      {tab === 'bowling' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {bowlers.length === 0 ? (
            <div className="text-center py-16">
              <BarChart3 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No bowling data available yet. Play some matches!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[2rem_1fr_3rem_3rem_3.5rem_3.5rem_3.5rem] gap-x-2 px-3 pb-1">
                <span />
                <span className="text-[10px] text-slate-600 font-bold uppercase">Player</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Ovrs</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Wkts</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Runs</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Econ</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase text-right">Best</span>
              </div>
              {bowlers.map((b, i) => (
                <motion.div
                  key={b.playerId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`grid grid-cols-[2rem_1fr_3rem_3rem_3.5rem_3.5rem_3.5rem] gap-x-2 items-center px-3 py-3 rounded-xl border ${i === 0 ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-slate-900/50 border-slate-800/40'}`}
                >
                  <span className={`text-xs font-bold text-center ${i === 0 ? 'text-cyan-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-slate-600'}`}>
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.teamColor }} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate leading-tight">{b.playerName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{b.teamName}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 text-right">{b.overs}</span>
                  <span className={`text-sm font-bold text-right ${i === 0 ? 'text-cyan-400' : 'text-white'}`}>{b.wickets}</span>
                  <span className="text-xs text-slate-300 text-right">{b.runs}</span>
                  <span className="text-xs text-slate-300 text-right">{econ(b.runs, b.overs)}</span>
                  <span className="text-xs text-slate-300 text-right">
                    {b.bestWickets > 0 ? `${b.bestWickets}/${b.bestRuns === 999 ? '-' : b.bestRuns}` : '-'}
                  </span>
                </motion.div>
              ))}
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
