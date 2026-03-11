import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiBriefcase, FiArrowRight, FiArrowLeft, FiCheck, FiLinkedin } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';

type Role = 'student' | 'alumni';
type Step = 'role' | 'account' | 'profile';

const STEPS: Step[] = ['role', 'account', 'profile'];
const STEP_LABELS = ['Choose Role', 'Account', 'Profile'];

const SignupPage: React.FC = () => {
  const { signUp, signInWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isGoogleFlow, setIsGoogleFlow] = useState(searchParams.get('google') === 'true');

  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<Role>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('1');
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');
  const [goals, setGoals] = useState('');
  const [company, setCompany] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [experience, setExperience] = useState('0');
  const [linkedin, setLinkedin] = useState('');

  const currentStepIndex = STEPS.indexOf(step);

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      const { isNewUser } = await signInWithGoogle(role);
      if (!isNewUser) {
        // User already has a complete profile
        navigate('/dashboard');
      } else {
        // New user — basic profile created, now collect extra details
        setIsGoogleFlow(true);
        setStep('profile');
        setLoading(false);
      }
    } catch (err) {
      toast.error((err as Error).message || 'Google sign-up failed');
      setLoading(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { toast.error('Please fill in all required fields'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const extraData: Record<string, unknown> =
        role === 'student'
          ? { branch, year: Number(year), skills: skills.split(',').map(s => s.trim()).filter(Boolean), interests: interests.split(',').map(s => s.trim()).filter(Boolean), goals }
          : { company, jobRole, experience: Number(experience), linkedin, skills: skills.split(',').map(s => s.trim()).filter(Boolean) };
      await signUp(email, password, name, role, extraData);
      toast.success('Account created! Please sign in to continue.');
      navigate('/login');
    } catch (err) { toast.error((err as Error).message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const handleGoogleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    try {
      const { apiService } = await import('../services/api');
      const token = await currentUser.getIdToken();
      const extraData: Record<string, unknown> =
        role === 'student'
          ? { branch, year: Number(year), skills: skills.split(',').map(s => s.trim()).filter(Boolean), interests: interests.split(',').map(s => s.trim()).filter(Boolean), goals }
          : { company, jobRole, experience: Number(experience), linkedin, skills: skills.split(',').map(s => s.trim()).filter(Boolean) };
      await apiService.post('/auth/signup', { uid: currentUser.uid, name: currentUser.displayName || name, email: currentUser.email, role, ...extraData }, { headers: { Authorization: `Bearer ${token}` } });
      navigate('/dashboard');
      toast.success('Profile created! Welcome 🎉');
    } catch (err) { toast.error((err as Error).message || 'Profile creation failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 relative overflow-hidden">
      <style>{`
        @keyframes signupFadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes signupScale { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        @keyframes signupBlob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(20px,-15px) scale(1.05)} 66%{transform:translate(-10px,20px) scale(0.97)} }
        @keyframes signupBlob2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-18px,12px) scale(1.04)} 66%{transform:translate(14px,-18px) scale(0.96)} }
        @keyframes signupPop { 0%{transform:scale(0.85)} 60%{transform:scale(1.08)} 100%{transform:scale(1)} }
        @keyframes signupShine { from{left:-100%} to{left:200%} }
        .sup-fade { animation: signupFadeUp 0.5s ease-out both; }
        .sup-scale { animation: signupScale 0.4s ease-out both; }
        .sup-blob1 { animation: signupBlob1 12s ease-in-out infinite; }
        .sup-blob2 { animation: signupBlob2 15s ease-in-out infinite 2s; }
        .sup-pop { animation: signupPop 0.35s cubic-bezier(.34,1.56,.64,1) both; }
        .sup-input { width:100%; padding:0.7rem 1rem 0.7rem 2.6rem; border-radius:0.75rem; border:1.5px solid #e5e7eb; background:rgba(255,255,255,0.95); font-size:0.9rem; color:#111827; outline:none; transition:border-color .2s,box-shadow .2s; }
        .sup-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,0.12); }
        .sup-input-plain { width:100%; padding:0.7rem 1rem; border-radius:0.75rem; border:1.5px solid #e5e7eb; background:rgba(255,255,255,0.95); font-size:0.9rem; color:#111827; outline:none; transition:border-color .2s,box-shadow .2s; }
        .sup-input-plain:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,0.12); }
        .sup-select { width:100%; padding:0.7rem 1rem; border-radius:0.75rem; border:1.5px solid #e5e7eb; background:rgba(255,255,255,0.95); font-size:0.9rem; color:#111827; outline:none; transition:border-color .2s,box-shadow .2s; appearance:none; }
        .sup-select:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,0.12); }
        .sup-label { display:block; font-size:0.8125rem; font-weight:600; color:#374151; margin-bottom:0.4rem; }
        .sup-btn { display:flex; align-items:center; justify-content:center; gap:0.5rem; padding:0.8125rem 1.5rem; border-radius:0.875rem; font-weight:700; font-size:0.9375rem; color:#fff; border:none; cursor:pointer; transition:all .25s; background:linear-gradient(135deg,#6366f1,#7c3aed); box-shadow:0 4px 18px rgba(99,102,241,0.32); }
        .sup-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 26px rgba(99,102,241,0.42); }
        .sup-btn:disabled { opacity:.6; cursor:not-allowed; }
        .sup-btn-sec { display:flex; align-items:center; justify-content:center; gap:0.5rem; padding:0.8125rem 1.5rem; border-radius:0.875rem; font-weight:600; font-size:0.9375rem; color:#6366f1; background:#ede9fe; border:none; cursor:pointer; transition:all .2s; }
        .sup-btn-sec:hover { background:#ddd6fe; transform:translateY(-1px); }
        .sup-google { display:flex; align-items:center; justify-content:center; gap:0.625rem; width:100%; padding:0.8125rem 1.5rem; border-radius:0.875rem; font-weight:600; font-size:0.9375rem; color:#374151; background:#fff; border:1.5px solid #e5e7eb; cursor:pointer; transition:all .2s; }
        .sup-google:hover:not(:disabled) { border-color:#c7d2fe; background:#f5f3ff; transform:translateY(-1px); box-shadow:0 4px 14px rgba(99,102,241,0.1); }
        .sup-role-card { padding:1.25rem; border-radius:1.25rem; border:2px solid #e5e7eb; text-align:center; cursor:pointer; transition:all .25s; background:rgba(255,255,255,0.9); }
        .sup-role-card:hover { border-color:#c7d2fe; transform:translateY(-2px); box-shadow:0 6px 20px rgba(99,102,241,0.1); }
        .sup-role-card.active { border-color:#6366f1; background:rgba(238,242,255,0.9); box-shadow:0 0 0 3px rgba(99,102,241,0.12), 0 6px 20px rgba(99,102,241,0.15); }
      `}</style>

      {/* Aurora background */}
      <div className="fixed inset-0 -z-10" style={{ background: 'linear-gradient(160deg,#eef2ff 0%,#f5f3ff 35%,#ecfdf5 65%,#eff6ff 100%)' }} />
      <div className="sup-blob1 fixed top-0 right-0 w-96 h-96 rounded-full -z-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.12),transparent 70%)', transform: 'translate(30%,-30%)' }} />
      <div className="sup-blob2 fixed bottom-0 left-0 w-80 h-80 rounded-full -z-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(139,92,246,0.1),transparent 70%)', transform: 'translate(-30%,30%)' }} />
      <div className="fixed top-1/2 left-1/2 w-64 h-64 rounded-full -z-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(16,185,129,0.06),transparent 70%)', transform: 'translate(-50%,-50%)' }} />

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="sup-fade text-center mb-7" style={{ animationDelay: '0ms' }}>
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
              <span className="text-2xl">🎓</span>
            </div>
            <span className="text-xl font-bold text-gray-900">AlumniConnect</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create your account</h1>
          <p className="text-gray-500 mt-1.5">Already have one?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: '#6366f1' }}>Sign in</Link>
          </p>
        </div>

        {/* Step indicator */}
        <div className="sup-fade flex items-center justify-center gap-3 mb-7" style={{ animationDelay: '80ms' }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-400 ${
                  i < currentStepIndex
                    ? 'text-white shadow-md'
                    : i === currentStepIndex
                    ? 'text-white shadow-lg ring-4'
                    : 'bg-gray-100 text-gray-400'
                }`}
                  style={i <= currentStepIndex ? {
                    background: 'linear-gradient(135deg,#6366f1,#7c3aed)',
                    ringColor: i === currentStepIndex ? 'rgba(99,102,241,0.2)' : undefined,
                    boxShadow: i === currentStepIndex ? '0 0 0 4px rgba(99,102,241,0.18), 0 4px 12px rgba(99,102,241,0.3)' : undefined,
                  } : {}}>
                  {i < currentStepIndex ? <FiCheck className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs font-semibold hidden sm:block transition-colors duration-300 ${i === currentStepIndex ? 'text-indigo-700' : i < currentStepIndex ? 'text-gray-500' : 'text-gray-300'}`}>
                  {STEP_LABELS[i]}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-1 max-w-12 rounded-full overflow-hidden bg-gray-100">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: i < currentStepIndex ? '100%' : '0%', background: 'linear-gradient(90deg,#6366f1,#7c3aed)' }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="sup-fade rounded-3xl p-8 shadow-2xl border border-white/70"
          style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', animationDelay: '140ms' }}>

          {/* ── Step: Role ── */}
          {step === 'role' && (
            <div className="sup-scale" style={{ animationDelay: '0ms' }}>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-gray-900">I am a...</h2>
                <p className="text-sm text-gray-500 mt-0.5">Choose how you want to use AlumniConnect</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {(['student', 'alumni'] as Role[]).map(r => (
                  <button key={r} onClick={() => setRole(r)} className={`sup-role-card ${role === r ? 'active sup-pop' : ''}`}>
                    <div className="text-4xl mb-3">{r === 'student' ? '🎓' : '💼'}</div>
                    <p className="font-bold text-gray-900 capitalize text-base mb-1">{r}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {r === 'student' ? 'Looking for mentorship & guidance' : 'Share experience & mentor students'}
                    </p>
                    {role === r && (
                      <div className="mt-3 w-6 h-6 rounded-full flex items-center justify-center mx-auto"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                        <FiCheck className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {isGoogleFlow ? (
                <button onClick={() => setStep('profile')} className="sup-btn w-full">
                  Continue as {role} <FiArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button onClick={handleGoogleSignUp} disabled={loading} className="sup-google mb-3">
                    <FcGoogle className="w-5 h-5 flex-shrink-0" />
                    {loading ? 'Creating account...' : `Sign up as ${role} with Google`}
                  </button>
                  <div className="relative my-4 flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">or with email</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <button onClick={() => setStep('account')} className="sup-btn w-full">
                    Continue with Email <FiArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Step: Account ── */}
          {step === 'account' && (
            <form onSubmit={(e) => { e.preventDefault(); setStep('profile'); }} className="sup-scale space-y-4">
              <div className="mb-1">
                <h2 className="text-xl font-bold text-gray-900">Account details</h2>
                <p className="text-sm text-gray-500 mt-0.5">Set up your login credentials</p>
              </div>
              <div>
                <label className="sup-label">Full Name</label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="sup-input" placeholder="John Doe" required />
                </div>
              </div>
              <div>
                <label className="sup-label">Email address</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="sup-input" placeholder="you@example.com" required />
                </div>
              </div>
              <div>
                <label className="sup-label">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    className="sup-input pr-11" placeholder="Min 6 characters" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 rounded-lg transition-colors">
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep('role')} className="sup-btn-sec flex-1">
                  <FiArrowLeft className="w-4 h-4" /> Back
                </button>
                <button type="submit" className="sup-btn flex-1">
                  Next <FiArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* ── Step: Profile ── */}
          {step === 'profile' && (
            <form onSubmit={isGoogleFlow ? handleGoogleProfileSubmit : handleFinalSubmit} className="sup-scale space-y-4">
              <div className="mb-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{role === 'student' ? '🎓' : '💼'}</span>
                  <h2 className="text-xl font-bold text-gray-900">{role === 'student' ? 'Student' : 'Alumni'} profile</h2>
                </div>
                <p className="text-sm text-gray-500">Help us personalise your experience</p>
              </div>

              {role === 'student' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="sup-label">Branch / Degree</label>
                      <input type="text" value={branch} onChange={e => setBranch(e.target.value)}
                        className="sup-input-plain" placeholder="CSE, ECE..." />
                    </div>
                    <div>
                      <label className="sup-label">Year of Study</label>
                      <select value={year} onChange={e => setYear(e.target.value)} className="sup-select">
                        {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="sup-label">Interests <span className="text-gray-400 font-normal">(comma separated)</span></label>
                    <input type="text" value={interests} onChange={e => setInterests(e.target.value)}
                      className="sup-input-plain" placeholder="Web Dev, AI/ML, Cloud..." />
                  </div>
                  <div>
                    <label className="sup-label">Career Goals</label>
                    <textarea value={goals} onChange={e => setGoals(e.target.value)}
                      className="sup-input-plain resize-none" rows={2} placeholder="I want to become a full-stack developer..." />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="sup-label">Company</label>
                      <div className="relative">
                        <FiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        <input type="text" value={company} onChange={e => setCompany(e.target.value)}
                          className="sup-input" placeholder="Google, TCS..." />
                      </div>
                    </div>
                    <div>
                      <label className="sup-label">Job Role</label>
                      <input type="text" value={jobRole} onChange={e => setJobRole(e.target.value)}
                        className="sup-input-plain" placeholder="SDE, Data Scientist..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="sup-label">Experience (years)</label>
                      <input type="number" min="0" max="50" value={experience} onChange={e => setExperience(e.target.value)}
                        className="sup-input-plain" />
                    </div>
                    <div>
                      <label className="sup-label">LinkedIn</label>
                      <div className="relative">
                        <FiLinkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)}
                          className="sup-input" placeholder="linkedin.com/in/..." />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="sup-label">Skills <span className="text-gray-400 font-normal">(comma separated)</span></label>
                <input type="text" value={skills} onChange={e => setSkills(e.target.value)}
                  className="sup-input-plain" placeholder="React, Python, Node.js..." />
              </div>

              <div className="flex gap-3 pt-1">
                {!isGoogleFlow && (
                  <button type="button" onClick={() => setStep('account')} className="sup-btn-sec flex-1">
                    <FiArrowLeft className="w-4 h-4" /> Back
                  </button>
                )}
                <button type="submit" disabled={loading} className="sup-btn flex-1 py-3">
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>🎉 Create Account</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="sup-fade text-center text-xs text-gray-400 mt-5" style={{ animationDelay: '250ms' }}>
          By creating an account you agree to our{' '}
          <span className="underline cursor-pointer" style={{ color: '#6366f1' }}>Terms of Service</span>
          {' '}and{' '}
          <span className="underline cursor-pointer" style={{ color: '#6366f1' }}>Privacy Policy</span>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;