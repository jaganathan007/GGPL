import { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Trophy, X, ShieldCheck, CheckCircle, Send, Loader2 } from 'lucide-react';
import { useApp } from '../store';
import type { User as UserType } from '../types';

const SESSION_KEY = 'ggpl-session';

// ── EmailJS configuration ──────────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = 'service_w6agefd';
const EMAILJS_TEMPLATE_ID = 'template_2m5zl23';
const EMAILJS_PUBLIC_KEY  = 'CBjWh32MQ43qg95kh';

// Sends OTP email via EmailJS (no backend needed)
async function sendOtpEmail(
  to_email: string,
  to_name: string,
  otp_code: string,
): Promise<{ ok: boolean }> {
  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        email:    to_email,   // matches {{email}} in template (To Email field)
        name:     to_name,    // matches {{name}} in template
        passcode: otp_code,   // matches {{passcode}} in template
        time:     '10 minutes', // matches {{time}} in template
      },
      EMAILJS_PUBLIC_KEY,
    );
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

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

  // Form fields
  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [phase, setPhase]             = useState<'info' | 'forgotOtp' | 'forgotNewPassword'>('info');
  const [error, setError]             = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sendingOtp, setSendingOtp]   = useState(false);
  const [otpSentInfo, setOtpSentInfo] = useState<string | null>(null);

  // Forgot password state
  const [generatedOtp, setGeneratedOtp]           = useState('');
  const [enteredOtp, setEnteredOtp]               = useState('');
  const [newPassword, setNewPassword]             = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Auto-login if session exists
  useEffect(() => {
    const session = getSession();
    if (session) {
      const user = (state.users || []).find(u => u.id === session.userId);
      if (user) onLogin(user.id, user.name);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Send OTP via EmailJS ───────────────────────────────────────────────
  async function handleSendOtp() {
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      setError('Please enter your email address first');
      return;
    }
    const existing = (state.users || []).find(u => u.email?.toLowerCase() === emailTrimmed);
    if (!existing) {
      setError('No account found with this email address.');
      return;
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otp);
    setEnteredOtp('');
    setError('');
    setSendingOtp(true);

    // ── Send via EmailJS ──────────────────────────────────────────────────
    const result = await sendOtpEmail(emailTrimmed, existing.name, otp);
    setSendingOtp(false);

    if (result.ok) {
      setPhase('forgotOtp');
      setOtpSentInfo(emailTrimmed);
    } else {
      setError('Failed to send email. Please try again.');
    }
  }

  function handleVerifyOtp() {
    if (enteredOtp.trim() === generatedOtp) {
      setPhase('forgotNewPassword');
      setError('');
    } else {
      setError('Invalid code. Please try again.');
      setEnteredOtp('');
    }
  }

  function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 4) { setError('Password must be at least 4 characters'); return; }
    if (newPassword !== confirmNewPassword) { setError('Passwords do not match'); return; }

    const user = (state.users || []).find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
    if (user) {
      dispatch({ type: 'UPDATE_USER', payload: { ...user, passwordHash: hashPassword(newPassword) } });
      setSession(user.id, user.name);
      onLogin(user.id, user.name);
    } else {
      setError('Something went wrong. Please try again.');
    }
  }

  function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const emailTrimmed = email.trim().toLowerCase();

    if (!emailTrimmed) { setError('Please enter your email address'); return; }

    if (mode === 'signup') {
      if (!name.trim()) { setError('Please enter your name'); return; }
      if (password.length < 4) { setError('Password must be at least 4 characters'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match'); return; }

      const existing = (state.users || []).find(u => u.email?.toLowerCase() === emailTrimmed);
      if (existing) { setError('Account already exists. Please login instead.'); return; }

      const id   = uid();
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
      const user = (state.users || []).find(u => u.email?.toLowerCase() === emailTrimmed);
      if (!user)                                          { setError('No account found. Please sign up first.'); return; }
      if (user.passwordHash !== hashPassword(password))  { setError('Incorrect password. Please try again.'); return; }
      setSession(user.id, user.name);
      onLogin(user.id, user.name);
    }
  }

  function resetToInfo() {
    setPhase('info');
    setError('');
    setGeneratedOtp('');
    setEnteredOtp('');
    setOtpSentInfo(null);
    setPassword('');
    setConfirmPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  }

  const isForgotPhase = phase === 'forgotOtp' || phase === 'forgotNewPassword';
  // Show as partially masked e.g. ra****@gmail.com
  const maskedEmail   = email.replace(/(.{2}).+(@.+)/, '$1****$2');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/8 rounded-full blur-3xl pointer-events-none" />


      {/* ── Email sent success banner ── */}
      <AnimatePresence>
        {otpSentInfo && (
          <motion.div
            initial={{ opacity: 0, y: -60, x: '-50%' }}
            animate={{ opacity: 1, y: 0,   x: '-50%' }}
            exit={{ opacity: 0,   y: -60, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] w-[92%] max-w-sm"
          >
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 backdrop-blur-xl border border-emerald-400/30 text-white px-5 py-4 rounded-2xl shadow-2xl shadow-emerald-950/60">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 animate-bounce">
                  <Send className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-100 mb-1">Verification email sent!</p>
                  <p className="text-sm text-white/95 font-medium">Check your inbox at</p>
                  <p className="text-sm font-mono font-bold text-emerald-200 mt-0.5 break-all">{otpSentInfo}</p>
                  <p className="text-[10px] text-emerald-200/60 mt-1">Didn't receive it? Check your spam folder.</p>
                </div>
                <button onClick={() => setOtpSentInfo(null)} className="text-white/60 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="max-w-md w-full space-y-5 z-10"
      >
        {/* Logo */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 bg-gradient-to-br from-emerald-500/25 via-teal-500/15 to-emerald-600/20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-950/40 border border-emerald-500/10"
          >
            <Trophy className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent tracking-tight">GGPL</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Cricket Score Tracker</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/70 rounded-3xl p-7 shadow-2xl shadow-slate-950/60">

          {/* Tab switcher — hidden during forgot flow */}
          {!isForgotPhase && (
            <div className="flex bg-slate-950/70 border border-slate-800/60 rounded-2xl p-1 gap-1 mb-6">
              {(['login', 'signup'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); resetToInfo(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    mode === m
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'login' ? <><LogIn className="w-4 h-4" /> Login</> : <><UserPlus className="w-4 h-4" /> Sign Up</>}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ════════════ MAIN AUTH FORM ════════════ */}
            {phase === 'info' && (
              <motion.form
                key="info"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                onSubmit={handleAuthSubmit}
                className="space-y-4"
              >
                {mode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input
                        type="text"
                        autoFocus
                        value={name}
                        onChange={e => { setName(e.target.value); setError(''); }}
                        placeholder="e.g. Raman"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      type="email"
                      autoFocus={mode === 'login'}
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder="your@email.com"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingOtp}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors disabled:opacity-50"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder={mode === 'signup' ? 'Min 4 characters' : '••••••••'}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                        placeholder="••••••••"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs text-rose-400 font-medium text-center bg-rose-500/10 border border-rose-500/20 rounded-lg py-2 px-3">
                    {error}
                  </motion.p>
                )}

                <button type="submit"
                  className="w-full py-3.5 mt-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-900/30 active:scale-[0.98] transition-all duration-200 border border-emerald-400/20">
                  {mode === 'login' ? 'Login' : 'Create Account'}
                </button>
              </motion.form>
            )}

            {/* ════════════ OTP VERIFY ════════════ */}
            {phase === 'forgotOtp' && (
              <motion.div
                key="forgotOtp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Check Your Inbox</h3>
                  {otpSentInfo ? (
                    <p className="text-sm text-slate-400">
                      We sent a 4-digit verification code to<br />
                      <span className="font-mono font-bold text-emerald-400">{maskedEmail}</span>
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Enter Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={enteredOtp}
                    onChange={e => { setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                    placeholder="• • • •"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-4 text-2xl text-white text-center tracking-[0.6em] font-mono font-bold focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    autoFocus
                  />
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs text-rose-400 font-medium text-center bg-rose-500/10 border border-rose-500/20 rounded-lg py-2 px-3">
                    {error}
                  </motion.p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    className="flex-1 py-3 text-xs text-slate-400 hover:text-white border border-slate-800 rounded-xl hover:bg-slate-800/50 transition-all font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {sendingOtp ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</> : 'Resend Code'}
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={enteredOtp.length !== 4}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-400/20"
                  >
                    Verify Code
                  </button>
                </div>

                <button type="button" onClick={resetToInfo}
                  className="w-full py-2 text-sm text-slate-500 hover:text-white transition-colors">
                  ← Back to Login
                </button>
              </motion.div>
            )}

            {/* ════════════ NEW PASSWORD ════════════ */}
            {phase === 'forgotNewPassword' && (
              <motion.form
                key="forgotNewPassword"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleResetPassword}
                className="space-y-4"
              >
                <div className="text-center space-y-1">
                  <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-1">
                    <CheckCircle className="w-7 h-7 text-emerald-400" />
                  </div>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">✓ Code Verified</p>
                  <h3 className="text-lg font-bold text-white">Set New Password</h3>
                  <p className="text-xs text-slate-400">Choose a new password for your account</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setError(''); }}
                      placeholder="Min 4 characters"
                      autoFocus
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={e => { setConfirmNewPassword(e.target.value); setError(''); }}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs text-rose-400 font-medium text-center bg-rose-500/10 border border-rose-500/20 rounded-lg py-2 px-3">
                    {error}
                  </motion.p>
                )}

                <button type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-900/30 active:scale-[0.98] transition-all duration-200 border border-emerald-400/20">
                  Reset Password &amp; Login
                </button>
                <button type="button" onClick={resetToInfo}
                  className="w-full py-2 text-sm text-slate-500 hover:text-white transition-colors">
                  ← Cancel
                </button>
              </motion.form>
            )}

          </AnimatePresence>
        </div>

        {/* Guest mode */}
        {!isForgotPhase && (
          <button type="button" onClick={onGuest}
            className="w-full py-3 text-sm text-slate-500 hover:text-white transition-all rounded-xl hover:bg-slate-900/40 border border-transparent hover:border-slate-800/50">
            Continue as Guest (View Only)
          </button>
        )}
      </motion.div>
    </div>
  );
}
