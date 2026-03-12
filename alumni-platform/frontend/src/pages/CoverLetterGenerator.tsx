import React, { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiEdit2, FiCopy, FiRefreshCw, FiCheck, FiUser, FiBriefcase,
  FiZap, FiDownload, FiAlignLeft, FiAlertCircle,
} from 'react-icons/fi';

interface CoverLetter {
  subject: string;
  body: string;
  wordCount: number;
  tone: string;
}

const TONES = [
  { key: 'professional', label: 'Professional', emoji: '🎩', desc: 'Formal & polished' },
  { key: 'enthusiastic', label: 'Enthusiastic', emoji: '🚀', desc: 'Energetic & warm' },
  { key: 'creative',     label: 'Creative',     emoji: '🎨', desc: 'Bold & unique' },
];

const LOADING_STEPS = [
  'Understanding job requirements',
  'Matching your profile',
  'Crafting the opening hook',
  'Polishing tone & structure',
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0 },
};

const CoverLetterGenerator: React.FC = () => {
  const { userProfile } = useAuth();

  const [name,       setName]       = useState(userProfile?.name || '');
  const [role,       setRole]       = useState('');
  const [company,    setCompany]    = useState('');
  const [jobDesc,    setJobDesc]    = useState('');
  const [background, setBackground] = useState((userProfile?.skills || []).join(', '));
  const [tone,       setTone]       = useState('professional');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState<CoverLetter | null>(null);
  const [copied,     setCopied]     = useState(false);

  const handleGenerate = async () => {
    if (!role.trim() || !company.trim()) {
      toast.error('Please fill in target role and company name');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await aiAPI.generateCoverLetter(name, role, company, jobDesc, background, tone);
      setResult(res.data.letter);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to generate cover letter');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const text = `Subject: ${result.subject}\n\n${result.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard! 📋');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!result) return;

    const toneColor: Record<string, string> = {
      professional: '#4f46e5',
      enthusiastic: '#f59e0b',
      creative:     '#ec4899',
    };
    const accent = toneColor[result.tone] ?? '#4f46e5';
    const today  = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const paragraphs = result.body
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => `<p>${l}</p>`)
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Cover Letter – ${company}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #f8f7ff;
      color: #1e1b4b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      padding: 0;
      box-shadow: 0 0 40px rgba(0,0,0,0.12);
    }
    /* Header strip */
    .header {
      background: linear-gradient(135deg, ${accent}ee 0%, ${accent}99 100%);
      padding: 36px 48px 28px;
      position: relative;
      overflow: hidden;
    }
    .header::after {
      content: '';
      position: absolute;
      right: -40px;
      top: -40px;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
    }
    .header::before {
      content: '';
      position: absolute;
      right: 60px;
      bottom: -60px;
      width: 160px;
      height: 160px;
      border-radius: 50%;
      background: rgba(255,255,255,0.05);
    }
    .author-name {
      font-size: 26px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.5px;
    }
    .author-role {
      font-size: 13px;
      color: rgba(255,255,255,0.75);
      margin-top: 4px;
      font-weight: 400;
    }
    /* Subject line */
    .subject-card {
      margin: 32px 48px 0;
      background: linear-gradient(135deg, ${accent}12, ${accent}06);
      border: 1.5px solid ${accent}30;
      border-radius: 12px;
      padding: 16px 20px;
    }
    .subject-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2px;
      color: ${accent};
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .subject-text {
      font-size: 15px;
      font-weight: 700;
      color: #1e1b4b;
    }
    /* Body */
    .body {
      padding: 28px 48px 48px;
    }
    .body p {
      font-size: 13.5px;
      line-height: 1.85;
      color: #374151;
      margin-bottom: 14px;
      font-weight: 400;
    }
    /* Print tweaks */
    @media print {
      body { background: #fff; }
      .page { box-shadow: none; margin: 0; width: 100%; min-height: 100%; }
      @page { margin: 0; size: A4; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="author-name">${name || 'Applicant'}</div>
      <div class="author-role">Applying for &nbsp;·&nbsp; ${role} at ${company}</div>
    </div>

    <div class="subject-card">
      <div class="subject-label">Subject Line</div>
      <div class="subject-text">${result.subject}</div>
    </div>

    <div class="body">${paragraphs}</div>
  </div>

  <script>
    window.onload = function () {
      window.print();
      window.onafterprint = function () { window.close(); };
    };
  </script>
</body>
</html>`;

    // Use a hidden iframe so it works on Android (no popup blocker issues)
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    iframe.onload = () => {
      try {
        iframe.contentWindow!.focus();
        iframe.contentWindow!.print();
      } catch {}
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 3000);
    };
    toast.success('Print dialog opened — choose "Save as PDF" 📄');
  };

  const inputCls =
    'w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white/80 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/20 to-violet-50/30 relative overflow-x-hidden">

      {/* Aurora blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="aurora-blob w-[550px] h-[550px] bg-pink-300/20 -top-40 -left-32"    style={{ animationDelay: '0s' }} />
        <div className="aurora-blob w-[420px] h-[420px] bg-violet-300/20 top-1/3 -right-24" style={{ animationDelay: '5s' }} />
        <div className="aurora-blob w-[340px] h-[340px] bg-rose-300/15 bottom-0 left-1/4"   style={{ animationDelay: '10s' }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Hero Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative rounded-3xl overflow-hidden mb-8"
        >
          <div className="bg-gradient-to-r from-pink-600 via-rose-500 to-violet-600 px-8 py-10">
            <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
              <div className="absolute top-2 right-8 text-9xl">✉️</div>
            </div>
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-3xl"
                  >✉️</motion.div>
                  <h1 className="text-3xl font-bold text-white">
                    Cover Letter <span className="text-yellow-300">Generator</span>
                  </h1>
                </div>
                <p className="text-pink-100 text-sm max-w-md">
                  AI writes a personalised, job-specific cover letter in seconds — just fill the details and choose your tone.
                </p>
                <div className="flex gap-2 mt-4 flex-wrap">
                  {TONES.map(t => (
                    <div
                      key={t.key}
                      className="flex items-center gap-1.5 bg-white/10 text-white text-xs px-3 py-1 rounded-full border border-white/20 font-medium"
                    >
                      <span>{t.emoji}</span> {t.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="bg-white/15 backdrop-blur-sm px-5 py-3 rounded-2xl border border-white/20 text-white text-center">
                  <div className="text-2xl font-black text-yellow-300 mb-0.5">✨ AI</div>
                  <div className="text-xs text-pink-100">Powered Writing</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── LEFT: Input form ── */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="show"
            transition={{ delay: 0.15, duration: 0.45, ease: 'easeOut' }}
            className="bg-white/85 backdrop-blur-md rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-md">
                <FiEdit2 className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-bold text-gray-900 text-base">Your Details</h2>
            </div>

            {/* Name + Role row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Your Name</label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className={inputCls + ' pl-9'}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  Target Role <span className="text-pink-500">*</span>
                </label>
                <div className="relative">
                  <FiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text" value={role} onChange={e => setRole(e.target.value)}
                    placeholder="Software Engineer"
                    className={inputCls + ' pl-9'}
                  />
                </div>
              </div>
            </div>

            {/* Company */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                Company Name <span className="text-pink-500">*</span>
              </label>
              <input
                type="text" value={company} onChange={e => setCompany(e.target.value)}
                placeholder="Google, Infosys, Flipkart…"
                className={inputCls}
              />
            </div>

            {/* Job description */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                Job Description{' '}
                <span className="text-gray-400 font-normal">(paste or summarise)</span>
              </label>
              <textarea
                value={jobDesc} onChange={e => setJobDesc(e.target.value)}
                rows={4}
                placeholder="Paste the job description here for a personalised letter…"
                className={inputCls + ' resize-none'}
              />
            </div>

            {/* Background */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                Your Background & Skills
              </label>
              <textarea
                value={background} onChange={e => setBackground(e.target.value)}
                rows={3}
                placeholder="React, Node.js, 2 years experience, built an e-commerce project…"
                className={inputCls + ' resize-none'}
              />
              {(userProfile?.skills?.length ?? 0) > 0 && (
                <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                  <FiUser className="w-3 h-3" /> Auto-filled from your profile · edit if needed
                </p>
              )}
            </div>

            {/* Tone selector */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map(t => (
                  <motion.button
                    key={t.key}
                    onClick={() => setTone(t.key)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="relative py-3 px-2 rounded-2xl text-center border-2 transition-colors duration-200 overflow-hidden cursor-pointer"
                    style={
                      tone === t.key
                        ? { borderColor: '#ec4899', background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', boxShadow: '0 4px 16px rgba(236,72,153,0.18)' }
                        : { borderColor: '#e5e7eb', background: 'white'  }
                    }
                  >
                    {tone === t.key && (
                      <motion.div
                        layoutId="tonePill"
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{ background: 'linear-gradient(135deg,rgba(236,72,153,0.07),rgba(167,139,250,0.07))' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <div className="relative text-xl mb-0.5">{t.emoji}</div>
                    <div className={`relative text-[11px] font-bold ${tone === t.key ? 'text-pink-700' : 'text-gray-600'}`}>
                      {t.label}
                    </div>
                    <div className={`relative text-[9px] ${tone === t.key ? 'text-pink-400' : 'text-gray-400'}`}>
                      {t.desc}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Validation hint */}
            {(!role.trim() || !company.trim()) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2"
              >
                <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Fill in Target Role and Company Name to generate
              </motion.div>
            )}

            {/* Generate button */}
            <motion.button
              onClick={handleGenerate}
              disabled={loading || !role.trim() || !company.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #ec4899, #be185d)',
                boxShadow: '0 6px 24px rgba(236,72,153,0.38)',
              }}
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Writing your letter…
                </>
              ) : (
                <><FiZap className="w-4 h-4" /> Generate Cover Letter</>
              )}
            </motion.button>
          </motion.div>

          {/* ── RIGHT: Output panel ── */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="show"
            transition={{ delay: 0.28, duration: 0.45, ease: 'easeOut' }}
            className="bg-white/85 backdrop-blur-md rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
            style={{ minHeight: '520px' }}
          >
            <AnimatePresence mode="wait">

              {/* Idle */}
              {!loading && !result && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center justify-center p-10 text-center gap-5"
                  style={{ minHeight: '520px' }}
                >
                  <motion.div
                    animate={{ y: [0, -9, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-100 to-violet-100 flex items-center justify-center text-4xl border border-pink-100 shadow-md"
                  >
                    ✉️
                  </motion.div>
                  <div>
                    <p className="font-bold text-gray-700 text-base mb-1">Your letter will appear here</p>
                    <p className="text-sm text-gray-400 max-w-xs">
                      Fill in the details and hit{' '}
                      <span className="font-semibold text-pink-500">Generate</span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    {['Personalised for each company', 'ATS-friendly structure', 'Three distinct tones', 'One-click copy & download'].map((f, i) => (
                      <motion.div
                        key={f}
                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                        className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100"
                      >
                        <FiCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> {f}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Loading */}
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.28 }}
                  className="flex flex-col items-center justify-center py-16 px-6 text-center"
                  style={{ minHeight: '520px' }}
                >
                  <div className="relative mb-6">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 rounded-full border-4 border-pink-100 border-t-pink-500"
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">✍️</div>
                  </div>
                  <p className="font-bold text-gray-800 text-base mb-1.5">Writing your letter…</p>
                  <p className="text-sm text-gray-400 mb-7">
                    AI is crafting a {tone} cover letter for {company || 'your company'}
                  </p>
                  <div className="space-y-2 w-full max-w-xs">
                    {LOADING_STEPS.map((step, si) => (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: si * 0.45 }}
                        className="flex items-center gap-2.5 text-xs text-pink-600 bg-pink-50 border border-pink-100 rounded-xl px-3.5 py-2.5"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.4, 1] }}
                          transition={{ delay: si * 0.45 + 0.2, duration: 0.4 }}
                          className="w-2 h-2 rounded-full bg-pink-400 flex-shrink-0"
                        />
                        {step}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Result */}
              {result && !loading && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.32 }}
                  className="flex flex-col"
                  style={{ minHeight: '520px' }}
                >
                  {/* Toolbar */}
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 flex-shrink-0 bg-gray-50/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                        <FiAlignLeft className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-800">Letter Ready ✨</div>
                        <div className="text-[10px] text-gray-400">
                          {result.wordCount} words ·{' '}
                          {TONES.find(t => t.key === result.tone)?.emoji}{' '}
                          {result.tone}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <motion.button
                        onClick={handleCopy}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                      >
                        {copied
                          ? <><FiCheck className="w-3.5 h-3.5 text-emerald-500" /> Copied!</>
                          : <><FiCopy className="w-3.5 h-3.5" /> Copy</>
                        }
                      </motion.button>
                      <motion.button
                        onClick={handleDownload}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg,#ec4899,#be185d)', boxShadow: '0 2px 10px rgba(236,72,153,0.3)' }}
                      >
                        <FiDownload className="w-3.5 h-3.5" /> Save
                      </motion.button>
                      <motion.button
                        onClick={() => setResult(null)}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <FiRefreshCw className="w-3.5 h-3.5" /> New
                      </motion.button>
                    </div>
                  </div>

                  {/* Letter content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {/* Subject line */}
                    <div className="mb-5 bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-3.5 border border-pink-100">
                      <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest block mb-1">
                        Subject Line
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{result.subject}</span>
                    </div>

                    {/* Body paragraphs */}
                    <div className="space-y-4">
                      {result.body.split('\n\n').filter(Boolean).map((para, pi) => (
                        <motion.p
                          key={pi}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: pi * 0.07, duration: 0.32 }}
                          className="text-sm text-gray-700 leading-relaxed"
                        >
                          {para.trim()}
                        </motion.p>
                      ))}
                    </div>
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

export default CoverLetterGenerator;
