import React, { useEffect, useRef, useState } from 'react';
import { mentorsAPI, aiAPI, paymentsAPI } from '../services/api';
import { User, MentorRecommendation } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  FiSearch, FiStar, FiSend, FiBriefcase, FiLinkedin,
  FiCpu, FiCalendar, FiClock, FiDollarSign, FiCheckCircle, FiX,
} from 'react-icons/fi';

// ─── Types ───────────────────────────────────────────────────────────────────
interface BookingModal {
  mentor: User;
}
type PayStep = 'confirm' | 'processing' | 'success';

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

  // Mock payment state
  const [bookingModal, setBookingModal] = useState<BookingModal | null>(null);
  const [payStep, setPayStep] = useState<PayStep>('confirm');
  const [bookedMentorId, setBookedMentorId] = useState<string | null>(null);

  useEffect(() => { fetchMentors(); }, [search, skillFilter]);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
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
    }, 50);
    return () => clearTimeout(timer);
  }, [loading, mentors, recommended]);

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
    } finally {
      setAiLoading(false);
    }
  };

  const handleRequest = async (alumniId: string) => {
    if (!messageModal) return;
    setRequestingId(alumniId);
    try {
      await mentorsAPI.requestMentorship(alumniId, message);
      toast.success('Mentorship request sent!');
      setMessageModal(null);
      setMessage('');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to send request');
    } finally {
      setRequestingId(null);
    }
  };

  // ── Mock payment flow ──────────────────────────────────────────────────────
  const openBookingModal = (mentor: User) => {
    setPayStep('confirm');
    setBookingModal({ mentor });
  };

  const closeBookingModal = () => {
    if (payStep === 'processing') return; // don't allow closing while processing
    setBookingModal(null);
  };

  const handleConfirmPayment = async () => {
    if (!bookingModal) return;
    setPayStep('processing');
    try {
      // Simulate processing delay of 2.5 seconds
      await new Promise(resolve => setTimeout(resolve, 2500));
      // Create session in Firestore via backend
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
  const MentorCard: React.FC<{ mentor: User; matchScore?: number; reason?: string }> = ({ mentor, matchScore, reason }) => (
    <div className="card card-hover-glow card-spotlight">
      <div className="flex items-start gap-3 mb-3">
        <div className="icon-box w-12 h-12 bg-gradient-to-br from-primary-500 to-violet-600 text-lg font-bold flex-shrink-0">
          <span className="text-white">{mentor.name?.[0]?.toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{mentor.name}</h3>
          <p className="text-sm text-gray-500">{mentor.jobRole}</p>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <FiBriefcase className="w-3 h-3" />
            <span>{mentor.company}</span>
            {mentor.experience && <><span>·</span><span>{mentor.experience}y exp</span></>}
          </div>
        </div>
        {matchScore && (
          <div className="flex items-center gap-1 bg-yellow-50 px-2.5 py-1 rounded-xl border border-yellow-100 animate-pop">
            <FiStar className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs font-bold text-yellow-700">{matchScore}%</span>
          </div>
        )}
      </div>

      {reason && (
        <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded-lg mb-3">{reason}</p>
      )}

      {mentor.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {mentor.skills.slice(0, 4).map(s => (
            <span key={s} className="badge-green">{s}</span>
          ))}
          {mentor.skills.length > 4 && (
            <span className="badge bg-gray-100 text-gray-600">+{mentor.skills.length - 4}</span>
          )}
        </div>
      )}

      {/* Pricing badge */}
      {mentor.price_per_session && (
        <div className="flex items-center gap-2 mb-3 bg-violet-50 rounded-lg p-2 border border-violet-100">
          <FiDollarSign className="w-4 h-4 text-violet-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-violet-700">₹{mentor.price_per_session}</span>
          {mentor.session_duration && (
            <>
              <span className="text-violet-300">·</span>
              <FiClock className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs text-violet-600">{mentor.session_duration}</span>
            </>
          )}
          {mentor.availability && (
            <>
              <span className="text-violet-300">·</span>
              <FiCalendar className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs text-violet-600 truncate">{mentor.availability}</span>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {userProfile?.role === 'student' && mentor.price_per_session ? (
          <button
            onClick={() => openBookingModal(mentor)}
            className="btn-primary flex items-center gap-1.5 text-sm flex-1 justify-center"
          >
            <FiCalendar className="w-3.5 h-3.5" />
            Book Session · ₹{mentor.price_per_session}
          </button>
        ) : userProfile?.role === 'student' ? (
          <button
            onClick={() => setMessageModal({ uid: mentor.uid, name: mentor.name })}
            className="btn-primary flex items-center gap-1.5 text-sm flex-1 justify-center"
          >
            <FiSend className="w-3.5 h-3.5" /> Request Mentorship
          </button>
        ) : null}
        {mentor.linkedin && (
          <a
            href={mentor.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-1.5 text-sm px-3"
          >
            <FiLinkedin className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <div className="page-hero flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title">Find <span className="text-gradient">Mentors</span></h1>
          <p className="section-subtitle">Connect with experienced alumni who can guide your career</p>
        </div>
        {userProfile?.role === 'student' && (
          <button onClick={getAIRecommendations} disabled={aiLoading} className="btn-primary flex items-center gap-2 shrink-0">
            <FiCpu className="w-4 h-4" />
            {aiLoading ? 'Getting AI matches...' : 'AI Recommendations'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, company, role..."
            className="input input-glow pl-10"
          />
        </div>
        <input
          type="text"
          value={skillFilter}
          onChange={e => setSkillFilter(e.target.value)}
          placeholder="Filter by skill (e.g. React)"
          className="input input-glow sm:max-w-xs"
        />
      </div>

      {/* AI Recommendations */}
      {recommended.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="icon-box w-9 h-9 bg-gradient-to-br from-primary-500 to-violet-600">
              <FiCpu className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-bold text-lg text-gray-900">AI-Matched Mentors For You</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommended.map((rec, i) => (
              <div key={rec.uid} className="animate-on-scroll" style={{ transitionDelay: `${Math.min(i, 7) * 100}ms` }}>
                <MentorCard mentor={rec.alumni} matchScore={rec.matchScore} reason={rec.reason} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Mentors */}
      <div>
        <h2 className="font-bold text-lg text-gray-900 mb-4">
          All Alumni Mentors {mentors.length > 0 && <span className="text-gray-500 font-normal text-sm">({mentors.length})</span>}
        </h2>
        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : mentors.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FiBriefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No mentors found. Try adjusting your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mentors.map((mentor, i) => (
              <div key={mentor.uid} className="animate-on-scroll" style={{ transitionDelay: `${Math.min(i, 7) * 80}ms` }}>
                <MentorCard mentor={mentor} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Free Mentorship Request Modal */}
      {messageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg mb-2">Request Mentorship</h3>
            <p className="text-gray-500 text-sm mb-4">Send a message to <strong>{messageModal.name}</strong></p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Introduce yourself and explain what you'd like to learn..."
              className="input mb-4"
              rows={4}
            />
            <div className="flex gap-3">
              <button onClick={() => setMessageModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => handleRequest(messageModal.uid)}
                disabled={requestingId === messageModal.uid}
                className="btn-primary flex-1"
              >
                {requestingId === messageModal.uid ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mock Payment Modal ─────────────────────────────────────────────── */}
      {bookingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

            {/* ── Step 1: Confirm ── */}
            {payStep === 'confirm' && (
              <>
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-primary-600 p-5 text-white relative">
                  <button
                    onClick={closeBookingModal}
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                  <p className="text-violet-200 text-xs uppercase font-semibold tracking-wider mb-1">AlumniConnect · Demo Payment</p>
                  <h2 className="text-xl font-bold">Book Mentorship Session</h2>
                </div>

                {/* Body */}
                <div className="p-6">
                  {/* Mentor info */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {bookingModal.mentor.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{bookingModal.mentor.name}</p>
                      <p className="text-sm text-gray-500">{bookingModal.mentor.jobRole} {bookingModal.mentor.company ? `· ${bookingModal.mentor.company}` : ''}</p>
                    </div>
                  </div>

                  {/* Order summary */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 flex items-center gap-1.5"><FiClock className="w-4 h-4" /> Session Duration</span>
                      <span className="font-medium text-gray-800">{bookingModal.mentor.session_duration || '60 min'}</span>
                    </div>
                    {bookingModal.mentor.availability && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 flex items-center gap-1.5"><FiCalendar className="w-4 h-4" /> Availability</span>
                        <span className="font-medium text-gray-800">{bookingModal.mentor.availability}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                      <span className="font-semibold text-gray-700 flex items-center gap-1.5"><FiDollarSign className="w-4 h-4" /> Total Amount</span>
                      <span className="text-lg font-bold text-violet-600">₹{bookingModal.mentor.price_per_session}</span>
                    </div>
                  </div>

                  {/* Demo notice */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-xs text-amber-700">
                    <strong>Demo Mode:</strong> This is a simulated payment for demonstration purposes. No real money will be charged.
                  </div>

                  <div className="flex gap-3">
                    <button onClick={closeBookingModal} className="btn-secondary flex-1">Cancel</button>
                    <button
                      onClick={handleConfirmPayment}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      Confirm Payment
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Step 2: Processing ── */}
            {payStep === 'processing' && (
              <div className="p-10 flex flex-col items-center text-center">
                {/* Animated ring */}
                <div className="relative w-20 h-20 mb-5">
                  <div className="absolute inset-0 rounded-full border-4 border-violet-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-violet-600 animate-spin" />
                  <div className="absolute inset-2 rounded-full bg-violet-50 flex items-center justify-center">
                    <FiDollarSign className="w-6 h-6 text-violet-500" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Processing Payment…</h3>
                <p className="text-sm text-gray-500">Please wait, securing your session</p>
                {/* Progress dots */}
                <div className="flex gap-1.5 mt-4">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 3: Success ── */}
            {payStep === 'success' && (
              <div className="p-8 flex flex-col items-center text-center">
                {/* Success icon with pulse */}
                <div className="relative mb-5">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <FiCheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <span className="absolute inset-0 rounded-full bg-green-300 opacity-30 animate-ping" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Payment Successful!</h3>
                <p className="text-sm text-gray-500 mb-2">
                  Your session with <strong>{bookingModal.mentor.name}</strong> is confirmed.
                </p>
                <p className="text-lg font-bold text-green-600 mb-5">₹{bookingModal.mentor.price_per_session} paid</p>

                {/* Session details */}
                <div className="w-full bg-green-50 rounded-xl p-4 text-sm text-left mb-6 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mentor</span>
                    <span className="font-medium">{bookingModal.mentor.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-medium">{bookingModal.mentor.session_duration || '60 min'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className="font-medium text-green-600">Booked ✓</span>
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  <button onClick={closeBookingModal} className="btn-secondary flex-1 text-sm">Close</button>
                  <button onClick={handleGoToChat} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5">
                    Start Chat →
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default MentorPage;

