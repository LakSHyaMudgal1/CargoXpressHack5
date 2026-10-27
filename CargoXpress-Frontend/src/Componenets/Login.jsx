import React, { useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { addUser } from '../utils/userSlice';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../utils/constants';
import {
  Truck, Mail, Lock, User, CreditCard,
  Building2, Hash, Eye, EyeOff, ArrowRight,
} from 'lucide-react';

const Login = () => {
  const [emailId, setEmailId]               = useState('');
  const [password, setPassword]             = useState('');
  const [name, setName]                     = useState('');
  const [registrationNumber, setReg]        = useState('');
  const [aadharNumber, setAadhar]           = useState('');
  const [userRole, setUserRole]             = useState('trader');
  const [isLogin, setIsLogin]               = useState(true);
  const [error, setError]                   = useState('');
  const [loading, setLoading]               = useState(false);
  const [showPassword, setShowPassword]     = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const reset = () => {
    setError(''); setEmailId(''); setPassword('');
    setName(''); setReg(''); setAadhar('');
  };

  const HandleLogin = async () => {
    setError(''); setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/login`, { emailId, password }, { withCredentials: true });
      const userData = res.data;
      dispatch(addUser(userData));
      if (emailId.endsWith('@cargoxpress.com')) {
        navigate('/admin');
      } else if (userData.registrationNumber !== undefined) {
        navigate('/company');
      } else if (userData.aadharNumber !== undefined) {
        navigate('/trader');
      } else {
        navigate('/');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Invalid credentials.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setLoading(false); }
  };

  const HandleSignUp = async () => {
    setError(''); setLoading(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/signup/${userRole}`,
        { name, emailId, password,
          ...(userRole === 'trader'  ? { aadharNumber }      : {}),
          ...(userRole === 'company' ? { registrationNumber: registrationNumber } : {}),
        },
        { withCredentials: true }
      );
      const userData = res.data.data;
      dispatch(addUser(userData));
      if (userRole === 'company') {
        navigate('/company');
      } else if (userRole === 'trader') {
        navigate('/trader');
      } else {
        navigate('/');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Sign up failed.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setLoading(false); }
  };

  const onKey = (e) => e.key === 'Enter' && (isLogin ? HandleLogin() : HandleSignUp());

  /* ─────────────────────────────────────────── */
  return (
    <div className="h-screen w-screen flex overflow-hidden">

      {/* ════════════ LEFT PANEL ════════════ */}
      <div className="hidden lg:flex lg:w-[55%] relative">

        {/* Photo */}
        <img
          src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&q=85&w=2070"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Single clean dark overlay */}
        <div className="absolute inset-0 bg-black/55" />

        {/* Top-left wordmark */}
        <div className="absolute top-10 left-10 flex items-center gap-2.5 z-10">
          <div className="bg-white/10 border border-white/20 rounded-lg p-2 backdrop-blur-sm">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg tracking-wide">CargoXpress</span>
        </div>

        {/* Bottom copy */}
        <div className="absolute bottom-12 left-10 right-10 z-10">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-[0.2em] mb-4">
            Logistics Platform
          </p>
          <h2 className="text-white text-5xl font-bold leading-[1.15] mb-5">
            Move cargo<br />smarter.
          </h2>
          <p className="text-white/55 text-[15px] leading-relaxed max-w-[360px]">
            One platform for traders and transport companies. Merge shipments, split costs, and track every delivery end-to-end.
          </p>

          {/* Stats row */}
          <div className="flex gap-8 mt-10 pt-8 border-t border-white/10">
            {[['500+','Active routes'],['3×','Cost savings'],['99%','On-time rate']].map(([v,l]) => (
              <div key={l}>
                <p className="text-white text-xl font-bold">{v}</p>
                <p className="text-white/40 text-xs mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════ RIGHT PANEL ════════════ */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-14 bg-surface border-l border-border overflow-y-auto">
        <div className="w-full max-w-sm mx-auto py-10">

          {/* Mobile wordmark */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded bg-surface-elevated border border-border flex items-center justify-center text-signal-aqua font-mono font-bold text-xs tracking-wider">
              CX
            </div>
            <span className="font-bold text-lg text-ink">
              Cargo<span className="text-signal-aqua">Xpress</span>
            </span>
          </div>

          {/* Tab toggle */}
          <div className="flex bg-surface-elevated rounded-md border border-border p-1 mb-8">
            {[['Sign In', true], ['Sign Up', false]].map(([label, loginTab]) => (
              <button
                key={label}
                type="button"
                onClick={() => { if (isLogin !== loginTab) { setIsLogin(loginTab); reset(); } }}
                className={`flex-1 py-2 text-xs font-mono uppercase tracking-wider rounded transition-all select-none ${
                  isLogin === loginTab
                    ? 'bg-surface text-ink border border-border font-semibold shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Heading */}
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
            {isLogin ? 'Access Dispatch Command' : 'Create Enterprise Account'}
          </h1>
          <p className="text-xs text-ink-muted mt-1.5 mb-6 leading-relaxed">
            {isLogin ? 'Authenticate with your authorized credentials.' : 'Register as a commercial carrier or commodity consignor.'}
          </p>

          <div className="space-y-4">

            {/* Role selector */}
            {!isLogin && (
              <div>
                <p className="text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-wider mb-2">Account Role</p>
                <div className="flex gap-2">
                  {[['trader','Consignor Trader', User],['company','Transport Carrier', Building2]].map(([val,label,Icon]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setUserRole(val)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-xs font-medium transition-all ${
                        userRole === val
                          ? 'border-signal-emerald bg-signal-emerald/10 text-signal-emerald font-semibold shadow-sm'
                          : 'border-border bg-surface-elevated text-ink-muted hover:text-ink hover:border-border-strong'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />{label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Name */}
            {!isLogin && (
              <Field label={userRole === 'company' ? 'Enterprise / Carrier Name' : 'Consignor Full Name'}>
                <InputIcon icon={<User className="h-4 w-4" />}>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={onKey}
                    placeholder={userRole === 'company' ? 'Acme Logistics Pvt. Ltd.' : 'John Doe'}
                    className="w-full bg-surface-base border border-border text-ink placeholder:text-ink-subtle rounded-md pl-10 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-signal-aqua/80 focus:border-signal-aqua transition-all"
                  />
                </InputIcon>
              </Field>
            )}

            {/* Aadhar */}
            {!isLogin && userRole === 'trader' && (
              <Field label="Aadhaar UIDAI Number">
                <InputIcon icon={<CreditCard className="h-4 w-4" />}>
                  <input
                    type="text"
                    value={aadharNumber}
                    onChange={e => setAadhar(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="12-digit Aadhaar Number"
                    maxLength={12}
                    className="w-full bg-surface-base border border-border text-ink placeholder:text-ink-subtle rounded-md pl-10 pr-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-signal-aqua/80 focus:border-signal-aqua transition-all"
                  />
                </InputIcon>
              </Field>
            )}

            {/* Reg number */}
            {!isLogin && userRole === 'company' && (
              <Field label="Business Registration Number">
                <InputIcon icon={<Hash className="h-4 w-4" />}>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={e => setReg(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="e.g. U72900MH2020PTC123456"
                    className="w-full bg-surface-base border border-border text-ink placeholder:text-ink-subtle rounded-md pl-10 pr-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-signal-aqua/80 focus:border-signal-aqua transition-all"
                  />
                </InputIcon>
              </Field>
            )}

            {/* Email */}
            <Field label="Work Email Address">
              <InputIcon icon={<Mail className="h-4 w-4" />}>
                <input
                  type="email"
                  value={emailId}
                  onChange={e => setEmailId(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="name@company.com"
                  className="w-full bg-surface-base border border-border text-ink placeholder:text-ink-subtle rounded-md pl-10 pr-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-signal-aqua/80 focus:border-signal-aqua transition-all"
                />
              </InputIcon>
            </Field>

            {/* Password */}
            <Field label="Password">
              <InputIcon icon={<Lock className="h-4 w-4" />}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={onKey}
                  placeholder={isLogin ? '••••••••' : 'Min 8 chars with uppercase & symbol'}
                  className="w-full bg-surface-base border border-border text-ink placeholder:text-ink-subtle rounded-md pl-10 pr-10 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-signal-aqua/80 focus:border-signal-aqua transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </InputIcon>
            </Field>

            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-md bg-signal-coral/10 border border-signal-coral/20 text-signal-coral text-xs">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={isLogin ? HandleLogin : HandleSignUp}
              disabled={loading}
              className="w-full h-10 rounded-md bg-action-primary text-action-primary-text font-semibold hover:bg-action-primary-hover transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider select-none disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-sm"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In to Portal' : 'Register Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-ink-subtle mt-6">
            {isLogin ? "Don't have an enterprise account? " : 'Already registered? '}
            <button
              type="button"
              onClick={() => { setIsLogin(p => !p); reset(); }}
              className="text-signal-aqua hover:underline font-semibold"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

/* Small layout helpers */
const Field = ({ label, children }) => (
  <div>
    <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-muted font-semibold mb-1.5">{label}</label>
    {children}
  </div>
);

const InputIcon = ({ icon, children }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none">{icon}</span>
    {children}
  </div>
);

export default Login;
