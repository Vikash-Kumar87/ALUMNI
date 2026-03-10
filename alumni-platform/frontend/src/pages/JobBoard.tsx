import React, { useEffect, useRef, useState } from 'react';
import { jobsAPI } from '../services/api';
import { Job } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  FiBriefcase, FiSearch, FiPlus, FiMapPin, FiExternalLink, FiX, FiFilter, FiDollarSign
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

const JOB_TYPES = ['all', 'job', 'internship', 'referral'];

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

  useEffect(() => {
    fetchJobs();
  }, [search, typeFilter]);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05 },
      );
      document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));
      return () => observer.disconnect();
    }, 50);
    return () => clearTimeout(timer);
  }, [loading, jobs]);

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
      toast.success('Job posted!');
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

  const typeColor: Record<string, string> = {
    job: 'badge-green',
    internship: 'badge-blue',
    referral: 'badge-yellow',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <div className="page-hero flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="section-title">Job <span className="text-gradient">Board</span></h1>
          <p className="section-subtitle">Discover jobs, internships and referrals posted by alumni</p>
        </div>
        {userProfile?.role === 'alumni' && (
          <button onClick={() => setShowForm(!showForm)} className="btn-gradient flex items-center gap-2 shrink-0">
            {showForm ? <><FiX className="w-4 h-4" /> Cancel</> : <><FiPlus className="w-4 h-4" /> Post Opportunity</>}
          </button>
        )}
      </div>

      {/* Post Job Form */}
      {showForm && userProfile?.role === 'alumni' && (
        <div className="card card-accent mb-6 animate-slide-up">
          <h3 className="font-semibold mb-4">Post New Opportunity</h3>
          <form onSubmit={handlePost} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Job Title *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="Software Engineer Intern" required />
              </div>
              <div>
                <label className="label">Company *</label>
                <input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="input" placeholder="Company name" required />
              </div>
              <div>
                <label className="label">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input">
                  <option value="job">Full-time Job</option>
                  <option value="internship">Internship</option>
                  <option value="referral">Referral</option>
                </select>
              </div>
              <div>
                <label className="label">Location</label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="input" placeholder="Remote / City, Country" />
              </div>
              <div>
                <label className="label">Salary / Stipend</label>
                <input type="text" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} className="input" placeholder="e.g. ₹10,000/month or 15 LPA" />
              </div>
              <div>
                <label className="label">Apply Link</label>
                <input type="url" value={form.applyLink} onChange={e => setForm(f => ({ ...f, applyLink: e.target.value }))} className="input" placeholder="https://..." />
              </div>
            </div>
            <div>
              <label className="label">Description *</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" rows={3} required />
            </div>
            <div>
              <label className="label">Requirements <span className="text-gray-400">(one per line)</span></label>
              <textarea value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} className="input" rows={3} placeholder="React.js&#10;2+ years experience&#10;Strong problem-solving" />
            </div>
            {form.type === 'referral' && (
              <div>
                <label className="label">Referral Details / Contact</label>
                <input type="text" value={form.referral} onChange={e => setForm(f => ({ ...f, referral: e.target.value }))} className="input" placeholder="DM me on LinkedIn or email ref@company.com" />
              </div>
            )}
            <button type="submit" disabled={posting} className="btn-primary px-6">
              {posting ? 'Posting...' : 'Post Opportunity'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs, companies..." className="input input-glow pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <FiFilter className="w-4 h-4 text-gray-400" />
          <div className="flex gap-2">
            {JOB_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={typeFilter === t ? 'chip chip-active' : 'chip chip-gray'}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiBriefcase className="w-14 h-14 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No opportunities found</p>
          {userProfile?.role === 'alumni' && <p className="text-sm mt-1">Post the first opportunity!</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job, i) => (
            <div key={job.id} className="card card-hover-glow card-spotlight group animate-on-scroll hover:scale-105 hover:-translate-y-2 hover:shadow-2xl transition-all duration-400" style={{ transitionDelay: `${Math.min(i, 7) * 80}ms` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="icon-box w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 font-bold text-white">
                    {job.company[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 leading-tight">{job.title}</h3>
                    <p className="text-sm text-gray-500">{job.company}</p>
                  </div>
                </div>
                {job.postedBy === userProfile?.uid && (
                  <button onClick={() => handleDelete(job.id)} className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className={typeColor[job.type] || 'badge-blue'}>{job.type}</span>
                {job.location && (
                  <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
                    <FiMapPin className="w-3 h-3" />{job.location}
                  </span>
                )}
                {job.salary && (
                  <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
                    <FiDollarSign className="w-3 h-3" />{job.salary}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 line-clamp-2 mb-3">{job.description}</p>

              {job.requirements?.length > 0 && (
                <ul className="mb-3 space-y-0.5">
                  {job.requirements.slice(0, 3).map((r, i) => (
                    <li key={i} className="text-xs text-gray-500 flex gap-1.5">
                      <span className="text-primary-500">•</span>{r}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-400">
                  by {job.postedByName} · {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                </div>
                <div className="flex gap-2">
                  {job.type === 'referral' && job.referral && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">{job.referral}</span>
                  )}
                  {job.applyLink && (
                    <a href={job.applyLink} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs flex items-center gap-1 py-1.5 px-3">
                      Apply <FiExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobBoard;
