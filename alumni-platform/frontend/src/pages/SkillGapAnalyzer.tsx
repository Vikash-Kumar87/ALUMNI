import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { aiAPI } from '../services/api';
import { SkillGapAnalysis } from '../types';
import {
  FiTarget, FiZap, FiArrowLeft, FiSearch, FiTrendingUp, FiExternalLink,
  FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiBookOpen, FiClock,
  FiAward, FiStar, FiChevronDown, FiChevronUp, FiRefreshCw, FiLayers,
  FiCode, FiBriefcase,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence, Variants } from 'framer-motion';

/* ──────────────────────────── animation variants ──────────────────────────── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
};
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const slideIn: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 28 } },
};

/* ──────────────────────────── constants ──────────────────────────── */
const POPULAR_TARGETS = [
  { label: 'Google SDE', icon: '🔵', category: 'FAANG' },
  { label: 'Meta Frontend Engineer', icon: '🟣', category: 'FAANG' },
  { label: 'Amazon SDE-2', icon: '🟠', category: 'FAANG' },
  { label: 'Microsoft Software Engineer', icon: '🪟', category: 'FAANG' },
  { label: 'Apple iOS Engineer', icon: '🍎', category: 'FAANG' },
  { label: 'Startup Full Stack', icon: '🚀', category: 'Startup' },
  { label: 'ML Engineer at OpenAI', icon: '🤖', category: 'AI' },
  { label: 'DevOps / SRE at Netflix', icon: '🎬', category: 'Top Tech' },
  { label: 'Data Scientist at Spotify', icon: '🎵', category: 'Top Tech' },
  { label: 'Blockchain Developer', icon: '⛓️', category: 'Web3' },
];

const IMPORTANCE_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string;
  bar: string; icon: React.ElementType; badgeBg: string; badgeText: string;
}> = {
  Essential:    { label: 'Essential',    color: 'text-rose-600',   bg: 'bg-rose-50',    border: 'border-rose-200',   bar: 'from-rose-400 to-red-500',     icon: FiAlertCircle,   badgeBg: '#fff1f2', badgeText: '#e11d48' },
  Important:    { label: 'Important',    color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200',  bar: 'from-amber-400 to-orange-500', icon: FiAlertTriangle, badgeBg: '#fffbeb', badgeText: '#d97706' },
  'Nice to have':{ label: 'Nice to have', color: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-200',bar: 'from-emerald-400 to-teal-500', icon: FiStar,          badgeBg: '#f0fdf4', badgeText: '#059669' },
};

const LEVEL_RANK: Record<string, number> = { None: 0, Beginner: 25, Intermediate: 55, Advanced: 80, Expert: 100 };
const LEVEL_COLOR: Record<string, string> = {
  None: 'from-gray-300 to-gray-400',
  Beginner: 'from-rose-400 to-red-500',
  Intermediate: 'from-amber-400 to-orange-500',
  Advanced: 'from-emerald-400 to-teal-500',
  Expert: 'from-violet-500 to-indigo-600',
};

const RES_ICON: Record<string, string> = { video: '🎬', article: '📄', course: '🎓', docs: '📖', default: '🔗' };

/* ──────────────────────────── animated progress bar ──────────────────────────── */
const AnimBar: React.FC<{ pct: number; gradClass: string; delay?: number; targetPct?: number }> = ({
  pct, gradClass, delay = 0, targetPct,
}) => {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 500 + delay * 80);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${gradClass} transition-all duration-700 ease-out`}
        style={{ width: `${w}%` }}
      />
      {targetPct !== undefined && (
        <div
          className="absolute top-0 h-2 w-0.5 bg-indigo-400 transition-all duration-700 ease-out"
          style={{ left: `${targetPct}%` }}
          title="Target level"
        />
      )}
    </div>
  );
};

/* ──────────────────────────── animated counter ──────────────────────────── */
const AnimNum: React.FC<{ to: number; dur?: number }> = ({ to, dur = 800 }) => {
  const [v, setV] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const t0 = performance.now();
    const run = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setV(Math.round(p * to));
      if (p < 1) raf.current = requestAnimationFrame(run);
    };
    raf.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf.current);
  }, [to, dur]);
  return <>{v}</>;
};

/* ──────────────────────────── skeleton ──────────────────────────── */
const Sk = ({ w = 'w-full', h = 'h-4', r = 'rounded' }: { w?: string; h?: string; r?: string }) => (
  <div className={`skeleton ${w} ${h} ${r}`} />
);
const AnalysisSkeleton = () => (
  <div className="space-y-4">
    <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 p-6 space-y-3">
      <Sk w="w-40" h="h-3" r="rounded-full" />
      <Sk w="w-56" h="h-7" r="rounded-xl" />
      <div className="flex gap-3 mt-2">
        {[...Array(3)].map((_, i) => <Sk key={i} w="w-24" h="h-12" r="rounded-2xl" />)}
      </div>
    </div>
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Sk w="w-9" h="h-9" r="rounded-xl" />
          <Sk w="w-44" h="h-5" r="rounded-lg" />
          <Sk w="w-20" h="h-5" r="rounded-full ml-auto" />
        </div>
        <Sk h="h-2" r="rounded-full" />
        <Sk w="w-3/4" h="h-3" />
      </div>
    ))}
  </div>
);

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
const SkillGapAnalyzer: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSkills = userProfile?.skills || [];

  /* ── analyse ── */
  const handleAnalyze = async (targetStr?: string) => {
    const t = (targetStr ?? target).trim();
    if (!t) { toast.error('Enter a target company / role'); inputRef.current?.focus(); return; }
    setLoading(true);
    setAnalysis(null);
    setExpandedIdx(null);
    setShowAllSkills(false);
    try {
      const res = await aiAPI.analyzeSkillGap(currentSkills, t);
      const data = res.data.analysis as SkillGapAnalysis;
      if (!data) throw new Error('No analysis returned');
      setAnalysis(data);
    } catch (err: any) {
      toast.error(err.message || 'Could not generate analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onPopular = (label: string) => {
    setTarget(label);
    handleAnalyze(label);
  };

  /* ── score ring ── */
  const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
    const r = 36;
    const circ = 2 * Math.PI * r;
    const [dash, setDash] = useState(0);
    useEffect(() => {
      const t = setTimeout(() => setDash((score / 100) * circ), 300);
      return () => clearTimeout(t);
    }, [score, circ]);
    const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';
    return (
      <svg width="88" height="88" className="rotate-[-90deg]">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={circ - dash}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <text x="44" y="44" textAnchor="middle" dominantBaseline="central"
          className="rotate-90 origin-center"
          style={{ fontSize: 16, fontWeight: 900, fill: color, transform: 'rotate(90deg)', transformOrigin: '44px 44px' }}>
          <AnimNum to={score} />
        </text>
      </svg>
    );
  };

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#f5f3ff 0%,#f8f9ff 40%,#fff 100%)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-16">

        {/* ── top bar ── */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors group">
            <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
        </div>

        {/* ── page header ── */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
              <FiTarget className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Skill Gap Analyzer</h1>
          </div>
          <p className="text-sm text-gray-500 ml-12">Enter your target role → AI compares your skills → get a ranked action plan</p>
        </motion.div>

        {/* ── search bar ── */}
        <motion.form
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
          onSubmit={e => { e.preventDefault(); handleAnalyze(); }}
          className="mb-5"
        >
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder='e.g. "Google SDE-2", "Meta Frontend Engineer"…'
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent text-sm shadow-sm transition-all"
              />
            </div>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.96 }}
              disabled={loading}
              className="px-5 py-3 rounded-2xl text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center gap-2 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 4px 18px rgba(99,102,241,0.35)' }}
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <FiZap className="w-4 h-4" />}
              {loading ? 'Analyzing…' : 'Analyze'}
            </motion.button>
          </div>
        </motion.form>

        {/* ── current skills pill row ── */}
        {currentSkills.length > 0 && !loading && !analysis && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Your Current Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {currentSkills.map((s, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">{s}</span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── popular targets ── */}
        {!loading && !analysis && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Popular Targets</p>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_TARGETS.map((pt, i) => (
                <motion.button
                  key={i}
                  onClick={() => onPopular(pt.label)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-gray-100 text-left hover:border-violet-200 hover:bg-violet-50/40 hover:shadow-sm transition-all group"
                >
                  <span className="text-xl flex-shrink-0">{pt.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate group-hover:text-violet-700 transition-colors">{pt.label}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{pt.category}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── skeleton ── */}
        {loading && <AnalysisSkeleton />}

        {/* ═══════════════════ ANALYSIS RESULT ═══════════════════ */}
        {analysis && !loading && (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">

            {/* ── HERO SCORE CARD ── */}
            <motion.div variants={fadeUp}
              className="relative overflow-hidden rounded-3xl p-6"
              style={{ background: 'linear-gradient(135deg,#6366f108,#a855f70a)', border: '1.5px solid #a855f725' }}
            >
              {/* bg orbs */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-8" style={{ background: 'radial-gradient(circle,#a855f7,transparent)' }} />
              <div className="absolute -bottom-8 -left-6 w-28 h-28 rounded-full opacity-6" style={{ background: 'radial-gradient(circle,#6366f1,transparent)' }} />

              <div className="relative flex items-center gap-5">
                {/* ring */}
                <div className="flex-shrink-0 relative">
                  <ScoreRing score={analysis.gapScore ?? 60} />
                  <p className="text-[9px] text-center text-gray-400 font-bold mt-0.5 -ml-1">READINESS</p>
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black text-gray-900 leading-snug">
                    {analysis.targetRole || target}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">{analysis.estimatedTime ?? '3–6 months'} to be job-ready</p>

                  {/* stat chips */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[
                      { icon: FiCheckCircle, val: analysis.requiredSkills?.filter(s => (LEVEL_RANK[s.currentLevel ?? 'None'] ?? 0) >= 55).length ?? 0, label: 'Skills OK', color: '#10b981' },
                      { icon: FiAlertCircle, val: analysis.requiredSkills?.filter(s => s.importance === 'Essential' && (LEVEL_RANK[s.currentLevel ?? 'None'] ?? 0) < 55).length ?? 0, label: 'Critical Gaps', color: '#ef4444' },
                      { icon: FiBookOpen,    val: analysis.requiredSkills?.length ?? 0, label: 'Total Skills', color: '#6366f1' },
                    ].map(({ icon: Icon, val, label, color }) => (
                      <div key={label} className="flex items-center gap-1.5 bg-white/80 rounded-xl px-2.5 py-1.5 shadow-sm border border-white/60">
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                        <span className="text-xs font-black text-gray-800">{val}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── PRIORITIZED LEARNING PATH ── */}
            {analysis.prioritizedLearningPath?.length > 0 && (
              <motion.div variants={fadeUp}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#6366f118', border: '1.5px solid #6366f130' }}>
                    <FiLayers className="w-4 h-4" style={{ color: '#6366f1' }} />
                  </div>
                  <h2 className="text-sm font-black text-gray-800">Prioritized Learning Path</h2>
                </div>
                <div className="relative">
                  {/* vertical connector line */}
                  <div className="absolute left-[18px] top-5 bottom-5 w-0.5 bg-gradient-to-b from-violet-300 via-indigo-200 to-transparent rounded-full" />
                  <motion.ol variants={stagger} initial="hidden" animate="show" className="space-y-2 relative">
                    {analysis.prioritizedLearningPath.map((skill, i) => (
                      <motion.li key={i} variants={slideIn}
                        className="flex items-center gap-3 pl-1"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0 shadow-sm z-10"
                          style={{ background: `linear-gradient(135deg,hsl(${260 + i * 20},70%,58%),hsl(${280 + i * 20},70%,52%))` }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-sm">
                          <span className="text-sm font-semibold text-gray-800">{skill}</span>
                          <FiChevronDown className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        </div>
                      </motion.li>
                    ))}
                  </motion.ol>
                </div>
              </motion.div>
            )}

            {/* ── REQUIRED SKILLS ── */}
            {analysis.requiredSkills?.length > 0 && (
              <motion.div variants={fadeUp}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: '#f59e0b18', border: '1.5px solid #f59e0b30' }}>
                      <FiCode className="w-4 h-4" style={{ color: '#f59e0b' }} />
                    </div>
                    <h2 className="text-sm font-black text-gray-800">Required Skills Analysis</h2>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                    {analysis.requiredSkills.length} skills
                  </span>
                </div>

                <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2.5">
                  {(showAllSkills ? analysis.requiredSkills : analysis.requiredSkills.slice(0, 6)).map((skill, i) => {
                    const cfg = IMPORTANCE_CONFIG[skill.importance] ?? IMPORTANCE_CONFIG['Important'];
                    const curPct = LEVEL_RANK[skill.currentLevel ?? 'None'] ?? 0;
                    const tgtPct = LEVEL_RANK[skill.targetLevel ?? 'Advanced'] ?? 80;
                    const hasResources = skill.resources?.length > 0;
                    const isOpen = expandedIdx === i;
                    const SkillIcon = cfg.icon;

                    return (
                      <motion.div key={i} variants={slideIn}
                        className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${cfg.border}`}
                      >
                        {/* header */}
                        <button
                          className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50/50 transition-colors"
                          onClick={() => setExpandedIdx(isOpen ? null : i)}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                            <SkillIcon className={`w-4 h-4 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-gray-900">{skill.skill}</p>
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                                style={{ background: cfg.badgeBg, color: cfg.badgeText }}>
                                {skill.importance}
                              </span>
                            </div>
                            {/* level bar */}
                            <div className="mt-2 space-y-1">
                              <AnimBar pct={curPct} gradClass={LEVEL_COLOR[skill.currentLevel ?? 'None']} delay={i} targetPct={tgtPct} />
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-400">Now: <strong className="text-gray-600">{skill.currentLevel ?? 'None'}</strong></span>
                                <span className="text-gray-400">Target: <strong className="text-indigo-600">{skill.targetLevel ?? 'Advanced'}</strong></span>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 mt-1 text-gray-400">
                            {isOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {/* expandable resources */}
                        <AnimatePresence initial={false}>
                          {isOpen && hasResources && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-1.5">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Learning Resources</p>
                                {skill.resources.map((r, j) => (
                                  <a key={j} href={r.startsWith('http') ? r : `https://www.google.com/search?q=${encodeURIComponent(r)}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl group transition-all hover:bg-violet-50"
                                    style={{ border: '1px solid rgba(139,92,246,0.12)' }}
                                  >
                                    <span className="text-sm">{RES_ICON.default}</span>
                                    <span className="flex-1 text-xs text-gray-700 font-medium group-hover:text-violet-700 transition-colors truncate">{r}</span>
                                    <FiExternalLink className="w-3 h-3 text-gray-300 group-hover:text-violet-400 flex-shrink-0 transition-colors" />
                                  </a>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {analysis.requiredSkills.length > 6 && (
                  <button
                    onClick={() => setShowAllSkills(!showAllSkills)}
                    className="mt-3 w-full py-2.5 rounded-2xl text-xs font-bold text-violet-600 bg-violet-50 border border-violet-100 hover:bg-violet-100 transition-colors"
                  >
                    {showAllSkills ? '▲ Show Less' : `▼ Show All ${analysis.requiredSkills.length} Skills`}
                  </button>
                )}
              </motion.div>
            )}

            {/* ── ESTIMATED TIME ── */}
            <motion.div variants={fadeUp}
              className="flex items-center gap-3 rounded-2xl p-4"
              style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(168,85,247,0.06))', border: '1.5px solid rgba(99,102,241,0.15)' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 2px 10px rgba(99,102,241,0.3)' }}>
                <FiClock className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Estimated Time to Bridge Gap</p>
                <p className="text-sm font-black text-gray-800 mt-0.5">{analysis.estimatedTime ?? '3–6 months'}</p>
              </div>
            </motion.div>

            {/* ── RE-ANALYSE CTA ── */}
            <motion.div variants={fadeUp} className="text-center pt-1">
              <button
                onClick={() => { setAnalysis(null); setTarget(''); setTimeout(() => inputRef.current?.focus(), 100); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}
              >
                <FiRefreshCw className="w-4 h-4" />
                Analyze a Different Role
              </button>
            </motion.div>

          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SkillGapAnalyzer;
