import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, KeyRound, Eye, EyeOff, LogIn, UserPlus, ArrowRight, Trophy } from 'lucide-react';
import { useApp } from '../store';
import type { User as UserType } from '../types';

const SESSION_KEY = 'ggpl-session';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Simple hash (not cryptographic — fine for local/friend group use)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const chr = pin.charCodeAt(i);
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
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('phone');
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [phase, setPhase] = useState<'info' | 'pin' | 'confirmPin'>('info');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  function handleDigit(idx: number, val: string, isConfirm = false) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const arr = isConfirm ? [...confirmPin] : [...pin];
    arr[idx] = digit;
    isConfirm ? setConfirmPin(arr) : setPin(arr);
    setError('');

    if (digit && idx < 3) {
      const refs = isConfirm ? confirmRefs : pinRefs;
      refs.current[idx + 1]?.focus();
    }

    // Auto-submit on last digit
    if (digit && idx === 3) {
      const fullPin = arr.join('');
      if (fullPin.length === 4) {
        setTimeout(() => {
          if (mode === 'signup' && !isConfirm) {
            setPhase('confirmPin');
            setTimeout(() => confirmRefs.current[0]?.focus(), 100);
          } else if (mode === 'signup' && isConfirm) {
            if (pin.join('') === arr.join('')) {
              handleSignup(pin.join(''));
            } else {
              setError('PINs do not match');
              setConfirmPin(['', '', '', '']);
              setTimeout(() => confirmRefs.current[0]?.focus(), 100);
            }
          } else {
            handleLogin(fullPin);
          }
        }, 150);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, idx: number, isConfirm = false) {
    if (e.key === 'Backspace') {
      const arr = isConfirm ? [...confirmPin] : [...pin];
      if (!arr[idx] && idx > 0) {
        const refs = isConfirm ? confirmRefs : pinRefs;
        refs.current[idx - 1]?.focus();
        arr[idx - 1] = '';
        isConfirm ? setConfirmPin(arr) : setPin(arr);
      }
    }
  }

  function handleInfoNext(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!identifier.trim()) {
      setError(`Please enter your ${identifierType}`);
      return;
    }

    // Check if user exists
    const existing = (state.users || []).find(u =>
      identifierType === 'email' ? u.email === identifier.trim().toLowerCase() : u.phone === identifier.trim()
    );

    if (mode === 'signup' && existing) {
      setError('Account already exists. Please login instead.');
      return;
    }
    if (mode === 'login' && !existing) {
      setError('No account found. Please sign up first.');
      return;
    }

    setError('');
    setPhase('pin');
    setTimeout(() => pinRefs.current[0]?.focus(), 100);
  }

  function handleSignup(pinStr: string) {
    const id = uid();
    const user: UserType = {
      id,
      name: name.trim(),
      ...(identifierType === 'email' ? { email: identifier.trim().toLowerCase() } : { phone: identifier.trim() }),
      pinHash: hashPin(pinStr),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_USER', payload: user });
    setSession(id, user.name);
    onLogin(id, user.name);
  }

  function handleLogin(pinStr: string) {
    const user = (state.users || []).find(u =>
      identifierType === 'email' ? u.email === identifier.trim().toLowerCase() : u.phone === identifier.trim()
    );
    if (!user) {
      setError('Account not found');
      return;
    }
    if (user.pinHash !== hashPin(pinStr)) {
      setError('Incorrect PIN');
      setPin(['', '', '', '']);
      setTimeout(() => pinRefs.current[0]?.focus(), 100);
      return;
    }
    setSession(user.id, user.name);
    onLogin(user.id, user.name);
  }

  function renderPinInputs(values: string[], refs: React.MutableRefObject<(HTMLInputElement | null)[]>, isConfirm = false) {
    return (
      <div className="flex gap-3 justify-center">
        {values.map((v, i) => (
          <input
            key={i}
            ref={el => { refs.current[i] = el; }}
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={1}
            value={v}
            onChange={e => handleDigit(i, e.target.value, isConfirm)}
            onKeyDown={e => handleKeyDown(e, i, isConfirm)}
            className="w-14 h-14 text-center text-2xl font-bold text-white bg-slate-800/80 border-2 border-slate-700/60 rounded-xl focus:outline-none focus:border-emerald-500 transition-all caret-emerald-400"
            autoComplete="off"
          />
        ))}
      </div>
    );
  }

  function resetToInfo() {
    setPhase('info');
    setPin(['', '', '', '']);
    setConfirmPin(['', '', '', '']);
    setError('');
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="max-w-sm w-full space-y-6"
      >
        {/* App Logo */}
        <div className="text-center mb-2">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-emerald-600/20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-900/30 border border-emerald-500/10">
            <Trophy className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">GGPL</h1>
          <p className="text-sm text-slate-400 mt-1">Cricket Score Tracker</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/80 border border-slate-800/60 rounded-3xl p-6 space-y-5 shadow-2xl shadow-slate-900/50">
          {/* Tab Switcher */}
          <div className="flex bg-slate-800/50 rounded-xl p-1 gap-1">
            <button
              onClick={() => { setMode('login'); resetToInfo(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                mode === 'login' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Login
            </button>
            <button
              onClick={() => { setMode('signup'); resetToInfo(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                mode === 'signup' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Sign Up
            </button>
          </div>

          <AnimatePresence mode="wait">
            {phase === 'info' && (
              <motion.form
                key="info"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleInfoNext}
                className="space-y-4"
              >
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        autoFocus
                        value={name}
                        onChange={e => { setName(e.target.value); setError(''); }}
                        placeholder="e.g. Raman"
                        className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Identifier Type Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-400">
                      {identifierType === 'email' ? 'Email' : 'Phone Number'}
                    </label>
                    <button
                      type="button"
                      onClick={() => { setIdentifierType(identifierType === 'email' ? 'phone' : 'email'); setIdentifier(''); setError(''); }}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                    >
                      Use {identifierType === 'email' ? 'Phone' : 'Email'} instead
                    </button>
                  </div>
                  <div className="relative">
                    {identifierType === 'email' ? (
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    ) : (
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    )}
                    <input
                      autoFocus={mode === 'login'}
                      type={identifierType === 'email' ? 'email' : 'tel'}
                      value={identifier}
                      onChange={e => { setIdentifier(e.target.value); setError(''); }}
                      placeholder={identifierType === 'email' ? 'your@email.com' : '9876543210'}
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-400 font-medium text-center">
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-900/40 transition-all flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.form>
            )}

            {phase === 'pin' && (
              <motion.div
                key="pin"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-sm text-slate-300 font-medium">
                    {mode === 'signup' ? 'Create a 4-digit PIN' : 'Enter your PIN'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{identifier}</p>
                </div>

                {renderPinInputs(pin, pinRefs)}

                <button
                  onClick={() => setShowPin(!showPin)}
                  className="flex items-center gap-1.5 mx-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPin ? 'Hide' : 'Show'} PIN
                </button>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-400 font-medium text-center">
                    {error}
                  </motion.p>
                )}

                <button onClick={resetToInfo} className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors">
                  ← Back
                </button>
              </motion.div>
            )}

            {phase === 'confirmPin' && (
              <motion.div
                key="confirmPin"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-emerald-400 font-medium mb-2">
                    <KeyRound className="w-4 h-4" /> Confirm your PIN
                  </div>
                  <p className="text-xs text-slate-500">Re-enter the same 4 digits</p>
                </div>

                {renderPinInputs(confirmPin, confirmRefs, true)}

                <button
                  onClick={() => setShowPin(!showPin)}
                  className="flex items-center gap-1.5 mx-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPin ? 'Hide' : 'Show'} PIN
                </button>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-400 font-medium text-center">
                    {error}
                  </motion.p>
                )}

                <button onClick={() => { setPhase('pin'); setPin(['', '', '', '']); setConfirmPin(['', '', '', '']); setError(''); }}
                  className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors">
                  ← Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Guest Mode */}
        <button
          onClick={onGuest}
          className="w-full py-3 text-sm text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60"
        >
          Continue as Guest (View Only)
        </button>
      </motion.div>
    </div>
  );
}
