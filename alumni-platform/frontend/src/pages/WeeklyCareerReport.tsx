import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { aiAPI } from '../services/api';
import { WeeklyReport } from '../types';
import {
  FiZap, FiBookOpen, FiBriefcase, FiUsers, FiTrendingUp, FiTarget,
  FiClock, FiExternalLink, FiRefreshCw, FiShare2, FiCheck, FiArrowLeft,
  FiChevronDown, FiChevronUp, FiStar, FiAlertCircle, FiCalendar, FiAward,
  FiCheckCircle, FiActivity,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence, Variants } from 'framer-motion';

/* ────────────────────────── animations ────────────────────────── */
const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } } };
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const scaleIn: Variants = { hidden: { opacity: 0, scale: 0.88 }, show: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 320, damping: 24 } } };

/* ────────────────────────── energy config ────────────────────────── */
const ENERGY: Record<string, { label: string; emoji: string; gradFrom: string; gradTo: string; bg: string; text: string }> = {
  leveling_up:   { label: 'Leveling Up',   emoji: '🚀', gradFrom: '#6366f1', gradTo: '#8b5cf6', bg: 'rgba(99,102,241,0.08)',  text: '#6366f1'  },
  momentum:      { label: 'In Momentum',   emoji: '⚡', gradFrom: '#f59e0b', gradTo: '#f97316', bg: 'rgba(245,158,11,0.08)',  text: '#d97706'  },
  focused:       { label: 'Deeply Focused',emoji: '🎯', gradFrom: '#0ea5e9', gradTo: '#6366f1', bg: 'rgba(14,165,233,0.08)',  text: '#0284c7'  },
  catching_up:   { label: 'Catching Up',   emoji: '💪', gradFrom: '#10b981', gradTo: '#06b6d4', bg: 'rgba(16,185,129,0.08)',  text: '#059669'  },
};

/* ────────────────────────── priority config ────────────────────────── */
const PRI: Record<string, { color: string; bar: string; label: string }> = {
  high:   { color: 'text-rose-600',   bar: 'from-rose-400 to-red-500',     label: 'High Priority'   },
  medium: { color: 'text-amber-600',  bar: 'from-amber-400 to-orange-500', label: 'Medium Priority' },
  low:    { color: 'text-emerald-600',bar: 'from-emerald-400 to-teal-500', label: 'Low Priority'    },
};

/* ────────────────────────── resource icon ────────────────────────── */
const RES_ICON: Record<string, string> = { video: '🎬', article: '📄', course: '🎓', docs: '📖', default: '🔗' };

/* ────────────────────────── animated progress bar ────────────────────────── */
const ProgressBar: React.FC<{ value: number; gradClass: string; delay?: number }> = ({ value, gradClass, delay = 0 }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 400 + delay * 100);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${gradClass} transition-all duration-700 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

/* ────────────────────────── skeleton ────────────────────────── */
const Sk = ({ w = 'w-full', h = 'h-4', r = 'rounded' }: { w?: string; h?: string; r?: string }) => (
  <div className={`skeleton ${w} ${h} ${r}`} />
);

const ReportSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    {/* hero */}
    <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 p-6 space-y-3">
      <Sk w="w-32" h="h-3" r="rounded-full" />
      <Sk w="w-64" h="h-7" r="rounded-xl" />
      <Sk w="w-48" h="h-4" r="rounded" />
    </div>
    {/* cards */}
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Sk w="w-9" h="h-9" r="rounded-xl" />
          <Sk w="w-40" h="h-5" r="rounded" />
        </div>
        <Sk h="h-3" />
        <Sk w="w-4/5" h="h-3" />
        <Sk w="w-3/5" h="h-3" />
      </div>
    ))}
  </div>
);

/* ────────────────────────── animated counter ────────────────────────── */
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

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
const WeeklyCareerReport: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openLearn, setOpenLearn] = useState<number | null>(null);

  /* ── week label ── */
  const getWeekLabel = () => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `Week of ${fmt(monday)} – ${fmt(sunday)}, ${now.getFullYear()}`;
  };

  /* ── fetch report ── */
  const fetchReport = useCallback(async (silent = false) => {
    if (!userProfile) return;
    if (!silent) setLoading(true);
    try {
      const res = await aiAPI.weeklyReport(
        userProfile.name,
        userProfile.skills || [],
        userProfile.goals || '',
        userProfile.interests || [],
        userProfile.branch || '',
        userProfile.goals || '',
      );
      setReport(res.data.report);
      setOpenLearn(null);
    } catch (err: any) {
      toast.error(err.message || 'Could not generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  /* ── copy summary ── */
  const handleCopy = async () => {
    if (!report) return;
    const text = [
      `📊 AI Weekly Career Report — ${getWeekLabel()}`,
      '',
      `👋 ${report.greeting}`,
      '',
      `📚 Learn This Week:`,
      ...(report.learn || []).map(l => `  • ${l.topic} (~${l.estimatedHours}h)`),
      '',
      `💼 Recommended Jobs:`,
      ...(report.jobs || []).map(j => `  • ${j.title} @ ${j.company}`),
      '',
      `🎯 Weekly Goal: ${report.weeklyGoal}`,
      '',
      `💬 "${report.quote}"`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Report copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  /* ─────────────────── RENDER ─────────────────── */
  const energy = ENERGY[report?.energyLevel ?? 'leveling_up'] ?? ENERGY.leveling_up;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(160deg,#eef2ff 0%,#f5f3ff 35%,#f8fafc 100%)' }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.22), transparent 70%)' }} />
        <div className="absolute top-1/3 -left-16 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.18), transparent 72%)' }} />
        <div className="absolute -bottom-20 right-1/4 w-80 h-80 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.12), transparent 75%)' }} />
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-16 relative z-10">

        {/* ── top bar ── */}
        <div className="flex items-center justify-between mb-6 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl px-3 py-2 shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors group px-2 py-1.5 rounded-xl hover:bg-white"
          >
            <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
          <div className="flex items-center gap-2">
            {report && (
              <motion.button
                onClick={handleCopy}
                whileTap={{ scale: 0.93 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
                style={{ background: copied ? '#dcfce7' : '#ede9fe', color: copied ? '#059669' : '#7c3aed' }}
              >
                {copied ? <FiCheck className="w-3.5 h-3.5" /> : <FiShare2 className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Share'}
              </motion.button>
            )}
            {!loading && (
              <motion.button
                onClick={() => fetchReport()}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-violet-600 hover:border-violet-200 transition-all shadow-sm hover:shadow"
                title="Regenerate report"
              >
                <FiRefreshCw className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>

        {loading ? (
          <ReportSkeleton />
        ) : !report ? null : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">

            {/* ══ HERO ══ */}
            <motion.div
              variants={fadeUp}
              className="relative overflow-hidden rounded-3xl p-6"
              style={{ background: `linear-gradient(135deg,${energy.gradFrom}18,${energy.gradTo}12)`, border: `1.5px solid ${energy.gradFrom}30` }}
            >
              {/* decorative orbs */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
                style={{ background: `radial-gradient(circle,${energy.gradTo},transparent)` }} />
              <div className="absolute -bottom-6 -left-4 w-24 h-24 rounded-full opacity-8"
                style={{ background: `radial-gradient(circle,${energy.gradFrom},transparent)` }} />

              <div className="relative">
                {/* week label + energy badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/70 text-gray-500 border border-gray-200">
                    <FiCalendar className="w-3 h-3" /> {getWeekLabel()}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full" style={{ background: energy.bg, color: energy.text }}>
                    {energy.emoji} {energy.label}
                  </span>
                </div>

                {/* greeting */}
                <h1 className="text-xl font-black text-gray-900 leading-snug mb-1">{report.greeting}</h1>
                <p className="text-sm text-gray-500">Your personalized AI career briefing is ready.</p>

                {/* stat pills */}
                {report.stats && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {[
                      { icon: FiActivity,  val: report.stats.profileStrength,    label: 'Profile',      suffix: '%', grad: 'from-violet-500 to-indigo-500' },
                      { icon: FiBriefcase, val: report.stats.weeklyOpportunities, label: 'Opportunities', suffix: '',  grad: 'from-amber-400 to-orange-500'  },
                      { icon: FiUsers,     val: report.stats.mentorMatches,       label: 'Mentors',      suffix: '',  grad: 'from-emerald-400 to-teal-500'  },
                    ].map(({ icon: Icon, val, label, suffix, grad }) => (
                      <div key={label} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-sm border border-white/60">
                        <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800"><AnimNum to={val} />{suffix}</p>
                          <p className="text-[9px] text-gray-400 font-medium leading-none">{label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* ══ LEARN THIS WEEK ══ */}
            <motion.section variants={fadeUp}>
              <SectionHeader icon={FiBookOpen} label="Learn This Week" color="#8b5cf6" count={report.learn?.length} />
              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2.5 mt-3">
                {(report.learn || []).map((item, i) => (
                  <motion.div key={i} variants={scaleIn}
                    className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden"
                  >
                    {/* header row */}
                    <button
                      className="w-full flex items-start gap-3 p-4 text-left hover:bg-violet-50/50 transition-colors"
                      onClick={() => setOpenLearn(openLearn === i ? null : i)}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                        style={{ background: `hsl(${260 + i * 25},80%,96%)` }}>
                        {['📱','🛠️','🔬','🧩','⚙️'][i % 5]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{item.topic}</p>
                        <p className="text-xs text-gray-500 leading-snug mt-0.5">{item.why}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <FiClock className="w-3 h-3 text-violet-400" />
                          <span className="text-[10px] font-semibold text-violet-500">~{item.estimatedHours}h this week</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 mt-1 text-gray-400">
                        {openLearn === i ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* expanded resources */}
                    <AnimatePresence initial={false}>
                      {openLearn === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-violet-50 space-y-1.5">
                            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-2">Recommended Resources</p>
                            {(item.resources || []).map((r, j) => (
                              <a key={j} href={r.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-xl group transition-all hover:bg-violet-50"
                                style={{ border: '1px solid rgba(139,92,246,0.12)' }}
                              >
                                <span className="text-sm">{RES_ICON[r.type] ?? RES_ICON.default}</span>
                                <span className="flex-1 text-xs text-gray-700 font-medium truncate group-hover:text-violet-700 transition-colors">{r.title}</span>
                                <FiExternalLink className="w-3 h-3 text-gray-300 group-hover:text-violet-400 transition-colors flex-shrink-0" />
                              </a>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>

            {/* ══ JOBS TO APPLY ══ */}
            {report.jobs?.length > 0 && (
              <motion.section variants={fadeUp}>
                <SectionHeader icon={FiBriefcase} label="Jobs to Apply This Week" color="#f59e0b" count={report.jobs.length} />
                <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2.5 mt-3">
                  {report.jobs.map((job, i) => (
                    <motion.div key={i} variants={scaleIn}
                      className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm hover:shadow-md hover:border-amber-200 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <FiBriefcase className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-gray-900">{job.title}</p>
                            {job.urgency === 'hot' && (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-500 border border-rose-100">🔥 HOT</span>
                            )}
                          </div>
                          <p className="text-xs text-amber-600 font-semibold">{job.company}</p>
                          <p className="text-xs text-gray-500 mt-1 leading-snug">{job.matchReason}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(job.skills || []).map((s, k) => (
                              <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>
            )}

            {/* ══ MENTOR MATCHES ══ */}
            {report.mentors?.length > 0 && (
              <motion.section variants={fadeUp}>
                <SectionHeader icon={FiUsers} label="Mentor Matches for You" color="#10b981" count={report.mentors.length} />
                <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2.5 mt-3">
                  {report.mentors.map((mentor, i) => (
                    <motion.div key={i} variants={scaleIn}
                      className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        {/* avatar */}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-white text-sm font-black shadow-sm`}
                          style={{ background: `linear-gradient(135deg,hsl(${150 + i * 40},65%,48%),hsl(${180 + i * 40},70%,42%))` }}
                        >
                          {mentor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-gray-900">{mentor.name}</p>
                            <button
                              onClick={() => navigate('/mentors')}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-colors flex-shrink-0"
                            >
                              Connect →
                            </button>
                          </div>
                          <p className="text-xs text-emerald-600 font-semibold">{mentor.role} @ {mentor.company}</p>
                          <p className="text-xs text-gray-500 mt-1 leading-snug">{mentor.matchReason}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(mentor.skills || []).slice(0, 4).map((s, k) => (
                              <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>
            )}

            {/* ══ SKILL GAPS ══ */}
            {report.skillGaps?.length > 0 && (
              <motion.section variants={fadeUp}>
                <SectionHeader icon={FiTarget} label="Skill Gaps to Close" color="#ef4444" count={report.skillGaps.length} />
                <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2.5 mt-3">
                  {report.skillGaps.map((gap, i) => {
                    const p = PRI[gap.priority] ?? PRI.medium;
                    const pct = gap.priority === 'high' ? 85 : gap.priority === 'medium' ? 55 : 30;
                    return (
                      <motion.div key={i} variants={scaleIn}
                        className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <FiAlertCircle className={`w-4 h-4 flex-shrink-0 ${p.color}`} />
                            <p className="text-sm font-bold text-gray-900">{gap.skill}</p>
                          </div>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${p.color}`}
                            style={{ background: `${p.color.includes('rose') ? '#fff1f2' : p.color.includes('amber') ? '#fffbeb' : '#f0fdf4'}`, border: `1px solid currentColor` }}>
                            {p.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2 leading-snug">{gap.gap}</p>
                        <ProgressBar value={pct} gradClass={p.bar} delay={i} />
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.section>
            )}

            {/* ══ TRENDING ══ */}
            {report.trending?.length > 0 && (
              <motion.section variants={fadeUp}>
                <SectionHeader icon={FiTrendingUp} label="Trending in Your Field" color="#06b6d4" />
                <div className="flex flex-wrap gap-2 mt-3">
                  {report.trending.map((t, i) => (
                    <motion.span key={i}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.05 * i, type: 'spring', stiffness: 320, damping: 22 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
                      style={{
                        background: `hsl(${175 + i * 18},80%,95%)`,
                        color: `hsl(${175 + i * 18},70%,32%)`,
                        borderColor: `hsl(${175 + i * 18},60%,85%)`,
                      }}
                    >
                      <FiTrendingUp className="w-3 h-3" /> {t}
                    </motion.span>
                  ))}
                </div>
              </motion.section>
            )}

            {/* ══ WEEKLY GOAL ══ */}
            {report.weeklyGoal && (
              <motion.div variants={fadeUp}
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(139,92,246,0.06))', border: '1.5px solid rgba(99,102,241,0.18)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 10px rgba(99,102,241,0.3)' }}>
                  <FiCheckCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">This Week's Goal</p>
                  <p className="text-sm font-bold text-gray-800 leading-snug">{report.weeklyGoal}</p>
                </div>
              </motion.div>
            )}

            {/* ══ QUOTE ══ */}
            {report.quote && (
              <motion.div variants={fadeUp}
                className="rounded-2xl px-5 py-4 text-center"
                style={{ background: 'linear-gradient(135deg,#fafafa,#f3f4f6)', border: '1px solid #e5e7eb' }}
              >
                <FiStar className="w-5 h-5 mx-auto mb-2 text-amber-400" />
                <p className="text-sm italic text-gray-600 leading-relaxed">"{report.quote}"</p>
              </motion.div>
            )}

            {/* ══ REGEN CTA ══ */}
            <motion.div variants={fadeUp} className="text-center pt-2">
              <button
                onClick={() => fetchReport()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}
              >
                <FiRefreshCw className="w-4 h-4" />
                Refresh My Report
              </button>
              <p className="text-xs text-gray-400 mt-2">Generates fresh insights from your profile</p>
            </motion.div>

          </motion.div>
        )}
      </div>
    </div>
  );
};

/* ─── helper: section header ─── */
const SectionHeader: React.FC<{ icon: React.ElementType; label: string; color: string; count?: number }> = ({ icon: Icon, label, color, count }) => (
  <div className="flex items-center gap-2.5">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18`, border: `1.5px solid ${color}30` }}>
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <h2 className="text-sm font-black text-gray-800">{label}</h2>
    {count !== undefined && (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: `${color}12`, color }}>
        {count}
      </span>
    )}
  </div>
);

export default WeeklyCareerReport;
