import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, MapPin, LogOut, Edit3, Save, X, 
  AlertTriangle, CheckCircle2, ShieldCheck, KeyRound, Loader2, 
  RotateCw, Smartphone
} from 'lucide-react';
import { useApp } from '../store';
import type { User as UserType } from '../types';
import { sendSmsOtp } from '../utils/sms';

interface ProfileViewProps {
  currentUserId: string;
  currentUserName: string;
  onLogout: () => void;
}

type VerificationFlow = 
  | 'none'
  | 'initial_input'
  | 'initial_otp'
  | 'change_old_otp'
  | 'change_new_input'
  | 'change_new_otp';

export default function ProfileView({ currentUserId, currentUserName, onLogout }: ProfileViewProps) {
  const { state, dispatch } = useApp();

  const currentUser: UserType | undefined = (state.users || []).find(u => u.id === currentUserId);

  // Profile basic editing
  const [editing, setEditing] = useState(false);
  const [location, setLocation] = useState(currentUser?.location || '');
  const [saved, setSaved] = useState(false);

  // Mobile Verification Flow State
  const [flow, setFlow] = useState<VerificationFlow>('none');
  const [phoneInput, setPhoneInput] = useState('');
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [expectedOtp, setExpectedOtp] = useState('');
  const [flowError, setFlowError] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulatedInfo, setSimulatedInfo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const hasVerifiedPhone = Boolean(currentUser?.phone && currentUser?.phoneVerified);
  const initials = currentUserName ? currentUserName.charAt(0).toUpperCase() : 'U';
  const memberSince = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  function generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  function maskPhone(p?: string) {
    if (!p) return '';
    const digits = p.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `+91 ******${digits.slice(-4)}`;
    }
    return p;
  }

  // Save location / general profile info
  function handleSaveProfile() {
    if (currentUser) {
      dispatch({
        type: 'UPDATE_USER',
        payload: { ...currentUser, location: location.trim() || undefined },
      });
    }
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleCancelProfileEdit() {
    setLocation(currentUser?.location || '');
    setEditing(false);
  }

  function resetFlow() {
    setFlow('none');
    setPhoneInput('');
    setNewPhoneInput('');
    setOtpInput('');
    setExpectedOtp('');
    setFlowError('');
    setLoading(false);
    setSimulatedInfo(null);
  }

  // --- FLOW 1: Initial Phone Verification ---
  async function handleStartInitialVerification() {
    const raw = (phoneInput || currentUser?.phone || '').replace(/\D/g, '').slice(-10);
    if (raw.length !== 10) {
      setFlowError('Please enter a valid 10-digit mobile number');
      return;
    }
    setFlowError('');
    setLoading(true);
    const otp = generateOtp();
    setExpectedOtp(otp);

    const res = await sendSmsOtp(raw, otp);
    setLoading(false);

    if (res.ok) {
      setFlow('initial_otp');
      setResendCooldown(30);
      if (res.simulated || res.devOtp) {
        setSimulatedInfo(`Test/Dev Mode: Your OTP code is ${res.devOtp || otp}`);
      }
    } else {
      setFlowError(res.error || 'Failed to send SMS OTP. Please try again.');
    }
  }

  function handleConfirmInitialOtp() {
    if (otpInput.trim() !== expectedOtp.trim()) {
      setFlowError('Invalid verification code. Please check and try again.');
      return;
    }

    const cleanPhone = (phoneInput || currentUser?.phone || '').replace(/\D/g, '').slice(-10);
    if (currentUser) {
      dispatch({
        type: 'UPDATE_USER',
        payload: {
          ...currentUser,
          phone: cleanPhone,
          phoneVerified: true,
        },
      });
    }

    resetFlow();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // --- FLOW 2: Change Existing Mobile Number ---
  async function handleStartChangePhone() {
    if (!currentUser?.phone) return;
    setFlowError('');
    setLoading(true);
    const otp = generateOtp();
    setExpectedOtp(otp);

    const res = await sendSmsOtp(currentUser.phone, otp);
    setLoading(false);

    if (res.ok) {
      setFlow('change_old_otp');
      setResendCooldown(30);
      if (res.simulated || res.devOtp) {
        setSimulatedInfo(`Test/Dev Mode: Authorization code for current phone is ${res.devOtp || otp}`);
      }
    } else {
      setFlowError(res.error || 'Could not send verification SMS to current number.');
    }
  }

  function handleVerifyOldOtp() {
    if (otpInput.trim() !== expectedOtp.trim()) {
      setFlowError('Invalid authorization code.');
      return;
    }
    // Old number verified! Move to step 2: Enter new phone
    setFlowError('');
    setOtpInput('');
    setSimulatedInfo(null);
    setFlow('change_new_input');
  }

  async function handleSendOtpToNewPhone() {
    const cleanNew = newPhoneInput.replace(/\D/g, '').slice(-10);
    const cleanOld = (currentUser?.phone || '').replace(/\D/g, '').slice(-10);

    if (cleanNew.length !== 10) {
      setFlowError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (cleanNew === cleanOld) {
      setFlowError('The new mobile number must be different from your current number');
      return;
    }

    setFlowError('');
    setLoading(true);
    const otp = generateOtp();
    setExpectedOtp(otp);

    const res = await sendSmsOtp(cleanNew, otp);
    setLoading(false);

    if (res.ok) {
      setFlow('change_new_otp');
      setResendCooldown(30);
      if (res.simulated || res.devOtp) {
        setSimulatedInfo(`Test/Dev Mode: Verification code for new phone is ${res.devOtp || otp}`);
      }
    } else {
      setFlowError(res.error || 'Failed to send SMS to new number.');
    }
  }

  function handleVerifyNewPhoneOtp() {
    if (otpInput.trim() !== expectedOtp.trim()) {
      setFlowError('Invalid verification code.');
      return;
    }

    const cleanNew = newPhoneInput.replace(/\D/g, '').slice(-10);
    if (currentUser) {
      dispatch({
        type: 'UPDATE_USER',
        payload: {
          ...currentUser,
          phone: cleanNew,
          phoneVerified: true,
        },
      });
    }

    resetFlow();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

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
          {/* Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-3 text-white text-3xl font-bold shadow-xl shadow-cyan-900/30 relative z-10">
            {initials}
          </div>

          <h2 className="text-xl font-extrabold text-white relative z-10">{currentUserName}</h2>
          {memberSince && (
            <p className="text-xs text-slate-500 mt-1 relative z-10">Member since {memberSince}</p>
          )}

          {/* Mobile missing / unverified warning */}
          {!hasVerifiedPhone && (
            <div className="mt-3 mx-auto max-w-sm bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 flex items-start gap-2 text-left relative z-10">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-amber-300 font-semibold">
                  Mobile Number Verification Required
                </p>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  Verify your mobile number via SMS OTP to create matches and enable phone login.
                </p>
              </div>
            </div>
          )}

          {/* Save success */}
          {saved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 mx-auto max-w-xs bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2 justify-center relative z-10"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-emerald-300 font-semibold">Profile updated & verified!</p>
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
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address</p>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.2 rounded">Primary</span>
              </div>
              <p className="text-sm font-semibold text-white truncate">{currentUser?.email || '—'}</p>
              {hasVerifiedPhone && (
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" /> Connected with verified mobile
                </p>
              )}
            </div>
          </div>

          {/* Mobile Number with OTP Verification Status */}
          <div className="flex items-start gap-3 px-5 py-4">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
              hasVerifiedPhone ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-amber-500/10 border border-amber-500/20'
            }`}>
              <Phone className={`w-4 h-4 ${hasVerifiedPhone ? 'text-emerald-400' : 'text-amber-400'}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mobile Number</p>
                  {hasVerifiedPhone ? (
                    <span className="flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" /> Unverified
                    </span>
                  )}
                </div>
              </div>

              {hasVerifiedPhone ? (
                <div>
                  <p className="text-sm font-semibold text-white tracking-wide">
                    +91 {currentUser?.phone}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    You can log in using either this number or your email.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      resetFlow();
                      handleStartChangePhone();
                    }}
                    className="mt-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Change Mobile Number
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-400 italic mb-2">
                    {currentUser?.phone ? `+91 ${currentUser.phone} (Pending OTP)` : 'No mobile number connected'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      resetFlow();
                      setPhoneInput(currentUser?.phone || '');
                      setFlow('initial_input');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-950/40"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{currentUser?.phone ? 'Verify Mobile with OTP' : 'Add & Verify Mobile'}</span>
                  </button>
                </div>
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

        {/* Profile Edit Action Buttons */}
        {editing ? (
          <div className="flex gap-3">
            <button
              onClick={handleCancelProfileEdit}
              className="flex-1 py-3 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition-all border border-slate-700"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleSaveProfile}
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
            <Edit3 className="w-4 h-4" /> Edit Location
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

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL: OTP VERIFICATION / CHANGE NUMBER FLOW ─────────────── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {flow !== 'none' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={resetFlow}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Dev/Simulation Mode Banner */}
              {simulatedInfo && (
                <div className="mb-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-xs text-cyan-300">
                  <div className="font-bold flex items-center gap-1.5 mb-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Fast2SMS Demo Mode
                  </div>
                  <p>{simulatedInfo}</p>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* STEP: Initial Phone Input                                    */}
              {/* ───────────────────────────────────────────────────────────── */}
              {flow === 'initial_input' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
                      <Phone className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Enter Mobile Number</h3>
                    <p className="text-xs text-slate-400">
                      We'll send a 4-digit SMS OTP to verify your mobile number.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      10-Digit Mobile Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        autoFocus
                        value={phoneInput}
                        onChange={e => {
                          setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10));
                          setFlowError('');
                        }}
                        placeholder="9876543210"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-all"
                      />
                    </div>
                  </div>

                  {flowError && (
                    <p className="text-xs text-rose-400 text-center bg-rose-500/10 border border-rose-500/20 rounded-lg py-2 px-3">
                      {flowError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleStartInitialVerification}
                    disabled={loading || phoneInput.length !== 10}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                    <span>Send SMS OTP</span>
                  </button>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* STEP: Initial OTP Verify                                     */}
              {/* ───────────────────────────────────────────────────────────── */}
              {flow === 'initial_otp' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Verify SMS Code</h3>
                    <p className="text-xs text-slate-400">
                      Enter the 4-digit code sent to <span className="font-mono text-cyan-300 font-bold">+91 {phoneInput}</span>
                    </p>
                  </div>

                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      autoFocus
                      value={otpInput}
                      onChange={e => {
                        setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                        setFlowError('');
                      }}
                      placeholder="• • • •"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3.5 text-2xl text-white text-center tracking-[0.5em] font-mono font-bold focus:outline-none focus:border-cyan-500/60 transition-all"
                    />
                  </div>

                  {flowError && (
                    <p className="text-xs text-rose-400 text-center bg-rose-500/10 border border-rose-500/20 rounded-lg py-2 px-3">
                      {flowError}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || loading}
                      onClick={handleStartInitialVerification}
                      className="flex-1 py-3 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend OTP'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmInitialOtp}
                      disabled={otpInput.length !== 4}
                      className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-cyan-900/30"
                    >
                      Verify & Connect
                    </button>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* STEP: Change Number - Step 1: Verify Old Number OTP          */}
              {/* ───────────────────────────────────────────────────────────── */}
              {flow === 'change_old_otp' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Step 1 of 2
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">Authorize Number Change</h3>
                    <p className="text-xs text-slate-400">
                      To protect your account, we sent an authorization code to your current registered number <span className="font-mono text-cyan-300 font-bold">{maskPhone(currentUser?.phone)}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 text-center">
                      Enter 4-Digit Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      autoFocus
                      value={otpInput}
                      onChange={e => {
                        setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                        setFlowError('');
                      }}
                      placeholder="• • • •"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3.5 text-2xl text-white text-center tracking-[0.5em] font-mono font-bold focus:outline-none focus:border-cyan-500/60 transition-all"
                    />
                  </div>

                  {flowError && (
                    <p className="text-xs text-rose-400 text-center bg-rose-500/10 border border-rose-500/20 rounded-lg py-2 px-3">
                      {flowError}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || loading}
                      onClick={handleStartChangePhone}
                      className="flex-1 py-3 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend OTP'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifyOldOtp}
                      disabled={otpInput.length !== 4}
                      className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-cyan-900/30"
                    >
                      Authorize
                    </button>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* STEP: Change Number - Step 2: Input New Number               */}
              {/* ───────────────────────────────────────────────────────────── */}
              {flow === 'change_new_input' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Step 2 of 2
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">Enter New Mobile Number</h3>
                    <p className="text-xs text-slate-400">
                      Current number verified! Now enter the new mobile number you want to link.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      New 10-Digit Mobile Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        autoFocus
                        value={newPhoneInput}
                        onChange={e => {
                          setNewPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10));
                          setFlowError('');
                        }}
                        placeholder="9876543210"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-all"
                      />
                    </div>
                  </div>

                  {flowError && (
                    <p className="text-xs text-rose-400 text-center bg-rose-500/10 border border-rose-500/20 rounded-lg py-2 px-3">
                      {flowError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSendOtpToNewPhone}
                    disabled={loading || newPhoneInput.length !== 10}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                    <span>Send OTP to New Number</span>
                  </button>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* STEP: Change Number - Step 3: Verify New Number OTP          */}
              {/* ───────────────────────────────────────────────────────────── */}
              {flow === 'change_new_otp' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Final Step
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">Verify New Mobile Number</h3>
                    <p className="text-xs text-slate-400">
                      Enter the 4-digit code sent to <span className="font-mono text-cyan-300 font-bold">+91 {newPhoneInput}</span>
                    </p>
                  </div>

                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      autoFocus
                      value={otpInput}
                      onChange={e => {
                        setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                        setFlowError('');
                      }}
                      placeholder="• • • •"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3.5 text-2xl text-white text-center tracking-[0.5em] font-mono font-bold focus:outline-none focus:border-cyan-500/60 transition-all"
                    />
                  </div>

                  {flowError && (
                    <p className="text-xs text-rose-400 text-center bg-rose-500/10 border border-rose-500/20 rounded-lg py-2 px-3">
                      {flowError}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || loading}
                      onClick={handleSendOtpToNewPhone}
                      className="flex-1 py-3 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend OTP'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifyNewPhoneOtp}
                      disabled={otpInput.length !== 4}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/30"
                    >
                      Verify & Update
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
