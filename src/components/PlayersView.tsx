import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Users, ChevronRight, ArrowLeft } from 'lucide-react';
import { useApp } from '../store';

interface Props {
  currentUserId?: string;
  isLoggedIn?: boolean;
  onNavigateToTeams?: () => void;
}

interface PlayerFull {
  id: string;
  name: string;
  photo?: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  teamShort: string;
  teamLogo?: string;
}

export default function PlayersView({ currentUserId, isLoggedIn, onNavigateToTeams }: Props) {
  const { state } = useApp();
  const { teams, matches } = state;
  const myTeams = currentUserId ? teams.filter((t) => t.ownerId === currentUserId) : teams;
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerFull | null>(null);

  function getStats(playerId: string) {
    let innings = 0, runs = 0, balls = 0, fours = 0, sixes = 0, hs = 0, notOuts = 0;
    let fifties = 0, hundreds = 0, catches = 0;
    let wickets = 0, overs = 0, runsConceded = 0, maidens = 0;
    let bestWkts = 0, bestRuns = 999, threeFers = 0, fiveFers = 0;
    for (const m of matches) {
      for (const inn of m.innings) {
        const bat = inn.battingEntries.find((e) => e.playerId === playerId);
        if (bat) {
          innings++; runs += bat.runs; balls += bat.balls; fours += bat.fours; sixes += bat.sixes;
          if (bat.isNotOut) notOuts++;
          if (bat.runs > hs) hs = bat.runs;
          if (bat.runs >= 100) hundreds++;
          else if (bat.runs >= 50) fifties++;
        }
        inn.battingEntries.forEach((e) => {
          if (e.fielderId === playerId && e.dismissalType === 'caught') catches++;
        });
        const bowl = inn.bowlingEntries.find((e) => e.playerId === playerId);
        if (bowl) {
          wickets += bowl.wickets; overs += bowl.overs; runsConceded += bowl.runsConceded; maidens += bowl.maidens;
          if (bowl.wickets >= 5) fiveFers++;
          else if (bowl.wickets >= 3) threeFers++;
          if (bowl.wickets > bestWkts || (bowl.wickets === bestWkts && bowl.runsConceded < bestRuns)) {
            bestWkts = bowl.wickets; bestRuns = bowl.runsConceded;
          }
        }
      }
    }
    const dismissals = innings - notOuts;
    const avg = dismissals > 0 ? (runs / dismissals).toFixed(1) : runs > 0 ? 'N/O' : '-';
    const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '-';
    const economy = overs > 0 ? (runsConceded / overs).toFixed(2) : '-';
    const bowlAvg = wickets > 0 ? (runsConceded / wickets).toFixed(1) : '-';
    const role = innings > 0 && wickets > 0 ? 'All-Rounder' : innings > 0 ? 'Batsman' : wickets > 0 ? 'Bowler' : 'Player';
    return { innings, runs, balls, fours, sixes, hs, notOuts, fifties, hundreds, catches, wickets, overs, runsConceded, maidens, bestWkts, bestRuns, threeFers, fiveFers, avg, sr, economy, bowlAvg, role };
  }

  const totalPlayers = myTeams.reduce((s, t) => s + t.players.length, 0);

  if (myTeams.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" /> Players
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Players from your teams</p>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-16 h-16 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400 mb-4">
            {isLoggedIn ? "You don't have any teams yet. Create a team first to add players." : 'Log in to see your players.'}
          </p>
          {isLoggedIn && onNavigateToTeams && (
            <button onClick={onNavigateToTeams}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-500 text-white text-sm font-semibold rounded-xl shadow-lg transition-all">
              <Users className="w-4 h-4" /> Go to Teams
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  // ── Player detail ──
  if (selectedPlayer) {
    const s = getStats(selectedPlayer.id);
    const hasBat = s.innings > 0;
    const hasBowl = s.wickets > 0 || s.overs > 0;
    return (
      <div className="space-y-5">
        <button onClick={() => setSelectedPlayer(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Players
        </button>
        <div className="bg-slate-900/70 border border-slate-800/60 rounded-2xl p-5 flex items-center gap-4">
          {selectedPlayer.photo ? (
            <img
              src={selectedPlayer.photo}
              alt={selectedPlayer.name}
              className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 shadow-lg"
              style={{ border: '2px solid ' + selectedPlayer.teamColor }}
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg"
              style={{ background: selectedPlayer.teamColor + '33', border: '2px solid ' + selectedPlayer.teamColor + '66' }}>
              {selectedPlayer.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white">{selectedPlayer.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                {selectedPlayer.teamLogo ? (
                  <img src={selectedPlayer.teamLogo} alt={selectedPlayer.teamName} className="w-4 h-4 rounded-md object-cover" />
                ) : (
                  <div className="w-3 h-3 rounded-full" style={{ background: selectedPlayer.teamColor }} />
                )}
                <span className="text-sm text-slate-300">{selectedPlayer.teamName}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
                style={{ background: selectedPlayer.teamColor + '22', color: selectedPlayer.teamColor }}>
                {s.role}
              </span>
            </div>
          </div>
        </div>

        {hasBat && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Batting Stats
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[
                { label: 'Innings', value: s.innings },
                { label: 'Runs', value: s.runs, hi: true },
                { label: 'Highest Score', value: s.notOuts > 0 ? s.hs + '*' : s.hs },
                { label: 'Average', value: s.avg },
                { label: 'Strike Rate', value: s.sr },
                { label: 'Not Outs', value: s.notOuts },
                { label: 'Hundreds (100s)', value: s.hundreds },
                { label: 'Fifties (50s)', value: s.fifties },
                { label: 'Fours (4s)', value: s.fours },
                { label: 'Sixes (6s)', value: s.sixes },
                { label: 'Balls Faced', value: s.balls },
                { label: 'Catches', value: s.catches },
              ].map((item) => (
                <div key={item.label}
                  className={'rounded-xl p-3 text-center border ' + (item.hi ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-800/50 border-slate-700/30')}>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 mb-0.5 leading-tight">{item.label}</p>
                  <p className={'text-lg font-bold ' + (item.hi ? 'text-amber-400' : 'text-white')}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasBowl && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Bowling Stats
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[
                { label: 'Overs', value: s.overs },
                { label: 'Wickets', value: s.wickets, hi: true },
                { label: 'Runs Given', value: s.runsConceded },
                { label: 'Economy', value: s.economy },
                { label: 'Average', value: s.bowlAvg },
                { label: 'Maidens', value: s.maidens },
                { label: 'Best Bowling', value: s.bestWkts > 0 ? s.bestWkts + '/' + (s.bestRuns === 999 ? '-' : s.bestRuns) : '-' },
                { label: '3-Wicket Hauls', value: s.threeFers },
                { label: '5-Wicket Hauls', value: s.fiveFers },
              ].map((item) => (
                <div key={item.label}
                  className={'rounded-xl p-3 text-center border ' + (item.hi ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-slate-800/50 border-slate-700/30')}>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 mb-0.5 leading-tight">{item.label}</p>
                  <p className={'text-lg font-bold ' + (item.hi ? 'text-cyan-400' : 'text-white')}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasBat && !hasBowl && (
          <div className="text-center py-10 text-slate-500 text-sm">
            No match data recorded for this player yet.
          </div>
        )}
      </div>
    );
  }

  // ── Player list ──
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-cyan-400" /> Players
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {totalPlayers} player{totalPlayers !== 1 ? 's' : ''} across {myTeams.length} team{myTeams.length !== 1 ? 's' : ''} — tap a player to see their full profile
        </p>
      </div>

      {myTeams.map((team) => (
        <div key={team.id} className="space-y-2">
          <div className="flex items-center gap-2">
            {team.logo ? (
              <img src={team.logo} alt={team.name} className="w-7 h-7 rounded-lg object-cover shadow" />
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: team.color }}>
                {team.shortName.slice(0, 2)}
              </div>
            )}
            <h3 className="text-sm font-bold text-white">{team.name}</h3>
            <span className="text-xs text-slate-500">({team.players.length} players)</span>
          </div>
          {team.players.length === 0 ? (
            <p className="text-xs text-slate-600 italic ml-9">No players added yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {team.players.map((player, idx) => {
                const s = getStats(player.id);
                const pf: PlayerFull = {
                  id: player.id,
                  name: player.name,
                  photo: player.photo,
                  teamId: team.id,
                  teamName: team.name,
                  teamColor: team.color,
                  teamShort: team.shortName,
                  teamLogo: team.logo,
                };
                return (
                  <motion.button key={player.id} layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                    onClick={() => setSelectedPlayer(pf)}
                    className="bg-slate-900/60 border border-slate-800/40 hover:border-cyan-500/30 rounded-xl p-3 flex items-center gap-3 text-left transition-all group w-full">
                    {player.photo ? (
                      <img
                        src={player.photo}
                        alt={player.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-sm"
                        style={{ border: '2px solid ' + team.color }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: team.color + '33', border: '1.5px solid ' + team.color + '66' }}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{player.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: team.color + '22', color: team.color }}>{s.role}</span>
                        {s.innings > 0 && <span className="text-[10px] text-slate-500">{s.runs} runs</span>}
                        {s.wickets > 0 && <span className="text-[10px] text-slate-500">{s.wickets} wkts</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
