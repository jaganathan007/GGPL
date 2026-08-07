import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Trophy, MessageSquare, X, ShieldCheck, CheckCircle } from 'lucide-react';
import { useApp } from '../store';
import type { User as UserType } from '../types';

const SESSION_KEY = 'ggpl-session';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Simple hash (not cryptographic — fine for local/friend group use)
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const chr = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return 'h' + Math.abs(hash).toString(36);
}

export function getSession(): { userId: string; userName: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

export function setSession(userId: string, userName: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, userName }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

interface AuthGateProps {
  onLogin: (userId: string, userName: string) => void;
  onGuest: () => void;
}

export default function AuthGate({ onLogin, onGuest }: AuthGateProps) {
  const { state, dispatch } = useApp();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Phase handling
  const [phase, setPhase] = useState<'info' | 'forgotOtp' | 'forgotNewPassword'>('info');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password state
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpToast, setOtpToast] = useState<string | null>(null);
  const otpToastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Auto-login if session exists
  useEffect(() => {
    const session = getSession();
    if (session) {
      const user = (state.users || []).find(u => u.id === session.userId);
      if (user) {
        onLogin(user.id, user.name);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup OTP timer on unmount
  useEffect(() => {
    return () => {
      if (otpToastTimer.current) clearTimeout(otpToastTimer.current);
    };
  }, []);

  function handleSendOtp() {
    if (!email.trim()) {
      setError('Please enter your email address to reset password');
      return;
    }
    // Verify user exists first
    const existing = (state.users || []).find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
    if (!existing) {
      setError('No account found with this email address');
      return;
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otp);
    setEnteredOtp('');
    setPhase('forgotOtp');
    setError('');
    setOtpToast(otp);
    if (otpToastTimer.current) clearTimeout(otpToastTimer.current);
    otpToastTimer.current = setTimeout(() => setOtpToast(null), 15000);
  }

  function handleVerifyOtp() {
    if (enteredOtp === generatedOtp) {
      setPhase('forgotNewPassword');
      setError('');
    } else {
      setError('Invalid OTP. Please try again.');
      setEnteredOtp('');
    }
  }

  function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }

    const user = (state.users || []).find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
    if (user) {
      dispatch({ type: 'UPDATE_USER', payload: { ...user, passwordHash: hashPassword(newPassword) } });
      setSession(user.id, user.name);
      setOtpToast(null);
      onLogin(user.id, user.name);
    } else {
      setError('An error occurred. Please try again.');
    }
  }

  function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const emailTrimmed = email.trim().toLowerCase();

    if (!emailTrimmed) {
      setError('Please enter your email address');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your name');
        return;
      }
      if (password.length < 4) {
        setError('Password must be at least 4 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Check if user exists
      const existing = (state.users || []).find(u => u.email?.toLowerCase() === emailTrimmed);
      if (existing) {
        setError('Account already exists. Please login instead.');
        return;
      }

      // Create user
      const id = uid();
      const user: UserType = {
        id,
        name: name.trim(),
        email: emailTrimmed,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_USER', payload: user });
      setSession(id, user.name);
      onLogin(id, user.name);
    } else {
      // Login
      const user = (state.users || []).find(u => u.email?.toLowerCase() === emailTrimmed);
      if (!user) {
        setError('No account found. Please sign up first.');
        return;
      }
      if (user.passwordHash !== hashPassword(password)) {
        setError('Incorrect password. Please try again.');
        return;
      }

      setSession(user.id, user.name);
      onLogin(user.id, user.name);
    }
  }

  function resetToInfo() {
    setPhase('info');
    setError('');
    setGeneratedOtp('');
    setEnteredOtp('');
    setOtpToast(null);
    setPassword('');
    setConfirmPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  }

  const isForgotPhase = phase === 'forgotOtp' || phase === 'forgotNewPassword';

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, '$1****$2');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />

      {/* OTP Toast */}
      <AnimatePresence>
        {otpToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-950/50 border border-emerald-400/30 max-w-sm w-[90%]"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1">
                  Email verification code sent to {email}
                </p>
                <p className="text-sm text-white/95 font-medium">Your verification code (OTP) is:</p>
                <p className="text-3xl font-mono font-extrabold tracking-[0.3em] mt-1 text-emerald-200">{otpToast}</p>
                <p className="text-[10px] text-emerald-200/70 mt-2">
                  ℹ️ Demo Mode — Code shown here instead of inbox
                </p>
              </div>
              <button onClick={() => setOtpToast(null)} className="text-white/60 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="max-w-md w-full space-y-6 z-10"
      >
        {/* App Logo */}
        <div className="text-center mb-2">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-emerald-600/20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-900/30 border border-emerald-500/10">
            <Trophy className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">GGPL</h1>
          <p className="text-sm text-slate-400 mt-1">Cricket Score Tracker</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 space-y-6 shadow-2xl shadow-slate-950/80">
          {/* Tab Switcher - hide during forgot flow */}
          {!isForgotPhase && (
            <div className="flex bg-slate-950/60 border border-slate-800/50 rounded-2xl p-1 gap-1">
              <button
                type="button"
                onClick={() => { setMode('login'); resetToInfo(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <LogIn className="w-4 h-4" /> Login
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); resetToInfo(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  mode === 'signup'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <UserPlus className="w-4 h-4" /> Sign Up
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {phase === 'info' && (
              <motion.form
                key="info"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleAuthSubmit}
                className="space-y-4"
              >
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        autoFocus
                        value={name}
                        onChange={e => { setName(e.target.value); setError(''); }}
                        placeholder="e.g. Raman"
                        className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-300"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      autoFocus={mode === 'login'}
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder="your@email.com"
                      className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-300"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder={mode === 'signup' ? 'Min 4 characters' : '••••••••'}
                      className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                        placeholder="••••••••"
                        className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-300"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-400 font-medium text-center bg-rose-500/10 border border-rose-500/20 rounded-lg py-2 px-3">
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-900/30 transition-all duration-300 flex items-center justify-center gap-2 border border-emerald-400/20"
                >
                  {mode === 'login' ? 'Login' : 'Create Account'}
                </button>
              </motion.form>
            )}

            {/* ========== FORGOT PASSWORD FLOW ========== */}

            {phase === 'forgotOtp' && (
              <motion.div
                key="forgotOtp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="w-6 h-6 text-emerald-400 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Reset Password</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter the code sent to your email
                  </p>
                  <p className="text-sm font-mono font-bold text-emerald-400 mt-1 bg-emerald-950/30 border border-emerald-900/30 rounded-lg py-1 max-w-[200px] mx-auto">{maskedEmail}</p>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={enteredOtp}
                  onChange={e => { setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                  placeholder="Enter OTP"
                  className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-3.5 text-xl text-white text-center tracking-[0.5em] font-mono font-bold focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-300"
                  autoFocus
                />

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-400 font-medium text-center bg-rose-500/10 border border-rose-500/20 rounded-lg py-2 px-3">
                    {error}
                  </motion.p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="flex-1 py-3 text-xs text-slate-400 hover:text-white border border-slate-800 rounded-xl hover:bg-slate-850 transition-all font-semibold"
                  >
                    Resend Code
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={enteredOtp.length !== 4}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-900/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-400/20"
                  >
                    Verify Code
                  </button>
                </div>

                <button
                  type="button"
                  onClick={resetToInfo}
                  className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  ← Back to Login
                </button>
              </motion.div>
            )}

            {phase === 'forgotNewPassword' && (
              <motion.form
                key="forgotNewPassword"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleResetPassword}
                className="space-y-4"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Create New Password</h3>
                  <p className="text-xs text-slate-400 mt-1">Please enter your new password below</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setError(''); }}
                      placeholder="Min 4 characters"
                      className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-300"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={e => { setConfirmNewPassword(e.target.value); setError(''); }}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-300"
                    />
                  </div>
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-400 font-medium text-center bg-rose-500/10 border border-rose-500/20 rounded-lg py-2 px-3">
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-900/30 transition-all duration-300 border border-emerald-400/20"
                >
                  Reset & Login
                </button>

                <button
                  type="button"
                  onClick={resetToInfo}
                  className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  ← Cancel
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Guest Mode - hide during forgot flow */}
        {!isForgotPhase && (
          <button
            type="button"
            onClick={onGuest}
            className="w-full py-3 text-sm text-slate-400 hover:text-white transition-all duration-300 rounded-xl hover:bg-slate-900/40 border border-transparent hover:border-slate-850/60 backdrop-blur-sm"
          >
            Continue as Guest (View Only)
          </button>
        )}
      </motion.div>
    </div>
  );
}
