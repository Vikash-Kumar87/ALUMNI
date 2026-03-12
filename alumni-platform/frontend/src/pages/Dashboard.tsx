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
import AlumniDashboard from './AlumniDashboard';
import {
  FiUsers, FiBriefcase, FiMessageSquare, FiTrendingUp, FiArrowRight,
  FiCpu, FiMessageCircle, FiZap, FiStar, FiActivity, FiAward, FiFileText, FiEdit2
} from 'react-icons/fi';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title);

/* ── Animated counter ── */
function AnimatedNumber({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setVal(Math.round(p * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  return <>{val}</>;
}

/* ── Skeleton block ── */
const Sk = ({ w = 'w-full', h = 'h-4', rounded = 'rounded' }: { w?: string; h?: string; rounded?: string }) => (
  <div className={`skeleton ${w} ${h} ${rounded}`} />
);

const SkeletonStats = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Sk w="w-12" h="h-12" rounded="rounded-xl" />
          <div className="flex-1 space-y-2">
            <Sk w="w-10" h="h-6" rounded="rounded" />
            <Sk w="w-20" h="h-3" rounded="rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const SkeletonList = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
        <Sk w="w-9" h="h-9" rounded="rounded-xl" />
        <div className="flex-1 space-y-2">
          <Sk w="w-3/4" h="h-4" />
          <Sk w="w-1/2" h="h-3" />
        </div>
      </div>
    ))}
  </div>
);

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
        setRecentJobs(jobsRes.data.jobs as Job[]);
        setRecentDiscussions(discussRes.data.discussions as Discussion[]);
        setMentorshipRequests(mentorRes.data.requests as MentorshipRequest[]);
      } catch (err) { console.error('Dashboard fetch error:', err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [userProfile?.role]);

  if (userProfile?.role === 'alumni') return <AlumniDashboard />;

  const doughnutData = {
    labels: ['Students', 'Alumni'],
    datasets: [{
      data: [stats?.students || 0, stats?.alumni || 0],
      backgroundColor: ['#6366f1', '#10b981'],
      borderWidth: 0,
    }],
  };

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTH_NAMES[d.getMonth()] };
  });
  const countByMonth = (items: { createdAt?: string }[]) =>
    last6Months.map(({ year, month }) =>
      items.filter(item => {
        if (!item.createdAt) return false;
        const cd = new Date(item.createdAt);
        return cd.getFullYear() === year && cd.getMonth() === month;
      }).length
    );
  const barData = {
    labels: last6Months.map(m => m.label),
    datasets: [
      { label: 'Jobs Posted', data: countByMonth(recentJobs), backgroundColor: 'rgba(99,102,241,0.85)', borderRadius: 8 },
      { label: 'Discussions', data: countByMonth(recentDiscussions), backgroundColor: 'rgba(16,185,129,0.85)', borderRadius: 8 },
    ],
  };

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: FiUsers, grad: 'linear-gradient(135deg,#6366f1,#7c3aed)', shadow: 'rgba(99,102,241,0.35)' },
    { label: 'Students', value: stats?.students ?? 0, icon: FiTrendingUp, grad: 'linear-gradient(135deg,#8b5cf6,#a855f7)', shadow: 'rgba(139,92,246,0.35)' },
    { label: 'Alumni Mentors', value: stats?.alumni ?? 0, icon: FiAward, grad: 'linear-gradient(135deg,#10b981,#059669)', shadow: 'rgba(16,185,129,0.35)' },
    { label: 'Job Postings', value: stats?.activeJobs ?? 0, icon: FiBriefcase, grad: 'linear-gradient(135deg,#f59e0b,#ea580c)', shadow: 'rgba(245,158,11,0.35)' },
  ];

  const aiFeatures = [
    { to: '/chatbot', icon: FiMessageCircle, label: 'Career Chatbot', desc: 'AI career advice', grad: 'linear-gradient(135deg,#6366f1,#7c3aed)', glow: 'rgba(99,102,241,0.3)', emoji: '🤖' },
    { to: '/interview', icon: FiCpu, label: 'Interview Prep', desc: 'AI mock interviews', grad: 'linear-gradient(135deg,#8b5cf6,#a855f7)', glow: 'rgba(139,92,246,0.3)', emoji: '🎯' },
    { to: '/mentors', icon: FiUsers, label: 'Find Mentors', desc: 'AI-matched mentors', grad: 'linear-gradient(135deg,#10b981,#059669)', glow: 'rgba(16,185,129,0.3)', emoji: '🧭' },
    { to: '/roadmap', icon: FiActivity, label: 'Skill Roadmap', desc: 'Personalised path', grad: 'linear-gradient(135deg,#f59e0b,#ea580c)', glow: 'rgba(245,158,11,0.3)', emoji: '🗺️' },
    { to: '/resume', icon: FiFileText, label: 'Resume Analyzer', desc: 'AI resume score & tips', grad: 'linear-gradient(135deg,#6366f1,#7c3aed)', glow: 'rgba(99,102,241,0.3)', emoji: '📄' },
    { to: '/cover-letter', icon: FiEdit2, label: 'Cover Letter', desc: 'AI cover letter writer', grad: 'linear-gradient(135deg,#ec4899,#be185d)', glow: 'rgba(236,72,153,0.3)', emoji: '✉️' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ── Aurora background ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,#eef2ff 0%,#f5f3ff 30%,#ecfdf5 60%,#eff6ff 100%)' }} />
        <div className="aurora-blob w-[620px] h-[620px] -top-36 -left-36 opacity-40"
          style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.55) 0%,rgba(139,92,246,0.3) 50%,transparent 70%)' }} />
        <div className="aurora-blob-2 w-[520px] h-[520px] -bottom-28 -right-28 opacity-35"
          style={{ background: 'radial-gradient(circle,rgba(16,185,129,0.5) 0%,rgba(6,182,212,0.25) 50%,transparent 70%)' }} />
        <div className="aurora-blob w-[420px] h-[420px] top-1/3 left-1/2 -translate-x-1/2 opacity-20"
          style={{ background: 'radial-gradient(circle,rgba(236,72,153,0.4) 0%,rgba(167,139,250,0.2) 50%,transparent 70%)', animationDelay: '6s', animationDuration: '22s' }} />
        <div className="aurora-blob-2 w-[320px] h-[320px] bottom-1/4 left-8 opacity-25"
          style={{ background: 'radial-gradient(circle,rgba(6,182,212,0.45) 0%,rgba(99,102,241,0.2) 50%,transparent 70%)', animationDelay: '2s' }} />
        <div className="aurora-blob w-[280px] h-[280px] top-12 right-16 opacity-20"
          style={{ background: 'radial-gradient(circle,rgba(245,158,11,0.4) 0%,rgba(234,88,12,0.15) 50%,transparent 70%)', animationDelay: '10s', animationDuration: '18s' }} />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,1) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Hero banner ── */}
        <div className="relative rounded-3xl overflow-hidden mb-8 shadow-2xl"
          style={{ background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 40%,#6d28d9 70%,#4338ca 100%)', animation: 'fadeInUp 0.5s ease-out both' }}>
          {/* Decorative glow orbs */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle,#a78bfa,transparent 70%)' }} />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle,#34d399,transparent 70%)' }} />
          <div className="relative z-10 px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow">
                  Welcome back, <span className="text-amber-300">{userProfile?.name?.split(' ')[0] ?? 'Student'}</span>
                </h1>
                <span className="text-3xl" style={{ animation: 'bounce 1.5s infinite' }}>👋</span>
              </div>
              <p className="text-violet-200 text-base">Explore mentors, practice interviews, and grow your skills</p>
              {!loading && (
                <div className="flex flex-wrap gap-4 mt-5">
                  {[
                    { label: 'Total Users', v: stats?.totalUsers ?? 0 },
                    { label: 'Jobs Live', v: stats?.activeJobs ?? 0 },
                    { label: 'Mentors', v: stats?.alumni ?? 0 },
                    { label: 'Discussions', v: stats?.discussions ?? 0 },
                  ].map(({ label, v }) => (
                    <div key={label} className="text-center bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
                      <p className="text-2xl font-extrabold text-white"><AnimatedNumber target={v} /></p>
                      <p className="text-xs text-violet-200 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-[90px] leading-none select-none opacity-20 hidden sm:block">📊</div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        {loading ? <SkeletonStats /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statCards.map(({ label, value, icon: Icon, grad, shadow }, i) => (
              <div key={label} className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-5 shadow-sm"
                style={{ animation: `fadeInUp 0.45s ease-out ${i * 80}ms both` }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 40px ${shadow}`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md transition-all duration-300"
                    style={{ background: grad, boxShadow: `0 8px 20px ${shadow}` }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-gray-900"><AnimatedNumber target={value} /></p>
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm"
            style={{ animation: 'fadeInUp 0.45s ease-out 320ms both' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(to bottom,#6366f1,#7c3aed)' }} />
              <h3 className="font-bold text-gray-900">Growth Overview</h3>
              <span className="ml-auto text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">Last 6 months</span>
            </div>
            <Bar data={barData} options={{
              responsive: true,
              plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8-8+8 } } },
              scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } }, x: { grid: { display: false } } },
            }} />
          </div>
          <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm"
            style={{ animation: 'fadeInUp 0.45s ease-out 400ms both' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(to bottom,#10b981,#059669)' }} />
              <h3 className="font-bold text-gray-900">User Distribution</h3>
            </div>
            <div className="flex justify-center mb-4">
              <div style={{ maxWidth: 180 }}>
                <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } }, cutout: '72%' }} />
              </div>
            </div>
            <div className="space-y-3 mt-2">
              {[
                { label: 'Active Mentorships', val: stats?.activeMentorships ?? 0, cls: 'bg-emerald-50 text-emerald-700' },
                { label: 'Discussions', val: stats?.discussions ?? 0, cls: 'bg-indigo-50 text-indigo-700' },
              ].map(({ label, val, cls }) => (
                <div key={label} className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${cls}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── AI Features ── */}
        <div className="mb-8" style={{ animation: 'fadeInUp 0.45s ease-out 480ms both' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
              <FiZap className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-bold text-lg text-gray-900">AI-Powered Features</h2>
            <span className="ml-2 text-xs bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-semibold">✨ Powered by Groq</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {aiFeatures.map(({ to, icon: Icon, label, desc, grad, glow, emoji }, i) => {
              const [hov, setHov] = useState(false);
              return (
                <Link key={to} to={to}
                  onMouseEnter={() => setHov(true)}
                  onMouseLeave={() => setHov(false)}
                  className="group relative bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm overflow-hidden transition-all duration-300"
                  style={{
                    animation: `fadeInUp 0.45s ease-out ${560 + i * 80}ms both`,
                    transform: hov ? 'translateY(-6px)' : '',
                    boxShadow: hov ? `0 20px 40px ${glow}` : '',
                  }}>
                  {/* Top gradient bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl transition-all duration-300"
                    style={{ background: grad, opacity: hov ? 1 : 0.5 }} />
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 shadow-sm transition-all duration-300"
                    style={{ background: grad, boxShadow: hov ? `0 8px 20px ${glow}` : '' }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm mb-1">{label}</p>
                  <p className="text-xs text-gray-500 mb-4">{desc}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{emoji}</span>
                    <FiArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Recent Jobs + Discussions ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Recent Jobs */}
          <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm"
            style={{ animation: 'fadeInUp 0.45s ease-out 700ms both' }}>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom,#f59e0b,#ea580c)' }} />
                <h3 className="font-bold text-gray-900">Latest Opportunities</h3>
              </div>
              <Link to="/jobs" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                View all <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {loading ? <SkeletonList /> : recentJobs.length > 0 ? (
              <div className="space-y-3">
                {recentJobs.slice(0, 3).map((job, ji) => (
                  <div key={job.id}
                    className="flex items-start gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer border border-transparent"
                    style={{ animation: `fadeInUp 0.35s ease-out ${ji * 60}ms both`, background: 'rgba(249,250,251,0.8)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(238,242,255,0.9)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#c7d2fe'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(249,250,251,0.8)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>
                      <FiBriefcase className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{job.title}</p>
                      <p className="text-xs text-gray-500">{job.company} · {job.location}</p>
                      <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-semibold ${job.type === 'internship' ? 'bg-indigo-100 text-indigo-700' : job.type === 'referral' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {job.type === 'internship' ? '🎓 Internship' : job.type === 'referral' ? '🤝 Referral' : '💼 Full-time'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
                  <FiBriefcase className="w-6 h-6 text-amber-500" />
                </div>
                <p className="text-gray-400 text-sm">No jobs posted yet</p>
              </div>
            )}
          </div>

          {/* Recent Discussions */}
          <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm"
            style={{ animation: 'fadeInUp 0.45s ease-out 780ms both' }}>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom,#8b5cf6,#a855f7)' }} />
                <h3 className="font-bold text-gray-900">Recent Discussions</h3>
              </div>
              <Link to="/forum" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                View all <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {loading ? <SkeletonList /> : recentDiscussions.length > 0 ? (
              <div className="space-y-3">
                {recentDiscussions.slice(0, 4).map((d, di) => (
                  <div key={d.id}
                    className="p-3 rounded-xl transition-all duration-200 cursor-pointer border border-transparent"
                    style={{ animation: `fadeInUp 0.35s ease-out ${di * 60}ms both`, background: 'rgba(249,250,251,0.8)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(245,243,255,0.9)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#ddd6fe'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(249,250,251,0.8)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; }}>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{d.question}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">👤 {d.postedByName}</span>
                      <span className="flex items-center gap-1">
                        <FiMessageSquare className="w-3 h-3" />{d.answers?.length ?? 0} answers
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)' }}>
                  <FiMessageSquare className="w-6 h-6 text-violet-500" />
                </div>
                <p className="text-gray-400 text-sm">No discussions yet</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Mentorship Requests ── */}
        {mentorshipRequests.length > 0 && (
          <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm"
            style={{ animation: 'fadeInUp 0.45s ease-out 860ms both' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <FiStar className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">Mentorship Requests</h3>
              <span className="ml-auto bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {mentorshipRequests.length} total
              </span>
            </div>
            <div className="space-y-2">
              {mentorshipRequests.slice(0, 3).map((req, ri) => (
                <div key={req.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-transparent transition-all duration-200"
                  style={{ animation: `fadeInUp 0.35s ease-out ${ri * 60}ms both`, background: 'rgba(249,250,251,0.8)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(236,253,245,0.9)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#6ee7b7'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(249,250,251,0.8)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; }}>
                  <p className="text-sm text-gray-700 truncate mr-4">{req.message || 'Mentorship request'}</p>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : req.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {req.status === 'pending' ? '⏳ Pending' : req.status === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
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