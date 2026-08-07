import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, Smartphone, MessageSquare, X, KeyRound, ShieldCheck } from 'lucide-react';

const PIN_STORAGE_KEY = 'ggpl-admin-pin';
const DEFAULT_ADMIN_PIN = '9786';
export const ADMIN_PHONE = '9360917166';

export function getStoredPin(): string {
  try {
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    return stored || DEFAULT_ADMIN_PIN;
  } catch {
    return DEFAULT_ADMIN_PIN;
  }
}

export function setStoredPin(pin: string) {
  try {
    localStorage.setItem(PIN_STORAGE_KEY, pin);
  } catch { /* ignore */ }
}

interface PinGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PinGate({ onSuccess, onCancel }: PinGateProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Forgot PIN state
  const [forgotPhase, setForgotPhase] = useState<'none' | 'otp_send' | 'otp_verify' | 'new_pin' | 'confirm_pin'>('none');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpToast, setOtpToast] = useState<string | null>(null);
  const otpToastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [forgotPin, setForgotPin] = useState(['', '', '', '']);
  const [forgotConfirmPin, setForgotConfirmPin] = useState(['', '', '', '']);
  const forgotPinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const forgotConfirmPinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (forgotPhase === 'none') {
      inputRefs.current[0]?.focus();
    }
  }, [forgotPhase]);

  // --- Normal PIN handler ---
  function handleDigit(idx: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const arr = [...pin];
    arr[idx] = digit;
    setPin(arr);
    setError('');

    if (digit && idx < 3) {
      inputRefs.current[idx + 1]?.focus();
    }

    if (digit && idx === 3) {
      const fullPin = arr.join('');
      if (fullPin.length === 4) {
        setTimeout(() => {
          if (fullPin === getStoredPin()) {
            onSuccess();
          } else {
            setError('Incorrect PIN. Try again.');
            setPin(['', '', '', '']);
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
          }
        }, 150);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'Backspace') {
      const arr = [...pin];
      if (!arr[idx] && idx > 0) {
        inputRefs.current[idx - 1]?.focus();
        arr[idx - 1] = '';
        setPin(arr);
      }
    }
    if (e.key === 'Escape') onCancel();
  }

  // --- Forgot PIN handlers ---
  function handleForgotDigit(idx: number, val: string, isConfirm = false) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const arr = isConfirm ? [...forgotConfirmPin] : [...forgotPin];
    arr[idx] = digit;
    isConfirm ? setForgotConfirmPin(arr) : setForgotPin(arr);
    setError('');

    const refs = isConfirm ? forgotConfirmPinRefs : forgotPinRefs;
    if (digit && idx < 3) {
      refs.current[idx + 1]?.focus();
    }

    if (digit && idx === 3) {
      const fullPin = arr.join('');
      if (fullPin.length === 4) {
        setTimeout(() => {
          if (!isConfirm) {
            // Move to confirm phase
            setForgotPhase('confirm_pin');
            setTimeout(() => forgotConfirmPinRefs.current[0]?.focus(), 100);
          } else {
            // Check if pins match
            if (forgotPin.join('') === fullPin) {
              setStoredPin(fullPin);
              setOtpToast(null);
              onSuccess();
            } else {
              setError('PINs do not match. Try again.');
              setForgotConfirmPin(['', '', '', '']);
              setTimeout(() => forgotConfirmPinRefs.current[0]?.focus(), 100);
            }
          }
        }, 150);
      }
    }
  }

  function handleForgotKeyDown(e: React.KeyboardEvent, idx: number, isConfirm = false) {
    if (e.key === 'Backspace') {
      const arr = isConfirm ? [...forgotConfirmPin] : [...forgotPin];
      if (!arr[idx] && idx > 0) {
        const refs = isConfirm ? forgotConfirmPinRefs : forgotPinRefs;
        refs.current[idx - 1]?.focus();
        arr[idx - 1] = '';
        isConfirm ? setForgotConfirmPin(arr) : setForgotPin(arr);
      }
    }
  }

  function handleSendOtp() {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otp);
    setEnteredOtp('');
    setForgotPhase('otp_verify');
    setError('');
    setOtpToast(otp);
    if (otpToastTimer.current) clearTimeout(otpToastTimer.current);
    otpToastTimer.current = setTimeout(() => setOtpToast(null), 15000);
  }

  function handleVerifyOtp() {
    if (enteredOtp === generatedOtp) {
      setForgotPhase('new_pin');
      setError('');
      setTimeout(() => forgotPinRefs.current[0]?.focus(), 100);
    } else {
      setError('Invalid OTP. Please try again.');
      setEnteredOtp('');
    }
  }

  function resetForgotState() {
    setForgotPhase('none');
    setGeneratedOtp('');
    setEnteredOtp('');
    setOtpToast(null);
    setForgotPin(['', '', '', '']);
    setForgotConfirmPin(['', '', '', '']);
    setError('');
  }

  function renderForgotPinInputs(values: string[], refs: React.MutableRefObject<(HTMLInputElement | null)[]>, isConfirm = false) {
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
            onChange={e => handleForgotDigit(i, e.target.value, isConfirm)}
            onKeyDown={e => handleForgotKeyDown(e, i, isConfirm)}
            className="w-14 h-14 text-center text-2xl font-bold text-white bg-slate-800/80 border-2 border-slate-700/60 rounded-xl focus:outline-none focus:border-emerald-500 transition-all caret-emerald-400"
            autoComplete="off"
          />
        ))}
      </div>
    );
  }

  const formattedPhone = ADMIN_PHONE.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      {/* OTP Toast */}
      <AnimatePresence>
        {otpToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-900/50 border border-emerald-400/30 max-w-sm w-[90%]"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1">SMS sent to {formattedPhone}</p>
                <p className="text-sm text-white/90">Your OTP is:</p>
                <p className="text-3xl font-mono font-extrabold tracking-[0.3em] mt-1">{otpToast}</p>
                <p className="text-[10px] text-emerald-200/60 mt-2">⚠ Demo mode — OTP shown here instead of SMS</p>
              </div>
              <button onClick={() => setOtpToast(null)} className="text-white/60 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-slate-900/80 border border-slate-800/60 rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl shadow-slate-900/50"
      >
        <AnimatePresence mode="wait">
          {forgotPhase === 'none' ? (
            <motion.div key="normal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Enter Admin PIN</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Only authorized users can edit match scores
                </p>
              </div>

              {/* PIN Input */}
              <div className="flex gap-3 justify-center">
                {pin.map((v, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={1}
                    value={v}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(e, i)}
                    className="w-14 h-14 text-center text-2xl font-bold text-white bg-slate-800/80 border-2 border-slate-700/60 rounded-xl focus:outline-none focus:border-emerald-500 transition-all caret-emerald-400"
                    autoComplete="off"
                  />
                ))}
              </div>

              {/* Action options */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowPin(!showPin)}
                  className="flex items-center gap-1.5 mx-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPin ? 'Hide' : 'Show'} PIN
                </button>
                <button
                  onClick={() => setForgotPhase('otp_send')}
                  className="text-center text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors mt-1"
                >
                  Forgot PIN?
                </button>
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-xs text-rose-400 font-medium"
                >
                  {error}
                </motion.p>
              )}

              {/* Cancel */}
              <button
                onClick={onCancel}
                className="w-full py-2.5 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
              >
                Cancel
              </button>

            </motion.div>
          ) : forgotPhase === 'otp_send' ? (
            <motion.div key="otp_send" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-amber-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Reset Admin PIN</h2>
                <p className="text-xs text-slate-400 mt-1">Verify your identity to reset the PIN</p>
              </div>
              <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-4 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center mx-auto">
                  <Smartphone className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">OTP will be sent to</p>
                  <p className="text-lg font-mono font-bold text-white tracking-wider">{formattedPhone}</p>
                </div>
                <p className="text-[10px] text-slate-500">A 4-digit verification code will be sent to this number</p>
              </div>
              <button onClick={handleSendOtp}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-900/40 transition-all flex items-center justify-center gap-2">
                <MessageSquare className="w-4 h-4" /> Send OTP
              </button>
              <button onClick={resetForgotState}
                className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors">
                ← Back to PIN Entry
              </button>
            </motion.div>
          ) : forgotPhase === 'otp_verify' ? (
            <motion.div key="otp_verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-base font-bold text-white">Enter Verification Code</h2>
                <p className="text-xs text-slate-400 mt-1">OTP sent to <span className="text-emerald-400 font-mono font-bold">{formattedPhone}</span></p>
              </div>
              <input type="text" inputMode="numeric" maxLength={4} value={enteredOtp}
                onChange={e => { setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                placeholder="Enter 4-digit OTP"
                className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-3 text-lg text-white text-center tracking-[0.5em] font-mono font-bold focus:outline-none focus:border-emerald-500/50" autoFocus />
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-400 font-medium text-center">{error}</motion.p>
              )}
              <div className="flex gap-2">
                <button onClick={handleSendOtp}
                  className="flex-1 py-2.5 text-xs text-slate-400 hover:text-white border border-slate-700/50 rounded-xl hover:bg-slate-800/50 transition-all font-semibold">
                  Resend OTP
                </button>
                <button onClick={handleVerifyOtp}
                  disabled={enteredOtp.length !== 4}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  Verify
                </button>
              </div>
              <button onClick={resetForgotState}
                className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors">
                ← Back to PIN Entry
              </button>
            </motion.div>
          ) : forgotPhase === 'new_pin' ? (
            <motion.div key="new_pin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-xs text-emerald-400 font-semibold mb-2">✓ OTP Verified</p>
                <h2 className="text-base font-bold text-white">Create New Admin PIN</h2>
                <p className="text-xs text-slate-400 mt-1">Enter a new 4-digit PIN</p>
              </div>
              {renderForgotPinInputs(forgotPin, forgotPinRefs)}
              <button
                onClick={() => setShowPin(!showPin)}
                className="flex items-center gap-1.5 mx-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPin ? 'Hide' : 'Show'} PIN
              </button>
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-400 font-medium text-center">{error}</motion.p>
              )}
              <button onClick={resetForgotState}
                className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors">
                ← Cancel
              </button>
            </motion.div>
          ) : (
            <motion.div key="confirm_pin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-emerald-400 font-medium mb-2">
                  <KeyRound className="w-4 h-4" /> Confirm your new PIN
                </div>
                <p className="text-xs text-slate-500">Re-enter the same 4 digits</p>
              </div>
              {renderForgotPinInputs(forgotConfirmPin, forgotConfirmPinRefs, true)}
              <button
                onClick={() => setShowPin(!showPin)}
                className="flex items-center gap-1.5 mx-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPin ? 'Hide' : 'Show'} PIN
              </button>
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-400 font-medium text-center">{error}</motion.p>
              )}
              <button onClick={() => { setForgotPhase('new_pin'); setForgotPin(['', '', '', '']); setForgotConfirmPin(['', '', '', '']); setError(''); }}
                className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors">
                ← Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
