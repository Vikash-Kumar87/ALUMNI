import React, { useState, useRef } from 'react';
import { aiAPI } from '../services/api';
import {
  FiUpload, FiFileText, FiCheckCircle, FiAlertCircle, FiZap,
  FiTarget, FiTrendingUp, FiList, FiArrowRight, FiRefreshCw, FiInfo,
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

/* ── Score ring ── */
const ScoreRing: React.FC<{ score: number; label: string; color: string }> = ({ score, label, color }) => {
  const r = 36, c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.2s ease-out' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-2xl font-extrabold text-gray-900">{score}</span>
          <span className="text-[10px] text-gray-400 font-semibold">/100</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-gray-500">{label}</span>
    </div>
  );
};

/* ── Keyword pill ── */
const Pill: React.FC<{ label: string; present: boolean }> = ({ label, present }) => (
  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
    present ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
  }`}>
    {present ? '✓' : '✗'} {label}
  </span>
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

const ResumeAnalyzer: React.FC = () => {
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ResumeReview | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'suggestions' | 'keywords' | 'actions'>('overview');
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfParsing, setPdfParsing] = useState(false);
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
        const pageText = content.items
          .map((item: unknown) => ((item as { str?: string }).str ?? ''))
          .join(' ');
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
  const scoreLabel = (s: number) => s >= 75 ? 'Good' : s >= 50 ? 'Average' : 'Needs Work';

  const tabs = [
    { key: 'overview', label: 'Overview', icon: FiTrendingUp },
    { key: 'suggestions', label: 'Suggestions', icon: FiAlertCircle },
    { key: 'keywords', label: 'Keywords', icon: FiTarget },
    { key: 'actions', label: 'Action Items', icon: FiList },
  ] as const;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <style>{`
        @keyframes raFadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes raBlob { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,-16px) scale(1.06)} }
        .ra-fade { animation: raFadeUp 0.5s ease-out both; }
        .ra-blob { animation: raBlob 14s ease-in-out infinite; }
      `}</style>

      {/* Aurora background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,#eef2ff 0%,#f5f3ff 30%,#ecfdf5 65%,#eff6ff 100%)' }} />
        <div className="ra-blob absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)' }} />
        <div className="ra-blob absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle,#10b981,transparent 70%)', animationDelay: '4s' }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Hero header ── */}
        <div className="ra-fade mb-8 rounded-3xl overflow-hidden shadow-xl" style={{ animationDelay: '0ms' }}>
          <div className="relative px-8 py-10" style={{ background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#6d28d9 100%)' }}>
            <div className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}>
                  <FiZap className="w-3 h-3" /> AI-Powered
                </div>
                <h1 className="text-3xl font-extrabold text-white mb-2">Resume Analyzer</h1>
                <p className="text-indigo-200 text-base">Paste your resume → get instant AI feedback, ATS score & actionable improvements</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {['Score', 'ATS Check', 'Keywords', 'Tips'].map((t, i) => (
                  <div key={t} className="text-center px-3 py-2 rounded-2xl border border-white/10"
                    style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', animation: `raFadeUp 0.4s ease-out ${150 + i * 70}ms both` }}>
                    <p className="text-white text-xs font-semibold">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Input panel ── */}
          <div className="ra-fade" style={{ animationDelay: '100ms' }}>
            <div className="rounded-3xl border border-white/60 shadow-lg overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)' }}>
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                    <FiFileText className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="font-bold text-gray-900">Your Resume</h2>
                </div>
                <p className="text-xs text-gray-400 ml-10">Upload a PDF or paste resume text below</p>
              </div>

              <div className="p-6 space-y-4">
                {/* PDF Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Upload PDF <span className="text-gray-400 font-normal">(auto-extracts text)</span>
                  </label>
                  <div
                    onClick={() => !pdfParsing && fileInputRef.current?.click()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handlePdfUpload(f); }}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex flex-col items-center justify-center gap-1.5 py-5 px-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all select-none"
                    style={{ borderColor: pdfFileName ? '#10b981' : '#c7d2fe', background: pdfFileName ? 'rgba(16,185,129,0.05)' : 'rgba(238,242,255,0.5)' }}
                  >
                    {pdfParsing ? (
                      <>
                        <span className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                        <span className="text-sm text-indigo-600 font-semibold">Extracting text…</span>
                      </>
                    ) : pdfFileName ? (
                      <>
                        <FiCheckCircle className="w-5 h-5 text-emerald-500" />
                        <span className="text-sm text-emerald-700 font-semibold truncate max-w-[220px]">{pdfFileName}</span>
                        <span className="text-xs text-gray-400">Click to replace</span>
                      </>
                    ) : (
                      <>
                        <FiUpload className="w-6 h-6 text-indigo-400" />
                        <span className="text-sm text-indigo-600 font-semibold">Click or drag &amp; drop PDF</span>
                        <span className="text-xs text-gray-400">Max 5 MB · PDF only</span>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); e.target.value = ''; }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium">or paste / type below</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                </div>

                {/* Target role */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Target Role <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={e => setTargetRole(e.target.value)}
                    placeholder="e.g. Software Engineer, Data Scientist, Product Manager"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    style={{ background: 'rgba(248,250,252,0.9)' }}
                  />
                </div>

                {/* Resume textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Resume Text</label>
                    <button onClick={() => setResumeText(SAMPLE_RESUME)}
                      className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                      <FiInfo className="w-3 h-3" /> Try sample
                    </button>
                  </div>
                  <textarea
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    rows={14}
                    placeholder={`Paste your full resume here...\n\nInclude:\n• Contact information\n• Education\n• Work experience\n• Skills\n• Projects\n• Achievements`}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none resize-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 font-mono leading-relaxed"
                    style={{ background: 'rgba(248,250,252,0.9)' }}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{resumeText.length} characters</p>
                </div>

                <button onClick={handleAnalyze} disabled={loading || !resumeText.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: loading ? 'linear-gradient(135deg,#818cf8,#a78bfa)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing your resume…
                    </>
                  ) : (
                    <>
                      <FiUpload className="w-5 h-5" /> Analyze Resume
                    </>
                  )}
                </button>

                {review && (
                  <button onClick={() => { setReview(null); setResumeText(''); setTargetRole(''); setPdfFileName(''); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                    <FiRefreshCw className="w-4 h-4" /> Analyze another resume
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Results panel ── */}
          <div className="ra-fade" style={{ animationDelay: '160ms' }}>
            {!review && !loading && (
              <div className="h-full rounded-3xl border border-white/60 shadow-lg flex flex-col items-center justify-center p-10 text-center"
                style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)', minHeight: '500px' }}>
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#eef2ff,#ede9fe)' }}>
                  <FiFileText className="w-9 h-9 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Ready to analyze</h3>
                <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
                  Paste your resume on the left, set your target role, and get instant AI-powered feedback with an ATS score.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-xs">
                  {[
                    { emoji: '📊', label: 'Overall Score' },
                    { emoji: '🤖', label: 'ATS Score' },
                    { emoji: '🔑', label: 'Keywords' },
                    { emoji: '💡', label: 'Action Items' },
                  ].map(({ emoji, label }) => (
                    <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 text-sm text-indigo-700 font-semibold">
                      <span>{emoji}</span> {label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="h-full rounded-3xl border border-white/60 shadow-lg flex flex-col items-center justify-center p-10 text-center"
                style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', minHeight: '500px' }}>
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">🤖</div>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">AI is reading your resume…</h3>
                <p className="text-gray-400 text-sm">Analyzing structure, keywords, impact & ATS compatibility</p>
                <div className="flex gap-1.5 mt-4">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {review && (
              <div className="rounded-3xl border border-white/60 shadow-lg overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)' }}>

                {/* Score header */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">Analysis Results</h2>
                      <p className="text-xs text-gray-400">for {targetRole || 'Software Engineer'}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: `${scoreColor(review.overallScore)}20`, color: scoreColor(review.overallScore) }}>
                      {scoreLabel(review.overallScore)}
                    </span>
                  </div>
                  <div className="flex items-center justify-around gap-4">
                    <ScoreRing score={review.overallScore} label="Overall" color={scoreColor(review.overallScore)} />
                    <ScoreRing score={review.atsScore} label="ATS Score" color={scoreColor(review.atsScore)} />
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#eef2ff,#ede9fe)' }}>
                        <span className="text-2xl font-extrabold text-indigo-700">{review.strengths.length}</span>
                        <span className="text-[10px] text-indigo-400 font-semibold">Strengths</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500">Found</span>
                    </div>
                  </div>
                  {/* Summary */}
                  <div className="mt-4 p-3 rounded-xl text-sm text-gray-600 leading-relaxed"
                    style={{ background: 'rgba(99,102,241,0.06)', borderLeft: '3px solid #6366f1' }}>
                    {review.summary}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-3 border-b border-gray-100 overflow-x-auto">
                  {tabs.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setActiveTab(key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        activeTab === key ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                      }`}
                      style={activeTab === key ? { background: 'linear-gradient(135deg,#6366f1,#7c3aed)' } : {}}>
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-5 max-h-80 overflow-y-auto">

                  {/* Overview tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <FiCheckCircle className="w-3.5 h-3.5" /> Strengths
                        </h4>
                        <div className="space-y-1.5">
                          {review.strengths.map((s, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">✓</span>
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <FiAlertCircle className="w-3.5 h-3.5" /> Weaknesses
                        </h4>
                        <div className="space-y-1.5">
                          {review.weaknesses.map((w, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">!</span>
                              {w}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Suggestions tab */}
                  {activeTab === 'suggestions' && (
                    <div className="space-y-3">
                      {review.suggestions.map((s, i) => (
                        <div key={i} className="rounded-2xl border border-amber-100 overflow-hidden">
                          <div className="px-4 py-2 flex items-center gap-2"
                            style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
                            <span className="text-xs font-bold text-amber-800">{s.section}</span>
                          </div>
                          <div className="p-4 space-y-2" style={{ background: 'rgba(255,251,235,0.5)' }}>
                            <div className="flex items-start gap-2 text-sm text-red-600">
                              <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>{s.issue}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-emerald-700">
                              <FiArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span><strong>Fix:</strong> {s.fix}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Keywords tab */}
                  {activeTab === 'keywords' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">✓ Present Keywords</h4>
                        <div className="flex flex-wrap gap-2">
                          {review.keywords.present.map((k, i) => <Pill key={i} label={k} present />)}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2">✗ Missing Keywords</h4>
                        <div className="flex flex-wrap gap-2">
                          {review.keywords.missing.map((k, i) => <Pill key={i} label={k} present={false} />)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action items tab */}
                  {activeTab === 'actions' && (
                    <div className="space-y-2">
                      {review.actionItems.map((a, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-indigo-100"
                          style={{ background: 'rgba(238,242,255,0.5)' }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                            style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                            {i + 1}
                          </div>
                          <span className="text-sm text-gray-700 leading-relaxed">{a}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalyzer;
