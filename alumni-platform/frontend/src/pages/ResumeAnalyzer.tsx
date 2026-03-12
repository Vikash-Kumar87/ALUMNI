import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, type Variants } from 'framer-motion';
import { aiAPI } from '../services/api';
import {
  FiUpload, FiFileText, FiCheckCircle, FiAlertCircle, FiZap,
  FiTarget, FiTrendingUp, FiList, FiArrowRight, FiRefreshCw, FiInfo,
  FiStar, FiCpu,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;

/* ── Types ── */
interface Suggestion { section: string; issue: string; fix: string; }
interface ResumeReview {
  overallScore: number;
  atsScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: Suggestion[];
  keywords: { present: string[]; missing: string[] };
  actionItems: string[];
}

/* ── Animated score counter ── */
const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v));
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const unsub = rounded.on('change', v => setDisplay(v));
    const ctrl = animate(count, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1] });
    return () => { ctrl.stop(); unsub(); };
  }, [value]);
  return <>{display}</>;
};

/* ── Score ring with animated draw ── */
const ScoreRing: React.FC<{ score: number; label: string; color: string; delay?: number }> = ({ score, label, color, delay = 0 }) => {
  const r = 38, circ = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDrawn(true), delay * 1000 + 200); return () => clearTimeout(t); }, [delay]);
  const dash = drawn ? (score / 100) * circ : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative w-28 h-28">
        <div className="absolute inset-0 rounded-full blur-xl opacity-25" style={{ background: color }} />
        <svg className="w-full h-full -rotate-90" viewBox="0 0 92 92">
          <circle cx="46" cy="46" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle cx="46" cy="46" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 6px ${color}80)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-gray-900 leading-none">
            {drawn ? <AnimatedNumber value={score} /> : 0}
          </span>
          <span className="text-[9px] text-gray-400 font-bold tracking-wider">/100</span>
        </div>
      </div>
      <span className="text-xs font-bold text-gray-500 tracking-wide uppercase">{label}</span>
    </motion.div>
  );
};

/* ── Keyword pill ── */
const Pill: React.FC<{ label: string; present: boolean; delay?: number }> = ({ label, present, delay = 0 }) => (
  <motion.span
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
      present ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
    }`}
  >
    {present ? '✓' : '✗'} {label}
  </motion.span>
);

/* ── List item ── */
const ListItem: React.FC<{ text: string; type: 'good' | 'bad'; index: number }> = ({ text, type, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -16 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.06, duration: 0.35, ease: 'easeOut' }}
    className="flex items-start gap-3 p-3 rounded-xl"
    style={{ background: type === 'good' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)' }}
  >
    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-black ${
      type === 'good' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
    }`}>{type === 'good' ? '✓' : '!'}</span>
    <span className="text-sm text-gray-700 leading-relaxed">{text}</span>
  </motion.div>
);

const SAMPLE_RESUME = `John Doe
Email: john@example.com | Phone: +91-9876543210 | LinkedIn: linkedin.com/in/johndoe

EDUCATION
B.Tech Computer Science Engineering — IIIT Hyderabad (2021–2025) | CGPA: 8.5

SKILLS
React, JavaScript, Python, Node.js, Git

EXPERIENCE
Software Intern — TCS (June 2024 – Aug 2024)
• Built REST APIs using Node.js and Express
• Worked on frontend features using React

PROJECTS
Portfolio Website
• Built a personal portfolio using React and Tailwind CSS

ACHIEVEMENTS
• Winner at college hackathon 2024`;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const ResumeAnalyzer: React.FC = () => {
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ResumeReview | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'suggestions' | 'keywords' | 'actions'>('overview');
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfParsing, setPdfParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf') { toast.error('Please upload a valid PDF file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('PDF must be under 5 MB'); return; }
    setPdfParsing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: unknown) => ((item as { str?: string }).str ?? '')).join(' ');
        pages.push(pageText);
      }
      const extracted = pages.join('\n').replace(/ {2,}/g, ' ').trim();
      if (!extracted) { toast.error('Could not extract text — try pasting manually'); return; }
      setResumeText(extracted);
      setPdfFileName(file.name);
      toast.success(`PDF loaded: ${file.name}`);
    } catch {
      toast.error('Failed to read PDF. Try another file.');
    } finally {
      setPdfParsing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim()) { toast.error('Please paste your resume text or upload a PDF'); return; }
    setLoading(true);
    setReview(null);
    try {
      const res = await aiAPI.reviewResume(resumeText.trim(), targetRole || 'Software Engineer');
      if (res.data.review) {
        setReview(res.data.review);
        setActiveTab('overview');
        toast.success('Analysis complete!');
      } else {
        toast.error('Could not parse AI response. Try again.');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s: number) => s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';
  const scoreLabel = (s: number) => s >= 75 ? '🟢 Good' : s >= 50 ? '🟡 Average' : '🔴 Needs Work';

  const tabs = [
    { key: 'overview',    label: 'Overview',     icon: FiTrendingUp },
    { key: 'suggestions', label: 'Suggestions',  icon: FiAlertCircle },
    { key: 'keywords',    label: 'Keywords',     icon: FiTarget },
    { key: 'actions',     label: 'Action Items', icon: FiList },
  ] as const;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <style>{`
        @keyframes raBlob    { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(24px,-18px) scale(1.07)} }
        @keyframes raSpin    { to{transform:rotate(360deg)} }
        @keyframes raShimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes raFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .ra-blob    { animation: raBlob 16s ease-in-out infinite; }
        .ra-shimmer { background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
                      background-size: 800px 100%; animation: raShimmer 1.6s infinite linear; border-radius:12px; }
        .ra-float   { animation: raFloat 3s ease-in-out infinite; }
        .ra-glass   { background: rgba(255,255,255,0.82); backdrop-filter: blur(20px);
                      -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.7); }
        .ra-btn-glow:hover { box-shadow: 0 0 32px rgba(99,102,241,0.55); }
        .ra-btn-glow { transition: box-shadow 0.22s ease; }
        .ra-card-hover { transition: box-shadow 0.22s, transform 0.22s; }
        .ra-card-hover:hover { box-shadow: 0 12px 40px rgba(99,102,241,0.14); transform: translateY(-2px); }
      `}</style>

      {/* Aurora background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(155deg,#eef2ff 0%,#f5f3ff 25%,#fdf4ff 50%,#ecfdf5 75%,#eff6ff 100%)' }} />
        <div className="ra-blob absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)' }} />
        <div className="ra-blob absolute top-1/3 -left-32 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle,#a855f7,transparent 70%)', animationDelay: '5s' }} />
        <div className="ra-blob absolute -bottom-32 right-1/4 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle,#10b981,transparent 70%)', animationDelay: '9s' }} />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(#6366f1 1px,transparent 1px),linear-gradient(90deg,#6366f1 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Hero */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ duration: 0.45, ease: 'easeOut' }} className="mb-8 rounded-3xl overflow-hidden shadow-2xl">
          <div className="relative px-8 py-12 overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#312e81 0%,#4f46e5 35%,#7c3aed 70%,#9333ea 100%)' }}>
            <div className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,rgba(255,255,255,.5) 1px,transparent 0)', backgroundSize: '24px 24px' }} />
            <div className="ra-float absolute top-4 right-16 w-16 h-16 rounded-full opacity-20"
              style={{ background: 'rgba(255,255,255,0.3)', animationDelay: '0.5s' }} />
            <div className="ra-float absolute bottom-4 right-48 w-10 h-10 rounded-full opacity-15"
              style={{ background: 'rgba(255,255,255,0.4)', animationDelay: '1.5s' }} />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#e0e7ff', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <FiZap className="w-3 h-3 text-yellow-300" /> AI-Powered · Groq LLaMA
                </motion.div>
                <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.5 }}
                  className="text-4xl font-black text-white mb-3 tracking-tight">
                  Resume Analyzer
                </motion.h1>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28, duration: 0.5 }}
                  className="text-indigo-200 text-base leading-relaxed max-w-md">
                  Upload your resume → get instant AI feedback, ATS score, keyword gaps & actionable tips.
                </motion.p>
              </div>
              <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.32, duration: 0.5 }}
                className="grid grid-cols-2 gap-2 flex-shrink-0">
                {[
                  { emoji: '📊', label: 'Score',       sub: '0–100' },
                  { emoji: '🤖', label: 'ATS Check',   sub: 'Bot-ready' },
                  { emoji: '🔑', label: 'Keywords',    sub: 'Gap analysis' },
                  { emoji: '💡', label: 'Action Tips', sub: 'Fix fast' },
                ].map(({ emoji, label, sub }, i) => (
                  <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.38 + i * 0.06, duration: 0.35 }}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <span className="text-xl">{emoji}</span>
                    <div>
                      <p className="text-white text-xs font-bold leading-tight">{label}</p>
                      <p className="text-indigo-300 text-[10px]">{sub}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-6 items-start">

          {/* INPUT PANEL */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.1, duration: 0.45, ease: 'easeOut' }}>
            <div className="ra-glass rounded-3xl shadow-xl overflow-hidden ra-card-hover">
              <div className="px-6 py-5 flex items-center gap-3 border-b border-white/50"
                style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(124,58,237,0.05))' }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                  <FiFileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-black text-gray-900 text-base">Your Resume</h2>
                  <p className="text-xs text-gray-400">Upload PDF or paste text below</p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* PDF dropzone */}
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">
                    Upload PDF <span className="font-normal normal-case text-gray-400">(text extracted automatically)</span>
                  </label>
                  <motion.div
                    onClick={() => !pdfParsing && fileInputRef.current?.click()}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handlePdfUpload(f); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    animate={{ scale: dragOver ? 1.02 : 1, borderColor: dragOver ? '#6366f1' : pdfFileName ? '#10b981' : '#c7d2fe' }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center justify-center gap-2 py-7 px-4 rounded-2xl border-2 border-dashed cursor-pointer select-none"
                    style={{ background: dragOver ? 'rgba(99,102,241,0.07)' : pdfFileName ? 'rgba(16,185,129,0.05)' : 'rgba(238,242,255,0.6)' }}
                  >
                    <AnimatePresence mode="wait">
                      {pdfParsing ? (
                        <motion.div key="parsing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="flex flex-col items-center gap-2">
                          <div className="relative w-10 h-10">
                            <div className="absolute inset-0 rounded-full border-2 border-indigo-100" />
                            <div className="absolute inset-0 rounded-full border-2 border-t-indigo-600"
                              style={{ animation: 'raSpin 0.8s linear infinite' }} />
                          </div>
                          <span className="text-sm font-bold text-indigo-600">Extracting text…</span>
                        </motion.div>
                      ) : pdfFileName ? (
                        <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                          className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-100">
                            <FiCheckCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                          <span className="text-sm font-bold text-emerald-700 truncate max-w-[220px]">{pdfFileName}</span>
                          <span className="text-xs text-gray-400">Click to replace</span>
                        </motion.div>
                      ) : (
                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="flex flex-col items-center gap-1.5">
                          <motion.div animate={{ y: dragOver ? -4 : 0 }} transition={{ duration: 0.2 }}
                            className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg,#eef2ff,#ede9fe)' }}>
                            <FiUpload className="w-6 h-6 text-indigo-500" />
                          </motion.div>
                          <span className="text-sm font-bold text-indigo-600">
                            {dragOver ? 'Drop it here!' : 'Click or drag & drop PDF'}
                          </span>
                          <span className="text-xs text-gray-400">Max 5 MB · PDF only</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); e.target.value = ''; }} />
                  </motion.div>

                  <div className="flex items-center gap-3 mt-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    <span className="text-xs text-gray-400 font-semibold">or type / paste below</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                  </div>
                </div>

                {/* Target role */}
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">
                    Target Role <span className="font-normal normal-case text-gray-400">(optional)</span>
                  </label>
                  <input type="text" value={targetRole} onChange={e => setTargetRole(e.target.value)}
                    placeholder="e.g. Software Engineer, Data Scientist, Product Manager"
                    className="w-full px-4 py-3.5 rounded-xl text-sm text-gray-800 outline-none transition-all"
                    style={{ background: 'rgba(248,250,252,0.9)', border: '1.5px solid #e2e8f0' }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                {/* Resume textarea */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Resume Text</label>
                    <button onClick={() => setResumeText(SAMPLE_RESUME)}
                      className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
                      <FiInfo className="w-3 h-3" /> Try sample
                    </button>
                  </div>
                  <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} rows={12}
                    placeholder={"Paste your full resume here…\n\nInclude:\n• Contact info\n• Education\n• Work experience\n• Skills\n• Projects\n• Achievements"}
                    className="w-full px-4 py-3.5 rounded-xl text-sm text-gray-800 outline-none resize-none font-mono leading-relaxed transition-all"
                    style={{ background: 'rgba(248,250,252,0.9)', border: '1.5px solid #e2e8f0' }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] text-gray-300">{resumeText.length > 0 ? `${resumeText.length} chars` : ''}</span>
                    {resumeText.length > 0 && (
                      <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                        <FiCheckCircle className="w-3 h-3" /> Ready to analyze
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Analyze button */}
                <motion.button onClick={handleAnalyze} disabled={loading || !resumeText.trim()}
                  whileHover={!loading && resumeText.trim() ? { scale: 1.02 } : {}}
                  whileTap={!loading && resumeText.trim() ? { scale: 0.98 } : {}}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-white text-base ra-btn-glow disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 24px rgba(99,102,241,0.38)' }}>
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        style={{ animation: 'raSpin 0.8s linear infinite' }} />
                      Analyzing with AI…
                    </>
                  ) : (
                    <><FiCpu className="w-5 h-5" /> Analyze Resume</>
                  )}
                </motion.button>

                <AnimatePresence>
                  {review && (
                    <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      onClick={() => { setReview(null); setResumeText(''); setTargetRole(''); setPdfFileName(''); }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-indigo-600 transition-colors"
                      style={{ background: 'rgba(99,102,241,0.07)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.12)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.07)')}>
                      <FiRefreshCw className="w-4 h-4" /> Analyze another resume
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* RESULTS PANEL */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.18, duration: 0.45, ease: 'easeOut' }}>
            <AnimatePresence mode="wait">

              {!review && !loading && (
                <motion.div key="empty" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.35 }}
                  className="ra-glass rounded-3xl shadow-xl flex flex-col items-center justify-center p-12 text-center ra-card-hover"
                  style={{ minHeight: '560px' }}>
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-xl"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                    <FiFileText className="w-11 h-11 text-white" />
                  </motion.div>
                  <h3 className="text-2xl font-black text-gray-800 mb-2">Ready to analyze</h3>
                  <p className="text-gray-400 text-sm max-w-xs leading-relaxed mb-8">
                    Upload your resume PDF or paste text on the left, then click Analyze.
                  </p>
                  <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                    {[
                      { emoji: '📊', label: 'AI Score',      color: '#6366f1' },
                      { emoji: '🤖', label: 'ATS Rating',    color: '#7c3aed' },
                      { emoji: '🔑', label: 'Keyword Gaps',  color: '#8b5cf6' },
                      { emoji: '💡', label: 'Fix-it Tips',   color: '#a855f7' },
                    ].map(({ emoji, label, color }, i) => (
                      <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.07, duration: 0.35 }}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                        style={{ background: `${color}0d`, border: `1px solid ${color}20` }}>
                        <span className="text-xl">{emoji}</span>
                        <span className="text-sm font-bold text-gray-700">{label}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-8 w-full max-w-sm space-y-2">
                    {[80, 60, 70].map((w, i) => (
                      <div key={i} className="ra-shimmer h-3" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                </motion.div>
              )}

              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="ra-glass rounded-3xl shadow-xl flex flex-col items-center justify-center p-12 text-center"
                  style={{ minHeight: '560px' }}>
                  <div className="relative w-28 h-28 mb-8">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-purple-500"
                      style={{ animation: 'raSpin 1s linear infinite' }} />
                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 flex items-center justify-center text-4xl">🤖</motion.div>
                  </div>
                  <h3 className="text-xl font-black text-gray-800 mb-2">AI is reading your resume…</h3>
                  <p className="text-gray-400 text-sm mb-6">Analyzing structure, keywords, impact & ATS score</p>
                  <div className="w-full max-w-xs space-y-3">
                    {['Checking keywords…', 'Scoring sections…', 'Finding gaps…'].map((t, i) => (
                      <motion.div key={t} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.4, duration: 0.4 }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl"
                        style={{ background: 'rgba(99,102,241,0.06)' }}>
                        <span className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full flex-shrink-0"
                          style={{ animation: 'raSpin 1s linear infinite', animationDelay: `${i * 0.2}s` }} />
                        <span className="text-sm text-indigo-600 font-semibold">{t}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {review && (
                <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.45 }}
                  className="ra-glass rounded-3xl shadow-xl overflow-hidden ra-card-hover">

                  {/* Score header */}
                  <div className="px-6 pt-6 pb-5 border-b border-white/60"
                    style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(168,85,247,0.05))' }}>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="font-black text-gray-900 text-xl">Analysis Results</h2>
                        <p className="text-xs text-gray-400 mt-0.5">For: <span className="font-semibold text-indigo-600">{targetRole || 'Software Engineer'}</span></p>
                      </div>
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.4 }}
                        className="px-4 py-1.5 rounded-full text-sm font-black"
                        style={{ background: `${scoreColor(review.overallScore)}18`, color: scoreColor(review.overallScore), border: `1.5px solid ${scoreColor(review.overallScore)}30` }}>
                        {scoreLabel(review.overallScore)}
                      </motion.span>
                    </div>

                    <div className="flex items-center justify-around gap-2">
                      <ScoreRing score={review.overallScore} label="Overall" color={scoreColor(review.overallScore)} delay={0.1} />
                      <ScoreRing score={review.atsScore} label="ATS Score" color={scoreColor(review.atsScore)} delay={0.25} />
                      <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                        className="flex flex-col items-center gap-2">
                        <div className="relative w-28 h-28 rounded-3xl flex flex-col items-center justify-center"
                          style={{ background: 'linear-gradient(135deg,#eef2ff,#ede9fe)', border: '2px solid rgba(99,102,241,0.15)' }}>
                          <span className="text-3xl font-black text-indigo-700"><AnimatedNumber value={review.actionItems.length} /></span>
                          <span className="text-[10px] text-indigo-400 font-black tracking-widest uppercase">Actions</span>
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">To-Do</span>
                      </motion.div>
                    </div>

                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                      className="mt-5 p-4 rounded-2xl text-sm text-gray-600 leading-relaxed"
                      style={{ background: 'rgba(99,102,241,0.06)', borderLeft: '3px solid #6366f1' }}>
                      <div className="flex items-start gap-2">
                        <FiStar className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <span>{review.summary}</span>
                      </div>
                    </motion.div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 p-3 border-b border-white/60 overflow-x-auto" style={{ background: 'rgba(248,250,252,0.5)' }}>
                    {tabs.map(({ key, label, icon: Icon }) => (
                      <motion.button key={key} onClick={() => setActiveTab(key)}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        className={`relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-colors ${
                          activeTab === key ? 'text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}>
                        {activeTab === key && (
                          <motion.div layoutId="activeTab" className="absolute inset-0 rounded-xl"
                            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }} />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5" /> {label}
                        </span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Tab body */}
                  <div className="p-5 overflow-y-auto" style={{ maxHeight: '380px' }}>
                    <AnimatePresence mode="wait">

                      {activeTab === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="space-y-5">
                          <div>
                            <h4 className="flex items-center gap-2 text-xs font-black text-emerald-700 uppercase tracking-widest mb-3">
                              <FiCheckCircle className="w-3.5 h-3.5" /> Strengths
                            </h4>
                            <div className="space-y-2">
                              {review.strengths.map((s, i) => <ListItem key={i} text={s} type="good" index={i} />)}
                            </div>
                          </div>
                          <div>
                            <h4 className="flex items-center gap-2 text-xs font-black text-red-600 uppercase tracking-widest mb-3">
                              <FiAlertCircle className="w-3.5 h-3.5" /> Weaknesses
                            </h4>
                            <div className="space-y-2">
                              {review.weaknesses.map((w, i) => <ListItem key={i} text={w} type="bad" index={i} />)}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'suggestions' && (
                        <motion.div key="suggestions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="space-y-3">
                          {review.suggestions.map((s, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.07, duration: 0.3 }}
                              className="rounded-2xl overflow-hidden border border-amber-100/60">
                              <div className="px-4 py-2.5" style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
                                <span className="text-xs font-black text-amber-800 uppercase tracking-wide">{s.section}</span>
                              </div>
                              <div className="p-4 space-y-2.5" style={{ background: 'rgba(255,251,235,0.6)' }}>
                                <div className="flex items-start gap-2 text-sm text-red-600">
                                  <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{s.issue}</span>
                                </div>
                                <div className="flex items-start gap-2 text-sm text-emerald-700">
                                  <FiArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <span><strong>Fix:</strong> {s.fix}</span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}

                      {activeTab === 'keywords' && (
                        <motion.div key="keywords" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="space-y-5">
                          <div>
                            <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-3">✓ Present Keywords</h4>
                            <div className="flex flex-wrap gap-2">
                              {review.keywords.present.map((k, i) => <Pill key={i} label={k} present delay={i * 0.04} />)}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-red-600 uppercase tracking-widest mb-3">✗ Missing Keywords</h4>
                            <div className="flex flex-wrap gap-2">
                              {review.keywords.missing.map((k, i) => <Pill key={i} label={k} present={false} delay={i * 0.04} />)}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'actions' && (
                        <motion.div key="actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="space-y-2.5">
                          {review.actionItems.map((a, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.07, duration: 0.32 }}
                              className="flex items-start gap-3 p-3.5 rounded-2xl border border-indigo-100/60 ra-card-hover"
                              style={{ background: 'rgba(238,242,255,0.5)' }}>
                              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black text-white"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
                                {i + 1}
                              </div>
                              <span className="text-sm text-gray-700 leading-relaxed">{a}</span>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}

                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalyzer;
