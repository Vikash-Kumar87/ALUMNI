import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import { FiEdit2, FiSave, FiX, FiLinkedin, FiBriefcase, FiBook, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ProfilePage: React.FC = () => {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

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

  if (!userProfile) return <LoadingSpinner fullPage />;

  const isStudent = userProfile.role === 'student';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="card gradient-border mb-6">
        {/* Profile header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 via-violet-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-primary-100 animate-breathe">
              <span className="text-white text-3xl font-bold">
                {userProfile.name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient">{userProfile.name}</h1>
              <p className="text-gray-500 capitalize">{userProfile.role}</p>
              {userProfile.email && (
                <p className="text-sm text-gray-400 mt-0.5">{userProfile.email}</p>
              )}
            </div>
          </div>

          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <FiEdit2 className="w-4 h-4" /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleCancel} className="btn-secondary flex items-center gap-2 text-sm">
                <FiX className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                <FiSave className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {/* Role badge */}
        <div className="flex gap-2 mb-6">
          <span className={`badge ${isStudent ? 'badge-blue' : 'badge-green'}`}>
            {isStudent ? '🎓 Student' : '💼 Alumni'}
          </span>
          {userProfile.branch && <span className="badge bg-gray-100 text-gray-700">{userProfile.branch}</span>}
        </div>

        {/* Bio */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FiUser className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">About</span>
          </div>
          {editing ? (
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              className="input"
              rows={3}
              placeholder="Tell others about yourself..."
            />
          ) : (
            <p className="text-gray-600 text-sm">{userProfile.bio || 'No bio added yet.'}</p>
          )}
        </div>

        {/* Name (editable) */}
        {editing && (
          <div className="mb-4">
            <label className="label">Full Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" />
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="card card-hover-glow mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FiBook className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Skills</h3>
        </div>
        {editing ? (
          <input
            type="text"
            value={form.skills}
            onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
            className="input"
            placeholder="React, Python, Node.js... (comma separated)"
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {userProfile.skills?.length > 0
              ? userProfile.skills.map(s => <span key={s} className="badge-blue">{s}</span>)
              : <p className="text-gray-400 text-sm">No skills added yet</p>}
          </div>
        )}
      </div>

      {/* Role-specific fields */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FiBriefcase className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900">{isStudent ? 'Academic Details' : 'Professional Details'}</h3>
        </div>

        {isStudent ? (
          editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Branch</label>
                  <input type="text" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Year</label>
                  <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className="input">
                    {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Interests (comma separated)</label>
                <input type="text" value={form.interests} onChange={e => setForm(f => ({ ...f, interests: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Career Goals</label>
                <textarea value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} className="input" rows={3} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Branch</span>
                <span className="font-medium">{userProfile.branch || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Year</span>
                <span className="font-medium">Year {userProfile.year || '—'}</span>
              </div>
              {userProfile.interests && userProfile.interests.length > 0 && (
                <div className="text-sm">
                  <span className="text-gray-500">Interests:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {userProfile.interests.map(i => <span key={i} className="badge bg-purple-100 text-purple-700">{i}</span>)}
                  </div>
                </div>
              )}
              {userProfile.goals && (
                <div className="text-sm">
                  <span className="text-gray-500 block mb-1">Goals:</span>
                  <p className="text-gray-700">{userProfile.goals}</p>
                </div>
              )}
            </div>
          )
        ) : editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Company</label>
                <input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Job Role</label>
                <input type="text" value={form.jobRole} onChange={e => setForm(f => ({ ...f, jobRole: e.target.value }))} className="input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Experience (years)</label>
                <input type="number" min="0" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">LinkedIn</label>
                <input type="url" value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} className="input" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Company</span>
              <span className="font-medium">{userProfile.company || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Role</span>
              <span className="font-medium">{userProfile.jobRole || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Experience</span>
              <span className="font-medium">{userProfile.experience !== undefined ? `${userProfile.experience} years` : '—'}</span>
            </div>
            {userProfile.linkedin && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">LinkedIn</span>
                <a href={userProfile.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary-600 flex items-center gap-1">
                  <FiLinkedin className="w-4 h-4" /> View Profile
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
