import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, UserPlus, X, Check, Users, ChevronDown, ChevronUp, Camera, Upload } from 'lucide-react';
import { useApp } from '../store';
import type { Team, Player } from '../types';
import { compressImage } from '../utils/image';

const TEAM_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface TeamsViewProps {
  isAdmin: boolean;
  currentUserId?: string;
  isLoggedIn?: boolean;
}

export default function TeamsView({ isAdmin, currentUserId, isLoggedIn }: TeamsViewProps) {
  const { state, dispatch } = useApp();
  const teams = currentUserId
    ? state.teams.filter(t => t.ownerId === currentUserId)
    : state.teams;
  const [showForm, setShowForm] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPhoto, setNewPlayerPhoto] = useState<string | undefined>(undefined);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const teamLogoInputRef = useRef<HTMLInputElement>(null);
  const playerPhotoInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setName('');
    setShortName('');
    setColor(TEAM_COLORS[0]);
    setLogo(undefined);
    setEditTeam(null);
    setShowForm(false);
  }

  function openEdit(team: Team) {
    setEditTeam(team);
    setName(team.name);
    setShortName(team.shortName);
    setColor(team.color);
    setLogo(team.logo);
    setShowForm(true);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingLogo(true);
      const dataUrl = await compressImage(file, 256, 256, 0.85);
      setLogo(dataUrl);
    } catch (err) {
      console.error('Failed to compress logo', err);
    } finally {
      setIsUploadingLogo(false);
      if (teamLogoInputRef.current) teamLogoInputRef.current.value = '';
    }
  }

  async function handlePlayerPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      const dataUrl = await compressImage(file, 200, 200, 0.85);
      setNewPlayerPhoto(dataUrl);
    } catch (err) {
      console.error('Failed to compress photo', err);
    } finally {
      setIsUploadingPhoto(false);
      if (playerPhotoInputRef.current) playerPhotoInputRef.current.value = '';
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !shortName.trim()) return;
    if (editTeam) {
      dispatch({
        type: 'UPDATE_TEAM',
        payload: {
          ...editTeam,
          name: name.trim(),
          shortName: shortName.trim().toUpperCase(),
          color,
          logo: logo || undefined,
        },
      });
    } else {
      const team: Team = {
        id: uid(),
        name: name.trim(),
        shortName: shortName.trim().toUpperCase(),
        color,
        logo: logo || undefined,
        players: [],
        ownerId: currentUserId,
      };
      dispatch({ type: 'ADD_TEAM', payload: team });
    }
    resetForm();
  }

  function addPlayer(teamId: string) {
    if (!newPlayerName.trim()) return;
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const player: Player = {
      id: uid(),
      name: newPlayerName.trim(),
      photo: newPlayerPhoto || undefined,
    };
    dispatch({ type: 'UPDATE_TEAM', payload: { ...team, players: [...team.players, player] } });
    setNewPlayerName('');
    setNewPlayerPhoto(undefined);
  }

  function removePlayer(teamId: string, playerId: string) {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    dispatch({ type: 'UPDATE_TEAM', payload: { ...team, players: team.players.filter(p => p.id !== playerId) } });
  }

  const canManageTeam = (team: Team) =>
    isAdmin || (Boolean(isLoggedIn) && (!team.ownerId || team.ownerId === currentUserId));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Teams</h2>
          <p className="text-xs text-slate-400">{teams.length} team{teams.length !== 1 ? 's' : ''} registered</p>
        </div>
        {(isLoggedIn || isAdmin) && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-sky-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-900/30 hover:shadow-cyan-900/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Add Team
          </button>
        )}
      </div>

      {/* Team Form */}
      <AnimatePresence>
        {showForm && (isLoggedIn || isAdmin) && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-5 space-y-4 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">{editTeam ? 'Edit Team' : 'New Team'}</h3>
              <button type="button" onClick={resetForm} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Team Logo Section */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 flex items-center gap-4">
              <div className="relative group flex-shrink-0">
                {logo ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-cyan-500/40 shadow-md">
                    <img src={logo} alt="Team Logo" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setLogo(undefined)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 transition-opacity"
                      title="Remove Logo"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => teamLogoInputRef.current?.click()}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/50 bg-slate-900 flex flex-col items-center justify-center text-slate-400 hover:text-cyan-400 transition-all"
                  >
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-semibold">Logo</span>
                  </button>
                )}
                <input
                  ref={teamLogoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">Team Logo</label>
                  {logo && (
                    <button
                      type="button"
                      onClick={() => setLogo(undefined)}
                      className="text-[11px] text-rose-400 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Upload an emblem or photo for your team (optional, PNG/JPG).
                </p>
                <button
                  type="button"
                  onClick={() => teamLogoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="mt-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isUploadingLogo ? 'Uploading...' : logo ? 'Change Logo' : 'Upload Logo'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Team Name</label>
                <input
                  id="team-name-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Royal Warriors"
                  className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Short Name</label>
                <input
                  id="team-shortname-input"
                  value={shortName}
                  onChange={e => setShortName(e.target.value.slice(0, 4))}
                  placeholder="e.g. RW"
                  maxLength={4}
                  className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all uppercase"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2 font-medium">Team Color</label>
              <div className="flex gap-2 flex-wrap">
                {TEAM_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={"w-8 h-8 rounded-full transition-all " + (color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-110')}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                id="team-save-btn"
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-cyan-500 text-white text-sm font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
              >
                <Check className="w-4 h-4" /> {editTeam ? 'Update' : 'Create'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Team List */}
      <div className="space-y-3">
        <AnimatePresence>
          {teams.map(team => {
            const isExpanded = expandedTeam === team.id;
            const canManage = canManageTeam(team);

            return (
              <motion.div
                key={team.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900/60 border border-slate-800/50 rounded-2xl overflow-hidden"
              >
                {/* Team Header */}
                <div className="p-4 flex items-center gap-3">
                  {team.logo ? (
                    <img
                      src={team.logo}
                      alt={team.name}
                      className="w-11 h-11 rounded-xl object-cover shadow-lg border border-slate-700/60 flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0"
                      style={{ background: team.color }}
                    >
                      {team.shortName.slice(0, 2)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{team.name}</h4>
                    <p className="text-xs text-slate-400">{team.players.length} player{team.players.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                      className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-all"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {canManage && (
                      <>
                        <button onClick={() => openEdit(team)} className="p-2 text-slate-500 hover:text-blue-400 hover:bg-slate-800/50 rounded-lg transition-all" title="Edit">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => dispatch({ type: 'DELETE_TEAM', payload: team.id })} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800/50 rounded-lg transition-all" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Players */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-800/50 px-4 pb-4 pt-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Players</p>
                        </div>

                        {team.players.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {team.players.map((player, idx) => (
                              <div key={player.id} className="flex items-center gap-3 bg-slate-800/40 rounded-xl px-3 py-2 group border border-slate-800/60">
                                <span className="text-[10px] text-slate-500 font-mono w-5 text-right">{idx + 1}</span>
                                
                                {player.photo ? (
                                  <img
                                    src={player.photo}
                                    alt={player.name}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-700/80 shadow-sm flex-shrink-0"
                                  />
                                ) : (
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                    style={{ background: team.color + '40', border: '1.5px solid ' + team.color + '70' }}
                                  >
                                    {player.name.charAt(0).toUpperCase()}
                                  </div>
                                )}

                                <span className="text-sm font-medium text-slate-200 flex-1 truncate">{player.name}</span>
                                
                                {canManage && (
                                  <button
                                    onClick={() => removePlayer(team.id, player.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 transition-all rounded-lg hover:bg-slate-800"
                                    title="Remove player"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {canManage && (
                          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
                            <p className="text-xs font-semibold text-slate-400">Add New Player</p>
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                              {/* Player Photo Button */}
                              <div className="relative flex-shrink-0">
                                {newPlayerPhoto ? (
                                  <div className="relative w-9 h-9 rounded-full overflow-hidden border border-cyan-500/50 shadow">
                                    <img src={newPlayerPhoto} alt="Player" className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => setNewPlayerPhoto(undefined)}
                                      className="absolute inset-0 bg-black/60 flex items-center justify-center text-rose-400"
                                      title="Remove photo"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => playerPhotoInputRef.current?.click()}
                                    title="Add Player Photo"
                                    className="w-9 h-9 rounded-full border border-dashed border-slate-700 bg-slate-900/90 hover:border-cyan-400 hover:text-cyan-400 flex items-center justify-center text-slate-400 transition-colors"
                                  >
                                    <Camera className="w-4 h-4" />
                                  </button>
                                )}
                                <input
                                  ref={playerPhotoInputRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={handlePlayerPhotoUpload}
                                  className="hidden"
                                />
                              </div>

                              <input
                                value={expandedTeam === team.id ? newPlayerName : ''}
                                onChange={e => setNewPlayerName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPlayer(team.id); }}}
                                placeholder="Player name..."
                                className="flex-1 min-w-[140px] bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                              />

                              <button
                                onClick={() => addPlayer(team.id)}
                                disabled={!newPlayerName.trim()}
                                className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-sky-500 text-white text-sm font-semibold rounded-lg hover:from-cyan-400 hover:to-sky-400 disabled:opacity-40 transition-all flex items-center gap-1.5 flex-shrink-0"
                              >
                                <UserPlus className="w-3.5 h-3.5" /> Add
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              Tap the camera icon to attach a photo for the player.
                            </p>
                          </div>
                        )}

                        {!canManage && team.players.length === 0 && (
                          <p className="text-xs text-slate-500 italic">No players added yet.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {teams.length === 0 && !showForm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-16 h-16 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400 mb-4">
            {(isLoggedIn || isAdmin)
              ? "You haven't created any teams yet. Create your first team to get started!"
              : 'No teams have been created yet.'}
          </p>
          {(isLoggedIn || isAdmin) && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-900/30 hover:shadow-cyan-900/50 transition-all"
            >
              <Plus className="w-4 h-4" /> Create First Team
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}
