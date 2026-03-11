import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mentorsAPI, usersAPI } from '../services/api';
import { MentorshipRequest, User } from '../types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  FiUsers, FiCheck, FiX, FiMessageCircle, FiUser, FiClock,
  FiCheckCircle, FiXCircle, FiSearch, FiBriefcase,
} from 'react-icons/fi';

type FilterStatus = 'all' | 'pending' | 'accepted' | 'rejected';

const statusConfig: Record<string, { label: string; bg: string; color: string; dot: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', bg: 'rgba(254,243,199,1)', color: '#d97706', dot: '#f59e0b', icon: FiClock },
  accepted: { label: 'Accepted', bg: 'rgba(209,250,229,1)', color: '#059669', dot: '#10b981', icon: FiCheckCircle },
  rejected: { label: 'Declined', bg: 'rgba(254,226,226,1)', color: '#dc2626', dot: '#ef4444', icon: FiXCircle },
};

const SKILL_COLORS = [
  { bg: 'rgba(238,242,255,1)', color: '#4f46e5' },
  { bg: 'rgba(245,243,255,1)', color: '#7c3aed' },
  { bg: 'rgba(236,253,245,1)', color: '#059669' },
  { bg: 'rgba(255,251,235,1)', color: '#d97706' },
  { bg: 'rgba(253,242,248,1)', color: '#db2777' },
];

const Sk = ({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) => (
  <div className={`skeleton ${w} ${h} rounded-xl`} />
);

const MentorshipRequests: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [students, setStudents] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqResult, usersResult] = await Promise.allSettled([
        mentorsAPI.getMyRequests(),
        usersAPI.getAllUsers(),
      ]);

      if (reqResult.status === 'fulfilled') {
        const allReqs = (reqResult.value.data.requests as MentorshipRequest[]) || [];
        setRequests(allReqs);
      } else {
        toast.error('Failed to load mentorship requests');
        console.error(reqResult.reason);
      }

      if (usersResult.status === 'fulfilled') {
        const userMap: Record<string, User> = {};
        ((usersResult.value.data.users as User[]) || []).forEach((u) => {
          userMap[u.uid] = u;
        });
        setStudents(userMap);
      } else {
        console.error('Failed to load user list:', usersResult.reason);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdate = async (id: string, status: 'accepted' | 'rejected') => {
    setUpdatingId(id);
    try {
      await mentorsAPI.updateRequest(id, status);
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
      toast.success(status === 'accepted' ? 'Mentorship accepted! 🎉' : 'Request declined');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update request');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filter !== 'all' && req.status !== filter) return false;
    if (search) {
      const student = students[req.studentId];
      const q = search.toLowerCase();
      return (
        student?.name?.toLowerCase().includes(q) ||
        student?.branch?.toLowerCase().includes(q) ||
        req.message?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    accepted: requests.filter((r) => r.status === 'accepted').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  if (loading) return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: 'linear-gradient(160deg,#eef2ff 0%,#f5f3ff 40%,#eff6ff 100%)' }} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="rounded-3xl h-44" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', animation: 'fadeInUp 0.4s ease-out both' }} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_,i) => <div key={i} className="bg-white/80 rounded-2xl p-5 shadow-sm"><Sk w="w-10" h="h-10" /><div className="mt-3 space-y-2"><Sk w="w-10" h="h-6" /><Sk w="w-16" h="h-3" /></div></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_,i) => <div key={i} className="bg-white/80 rounded-2xl p-6 shadow-sm space-y-3"><div className="flex gap-3"><Sk w="w-12" h="h-12" /><div className="flex-1 space-y-2"><Sk w="w-1/2" /><Sk w="w-3/4" /></div></div><Sk h="h-3" /><Sk w="w-2/3" h="h-3" /></div>)}
        </div>
      </div>
    </div>
  );

  const filterCfg = [
    { key: 'all' as FilterStatus, label: 'Total', grad: 'linear-gradient(135deg,#4f46e5,#7c3aed)', glow: 'rgba(99,102,241,0.35)', icon: FiUsers },
    { key: 'pending' as FilterStatus, label: 'Pending', grad: 'linear-gradient(135deg,#f59e0b,#d97706)', glow: 'rgba(245,158,11,0.35)', icon: FiClock },
    { key: 'accepted' as FilterStatus, label: 'Accepted', grad: 'linear-gradient(135deg,#10b981,#059669)', glow: 'rgba(16,185,129,0.35)', icon: FiCheckCircle },
    { key: 'rejected' as FilterStatus, label: 'Declined', grad: 'linear-gradient(135deg,#ef4444,#dc2626)', glow: 'rgba(239,68,68,0.35)', icon: FiXCircle },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ── Aurora background ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,#eef2ff 0%,#f5f3ff 35%,#eff6ff 65%,#fdf4ff 100%)' }} />
        <div className="aurora-blob w-[600px] h-[600px] -top-32 -left-32 opacity-35"
          style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.5) 0%,rgba(139,92,246,0.25) 50%,transparent 70%)' }} />
        <div className="aurora-blob-2 w-[500px] h-[500px] -bottom-24 -right-24 opacity-30"
          style={{ background: 'radial-gradient(circle,rgba(16,185,129,0.4) 0%,rgba(6,182,212,0.2) 50%,transparent 70%)' }} />
        <div className="aurora-blob w-[360px] h-[360px] top-1/2 right-1/3 opacity-20"
          style={{ background: 'radial-gradient(circle,rgba(245,158,11,0.35) 0%,rgba(99,102,241,0.15) 50%,transparent 70%)', animationDelay: '4s' }} />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,1) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Hero banner ── */}
        <div className="relative rounded-3xl overflow-hidden mb-8 shadow-2xl"
          style={{ background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 45%,#6d28d9 100%)', animation: 'fadeInUp 0.5s ease-out both' }}>
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-15" style={{ background: 'radial-gradient(circle,#a78bfa,transparent 70%)' }} />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#34d399,transparent 70%)' }} />
          <div className="relative z-10 px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow">
                  Student <span style={{ color: '#c4b5fd' }}>Mentorship</span> Requests
                </h1>
              </div>
              <p className="text-indigo-200 text-base mb-5">Review and respond to students who want your guidance</p>
              <div className="flex flex-wrap gap-3">
                {[{ l: 'Total', v: counts.all }, { l: 'Pending', v: counts.pending }, { l: 'Accepted', v: counts.accepted }, { l: 'Declined', v: counts.rejected }].map(({ l, v }) => (
                  <div key={l} className="text-center bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
                    <p className="text-2xl font-extrabold text-white">{v}</p>
                    <p className="text-xs text-indigo-200 mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[90px] leading-none select-none opacity-15 hidden sm:block">🤝</div>
          </div>
        </div>

        {/* ── Filter stat chips ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {filterCfg.map(({ key, label, grad, glow, icon: Icon }, i) => {
            const isActive = filter === key;
            return (
              <button key={key} onClick={() => setFilter(key)}
                className="bg-white/85 backdrop-blur-sm rounded-2xl border p-4 text-left transition-all duration-300 shadow-sm"
                style={{
                  borderColor: isActive ? '#6366f1' : '#f3f4f6',
                  boxShadow: isActive ? `0 0 0 2px rgba(99,102,241,0.25), 0 8px 20px ${glow}` : '',
                  animation: `fadeInUp 0.45s ease-out ${i * 70}ms both`,
                  transform: isActive ? 'translateY(-2px)' : '',
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: grad }}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-gray-900">{counts[key]}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Search + Filter bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6" style={{ animation: 'fadeInUp 0.45s ease-out 360ms both' }}>
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, branch or message…"
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 text-sm bg-white/85 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="flex items-center gap-2 bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-200 px-3">
            {filterCfg.map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)}
                className="text-xs font-bold px-3 py-2 rounded-xl transition-all duration-200"
                style={filter === key ? { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff' } : { color: '#6b7280' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Requests grid ── */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-20" style={{ animation: 'fadeInUp 0.45s ease-out 400ms both' }}>
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.06))' }}>
              <FiUsers className="w-9 h-9" style={{ color: '#a5b4fc' }} />
            </div>
            <p className="text-lg font-bold text-gray-600">{filter === 'all' ? 'No requests yet' : `No ${filter} requests`}</p>
            <p className="text-sm text-gray-400 mt-1">Students will appear here when they send mentorship requests.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map((req, ri) => {
              const student = students[req.studentId];
              const cfg = statusConfig[req.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              const avatarGrad = ['linear-gradient(135deg,#4f46e5,#7c3aed)','linear-gradient(135deg,#10b981,#059669)','linear-gradient(135deg,#f59e0b,#d97706)','linear-gradient(135deg,#ec4899,#db2777)','linear-gradient(135deg,#6366f1,#8b5cf6)','linear-gradient(135deg,#0891b2,#0e7490)'][ri % 6];
              return (
                <div key={req.id} className="relative bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300"
                  style={{ animation: `fadeInUp 0.45s ease-out ${ri * 70}ms both` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform='translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow='0 20px 40px rgba(99,102,241,0.12)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform=''; (e.currentTarget as HTMLDivElement).style.boxShadow=''; }}>
                  {/* Gradient top bar */}
                  <div className="h-1" style={{ background: avatarGrad }} />
                  <div className="p-5">
                    {/* Student header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md" style={{ background: avatarGrad }}>
                        <span className="text-white text-lg font-extrabold">{(student?.name || 'S')[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-gray-900 text-base leading-tight">{student?.name || 'Student'}</h3>
                            <p className="text-xs text-gray-500">{student?.branch}{student?.year ? ` · Year ${student.year}` : ''}</p>
                          </div>
                          <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Skills */}
                    {student?.skills && student.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {student.skills.slice(0, 4).map((skill, si) => (
                          <span key={skill} className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: SKILL_COLORS[si % 5].bg, color: SKILL_COLORS[si % 5].color }}>{skill}</span>
                        ))}
                        {student.skills.length > 4 && <span className="text-xs text-gray-400">+{student.skills.length - 4}</span>}
                      </div>
                    )}

                    {/* Message */}
                    {req.message && (
                      <div className="rounded-xl p-3 mb-4 text-sm italic text-indigo-700" style={{ background: 'rgba(238,242,255,0.7)' }}>
                        "{req.message}"
                      </div>
                    )}

                    {/* Date */}
                    <p className="text-xs text-gray-400 mb-4">Requested {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</p>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      {req.status === 'pending' && (
                        <>
                          <button onClick={() => handleUpdate(req.id, 'accepted')} disabled={updatingId === req.id}
                            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white transition-all duration-200 disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 6px 16px rgba(16,185,129,0.3)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform='translateY(-1px)'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform=''}>
                            <FiCheck className="w-3.5 h-3.5" /> Accept
                          </button>
                          <button onClick={() => handleUpdate(req.id, 'rejected')} disabled={updatingId === req.id}
                            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl transition-all duration-200 disabled:opacity-50"
                            style={{ background: 'rgba(254,226,226,1)', color: '#dc2626' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(254,202,202,1)'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(254,226,226,1)'}>
                            <FiX className="w-3.5 h-3.5" /> Decline
                          </button>
                        </>
                      )}
                      <button onClick={() => setSelectedStudent(student || null)}
                        className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl transition-all duration-200"
                        style={{ background: 'rgba(249,250,251,1)', color: '#4b5563' }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(243,244,246,1)'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(249,250,251,1)'}>
                        <FiUser className="w-3.5 h-3.5" /> Profile
                      </button>
                      <button onClick={() => navigate(`/chat?userId=${req.studentId}`)}
                        className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl transition-all duration-200"
                        style={{ background: 'rgba(238,242,255,1)', color: '#4f46e5' }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(224,231,255,1)'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(238,242,255,1)'}>
                        <FiMessageCircle className="w-3.5 h-3.5" /> Chat
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── Student Profile Modal ── */}
      {selectedStudent && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedStudent(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-50 overflow-hidden rounded-2xl shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.97)', animation: 'fadeInUp 0.3s ease-out both' }}>
            {/* Cover band */}
            <div className="h-24 relative" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed,#6d28d9)' }}>
              <div className="absolute -bottom-10 left-6">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl ring-4 ring-white" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                  <span className="text-white text-3xl font-extrabold">{selectedStudent.name?.[0]?.toUpperCase()}</span>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.35)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.2)'}>
                ✕
              </button>
            </div>
            <div className="px-6 pt-14 pb-6">
              <div className="mb-4">
                <h2 className="text-xl font-extrabold text-gray-900">{selectedStudent.name}</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full capitalize" style={{ background: 'rgba(238,242,255,1)', color: '#4f46e5' }}>{selectedStudent.role}</span>
              </div>
              {selectedStudent.bio && <p className="text-sm text-gray-600 mb-4">{selectedStudent.bio}</p>}
              <div className="space-y-2 mb-4">
                {selectedStudent.branch && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(238,242,255,1)' }}>
                      <FiBriefcase className="w-3 h-3" style={{ color: '#4f46e5' }} />
                    </div>
                    {selectedStudent.branch}{selectedStudent.year ? ` · Year ${selectedStudent.year}` : ''}
                  </div>
                )}
                {selectedStudent.goals && (
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-700">Goal:</span> {selectedStudent.goals}
                  </div>
                )}
              </div>
              {selectedStudent.skills && selectedStudent.skills.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStudent.skills.map((skill, si) => (
                      <span key={skill} className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: SKILL_COLORS[si % 5].bg, color: SKILL_COLORS[si % 5].color }}>{skill}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { navigate(`/chat?userId=${selectedStudent.uid}`); setSelectedStudent(null); }}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl text-white transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 8px 20px rgba(99,102,241,0.35)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform='translateY(-2px)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform=''}>
                  <FiMessageCircle className="w-4 h-4" /> Start Chat
                </button>
                <button onClick={() => setSelectedStudent(null)}
                  className="px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200"
                  style={{ background: 'rgba(243,244,246,1)', color: '#374151' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(229,231,235,1)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(243,244,246,1)'}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MentorshipRequests;
