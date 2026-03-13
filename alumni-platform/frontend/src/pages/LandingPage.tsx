import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiUsers, FiBriefcase, FiMessageCircle, FiAward, FiArrowRight,
  FiCheckCircle, FiStar, FiZap, FiBook, FiTarget, FiCode,
  FiTrendingUp, FiShield, FiGlobe, FiMenu, FiX, FiDownload,
  FiUserCheck, FiCpu,
} from 'react-icons/fi';
import { motion, AnimatePresence, useInView } from 'framer-motion';

/* --- BeforeInstallPromptEvent type --- */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const FEATURES = [
  {
    icon: FiUsers,
    title: 'Smart Mentor Matching',
    description: 'AI-powered algorithm connects you with the most compatible alumni mentors based on your goals, skills, and interests.',
    color: 'from-indigo-500 to-purple-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    iconColor: 'text-indigo-600',
  },
  {
    icon: FiMessageCircle,
    title: 'AI Career Chatbot',
    description: 'Get personalized career guidance 24/7 from our Groq-powered chatbot. Ask about internships, skills, or career paths.',
    color: 'from-purple-500 to-pink-500',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    icon: FiZap,
    title: 'Interview Practice',
    description: 'Simulate real technical and HR interviews with AI. Get instant feedback, scoring, and model answers to improve fast.',
    color: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50',
    border: 'border-pink-100',
    iconColor: 'text-pink-600',
  },
  {
    icon: FiBriefcase,
    title: 'Exclusive Job Board',
    description: 'Access jobs, internships, and referrals posted exclusively by alumni for students from your college network.',
    color: 'from-indigo-400 to-cyan-500',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
    iconColor: 'text-cyan-600',
  },
  {
    icon: FiBook,
    title: 'Discussion Forum',
    description: 'Ask questions, share knowledge, and collaborate with the community. Expert alumni answer your technical questions.',
    color: 'from-violet-500 to-indigo-500',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    iconColor: 'text-violet-600',
  },
  {
    icon: FiTarget,
    title: 'Skill Roadmaps',
    description: 'AI generates personalized learning roadmaps with curated resources to help you master any technology or domain.',
    color: 'from-purple-400 to-pink-400',
    bg: 'bg-fuchsia-50',
    border: 'border-fuchsia-100',
    iconColor: 'text-fuchsia-600',
  },
];

const STATS = [
  { value: '500+', label: 'Active Alumni', icon: FiUsers, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { value: '2,000+', label: 'Students', icon: FiTrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  { value: '300+', label: 'Mentorships', icon: FiShield, color: 'text-pink-600', bg: 'bg-pink-50' },
  { value: '1,000+', label: 'Opportunities', icon: FiGlobe, color: 'text-indigo-500', bg: 'bg-indigo-50' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: FiUserCheck,
    title: 'Create Your Profile',
    desc: 'Sign up as a student or alumni and complete your profile with skills, interests, and career goals.',
    gradient: 'from-indigo-500 to-purple-600',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  {
    step: '02',
    icon: FiUsers,
    title: 'Connect with Alumni Mentors',
    desc: 'Browse mentors, join discussions, apply for exclusive jobs, and chat with the community.',
    gradient: 'from-purple-500 to-pink-500',
    badge: 'bg-purple-100 text-purple-700',
  },
  {
    step: '03',
    icon: FiCpu,
    title: 'Get Career Guidance & Jobs',
    desc: 'Use AI-powered interview prep, career chatbot, skill roadmaps, and get referrals from alumni.',
    gradient: 'from-pink-500 to-rose-500',
    badge: 'bg-pink-100 text-pink-700',
  },
];

const TESTIMONIALS = [
  {
    text: "Found my dream internship through CareerSaathi! An alumnus referred me after a single chat. The AI interview prep was a game-changer.",
    name: 'Riya Sharma', role: 'Student, CSE Final Year', avatar: 'RS', gradient: 'from-indigo-500 to-purple-600', stars: 5,
  },
  {
    text: "As an alumnus, this platform lets me give back meaningfully. The AI mentor matching brings me students who are a great fit for my domain.",
    name: 'Arjun Mehta', role: 'Senior SDE @ Google', avatar: 'AM', gradient: 'from-purple-500 to-pink-500', stars: 5,
  },
  {
    text: "The career chatbot helped me identify my skill gaps and the roadmap feature gave me a clear path to my first job.",
    name: 'Priya Nair', role: 'Student, IT 3rd Year', avatar: 'PN', gradient: 'from-pink-500 to-rose-400', stars: 5,
  },
];

/* --- Scroll-reveal wrapper using framer-motion + useInView --- */
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className = '',
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }}
      transition={{ duration: 0.6, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const LandingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstalled(true); setInstallPrompt(null); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    const prompt = installPrompt as BeforeInstallPromptEvent;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') { setInstalled(true); setInstallPrompt(null); }
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden font-sans">

      {/* ---------- NAVBAR ---------- */}
      <nav className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <FiAward className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-gray-900 hidden min-[380px]:block">CareerSaathi</span>
          </div>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-1">
            {[
              { label: 'Features', href: '#features' },
              { label: 'How it works', href: '#how-it-works' },
              { label: 'Reviews', href: '#testimonials' },
            ].map(({ label, href }) => (
              <a key={label} href={href}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200">
                {label}
              </a>
            ))}
          </div>

          {/* CTA + hamburger */}
          <div className="flex items-center gap-2">
            {currentUser ? (
              <Link to="/dashboard" className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200">
                Dashboard <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block text-sm font-semibold px-4 py-2 rounded-xl text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 transition-all duration-200">
                  Log in
                </Link>
                <Link to="/signup" className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200">
                  <span className="hidden sm:inline">Get Started </span><span className="sm:hidden">Start </span><FiArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="sm:hidden p-2 rounded-xl text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              aria-label="Open menu"
            >
              <FiMenu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ---------- MOBILE DRAWER ---------- */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm sm:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-72 z-[60] sm:hidden flex flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <FiAward className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">CareerSaathi</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-all">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 px-4 pt-5 flex-1">
                {[
                  { label: 'Features', href: '#features' },
                  { label: 'How it works', href: '#how-it-works' },
                  { label: 'Reviews', href: '#testimonials' },
                ].map(({ label, href }) => (
                  <a key={label} href={href} onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-semibold text-gray-700 hover:text-indigo-700 hover:bg-indigo-50 transition-all duration-200">
                    {label}
                    <FiArrowRight className="w-3.5 h-3.5 text-gray-300" />
                  </a>
                ))}
              </nav>
              <div className="px-4 pb-8 pt-4 border-t border-gray-100 flex flex-col gap-3">
                {currentUser ? (
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm shadow-md">
                    Dashboard <FiArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                      className="text-center py-3 text-sm font-semibold rounded-2xl border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all">
                      Log in
                    </Link>
                    <Link to="/signup" onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm shadow-md">
                      Get Started <FiArrowRight className="w-4 h-4" />
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 pt-16 pb-28 lg:pt-24 lg:pb-36">
        {/* Blobs */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-200/40 to-purple-200/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-pink-200/30 to-purple-200/20 blur-3xl pointer-events-none" />
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.35]"
          style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-white border border-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-8 shadow-sm shadow-indigo-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Powered by Groq AI
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1] mb-6">
            Bridge the Gap Between{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Alumni</span>
            {' & '}
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Students</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            An intelligent platform for mentorship, AI career guidance, interview practice, job referrals, and community learning — built exclusively for your college network.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link to="/signup"
              className="flex items-center gap-2 w-full sm:w-auto justify-center text-base font-semibold px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-300">
              Start for Free <FiArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features"
              className="flex items-center gap-2 w-full sm:w-auto justify-center text-base font-semibold px-8 py-3.5 rounded-2xl bg-white border-2 border-indigo-200 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 hover:-translate-y-0.5 transition-all duration-300 shadow-sm">
              Explore Features
            </a>
            {installPrompt && !installed && (
              <button onClick={handleInstall}
                className="flex items-center justify-center gap-2 w-full sm:w-auto text-base font-semibold px-8 py-3.5 rounded-2xl bg-white border-2 border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:-translate-y-0.5 transition-all duration-300 shadow-sm">
                <FiDownload className="w-4 h-4" /> Install App
              </button>
            )}
            {installed && (
              <span className="flex items-center gap-2 text-sm text-emerald-600 font-semibold px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-200">
                <FiCheckCircle className="w-4 h-4" /> App Installed!
              </span>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.45 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
            {['No credit card required', 'Free to use', 'Secure & private'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <FiCheckCircle className="w-4 h-4 text-emerald-500" /> {t}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------- STATS ---------- */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 100}>
              <div className="group cursor-default">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-2xl ${s.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
                <p className={`text-3xl sm:text-4xl font-extrabold mb-1 ${s.color}`}>{s.value}</p>
                <p className="text-sm text-gray-500 font-medium">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-indigo-100 border border-indigo-200 rounded-full text-indigo-600 text-sm font-semibold mb-4">Features</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Succeed</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">One platform, all the tools that matter for your career growth</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className={`group cursor-default rounded-2xl p-6 bg-white border ${f.border} hover:border-transparent hover:-translate-y-2 hover:shadow-xl transition-all duration-300 h-full`}>
                  <div className={`w-12 h-12 rounded-2xl ${f.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2.5 text-base group-hover:text-indigo-700 transition-colors">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className={`text-xs font-semibold ${f.iconColor} flex items-center gap-1 group-hover:gap-2 transition-all`}>
                      Learn more <FiArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section id="how-it-works" className="py-24 bg-indigo-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-purple-100 border border-purple-200 rounded-full text-purple-600 text-sm font-semibold mb-4">How It Works</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Get Started in{' '}
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">3 Simple Steps</span>
            </h2>
            <p className="text-gray-500 text-lg">Simple, fast, and designed for your growth</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[calc(33%-2px)] right-[calc(33%-2px)] h-0.5 bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300" />
            {HOW_IT_WORKS.map((step, i) => (
              <Reveal key={i} delay={i * 150}>
                <div className="group text-center cursor-default">
                  <div className="relative mx-auto mb-6 w-20 h-20">
                    <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                      <step.icon className="w-8 h-8 text-white" />
                    </div>
                    <span className={`absolute -top-2 -right-2 w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center shadow-sm ${step.badge}`}>
                      {step.step}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3 text-lg group-hover:text-indigo-700 transition-colors">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- TESTIMONIALS ---------- */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-pink-100 border border-pink-200 rounded-full text-pink-600 text-sm font-semibold mb-4">Reviews</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Loved by{' '}
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Students & Alumni</span>
            </h2>
            <div className="flex justify-center items-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <FiStar key={i} className="w-5 h-5 text-amber-400" style={{ fill: '#fbbf24' }} />
              ))}
              <span className="ml-2 text-sm text-gray-400 font-medium">4.9/5 from 200+ reviews</span>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="group cursor-default h-full rounded-2xl p-6 bg-white border border-gray-100 hover:border-transparent hover:-translate-y-2 hover:shadow-xl transition-all duration-300 flex flex-col">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(t.stars)].map((_, j) => (
                      <FiStar key={j} className="w-4 h-4 text-amber-400" style={{ fill: '#fbbf24' }} />
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6 italic flex-1">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0`}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="py-24 relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500">
        <div className="absolute inset-0 pointer-events-none opacity-[0.12]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/10 rounded-full blur-3xl" />
        <Reveal className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/30">
            <FiCode className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">Ready to Transform Your Career?</h2>
          <p className="text-indigo-100 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Join thousands of students and alumni already using CareerSaathi to build meaningful connections and accelerate their careers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup"
              className="flex items-center justify-center gap-2 w-full sm:w-auto bg-white text-indigo-700 font-bold px-8 py-3.5 rounded-2xl hover:bg-indigo-50 hover:-translate-y-0.5 transition-all shadow-lg text-base">
              Join as Student <FiArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/signup"
              className="flex items-center justify-center gap-2 w-full sm:w-auto border-2 border-white/40 text-white font-semibold px-8 py-3.5 rounded-2xl hover:bg-white/10 hover:border-white/70 hover:-translate-y-0.5 transition-all text-base">
              Join as Alumni
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="bg-gray-950 text-gray-500 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <FiAward className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold text-lg">CareerSaathi</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs text-gray-400">Intelligent platform connecting students with alumni for mentorship, career growth, and technical education.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Platform</h4>
              <ul className="space-y-2.5 text-sm">
                {[['Find Mentors', '/mentors'], ['Job Board', '/jobs'], ['Discussion Forum', '/forum'], ['Interview Practice', '/interview']].map(([label, to]) => (
                  <li key={label}><Link to={to} className="hover:text-white transition-colors hover:translate-x-0.5 inline-block">{label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">AI Features</h4>
              <ul className="space-y-2.5 text-sm">
                {[['Career Chatbot', '/chatbot'], ['AI Interview', '/interview'], ['Resume Review', '/profile'], ['Smart Matching', '/mentors']].map(([label, to]) => (
                  <li key={label}><Link to={to} className="hover:text-white transition-colors hover:translate-x-0.5 inline-block">{label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <p>© {new Date().getFullYear()} CareerSaathi. All rights reserved.</p>
            <p>Built with React, Node.js, Firebase & Groq AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;