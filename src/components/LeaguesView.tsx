import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Plus, X, Trash2 } from 'lucide-react';
import { useApp } from '../store';
import type { League } from '../types';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateLeagueCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

interface Props {
  isAdmin: boolean;
}

export default function LeaguesView({ isAdmin }: Props) {
  const { state, dispatch } = useApp();
  const { leagues } = state;
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const league: League = {
      id: uid(),
      name: name.trim(),
      code: generateLeagueCode(),
    };

    dispatch({ type: 'ADD_LEAGUE', payload: league });
    setName('');
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-emerald-400" />
          Leagues & Tournaments
        </h2>
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-emerald-900/40 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" /> New League
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative"
          >
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-white mb-4">Create New League</h3>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Summer Championship 2026"
                className="flex-1 bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition-colors"
              >
                Create
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(leagues || []).map(league => {
          const matchCount = state.matches.filter(m => m.leagueCode === league.code).length;
          return (
            <motion.div
              key={league.id}
              layout
              className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{league.name}</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-1">League Code</p>
                  <p className="text-xl font-mono text-emerald-400 font-bold tracking-widest">{league.code}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => {
                      if (confirm('Delete this league? Matches will remain but lose their league association.')) {
                        dispatch({ type: 'DELETE_LEAGUE', payload: league.id });
                      }
                    }}
                    className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Trophy className="w-4 h-4" />
                <span>{matchCount} Matches</span>
              </div>
            </motion.div>
          );
        })}

        {(!leagues || leagues.length === 0) && !showForm && (
          <div className="col-span-full text-center py-12">
            <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No leagues created yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
