import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';
import { Notification, NotificationType } from '../../types';
import {
  FiHome, FiUsers, FiMessageSquare, FiBriefcase, FiCpu,
  FiMessageCircle, FiMenu, FiX, FiBell, FiLogOut, FiUser, FiShield, FiAward,
  FiCheck, FiMap, FiUserCheck, FiUserPlus, FiCheckCircle, FiXCircle,
  FiZap, FiMail, FiFileText, FiEdit2, FiBarChart2, FiTarget, FiStar, FiChevronDown, FiCalendar,
  FiVideo, FiClock
} from 'react-icons/fi';

/* ── Notification type config ── */
const NOTIF_CONFIG: Record<NotificationType, { icon: React.ElementType; grad: string; bg: string; label: string }> = {
  mentorship_request:  { icon: FiUserPlus,    grad: 'linear-gradient(135deg,#6366f1,#7c3aed)', bg: 'rgba(238,242,255,0.9)', label: 'Mentorship Request' },
  mentorship_accepted: { icon: FiCheckCircle, grad: 'linear-gradient(135deg,#10b981,#059669)', bg: 'rgba(236,253,245,0.9)', label: 'Request Accepted' },
  mentorship_rejected: { icon: FiXCircle,     grad: 'linear-gradient(135deg,#f43f5e,#e11d48)', bg: 'rgba(255,241,242,0.9)', label: 'Request Rejected' },
  new_job:             { icon: FiBriefcase,   grad: 'linear-gradient(135deg,#f59e0b,#d97706)', bg: 'rgba(255,251,235,0.9)', label: 'New Job' },
  discussion_answer:   { icon: FiMessageSquare, grad: 'linear-gradient(135deg,#8b5cf6,#a855f7)', bg: 'rgba(245,243,255,0.9)', label: 'New Answer' },
  message:             { icon: FiMail,        grad: 'linear-gradient(135deg,#06b6d4,#0891b2)', bg: 'rgba(236,254,255,0.9)', label: 'New Message' },
  video_call:          { icon: FiVideo,       grad: 'linear-gradient(135deg,#22c55e,#16a34a)', bg: 'rgba(240,253,244,0.9)', label: 'Video Call' },
  event_created:       { icon: FiCalendar,    grad: 'linear-gradient(135deg,#6366f1,#7c3aed)', bg: 'rgba(238,242,255,0.9)', label: 'New Event' },
  event_reminder:      { icon: FiClock,       grad: 'linear-gradient(135deg,#f59e0b,#d97706)', bg: 'rgba(255,251,235,0.9)', label: 'Event Reminder' },
  event_cancelled:     { icon: FiXCircle,     grad: 'linear-gradient(135deg,#f43f5e,#e11d48)', bg: 'rgba(255,241,242,0.9)', label: 'Event Cancelled' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const Navbar: React.FC = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await notificationsAPI.getAll();
      const data: Notification[] = res.data.notifications || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch {
      // silent: notifications are non-critical
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotifClick = async (n: Notification) => {
    if (!n.read) {
      await notificationsAPI.markRead(n.id).catch(() => {});
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (n.link) {
      navigate(n.link);
      setNotifOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    await notificationsAPI.markAllRead().catch(() => {});
    setNotifications(prev => prev.map(x => ({ ...x, read: true })));
    setUnreadCount(0);
  };

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = userProfile?.role === 'alumni'
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: FiHome },
        { to: '/mentorship-requests', label: 'Students', icon: FiUserCheck },
        { to: '/events', label: 'Events', icon: FiCalendar },
        { to: '/forum', label: 'Forum', icon: FiMessageSquare },
        { to: '/jobs', label: 'Post Jobs', icon: FiBriefcase },
        { to: '/success-story', label: 'My Story', icon: FiStar },
        { to: '/chat', label: 'Messages', icon: FiMessageCircle },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: FiHome },
        { to: '/mentors', label: 'Mentors', icon: FiUsers },
        { to: '/events', label: 'Events', icon: FiCalendar },
        { to: '/forum', label: 'Forum', icon: FiMessageSquare },
        { to: '/jobs', label: 'Jobs', icon: FiBriefcase },
        { to: '/chat', label: 'Messages', icon: FiMessageCircle },
      ];

  const aiToolLinks = [
    { to: '/roadmap', label: 'Roadmap', icon: FiMap },
    { to: '/interview', label: 'Interview', icon: FiCpu },
    { to: '/chatbot', label: 'AI Chat', icon: FiMessageCircle },
    { to: '/resume', label: 'Resume AI', icon: FiFileText },
    { to: '/cover-letter', label: 'Cover Letter', icon: FiEdit2 },
    { to: '/weekly-report', label: 'Weekly AI', icon: FiBarChart2 },
    { to: '/skill-gap', label: 'Skill Gap', icon: FiTarget },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <>
      <nav className={`sticky top-0 z-50 transition-all duration-400 relative ${
        scrolled
          ? 'bg-indigo-950/95 backdrop-blur-2xl shadow-soft border-b border-white/10'
          : 'bg-gradient-to-r from-indigo-950 to-violet-950 backdrop-blur-md border-b border-white/10'
      }`}>
        {/* Animated gradient bottom border */}
        <div className="navbar-color-line" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center shadow-glow transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-md animate-breathe">
                <FiAward className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold hidden sm:block tracking-tight text-white">AlumniConnect</span>
            </Link>

            {/* Desktop nav */}
            {currentUser && (
              <div className="hidden md:flex items-center gap-0.5 flex-1 mx-6">
                {navLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap relative ${
                      isActive(to)
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive(to) ? 'scale-110 text-indigo-600' : ''}`} />
                    <span className="hidden lg:block">{label}</span>
                    {isActive(to) && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }} />
                    )}
                  </Link>
                ))}

                {/* AI Tools dropdown — students only */}
                {userProfile?.role === 'student' && (
                  <div className="relative" ref={toolsRef}>
                    <button
                      onClick={() => setToolsOpen(!toolsOpen)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap relative ${
                        aiToolLinks.some(l => isActive(l.to))
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <FiZap className="w-4 h-4" />
                      <span className="hidden lg:block">AI Tools</span>
                      <FiChevronDown className={`w-3 h-3 transition-transform duration-200 ${toolsOpen ? 'rotate-180' : ''}`} />
                      {aiToolLinks.some(l => isActive(l.to)) && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }} />
                      )}
                    </button>

                    {toolsOpen && (
                      <div
                        className="absolute left-0 top-full mt-2 w-52 rounded-2xl shadow-2xl border border-white/20 py-2 z-50 overflow-hidden"
                        style={{ background: 'rgba(30,27,75,0.97)', backdropFilter: 'blur(20px)', animation: 'fadeInUp 0.18s ease-out both' }}
                      >
                        {aiToolLinks.map(({ to, label, icon: Icon }) => (
                          <Link
                            key={to}
                            to={to}
                            onClick={() => setToolsOpen(false)}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                              isActive(to) ? 'text-white bg-white/15' : 'text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            {label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {userProfile?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive('/admin') ? 'bg-rose-500/20 text-rose-400' : 'text-white/70 hover:bg-rose-500/20 hover:text-rose-400'
                    }`}
                  >
                    <FiShield className="w-4 h-4" />
                    <span className="hidden lg:block">Admin</span>
                  </Link>
                )}
              </div>
            )}

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
              {currentUser ? (
                <>
                  {/* Notification bell */}
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={() => setNotifOpen(!notifOpen)}
                      className={`relative p-2 rounded-xl transition-all duration-200 ${
                        notifOpen ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                      aria-label="Notifications"
                    >
                      <FiBell className={`w-5 h-5 transition-transform duration-200 ${unreadCount > 0 ? 'animate-wiggle' : ''}`} />
                      {unreadCount > 0 && (
                        <>
                          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center z-10">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-400 rounded-full animate-ping opacity-60" />
                        </>
                      )}
                    </button>

                    {notifOpen && (
                      <div className="fixed sm:absolute left-2 right-2 top-16 w-auto sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 rounded-2xl shadow-2xl border border-white/20 z-50 overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', animation: 'fadeInUp 0.2s ease-out both' }}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/80"
                          style={{ background: 'linear-gradient(135deg,rgba(79,70,229,0.06),rgba(124,58,237,0.04))' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                              <FiBell className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-sm font-bold text-gray-900">Notifications</span>
                            {unreadCount > 0 && (
                              <span className="ml-1 text-xs font-bold text-white px-2 py-0.5 rounded-full"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                                {unreadCount} new
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllRead}
                              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
                              style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.18)'}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.1)'}
                            >
                              <FiCheck className="w-3 h-3" /> Mark all read
                            </button>
                          )}
                        </div>

                        {/* List */}
                        <div className="max-h-[420px] overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="py-14 flex flex-col items-center gap-3 text-gray-400"
                              style={{ animation: 'fadeInUp 0.3s ease-out both' }}>
                              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.06))' }}>
                                <FiBell className="w-7 h-7 text-indigo-300" />
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-semibold text-gray-500">You're all caught up!</p>
                                <p className="text-xs text-gray-400 mt-1">No notifications yet</p>
                              </div>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-50">
                              {notifications.map((n, i) => {
                                const cfg = NOTIF_CONFIG[n.type] ?? NOTIF_CONFIG['message'];
                                const Icon = cfg.icon;
                                return (
                                  <button
                                    key={n.id}
                                    onClick={() => handleNotifClick(n)}
                                    className="w-full text-left px-5 py-4 transition-all duration-200 group"
                                    style={{
                                      background: n.read ? 'transparent' : cfg.bg,
                                      animation: `fadeInUp 0.3s ease-out ${i * 40}ms both`,
                                    }}
                                    onMouseEnter={e => { if (n.read) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,250,252,0.95)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = n.read ? 'transparent' : cfg.bg; }}
                                  >
                                    <div className="flex items-start gap-3">
                                      {/* Type icon */}
                                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-110"
                                        style={{ background: cfg.grad }}>
                                        <Icon className="w-4 h-4 text-white" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <p className={`text-sm font-semibold leading-snug ${n.read ? 'text-gray-700' : 'text-gray-900'}`}>
                                            {n.title}
                                          </p>
                                          <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <span className="text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                                            {!n.read && (
                                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }} />
                                            )}
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                                        {n.link && (
                                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold mt-1.5 text-indigo-500 group-hover:text-indigo-600 transition-colors">
                                            <FiZap className="w-2.5 h-2.5" /> View details
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                          <div className="px-5 py-3 border-t border-gray-100/80 text-center"
                            style={{ background: 'linear-gradient(135deg,rgba(79,70,229,0.03),rgba(124,58,237,0.02))' }}>
                            <p className="text-xs text-gray-400">{notifications.length} notification{notifications.length !== 1 ? 's' : ''} total</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Profile dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className={`flex items-center gap-2 p-1.5 rounded-xl transition-all ${profileOpen ? 'bg-white/15' : 'hover:bg-white/10'}`}
                    >
                      {userProfile?.avatar ? (
                        <img src={userProfile.avatar} alt="" className="w-8 h-8 rounded-xl object-cover ring-2 ring-white" />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                          <span className="text-white text-sm font-bold">
                            {userProfile?.name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                      <span className="hidden lg:block text-sm font-semibold text-white/90 max-w-[100px] truncate">
                        {userProfile?.name?.split(' ')[0] || 'User'}
                      </span>
                    </button>

                    {profileOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                        <div className="absolute right-0 mt-2 w-60 rounded-2xl shadow-2xl border border-white/20 py-2 z-50 overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', animation: 'fadeInUp 0.2s ease-out both' }}>
                          {/* User info header */}
                          <div className="px-4 pb-3 pt-2 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                              {userProfile?.avatar ? (
                                <img src={userProfile.avatar} alt="" className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-100" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
                                  style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                                  <span className="text-white font-bold text-sm">
                                    {userProfile?.name?.[0]?.toUpperCase() || 'U'}
                                  </span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{userProfile?.name}</p>
                                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 capitalize"
                                  style={userProfile?.role === 'alumni'
                                    ? { background: 'rgba(236,253,245,1)', color: '#059669' }
                                    : { background: 'rgba(238,242,255,1)', color: '#4f46e5' }}>
                                  {userProfile?.role === 'alumni' ? '💼 Alumni' : '🎓 Student'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* Menu items */}
                          <div className="py-1 px-2">
                            <Link
                              to="/profile"
                              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-xl transition-all duration-150"
                              onClick={() => setProfileOpen(false)}
                              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(238,242,255,0.8)'}
                              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = ''}>
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                                <FiUser className="w-3.5 h-3.5 text-white" />
                              </div>
                              My Profile
                            </Link>
                          </div>
                          <div className="px-2 pb-2">
                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-150"
                              style={{ color: '#e11d48' }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,241,242,0.9)'}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = ''}>
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg,#f43f5e,#e11d48)' }}>
                                <FiLogOut className="w-3.5 h-3.5 text-white" />
                              </div>
                              Sign Out
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Mobile menu toggle */}
                  <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="md:hidden p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition-all"
                  >
                    {mobileOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" className="text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 text-white hover:text-white hover:bg-white/10 border border-white/20 hover:border-white/30">Sign In</Link>
                  <Link to="/signup" className="btn-gradient btn-gradient-animated text-sm">Get Started</Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && currentUser && (
          <div className="md:hidden border-t border-white/10 bg-indigo-950/95 backdrop-blur-xl animate-fade-in-down px-3 py-2 space-y-0.5">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive(to) ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
            {userProfile?.role === 'student' && (
              <>
                <div className="px-4 pt-2 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">AI Tools</span>
                </div>
                {aiToolLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                      isActive(to) ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />{label}
                  </Link>
                ))}
              </>
            )}
            {userProfile?.role === 'admin' && (
              <Link to="/admin" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-rose-400 hover:bg-rose-500/20 transition-all">
                <FiShield className="w-4 h-4" />Admin
              </Link>
            )}
            <div className="border-t border-white/10 pt-2 mt-2">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all">
                <FiLogOut className="w-4 h-4" />Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;