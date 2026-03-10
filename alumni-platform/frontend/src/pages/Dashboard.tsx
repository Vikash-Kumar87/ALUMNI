import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import { usersAPI, jobsAPI, discussionAPI, mentorsAPI } from '../services/api';
import { PlatformStats, Job, Discussion, MentorshipRequest } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AlumniDashboard from './AlumniDashboard';
import {
  FiUsers, FiBriefcase, FiMessageSquare, FiTrendingUp, FiArrowRight,
  FiCpu, FiMessageCircle, FiZap, FiStar
} from 'react-icons/fi';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title);

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [recentDiscussions, setRecentDiscussions] = useState<Discussion[]>([]);
  const [mentorshipRequests, setMentorshipRequests] = useState<MentorshipRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.role === 'alumni') return;
    const fetchData = async () => {
      try {
        const [statsRes, jobsRes, discussRes, mentorRes] = await Promise.all([
          usersAPI.getStats(), jobsAPI.getAll(), discussionAPI.getAll(), mentorsAPI.getMyRequests(),
        ]);
        setStats(statsRes.data.stats);
        setRecentJobs((jobsRes.data.jobs as Job[]).slice(0, 3));
        setRecentDiscussions((discussRes.data.discussions as Discussion[]).slice(0, 4));
        setMentorshipRequests(mentorRes.data.requests as MentorshipRequest[]);
      } catch (err) { console.error('Dashboard fetch error:', err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [userProfile?.role]);

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

  // Alumni see their own dedicated dashboard (rendered after hooks)
  if (userProfile?.role === 'alumni') return <AlumniDashboard />;

  if (loading) return <LoadingSpinner fullPage text="Loading dashboard..." />;

  const doughnutData = {
    labels: ['Students', 'Alumni'],
    datasets: [{ data: [stats?.students || 0, stats?.alumni || 0], backgroundColor: ['#6366f1', '#10b981'], borderWidth: 0 }],
  };

  const barData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      { label: 'New Users', data: [12, 19, 25, 31, 42, 55], backgroundColor: 'rgba(99,102,241,0.8)', borderRadius: 6 },
      { label: 'Mentorships', data: [5, 9, 12, 18, 22, 30], backgroundColor: 'rgba(16,185,129,0.8)', borderRadius: 6 },
    ],
  };

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: FiUsers, gradient: 'from-primary-500 to-violet-600', bg: 'bg-primary-50', color: 'text-primary-600' },
    { label: 'Students', value: stats?.students || 0, icon: FiTrendingUp, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', color: 'text-violet-600' },
    { label: 'Alumni Mentors', value: stats?.alumni || 0, icon: FiStar, gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', color: 'text-emerald-600' },
    { label: 'Job Postings', value: stats?.activeJobs || 0, icon: FiBriefcase, gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', color: 'text-amber-600' },
  ];

  const aiFeatures = [
    { to: '/chatbot', icon: FiMessageCircle, label: 'Career Chatbot', desc: 'Get AI career advice', gradient: 'from-primary-500 to-violet-600' },
    { to: '/interview', icon: FiCpu, label: 'Interview Practice', desc: 'AI-powered mock interviews', gradient: 'from-violet-500 to-purple-600' },
    { to: '/mentors', icon: FiUsers, label: 'Find Mentors', desc: 'AI-matched mentors', gradient: 'from-emerald-500 to-teal-600' },
    { to: '/forum', icon: FiMessageSquare, label: 'Discussion Forum', desc: 'Ask & answer questions', gradient: 'from-amber-400 to-orange-500' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ── Animated aurora background blobs ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {/* Base gradient */}
        <div className="absolute inset-0"
          style={{
            background: 'linear-gradient(160deg, #eef2ff 0%, #f5f3ff 30%, #ecfdf5 60%, #eff6ff 100%)',
          }}
        />
        {/* Blob 1 — indigo/violet top-left */}
        <div className="aurora-blob w-[600px] h-[600px] -top-32 -left-32 opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.55) 0%, rgba(139,92,246,0.3) 50%, transparent 70%)' }}
        />
        {/* Blob 2 — emerald bottom-right */}
        <div className="aurora-blob-2 w-[500px] h-[500px] -bottom-24 -right-24 opacity-35"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.5) 0%, rgba(6,182,212,0.25) 50%, transparent 70%)' }}
        />
        {/* Blob 3 — pink center-top */}
        <div className="aurora-blob w-[400px] h-[400px] top-1/4 left-1/2 -translate-x-1/2 opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, rgba(167,139,250,0.2) 50%, transparent 70%)',
            animationDelay: '7s',
            animationDuration: '20s',
          }}
        />
        {/* Blob 4 — cyan bottom-left */}
        <div className="aurora-blob-2 w-[350px] h-[350px] bottom-1/3 left-10 opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.45) 0%, rgba(99,102,241,0.2) 50%, transparent 70%)',
            animationDelay: '2s',
          }}
        />
        {/* Blob 5 — amber top-right */}
        <div className="aurora-blob w-[300px] h-[300px] top-10 right-20 opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(245,158,11,0.4) 0%, rgba(234,88,12,0.15) 50%, transparent 70%)',
            animationDelay: '10s',
            animationDuration: '16s',
          }}
        />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Page content ── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="page-hero mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Welcome back, <span className="text-gradient">{userProfile?.name?.split(' ')[0]}</span>
          </h1>
          <span className="text-2xl animate-bounce-gentle">👋</span>
        </div>
        <p className="text-gray-500 text-base">
          {userProfile?.role === 'student'
            ? 'Explore mentors, practice interviews, and grow your skills'
            : 'Connect with students and share your expertise'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, gradient, bg, color }, i) => (
          <div key={label} className="animate-on-scroll" style={{ transitionDelay: `${i * 100}ms` }}>
            <div className="rounded-2xl border border-white/60 p-4 sm:p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)' }}>
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
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Charts */}
        <div className="rounded-2xl border border-white/60 p-6 shadow-lg transition-all duration-300 lg:col-span-2" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-6 bg-gradient-to-b from-primary-500 to-violet-600 rounded-full" />
            <h3 className="font-bold text-gray-900">Growth Overview</h3>
          </div>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }} />
        </div>
        <div className="rounded-2xl border border-white/60 p-6 shadow-lg transition-all duration-300" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-6 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full" />
            <h3 className="font-bold text-gray-900">User Distribution</h3>
          </div>
          <div className="flex justify-center mb-4">
            <div style={{ maxWidth: '180px' }}>
              <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom' } }, cutout: '72%' }} />
            </div>
          </div>
          <div className="space-y-3 mt-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Active Mentorships</span>
              <span className="font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs">{stats?.activeMentorships || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Discussions</span>
              <span className="font-bold bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-full text-xs">{stats?.discussions || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Features */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-5">
          <FiZap className="w-5 h-5 text-primary-600 animate-glow-pulse" />
          <h2 className="font-bold text-lg text-gray-900">AI-Powered Features</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {aiFeatures.map(({ to, icon: Icon, label, desc, gradient }, i) => (
            <Link key={to} to={to}
              className="card-spotlight group animate-on-scroll hover:scale-105 hover:-translate-y-2 hover:shadow-2xl transition-all duration-400 rounded-2xl border border-white/60 p-6 shadow-lg"
            style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)' }} style={{ transitionDelay: `${i * 100}ms` }}>
              <div className={`icon-box w-11 h-11 bg-gradient-to-br ${gradient} mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="font-bold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-500 mt-1 mb-3">{desc}</p>
              <FiArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-600 group-hover:translate-x-1 transition-all duration-200" />
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="rounded-2xl border border-white/60 p-6 shadow-lg" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)' }}>
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-5 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
              <h3 className="font-bold text-gray-900">Latest Opportunities</h3>
            </div>
            <Link to="/jobs" className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 hover:gap-1.5 transition-all">View all <FiArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="space-y-3">
            {recentJobs.length > 0 ? recentJobs.map(job => (
              <div key={job.id} className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                  <FiBriefcase className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{job.title}</p>
                  <p className="text-xs text-gray-500">{job.company} · {job.location}</p>
                  <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-semibold ${job.type === 'internship' ? 'bg-primary-100 text-primary-700' : job.type === 'referral' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {job.type}
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <FiBriefcase className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No jobs posted yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Discussions */}
        <div className="rounded-2xl border border-white/60 p-6 shadow-lg" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)' }}>
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-5 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full" />
              <h3 className="font-bold text-gray-900">Recent Discussions</h3>
            </div>
            <Link to="/forum" className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 hover:gap-1.5 transition-all">View all <FiArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="space-y-3">
            {recentDiscussions.length > 0 ? recentDiscussions.map(d => (
              <div key={d.id} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                <p className="text-sm font-semibold text-gray-900 line-clamp-2">{d.question}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>by {d.postedByName}</span>
                  <span className="flex items-center gap-1">
                    <FiMessageSquare className="w-3 h-3" />{d.answers?.length || 0} answers
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <FiMessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No discussions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mentorship requests */}
      {mentorshipRequests.length > 0 && (
        <div className="rounded-2xl border border-white/60 p-6 shadow-lg mt-6" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-5 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full" />
            <h3 className="font-bold text-gray-900">Mentorship Requests</h3>
          </div>
          <div className="space-y-2">
            {mentorshipRequests.slice(0, 3).map(req => (
              <div key={req.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-700 truncate mr-4">{req.message || 'Mentorship request'}</p>
                <span className={`badge shrink-0 ${req.status === 'pending' ? 'badge-yellow' : req.status === 'accepted' ? 'badge-green' : 'badge-red'}`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Dashboard;