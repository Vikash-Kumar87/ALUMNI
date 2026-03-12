import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import {
  FiEdit2, FiSave, FiX, FiLinkedin, FiBriefcase, FiBook,
  FiUser, FiMail, FiAward, FiTarget, FiZap, FiBell, FiMessageCircle, FiUserCheck
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const SKILL_COLORS = [
  { bg: 'rgba(238,242,255,1)', color: '#4f46e5', border: '#c7d2fe' },
  { bg: 'rgba(245,243,255,1)', color: '#7c3aed', border: '#ddd6fe' },
  { bg: 'rgba(236,253,245,1)', color: '#059669', border: '#6ee7b7' },
  { bg: 'rgba(255,251,235,1)', color: '#d97706', border: '#fde68a' },
  { bg: 'rgba(236,254,255,1)', color: '#0891b2', border: '#a5f3fc' },
];

const ProfilePage: React.FC = () => {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState<{ messages: boolean; mentorship: boolean }>(() => ({
    messages: userProfile?.emailNotifications?.messages !== false,
    mentorship: userProfile?.emailNotifications?.mentorship !== false,
  }));
  const [emailSaving, setEmailSaving] = useState<'messages' | 'mentorship' | null>(null);

  const [form, setForm] = useState({
    name: userProfile?.name || '',
    bio: userProfile?.bio || '',
    skills: (userProfile?.skills || []).join(', '),
    branch: userProfile?.branch || '',
    year: userProfile?.year?.toString() || '1',
    interests: (userProfile?.interests || []).join(', '),
    goals: userProfile?.goals || '',
    company: userProfile?.company || '',
    jobRole: userProfile?.jobRole || '',
    experience: userProfile?.experience?.toString() || '0',
    linkedin: userProfile?.linkedin || '',
  });

  const handleEmailToggle = async (key: 'messages' | 'mentorship') => {
    if (!currentUser) return;
    const newVal = !emailPrefs[key];
    setEmailPrefs(prev => ({ ...prev, [key]: newVal }));
    setEmailSaving(key);
    try {
      await usersAPI.updateProfile(currentUser.uid, {
        emailNotifications: { ...emailPrefs, [key]: newVal },
      });
      await refreshProfile();
      toast.success(newVal ? 'Email notifications turned on' : 'Email notifications turned off');
    } catch {
      setEmailPrefs(prev => ({ ...prev, [key]: !newVal })); // revert on failure
      toast.error('Failed to save preference');
    } finally {
      setEmailSaving(null);
    }
  };

  const handleSave = async () => {
    if (!currentUser || !userProfile) return;
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        name: form.name,
        bio: form.bio,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      };
      if (userProfile.role === 'student') {
        data.branch = form.branch;
        data.year = Number(form.year);
        data.interests = form.interests.split(',').map(s => s.trim()).filter(Boolean);
        data.goals = form.goals;
      } else if (userProfile.role === 'alumni') {
        data.company = form.company;
        data.jobRole = form.jobRole;
        data.experience = Number(form.experience);
        data.linkedin = form.linkedin;
      }
      await usersAPI.updateProfile(currentUser.uid, data);
      await refreshProfile();
      setEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      name: userProfile?.name || '',
      bio: userProfile?.bio || '',
      skills: (userProfile?.skills || []).join(', '),
      branch: userProfile?.branch || '',
      year: userProfile?.year?.toString() || '1',
      interests: (userProfile?.interests || []).join(', '),
      goals: userProfile?.goals || '',
      company: userProfile?.company || '',
      jobRole: userProfile?.jobRole || '',
      experience: userProfile?.experience?.toString() || '0',
      linkedin: userProfile?.linkedin || '',
    });
    setEditing(false);
  };

  if (!userProfile) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
    </div>
  );

  const isStudent = userProfile.role === 'student';
  const skillsList = userProfile.skills || [];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ── Aurora background ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,#eef2ff 0%,#f5f3ff 35%,#ecfdf5 65%,#eff6ff 100%)' }} />
        <div className="aurora-blob w-[500px] h-[500px] -top-28 -left-28 opacity-40"
          style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.5) 0%,rgba(139,92,246,0.25) 50%,transparent 70%)' }} />
        <div className="aurora-blob-2 w-[450px] h-[450px] -bottom-20 -right-20 opacity-35"
          style={{ background: 'radial-gradient(circle,rgba(16,185,129,0.45) 0%,rgba(6,182,212,0.2) 50%,transparent 70%)' }} />
        <div className="aurora-blob w-[350px] h-[350px] top-1/3 right-1/4 opacity-20"
          style={{ background: 'radial-gradient(circle,rgba(236,72,153,0.35) 0%,rgba(167,139,250,0.15) 50%,transparent 70%)', animationDelay: '5s' }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-8">

        {/* ── Hero card ── */}
        <div className="relative rounded-3xl overflow-hidden mb-6 shadow-2xl"
          style={{ animation: 'fadeInUp 0.45s ease-out both' }}>
          {/* Gradient header band */}
          <div className="h-28 sm:h-36 relative"
            style={{ background: isStudent ? 'linear-gradient(135deg,#4f46e5,#7c3aed,#6d28d9)' : 'linear-gradient(135deg,#059669,#0891b2,#7c3aed,#4f46e5)' }}>
            <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle,#fff,transparent 70%)' }} />
            <div className="absolute top-4 right-4 flex gap-2">
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200 text-white"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'}>
                  <FiEdit2 className="w-3.5 h-3.5" /> Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleCancel}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white transition-all"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <FiX className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-indigo-700 transition-all duration-200 disabled:opacity-60"
                    style={{ background: 'rgba(255,255,255,0.92)' }}>
                    {saving ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
                    ) : <FiSave className="w-3.5 h-3.5" />}
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profile info body */}
          <div className="bg-white/90 backdrop-blur-sm px-6 pt-14 pb-6 border border-gray-100 rounded-b-3xl relative">
            {/* Avatar — overlaps band */}
            <div className="absolute -top-10 left-6">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl ring-4 ring-white"
                style={{ background: isStudent ? 'linear-gradient(135deg,#6366f1,#7c3aed,#4f46e5)' : 'linear-gradient(135deg,#10b981,#059669,#0891b2)' }}>
                <span className="text-white text-3xl font-extrabold">
                  {userProfile.name?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">{userProfile.name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={isStudent
                      ? { background: 'rgba(238,242,255,1)', color: '#4f46e5' }
                      : { background: 'rgba(236,253,245,1)', color: '#059669' }}>
                    {isStudent ? '🎓 Student' : '💼 Alumni'}
                  </span>
                  {userProfile.branch && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                      {userProfile.branch}
                    </span>
                  )}
                </div>
                {userProfile.email && (
                  <p className="flex items-center gap-1.5 text-sm text-gray-400 mt-2">
                    <FiMail className="w-3.5 h-3.5" />{userProfile.email}
                  </p>
                )}
              </div>
              {/* Quick stats */}
              <div className="flex gap-3">
                {[
                  { label: 'Skills', val: skillsList.length },
                  ...(isStudent
                    ? [{ label: 'Year', val: userProfile.year ?? '—' }]
                    : [{ label: 'Exp', val: userProfile.experience !== undefined ? `${userProfile.experience}y` : '—' }]),
                ].map(({ label, val }) => (
                  <div key={label} className="text-center px-4 py-2.5 rounded-2xl border"
                    style={{ background: 'rgba(248,250,252,0.9)', borderColor: '#e5e7eb' }}>
                    <p className="text-lg font-extrabold text-gray-900">{val}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* About */}
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                  <FiUser className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-700">About</span>
              </div>
              {editing ? (
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white/80"
                  rows={3} placeholder="Tell others about yourself…" />
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {userProfile.bio || <span className="text-gray-400 italic">No bio added yet.</span>}
                </p>
              )}
            </div>

            {/* Name edit */}
            {editing && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Full Name</label>
                <input type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/80" />
              </div>
            )}
          </div>
        </div>

        {/* ── Skills card ── */}
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm mb-6"
          style={{ animation: 'fadeInUp 0.45s ease-out 120ms both' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 20px 40px rgba(99,102,241,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#a855f7)' }}>
              <FiZap className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">Skills</h3>
            {!editing && <span className="ml-auto text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{skillsList.length} skills</span>}
          </div>
          {editing ? (
            <input type="text" value={form.skills}
              onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/80"
              placeholder="React, Python, Node.js… (comma separated)" />
          ) : skillsList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skillsList.map((s, i) => {
                const c = SKILL_COLORS[i % SKILL_COLORS.length];
                return (
                  <span key={s}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border"
                    style={{ background: c.bg, color: c.color, borderColor: c.border,
                      animation: `fadeInUp 0.3s ease-out ${i * 40}ms both` }}>
                    {s}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm italic">No skills added yet</p>
          )}
        </div>

        {/* ── Email Notification Settings card ── */}
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm mb-6"
          style={{ animation: 'fadeInUp 0.45s ease-out 180ms both' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 20px 40px rgba(99,102,241,0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}>
          {/* Card header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
              <FiBell className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Email Notifications</h3>
              <p className="text-xs text-gray-400 mt-0.5">Choose when to receive email alerts</p>
            </div>
            <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
              style={{ background: 'rgba(238,242,255,1)', color: '#6366f1' }}>Beta</span>
          </div>

          <div className="space-y-3">
            {([
              {
                key: 'messages' as const,
                icon: FiMessageCircle,
                grad: 'linear-gradient(135deg,#06b6d4,#0891b2)',
                bg: 'rgba(236,254,255,0.8)',
                border: '#a5f3fc',
                label: 'New Messages',
                desc: 'Get an email when someone sends you a message',
              },
              {
                key: 'mentorship' as const,
                icon: FiUserCheck,
                grad: 'linear-gradient(135deg,#10b981,#059669)',
                bg: 'rgba(236,253,245,0.8)',
                border: '#6ee7b7',
                label: 'Mentorship Updates',
                desc: 'Get an email when your request is accepted',
              },
            ]).map(({ key, icon: Icon, grad, bg, border, label, desc }, i) => {
              const enabled = emailPrefs[key];
              const saving = emailSaving === key;
              return (
                <div
                  key={key}
                  className="flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300"
                  style={{
                    background: enabled ? bg : 'rgba(248,250,252,0.6)',
                    borderColor: enabled ? border : '#e5e7eb',
                    animation: `fadeInUp 0.35s ease-out ${i * 80}ms both`,
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-300"
                    style={{ background: enabled ? grad : '#e5e7eb' }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold transition-colors duration-200 ${enabled ? 'text-gray-900' : 'text-gray-400'}`}>{label}</p>
                    <p className={`text-xs mt-0.5 transition-colors duration-200 ${enabled ? 'text-gray-500' : 'text-gray-400'}`}>{desc}</p>
                  </div>
                  {/* Animated pill toggle */}
                  <button
                    onClick={() => handleEmailToggle(key)}
                    disabled={saving}
                    aria-label={`Toggle ${label}`}
                    className="flex-shrink-0 relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none disabled:opacity-60"
                    style={{ background: enabled ? 'linear-gradient(135deg,#6366f1,#7c3aed)' : '#d1d5db' }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center"
                      style={{ transform: enabled ? 'translateX(24px)' : 'translateX(0)' }}
                    >
                      {saving && (
                        <span className="w-3 h-3 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin absolute" />
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5">
            <FiMail className="w-3.5 h-3.5" />
            Emails are sent to <strong className="text-gray-500">{userProfile?.email}</strong>
          </p>
        </div>

        {/* ── Academic / Professional card ── */}
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-sm mb-6"
          style={{ animation: 'fadeInUp 0.45s ease-out 240ms both' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = isStudent ? '0 20px 40px rgba(99,102,241,0.1)' : '0 20px 40px rgba(16,185,129,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: isStudent ? 'linear-gradient(135deg,#6366f1,#7c3aed)' : 'linear-gradient(135deg,#10b981,#059669)' }}>
              <FiBriefcase className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">{isStudent ? 'Academic Details' : 'Professional Details'}</h3>
          </div>

          {isStudent ? (
            editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Branch</label>
                    <input type="text" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/80" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Year</label>
                    <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/80">
                      {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Interests (comma separated)</label>
                  <input type="text" value={form.interests} onChange={e => setForm(f => ({ ...f, interests: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/80" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Career Goals</label>
                  <textarea value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white/80" rows={3} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: 'Branch', val: userProfile.branch || '—', icon: FiBook },
                  { label: 'Year', val: `Year ${userProfile.year || '—'}`, icon: FiAward },
                ].map(({ label, val, icon: Icon }, i) => (
                  <div key={label} className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'rgba(248,250,252,0.8)', animation: `fadeInUp 0.3s ease-out ${i * 60}ms both` }}>
                    <span className="flex items-center gap-2 text-sm text-gray-500">
                      <Icon className="w-4 h-4 text-indigo-400" />{label}
                    </span>
                    <span className="text-sm font-bold text-gray-800">{val}</span>
                  </div>
                ))}
                {(userProfile.interests?.length ?? 0) > 0 && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(248,250,252,0.8)' }}>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <FiTarget className="w-4 h-4 text-indigo-400" />Interests
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {userProfile.interests!.map((interest, i) => (
                        <span key={interest} className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                          style={{ background: 'rgba(245,243,255,1)', color: '#7c3aed', borderColor: '#ddd6fe',
                            animation: `fadeInUp 0.3s ease-out ${i * 40}ms both` }}>
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {userProfile.goals && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(248,250,252,0.8)' }}>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1.5">
                      <FiTarget className="w-4 h-4 text-indigo-400" />Career Goals
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{userProfile.goals}</p>
                  </div>
                )}
              </div>
            )
          ) : editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Company</label>
                  <input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white/80" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Job Role</label>
                  <input type="text" value={form.jobRole} onChange={e => setForm(f => ({ ...f, jobRole: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white/80" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Experience (years)</label>
                  <input type="number" min="0" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white/80" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">LinkedIn</label>
                  <input type="url" value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white/80" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Company', val: userProfile.company || '—' },
                { label: 'Role', val: userProfile.jobRole || '—' },
                { label: 'Experience', val: userProfile.experience !== undefined ? `${userProfile.experience} years` : '—' },
              ].map(({ label, val }, i) => (
                <div key={label} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(248,250,252,0.8)', animation: `fadeInUp 0.3s ease-out ${i * 60}ms both` }}>
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-bold text-gray-800">{val}</span>
                </div>
              ))}
              {userProfile.linkedin && (
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(236,253,245,0.9)' }}>
                  <span className="text-sm text-gray-500">LinkedIn</span>
                  <a href={userProfile.linkedin} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                    <FiLinkedin className="w-4 h-4" /> View Profile
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
