import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, LogOut, Edit3, Save, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../store';
import type { User as UserType } from '../types';

interface ProfileViewProps {
  currentUserId: string;
  currentUserName: string;
  onLogout: () => void;
}

export default function ProfileView({ currentUserId, currentUserName, onLogout }: ProfileViewProps) {
  const { state, dispatch } = useApp();

  const currentUser: UserType | undefined = (state.users || []).find(u => u.id === currentUserId);

  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [saved, setSaved] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  function handleSave() {
    const trimmed = phone.trim();
    if (trimmed && !/^[0-9+\-\s()]{7,15}$/.test(trimmed)) {
      setPhoneError('Enter a valid mobile number (7–15 digits)');
      return;
    }
    setPhoneError('');
    if (currentUser) {
      dispatch({
        type: 'UPDATE_USER',
        payload: { ...currentUser, phone: trimmed || undefined, location: location.trim() || undefined },
      });
    }
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleCancel() {
    setPhone(currentUser?.phone || '');
    setLocation(currentUser?.location || '');
    setPhoneError('');
    setEditing(false);
  }

  const hasMobile = !!(currentUser?.phone?.trim());
  const initials = currentUserName ? currentUserName.charAt(0).toUpperCase() : 'U';
  const memberSince = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="max-w-lg mx-auto pt-2 pb-10 px-1">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        {/* Profile Card Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800/60 rounded-3xl p-6 text-center relative overflow-hidden">
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-3 text-white text-3xl font-bold shadow-xl shadow-cyan-900/30 relative z-10">
            {initials}
          </div>

          <h2 className="text-xl font-extrabold text-white relative z-10">{currentUserName}</h2>
          {memberSince && (
            <p className="text-xs text-slate-500 mt-1 relative z-10">Member since {memberSince}</p>
          )}

          {/* Mobile missing warning */}
          {!hasMobile && (
            <div className="mt-3 mx-auto max-w-xs bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 flex items-start gap-2 text-left relative z-10">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-300 font-medium">
                Add your mobile number to create matches.
              </p>
            </div>
          )}

          {/* Save success */}
          {saved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 mx-auto max-w-xs bg-cyan-500/10 border border-cyan-500/30 rounded-xl px-4 py-2 flex items-center gap-2 justify-center relative z-10"
            >
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <p className="text-xs text-cyan-300 font-semibold">Profile updated!</p>
            </motion.div>
          )}
        </div>

        {/* Info Fields */}
        <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl divide-y divide-slate-800/50 overflow-hidden">

          {/* Name */}
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-8 h-8 rounded-xl bg-slate-800/80 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Name</p>
              <p className="text-sm font-semibold text-white truncate">{currentUserName}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-8 h-8 rounded-xl bg-slate-800/80 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Email</p>
              <p className="text-sm font-semibold text-white truncate">{currentUser?.email || '—'}</p>
            </div>
          </div>

          {/* Mobile */}
          <div className="flex items-center gap-3 px-5 py-4">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${hasMobile ? 'bg-slate-800/80' : 'bg-amber-500/10 border border-amber-500/20'}`}>
              <Phone className={`w-4 h-4 ${hasMobile ? 'text-slate-400' : 'text-amber-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                Mobile Number
                {!hasMobile && <span className="ml-1.5 text-amber-400 normal-case font-bold tracking-normal">Required*</span>}
              </p>
              {editing ? (
                <div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setPhoneError(''); }}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    autoFocus
                  />
                  {phoneError && <p className="text-xs text-rose-400 mt-1">{phoneError}</p>}
                </div>
              ) : (
                <p className={`text-sm font-semibold ${hasMobile ? 'text-white' : 'text-amber-400/80 italic'}`}>
                  {currentUser?.phone || 'Not added yet'}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-8 h-8 rounded-xl bg-slate-800/80 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Location</p>
              {editing ? (
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Chennai, Tamil Nadu"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              ) : (
                <p className={`text-sm font-semibold ${currentUser?.location ? 'text-white' : 'text-slate-500 italic'}`}>
                  {currentUser?.location || 'Not added yet'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {editing ? (
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition-all border border-slate-700"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-900/30"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full py-3 flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-sm rounded-xl transition-all border border-slate-700/60"
          >
            <Edit3 className="w-4 h-4" /> Edit Profile
          </button>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full py-3 flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-semibold text-sm rounded-xl transition-all border border-rose-500/20 hover:border-rose-500/40"
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </motion.div>
    </div>
  );
}
