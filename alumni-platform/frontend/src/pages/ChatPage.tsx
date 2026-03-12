import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usersAPI, chatAPI, paymentsAPI, aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  FiSend, FiSearch, FiUser, FiArrowLeft, FiLock, FiCalendar, FiMessageCircle,
  FiZap, FiX, FiCheckCircle, FiBookOpen, FiExternalLink, FiClipboard, FiCheck,
} from 'react-icons/fi';

interface SessionSummary {
  title: string;
  overview: string;
  keyPoints: string[];
  actionItems: { task: string; assignedTo: string }[];
  resources: { title: string; url: string; type: string }[];
  mood: string;
  nextSteps: string;
}

const MOOD_STYLE: Record<string, { bg: string; text: string; emoji: string }> = {
  productive:       { bg: 'bg-emerald-100', text: 'text-emerald-700', emoji: '⚡' },
  exploratory:      { bg: 'bg-sky-100',     text: 'text-sky-700',     emoji: '🔭' },
  'problem-solving':{ bg: 'bg-amber-100',   text: 'text-amber-700',   emoji: '🧩' },
  motivational:     { bg: 'bg-violet-100',  text: 'text-violet-700',  emoji: '🚀' },
};
const RESOURCE_ICONS: Record<string, string> = { docs: '📄', article: '📰', video: '🎬', course: '🎓' };

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fadeUp: Variants  = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } };
import { HiAcademicCap } from 'react-icons/hi';
import { MdSchool, MdPeople } from 'react-icons/md';
import { formatDistanceToNow } from 'date-fns';

interface RealTimeMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string | null;
  text: string;
  createdAt: string;
}

interface Conversation {
  userId: string;
  displayName: string;
  photoURL?: string;
  role: 'student' | 'alumni';
}

const ChatPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<RealTimeMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [chatLocked, setChatLocked] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [lockedMentor, setLockedMentor] = useState<{ price_per_session: number; name: string; uid: string } | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);
  // Tab defaults to logged-in user's own role
  const [activeTab, setActiveTab] = useState<'alumni' | 'student'>('alumni');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchUsers();
  }, []);

  useEffect(() => {
    if (userProfile?.role) {
      setActiveTab(userProfile.role as 'alumni' | 'student');
    }
  }, [userProfile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.getAllUsers();
      const users: User[] = res.data.users;
      const filtered = users.filter(u => u.uid !== userProfile?.uid);
      setAllUsers(filtered);
      const convs: Conversation[] = filtered.map(u => ({
        userId: u.uid,
        displayName: u.name,
        photoURL: u.avatar,
        role: u.role as 'student' | 'alumni',
      }));
      setConversations(convs);

      const targetUserId = searchParams.get('userId');
      if (targetUserId) {
        const target = convs.find(c => c.userId === targetUserId);
        if (target) setTimeout(() => selectConversation(target), 0);
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatRoomId: string) => {
    try {
      const res = await chatAPI.getMessages(chatRoomId);
      const msgs: RealTimeMessage[] = res.data.messages || [];
      if (msgs.length > 0) {
        setMessages(prev => {
          const merged = [
            ...prev.filter(m => m.id.startsWith('temp_') && !msgs.some(r => r.text === m.text && r.senderId === m.senderId)),
            ...msgs,
          ];
          merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          msgs.forEach(m => knownIdsRef.current.add(m.id));
          return merged;
        });
      }
    } catch { /* silently ignore poll errors */ }
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedUser(conv);
    setMessages([]);
    setChatLocked(false);
    setLockedMentor(null);
    knownIdsRef.current = new Set();
    setMobileView('chat');

    if (userProfile?.role === 'student' && conv.role === 'alumni') {
      const alumniUser = allUsers.find(u => u.uid === conv.userId);
      if (alumniUser?.price_per_session) {
        setCheckingPayment(true);
        try {
          const checkRes = await paymentsAPI.checkSession(conv.userId);
          if (!checkRes.data.hasPaidSession) {
            setChatLocked(true);
            setLockedMentor({ price_per_session: alumniUser.price_per_session, name: conv.displayName, uid: conv.userId });
            setCheckingPayment(false);
            return;
          }
        } catch { /* fail open */ }
        setCheckingPayment(false);
      }
    }

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    const chatRoomId = [userProfile!.uid, conv.userId].sort().join('_');
    fetchMessages(chatRoomId);
    pollIntervalRef.current = setInterval(() => fetchMessages(chatRoomId), 2000);
  };

  const handleSummarize = async () => {
    if (!selectedUser || messages.length === 0) return;
    setSummary(null);
    setShowSummary(true);
    setSummaryLoading(true);
    try {
      const isMentor = selectedUser.role === 'alumni';
      const mentorName = isMentor ? selectedUser.displayName : userProfile!.name;
      const studentName = isMentor ? userProfile!.name : selectedUser.displayName;
      const msgPayload = messages
        .filter(m => !m.id.startsWith('temp_'))
        .map(m => ({ senderName: m.senderName, text: m.text }));
      const res = await aiAPI.summarizeSession(msgPayload, mentorName, studentName);
      setSummary(res.data.summary);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to summarize session');
      setShowSummary(false);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleCopySummary = async () => {
    if (!summary) return;
    const text = [
      `📋 ${summary.title}`,
      `\n${summary.overview}`,
      `\n\n✅ Key Points:\n${summary.keyPoints.map(k => `• ${k}`).join('\n')}`,
      `\n\n🎯 Action Items:\n${summary.actionItems.map(a => `• [${a.assignedTo}] ${a.task}`).join('\n')}`,
      summary.nextSteps ? `\n\n👉 Next: ${summary.nextSteps}` : '',
    ].join('');
    await navigator.clipboard.writeText(text);
    setSummaryCopied(true);
    toast.success('Summary copied!');
    setTimeout(() => setSummaryCopied(false), 2500);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !userProfile) return;
    setSendingMessage(true);
    const msgText = newMessage.trim();
    const tempId = `temp_${Date.now()}`;
    const optimistic: RealTimeMessage = {
      id: tempId, senderId: userProfile.uid, senderName: userProfile.name,
      senderPhoto: userProfile.avatar || null, text: msgText, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');
    try {
      await chatAPI.sendMessage(selectedUser.userId, msgText);
      const chatRoomId = [userProfile.uid, selectedUser.userId].sort().join('_');
      await fetchMessages(chatRoomId);
    } catch (err: unknown) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(msgText);
      const errMsg = err instanceof Error ? err.message : '';
      const isNetworkErr = errMsg.toLowerCase().includes('network') || errMsg.includes('timeout') || errMsg === '';
      toast.error(isNetworkErr ? 'Server took too long. Please try again.' : `Failed: ${errMsg}`, { duration: 5000 });
    } finally {
      setSendingMessage(false);
    }
  };

  // Separate by tab
  const alumniList = conversations.filter(c =>
    c.role === 'alumni' && c.displayName.toLowerCase().includes(search.toLowerCase())
  );
  const studentList = conversations.filter(c =>
    c.role === 'student' && c.displayName.toLowerCase().includes(search.toLowerCase())
  );
  const tabList = activeTab === 'alumni' ? alumniList : studentList;

  const alumniCount = conversations.filter(c => c.role === 'alumni').length;
  const studentCount = conversations.filter(c => c.role === 'student').length;

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-violet-200 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-4 border-t-violet-600 animate-spin" />
          <FiMessageCircle className="absolute inset-0 m-auto w-6 h-6 text-violet-600" />
        </div>
        <p className="text-gray-500 font-medium">Loading conversations...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <FiMessageCircle className="w-6 h-6 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-700 to-indigo-600 bg-clip-text text-transparent">
            Messages
          </h1>
          <p className="text-gray-500 text-sm">Connect and chat with alumni and students</p>
        </div>
        <div className="ml-auto hidden sm:flex gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold border border-violet-100">
            <HiAcademicCap className="w-3.5 h-3.5" />
            {alumniCount} Alumni
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100">
            <MdSchool className="w-3.5 h-3.5" />
            {studentCount} Students
          </span>
        </div>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden flex h-[72vh] min-h-[420px] shadow-xl shadow-gray-100/60 bg-white">

        {/* ── SIDEBAR ── */}
        <div className={`${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex w-full md:w-80 border-r border-gray-100 flex-col flex-shrink-0 bg-gradient-to-b from-slate-50 to-white`}>

          {/* Sidebar header with tabs */}
          <div className="p-4 border-b border-gray-100">
            {/* Search */}
            <div className="relative mb-3">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search people..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all placeholder-gray-400"
              />
            </div>

            {/* Role Tabs */}
            <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
              <button
                onClick={() => setActiveTab('alumni')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'alumni'
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-200 scale-[1.02]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/70'
                }`}
              >
                <HiAcademicCap className="w-4 h-4" />
                Alumni
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'alumni' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                }`}>{alumniCount}</span>
              </button>
              <button
                onClick={() => setActiveTab('student')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'student'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-200 scale-[1.02]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/70'
                }`}
              >
                <MdSchool className="w-4 h-4" />
                Students
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'student' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                }`}>{studentCount}</span>
              </button>
            </div>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {tabList.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <MdPeople className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm font-medium">No {activeTab === 'alumni' ? 'alumni' : 'students'} found</p>
                <p className="text-gray-400 text-xs mt-1">Try a different search</p>
              </div>
            ) : (
              tabList.map((conv, idx) => {
                const isSelected = selectedUser?.userId === conv.userId;
                const isAlumni = conv.role === 'alumni';
                return (
                  <button
                    key={conv.userId}
                    onClick={() => selectConversation(conv)}
                    style={{ animationDelay: `${idx * 40}ms` }}
                    className={`w-full text-left px-3 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 group animate-fade-in ${
                      isSelected
                        ? isAlumni
                          ? 'bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 shadow-sm'
                          : 'bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 shadow-sm'
                        : 'hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {conv.photoURL ? (
                        <img src={conv.photoURL} alt={conv.displayName} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ring-2 ring-white ${
                          isAlumni
                            ? 'bg-gradient-to-br from-violet-400 to-purple-500'
                            : 'bg-gradient-to-br from-indigo-400 to-blue-500'
                        }`}>
                          <span className="text-white font-bold text-sm">
                            {conv.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {/* Online dot */}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        isAlumni ? 'bg-violet-400' : 'bg-indigo-400'
                      }`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate transition-colors ${
                        isSelected ? (isAlumni ? 'text-violet-800' : 'text-indigo-800') : 'text-gray-800 group-hover:text-gray-900'
                      }`}>{conv.displayName}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isAlumni ? (
                          <HiAcademicCap className="w-3 h-3 text-violet-500 flex-shrink-0" />
                        ) : (
                          <MdSchool className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                        )}
                        <p className={`text-xs font-medium ${isAlumni ? 'text-violet-600' : 'text-indigo-600'}`}>
                          {isAlumni ? 'Alumni' : 'Student'}
                        </p>
                      </div>
                    </div>

                    {/* Arrow on hover */}
                    <div className={`transition-all duration-200 ${isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isAlumni ? 'bg-violet-500' : 'bg-indigo-500'}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── CHAT AREA ── */}
        <div className={`flex-1 flex flex-col overflow-hidden ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>

          {/* No user selected */}
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
              <div className="text-center px-6">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mx-auto">
                    <FiMessageCircle className="w-10 h-10 text-violet-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✨</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Select a Conversation</h3>
                <p className="text-gray-500 text-sm max-w-xs">
                  Choose an <span className="text-violet-600 font-semibold">alumni</span> or <span className="text-indigo-600 font-semibold">student</span> from the list to start chatting
                </p>
                <div className="flex gap-2 justify-center mt-4">
                  <span className="px-3 py-1 bg-violet-50 text-violet-600 rounded-full text-xs font-medium border border-violet-100">🎓 Alumni</span>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium border border-indigo-100">📚 Students</span>
                </div>
              </div>
            </div>

          /* Checking payment */
          ) : checkingPayment ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
              <div className="text-center">
                <div className="relative w-14 h-14 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-violet-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-violet-600 animate-spin" />
                </div>
                <p className="text-gray-600 font-medium">Checking access...</p>
                <p className="text-gray-400 text-sm mt-1">Verifying session booking</p>
              </div>
            </div>

          /* Chat locked */
          ) : chatLocked && lockedMentor ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white p-6">
              <div className="text-center max-w-sm">
                <div className="relative inline-block mb-5">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
                    <FiLock className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
                    <span className="text-white text-xs">!</span>
                  </div>
                </div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">Session Booking Required</h3>
                <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                  <strong className="text-gray-700">{lockedMentor.name}</strong> requires a booked session before you can message them.
                </p>
                <a
                  href="/mentors"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <FiCalendar className="w-4 h-4" />
                  Book Session · ₹{lockedMentor.price_per_session}
                </a>
              </div>
            </div>

          /* Active chat */
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-white relative">

              {/* Chat header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white/80 backdrop-blur-sm">
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden flex-shrink-0 p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <FiArrowLeft className="w-4 h-4" />
                </button>
                {selectedUser!.photoURL ? (
                  <img src={selectedUser!.photoURL} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-100" />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedUser!.role === 'alumni'
                      ? 'bg-gradient-to-br from-violet-400 to-purple-500'
                      : 'bg-gradient-to-br from-indigo-400 to-blue-500'
                  }`}>
                    <span className="text-white font-bold">{selectedUser!.displayName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-bold text-sm text-gray-900">{selectedUser!.displayName}</p>
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${selectedUser!.role === 'alumni' ? 'bg-violet-500' : 'bg-indigo-500'}`} />
                    <p className={`text-xs font-medium ${selectedUser!.role === 'alumni' ? 'text-violet-600' : 'text-indigo-600'}`}>
                      {selectedUser!.role === 'alumni' ? '🎓 Alumni' : '📚 Student'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {messages.length >= 2 && (
                    <motion.button
                      onClick={handleSummarize}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all"
                      style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 2px 10px rgba(139,92,246,0.4)' }}
                    >
                      <FiZap className="w-3 h-3" />
                      <span className="hidden sm:inline">Summarize</span>
                    </motion.button>
                  )}
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs text-green-600 font-medium">Active</span>
                  </div>
                </div>
              </div>

              {/* ── SESSION SUMMARY MODAL ── */}
              <AnimatePresence>
                {showSummary && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex items-start justify-end p-3"
                    style={{ background: 'rgba(15,10,40,0.45)', backdropFilter: 'blur(4px)' }}
                    onClick={e => { if (e.target === e.currentTarget) setShowSummary(false); }}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: 60, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 60, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                      className="w-full max-w-sm h-full overflow-y-auto rounded-2xl shadow-2xl flex flex-col"
                      style={{ background: 'linear-gradient(160deg,#faf5ff,#eef2ff,#f0fdf4)' }}
                    >
                      {/* Modal header */}
                      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-violet-100 sticky top-0 z-10" style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(99,102,241,0.07))' }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 2px 10px rgba(139,92,246,0.4)' }}>
                          <FiZap className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-violet-800">AI Session Summary</p>
                          <p className="text-[10px] text-violet-400 truncate">{selectedUser!.displayName} · {messages.filter(m=>!m.id.startsWith('temp_')).length} messages</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {summary && (
                            <motion.button onClick={handleCopySummary} whileTap={{ scale: 0.9 }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                              style={{ background: summaryCopied ? '#dcfce7' : '#ede9fe' }}
                            >
                              {summaryCopied ? <FiCheck className="w-3.5 h-3.5 text-emerald-600" /> : <FiClipboard className="w-3.5 h-3.5 text-violet-600" />}
                            </motion.button>
                          )}
                          <button onClick={() => setShowSummary(false)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                            <FiX className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                        </div>
                      </div>

                      {/* Loading state */}
                      {summaryLoading && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-10 px-4">
                          <div className="relative w-14 h-14">
                            <motion.div className="absolute inset-0 rounded-full border-2 border-violet-200"
                              animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            />
                            <motion.div className="absolute inset-1 rounded-full border-2 border-t-violet-500 border-transparent"
                              animate={{ rotate: -360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                            />
                            <FiZap className="absolute inset-0 m-auto w-5 h-5 text-violet-600" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-violet-800">Analyzing session…</p>
                            <p className="text-xs text-violet-400 mt-1">Extracting insights & action items</p>
                          </div>
                          <div className="w-full space-y-2 px-2">
                            {[0.9,0.7,0.8,0.6].map((w,i)=>(
                              <div key={i} className="h-3 rounded-full skeleton" style={{ width:`${w*100}%` }} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary content */}
                      {summary && !summaryLoading && (
                        <motion.div variants={stagger} initial="hidden" animate="show" className="flex-1 px-4 py-3 space-y-4">

                          {/* Title + mood */}
                          <motion.div variants={fadeUp}>
                            <h3 className="font-black text-gray-900 text-sm leading-snug mb-1.5">{summary.title}</h3>
                            {summary.mood && (() => { const m = MOOD_STYLE[summary.mood] ?? MOOD_STYLE.productive; return (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${m.bg} ${m.text}`}>
                                {m.emoji} {summary.mood.replace('-',' ')}
                              </span>
                            ); })()}
                          </motion.div>

                          {/* Overview */}
                          <motion.div variants={fadeUp} className="bg-white/70 rounded-xl p-3 border border-violet-100">
                            <p className="text-xs text-gray-700 leading-relaxed">{summary.overview}</p>
                          </motion.div>

                          {/* Key points */}
                          {summary.keyPoints?.length > 0 && (
                            <motion.div variants={fadeUp}>
                              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-2">Key Discussion Points</p>
                              <motion.ul variants={stagger} initial="hidden" animate="show" className="space-y-1.5">
                                {summary.keyPoints.map((kp, i) => (
                                  <motion.li key={i} variants={fadeUp} className="flex items-start gap-2 text-xs text-gray-700">
                                    <FiCheckCircle className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />{kp}
                                  </motion.li>
                                ))}
                              </motion.ul>
                            </motion.div>
                          )}

                          {/* Action items */}
                          {summary.actionItems?.length > 0 && (
                            <motion.div variants={fadeUp}>
                              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Action Items</p>
                              <div className="space-y-2">
                                {summary.actionItems.map((item, i) => (
                                  <motion.div key={i} variants={fadeUp}
                                    className="flex items-start gap-2.5 bg-white/70 rounded-xl px-3 py-2.5 border border-indigo-100"
                                  >
                                    <div className="w-5 h-5 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <span className="text-[9px] font-black text-indigo-600">{i+1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-800 leading-snug">{item.task}</p>
                                      <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">→ {item.assignedTo}</p>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {/* Resources */}
                          {summary.resources?.length > 0 && (
                            <motion.div variants={fadeUp}>
                              <div className="flex items-center gap-1.5 mb-2">
                                <FiBookOpen className="w-3.5 h-3.5 text-emerald-500" />
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Resources</p>
                              </div>
                              <div className="space-y-1.5">
                                {summary.resources.map((r, i) => (
                                  <motion.a key={i} variants={fadeUp}
                                    href={r.url} target="_blank" rel="noopener noreferrer"
                                    whileHover={{ x: 3 }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-emerald-700 group transition-all"
                                    style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}
                                  >
                                    <span>{RESOURCE_ICONS[r.type] ?? '🔗'}</span>
                                    <span className="flex-1 truncate">{r.title}</span>
                                    <FiExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                  </motion.a>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {/* Next steps */}
                          {summary.nextSteps && (
                            <motion.div variants={fadeUp}
                              className="flex items-start gap-2.5 rounded-xl px-3 py-3"
                              style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.1),rgba(245,158,11,0.07))', border: '1px solid rgba(251,191,36,0.3)' }}
                            >
                              <span className="text-base flex-shrink-0">👉</span>
                              <div>
                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">Next Focus</p>
                                <p className="text-xs text-gray-700 leading-relaxed">{summary.nextSteps}</p>
                              </div>
                            </motion.div>
                          )}

                          <div className="h-2" />
                        </motion.div>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                style={{ background: 'linear-gradient(180deg, #f8f9ff 0%, #f0f2ff 50%, #f8f9ff 100%)' }}>
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-3 border border-gray-100">
                      <span className="text-2xl">👋</span>
                    </div>
                    <p className="text-gray-500 font-medium text-sm">No messages yet</p>
                    <p className="text-gray-400 text-xs mt-1">Say hello to {selectedUser!.displayName}!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isOwn = msg.senderId === userProfile?.uid;
                    const showAvatar = !isOwn && (idx === 0 || messages[idx - 1]?.senderId !== msg.senderId);
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 animate-fade-in ${isOwn ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar spacer / real avatar */}
                        {!isOwn ? (
                          <div className="w-7 h-7 flex-shrink-0">
                            {showAvatar && (
                              msg.senderPhoto ? (
                                <img src={msg.senderPhoto} alt="" className="w-7 h-7 rounded-full object-cover" />
                              ) : (
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                  selectedUser!.role === 'alumni'
                                    ? 'bg-gradient-to-br from-violet-400 to-purple-500'
                                    : 'bg-gradient-to-br from-indigo-400 to-blue-500'
                                }`}>
                                  {msg.senderName.charAt(0).toUpperCase()}
                                </div>
                              )
                            )}
                          </div>
                        ) : null}

                        <div className={`max-w-[75%] sm:max-w-xs lg:max-w-sm flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-all ${
                            isOwn
                              ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm shadow-lg shadow-violet-200/50'
                              : 'bg-white text-gray-800 shadow-sm rounded-bl-sm border border-gray-100'
                          } ${msg.id.startsWith('temp_') ? 'opacity-70' : 'opacity-100'}`}>
                            {msg.text}
                          </div>
                          <p className="text-[10px] text-gray-400 px-1">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2 items-center">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder={`Message ${selectedUser!.displayName}...`}
                    disabled={sendingMessage}
                    className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent focus:bg-white transition-all placeholder-gray-400 pr-4"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingMessage || !newMessage.trim()}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none flex-shrink-0"
                >
                  {sendingMessage ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiSend className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
