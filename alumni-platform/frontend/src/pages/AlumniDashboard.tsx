import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mentorsAPI, discussionAPI, jobsAPI, usersAPI, paymentsAPI } from '../services/api';
import { MentorshipRequest, Discussion, Job, User, PaidSession } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  FiUsers, FiBriefcase, FiMessageSquare, FiArrowRight, FiCheckCircle,
  FiClock, FiUserCheck, FiMessageCircle, FiCheck, FiX, FiAward,
  FiTrendingUp, FiSettings, FiCalendar
} from 'react-icons/fi';
import { BiRupee } from 'react-icons/bi';

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

  useEffect(() => {
    if (loading) return;
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
  }, [loading]);

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

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const acceptedCount = requests.filter((r) => r.status === 'accepted').length;
  const totalEarnings = paidSessions.reduce((sum, s) => sum + (s.mentor_earning || 0), 0);

  if (loading) return <LoadingSpinner fullPage text="Loading dashboard..." />;

  const statCards = [
    {
      label: 'Students Connected',
      value: acceptedCount,
      icon: FiUserCheck,
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Pending Requests',
      value: pendingRequests.length,
      icon: FiClock,
      gradient: 'from-amber-400 to-orange-500',
    },
    {
      label: 'Jobs Posted',
      value: myJobs.length,
      icon: FiBriefcase,
      gradient: 'from-primary-500 to-violet-600',
    },
    {
      label: 'Sessions Earned',
      value: `₹${totalEarnings}`,
      icon: BiRupee,
      gradient: 'from-green-500 to-emerald-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="page-hero mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Welcome back, <span className="text-gradient">{userProfile?.name?.split(' ')[0]}</span>
          </h1>
          <span className="text-2xl animate-bounce-gentle">👋</span>
        </div>
        <p className="text-gray-500 text-base">
          Connect with students, share your expertise and post opportunities
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, gradient }, i) => (
          <div key={label} className="count-card animate-on-scroll" style={{ transitionDelay: `${i * 100}ms` }}>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className={`icon-box w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br ${gradient} flex-shrink-0`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-extrabold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 font-medium leading-tight">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Mentorship Requests */}
        <div className="card lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
              <h3 className="font-bold text-gray-900">Pending Mentorship Requests</h3>
              {pendingRequests.length > 0 && (
                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </div>
            <Link
              to="/mentorship-requests"
              className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 font-medium"
            >
              View all <FiArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <FiUsers className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.slice(0, 4).map((req) => {
                const student = students[req.studentId];
                return (
                  <div
                    key={req.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-white text-sm font-bold">
                        {(student?.name || 'S')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {student?.name || 'Student'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {student?.branch ? `${student.branch} · Year ${student.year}` : 'Student'}
                      </p>
                      {req.message && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2 italic">
                          "{req.message}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleUpdateRequest(req.id, 'accepted')}
                        disabled={updatingId === req.id}
                        className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                        title="Accept"
                      >
                        <FiCheck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateRequest(req.id, 'rejected')}
                        disabled={updatingId === req.id}
                        className="p-1.5 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition-colors disabled:opacity-50"
                        title="Decline"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/chat?userId=${req.studentId}`)}
                        className="p-1.5 rounded-lg bg-primary-100 text-primary-600 hover:bg-primary-200 transition-colors"
                        title="Message"
                      >
                        <FiMessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          {/* Alumni Quick Links */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-6 bg-gradient-to-b from-primary-500 to-violet-600 rounded-full" />
              <h3 className="font-bold text-gray-900">Quick Actions</h3>
            </div>
            <div className="space-y-2">
              {[
                { to: '/mentorship-requests', icon: FiUsers, label: 'Manage Students', desc: 'View & respond to requests', gradient: 'from-emerald-500 to-teal-600' },
                { to: '/jobs', icon: FiBriefcase, label: 'Post Opportunity', desc: 'Share jobs & internships', gradient: 'from-amber-400 to-orange-500' },
                { to: '/forum', icon: FiMessageSquare, label: 'Answer Questions', desc: 'Help students in forum', gradient: 'from-violet-500 to-purple-600' },
                { to: '/chat', icon: FiMessageCircle, label: 'Messages', desc: 'Chat with students', gradient: 'from-primary-500 to-violet-600' },
              ].map(({ to, icon: Icon, label, desc, gradient }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group glow-ring"
                >
                  <div className={`icon-box w-9 h-9 bg-gradient-to-br ${gradient}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                  <FiArrowRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all duration-200" />
                </Link>
              ))}
            </div>
          </div>

          {/* My Recent Jobs */}
          {myJobs.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-6 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
                <h3 className="font-bold text-gray-900">My Posted Jobs</h3>
              </div>
              <div className="space-y-2">
                {myJobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="flex items-center gap-2 py-1.5">
                    <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {job.company[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                      <p className="text-xs text-gray-400 truncate">{job.company}</p>
                    </div>
                  </div>
                ))}
                <Link to="/jobs" className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 mt-2 font-medium">
                  View all <FiArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Forum Questions */}
      <div className="card mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-6 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full" />
            <h3 className="font-bold text-gray-900">Recent Student Questions</h3>
          </div>
          <Link
            to="/forum"
            className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 font-medium"
          >
            Go to Forum <FiArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentDiscussions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FiMessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No discussions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentDiscussions.map((disc) => (
              <Link
                key={disc.id}
                to="/forum"
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                  <FiMessageSquare className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
                    {disc.question}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">
                      by {disc.postedByName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {disc.answers?.length || 0} answers
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(disc.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                {disc.answers?.length === 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0 font-medium">
                    Unanswered
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Profile completion banner */}
      {(!userProfile?.company || !userProfile?.linkedin) && (
        <div className="mt-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-violet-700 p-6 text-white">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <FiAward className="w-5 h-5" />
              <h3 className="font-bold text-lg">Complete Your Profile</h3>
            </div>
            <p className="text-sm text-white/80 mb-4">
              Add your company, job role, and LinkedIn to attract more student mentorship requests.
            </p>
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 bg-white text-primary-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              <FiTrendingUp className="w-4 h-4" /> Update Profile
            </Link>
          </div>
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -right-4 -bottom-12 w-32 h-32 bg-white/5 rounded-full" />
        </div>
      )}

      {/* ── Mentorship Settings ── */}
      <div className="card mt-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full" />
          <FiSettings className="w-5 h-5 text-green-600" />
          <h3 className="font-bold text-gray-900">Mentorship Settings</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Set your session price and duration so students can book and pay for mentorship sessions.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Session Price (₹)
            </label>
            <input
              type="number"
              min="0"
              value={pricePerSession}
              onChange={e => setPricePerSession(e.target.value)}
              placeholder="e.g. 500"
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Session Duration
            </label>
            <select
              value={sessionDuration}
              onChange={e => setSessionDuration(e.target.value)}
              className="input w-full"
            >
              <option value="30 min">30 min</option>
              <option value="45 min">45 min</option>
              <option value="60 min">1 hour</option>
              <option value="90 min">1.5 hours</option>
              <option value="120 min">2 hours</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Availability
            </label>
            <input
              type="text"
              value={availability}
              onChange={e => setAvailability(e.target.value)}
              placeholder="e.g. Weekends 10am–2pm"
              className="input w-full"
            />
          </div>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="btn-primary mt-4 flex items-center gap-2"
        >
          <FiCheckCircle className="w-4 h-4" />
          {savingSettings ? 'Saving...' : 'Save Settings'}
        </button>
        {userProfile?.price_per_session ? (
          <p className="text-xs text-green-600 mt-2 font-medium">
            ✓ Current price: ₹{userProfile.price_per_session} / {userProfile.session_duration || '60 min'}
          </p>
        ) : (
          <p className="text-xs text-amber-600 mt-2">
            ⚠ No price set yet — students cannot book paid sessions until you set a price.
          </p>
        )}
      </div>

      {/* ── Paid Mentorship Sessions ── */}
      <div className="card mt-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full" />
          <FiCalendar className="w-5 h-5 text-green-600" />
          <h3 className="font-bold text-gray-900">Paid Mentorship Sessions</h3>
          {paidSessions.length > 0 && (
            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {paidSessions.length}
            </span>
          )}
        </div>

        {paidSessions.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <BiRupee className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No paid sessions yet. Set your price above to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-semibold">Student</th>
                  <th className="pb-2 font-semibold">Amount</th>
                  <th className="pb-2 font-semibold">Your Earning</th>
                  <th className="pb-2 font-semibold">Payment</th>
                  <th className="pb-2 font-semibold">Session</th>
                  <th className="pb-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paidSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 font-medium text-gray-900">{session.student_name || '—'}</td>
                    <td className="py-2.5 text-gray-700">₹{session.amount}</td>
                    <td className="py-2.5 text-green-700 font-semibold">₹{session.mentor_earning}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        session.payment_status === 'success'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {session.payment_status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {session.session_status}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-400 text-xs">
                      {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlumniDashboard;
