import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiActivity,
  FiArrowRight,
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiFileText,
  FiFilter,
  FiSend,
  FiTrendingUp,
  FiUsers,
  FiXCircle,
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { jobsAPI, referralsAPI } from '../services/api';
import { Job, ReferralRequest, ReferralStatus } from '../types';

const statusStyle: Record<ReferralStatus, { label: string; cls: string }> = {
  requested: { label: 'Requested', cls: 'bg-sky-100 text-sky-700' },
  in_review: { label: 'In Review', cls: 'bg-indigo-100 text-indigo-700' },
  referred: { label: 'Referred', cls: 'bg-cyan-100 text-cyan-700' },
  interview: { label: 'Interview', cls: 'bg-amber-100 text-amber-700' },
  offered: { label: 'Offered', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', cls: 'bg-rose-100 text-rose-700' },
  joined: { label: 'Joined', cls: 'bg-green-100 text-green-700' },
};

const alumniStatuses: ReferralStatus[] = ['in_review', 'referred', 'interview', 'offered', 'rejected', 'joined'];

const ReferralTrackingPage: React.FC = () => {
  const { userProfile } = useAuth();
  const role = userProfile?.role;
  const isStudent = role === 'student';

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [note, setNote] = useState('');
  const [resumeLink, setResumeLink] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReferralStatus>('all');

  const [asStudent, setAsStudent] = useState<ReferralRequest[]>([]);
  const [asAlumni, setAsAlumni] = useState<ReferralRequest[]>([]);
  const [stats, setStats] = useState({ total: 0, requested: 0, inProgress: 0, successful: 0, rejected: 0 });

  const fetchData = async () => {
    try {
      setLoading(true);
      const requests = [referralsAPI.getMine()];
      if (isStudent) requests.push(jobsAPI.getAll({ type: 'referral' }));

      const [referralsRes, jobsRes] = await Promise.all(requests as [Promise<any>, Promise<any>?]);

      setAsStudent(referralsRes.data.asStudent || []);
      setAsAlumni(referralsRes.data.asAlumni || []);
      setStats(referralsRes.data.stats || { total: 0, requested: 0, inProgress: 0, successful: 0, rejected: 0 });

      if (isStudent && jobsRes) {
        const loaded = jobsRes.data.jobs || [];
        setJobs(loaded);
        if (loaded.length > 0 && !selectedJobId) setSelectedJobId(loaded[0].id);
      }
    } catch (error) {
      console.error('Failed to load referral tracking data:', error);
      toast.error('Failed to load referral tracking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isStudent]);

  const mine = isStudent ? asStudent : asAlumni;

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return mine;
    return mine.filter(r => r.status === statusFilter);
  }, [mine, statusFilter]);

  const submitRequest = async () => {
    if (!selectedJobId) {
      toast.error('Please select a referral opportunity');
      return;
    }

    try {
      setCreating(true);
      await referralsAPI.create({ jobId: selectedJobId, note, resumeLink });
      toast.success('Referral request sent');
      setNote('');
      setResumeLink('');
      await fetchData();
    } catch (error: any) {
      console.error('Create referral request error:', error);
      toast.error(error?.message || 'Failed to create referral request');
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id: string, status: ReferralStatus) => {
    try {
      setUpdatingId(id);
      await referralsAPI.updateStatus(id, { status });
      toast.success('Referral status updated');
      await fetchData();
    } catch (error) {
      console.error('Update referral status error:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 text-white">
        <div className="absolute -top-24 -left-12 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-0 w-72 h-72 bg-black/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-100">Career Pipeline</p>
            <h1 className="mt-2 text-3xl sm:text-5xl font-black">Company Referral Tracking</h1>
            <p className="mt-3 text-teal-100 max-w-2xl text-sm sm:text-base">
              Track every referral stage from request to offer with clean progress flow and live status updates.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mt-7 grid grid-cols-2 lg:grid-cols-5 gap-3"
          >
            {[
              { label: 'Total', value: stats.total, icon: FiActivity },
              { label: 'Requested', value: stats.requested, icon: FiClock },
              { label: 'In Progress', value: stats.inProgress, icon: FiTrendingUp },
              { label: 'Successful', value: stats.successful, icon: FiCheckCircle },
              { label: 'Rejected', value: stats.rejected, icon: FiXCircle },
            ].map(item => (
              <div key={item.label} className="rounded-2xl bg-white/15 border border-white/20 p-4 backdrop-blur-md">
                <item.icon className="w-4 h-4 text-teal-100" />
                <p className="mt-2 text-2xl font-black">{item.value}</p>
                <p className="text-xs text-emerald-100 uppercase tracking-wider">{item.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {isStudent && (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-3xl shadow-xl p-6 mb-7"
          >
            <h2 className="text-2xl font-black text-slate-900">Request a Referral</h2>
            <p className="text-slate-500 text-sm mt-1">Choose a referral posting and send a concise request note.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <select
                value={selectedJobId}
                onChange={e => setSelectedJobId(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {jobs.length === 0 && <option value="">No referral jobs available</option>}
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title} • {job.company}</option>
                ))}
              </select>

              <input
                value={resumeLink}
                onChange={e => setResumeLink(e.target.value)}
                placeholder="Resume / Portfolio link (optional)"
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Brief note to alumni (why you're a good fit)"
              rows={4}
              className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />

            <button
              onClick={submitRequest}
              disabled={creating || jobs.length === 0}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold disabled:opacity-60"
            >
              <FiSend className="w-4 h-4" />
              {creating ? 'Sending...' : 'Send Request'}
            </button>
          </motion.section>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-slate-900">{isStudent ? 'My Referral Requests' : 'Incoming Referral Requests'}</h2>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <FiFilter className="w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | ReferralStatus)}
              className="bg-transparent focus:outline-none"
            >
              <option value="all">All statuses</option>
              {Object.keys(statusStyle).map(key => (
                <option key={key} value={key}>{statusStyle[key as ReferralStatus].label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-52 rounded-3xl border border-slate-200 bg-white animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
            <FiUsers className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-2xl font-black text-slate-900">No referral records yet</h3>
            <p className="mt-2 text-slate-500">{isStudent ? 'Start with a request above.' : 'Requests from students will appear here.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <AnimatePresence>
              {filtered.map((item, idx) => (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, delay: idx * 0.03 }}
                  className="bg-white border border-slate-200 rounded-3xl shadow-lg p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-bold">{item.company}</p>
                      <h3 className="mt-1 text-xl font-black text-slate-900">{item.jobTitle}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {isStudent ? `Handled by ${item.alumniName}` : `Requested by ${item.studentName}`}
                      </p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusStyle[item.status].cls}`}>
                      {statusStyle[item.status].label}
                    </span>
                  </div>

                  {(item.note || item.resumeLink) && (
                    <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
                      {item.note && <p>{item.note}</p>}
                      {item.resumeLink && (
                        <a href={item.resumeLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <FiExternalLink className="w-4 h-4" /> Resume Link
                        </a>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
                    {(item.timeline || []).slice(-4).map((step, i) => (
                      <React.Fragment key={`${item.id}-${step.at}-${i}`}>
                        <div className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700">
                          {statusStyle[step.status].label}
                        </div>
                        {i < (item.timeline || []).slice(-4).length - 1 && <FiArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>{formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}</span>
                    {!isStudent && (
                      <div className="flex items-center gap-1.5">
                        {alumniStatuses.map(s => (
                          <button
                            key={s}
                            disabled={updatingId === item.id || item.status === s}
                            onClick={() => updateStatus(item.id, s)}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition ${
                              item.status === s
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                            }`}
                          >
                            {statusStyle[s].label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {item.feedback && (
                    <div className="mt-3 inline-flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
                      <FiFileText className="w-4 h-4 mt-0.5" />
                      <span>{item.feedback}</span>
                    </div>
                  )}
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralTrackingPage;
