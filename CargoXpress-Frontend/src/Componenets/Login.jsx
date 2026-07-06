import React, { useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { addUser } from '../utils/userSlice';
import { useNavigate } from 'react-router';
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
      dispatch(addUser(res.data));
      emailId.endsWith('@cargoxpress.com') ? navigate('/admin') : navigate('/');
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
      dispatch(addUser(res.data.data));
      navigate('/');
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
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-14 bg-base-100 overflow-y-auto">
        <div className="w-full max-w-sm mx-auto py-10">

          {/* Mobile wordmark */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <Truck className="h-6 w-6 text-green-500" />
            <span className="font-bold text-lg bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
              CargoXpress
            </span>
          </div>

          {/* Tab toggle */}
          <div className="flex bg-base-200 rounded-xl p-1 mb-8">
            {[['Sign In', true], ['Sign Up', false]].map(([label, loginTab]) => (
              <button
                key={label}
                onClick={() => { if (isLogin !== loginTab) { setIsLogin(loginTab); reset(); } }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  isLogin === loginTab
                    ? 'bg-base-100 shadow-sm text-base-content'
                    : 'text-base-content/40 hover:text-base-content/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-base-content">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-base-content/40 mt-1 mb-7">
            {isLogin ? 'Sign in to your account to continue.' : 'Get started — takes less than a minute.'}
          </p>

          <div className="space-y-4">

            {/* Role pills */}
            {!isLogin && (
              <div>
                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">Account type</p>
                <div className="flex gap-2">
                  {[['trader','Trader', User],['company','Company', Building2]].map(([val,label,Icon]) => (
                    <button
                      key={val}
                      onClick={() => setUserRole(val)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        userRole === val
                          ? 'border-green-500 bg-green-500/10 text-green-600'
                          : 'border-base-300 text-base-content/50 hover:border-base-content/20'
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
              <Field label={userRole === 'company' ? 'Company name' : 'Full name'}>
                <InputIcon icon={<User className="h-4 w-4" />}>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={onKey}
                    placeholder={userRole === 'company' ? 'Acme Logistics Pvt. Ltd.' : 'John Doe'}
                    className="input input-bordered w-full pl-10 text-sm focus:outline-none focus:border-green-500" />
                </InputIcon>
              </Field>
            )}

            {/* Aadhar */}
            {!isLogin && userRole === 'trader' && (
              <Field label="Aadhar number">
                <InputIcon icon={<CreditCard className="h-4 w-4" />}>
                  <input type="text" value={aadharNumber} onChange={e => setAadhar(e.target.value)} onKeyDown={onKey}
                    placeholder="12-digit Aadhar" maxLength={12}
                    className="input input-bordered w-full pl-10 text-sm focus:outline-none focus:border-green-500" />
                </InputIcon>
              </Field>
            )}

            {/* Reg number */}
            {!isLogin && userRole === 'company' && (
              <Field label="Registration number">
                <InputIcon icon={<Hash className="h-4 w-4" />}>
                  <input type="text" value={registrationNumber} onChange={e => setReg(e.target.value)} onKeyDown={onKey}
                    placeholder="Company registration number"
                    className="input input-bordered w-full pl-10 text-sm focus:outline-none focus:border-green-500" />
                </InputIcon>
              </Field>
            )}

            {/* Email */}
            <Field label="Email address">
              <InputIcon icon={<Mail className="h-4 w-4" />}>
                <input type="email" value={emailId} onChange={e => setEmailId(e.target.value)} onKeyDown={onKey}
                  placeholder="you@example.com"
                  className="input input-bordered w-full pl-10 text-sm focus:outline-none focus:border-green-500" />
              </InputIcon>
            </Field>

            {/* Password */}
            <Field label="Password">
              <InputIcon icon={<Lock className="h-4 w-4" />}>
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} onKeyDown={onKey}
                  placeholder={isLogin ? '••••••••' : 'Min 8 chars, uppercase & symbol'}
                  className="input input-bordered w-full pl-10 pr-10 text-sm focus:outline-none focus:border-green-500" />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </InputIcon>
            </Field>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                {error}
              </p>
            )}

            {/* CTA */}
            <button
              onClick={isLogin ? HandleLogin : HandleSignUp}
              disabled={loading}
              className="btn w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-none font-semibold mt-1"
            >
              {loading
                ? <span className="loading loading-spinner loading-sm" />
                : <>{isLogin ? 'Sign In' : 'Create Account'}<ArrowRight className="h-4 w-4 ml-1.5" /></>
              }
            </button>
          </div>

          <p className="text-center text-sm text-base-content/40 mt-6">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setIsLogin(p => !p); reset(); }}
              className="text-green-500 hover:text-green-600 font-semibold">
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
    <label className="block text-sm font-medium text-base-content mb-1.5">{label}</label>
    {children}
  </div>
);

const InputIcon = ({ icon, children }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30">{icon}</span>
    {children}
  </div>
);

export default Login;
