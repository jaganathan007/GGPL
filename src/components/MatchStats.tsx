import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, MapPin, Calendar, Clock, Award, TrendingUp, Target, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../store';
import type { Match, Team, BattingEntry, BowlingEntry, BallEvent } from '../types';

interface Props {
  matchId: string;
  onBack: () => void;
}

function getTeam(teams: Team[], id: string) {
  return teams.find(t => t.id === id);
}

function getPlayerName(teams: Team[], teamId: string, playerId: string): string {
  const team = getTeam(teams, teamId);
  return team?.players.find(p => p.id === playerId)?.name || 'Unknown';
}

function getDismissalText(entry: BattingEntry, teams: Team[], bowlingTeamId: string): string {
  if (entry.isNotOut) return 'not out';
  if (!entry.dismissalType) return 'out';

  const bowlerName = entry.bowlerId ? getPlayerName(teams, bowlingTeamId, entry.bowlerId) : '';
  const fielderName = entry.fielderId ? getPlayerName(teams, bowlingTeamId, entry.fielderId) : '';

  switch (entry.dismissalType) {
    case 'bowled':
      return `b ${bowlerName}`;
    case 'caught':
      if (entry.fielderId && entry.bowlerId && entry.fielderId === entry.bowlerId) {
        return `c & b ${bowlerName}`;
      }
      return `c ${fielderName || 'fielder'} b ${bowlerName}`;
    case 'lbw':
      return `lbw b ${bowlerName}`;
    case 'stumped':
      return `st ${fielderName || 'keeper'} b ${bowlerName}`;
    case 'runout':
      return fielderName ? `run out (${fielderName})` : 'run out';
    case 'hitwicket':
      return `hit wicket b ${bowlerName}`;
    case 'other':
    default:
      return 'out';
  }
}

function getStrikeRate(runs: number, balls: number): string {
  if (balls === 0) return '0.00';
  return ((runs / balls) * 100).toFixed(1);
}

function getEconomy(runs: number, overs: number): string {
  if (overs === 0) return '0.00';
  const fullOvers = Math.floor(overs);
  const partialBalls = Math.round((overs - fullOvers) * 10);
  const totalBalls = fullOvers * 6 + partialBalls;
  if (totalBalls === 0) return '0.00';
  return ((runs / totalBalls) * 6).toFixed(2);
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

function bestBatter(entries: BattingEntry[]): BattingEntry | undefined {
  return [...entries].sort((a, b) => b.runs - a.runs || a.balls - b.balls)[0];
}

function bestBowler(entries: BowlingEntry[]): BowlingEntry | undefined {
  return [...entries].sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)[0];
}

function getTeamInningsIdx(match: Match, teamId: string, fallback: number): number {
  const idx = match.innings.findIndex(inn => inn.battingTeamId === teamId);
  return idx >= 0 ? idx : fallback;
}

function getBallStyle(ball: BallEvent) {
  if (ball.type === 'wicket') return { bg: 'bg-rose-500', text: 'text-white', label: 'W' };
  if (ball.type === 'wide')   return { bg: 'bg-cyan-500/20 border border-cyan-500/50', text: 'text-cyan-300', label: 'Wd' };
  if (ball.type === 'noball') return { bg: 'bg-orange-500/20 border border-orange-500/50', text: 'text-orange-300', label: 'NB' };
  if (ball.runs === 0)        return { bg: 'bg-slate-700/60', text: 'text-slate-400', label: '•' };
  if (ball.runs === 4)        return { bg: 'bg-blue-500/25 border border-blue-500/40', text: 'text-blue-300 font-bold', label: '4' };
  if (ball.runs === 6)        return { bg: 'bg-amber-500/25 border border-amber-500/40', text: 'text-amber-300 font-bold', label: '6' };
  return { bg: 'bg-slate-600/50', text: 'text-white', label: String(ball.runs) };
}

function getLiveInfo(inn: import('../types').Innings, teams: import('../types').Team[]): {
  strikerName: string | null;
  nonStrikerName: string | null;
  bowlerName: string | null;
  strikerScore: string | null;
  nonStrikerScore: string | null;
  bowlerFigures: string | null;
} {
  const log = inn.ballLog || [];

  const notOutBatters = inn.battingEntries
    .filter(e => e.isNotOut)
    .map(e => {
      const team = teams.find(t => t.id === inn.battingTeamId);
      const name = team?.players.find(p => p.id === e.playerId)?.name || '';
      return { name, runs: e.runs, balls: e.balls, playerId: e.playerId };
    })
    .filter(b => b.name);

  let strikerName: string | null = null;
  let nonStrikerName: string | null = null;
  let bowlerName: string | null = null;

  if (inn.currentStrikerId) {
    const sEntry = notOutBatters.find(b => b.playerId === inn.currentStrikerId);
    if (sEntry) {
      strikerName = sEntry.name;
      const nsEntry = notOutBatters.find(b => b.playerId !== inn.currentStrikerId);
      nonStrikerName = nsEntry?.name || null;
    }
    if (log.length > 0) {
      bowlerName = log[log.length - 1].bowler || null;
    }
  } else if (log.length > 0) {
    const last = log[log.length - 1];
    bowlerName = last.bowler || null;
    const lastStrikerName = last.striker || null;

    const isOddRun = (last.type === 'run' || last.type === 'noball') && last.runs % 2 === 1;
    const isEndOfOver = last.ball === 6;
    const strikerRotated = isOddRun && !isEndOfOver;
    const endOverRotated = !isOddRun && isEndOfOver;

    if (lastStrikerName) {
      const other = notOutBatters.find(n => n.name !== lastStrikerName) || null;
      if (strikerRotated || endOverRotated) {
        strikerName = other?.name || null;
        nonStrikerName = lastStrikerName;
      } else {
        strikerName = lastStrikerName;
        nonStrikerName = other?.name || null;
      }
    }
  } else if (notOutBatters.length >= 2) {
    strikerName = notOutBatters[0].name;
    nonStrikerName = notOutBatters[1].name;
  }

  const strikerEntry  = notOutBatters.find(b => b.name === strikerName);
  const nsEntry       = notOutBatters.find(b => b.name === nonStrikerName);
  const strikerScore  = strikerEntry  ? `${strikerEntry.runs}(${strikerEntry.balls})`  : null;
  const nonStrikerScore = nsEntry     ? `${nsEntry.runs}(${nsEntry.balls})`            : null;

  let bowlerFigures: string | null = null;
  if (bowlerName) {
    const bowlTeam = teams.find(t => t.id === inn.bowlingTeamId);
    const bowlPlayer = bowlTeam?.players.find(p => p.name === bowlerName);
    if (bowlPlayer) {
      const be = inn.bowlingEntries.find(e => e.playerId === bowlPlayer.id);
      if (be) bowlerFigures = `${be.wickets}/${be.runsConceded} (${be.overs}ov)`;
    }
  }

  return { strikerName, nonStrikerName, bowlerName, strikerScore, nonStrikerScore, bowlerFigures };
}

export default function MatchStats({ matchId, onBack }: Props) {
  const { state } = useApp();
  const match = state.matches.find(m => m.id === matchId);
  const [selectedInningsIdx, setSelectedInningsIdx] = useState(0);
  const [showOversHistory, setShowOversHistory] = useState(false);

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Match not found.</p>
      </div>
    );
  }

  const team1 = getTeam(state.teams, match.team1Id);
  const team2 = getTeam(state.teams, match.team2Id);

  const t1Inn = getTeamInningsIdx(match, match.team1Id, 0);
  const t2Inn = getTeamInningsIdx(match, match.team2Id, 1);

  // Determine Man of the Match
  let motm: { name: string; teamColor: string; reason: string; photo?: string } | null = null;
  const allPerformers: { name: string; teamColor: string; score: number; reason: string; photo?: string }[] = [];
  match.innings.forEach(inn => {
    const batTeam = getTeam(state.teams, inn.battingTeamId);
    const bowlTeam = getTeam(state.teams, inn.bowlingTeamId);
    inn.battingEntries.forEach(e => {
      const player = batTeam?.players.find(p => p.id === e.playerId);
      const name = player?.name || 'Unknown';
      const sr = e.balls > 0 ? (e.runs / e.balls) * 100 : 0;
      const score = e.runs * 2 + (sr > 150 ? 20 : sr > 120 ? 10 : 0);
      allPerformers.push({ name, teamColor: batTeam?.color || '#10b981', score, reason: `${e.runs}(${e.balls})`, photo: player?.photo });
    });
    inn.bowlingEntries.forEach(e => {
      const player = bowlTeam?.players.find(p => p.id === e.playerId);
      const name = player?.name || 'Unknown';
      const score = e.wickets * 30 + (e.wickets >= 3 ? 25 : 0) - e.runsConceded;
      allPerformers.push({ name, teamColor: bowlTeam?.color || '#10b981', score, reason: `${e.wickets}/${e.runsConceded}`, photo: player?.photo });
    });
  });
  if (allPerformers.length > 0) {
    const best = allPerformers.sort((a, b) => b.score - a.score)[0];
    motm = { name: best.name, teamColor: best.teamColor, reason: best.reason, photo: best.photo };
  }

  // Active selected innings
  const selectedInn = match.innings[selectedInningsIdx] || match.innings[0];
  const batTeam = selectedInn ? getTeam(state.teams, selectedInn.battingTeamId) : null;
  const bowlTeam = selectedInn ? getTeam(state.teams, selectedInn.bowlingTeamId) : null;
  const total = selectedInn ? selectedInn.battingEntries.reduce((s, e) => s + e.runs, 0) + selectedInn.extras : 0;
  const wickets = selectedInn ? selectedInn.battingEntries.filter(e => !e.isNotOut).length : 0;
  const best = selectedInn ? bestBatter(selectedInn.battingEntries) : undefined;
  const bestBowl = selectedInn ? bestBowler(selectedInn.bowlingEntries) : undefined;

  const isActiveInnings = !match.isComplete && selectedInningsIdx === match.innings.length - 1;
  const liveInfo = isActiveInnings && selectedInn ? getLiveInfo(selectedInn, state.teams) : null;

  // Group balls by over for the selected innings
  const log = selectedInn?.ballLog || [];
  const overMap: Record<number, BallEvent[]> = {};
  log.forEach(ball => {
    if (!overMap[ball.over]) overMap[ball.over] = [];
    overMap[ball.over].push(ball);
  });
  const overNumbers = Object.keys(overMap).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-600 via-cyan-500 to-sky-500 shadow-lg shadow-cyan-900/30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{team1?.shortName || '??'}</span>
              <span className="text-[10px] text-cyan-100/50 font-bold">VS</span>
              <span className="text-sm font-bold text-white">{team2?.shortName || '??'}</span>
            </div>
            <p className="text-[10px] text-cyan-100/60">Match Stats & Scorecard</p>
          </div>
          {match.isComplete && (
            <div className="ml-auto flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[10px] text-white font-semibold">COMPLETED</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Match Info Bar */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {match.venue}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {match.date}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {match.totalOvers} overs</span>
        </div>

        {/* Score Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-700/40 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              {team1?.logo ? (
                <img src={team1.logo} alt={team1.name} className="w-12 h-12 rounded-xl mx-auto mb-2 object-cover shadow-md border border-slate-700/50" />
              ) : (
                <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold shadow-md" style={{ background: team1?.color || '#10b981' }}>
                  {team1?.shortName.slice(0, 2) || '??'}
                </div>
              )}
              <p className="text-xs font-semibold text-slate-300">{team1?.name}</p>
              <p className="text-3xl font-extrabold text-white mt-1">
                {getInningsTotal(match, t1Inn)}<span className="text-lg text-slate-500">/{getInningsWickets(match, t1Inn)}</span>
              </p>
              <p className="text-xs text-slate-500">({getInningsOvers(match, t1Inn)} ov)</p>
            </div>
            <div className="px-4">
              <span className="text-xs text-slate-600 font-bold tracking-widest">VS</span>
            </div>
            <div className="text-center flex-1">
              {team2?.logo ? (
                <img src={team2.logo} alt={team2.name} className="w-12 h-12 rounded-xl mx-auto mb-2 object-cover shadow-md border border-slate-700/50" />
              ) : (
                <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold shadow-md" style={{ background: team2?.color || '#10b981' }}>
                  {team2?.shortName.slice(0, 2) || '??'}
                </div>
              )}
              <p className="text-xs font-semibold text-slate-300">{team2?.name}</p>
              <p className="text-3xl font-extrabold text-white mt-1">
                {match.innings.length > 1 ? (
                  <>{getInningsTotal(match, t2Inn)}<span className="text-lg text-slate-500">/{getInningsWickets(match, t2Inn)}</span></>
                ) : <span className="text-slate-600">—</span>}
              </p>
              <p className="text-xs text-slate-500">{match.innings.length > 1 ? `(${getInningsOvers(match, t2Inn)} ov)` : ''}</p>
            </div>
          </div>
          {match.result && (
            <div className="mt-4 text-center">
              <p className="text-sm font-bold text-cyan-400">{match.result}</p>
            </div>
          )}
        </motion.div>

        {/* Man of the Match — only shown after match ends */}
        {motm && match.isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-amber-950/20"
          >
            {motm.photo ? (
              <img
                src={motm.photo}
                alt={motm.name}
                className="w-14 h-14 rounded-2xl object-cover shrink-0 shadow-lg border-2 border-amber-500/50"
              />
            ) : (
              <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/30">
                <Award className="w-7 h-7 text-amber-400" />
              </div>
            )}
            <div>
              <p className="text-[10px] text-amber-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> MAN OF THE MATCH
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: motm.teamColor }} />
                <p className="text-base font-extrabold text-white">{motm.name}</p>
                <span className="text-xs text-amber-400/90 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  {motm.reason}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Now Playing — only shown for live (incomplete) matches */}
        {!match.isComplete && (() => {
          const activeInn = match.innings[match.innings.length - 1];
          if (!activeInn) return null;
          const { strikerName, nonStrikerName, bowlerName, strikerScore, nonStrikerScore, bowlerFigures } = getLiveInfo(activeInn, state.teams);
          if (!strikerName && !bowlerName) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Live — Now Playing</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest mb-1.5">⚡ Striker</p>
                  <p className="text-sm font-bold text-white truncate leading-tight">{strikerName || '—'}</p>
                  {strikerScore && (
                    <p className="text-base font-extrabold text-cyan-300 mt-1 leading-none">{strikerScore}</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">Facing</p>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">🏃 Non-Striker</p>
                  <p className="text-sm font-bold text-white truncate leading-tight">{nonStrikerName || '—'}</p>
                  {nonStrikerScore && (
                    <p className="text-base font-extrabold text-slate-300 mt-1 leading-none">{nonStrikerScore}</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">At crease</p>
                </div>
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mb-1.5">🎯 Bowler</p>
                  <p className="text-sm font-bold text-white truncate leading-tight">{bowlerName || '—'}</p>
                  {bowlerFigures && (
                    <p className="text-base font-extrabold text-violet-300 mt-1 leading-none">{bowlerFigures}</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">Bowling</p>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* ── TEAM SELECTION BUTTONS / TABS ──────────────────────────────── */}
        {match.innings.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {match.innings.map((inn, idx) => {
                const isSelected = selectedInningsIdx === idx;
                const team = getTeam(state.teams, inn.battingTeamId);
                const innRuns = inn.battingEntries.reduce((s, e) => s + e.runs, 0) + inn.extras;
                const innWkts = inn.battingEntries.filter(e => !e.isNotOut).length;
                const innOvs = getInningsOvers(match, idx);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { setSelectedInningsIdx(idx); }}
                    className={`p-3.5 rounded-2xl border transition-all text-left flex items-center gap-3 ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-transparent border-cyan-500/70 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {team?.logo ? (
                      <img src={team.logo} alt={team.name} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-700/60 shadow" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 shadow" style={{ backgroundColor: team?.color || '#06b6d4' }}>
                        {team?.shortName?.slice(0, 3) || 'T'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {team?.name}
                        </p>
                        <span className="text-[10px] text-slate-500 font-semibold shrink-0">
                          ({idx === 0 ? '1st' : '2nd'})
                        </span>
                      </div>
                      <p className="text-xs font-mono font-extrabold text-cyan-400 mt-0.5">
                        {innRuns}/{innWkts} <span className="text-[11px] text-slate-400 font-normal">({innOvs} ov)</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── SELECTED TEAM SCORECARD ──────────────────────────────── */}
            {selectedInn && (
              <motion.div
                key={selectedInningsIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl"
              >
                {/* Innings Header */}
                <div className="px-4 py-3 bg-slate-800/30 border-b border-slate-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {batTeam?.logo ? (
                      <img src={batTeam.logo} alt={batTeam.name} className="w-5 h-5 rounded-md object-cover shadow-sm" />
                    ) : (
                      <div className="w-3 h-3 rounded-full" style={{ background: batTeam?.color || '#10b981' }} />
                    )}
                    <span className="text-sm font-bold text-white">{batTeam?.name || '?'}</span>
                    <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded">{selectedInningsIdx === 0 ? '1st' : '2nd'} Innings</span>
                    {isActiveInnings && <span className="text-[9px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full uppercase tracking-wide animate-pulse">LIVE</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-white">{total}<span className="text-sm text-slate-500">/{wickets}</span></span>
                  </div>
                </div>

                {/* Batting Scorecard */}
                <div className="px-4 pt-3 pb-1">
                  <div className="grid grid-cols-[1fr_36px_36px_36px_36px_48px] text-[11px] text-slate-500 font-semibold border-b border-slate-700/50 pb-1.5 mb-0.5">
                    <span>Batting</span>
                    <span className="text-right">R</span>
                    <span className="text-right">B</span>
                    <span className="text-right">4s</span>
                    <span className="text-right">6s</span>
                    <span className="text-right">S/R</span>
                  </div>
                  {selectedInn.battingEntries.map((entry, i) => {
                    const isBest = best && entry.playerId === best.playerId;
                    const playerName = getPlayerName(state.teams, selectedInn.battingTeamId, entry.playerId);
                    const dismissal = getDismissalText(entry, state.teams, selectedInn.bowlingTeamId);
                    const isStriker = liveInfo && playerName === liveInfo.strikerName;
                    const isNonStriker = liveInfo && playerName === liveInfo.nonStrikerName;
                    const batPlayer = batTeam?.players.find(p => p.id === entry.playerId);

                    return (
                      <div key={i} className={`grid grid-cols-[1fr_36px_36px_36px_36px_48px] items-start py-2.5 border-b border-slate-800/30 ${isBest ? 'bg-cyan-500/5 -mx-4 px-4' : ''}`}>
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {batPlayer?.photo ? (
                            <img src={batPlayer.photo} alt={playerName} className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-700 shadow-sm" />
                          ) : (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: (batTeam?.color || '#06b6d4') + '40', border: '1px solid ' + (batTeam?.color || '#06b6d4') + '80' }}>
                              {playerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[13px] font-medium leading-tight ${entry.isNotOut ? 'text-slate-100' : 'text-slate-300'}`}>
                                {playerName}
                                {entry.isNotOut && entry.balls > 0 && <span className="text-cyan-400 ml-0.5 text-[10px]">*</span>}
                              </span>
                              {isBest && <Zap className="w-3 h-3 text-amber-400 shrink-0" />}
                              {isStriker && (
                                <span className="text-[8px] font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.5 rounded-full">⚡ STRIKER</span>
                              )}
                              {isNonStriker && (
                                <span className="text-[8px] font-bold text-slate-300 bg-slate-700/50 border border-slate-600/40 px-1.5 py-0.5 rounded-full">🏃 NON-STRIKER</span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 italic leading-tight">
                              {entry.isNotOut ? 'not out' : `∨ ${dismissal}`}
                            </span>
                          </div>
                        </div>
                        <span className={`text-right text-[13px] font-bold leading-tight pt-0.5 ${entry.runs >= 50 ? 'text-amber-300' : entry.runs >= 30 ? 'text-cyan-300' : 'text-white'}`}>{entry.runs}</span>
                        <span className="text-right text-[12px] text-slate-400 leading-tight pt-0.5">{entry.balls}</span>
                        <span className="text-right text-[12px] text-blue-400 leading-tight pt-0.5">{entry.fours}</span>
                        <span className="text-right text-[12px] text-amber-400 leading-tight pt-0.5">{entry.sixes}</span>
                        <span className="text-right text-[11px] text-slate-400 leading-tight pt-0.5">{getStrikeRate(entry.runs, entry.balls)}</span>
                      </div>
                    );
                  })}
                  {selectedInn.extras > 0 && (
                    <div className="flex items-center justify-between py-2 text-[12px] text-slate-500 border-b border-slate-800/20">
                      <span>Extras</span>
                      <span className="font-medium text-slate-400">{selectedInn.extras}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-[13px] font-bold text-slate-200">Total</span>
                    <span className="text-[15px] font-extrabold text-white">{total}<span className="text-slate-500 text-sm font-medium">/{wickets}</span></span>
                  </div>
                </div>

                {/* Divider */}
                <div className="px-4">
                  <div className="h-px bg-slate-800/60" />
                </div>

                {/* Bowling Scorecard */}
                <div className="px-4 pt-3 pb-3">
                  <div className="grid grid-cols-[1fr_40px_36px_36px_36px_48px] text-[11px] text-slate-500 font-semibold border-b border-slate-700/50 pb-1.5 mb-0.5">
                    <span>Bowling</span>
                    <span className="text-right">O</span>
                    <span className="text-right">M</span>
                    <span className="text-right">R</span>
                    <span className="text-right">W</span>
                    <span className="text-right">Econ</span>
                  </div>
                  {selectedInn.bowlingEntries.map((entry, i) => {
                    const isBest = bestBowl && entry.playerId === bestBowl.playerId;
                    const bowlerPlayerName = getPlayerName(state.teams, selectedInn.bowlingTeamId, entry.playerId);
                    const isCurrentBowler = liveInfo && bowlerPlayerName === liveInfo.bowlerName;
                    const bowlPlayer = bowlTeam?.players.find(p => p.id === entry.playerId);

                    return (
                      <div key={i} className={`grid grid-cols-[1fr_40px_36px_36px_36px_48px] items-center py-2.5 border-b border-slate-800/30 ${isBest ? 'bg-violet-500/5 -mx-4 px-4' : ''}`}>
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {bowlPlayer?.photo ? (
                            <img src={bowlPlayer.photo} alt={bowlerPlayerName} className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-700 shadow-sm" />
                          ) : (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: (bowlTeam?.color || '#8b5cf6') + '40', border: '1px solid ' + (bowlTeam?.color || '#8b5cf6') + '80' }}>
                              {bowlerPlayerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="text-[13px] font-medium text-slate-100 leading-tight">{bowlerPlayerName}</span>
                            {isBest && <Target className="w-3 h-3 text-violet-400 shrink-0" />}
                            {isCurrentBowler && (
                              <span className="text-[8px] font-bold text-violet-300 bg-violet-500/15 border border-violet-500/30 px-1.5 py-0.5 rounded-full">🎯 BOWLING</span>
                            )}
                          </div>
                        </div>
                        <span className="text-right text-[12px] text-slate-400">{entry.overs}</span>
                        <span className="text-right text-[12px] text-slate-400">{entry.maidens}</span>
                        <span className="text-right text-[12px] text-white font-bold">{entry.runsConceded}</span>
                        <span className={`text-right text-[13px] font-bold ${entry.wickets >= 3 ? 'text-violet-300' : entry.wickets > 0 ? 'text-violet-400' : 'text-slate-400'}`}>{entry.wickets}</span>
                        <span className="text-right text-[11px] text-slate-400">{getEconomy(entry.runsConceded, entry.overs)}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── OVER'S HISTORY BUTTON & ACCORDION ────────────────────────── */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => setShowOversHistory(!showOversHistory)}
                className="w-full py-3.5 px-4 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl flex items-center justify-between transition-all group shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                      Over's History
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {overNumbers.length > 0 ? `${overNumbers.length} over${overNumbers.length !== 1 ? 's' : ''} • Ball-by-ball timeline` : 'No overs recorded'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-cyan-400 font-semibold px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    {showOversHistory ? 'Hide' : 'View Overs'}
                  </span>
                  {showOversHistory ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />}
                </div>
              </button>

              <AnimatePresence>
                {showOversHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-3 pt-1"
                  >
                    {overNumbers.length === 0 ? (
                      <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 text-center text-slate-500 text-xs">
                        No ball-by-ball data recorded for this innings.
                      </div>
                    ) : (
                      overNumbers.map(overNum => {
                        const balls = overMap[overNum];
                        const overRuns = balls.reduce((s, b) => s + (b.type === 'wicket' ? 0 : b.runs), 0);
                        const overWickets = balls.filter(b => b.type === 'wicket').length;
                        const bowlerName = balls[0]?.bowler || 'Bowler';
                        const bowlerPlayer = bowlTeam?.players.find(p => p.name === bowlerName || p.id === balls[0]?.bowlerId);

                        return (
                          <div
                            key={overNum}
                            className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm space-y-3"
                          >
                            {/* Over header */}
                            <div className="flex items-center justify-between border-b border-slate-800/70 pb-2.5">
                              <div className="flex items-center gap-2.5">
                                <span className="px-2.5 py-1 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold rounded-lg">
                                  Over {overNum + 1}
                                </span>
                                <div className="flex items-center gap-2">
                                  {bowlerPlayer?.photo ? (
                                    <img src={bowlerPlayer.photo} alt={bowlerName} className="w-5 h-5 rounded-full object-cover border border-slate-600 shadow" />
                                  ) : (
                                    <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                                  )}
                                  <span className="text-xs font-bold text-slate-200">{bowlerName}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {overWickets > 0 && (
                                  <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-extrabold rounded-md">
                                    {overWickets} Wkt{overWickets !== 1 ? 's' : ''}
                                  </span>
                                )}
                                <span className="text-xs font-extrabold text-white font-mono bg-slate-800/80 px-2 py-1 rounded-md">
                                  {overRuns} run{overRuns !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>

                            {/* Ball by ball bubbles */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {balls.map((ball, bIdx) => {
                                const st = getBallStyle(ball);
                                return (
                                  <div
                                    key={bIdx}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-transform hover:scale-110 ${st.bg} ${st.text}`}
                                    title={`${ball.type} - ${ball.runs} runs`}
                                  >
                                    {st.label}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-8 text-center text-slate-500 text-sm">
            No innings data recorded for this match yet.
          </div>
        )}

      </div>
    </div>
  );
}
