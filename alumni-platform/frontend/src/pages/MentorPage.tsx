import React, { useEffect, useState } from 'react';
import { mentorsAPI, aiAPI, paymentsAPI } from '../services/api';
import { User, MentorRecommendation } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  FiSearch, FiStar, FiSend, FiBriefcase, FiLinkedin,
  FiCpu, FiCalendar, FiClock, FiCheckCircle, FiX, FiAward,
  FiZap, FiRefreshCw, FiCopy, FiCheck,
} from 'react-icons/fi';

// ─── Icebreaker types ────────────────────────────────────────────────────────
interface IcebreakerMsg { tone: string; emoji: string; text: string; highlight: string; }

// ─── framer-motion variants ───────────────────────────────────────────────────
const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 340, damping: 26 } },
  exit:  { opacity: 0, scale: 0.94, y: -8, transition: { duration: 0.18 } },
};
const slideRow: Variants = {
  hidden: { opacity: 0, x: -14 },
  show: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.07, type: 'spring' as const, stiffness: 300, damping: 26 } }),
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface BookingModal { mentor: User; }
type PayStep = 'confirm' | 'processing' | 'success';

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-indigo-500 to-blue-700',
];

const SKILL_COLORS = [
  'bg-violet-100 text-violet-700 border border-violet-200',
  'bg-cyan-100 text-cyan-700 border border-cyan-200',
  'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'bg-rose-100 text-rose-700 border border-rose-200',
  'bg-amber-100 text-amber-700 border border-amber-200',
];

const SkeletonCard = () => (
  <div className="bg-white/80 rounded-2xl p-5 border border-gray-100 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 rounded-2xl skeleton shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded skeleton" />
        <div className="h-3 w-1/2 rounded skeleton" />
        <div className="h-3 w-2/3 rounded skeleton" />
      </div>
    </div>
    <div className="flex gap-1.5 mb-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-5 w-16 rounded-full skeleton" />)}
    </div>
    <div className="h-9 rounded-xl skeleton" />
  </div>
);

// ─── Component ───────────────────────────────────────────────────────────────
const MentorPage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [mentors, setMentors] = useState<User[]>([]);
  const [recommended, setRecommended] = useState<MentorRecommendation[]>([]);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [messageModal, setMessageModal] = useState<{ uid: string; name: string; mentor?: User } | null>(null);
  const [message, setMessage] = useState('');
  const [icebreakers, setIcebreakers] = useState<IcebreakerMsg[]>([]);
  const [icebreakerLoading, setIcebreakerLoading] = useState(false);
  const [selectedIcebreaker, setSelectedIcebreaker] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [bookingModal, setBookingModal] = useState<BookingModal | null>(null);
  const [payStep, setPayStep] = useState<PayStep>('confirm');
  const [bookedMentorId, setBookedMentorId] = useState<string | null>(null);
  const [mentorshipStatusByMentor, setMentorshipStatusByMentor] = useState<Record<string, 'pending' | 'accepted' | 'rejected'>>({});

  useEffect(() => { fetchMentors(); }, [search, skillFilter]);

  useEffect(() => {
    if (userProfile?.role === 'student') {
      fetchMentorshipStatuses();
    }
  }, [userProfile?.role]);

  const fetchMentors = async () => {
    setLoading(true);
    try {
      const res = await mentorsAPI.getAll({ skill: skillFilter || undefined, search: search || undefined });
      setMentors(res.data.mentors as User[]);
    } catch { } finally { setLoading(false); }
  };

  const getAIRecommendations = async () => {
    setAiLoading(true);
    try {
      const res = await aiAPI.getMentorRecommendations();
      setRecommended(res.data.recommendations as MentorRecommendation[]);
      toast.success('AI recommendations loaded!');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to get AI recommendations');
    } finally { setAiLoading(false); }
  };

  const fetchMentorshipStatuses = async () => {
    try {
      const res = await mentorsAPI.getMyRequests();
      const requests = (res.data.requests || []) as Array<{ alumniId?: string; status?: 'pending' | 'accepted' | 'rejected'; createdAt?: string }>;

      const statusMap: Record<string, 'pending' | 'accepted' | 'rejected'> = {};
      const latestByAlumni = new Map<string, { status: 'pending' | 'accepted' | 'rejected'; createdAt: string }>();

      requests.forEach((r) => {
        if (!r.alumniId || !r.status) return;
        const prev = latestByAlumni.get(r.alumniId);
        const currentCreatedAt = r.createdAt || new Date(0).toISOString();
        if (!prev || new Date(currentCreatedAt).getTime() > new Date(prev.createdAt).getTime()) {
          latestByAlumni.set(r.alumniId, { status: r.status, createdAt: currentCreatedAt });
        }
      });

      latestByAlumni.forEach((v, k) => {
        statusMap[k] = v.status;
      });

      setMentorshipStatusByMentor(statusMap);
    } catch {
      // non-blocking for UI
    }
  };

  const handleRequest = async (alumniId: string) => {
    if (!messageModal) return;
    setRequestingId(alumniId);
    try {
      await mentorsAPI.requestMentorship(alumniId, message);
      toast.success('Mentorship request sent! 🎉');
      setMessageModal(null);
      setMessage('');
      setIcebreakers([]);
      setSelectedIcebreaker(null);
      await fetchMentorshipStatuses();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to send request');
    } finally { setRequestingId(null); }
  };

  const fetchIcebreakers = async (mentor: User) => {
    setIcebreakerLoading(true);
    setIcebreakers([]);
    setSelectedIcebreaker(null);
    try {
      const res = await aiAPI.generateIcebreaker(
        userProfile?.name || '', userProfile?.skills || [], userProfile?.goals || '',
        userProfile?.branch || '', userProfile?.bio || '',
        mentor.name || '', mentor.skills || [], mentor.company || '',
        mentor.jobRole || '', mentor.bio || '',
      );
      setIcebreakers(res.data.messages || []);
    } catch {
      toast.error('Could not generate suggestions');
    } finally { setIcebreakerLoading(false); }
  };

  const applyIcebreaker = (idx: number) => {
    setMessage(icebreakers[idx].text);
    setSelectedIcebreaker(idx);
  };

  const copyIcebreaker = (idx: number) => {
    navigator.clipboard.writeText(icebreakers[idx].text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1800);
    });
  };

  const closeMessageModal = () => {
    setMessageModal(null);
    setMessage('');
    setIcebreakers([]);
    setSelectedIcebreaker(null);
  };

  const openBookingModal = (mentor: User) => { setPayStep('confirm'); setBookingModal({ mentor }); };
  const closeBookingModal = () => { if (payStep === 'processing') return; setBookingModal(null); };

  const handleConfirmPayment = async () => {
    if (!bookingModal) return;
    setPayStep('processing');
    try {
      await new Promise(resolve => setTimeout(resolve, 2500));
      await paymentsAPI.bookSession(bookingModal.mentor.uid);
      setBookedMentorId(bookingModal.mentor.uid);
      setPayStep('success');
    } catch (err) {
      toast.error((err as Error).message || 'Booking failed. Please try again.');
      setPayStep('confirm');
    }
  };

  const handleGoToChat = () => {
    const mentorId = bookedMentorId || bookingModal?.mentor.uid;
    setBookingModal(null);
    navigate(`/chat?userId=${mentorId}`);
  };

  // ── MentorCard ─────────────────────────────────────────────────────────────
  const MentorCard: React.FC<{ mentor: User; matchScore?: number; reason?: string; idx?: number }> = ({ mentor, matchScore, reason, idx = 0 }) => {
    const gradient = AVATAR_GRADIENTS[(mentor.name?.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];
    const mentorshipStatus = mentorshipStatusByMentor[mentor.uid];
    const canBookPaidSession = userProfile?.role === 'student' && mentorshipStatus === 'accepted' && Boolean(mentor.price_per_session);
    return (
      <div
        className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300"
        style={{ animation: `fadeInUp 0.45s ease-out ${Math.min(idx, 7) * 70}ms both` }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(124,58,237,0.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
      >
        {/* Top gradient bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-md`}>
              {mentor.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-gray-900 truncate text-sm">{mentor.name}</h3>
              <p className="text-xs text-gray-500 font-medium">{mentor.jobRole}</p>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                <FiBriefcase className="w-3 h-3" />
                <span className="truncate">{mentor.company}</span>
                {mentor.experience && <><span>·</span><span>{mentor.experience}y exp</span></>}
              </div>
            </div>
            {matchScore && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl border shrink-0" style={{ background: '#fefce8', borderColor: '#fde68a' }}>
                <FiStar className="w-3 h-3 text-yellow-500" />
                <span className="text-xs font-bold text-yellow-700">{matchScore}%</span>
              </div>
            )}
          </div>

          {/* AI reason */}
          {reason && (
            <div className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 mb-3 flex gap-1.5">
              <FiCpu className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{reason}</span>
            </div>
          )}

          {/* Skills */}
          {mentor.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {mentor.skills.slice(0, 4).map((s, si) => (
                <span key={s} className={`text-xs font-medium px-2 py-0.5 rounded-full ${SKILL_COLORS[si % SKILL_COLORS.length]}`}>{s}</span>
              ))}
              {mentor.skills.length > 4 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">+{mentor.skills.length - 4}</span>
              )}
            </div>
          )}

          {/* Pricing */}
          {mentor.price_per_session && (
            <div className="flex items-center gap-2 mb-3 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
              <span className="text-sm font-bold text-violet-700">₹{mentor.price_per_session}</span>
              {mentor.session_duration && (
                <><span className="text-violet-300">·</span><FiClock className="w-3 h-3 text-violet-500" /><span className="text-xs text-violet-600">{mentor.session_duration}</span></>
              )}
              {mentor.availability && (
                <><span className="text-violet-300">·</span><FiCalendar className="w-3 h-3 text-violet-500" /><span className="text-xs text-violet-600 truncate">{mentor.availability}</span></>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {canBookPaidSession ? (
              <button
                onClick={() => openBookingModal(mentor)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 10px rgba(124,58,237,0.3)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(124,58,237,0.5)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(124,58,237,0.3)'; e.currentTarget.style.transform = ''; }}
              >
                <FiCalendar className="w-3.5 h-3.5" /> Book · ₹{mentor.price_per_session}
              </button>
            ) : userProfile?.role === 'student' && mentorshipStatus === 'pending' ? (
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-100 border border-indigo-200 cursor-not-allowed"
              >
                <FiClock className="w-3.5 h-3.5" /> Request Sent
              </button>
            ) : userProfile?.role === 'student' && mentorshipStatus === 'accepted' && !mentor.price_per_session ? (
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 cursor-not-allowed"
              >
                <FiClock className="w-3.5 h-3.5" /> Accepted · Waiting for price
              </button>
            ) : userProfile?.role === 'student' && mentorshipStatus === 'rejected' ? (
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-100 border border-rose-200 cursor-not-allowed"
              >
                <FiX className="w-3.5 h-3.5" /> Request Rejected
              </button>
            ) : userProfile?.role === 'student' ? (
              <button
                onClick={() => setMessageModal({ uid: mentor.uid, name: mentor.name, mentor })}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 10px rgba(124,58,237,0.3)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(124,58,237,0.5)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(124,58,237,0.3)'; e.currentTarget.style.transform = ''; }}
              >
                <FiSend className="w-3.5 h-3.5" /> Request Mentorship
              </button>
            ) : null}
            {mentor.linkedin && (
              <a
                href={mentor.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all duration-200 border border-blue-100"
              >
                <FiLinkedin className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/20 to-indigo-50/30 relative overflow-x-hidden">
      {/* Aurora blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="aurora-blob w-[500px] h-[500px] bg-violet-300/20 -top-32 -right-32" style={{ animationDelay: '0s' }} />
        <div className="aurora-blob w-[400px] h-[400px] bg-indigo-300/20 top-1/3 -left-24" style={{ animationDelay: '5s' }} />
        <div className="aurora-blob w-[350px] h-[350px] bg-purple-300/15 bottom-0 right-1/4" style={{ animationDelay: '10s' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden mb-8" style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
          <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-8 py-10">
            <div className="absolute inset-0 opacity-10 text-[120px] flex items-center justify-end pr-8 select-none pointer-events-none">🎓</div>
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🎓</span>
                  <h1 className="text-3xl font-bold text-white">Find <span className="text-yellow-300">Mentors</span></h1>
                </div>
                <p className="text-indigo-100 text-sm mb-4">Connect with experienced alumni who can guide your career</p>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{mentors.length}</div>
                    <div className="text-xs text-indigo-200">Mentors</div>
                  </div>
                  {recommended.length > 0 && (
                    <>
                      <div className="w-px bg-white/20" />
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-300">{recommended.length}</div>
                        <div className="text-xs text-indigo-200">AI Matched</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {userProfile?.role === 'student' && (
                <button
                  onClick={getAIRecommendations}
                  disabled={aiLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 disabled:opacity-70"
                  style={{
                    background: aiLoading ? 'rgba(255,255,255,0.15)' : 'white',
                    color: aiLoading ? 'white' : '#7c3aed',
                    backdropFilter: 'blur(8px)',
                    boxShadow: aiLoading ? 'none' : '0 4px 24px rgba(0,0,0,0.15)',
                  }}
                  onMouseEnter={e => { if (!aiLoading) e.currentTarget.style.transform = 'scale(1.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {aiLoading ? (
                    <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Getting matches...</>
                  ) : (
                    <><FiCpu className="w-4 h-4" /> AI Recommendations</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6" style={{ animation: 'fadeInUp 0.5s ease-out 0.1s both' }}>
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, company, role..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-white/85 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent shadow-sm transition-all"
            />
          </div>
          <input
            type="text"
            value={skillFilter}
            onChange={e => setSkillFilter(e.target.value)}
            placeholder="Filter by skill (e.g. React)"
            className="sm:max-w-xs px-4 py-3 rounded-2xl border border-gray-200 bg-white/85 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent shadow-sm transition-all"
          />
        </div>

        {/* AI Recommendations */}
        {recommended.length > 0 && (
          <div className="mb-8" style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                <FiAward className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">AI-Matched Mentors For You</h2>
                <p className="text-xs text-gray-400">Personalized picks based on your profile</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommended.map((rec, i) => (
                <MentorCard key={rec.uid} mentor={rec.alumni} matchScore={rec.matchScore} reason={rec.reason} idx={i} />
              ))}
            </div>
          </div>
        )}

        {/* All Mentors */}
        <div>
          <div className="flex items-center gap-2 mb-4" style={{ animation: 'fadeInUp 0.5s ease-out 0.15s both' }}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
              <FiBriefcase className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">All Alumni Mentors {mentors.length > 0 && <span className="text-gray-400 font-normal text-sm">({mentors.length})</span>}</h2>
              <p className="text-xs text-gray-400">Browse and connect with experienced alumni</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : mentors.length === 0 ? (
            <div className="text-center py-20" style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                <FiBriefcase className="w-8 h-8 text-violet-400" />
              </div>
              <p className="text-gray-600 font-semibold text-lg">No mentors found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search or skill filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mentors.map((mentor, i) => (
                <MentorCard key={mentor.uid} mentor={mentor} idx={i} />
              ))}
            </div>
          )}
        </div>

        {/* ─── AI Icebreaker + Mentorship Request Modal ─────────────────── */}
        <AnimatePresence>
          {messageModal && (
            <motion.div
              key="icebreaker-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
              onClick={e => { if (e.target === e.currentTarget) closeMessageModal(); }}
            >
              <motion.div
                key="icebreaker-modal"
                variants={popIn} initial="hidden" animate="show" exit="exit"
                className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
                style={{ maxHeight: '90vh', overflowY: 'auto' }}
              >
                {/* Header */}
                <div className="relative px-5 pt-5 pb-4" style={{ background: 'linear-gradient(135deg,#6d28d9,#7c3aed,#4f46e5)' }}>
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
                    <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5" />
                  </div>
                  <div className="relative flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <FiSend className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-base">Request Mentorship</h3>
                        <p className="text-violet-200 text-xs">To <strong className="text-white">{messageModal.name}</strong></p>
                      </div>
                    </div>
                    <button onClick={closeMessageModal}
                      className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                      <FiX className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                <div className="px-5 pt-4 pb-5 space-y-4">

                  {/* AI Icebreaker panel */}
                  <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(109,40,217,0.15)', background: 'linear-gradient(135deg,rgba(109,40,217,0.04),rgba(79,70,229,0.03))' }}>
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: icebreakerLoading || icebreakers.length > 0 ? '1px solid rgba(109,40,217,0.1)' : 'none' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                          <FiZap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-800">AI Icebreaker</p>
                          <p className="text-[10px] text-gray-400">Auto-crafted from both profiles</p>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => messageModal.mentor && fetchIcebreakers(messageModal.mentor)}
                        disabled={icebreakerLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 2px 10px rgba(124,58,237,0.3)' }}
                      >
                        {icebreakerLoading
                          ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
                          : icebreakers.length > 0
                            ? <><FiRefreshCw className="w-3 h-3" /> Regenerate</>
                            : <><FiZap className="w-3 h-3" /> Suggest Message</>}
                      </motion.button>
                    </div>

                    {/* Loading shimmer */}
                    {icebreakerLoading && (
                      <div className="px-4 py-3 space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <div className="w-7 h-7 rounded-xl skeleton flex-shrink-0" />
                            <div className="flex-1 space-y-1.5 pt-1">
                              <div className="h-2.5 rounded skeleton" style={{ width: `${75 + i * 8}%` }} />
                              <div className="h-2.5 rounded skeleton w-3/5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggestion cards */}
                    {!icebreakerLoading && icebreakers.length > 0 && (
                      <motion.div
                        initial="hidden" animate="show"
                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
                        className="px-4 py-3 space-y-2"
                      >
                        {icebreakers.map((msg, i) => (
                          <motion.div
                            key={i} custom={i} variants={slideRow}
                            onClick={() => applyIcebreaker(i)}
                            className={`relative group rounded-xl p-3 cursor-pointer transition-all border ${
                              selectedIcebreaker === i
                                ? 'border-violet-300 bg-violet-50'
                                : 'border-gray-100 bg-white hover:border-violet-200 hover:bg-violet-50/40'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="text-base flex-shrink-0 mt-0.5">{msg.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                  <span className="text-[10px] font-black text-violet-600 uppercase tracking-wide">{msg.tone}</span>
                                  {msg.highlight && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-500 font-semibold">{msg.highlight}</span>
                                  )}
                                  {selectedIcebreaker === i && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-bold ml-auto">✓ Applied</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-700 leading-relaxed">{msg.text}</p>
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); copyIcebreaker(i); }}
                                className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-violet-500 hover:bg-violet-50 transition-all opacity-0 group-hover:opacity-100"
                              >
                                {copiedIdx === i ? <FiCheck className="w-3.5 h-3.5 text-emerald-500" /> : <FiCopy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </motion.div>
                        ))}
                        <p className="text-[10px] text-gray-400 text-center pt-1">Click a suggestion to use it · Edit freely below</p>
                      </motion.div>
                    )}
                  </div>

                  {/* Message textarea */}
                  <div className="relative">
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Introduce yourself and explain what you'd like to learn..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all resize-none"
                      rows={4}
                    />
                    {message && (
                      <div className="absolute bottom-2.5 right-3 text-[10px] text-gray-300 font-medium">{message.length} chars</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={closeMessageModal}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleRequest(messageModal.uid)}
                      disabled={requestingId === messageModal.uid || !message.trim()}
                      className="flex-1 py-2.5 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}
                    >
                      {requestingId === messageModal.uid
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</>
                        : <><FiSend className="w-4 h-4" /> Send Request</>}
                    </motion.button>
                  </div>

                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Payment Modal ─────────────────────────────────────────────────── */}
        {bookingModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ animation: 'fadeInUp 0.25s ease-out both' }}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

              {/* Step 1: Confirm */}
              {payStep === 'confirm' && (
                <>
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white relative">
                    <button onClick={closeBookingModal} className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                      <FiX className="w-4 h-4" />
                    </button>
                    <p className="text-violet-200 text-xs uppercase font-semibold tracking-wider mb-1">AlumniConnect · Demo Payment</p>
                    <h2 className="text-xl font-bold">Book Mentorship Session</h2>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${AVATAR_GRADIENTS[(bookingModal.mentor.name?.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length]} flex items-center justify-center text-white text-lg font-bold shrink-0`}>
                        {bookingModal.mentor.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{bookingModal.mentor.name}</p>
                        <p className="text-sm text-gray-500">{bookingModal.mentor.jobRole}{bookingModal.mentor.company ? ` · ${bookingModal.mentor.company}` : ''}</p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl p-4 mb-4 space-y-3 text-sm border border-violet-100">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 flex items-center gap-1.5"><FiClock className="w-4 h-4" /> Duration</span>
                        <span className="font-semibold text-gray-800">{bookingModal.mentor.session_duration || '60 min'}</span>
                      </div>
                      {bookingModal.mentor.availability && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 flex items-center gap-1.5"><FiCalendar className="w-4 h-4" /> Availability</span>
                          <span className="font-semibold text-gray-800">{bookingModal.mentor.availability}</span>
                        </div>
                      )}
                      <div className="border-t border-violet-200 pt-3 flex justify-between items-center">
                        <span className="font-bold text-gray-700 flex items-center gap-1.5"><span className="text-base">₹</span> Total</span>
                        <span className="text-lg font-bold text-violet-600">₹{bookingModal.mentor.price_per_session}</span>
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-700">
                      <strong>Demo Mode:</strong> This is a simulated payment. No real money will be charged.
                    </div>
                    <div className="flex gap-3">
                      <button onClick={closeBookingModal} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                      <button
                        onClick={handleConfirmPayment}
                        className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}
                      >
                        Confirm Payment
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Processing */}
              {payStep === 'processing' && (
                <div className="p-10 flex flex-col items-center text-center">
                  <div className="relative w-20 h-20 mb-5">
                    <div className="absolute inset-0 rounded-full border-4 border-violet-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-violet-600 animate-spin" />
                    <div className="absolute inset-2 rounded-full bg-violet-50 flex items-center justify-center">
                      <span className="text-2xl font-bold text-violet-500">₹</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">Processing Payment…</h3>
                  <p className="text-sm text-gray-500">Please wait, securing your session</p>
                  <div className="flex gap-1.5 mt-4">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Success */}
              {payStep === 'success' && (
                <div className="p-8 flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                      <FiCheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                    <span className="absolute inset-0 rounded-full bg-emerald-300 opacity-30 animate-ping" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Payment Successful! 🎉</h3>
                  <p className="text-sm text-gray-500 mb-2">Session with <strong>{bookingModal.mentor.name}</strong> is confirmed.</p>
                  <p className="text-lg font-bold text-emerald-600 mb-5">₹{bookingModal.mentor.price_per_session} paid</p>
                  <div className="w-full bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-left mb-5 space-y-2">
                    <div className="flex justify-between"><span className="text-gray-500">Mentor</span><span className="font-semibold">{bookingModal.mentor.name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-semibold">{bookingModal.mentor.session_duration || '60 min'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-semibold text-emerald-600">Booked ✓</span></div>
                  </div>
                  <div className="flex gap-3 w-full">
                    <button onClick={closeBookingModal} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Close</button>
                    <button
                      onClick={handleGoToChat}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-200"
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}
                    >
                      Start Chat →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorPage;
