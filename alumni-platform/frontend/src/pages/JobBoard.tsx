import React, { useEffect, useState } from 'react';
import { jobsAPI } from '../services/api';
import { Job } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiBriefcase, FiSearch, FiPlus, FiMapPin, FiExternalLink, FiX, FiDollarSign, FiClock, FiUser
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

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
                          <FiDollarSign className="w-2.5 h-2.5" />{job.salary}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobBoard;
