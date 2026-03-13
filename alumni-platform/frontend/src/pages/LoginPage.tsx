import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiZap, FiUsers, FiTrendingUp } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';

const features = [
  { icon: FiZap, label: 'AI-powered career guidance', desc: 'Get personalised advice instantly', color: '#6366f1' },
  { icon: FiUsers, label: 'Exclusive alumni network', desc: 'Connect with 2,500+ professionals', color: '#10b981' },
  { icon: FiTrendingUp, label: 'Real-time mentorship', desc: 'Book sessions with top mentors', color: '#f59e0b' },
];

const LoginPage: React.FC = () => {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error((err as Error).message || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { isNewUser } = await signInWithGoogle();
      if (isNewUser) {
        navigate('/signup?google=true');
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast.error((err as Error).message || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden">
      <style>{`
        @keyframes loginFloat { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-18px) rotate(3deg)} }
        @keyframes loginFloat2 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(14px) rotate(-2deg)} }
        @keyframes loginFadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes loginSlideIn { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
        @keyframes loginPulse { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
        @keyframes loginShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        .login-float { animation: loginFloat 7s ease-in-out infinite; }
        .login-float2 { animation: loginFloat2 9s ease-in-out infinite; }
        .login-float3 { animation: loginFloat 11s ease-in-out infinite 2s; }
        .login-fade-up { animation: loginFadeUp 0.55s ease-out both; }
        .login-slide-in { animation: loginSlideIn 0.5s ease-out both; }
        .login-pulse { animation: loginPulse 3s ease-in-out infinite; }
        .login-input { width:100%; padding: 0.75rem 1rem 0.75rem 2.75rem; border-radius:0.875rem; border:1.5px solid #e5e7eb; background:rgba(255,255,255,0.9); font-size:0.9375rem; color:#111827; outline:none; transition:border-color .2s,box-shadow .2s,background .2s; }
        .login-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,0.12); background:#fff; }
        .login-btn { display:flex; align-items:center; justify-content:center; gap:0.5rem; width:100%; padding:0.875rem 1.5rem; border-radius:0.875rem; font-weight:700; font-size:1rem; color:#fff; border:none; cursor:pointer; transition:all .25s; background:linear-gradient(135deg,#6366f1,#7c3aed); box-shadow:0 4px 20px rgba(99,102,241,0.35); }
        .login-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 28px rgba(99,102,241,0.45); }
        .login-btn:disabled { opacity:.6; cursor:not-allowed; }
        .login-google-btn { display:flex; align-items:center; justify-content:center; gap:0.625rem; width:100%; padding:0.8125rem 1.5rem; border-radius:0.875rem; font-weight:600; font-size:0.9375rem; color:#374151; background:#fff; border:1.5px solid #e5e7eb; cursor:pointer; transition:all .2s; }
        .login-google-btn:hover:not(:disabled) { border-color:#c7d2fe; background:#f5f3ff; transform:translateY(-1px); box-shadow:0 4px 14px rgba(99,102,241,0.12); }
      `}</style>

      {/* -- Left: aurora branding panel -- */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col">
        {/* Aurora background */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg,#3730a3 0%,#4f46e5 30%,#7c3aed 60%,#6d28d9 100%)' }} />
        {/* Mesh grid */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(to right,rgba(255,255,255,.4) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        {/* Floating blobs */}
        <div className="login-float absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle,#a78bfa,transparent 70%)' }} />
        <div className="login-float2 absolute top-1/3 -left-24 w-72 h-72 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle,#818cf8,transparent 70%)' }} />
        <div className="login-float3 absolute -bottom-20 right-1/4 w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle,#c4b5fd,transparent 70%)' }} />

        <div className="relative z-10 flex flex-col h-full p-14 justify-between">
          {/* Logo */}
          <div className="login-slide-in flex items-center gap-3" style={{ animationDelay: '0ms' }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.18)' }}>
              <span className="text-xl">🎓</span>
            </div>
            <span className="font-bold text-xl text-white tracking-tight">CareerSaathi</span>
          </div>

          {/* Main copy */}
          <div>
            <div className="login-fade-up mb-3" style={{ animationDelay: '100ms' }}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}>
                Your career starts here
              </span>
            </div>
            <h2 className="login-fade-up text-5xl font-extrabold text-white leading-[1.12] mb-5 tracking-tight"
              style={{ animationDelay: '180ms' }}>
              Welcome back<br />
              <span style={{ background: 'linear-gradient(90deg,#c4b5fd,#93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                to your journey
              </span>
            </h2>
            <p className="login-fade-up text-indigo-200 text-lg leading-relaxed mb-10" style={{ animationDelay: '260ms' }}>
              Connect with mentors, practice interviews, discover opportunities, all in one place.
            </p>

            {/* Feature cards */}
            <div className="space-y-3">
              {features.map(({ icon: Icon, label, desc, color }, i) => (
                <div key={label}
                  className="login-fade-up flex items-center gap-4 p-4 rounded-2xl border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-white/25 hover:scale-[1.02]"
                  style={{ background: 'rgba(255,255,255,0.08)', animationDelay: `${340 + i * 80}ms` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}30`, border: `1px solid ${color}50` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{label}</p>
                    <p className="text-indigo-300 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust badge */}
          <div className="login-fade-up flex items-center gap-3" style={{ animationDelay: '620ms' }}>
            <div className="flex -space-x-2">
              {['#6366f1','#10b981','#f59e0b','#ec4899'].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-indigo-700 flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: c }}>
                  {['A','B','C','D'][i]}
                </div>
              ))}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">2,500+ students & alumni</p>
              <p className="text-indigo-300 text-xs">actively growing their careers</p>
            </div>
          </div>
        </div>
      </div>

      {/* -- Right: form panel -- */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#eef2ff 0%,#f5f3ff 40%,#eff6ff 100%)' }}>
        {/* Subtle blobs on right side */}
        <div className="login-pulse absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.08),transparent 70%)', transform: 'translate(30%,-30%)' }} />
        <div className="login-pulse absolute bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(139,92,246,0.07),transparent 70%)', transform: 'translate(-30%,30%)', animationDelay: '1.5s' }} />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8" style={{ animation: 'loginFadeUp 0.5s ease-out both' }}>
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                <span className="text-xl">🎓</span>
              </div>
              <span className="text-xl font-bold text-gray-900">CareerSaathi</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="login-fade-up mb-8" style={{ animationDelay: '60ms' }}>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-1">Sign in</h1>
            <p className="text-gray-500">New here?{' '}
              <Link to="/signup" className="font-semibold hover:underline" style={{ color: '#6366f1' }}>Create a free account</Link>
            </p>
          </div>

          {/* Card */}
          <div className="login-fade-up rounded-3xl p-8 shadow-xl border border-white/80"
            style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', animationDelay: '130ms' }}>

            {/* Google button */}
            <button onClick={handleGoogleSignIn} disabled={googleLoading} className="login-google-btn mb-5">
              <FcGoogle className="w-5 h-5 flex-shrink-0" />
              {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div className="relative mb-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">or with email</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="login-input" placeholder="you@example.com" autoComplete="email" required />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Password</label>
                  <Link to="#" className="text-xs font-semibold hover:underline" style={{ color: '#6366f1' }}>Forgot password?</Link>
                </div>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    className="login-input pr-11" placeholder="Enter password" autoComplete="current-password" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 rounded-lg transition-colors">
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="login-btn mt-2">
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>Sign In <FiArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="login-fade-up text-center text-xs text-gray-400 mt-5" style={{ animationDelay: '300ms' }}>
            By signing in you agree to our{' '}
            <span className="underline cursor-pointer" style={{ color: '#6366f1' }}>Terms of Service</span>
            {' '}and{' '}
            <span className="underline cursor-pointer" style={{ color: '#6366f1' }}>Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;