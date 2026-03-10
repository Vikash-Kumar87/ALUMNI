import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiUsers, FiBriefcase, FiMessageCircle, FiAward, FiArrowRight,
  FiCheckCircle, FiStar, FiZap, FiBook, FiTarget, FiCode,
  FiTrendingUp, FiShield, FiGlobe, FiMenu, FiX
} from 'react-icons/fi';

const FEATURES = [
  {
    icon: FiUsers,
    title: 'Smart Mentor Matching',
    description: 'AI-powered algorithm connects you with the most compatible alumni mentors based on your goals, skills, and interests.',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    icon: FiMessageCircle,
    title: 'AI Career Chatbot',
    description: 'Get personalized career guidance 24/7 from our Gemini-powered chatbot. Ask about internships, skills, or career paths.',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: FiZap,
    title: 'Interview Practice',
    description: 'Simulate real technical and HR interviews with AI. Get instant feedback, scoring, and model answers to improve fast.',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    icon: FiBriefcase,
    title: 'Exclusive Job Board',
    description: 'Access jobs, internships, and referrals posted exclusively by alumni for students from your college network.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: FiBook,
    title: 'Discussion Forum',
    description: 'Ask questions, share knowledge, and collaborate with the community. Expert alumni answer your technical questions.',
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    icon: FiTarget,
    title: 'Skill Roadmaps',
    description: 'AI generates personalized learning roadmaps with curated resources to help you master any technology or domain.',
    gradient: 'from-cyan-500 to-blue-600',
  },
];

const STATS = [
  { value: '500+', label: 'Active Alumni', icon: FiUsers, color: 'text-primary-600' },
  { value: '2,000+', label: 'Students', icon: FiTrendingUp, color: 'text-violet-600' },
  { value: '300+', label: 'Mentorships', icon: FiShield, color: 'text-emerald-600' },
  { value: '1,000+', label: 'Opportunities', icon: FiGlobe, color: 'text-amber-600' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Create Your Profile', desc: 'Sign up as a student or alumni and complete your profile with skills, interests, and goals.', color: 'from-primary-500 to-violet-600' },
  { step: '02', title: 'Connect & Explore', desc: 'Browse mentors, join discussions, apply for jobs, and chat with the community.', color: 'from-emerald-500 to-teal-600' },
  { step: '03', title: 'Grow with AI', desc: 'Use AI-powered features for interview prep, career guidance, skill roadmaps, and resume review.', color: 'from-amber-400 to-orange-500' },
];

const TESTIMONIALS = [
  {
    text: "Found my dream internship through AlumniConnect! An alumnus referred me after a single chat. The AI interview prep was a game-changer.",
    name: "Riya Sharma", role: "Student, CSE Final Year", avatar: "RS", gradient: 'from-primary-500 to-violet-600',
  },
  {
    text: "As an alumnus, this platform lets me give back meaningfully. The AI mentor matching brings me students who are a great fit for my domain.",
    name: "Arjun Mehta", role: "Senior SDE @ Google", avatar: "AM", gradient: 'from-emerald-500 to-teal-600',
  },
  {
    text: "The career chatbot helped me identify my skill gaps and the roadmap feature gave me a clear path to my first job.",
    name: "Priya Nair", role: "Student, IT 3rd Year", avatar: "PN", gradient: 'from-amber-400 to-rose-500',
  },
];

const LandingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className={`sticky top-0 z-50 transition-all duration-500 relative ${scrolled ? 'bg-white/90 backdrop-blur-2xl shadow-md border-b border-indigo-100/60' : 'bg-white/70 backdrop-blur-md border-b border-transparent'}`}>
        {/* Animated rainbow bottom line */}
        <div className="navbar-color-line" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-glow animate-breathe">
              <FiAward className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight hidden min-[380px]:block text-gradient-static">AlumniConnect</span>
          </div>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-1">
            {[
              { label: 'Features', href: '#features' },
              { label: 'How it works', href: '#how-it-works' },
              { label: 'Reviews', href: '#testimonials' },
            ].map(({ label, href }) => (
              <a key={label} href={href}
                className="relative px-4 py-2 text-sm font-semibold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200 group">
                {label}
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-0 group-hover:w-5 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300" />
              </a>
            ))}
          </div>

          {/* Right: CTA + hamburger */}
          <div className="flex items-center gap-2">
            {currentUser ? (
              <Link to="/dashboard" className="btn-gradient btn-gradient-animated text-sm">
                <span className="hidden sm:inline">Dashboard </span><span className="sm:hidden">Go </span><FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-300">
                  Log in
                </Link>
                <Link to="/signup" className="btn-gradient btn-gradient-animated text-sm">
                  <span className="hidden sm:inline">Get Started </span><span className="sm:hidden">Start </span><FiArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="sm:hidden p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all"
              aria-label="Open menu"
            >
              <FiMenu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Sidebar ── */}
      {/* Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm sm:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-72 z-[60] sm:hidden flex flex-col transition-transform duration-300 ease-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'linear-gradient(160deg,#eef2ff 0%,#f5f3ff 50%,#ecfdf5 100%)' }}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-indigo-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-glow">
              <FiAward className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-extrabold text-gradient-static">AlumniConnect</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 px-4 pt-5 flex-1">
          {[
            { label: 'Features', href: '#features', color: 'from-indigo-500 to-violet-600' },
            { label: 'How it works', href: '#how-it-works', color: 'from-violet-500 to-purple-600' },
            { label: 'Reviews', href: '#testimonials', color: 'from-emerald-500 to-teal-600' },
          ].map(({ label, href, color }) => (
            <a key={label} href={href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold text-gray-700 hover:text-indigo-700 hover:bg-white/70 transition-all duration-200 group">
              <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${color} group-hover:scale-125 transition-transform`} />
              {label}
              <FiArrowRight className="w-3.5 h-3.5 ml-auto text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </a>
          ))}
        </nav>

        {/* Bottom CTA */}
        <div className="px-4 pb-8 pt-4 border-t border-indigo-100 flex flex-col gap-3">
          {currentUser ? (
            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}
              className="btn-gradient btn-gradient-animated w-full justify-center py-3 text-sm">
              Go to Dashboard <FiArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 text-sm font-semibold rounded-2xl border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all">
                Log in
              </Link>
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)}
                className="btn-gradient btn-gradient-animated w-full justify-center py-3 text-sm">
                Get Started <FiArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </div>
      <section className="relative overflow-hidden bg-gradient-hero pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl bg-gradient-to-br from-primary-400 to-violet-500 aurora-blob" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-15 blur-3xl bg-gradient-to-br from-emerald-400 to-teal-500 aurora-blob-2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5 blur-3xl bg-gradient-to-br from-primary-300 to-violet-400 animate-breathe" />
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(#4f46e5 1px,transparent 1px),linear-gradient(to right,#4f46e5 1px,transparent 1px)', backgroundSize: '64px 64px' }} />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-primary-100 text-primary-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-8 shadow-sm animate-fade-in-down">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
            </span>
            Powered by Google Gemini AI
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.1] mb-6 animate-fade-in-up">
            Bridge the Gap Between{' '}
            <span className="text-gradient">Alumni</span>
            {' & '}
            <span className="inline-block bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">Students</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in delay-100">
            An intelligent platform for mentorship, AI career guidance, interview practice, job referrals, and community learning — built exclusively for your college network.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-fade-in-up delay-200">
            <Link to="/signup" className="btn-gradient text-base px-8 py-3.5 rounded-2xl w-full sm:w-auto">
              Start for Free <FiArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className="text-base text-gray-600 hover:text-gray-900 font-semibold px-8 py-3.5 border-2 border-gray-200 rounded-2xl hover:border-gray-300 hover:bg-gray-50 transition-all w-full sm:w-auto text-center">
              Explore Features
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400 animate-fade-in delay-300">
            {['No credit card required', 'Free to use', 'Secure & private'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <FiCheckCircle className="w-4 h-4 text-emerald-500" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 text-center">
          {STATS.map((s, i) => (
            <div key={s.label} className="group animate-on-scroll" style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="w-13 h-13 mx-auto mb-3 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:scale-110 group-hover:shadow-soft transition-all duration-300">
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <p className={`text-4xl font-extrabold mb-1 ${s.color} animate-breathe`}>{s.value}</p>
              <p className="text-sm text-gray-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-gradient-mesh">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 animate-on-scroll">
            <span className="section-badge">Features</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">Everything You Need to Succeed</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">One platform, all the tools that matter for your career growth</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="card-hover-glow card-spotlight group cursor-default animate-on-scroll hover:scale-105 hover:-translate-y-2 hover:shadow-2xl transition-all duration-400" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className={`icon-box w-12 h-12 bg-gradient-to-br ${f.gradient} mb-5 shadow-md`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2.5 group-hover:text-primary-600 transition-colors">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <span className="text-xs font-semibold text-primary-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                    Learn more <FiArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 animate-on-scroll">
            <span className="section-badge-emerald">Process</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">Get Started in 3 Simple Steps</h2>
            <p className="text-gray-500 text-lg">Simple, fast, and designed for your growth</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-[calc(33%-4px)] right-[calc(33%-4px)] h-0.5 bg-gradient-to-r from-primary-200 via-pink-200 to-amber-200" />
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="text-center animate-on-scroll" style={{ transitionDelay: `${i * 150}ms` }}>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} text-white font-extrabold text-xl flex items-center justify-center mx-auto mb-6 shadow-lg hover:scale-110 hover:shadow-glow transition-all duration-300 cursor-default`}>
                  {step.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-3 text-lg">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-gradient-mesh">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 animate-on-scroll">
            <span className="section-badge-violet">Reviews</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">Loved by Students & Alumni</h2>
            <div className="flex justify-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => <FiStar key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />)}
              <span className="ml-2 text-sm text-gray-500 font-medium">4.9/5 from 200+ reviews</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card-hover-glow group animate-on-scroll hover:scale-105 hover:-translate-y-2 hover:shadow-2xl transition-all duration-400" style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => <FiStar key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} text-white font-bold flex items-center justify-center text-sm shadow-sm`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-violet-800" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px,transparent 1px),linear-gradient(to right,rgba(255,255,255,.15) 1px,transparent 1px)', backgroundSize: '64px 64px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl aurora-blob" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl aurora-blob-2" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20">
            <FiCode className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">Ready to Transform Your Career?</h2>
          <p className="text-primary-100 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Join thousands of students and alumni already using AlumniConnect to build meaningful connections and accelerate their careers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="bg-white text-primary-700 font-bold px-8 py-3.5 rounded-2xl hover:bg-primary-50 transition-all flex items-center gap-2 text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 w-full sm:w-auto justify-center">
              Join as Student <FiArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/signup" className="border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-2xl hover:bg-white/10 transition-all text-base hover:-translate-y-0.5 w-full sm:w-auto justify-center flex items-center">
              Join as Alumni
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-500 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center">
                  <FiAward className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold text-lg">AlumniConnect</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs text-gray-400">Intelligent platform connecting students with alumni for mentorship, career growth, and technical education.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Platform</h4>
              <ul className="space-y-2.5 text-sm">
                {[['Find Mentors','/mentors'],['Job Board','/jobs'],['Discussion Forum','/forum'],['Interview Practice','/interview']].map(([label,to])=>(
                  <li key={label}><Link to={to} className="hover:text-white transition-colors hover:translate-x-0.5 inline-block">{label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">AI Features</h4>
              <ul className="space-y-2.5 text-sm">
                {[['Career Chatbot','/chatbot'],['AI Interview','/interview'],['Resume Review','/profile'],['Smart Matching','/mentors']].map(([label,to])=>(
                  <li key={label}><Link to={to} className="hover:text-white transition-colors hover:translate-x-0.5 inline-block">{label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <p>© {new Date().getFullYear()} AlumniConnect. All rights reserved.</p>
            <p>Built with React, Node.js, Firebase & Gemini AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;