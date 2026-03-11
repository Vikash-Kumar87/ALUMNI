import React, { useEffect, useState } from 'react';
import { mentorsAPI, aiAPI, paymentsAPI } from '../services/api';
import { User, MentorRecommendation } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiSearch, FiStar, FiSend, FiBriefcase, FiLinkedin,
  FiCpu, FiCalendar, FiClock, FiDollarSign, FiCheckCircle, FiX, FiAward,
} from 'react-icons/fi';

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
  const [messageModal, setMessageModal] = useState<{ uid: string; name: string } | null>(null);
  const [message, setMessage] = useState('');
  const [bookingModal, setBookingModal] = useState<BookingModal | null>(null);
  const [payStep, setPayStep] = useState<PayStep>('confirm');
  const [bookedMentorId, setBookedMentorId] = useState<string | null>(null);

  useEffect(() => { fetchMentors(); }, [search, skillFilter]);

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

  const handleRequest = async (alumniId: string) => {
    if (!messageModal) return;
    setRequestingId(alumniId);
    try {
      await mentorsAPI.requestMentorship(alumniId, message);
      toast.success('Mentorship request sent! 🎉');
      setMessageModal(null);
      setMessage('');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to send request');
    } finally { setRequestingId(null); }
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
              <FiDollarSign className="w-4 h-4 text-violet-600 shrink-0" />
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
            {userProfile?.role === 'student' && mentor.price_per_session ? (
              <button
                onClick={() => openBookingModal(mentor)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 10px rgba(124,58,237,0.3)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(124,58,237,0.5)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(124,58,237,0.3)'; e.currentTarget.style.transform = ''; }}
              >
                <FiCalendar className="w-3.5 h-3.5" /> Book · ₹{mentor.price_per_session}
              </button>
            ) : userProfile?.role === 'student' ? (
              <button
                onClick={() => setMessageModal({ uid: mentor.uid, name: mentor.name })}
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

        {/* Free Mentorship Request Modal */}
        {messageModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ animation: 'fadeInUp 0.25s ease-out both' }}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <FiSend className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Request Mentorship</h3>
                  <p className="text-xs text-gray-500">Send a message to <strong>{messageModal.name}</strong></p>
                </div>
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Introduce yourself and explain what you'd like to learn..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all resize-none mb-4"
                rows={4}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setMessageModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRequest(messageModal.uid)}
                  disabled={requestingId === messageModal.uid}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}
                >
                  {requestingId === messageModal.uid
                    ? <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"/></svg> Sending...</>
                    : <><FiSend className="w-4 h-4" /> Send Request</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}

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
                        <span className="font-bold text-gray-700 flex items-center gap-1.5"><FiDollarSign className="w-4 h-4" /> Total</span>
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
                      <FiDollarSign className="w-6 h-6 text-violet-500" />
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
