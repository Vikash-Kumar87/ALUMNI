import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';
import { Notification } from '../../types';
import {
  FiHome, FiUsers, FiMessageSquare, FiBriefcase, FiCpu,
  FiMessageCircle, FiMenu, FiX, FiBell, FiLogOut, FiUser, FiShield, FiAward,
  FiCheck, FiMap, FiUserCheck
} from 'react-icons/fi';

const Navbar: React.FC = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

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
        { to: '/forum', label: 'Forum', icon: FiMessageSquare },
        { to: '/jobs', label: 'Post Jobs', icon: FiBriefcase },
        { to: '/chat', label: 'Messages', icon: FiMessageCircle },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: FiHome },
        { to: '/mentors', label: 'Mentors', icon: FiUsers },
        { to: '/forum', label: 'Forum', icon: FiMessageSquare },
        { to: '/jobs', label: 'Jobs', icon: FiBriefcase },
        { to: '/roadmap', label: 'Roadmap', icon: FiMap },
        { to: '/interview', label: 'Interview', icon: FiCpu },
        { to: '/chatbot', label: 'AI Chat', icon: FiMessageCircle },
        { to: '/chat', label: 'Messages', icon: FiMessageSquare },
      ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <>
      <nav className={`sticky top-0 z-50 transition-all duration-400 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-2xl shadow-soft border-b border-gray-100/80'
          : 'bg-white border-b border-gray-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center shadow-glow transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-md">
                <FiAward className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 hidden sm:block tracking-tight">AlumniConnect</span>
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
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive(to) ? 'scale-110' : ''}`} />
                    <span className="hidden lg:block">{label}</span>
                    {isActive(to) && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-500 rounded-full" />
                    )}
                  </Link>
                ))}
                {userProfile?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive('/admin') ? 'bg-rose-50 text-rose-700' : 'text-gray-500 hover:bg-rose-50 hover:text-rose-700'
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
                        notifOpen ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
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
                      <div className="fixed sm:absolute left-2 right-2 top-16 w-auto sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 bg-white rounded-2xl shadow-lift border border-gray-100 z-50 animate-scale-in overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                          <span className="text-sm font-bold text-gray-900">Notifications</span>
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllRead}
                              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                            >
                              <FiCheck className="w-3 h-3" /> Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                          {notifications.length === 0 ? (
                            <div className="py-10 flex flex-col items-center text-gray-400">
                              <FiBell className="w-8 h-8 mb-2 opacity-30" />
                              <p className="text-sm">No notifications yet</p>
                            </div>
                          ) : (
                            notifications.map(n => (
                              <button
                                key={n.id}
                                onClick={() => handleNotifClick(n)}
                                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                  !n.read ? 'bg-primary-50/40' : ''
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  {!n.read && (
                                    <span className="mt-1.5 w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                                  )}
                                  <div className={!n.read ? '' : 'pl-4'}>
                                    <p className={`text-sm font-medium ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                      {new Date(n.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className={`flex items-center gap-2 p-1.5 rounded-xl transition-all ${profileOpen ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
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
                      <span className="hidden lg:block text-sm font-semibold text-gray-700 max-w-[100px] truncate">
                        {userProfile?.name?.split(' ')[0] || 'User'}
                      </span>
                    </button>

                    {profileOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                        <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-card-hover border border-gray-100 py-1.5 z-50 animate-scale-in">
                          <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-bold text-gray-900 truncate">{userProfile?.name}</p>
                            <p className="text-xs text-gray-400 capitalize mt-0.5">{userProfile?.role}</p>
                          </div>
                          <Link
                            to="/profile"
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setProfileOpen(false)}
                          >
                            <FiUser className="w-4 h-4 text-gray-400" /> My Profile
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <FiLogOut className="w-4 h-4" /> Sign Out
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Mobile menu toggle */}
                  <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="md:hidden p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-all"
                  >
                    {mobileOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
                  <Link to="/signup" className="btn-gradient text-sm">Get Started</Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && currentUser && (
          <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl animate-fade-in-down px-3 py-2 space-y-0.5">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive(to) ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
            {userProfile?.role === 'admin' && (
              <Link to="/admin" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-rose-600 hover:bg-rose-50 transition-all">
                <FiShield className="w-4 h-4" />Admin
              </Link>
            )}
            <div className="border-t border-gray-100 pt-2 mt-2">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
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