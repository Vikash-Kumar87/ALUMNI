import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiBriefcase, FiAward, FiArrowRight, FiArrowLeft, FiCheck } from 'react-icons/fi';
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
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center shadow-glow">
              <FiAward className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">AlumniConnect</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create your account</h1>
          <p className="text-gray-500 mt-2">Already have one? <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link></p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 transition-all duration-300`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < currentStepIndex ? 'bg-primary-600 text-white' :
                  i === currentStepIndex ? 'bg-primary-600 text-white ring-4 ring-primary-100' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {i < currentStepIndex ? <FiCheck className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-semibold hidden sm:block ${i === currentStepIndex ? 'text-primary-700' : 'text-gray-400'}`}>
                  {STEP_LABELS[i]}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 max-w-8 rounded-full transition-all duration-500 ${i < currentStepIndex ? 'bg-primary-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="card shadow-card gradient-border">
          {/* Step: Role */}
          {step === 'role' && (
            <div className="animate-scale-in">
              <h2 className="text-lg font-bold text-gray-900 mb-5">I am a...</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {(['student', 'alumni'] as Role[]).map(r => (
                  <button key={r} onClick={() => setRole(r)}
                    className={`p-5 rounded-2xl border-2 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      role === r ? 'border-primary-500 bg-primary-50 shadow-md animate-pop' : 'border-gray-200 hover:border-primary-200 hover:bg-primary-50/20'
                    }`}>
                    <div className="text-3xl mb-2">{r === 'student' ? '🎓' : '💼'}</div>
                    <p className="font-bold text-gray-900 capitalize">{r}</p>
                    <p className="text-xs text-gray-500 mt-1.5">
                      {r === 'student' ? 'Looking for mentorship & guidance' : 'Share experience & mentor students'}
                    </p>
                    {role === r && (
                      <div className="mt-3 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center mx-auto">
                        <FiCheck className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {isGoogleFlow ? (
                <button onClick={() => setStep('profile')} className="btn-gradient w-full py-3">
                  Continue as {role} <FiArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button onClick={handleGoogleSignUp} disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-primary-200 hover:bg-primary-50/30 transition-all font-semibold text-gray-700 disabled:opacity-50 mb-3 group">
                    <FcGoogle className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                    {loading ? 'Creating account...' : `Sign up as ${role} with Google`}
                  </button>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                    <div className="relative flex justify-center"><span className="bg-white px-4 text-xs text-gray-400 font-bold uppercase tracking-widest">or with email</span></div>
                  </div>
                  <button onClick={() => setStep('account')} className="btn-gradient w-full py-3">
                    Continue with Email <FiArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step: Account */}
          {step === 'account' && (
            <form onSubmit={(e) => { e.preventDefault(); setStep('profile'); }} className="animate-scale-in space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Account details</h2>
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="input input-glow pl-10" placeholder="John Doe" required />
                </div>
              </div>
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input input-glow pl-10" placeholder="you@example.com" required />
                </div>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input input-glow pl-10 pr-11" placeholder="Min 6 characters" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 rounded-lg transition-colors">
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep('role')} className="btn-secondary flex-1 gap-2">
                  <FiArrowLeft className="w-4 h-4" /> Back
                </button>
                <button type="submit" className="btn-gradient flex-1">
                  Next <FiArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Step: Profile */}
          {step === 'profile' && (
            <form onSubmit={isGoogleFlow ? handleGoogleProfileSubmit : handleFinalSubmit} className="animate-scale-in space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {role === 'student' ? '🎓 Student' : '💼 Alumni'} profile
              </h2>
              {role === 'student' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Branch / Degree</label>
                      <input type="text" value={branch} onChange={e => setBranch(e.target.value)} className="input" placeholder="CSE, ECE..." />
                    </div>
                    <div>
                      <label className="label">Year of Study</label>
                      <select value={year} onChange={e => setYear(e.target.value)} className="select">
                        {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">Interests <span className="text-gray-400 font-normal">(comma separated)</span></label>
                    <input type="text" value={interests} onChange={e => setInterests(e.target.value)} className="input" placeholder="Web Dev, AI/ML, Cloud..." />
                  </div>
                  <div>
                    <label className="label">Career Goals</label>
                    <textarea value={goals} onChange={e => setGoals(e.target.value)} className="input resize-none" rows={2} placeholder="I want to become a full-stack developer..." />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Company</label>
                      <div className="relative">
                        <FiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input type="text" value={company} onChange={e => setCompany(e.target.value)} className="input pl-10" placeholder="Google, TCS..." />
                      </div>
                    </div>
                    <div>
                      <label className="label">Job Role</label>
                      <input type="text" value={jobRole} onChange={e => setJobRole(e.target.value)} className="input" placeholder="SDE, Data Scientist..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Experience (years)</label>
                      <input type="number" min="0" max="50" value={experience} onChange={e => setExperience(e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="label">LinkedIn URL</label>
                      <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} className="input" placeholder="https://linkedin.com/in/..." />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="label">Skills <span className="text-gray-400 font-normal">(comma separated)</span></label>
                <input type="text" value={skills} onChange={e => setSkills(e.target.value)} className="input" placeholder="React, Python, Node.js..." />
              </div>
              <div className="flex gap-3 pt-2">
                {!isGoogleFlow && (
                  <button type="button" onClick={() => setStep('account')} className="btn-secondary flex-1 gap-2">
                    <FiArrowLeft className="w-4 h-4" /> Back
                  </button>
                )}
                <button type="submit" disabled={loading} className="btn-gradient flex-1 py-3 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">🎉 Create Account</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignupPage;