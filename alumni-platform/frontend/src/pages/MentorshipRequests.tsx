import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mentorsAPI, usersAPI } from '../services/api';
import { MentorshipRequest, User } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  FiUsers, FiCheck, FiX, FiMessageCircle, FiUser, FiClock,
  FiCheckCircle, FiXCircle, FiSearch, FiFilter, FiBriefcase,
} from 'react-icons/fi';

type FilterStatus = 'all' | 'pending' | 'accepted' | 'rejected';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: FiClock },
  accepted: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700', icon: FiCheckCircle },
  rejected: { label: 'Declined', color: 'bg-red-100 text-red-600', icon: FiXCircle },
};

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

  if (loading) return <LoadingSpinner fullPage text="Loading requests..." />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="page-hero flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <FiUsers className="w-6 h-6 text-primary-600" />
            Student <span className="text-gradient">Mentorship Requests</span>
          </h1>
          <p className="section-subtitle">
            Review and respond to students who want your guidance
          </p>
        </div>
      </div>

      {/* Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(['all', 'pending', 'accepted', 'rejected'] as FilterStatus[]).map((s) => {
          const Icon = s === 'all' ? FiUsers : statusConfig[s].icon;
          const colorMap = {
            all: 'from-primary-500 to-violet-600',
            pending: 'from-amber-400 to-orange-500',
            accepted: 'from-emerald-500 to-teal-600',
            rejected: 'from-red-400 to-rose-500',
          };
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`card-hover text-left transition-all animate-card-reveal stagger-${(['all','pending','accepted','rejected'].indexOf(s)+1)} ${filter === s ? 'ring-2 ring-primary-500 ring-offset-1 shadow-glow' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`icon-box w-9 h-9 bg-gradient-to-br ${colorMap[s]}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-lg font-extrabold text-gray-900">{counts[s]}</p>
                  <p className="text-xs text-gray-500 capitalize">{s === 'all' ? 'Total' : s}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, branch or message..."
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <FiFilter className="w-4 h-4 text-gray-400 shrink-0" />
          {(['all', 'pending', 'accepted', 'rejected'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold capitalize transition-colors ${
                filter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Grid */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FiUsers className="w-14 h-14 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">
            {filter === 'all' ? 'No requests yet' : `No ${filter} requests found`}
          </p>
          <p className="text-sm mt-1">
            {(filter === 'all' || filter === 'pending') && 'Students will appear here when they send mentorship requests.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => {
            const student = students[req.studentId];
            const StatusIcon = statusConfig[req.status]?.icon || FiClock;

            return (
              <div key={req.id} className="card hover:shadow-md transition-shadow">
                {/* Student info */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-violet-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-white text-lg font-bold">
                      {(student?.name || 'S')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-gray-900 leading-tight">
                          {student?.name || 'Student'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {student?.branch ? `${student.branch}` : ''}
                          {student?.year ? ` · Year ${student.year}` : ''}
                        </p>
                      </div>
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${statusConfig[req.status]?.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[req.status]?.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Student skills */}
                {student?.skills && student.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {student.skills.slice(0, 4).map((skill) => (
                      <span key={skill} className="badge-blue text-xs">
                        {skill}
                      </span>
                    ))}
                    {student.skills.length > 4 && (
                      <span className="text-xs text-gray-400">+{student.skills.length - 4} more</span>
                    )}
                  </div>
                )}

                {/* Request message */}
                {req.message && (
                  <div className="bg-gray-50 rounded-xl p-3 mb-4">
                    <p className="text-sm text-gray-600 italic line-clamp-3">"{req.message}"</p>
                  </div>
                )}

                {/* Timestamp */}
                <p className="text-xs text-gray-400 mb-4">
                  Requested {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                </p>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {req.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdate(req.id, 'accepted')}
                        disabled={updatingId === req.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <FiCheck className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button
                        onClick={() => handleUpdate(req.id, 'rejected')}
                        disabled={updatingId === req.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        <FiX className="w-3.5 h-3.5" /> Decline
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setSelectedStudent(student || null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                  >
                    <FiUser className="w-3.5 h-3.5" /> Profile
                  </button>

                  <button
                    onClick={() => navigate(`/chat?userId=${req.studentId}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-xl text-sm font-semibold hover:bg-primary-200 transition-colors"
                  >
                    <FiMessageCircle className="w-3.5 h-3.5" /> Chat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Student Profile Modal */}
      {selectedStudent && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setSelectedStudent(null)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white rounded-2xl shadow-2xl z-50 animate-scale-in overflow-hidden">
            {/* Cover */}
            <div className="h-20 bg-gradient-to-r from-primary-500 to-violet-600" />
            <div className="px-6 pb-6">
              {/* Avatar */}
              <div className="-mt-10 mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white">
                  <span className="text-white text-3xl font-bold">
                    {selectedStudent.name?.[0]?.toUpperCase()}
                  </span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-900">{selectedStudent.name}</h2>
              <p className="text-sm text-gray-500 capitalize mb-4">{selectedStudent.role}</p>

              {selectedStudent.bio && (
                <p className="text-sm text-gray-600 mb-4">{selectedStudent.bio}</p>
              )}

              <div className="space-y-2 mb-4">
                {selectedStudent.branch && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiBriefcase className="w-4 h-4 text-gray-400" />
                    {selectedStudent.branch} · Year {selectedStudent.year}
                  </div>
                )}
                {selectedStudent.goals && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Goal:</span> {selectedStudent.goals}
                  </div>
                )}
              </div>

              {selectedStudent.skills && selectedStudent.skills.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStudent.skills.map((skill) => (
                      <span key={skill} className="badge-blue">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigate(`/chat?userId=${selectedStudent.uid}`);
                    setSelectedStudent(null);
                  }}
                  className="flex-1 btn-gradient flex items-center justify-center gap-2"
                >
                  <FiMessageCircle className="w-4 h-4" /> Start Chat
                </button>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
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
