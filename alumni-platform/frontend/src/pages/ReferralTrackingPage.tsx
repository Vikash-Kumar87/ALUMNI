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

const statusOrder: ReferralStatus[] = ['requested', 'in_review', 'referred', 'interview', 'offered', 'joined', 'rejected'];

const statusProgressValue: Record<ReferralStatus, number> = {
  requested: 12,
  in_review: 30,
  referred: 50,
  interview: 70,
  offered: 92,
  joined: 100,
  rejected: 100,
};

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

  const analytics = useMemo(() => {
    const all = mine;
    const total = all.length;

    const statusCounts = statusOrder.reduce((acc, s) => {
      acc[s] = all.filter(item => item.status === s).length;
      return acc;
    }, {} as Record<ReferralStatus, number>);

    const successful = all.filter(item => item.status === 'offered' || item.status === 'joined').length;
    const conversionRate = total > 0 ? Math.round((successful / total) * 100) : 0;

    const responseDurations = all
      .map(item => {
        const timeline = (item.timeline || []).slice().sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
        const requestedAt = timeline.find(t => t.status === 'requested')?.at;
        const firstActionAt = timeline.find(t => t.status !== 'requested')?.at;
        if (!requestedAt || !firstActionAt) return null;

        const diffMs = new Date(firstActionAt).getTime() - new Date(requestedAt).getTime();
        if (diffMs < 0) return null;
        return diffMs / (1000 * 60 * 60);
      })
      .filter((x): x is number => x !== null);

    const avgResponseHours = responseDurations.length > 0
      ? Math.round(responseDurations.reduce((a, b) => a + b, 0) / responseDurations.length)
      : 0;

    const companyMap = new Map<string, { total: number; successful: number }>();
    all.forEach(item => {
      const key = item.company || 'Unknown';
      const prev = companyMap.get(key) || { total: 0, successful: 0 };
      prev.total += 1;
      if (item.status === 'offered' || item.status === 'joined') prev.successful += 1;
      companyMap.set(key, prev);
    });

    const companyBreakdown = Array.from(companyMap.entries())
      .map(([company, data]) => ({
        company,
        ...data,
        rate: data.total > 0 ? Math.round((data.successful / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate || b.total - a.total)
      .slice(0, 6);

    return {
      total,
      successful,
      conversionRate,
      avgResponseHours,
      statusCounts,
      companyBreakdown,
    };
  }, [mine]);

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

        {!loading && mine.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-7 grid grid-cols-1 xl:grid-cols-3 gap-5"
          >
            <div className="xl:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-slate-900">Referral Funnel</h3>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Pipeline Health</span>
              </div>

              <div className="space-y-3">
                {statusOrder.map(status => {
                  const count = analytics.statusCounts[status] || 0;
                  const width = analytics.total > 0 ? Math.max(6, Math.round((count / analytics.total) * 100)) : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-600">{statusStyle[status].label}</span>
                        <span className="text-slate-500">{count}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${width}%` }}
                          transition={{ duration: 0.55 }}
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-lg">
              <h3 className="text-xl font-black text-slate-900">Insights</h3>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400 font-bold">Conversion</p>
                  <p className="mt-1 text-3xl font-black text-slate-900">{analytics.conversionRate}%</p>
                  <p className="text-xs text-slate-500">{analytics.successful} successful out of {analytics.total}</p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400 font-bold">Avg First Response</p>
                  <p className="mt-1 text-3xl font-black text-slate-900">{analytics.avgResponseHours}h</p>
                  <p className="text-xs text-slate-500">Time from request to first action</p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400 font-bold">Momentum Score</p>
                  <p className="mt-1 text-3xl font-black text-slate-900">
                    {Math.round(
                      mine.reduce((sum, item) => sum + (statusProgressValue[item.status] || 0), 0) / Math.max(mine.length, 1)
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Average stage progress across pipeline</p>
                </div>
              </div>
            </div>

            <div className="xl:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 shadow-lg">
              <h3 className="text-xl font-black text-slate-900">Company-wise Success</h3>
              <p className="text-sm text-slate-500 mt-1">Top companies ranked by offer/join conversion.</p>

              {analytics.companyBreakdown.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Not enough data yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {analytics.companyBreakdown.map(row => (
                    <div key={row.company} className="rounded-2xl border border-slate-200 p-3.5">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FiBriefcase className="w-4 h-4 text-slate-500" />
                          <p className="font-semibold text-slate-800 truncate">{row.company}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-700">{row.rate}%</p>
                      </div>

                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(4, row.rate)}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        />
                      </div>

                      <p className="mt-1.5 text-xs text-slate-500">{row.successful} successful out of {row.total} requests</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
