import React, { useEffect, useState } from 'react';
import { jobsAPI, aiAPI } from '../services/api';
import { Job } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiBriefcase, FiSearch, FiPlus, FiMapPin, FiExternalLink, FiX, FiClock, FiUser,
  FiZap, FiCheck, FiAlertTriangle, FiTarget,
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const JOB_TYPES = [
  { key: 'all', label: 'All', emoji: '✨' },
  { key: 'job', label: 'Job', emoji: '💼' },
  { key: 'internship', label: 'Internship', emoji: '🎓' },
  { key: 'referral', label: 'Referral', emoji: '🤝' },
];

const COMPANY_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-indigo-500 to-blue-700',
];

const TYPE_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  job: { color: 'text-emerald-700', bg: 'bg-emerald-50 border border-emerald-200', dot: 'bg-emerald-500' },
  internship: { color: 'text-blue-700', bg: 'bg-blue-50 border border-blue-200', dot: 'bg-blue-500' },
  referral: { color: 'text-amber-700', bg: 'bg-amber-50 border border-amber-200', dot: 'bg-amber-500' },
};

interface JobMatchResult {
  matchScore: number;
  matchLevel: 'Excellent' | 'Good' | 'Fair' | 'Low';
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: { title: string; detail: string }[];
  verdict: string;
}

const MATCH_COLORS: Record<string, string> = {
  Excellent: '#10b981',
  Good:      '#6366f1',
  Fair:      '#f59e0b',
  Low:       '#ef4444',
};

const MATCH_LEVEL_CONF: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
  Excellent: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', emoji: '🚀' },
  Good:      { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  emoji: '✅' },
  Fair:      { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   emoji: '⚡' },
  Low:       { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     emoji: '📚' },
};

const SkeletonCard = () => (
  <div className="bg-white/80 rounded-2xl p-5 border border-gray-100 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-11 h-11 rounded-xl skeleton" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded skeleton" />
        <div className="h-3 w-1/2 rounded skeleton" />
      </div>
    </div>
    <div className="flex gap-2 mb-3">
      <div className="h-5 w-16 rounded-full skeleton" />
      <div className="h-5 w-20 rounded-full skeleton" />
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-3 w-full rounded skeleton" />
      <div className="h-3 w-5/6 rounded skeleton" />
    </div>
    <div className="h-8 w-24 rounded-xl skeleton ml-auto" />
  </div>
);

const ScoreArc: React.FC<{ score: number; color: string }> = ({ score, color }) => {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDisplayed(score), 80);
    return () => clearTimeout(t);
  }, [score]);
  const r = 48;
  const circ = 2 * Math.PI * r;
  const dash = (displayed / 100) * circ;
  return (
    <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
      <div className="absolute inset-0 rounded-full blur-xl opacity-20" style={{ background: color }} />
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#e5e7eb" strokeWidth="9" />
        <circle
          cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1.3s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="text-center relative z-10">
        <div className="text-2xl font-black leading-none" style={{ color }}>{displayed}</div>
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">match</div>
      </div>
    </div>
  );
};

const JobBoard: React.FC = () => {
  const { userProfile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [posting, setPosting] = useState(false);

  const [form, setForm] = useState({
    title: '', company: '', description: '', type: 'job', location: '',
    salary: '', requirements: '', applyLink: '', referral: '',
  });

  const [matchJob, setMatchJob]         = useState<Job | null>(null);
  const [matchSkills, setMatchSkills]   = useState('');
  const [matchResult, setMatchResult]   = useState<JobMatchResult | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);

  const openMatch = (job: Job) => {
    setMatchJob(job);
    setMatchResult(null);
    setMatchLoading(false);
    setMatchSkills((userProfile?.skills || []).join(', '));
  };

  const closeMatch = () => { setMatchJob(null); setMatchResult(null); setMatchLoading(false); };

  const handleMatchScore = async () => {
    if (!matchJob || !matchSkills.trim()) {
      toast.error('Please enter your skills first');
      return;
    }
    setMatchLoading(true);
    try {
      const res = await aiAPI.matchJob(
        matchJob.title,
        matchJob.description,
        matchJob.requirements || [],
        matchSkills,
        userProfile?.bio || '',
        userProfile?.goals || '',
      );
      setMatchResult(res.data.result);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to analyze match');
    } finally {
      setMatchLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, [search, typeFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await jobsAPI.getAll({ type: typeFilter !== 'all' ? typeFilter : undefined, search: search || undefined });
      setJobs(res.data.jobs as Job[]);
    } catch { } finally { setLoading(false); }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.company || !form.description) {
      toast.error('Please fill title, company, and description');
      return;
    }
    setPosting(true);
    try {
      await jobsAPI.create({
        ...form,
        requirements: form.requirements.split('\n').map(s => s.trim()).filter(Boolean),
      });
      toast.success('Job posted successfully! 🎉');
      setShowForm(false);
      setForm({ title: '', company: '', description: '', type: 'job', location: '', salary: '', requirements: '', applyLink: '', referral: '' });
      await fetchJobs();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to post job');
    } finally { setPosting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this job posting?')) return;
    try {
      await jobsAPI.delete(id);
      setJobs(prev => prev.filter(j => j.id !== id));
      toast.success('Deleted');
    } catch (err) { toast.error((err as Error).message || 'Failed to delete'); }
  };

  const jobCount = jobs.length;
  const internCount = jobs.filter(j => j.type === 'internship').length;
  const referralCount = jobs.filter(j => j.type === 'referral').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/40 relative overflow-x-hidden">
      {/* Aurora blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="aurora-blob w-[500px] h-[500px] bg-purple-300/20 -top-32 -left-32" style={{ animationDelay: '0s' }} />
        <div className="aurora-blob w-[400px] h-[400px] bg-indigo-300/20 top-1/3 -right-24" style={{ animationDelay: '4s' }} />
        <div className="aurora-blob w-[350px] h-[350px] bg-violet-300/15 bottom-0 left-1/3" style={{ animationDelay: '8s' }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden mb-8" style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-8 py-10">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 right-8 text-9xl select-none">💼</div>
            </div>
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">💼</span>
                  <h1 className="text-3xl font-bold text-white">Job <span className="text-yellow-300">Board</span></h1>
                </div>
                <p className="text-purple-100 text-sm">Discover jobs, internships and referrals posted by alumni</p>
                <div className="flex gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{jobCount}</div>
                    <div className="text-xs text-purple-200">Total</div>
                  </div>
                  <div className="w-px bg-white/20" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-300">{internCount}</div>
                    <div className="text-xs text-purple-200">Internships</div>
                  </div>
                  <div className="w-px bg-white/20" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-300">{referralCount}</div>
                    <div className="text-xs text-purple-200">Referrals</div>
                  </div>
                </div>
              </div>
              {userProfile?.role === 'alumni' && (
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300"
                  style={{
                    background: showForm ? 'rgba(255,255,255,0.15)' : 'white',
                    color: showForm ? 'white' : '#7c3aed',
                    backdropFilter: 'blur(8px)',
                    boxShadow: showForm ? 'none' : '0 4px 24px rgba(0,0,0,0.15)',
                    transform: 'scale(1)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {showForm ? <><FiX className="w-4 h-4" /> Cancel</> : <><FiPlus className="w-4 h-4" /> Post Opportunity</>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Post Job Form */}
        {showForm && userProfile?.role === 'alumni' && (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-purple-100 shadow-xl p-6 mb-6" style={{ animation: 'fadeInUp 0.4s ease-out both' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <FiPlus className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Post New Opportunity</h3>
            </div>
            <form onSubmit={handlePost} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Job Title *', key: 'title', placeholder: 'Software Engineer Intern', type: 'text' },
                  { label: 'Company *', key: 'company', placeholder: 'Company name', type: 'text' },
                  { label: 'Location', key: 'location', placeholder: 'Remote / City, Country', type: 'text' },
                  { label: 'Salary / Stipend', key: 'salary', placeholder: '₹10,000/month or 15 LPA', type: 'text' },
                  { label: 'Apply Link', key: 'applyLink', placeholder: 'https://...', type: 'url' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}</label>
                    <input
                      type={f.type}
                      value={(form as any)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all"
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all"
                  >
                    <option value="job">💼 Full-time Job</option>
                    <option value="internship">🎓 Internship</option>
                    <option value="referral">🤝 Referral</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all resize-none"
                  rows={3} required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Requirements <span className="text-gray-400 font-normal">(one per line)</span></label>
                <textarea
                  value={form.requirements}
                  onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all resize-none"
                  rows={3} placeholder={"React.js\n2+ years experience\nStrong problem-solving"}
                />
              </div>
              {form.type === 'referral' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Referral Details / Contact</label>
                  <input
                    type="text"
                    value={form.referral}
                    onChange={e => setForm(f => ({ ...f, referral: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all"
                    placeholder="DM me on LinkedIn or email ref@company.com"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={posting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  boxShadow: posting ? 'none' : '0 4px 16px rgba(124,58,237,0.4)',
                }}
              >
                {posting ? (
                  <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"/></svg> Posting...</>
                ) : (
                  <><FiPlus className="w-4 h-4" /> Post Opportunity</>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6" style={{ animation: 'fadeInUp 0.5s ease-out 0.1s both' }}>
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs, companies..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-white/85 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent shadow-sm transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {JOB_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setTypeFilter(t.key)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200"
                style={typeFilter === t.key ? {
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
                  transform: 'scale(1.05)',
                } : {
                  background: 'white',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                }}
              >
                <span>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Jobs Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20" style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
              <FiBriefcase className="w-8 h-8 text-violet-400" />
            </div>
            <p className="text-gray-600 font-semibold text-lg">No opportunities found</p>
            <p className="text-gray-400 text-sm mt-1">
              {userProfile?.role === 'alumni' ? 'Be the first to post an opportunity!' : 'Check back later for new postings.'}
            </p>
            {userProfile?.role === 'alumni' && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}
              >
                <FiPlus className="w-4 h-4" /> Post First Opportunity
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((job, i) => {
              const gradient = COMPANY_GRADIENTS[job.company.charCodeAt(0) % COMPANY_GRADIENTS.length];
              const typeConf = TYPE_CONFIG[job.type] || TYPE_CONFIG.job;
              return (
                <div
                  key={job.id}
                  className="group bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl overflow-hidden transition-all duration-300"
                  style={{
                    animation: `fadeInUp 0.45s ease-out ${Math.min(i, 7) * 70}ms both`,
                    transform: 'translateY(0)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
                >
                  {/* Top gradient accent bar */}
                  <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                          {job.company[0]?.toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 leading-tight text-sm">{job.title}</h3>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">{job.company}</p>
                        </div>
                      </div>
                      {job.postedBy === userProfile?.uid && (
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-all duration-200"
                        >
                          <FiX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Type + Meta badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${typeConf.bg} ${typeConf.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${typeConf.dot}`} />
                        {job.type}
                      </span>
                      {job.location && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                          <FiMapPin className="w-2.5 h-2.5" />{job.location}
                        </span>
                      )}
                      {job.salary && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                          <span className="text-xs font-semibold">₹</span>{job.salary}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-3">{job.description}</p>

                    {/* Requirements */}
                    {job.requirements?.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {job.requirements.slice(0, 3).map((r, ri) => (
                          <div key={ri} className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                            {r}
                          </div>
                        ))}
                        {job.requirements.length > 3 && (
                          <div className="text-xs text-gray-400 pl-3.5">+{job.requirements.length - 3} more</div>
                        )}
                      </div>
                    )}

                    {/* Referral note */}
                    {job.type === 'referral' && job.referral && (
                      <div className="mb-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700 flex items-start gap-1.5">
                        <span className="shrink-0">🤝</span>
                        <span>{job.referral}</span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><FiUser className="w-3 h-3" />{job.postedByName}</span>
                        <span className="flex items-center gap-1"><FiClock className="w-3 h-3" />{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {userProfile?.role === 'student' && (
                          <button
                            onClick={() => openMatch(job)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
                            style={{ background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)', color: '#6d28d9', border: '1px solid #ddd6fe' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'linear-gradient(135deg, #c7d2fe, #ddd6fe)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'linear-gradient(135deg, #e0e7ff, #ede9fe)'; }}
                          >
                            <FiZap className="w-3 h-3" /> AI Match
                          </button>
                        )}
                        {job.applyLink && (
                          <a
                            href={job.applyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white transition-all duration-200"
                            style={{
                              background: `linear-gradient(135deg, #7c3aed, #6d28d9)`,
                              boxShadow: '0 2px 10px rgba(124,58,237,0.3)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(124,58,237,0.5)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(124,58,237,0.3)'; e.currentTarget.style.transform = 'scale(1)'; }}
                          >
                            Apply <FiExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== AI Job Match Score Modal ===== */}
      <AnimatePresence>
        {matchJob && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={closeMatch}
            />

            {/* Modal panel */}
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="fixed inset-x-4 top-[4%] bottom-[4%] max-w-xl mx-auto z-50 flex flex-col rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.6)' }}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-5 flex-shrink-0">
                <div className="absolute inset-0 flex items-center justify-end pr-6 opacity-10 pointer-events-none select-none" style={{ fontSize: '7rem' }}>⚡</div>
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                        <FiZap className="w-4 h-4 text-yellow-300" />
                      </div>
                      <span className="text-white font-bold text-base">AI Job Match Score</span>
                    </div>
                    <p className="text-purple-100 text-xs font-medium">{matchJob.title} · {matchJob.company}</p>
                  </div>
                  <button
                    onClick={closeMatch}
                    className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">

                  {/* — Input phase — */}
                  {!matchResult && !matchLoading && (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.28 }}
                      className="p-6 space-y-5"
                    >
                      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-4 border border-violet-100">
                        <p className="text-xs font-bold text-violet-700 mb-1">⚡ How it works</p>
                        <p className="text-xs text-violet-600 leading-relaxed">
                          AI compares your skills with this job's requirements and gives a personalized match score, highlights skill gaps, and suggests what to learn next.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          Your Skills <span className="font-normal text-gray-400">(comma-separated)</span>
                        </label>
                        <textarea
                          value={matchSkills}
                          onChange={e => setMatchSkills(e.target.value)}
                          rows={4}
                          placeholder="React, Node.js, Python, SQL, teamwork, communication..."
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all resize-none"
                        />
                        {(userProfile?.skills?.length ?? 0) > 0 && (
                          <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                            <FiUser className="w-3 h-3" /> Auto-filled from your profile · edit if needed
                          </p>
                        )}
                      </div>

                      {matchJob.requirements?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-600 mb-2">Job Requirements</p>
                          <div className="flex flex-wrap gap-1.5">
                            {matchJob.requirements.map((r, ri) => (
                              <span key={ri} className="text-[11px] bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full border border-gray-200">{r}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <motion.button
                        onClick={handleMatchScore}
                        disabled={!matchSkills.trim()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 6px 24px rgba(124,58,237,0.4)' }}
                      >
                        <FiZap className="w-4 h-4" /> Analyze My Match
                      </motion.button>
                    </motion.div>
                  )}

                  {/* — Loading phase — */}
                  {matchLoading && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.28 }}
                      className="flex flex-col items-center justify-center py-20 px-6"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        className="w-14 h-14 rounded-full border-4 border-violet-100 border-t-violet-500 mb-6"
                      />
                      <p className="text-base font-bold text-gray-800 mb-2">Analyzing your match…</p>
                      <p className="text-sm text-gray-400 text-center max-w-xs">AI is scanning your skills against job requirements</p>
                      <div className="flex gap-2 mt-6 flex-wrap justify-center">
                        {['Scanning skills', 'Matching role', 'Generating insights'].map((step, si) => (
                          <motion.div
                            key={step}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            transition={{ delay: si * 0.5 }}
                            className="text-[10px] bg-violet-50 text-violet-600 border border-violet-100 px-2.5 py-1 rounded-full font-medium"
                          >{step}</motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* — Result phase — */}
                  {matchResult && !matchLoading && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.28 }}
                      className="p-6 space-y-5"
                    >
                      {/* Score hero */}
                      <div className="flex items-center gap-5 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-5 border border-gray-100">
                        <ScoreArc score={matchResult.matchScore} color={MATCH_COLORS[matchResult.matchLevel] || '#7c3aed'} />
                        <div className="flex-1 min-w-0">
                          <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border mb-2 ${MATCH_LEVEL_CONF[matchResult.matchLevel]?.bg} ${MATCH_LEVEL_CONF[matchResult.matchLevel]?.text} ${MATCH_LEVEL_CONF[matchResult.matchLevel]?.border}`}>
                            <span>{MATCH_LEVEL_CONF[matchResult.matchLevel]?.emoji}</span> {matchResult.matchLevel} Match
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{matchResult.summary}</p>
                        </div>
                      </div>

                      {/* Matched & Missing skills */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-100">
                          <div className="flex items-center gap-1.5 mb-3">
                            <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700">Matched</span>
                            <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">{matchResult.matchedSkills.length}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {matchResult.matchedSkills.length === 0
                              ? <span className="text-[11px] text-gray-400 italic">None yet</span>
                              : matchResult.matchedSkills.map((s, si) => (
                                  <motion.span key={s}
                                    initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: si * 0.04, type: 'spring', stiffness: 400 }}
                                    className="text-[11px] bg-white text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium"
                                  >{s}</motion.span>
                                ))
                            }
                          </div>
                        </div>
                        <div className="bg-red-50/80 rounded-2xl p-4 border border-red-100">
                          <div className="flex items-center gap-1.5 mb-3">
                            <FiAlertTriangle className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs font-bold text-red-600">Missing</span>
                            <span className="ml-auto text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">{matchResult.missingSkills.length}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {matchResult.missingSkills.length === 0
                              ? <span className="text-[11px] text-emerald-600 font-semibold">All covered! 🎉</span>
                              : matchResult.missingSkills.map((s, si) => (
                                  <motion.span key={s}
                                    initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: si * 0.04, type: 'spring', stiffness: 400 }}
                                    className="text-[11px] bg-white text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-medium"
                                  >{s}</motion.span>
                                ))
                            }
                          </div>
                        </div>
                      </div>

                      {/* Suggestions */}
                      {matchResult.suggestions?.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-3">
                            <FiTarget className="w-3.5 h-3.5 text-violet-600" />
                            <span className="text-xs font-bold text-gray-700">AI Suggestions</span>
                          </div>
                          <div className="space-y-2">
                            {matchResult.suggestions.map((sug, si) => (
                              <motion.div key={si}
                                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: si * 0.08, duration: 0.3 }}
                                className="flex gap-3 bg-violet-50/80 rounded-2xl p-3.5 border border-violet-100"
                              >
                                <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-[10px] font-black text-violet-600">{si + 1}</span>
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-violet-800 mb-0.5">{sug.title}</div>
                                  <div className="text-[11px] text-violet-600 leading-relaxed">{sug.detail}</div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Verdict */}
                      {matchResult.verdict && (
                        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 text-xs text-white leading-relaxed">
                          <span className="font-bold text-yellow-200 block mb-1">🤖 AI Verdict</span>
                          {matchResult.verdict}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 pb-2">
                        <button
                          onClick={() => { setMatchResult(null); setMatchLoading(false); }}
                          className="flex-1 py-2.5 rounded-2xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >Re-analyze</button>
                        {matchJob.applyLink && (
                          <a
                            href={matchJob.applyLink} target="_blank" rel="noopener noreferrer"
                            className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white text-center transition-all"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}
                          >Apply Now →</a>
                        )}
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobBoard;
