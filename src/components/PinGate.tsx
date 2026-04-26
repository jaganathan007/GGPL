import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck, KeyRound, Eye, EyeOff } from 'lucide-react';

const PIN_STORAGE_KEY = 'ggpl-admin-pin';

export function getStoredPin(): string | null {
  return localStorage.getItem(PIN_STORAGE_KEY);
}

export function setStoredPin(pin: string) {
  localStorage.setItem(PIN_STORAGE_KEY, pin);
}

interface PinGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PinGate({ onSuccess, onCancel }: PinGateProps) {
  const existingPin = getStoredPin();
  const isSetup = !existingPin;

  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [phase, setPhase] = useState<'enter' | 'confirm'>(isSetup ? 'enter' : 'enter');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleDigit(idx: number, val: string, isConfirm = false) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const arr = isConfirm ? [...confirmPin] : [...pin];
    arr[idx] = digit;
    isConfirm ? setConfirmPin(arr) : setPin(arr);
    setError('');

    if (digit && idx < 3) {
      const refs = isConfirm ? confirmRefs : inputRefs;
      refs.current[idx + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (digit && idx === 3) {
      const fullPin = arr.join('');
      if (fullPin.length === 4) {
        setTimeout(() => {
          if (isSetup && !isConfirm) {
            // Move to confirm phase
            setPhase('confirm');
            setTimeout(() => confirmRefs.current[0]?.focus(), 100);
          } else if (isSetup && isConfirm) {
            // Confirm PIN matches
            if (pin.join('') === arr.join('')) {
              setStoredPin(pin.join(''));
              onSuccess();
            } else {
              setError('PINs do not match. Try again.');
              setConfirmPin(['', '', '', '']);
              setTimeout(() => confirmRefs.current[0]?.focus(), 100);
            }
          } else {
            // Verify against stored PIN
            if (fullPin === existingPin) {
              onSuccess();
            } else {
              setError('Incorrect PIN. Try again.');
              setPin(['', '', '', '']);
              setTimeout(() => inputRefs.current[0]?.focus(), 100);
            }
          }
        }, 150);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, idx: number, isConfirm = false) {
    if (e.key === 'Backspace') {
      const arr = isConfirm ? [...confirmPin] : [...pin];
      if (!arr[idx] && idx > 0) {
        const refs = isConfirm ? confirmRefs : inputRefs;
        refs.current[idx - 1]?.focus();
        arr[idx - 1] = '';
        isConfirm ? setConfirmPin(arr) : setPin(arr);
      }
    }
    if (e.key === 'Escape') onCancel();
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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-slate-900/80 border border-slate-800/60 rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl shadow-slate-900/50"
      >
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {isSetup ? (
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            ) : (
              <Lock className="w-8 h-8 text-emerald-400" />
            )}
          </div>
          <h2 className="text-lg font-bold text-white">
            {isSetup ? 'Set Admin PIN' : 'Enter Admin PIN'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isSetup
              ? phase === 'enter'
                ? 'Create a 4-digit PIN to protect scoring access'
                : 'Re-enter your PIN to confirm'
              : 'Only authorized users can edit match scores'}
          </p>
        </div>

        {/* PIN Input */}
        {phase === 'enter' && renderPinInputs(pin, inputRefs)}
        {phase === 'confirm' && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-medium">
              <KeyRound className="w-3.5 h-3.5" /> Confirm your PIN
            </div>
            {renderPinInputs(confirmPin, confirmRefs, true)}
          </div>
        )}

        {/* Show/Hide toggle */}
        <button
          onClick={() => setShowPin(!showPin)}
          className="flex items-center gap-1.5 mx-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showPin ? 'Hide' : 'Show'} PIN
        </button>

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
    </div>
  );
}
