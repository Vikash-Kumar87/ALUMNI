import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mentorsAPI, discussionAPI, jobsAPI, usersAPI, paymentsAPI } from '../services/api';
import { MentorshipRequest, Discussion, Job, User, PaidSession } from '../types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  FiUsers, FiBriefcase, FiMessageSquare, FiArrowRight, FiCheckCircle,
  FiClock, FiUserCheck, FiMessageCircle, FiCheck, FiX, FiAward,
  FiTrendingUp, FiSettings, FiCalendar, FiZap, FiEdit2, FiTrash2
} from 'react-icons/fi';
import { BiRupee } from 'react-icons/bi';

/* ── Animated counter ── */
function AnimatedNum({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 800, 1);
      setVal(Math.round(p * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  return <>{val}</>;
}

const Sk = ({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) => (
  <div className={`skeleton ${w} ${h} rounded-xl`} />
);

const AlumniDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [students, setStudents] = useState<Record<string, User>>({});
  const [recentDiscussions, setRecentDiscussions] = useState<Discussion[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [paidSessions, setPaidSessions] = useState<PaidSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [jobForm, setJobForm] = useState({
    title: '',
    company: '',
    location: '',
    type: 'job' as Job['type'],
    description: '',
    requirements: '',
    salary: '',
    applyLink: '',
    referral: '',
  });
  const [savingJob, setSavingJob] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [deletingDiscussionId, setDeletingDiscussionId] = useState<string | null>(null);

  // Mentorship settings state
  const [pricePerSession, setPricePerSession] = useState<string>('');
  const [sessionDuration, setSessionDuration] = useState<string>('60 min');
  const [availability, setAvailability] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [reqRes, discRes, jobRes, usersRes, sessionsRes] = await Promise.all([
          mentorsAPI.getMyRequests(),
          discussionAPI.getAll(),
          jobsAPI.getAll(),
          usersAPI.getAllUsers(),
          paymentsAPI.getMentorSessions(),
        ]);

        const allRequests = reqRes.data.requests as MentorshipRequest[];
        setRequests(allRequests);

        const allJobs = jobRes.data.jobs as Job[];
        setMyJobs(allJobs.filter((j) => j.postedBy === userProfile?.uid));

        setRecentDiscussions(
          (discRes.data.discussions as Discussion[]).slice(0, 5),
        );

        // Build a uid → User map for student info lookup
        const userMap: Record<string, User> = {};
        ((usersRes.data.users as User[]) || []).forEach((u) => {
          userMap[u.uid] = u;
        });
        setStudents(userMap);

        setPaidSessions(sessionsRes.data.sessions as PaidSession[]);
      } catch (err) {
        console.error('Alumni dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    // Pre-fill mentorship settings from profile
    if (userProfile) {
      setPricePerSession(String(userProfile.price_per_session || ''));
      setSessionDuration(userProfile.session_duration || '60 min');
      setAvailability(userProfile.availability || '');
    }

    fetchAll();
  }, [userProfile?.uid]);

  const handleUpdateRequest = async (id: string, status: 'accepted' | 'rejected') => {
    setUpdatingId(id);
    try {
      await mentorsAPI.updateRequest(id, status);
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
      toast.success(status === 'accepted' ? 'Mentorship accepted!' : 'Request declined');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update request');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await paymentsAPI.updateMentorSettings({
        price_per_session: pricePerSession ? Number(pricePerSession) : undefined,
        session_duration: sessionDuration || undefined,
        availability: availability || undefined,
      });
      toast.success('Mentorship settings saved!');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const openEditJob = (job: Job) => {
    setEditingJob(job);
    setJobForm({
      title: job.title || '',
      company: job.company || '',
      location: job.location || '',
      type: job.type || 'job',
      description: job.description || '',
      requirements: (job.requirements || []).join(', '),
      salary: job.salary || '',
      applyLink: job.applyLink || '',
      referral: job.referral || '',
    });
  };

  const closeEditJob = () => {
    setEditingJob(null);
    setSavingJob(false);
  };

  const handleUpdateJob = async () => {
    if (!editingJob) return;

    const title = jobForm.title.trim();
    const company = jobForm.company.trim();
    const description = jobForm.description.trim();

    if (!title || !company || !description) {
      toast.error('Title, company and description are required');
      return;
    }

    setSavingJob(true);
    try {
      const payload = {
        title,
        company,
        location: jobForm.location.trim() || 'Remote',
        type: jobForm.type,
        description,
        requirements: jobForm.requirements
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
        salary: jobForm.salary.trim(),
        applyLink: jobForm.applyLink.trim(),
        referral: jobForm.referral.trim(),
      };

      await jobsAPI.update(editingJob.id, payload);
      setMyJobs((prev) =>
        prev.map((job) =>
          job.id === editingJob.id
            ? {
                ...job,
                ...payload,
              }
            : job,
        ),
      );
      toast.success('Job updated successfully');
      closeEditJob();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update job');
      setSavingJob(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    const ok = window.confirm('Delete this job post?');
    if (!ok) return;

    setDeletingJobId(jobId);
    try {
      await jobsAPI.delete(jobId);
      setMyJobs((prev) => prev.filter((job) => job.id !== jobId));
      toast.success('Job deleted successfully');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to delete job');
    } finally {
      setDeletingJobId(null);
    }
  };

  const handleDeleteDiscussion = async (discussionId: string) => {
    const ok = window.confirm('Delete this discussion?');
    if (!ok) return;

    setDeletingDiscussionId(discussionId);
    try {
      await discussionAPI.delete(discussionId);
      setRecentDiscussions((prev) => prev.filter((disc) => disc.id !== discussionId));
      toast.success('Discussion deleted successfully');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to delete discussion');
    } finally {
      setDeletingDiscussionId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const acceptedCount = requests.filter((r) => r.status === 'accepted').length;
  const totalEarnings = paidSessions.reduce((sum, s) => sum + (s.mentor_earning || 0), 0);

  if (loading) return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: 'linear-gradient(160deg,#ecfdf5 0%,#f0fdf4 35%,#eff6ff 65%,#f5f3ff 100%)' }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="rounded-3xl h-44" style={{ background: 'linear-gradient(135deg,#059669,#0891b2,#7c3aed)', animation: 'fadeInUp 0.4s ease-out both' }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_,i) => <div key={i} className="bg-white/80 rounded-2xl p-5 shadow-sm"><Sk w="w-12" h="h-12" /><div className="mt-3 space-y-2"><Sk w="w-10" h="h-6" /><Sk w="w-20" h="h-3" /></div></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/80 rounded-2xl p-6 shadow-sm space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="flex gap-3"><Sk w="w-10" h="h-10" /><div className="flex-1 space-y-2"><Sk w="w-1/2" /><Sk w="w-3/4" /></div></div>)}</div>
          <div className="bg-white/80 rounded-2xl p-6 shadow-sm space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="flex gap-3"><Sk w="w-9" h="h-9" /><div className="flex-1 space-y-1.5"><Sk w="w-1/2" h="h-3.5" /><Sk w="w-3/4" h="h-3" /></div></div>)}</div>
        </div>
      </div>
    </div>
  );

  const statCards = [
    { label: 'Students Connected', value: acceptedCount, icon: FiUserCheck, grad: 'linear-gradient(135deg,#10b981,#059669)', shadow: 'rgba(16,185,129,0.35)' },
    { label: 'Pending Requests', value: pendingRequests.length, icon: FiClock, grad: 'linear-gradient(135deg,#f59e0b,#d97706)', shadow: 'rgba(245,158,11,0.35)' },
    { label: 'Jobs Posted', value: myJobs.length, icon: FiBriefcase, grad: 'linear-gradient(135deg,#6366f1,#7c3aed)', shadow: 'rgba(99,102,241,0.35)' },
    { label: 'Total Earned', value: totalEarnings, icon: BiRupee, grad: 'linear-gradient(135deg,#10b981,#0891b2)', shadow: 'rgba(16,185,129,0.3)', prefix: '₹' },
  ];

  const quickLinks = [
    { to: '/mentorship-requests', icon: FiUsers, label: 'Manage Students', desc: 'View & respond to requests', grad: 'linear-gradient(135deg,#10b981,#059669)', glow: 'rgba(16,185,129,0.25)' },
    { to: '/jobs', icon: FiBriefcase, label: 'Post Opportunity', desc: 'Share jobs & internships', grad: 'linear-gradient(135deg,#f59e0b,#d97706)', glow: 'rgba(245,158,11,0.25)' },
    { to: '/forum', icon: FiMessageSquare, label: 'Answer Questions', desc: 'Help students in forum', grad: 'linear-gradient(135deg,#8b5cf6,#a855f7)', glow: 'rgba(139,92,246,0.25)' },
    { to: '/chat', icon: FiMessageCircle, label: 'Messages', desc: 'Chat with students', grad: 'linear-gradient(135deg,#6366f1,#7c3aed)', glow: 'rgba(99,102,241,0.25)' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ── Aurora background ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,#ecfdf5 0%,#f0fdf4 30%,#eff6ff 60%,#f5f3ff 100%)' }} />
        <div className="aurora-blob w-[600px] h-[600px] -top-32 -left-32 opacity-40"
          style={{ background: 'radial-gradient(circle,rgba(16,185,129,0.5) 0%,rgba(6,182,212,0.25) 50%,transparent 70%)' }} />
        <div className="aurora-blob-2 w-[500px] h-[500px] -bottom-24 -right-24 opacity-35"
          style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.45) 0%,rgba(139,92,246,0.2) 50%,transparent 70%)' }} />
        <div className="aurora-blob w-[380px] h-[380px] top-1/3 right-1/4 opacity-20"
          style={{ background: 'radial-gradient(circle,rgba(245,158,11,0.35) 0%,rgba(16,185,129,0.15) 50%,transparent 70%)', animationDelay: '5s' }} />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'linear-gradient(rgba(16,185,129,1) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Hero banner ── */}
        <div className="relative rounded-3xl overflow-hidden mb-8 shadow-2xl"
          style={{ background: 'linear-gradient(135deg,#059669 0%,#0891b2 40%,#7c3aed 75%,#4f46e5 100%)', animation: 'fadeInUp 0.5s ease-out both' }}>
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-15" style={{ background: 'radial-gradient(circle,#34d399,transparent 70%)' }} />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)' }} />
          <div className="relative z-10 px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow">
                  Welcome back, <span className="text-amber-300">{userProfile?.name?.split(' ')[0]}</span>
                </h1>
                <span className="text-3xl" style={{ animation: 'bounce 1.5s infinite' }}>👋</span>
              </div>
              <p className="text-emerald-100 text-base mb-5">Connect with students, share expertise and post opportunities</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Students', v: acceptedCount },
                  { label: 'Pending', v: pendingRequests.length },
                  { label: 'Jobs', v: myJobs.length },
                  { label: 'Earned', v: `₹${totalEarnings}`, raw: true },
                ].map(({ label, v, raw }) => (
                  <div key={label} className="text-center bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
                    <p className="text-2xl font-extrabold text-white">{raw ? v : <AnimatedNum target={v as number} />}</p>
                    <p className="text-xs text-emerald-200 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[90px] leading-none select-none opacity-15 hidden sm:block">🎓</div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map(({ label, value, icon: Icon, grad, shadow, prefix }, i) => (
            <div key={label} className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-5 shadow-sm transition-all duration-300"
              style={{ animation: `fadeInUp 0.45s ease-out ${i * 80}ms both` }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform='translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow=`0 20px 40px ${shadow}`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform=''; (e.currentTarget as HTMLDivElement).style.boxShadow=''; }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md" style={{ background: grad, boxShadow: `0 8px 20px ${shadow}` }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-gray-900">
                    {prefix}{typeof value === 'number' ? <AnimatedNum target={value} /> : value}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Pending Requests ── */}
          <div className="lg:col-span-2 bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm"
            style={{ animation: 'fadeInUp 0.45s ease-out 320ms both' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                  <FiClock className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Pending Requests</h3>
                {pendingRequests.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(254,243,199,1)', color: '#d97706' }}>{pendingRequests.length}</span>
                )}
              </div>
              <Link to="/mentorship-requests" className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                View all <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(6,182,212,0.06))' }}>
                  <FiUsers className="w-7 h-7 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No pending requests</p>
                <p className="text-xs text-gray-400 mt-1">Students will appear here when they send requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.slice(0, 4).map((req, ri) => {
                  const student = students[req.studentId];
                  return (
                    <div key={req.id} className="flex items-start gap-3 p-4 rounded-xl border border-transparent transition-all duration-200"
                      style={{ background: 'rgba(249,250,251,0.8)', animation: `fadeInUp 0.35s ease-out ${ri * 60}ms both` }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background='rgba(240,253,244,0.9)'; (e.currentTarget as HTMLDivElement).style.borderColor='#6ee7b7'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background='rgba(249,250,251,0.8)'; (e.currentTarget as HTMLDivElement).style.borderColor='transparent'; }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                        <span className="text-white text-sm font-bold">{(student?.name || 'S')[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{student?.name || 'Student'}</p>
                        <p className="text-xs text-gray-500">{student?.branch ? `${student.branch} · Year ${student.year}` : 'Student'}</p>
                        {req.message && <p className="text-xs text-gray-500 mt-1 italic line-clamp-1">"{req.message}"</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => handleUpdateRequest(req.id, 'accepted')} disabled={updatingId === req.id}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-50"
                          style={{ background: 'rgba(209,250,229,1)', color: '#059669' }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(167,243,208,1)'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(209,250,229,1)'}>
                          <FiCheck className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleUpdateRequest(req.id, 'rejected')} disabled={updatingId === req.id}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-50"
                          style={{ background: 'rgba(254,226,226,1)', color: '#dc2626' }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(254,202,202,1)'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(254,226,226,1)'}>
                          <FiX className="w-4 h-4" />
                        </button>
                        <button onClick={() => navigate(`/chat?userId=${req.studentId}`)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
                          style={{ background: 'rgba(238,242,255,1)', color: '#6366f1' }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(224,231,255,1)'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(238,242,255,1)'}>
                          <FiMessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Quick Actions ── */}
          <div className="space-y-4">
            <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm"
              style={{ animation: 'fadeInUp 0.45s ease-out 400ms both' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                  <FiZap className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Quick Actions</h3>
              </div>
              <div className="space-y-2">
                {quickLinks.map(({ to, icon: Icon, label, desc, grad, glow }, qi) => (
                  <Link key={to} to={to}
                    className="flex items-center gap-3 p-3 rounded-xl border border-transparent transition-all duration-200 group"
                    style={{ animation: `fadeInUp 0.35s ease-out ${qi * 50}ms both` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background=`rgba(248,250,252,0.9)`; (e.currentTarget as HTMLAnchorElement).style.boxShadow=`0 8px 20px ${glow}`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background=''; (e.currentTarget as HTMLAnchorElement).style.boxShadow=''; }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: grad }}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    <FiArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all duration-200" />
                  </Link>
                ))}
              </div>
            </div>

            {myJobs.length > 0 && (
              <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-5 shadow-sm"
                style={{ animation: 'fadeInUp 0.45s ease-out 480ms both' }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom,#f59e0b,#d97706)' }} />
                  <h3 className="font-bold text-gray-900 text-sm">My Posted Jobs</h3>
                </div>
                <div className="space-y-3">
                  {myJobs.slice(0, 4).map((job, ji) => (
                    <div key={job.id} className="flex items-center gap-2.5"
                      style={{ animation: `fadeInUp 0.3s ease-out ${ji * 50}ms both` }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                        {job.company[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{job.title}</p>
                        <p className="text-xs text-gray-400 truncate">{job.company}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditJob(job)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: 'rgba(238,242,255,1)', color: '#4f46e5' }}
                          aria-label="Edit job"
                          title="Edit job"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          disabled={deletingJobId === job.id}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-60"
                          style={{ background: 'rgba(254,226,226,1)', color: '#dc2626' }}
                          aria-label="Delete job"
                          title="Delete job"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <Link to="/jobs" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 mt-1 transition-colors">View all <FiArrowRight className="w-3 h-3" /></Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Student Questions ── */}
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm mt-6"
          style={{ animation: 'fadeInUp 0.45s ease-out 560ms both' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#8b5cf6,#a855f7)' }}>
                <FiMessageSquare className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">Recent Student Questions</h3>
            </div>
            <Link to="/forum" className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
              Go to Forum <FiArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentDiscussions.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(168,85,247,0.06))' }}>
                <FiMessageSquare className="w-6 h-6 text-violet-400" />
              </div>
              <p className="text-sm font-semibold text-gray-500">No discussions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentDiscussions.map((disc, di) => {
                const isOwnDiscussion = disc.postedBy === userProfile?.uid;
                return (
                  <div key={disc.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-transparent transition-all duration-200"
                    style={{ animation: `fadeInUp 0.35s ease-out ${di * 50}ms both`, background: 'rgba(249,250,251,0.8)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background='rgba(245,243,255,0.9)'; (e.currentTarget as HTMLDivElement).style.borderColor='#ddd6fe'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background='rgba(249,250,251,0.8)'; (e.currentTarget as HTMLDivElement).style.borderColor='transparent'; }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,243,255,1)' }}>
                      <FiMessageSquare className="w-4 h-4 text-violet-600" />
                    </div>
                    <Link to="/forum" className="flex-1 min-w-0 group">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">{disc.question}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-gray-400">👤 {disc.postedByName}</span>
                        <span className="text-xs text-gray-400">{disc.answers?.length || 0} answers</span>
                        <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(disc.createdAt), { addSuffix: true })}</span>
                      </div>
                    </Link>
                    <div className="flex items-center gap-1.5">
                      {(disc.answers?.length ?? 0) === 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(254,243,199,1)', color: '#d97706' }}>Unanswered</span>
                      )}
                      {isOwnDiscussion && (
                        <button
                          onClick={() => handleDeleteDiscussion(disc.id)}
                          disabled={deletingDiscussionId === disc.id}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-60"
                          style={{ background: 'rgba(254,226,226,1)', color: '#dc2626' }}
                          aria-label="Delete discussion"
                          title="Delete discussion"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {editingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={closeEditJob} />
            <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Edit Job Post</h3>
                <button
                  onClick={closeEditJob}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Title</label>
                  <input
                    value={jobForm.title}
                    onChange={(e) => setJobForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Company</label>
                  <input
                    value={jobForm.company}
                    onChange={(e) => setJobForm((prev) => ({ ...prev, company: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Location</label>
                  <input
                    value={jobForm.location}
                    onChange={(e) => setJobForm((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Type</label>
                  <select
                    value={jobForm.type}
                    onChange={(e) => setJobForm((prev) => ({ ...prev, type: e.target.value as Job['type'] }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="job">Job</option>
                    <option value="internship">Internship</option>
                    <option value="referral">Referral</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Description</label>
                  <textarea
                    value={jobForm.description}
                    onChange={(e) => setJobForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Requirements (comma separated)</label>
                  <input
                    value={jobForm.requirements}
                    onChange={(e) => setJobForm((prev) => ({ ...prev, requirements: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Salary</label>
                  <input
                    value={jobForm.salary}
                    onChange={(e) => setJobForm((prev) => ({ ...prev, salary: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Apply Link</label>
                  <input
                    value={jobForm.applyLink}
                    onChange={(e) => setJobForm((prev) => ({ ...prev, applyLink: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Referral Note</label>
                  <input
                    value={jobForm.referral}
                    onChange={(e) => setJobForm((prev) => ({ ...prev, referral: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  onClick={closeEditJob}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateJob}
                  disabled={savingJob}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}
                >
                  {savingJob ? 'Saving...' : 'Update Job'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Profile completion banner ── */}
        {(!userProfile?.company || !userProfile?.linkedin) && (
          <div className="relative overflow-hidden rounded-2xl mt-6 shadow-lg"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed,#6d28d9)', animation: 'fadeInUp 0.45s ease-out 640ms both' }}>
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-15" style={{ background: 'radial-gradient(circle,#a78bfa,transparent 70%)' }} />
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-2 mb-1">
                <FiAward className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-lg text-white">Complete Your Profile</h3>
              </div>
              <p className="text-sm text-violet-200 mb-4">Add your company, job role, and LinkedIn to attract more student mentorship requests.</p>
              <Link to="/profile"
                className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.92)', color: '#4f46e5' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background='rgba(255,255,255,1)'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background='rgba(255,255,255,0.92)'}>
                <FiTrendingUp className="w-4 h-4" /> Update Profile
              </Link>
            </div>
          </div>
        )}

        {/* ── Mentorship Settings ── */}
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm mt-6"
          style={{ animation: 'fadeInUp 0.45s ease-out 720ms both' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              <FiSettings className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">Mentorship Settings</h3>
          </div>
          <p className="text-sm text-gray-400 mb-5">Set your session price and availability so students can book paid sessions.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Session Price (₹)', type: 'number', val: pricePerSession, set: setPricePerSession, placeholder: 'e.g. 500' },
              { label: 'Availability', type: 'text', val: availability, set: setAvailability, placeholder: 'e.g. Weekends 10am–2pm' },
            ].map(({ label, type, val, set, placeholder }) => (
              <div key={label}>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>
                <input type={type} min={type === 'number' ? 0 : undefined} value={val}
                  onChange={e => set(e.target.value)} placeholder={placeholder}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white/80" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Session Duration</label>
              <select value={sessionDuration} onChange={e => setSessionDuration(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white/80">
                {['30 min','45 min','60 min','90 min','120 min'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSaveSettings} disabled={savingSettings}
            className="mt-5 flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl text-white transition-all duration-200 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 8px 20px rgba(16,185,129,0.35)' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform='translateY(-2px)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform=''}>
            {savingSettings ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <FiCheckCircle className="w-4 h-4" />}
            {savingSettings ? 'Saving…' : 'Save Settings'}
          </button>
          {userProfile?.price_per_session ? (
            <p className="text-xs font-semibold mt-3" style={{ color: '#059669' }}>✓ Current: ₹{userProfile.price_per_session} / {userProfile.session_duration || '60 min'}</p>
          ) : (
            <p className="text-xs font-semibold mt-3" style={{ color: '#d97706' }}>⚠ No price set — students cannot book paid sessions yet.</p>
          )}
        </div>

        {/* ── Paid Sessions ── */}
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm mt-6"
          style={{ animation: 'fadeInUp 0.45s ease-out 800ms both' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#0891b2)' }}>
              <FiCalendar className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">Paid Mentorship Sessions</h3>
            {paidSessions.length > 0 && (
              <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(209,250,229,1)', color: '#059669' }}>{paidSessions.length} sessions</span>
            )}
          </div>
          {paidSessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(6,182,212,0.06))' }}>
                <BiRupee className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-gray-500">No paid sessions yet</p>
              <p className="text-xs text-gray-400 mt-1">Set your price above to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100">
                    {['Student','Amount','Your Earning','Payment','Session','Date'].map(h => (
                      <th key={h} className="pb-3 text-xs font-bold text-gray-500 uppercase tracking-wide pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paidSessions.map((s, si) => (
                    <tr key={s.id} className="border-b border-gray-50 transition-all duration-150"
                      style={{ animation: `fadeInUp 0.3s ease-out ${si * 50}ms both` }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background='rgba(240,253,244,0.7)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background=''}>
                      <td className="py-3 font-semibold text-gray-900 pr-4">{s.student_name || '—'}</td>
                      <td className="py-3 text-gray-700 pr-4">₹{s.amount}</td>
                      <td className="py-3 font-bold pr-4" style={{ color: '#059669' }}>₹{s.mentor_earning}</td>
                      <td className="py-3 pr-4">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={s.payment_status === 'success' ? { background: 'rgba(209,250,229,1)', color: '#059669' } : { background: 'rgba(254,226,226,1)', color: '#dc2626' }}>{s.payment_status}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(219,234,254,1)', color: '#2563eb' }}>{s.session_status}</span>
                      </td>
                      <td className="py-3 text-xs text-gray-400">{formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AlumniDashboard;
