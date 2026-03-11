import React, { useEffect, useRef, useState } from 'react';
import { usersAPI, discussionAPI, jobsAPI } from '../services/api';
import { User } from '../types';

interface AdminStats {
  students: number;
  alumni: number;
  discussions: number;
  jobs: number;
}
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  FiUsers, FiBriefcase, FiMessageSquare, FiShield, FiSearch, FiTrash2,
  FiUserCheck, FiAlertCircle, FiBarChart2, FiRefreshCw
} from 'react-icons/fi';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

type AdminTab = 'overview' | 'users' | 'content';

const AdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Scroll-reveal observer (runs after mount)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));

    try {
      const [usersRes, diskRes, jobsRes] = await Promise.all([
        usersAPI.getAllUsers(),
        discussionAPI.getAll(),
        jobsAPI.getAll(),
      ]);
      const allUsers: User[] = usersRes.data.users;
      const allDisk = diskRes.data.discussions;
      const allJobs = jobsRes.data.jobs;

      setUsers(allUsers);
      setDiscussions(allDisk);
      setJobs(allJobs);

      const studentCount = allUsers.filter(u => u.role === 'student').length;
      const alumniCount = allUsers.filter(u => u.role === 'alumni').length;

      setStats({
        students: studentCount,
        alumni: alumniCount,
        discussions: allDisk.length,
        jobs: allJobs.length,
      });
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (uid: string) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    try {
      await usersAPI.deleteUser(uid);
      setUsers(prev => prev.filter(u => u.uid !== uid));
      toast.success('User deleted');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to delete user');
    }
  };

  const deleteDiscussion = async (id: string) => {
    if (!window.confirm('Delete this discussion?')) return;
    try {
      await discussionAPI.delete(id);
      setDiscussions(prev => prev.filter((d: any) => d.id !== id));
      toast.success('Discussion deleted');
    } catch (err) {
      toast.error((err as Error).message || 'Failed');
    }
  };

  const cleanupOrphans = async () => {
    if (!window.confirm('This will remove all users from the website that no longer exist in Firebase Auth (orphaned / fake accounts). Continue?')) return;
    setCleaning(true);
    try {
      const res = await usersAPI.cleanupOrphans();
      const { removed } = res.data;
      if (removed === 0) {
        toast.success('No orphaned users found — everything is clean!');
      } else {
        toast.success(`Cleaned up ${removed} orphaned user account(s)`);
        await fetchData(); // refresh the list
      }
    } catch {
      toast.error('Cleanup failed. Please try again.');
    } finally {
      setCleaning(false);
    }
  };

  const deleteJob = async (id: string) => {
    if (!window.confirm('Delete this job posting?')) return;
    try {
      await jobsAPI.delete(id);
      setJobs(prev => prev.filter((j: any) => j.id !== id));
      toast.success('Job deleted');
    } catch (err) {
      toast.error((err as Error).message || 'Failed');
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const doughnutData = {
    labels: ['Students', 'Alumni'],
    datasets: [{
      data: [stats?.students || 0, stats?.alumni || 0],
      backgroundColor: ['#3b82f6', '#10b981'],
      borderWidth: 0,
    }],
  };

  const barData = {
    labels: ['Students', 'Alumni', 'Discussions', 'Jobs'],
    datasets: [{
      label: 'Total Count',
      data: [stats?.students || 0, stats?.alumni || 0, stats?.discussions || 0, stats?.jobs || 0],
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
      borderRadius: 6,
    }],
  };

  if (loading) return <div className="flex items-center justify-center h-96"><LoadingSpinner /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="page-hero flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <FiShield className="text-primary-600" /> Admin <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="section-subtitle">Manage users, content and monitor platform activity</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={cleanupOrphans}
            disabled={cleaning}
            className="flex items-center gap-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            title="Remove Firestore users that have no Firebase Auth account"
          >
            <FiRefreshCw className={`w-4 h-4 ${cleaning ? 'animate-spin' : ''}`} />
            {cleaning ? 'Cleaning...' : 'Cleanup Orphaned Users'}
          </button>
          <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 border border-red-100">
            <FiAlertCircle className="w-4 h-4" /> Admin Access
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="tab-bar mb-8 w-fit">
        {(['overview', 'users', 'content'] as AdminTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab-bar-btn ${tab === t ? 'active' : ''}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="count-card animate-on-scroll" style={{ transitionDelay: '0ms' }}>
              <div className="icon-box w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600">
                <FiUsers className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.students}</p>
                <p className="text-xs text-gray-500">Students</p>
              </div>
            </div>
            <div className="count-card animate-on-scroll" style={{ transitionDelay: '100ms' }}>
              <div className="icon-box w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600">
                <FiUserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.alumni}</p>
                <p className="text-xs text-gray-500">Alumni</p>
              </div>
            </div>
            <div className="count-card animate-on-scroll" style={{ transitionDelay: '200ms' }}>
              <div className="icon-box w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500">
                <FiMessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.discussions}</p>
                <p className="text-xs text-gray-500">Discussions</p>
              </div>
            </div>
            <div className="count-card animate-on-scroll" style={{ transitionDelay: '300ms' }}>
              <div className="icon-box w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600">
                <FiBriefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.jobs}</p>
                <p className="text-xs text-gray-500">Job Posts</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card card-hover-glow">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><FiBarChart2 className="text-primary-500" /> User Distribution</h3>
              <div className="h-48 flex items-center justify-center">
                <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'right' } }, cutout: '65%' }} />
              </div>
            </div>
            <div className="card card-hover-glow">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><FiBarChart2 className="text-accent-500" /> Platform Overview</h3>
              <div className="h-48">
                <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold">All Users ({users.length})</h3>
              <button
                onClick={cleanupOrphans}
                disabled={cleaning}
                className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-60"
              >
                <FiRefreshCw className={`w-3 h-3 ${cleaning ? 'animate-spin' : ''}`} />
                {cleaning ? 'Cleaning...' : 'Remove Orphaned'}
              </button>
            </div>
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="input input-glow pl-9 text-sm py-2" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 font-medium text-gray-400">User</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-400">Role</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-400">Joined</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map(u => (
                  <tr key={u.uid} className="hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                            {u.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`badge capitalize ${u.role === 'alumni' ? 'badge-green' : 'badge-blue'}`}>{u.role}</span>
                    </td>
                    <td className="py-3 px-2 text-gray-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {u.uid !== userProfile?.uid && (
                        <button onClick={() => deleteUser(u.uid)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <p className="text-center py-8 text-gray-400">No users found</p>
            )}
          </div>
        </div>
      )}

      {/* Content Tab */}
      {tab === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Discussions */}
          <div className="card">
            <h3 className="font-semibold mb-4">Discussions ({discussions.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {discussions.map((d: any) => (
                <div key={d.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg group">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm font-medium text-gray-700 truncate">{d.question}</p>
                    <p className="text-xs text-gray-400">by {d.postedByName}</p>
                  </div>
                  <button onClick={() => deleteDiscussion(d.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 flex-shrink-0">
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {discussions.length === 0 && <p className="text-center py-6 text-gray-400 text-sm">No discussions</p>}
            </div>
          </div>

          {/* Jobs */}
          <div className="card">
            <h3 className="font-semibold mb-4">Job Postings ({jobs.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {jobs.map((j: any) => (
                <div key={j.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg group">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm font-medium text-gray-700 truncate">{j.title}</p>
                    <p className="text-xs text-gray-400">{j.company} · by {j.postedByName}</p>
                  </div>
                  <button onClick={() => deleteJob(j.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 flex-shrink-0">
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {jobs.length === 0 && <p className="text-center py-6 text-gray-400 text-sm">No job postings</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
