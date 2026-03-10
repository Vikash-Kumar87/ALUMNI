import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff, FiAward, FiArrowRight } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';

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
    <div className="min-h-screen flex bg-white">
      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-violet-800" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px,transparent 1px),linear-gradient(to right,rgba(255,255,255,.15) 1px,transparent 1px)', backgroundSize: '64px 64px' }} />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float-delayed" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
              <FiAward className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">AlumniConnect</span>
          </div>
          <div>
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Welcome back to your career journey
            </h2>
            <p className="text-primary-100 text-lg leading-relaxed mb-8">
              Connect with mentors, practice interviews, discover opportunities — all in one place.
            </p>
            <div className="space-y-3">
              {['AI-powered career guidance', 'Exclusive alumni network', 'Real-time mentorship'].map(item => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-primary-100 text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-primary-200 text-sm">Trusted by 2,500+ students & alumni</p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gray-50">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Logo (mobile) */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center shadow-glow">
                <FiAward className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">AlumniConnect</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Sign in</h1>
            <p className="text-gray-500 mt-2">New here? <Link to="/signup" className="text-primary-600 font-semibold hover:underline">Create a free account</Link></p>
          </div>

          <div className="card shadow-card gradient-border">
            {/* Google */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-primary-200 hover:bg-primary-50/30 transition-all duration-200 font-semibold text-gray-700 disabled:opacity-50 mb-5 group"
            >
              <FcGoogle className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
            </button>

            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-xs text-gray-400 font-semibold uppercase tracking-widest">or with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="input input-glow pl-10" placeholder="you@example.com" autoComplete="email" required />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Password</label>
                  <Link to="#" className="text-xs text-primary-600 hover:underline font-medium">Forgot password?</Link>
                </div>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    className="input input-glow pl-10 pr-11" placeholder="••••••••" autoComplete="current-password" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 rounded-lg transition-colors">
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="btn-gradient w-full py-3 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In <FiArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;