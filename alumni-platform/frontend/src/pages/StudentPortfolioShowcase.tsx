import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiAward,
  FiBookmark,
  FiEdit3,
  FiExternalLink,
  FiGithub,
  FiGlobe,
  FiLayers,
  FiLinkedin,
  FiPlus,
  FiSave,
  FiStar,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { portfolioAPI } from '../services/api';
import { PortfolioProject, StudentPortfolio, User } from '../types';

interface ShowcaseUser extends Pick<User, 'uid' | 'name' | 'avatar' | 'skills' | 'branch' | 'year' | 'bio'> {
  portfolio?: StudentPortfolio;
}

const emptyProject = (): PortfolioProject => ({
  title: '',
  description: '',
  techStack: [],
  projectUrl: '',
});

const getDefaultPortfolio = (): StudentPortfolio => ({
  headline: '',
  about: '',
  github: '',
  linkedin: '',
  website: '',
  highlights: [],
  achievements: [],
  projects: [emptyProject()],
  isPublic: true,
});

const StudentPortfolioShowcase: React.FC = () => {
  const { userProfile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'showcase' | 'editor'>('showcase');
  const [showcaseUsers, setShowcaseUsers] = useState<ShowcaseUser[]>([]);
  const [portfolio, setPortfolio] = useState<StudentPortfolio>(getDefaultPortfolio());
  const [highlightsInput, setHighlightsInput] = useState('');
  const [achievementsInput, setAchievementsInput] = useState('');

  const isStudent = userProfile?.role === 'student';

  useEffect(() => {
    const profilePortfolio = userProfile?.portfolio;
    const normalized = profilePortfolio
      ? {
          ...getDefaultPortfolio(),
          ...profilePortfolio,
          projects: (profilePortfolio.projects && profilePortfolio.projects.length > 0)
            ? profilePortfolio.projects
            : [emptyProject()],
        }
      : getDefaultPortfolio();

    setPortfolio(normalized);
    setHighlightsInput((normalized.highlights || []).join('\n'));
    setAchievementsInput((normalized.achievements || []).join('\n'));
  }, [userProfile]);

  const fetchShowcase = async () => {
    try {
      setLoading(true);
      const res = await portfolioAPI.getShowcase();
      setShowcaseUsers(res.data.portfolios || []);
    } catch (error) {
      console.error('Failed to load portfolio showcase:', error);
      toast.error('Failed to load portfolio showcase');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShowcase();
  }, []);

  const featuredStats = useMemo(() => {
    const totalProjects = showcaseUsers.reduce((acc, user) => acc + (user.portfolio?.projects?.length || 0), 0);
    const uniqueSkills = new Set(
      showcaseUsers.flatMap(user => user.skills || []).map(s => s.toLowerCase().trim()).filter(Boolean)
    ).size;

    return {
      portfolios: showcaseUsers.length,
      projects: totalProjects,
      skills: uniqueSkills,
    };
  }, [showcaseUsers]);

  const updateProject = (index: number, key: keyof PortfolioProject, value: string | string[]) => {
    setPortfolio(prev => {
      const nextProjects = [...prev.projects];
      nextProjects[index] = {
        ...nextProjects[index],
        [key]: value,
      };
      return { ...prev, projects: nextProjects };
    });
  };

  const addProject = () => {
    setPortfolio(prev => ({ ...prev, projects: [...prev.projects, emptyProject()] }));
  };

  const removeProject = (index: number) => {
    setPortfolio(prev => {
      const filtered = prev.projects.filter((_, i) => i !== index);
      return { ...prev, projects: filtered.length ? filtered : [emptyProject()] };
    });
  };

  const savePortfolio = async () => {
    if (!userProfile?.uid || !isStudent) return;

    const normalizedHighlights = highlightsInput
      .split('\n')
      .map(x => x.trim())
      .filter(Boolean)
      .slice(0, 8);

    const normalizedAchievements = achievementsInput
      .split('\n')
      .map(x => x.trim())
      .filter(Boolean)
      .slice(0, 10);

    const normalizedProjects = (portfolio.projects || [])
      .map(project => ({
        title: (project.title || '').trim(),
        description: (project.description || '').trim(),
        techStack: (project.techStack || []).map(t => t.trim()).filter(Boolean).slice(0, 10),
        projectUrl: (project.projectUrl || '').trim(),
      }))
      .filter(project => project.title.length > 0)
      .slice(0, 6);

    const payload: StudentPortfolio = {
      ...portfolio,
      headline: portfolio.headline.trim(),
      about: portfolio.about.trim(),
      github: (portfolio.github || '').trim(),
      linkedin: (portfolio.linkedin || '').trim(),
      website: (portfolio.website || '').trim(),
      highlights: normalizedHighlights,
      achievements: normalizedAchievements,
      projects: normalizedProjects,
      isPublic: Boolean(portfolio.isPublic),
    };

    try {
      setSaving(true);
      await portfolioAPI.updateMyPortfolio(userProfile.uid, payload);
      await refreshProfile();
      await fetchShowcase();
      toast.success('Portfolio updated successfully');
      setTab('showcase');
    } catch (error) {
      console.error('Failed to update portfolio:', error);
      toast.error('Failed to update portfolio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-700 via-cyan-700 to-emerald-700 text-white">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full bg-black/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
          >
            <div>
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-cyan-100 font-bold">
                <FiLayers className="w-4 h-4" />
                Community Showcase
              </p>
              <h1 className="mt-3 text-3xl sm:text-5xl font-black leading-tight">Student Portfolio Showcase</h1>
              <p className="mt-3 text-cyan-100 max-w-2xl text-sm sm:text-base">
                Discover student builders, their real-world projects, and their growth journey in one modern showcase board.
              </p>
            </div>

            {isStudent && (
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2 inline-flex w-full sm:w-auto">
                <button
                  onClick={() => setTab('showcase')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    tab === 'showcase' ? 'bg-white text-sky-700' : 'text-white hover:bg-white/10'
                  }`}
                >
                  Showcase
                </button>
                <button
                  onClick={() => setTab('editor')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    tab === 'editor' ? 'bg-white text-sky-700' : 'text-white hover:bg-white/10'
                  }`}
                >
                  Edit My Portfolio
                </button>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {[
              { icon: FiUsers, value: featuredStats.portfolios, label: 'Active Portfolios' },
              { icon: FiBookmark, value: featuredStats.projects, label: 'Projects Shared' },
              { icon: FiStar, value: featuredStats.skills, label: 'Unique Skills' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/15 border border-white/20 rounded-2xl p-4 backdrop-blur-md">
                <stat.icon className="w-5 h-5 text-cyan-100" />
                <p className="mt-2 text-3xl font-black">{stat.value}</p>
                <p className="text-cyan-100 text-sm">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <AnimatePresence mode="wait">
          {tab === 'editor' && isStudent ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Build Your Portfolio</h2>
                  <p className="text-slate-500 text-sm">Craft your personal brand and publish your best work.</p>
                </div>
                <button
                  onClick={savePortfolio}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 text-white font-semibold disabled:opacity-60"
                >
                  <FiSave className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Portfolio'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={portfolio.headline}
                  onChange={e => setPortfolio(prev => ({ ...prev, headline: e.target.value }))}
                  placeholder="Portfolio headline (e.g. Full-Stack Student Builder)"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                <label className="rounded-xl border border-slate-200 px-4 py-3 text-sm flex items-center justify-between">
                  <span className="font-medium text-slate-700">Public Portfolio</span>
                  <input
                    type="checkbox"
                    checked={portfolio.isPublic}
                    onChange={e => setPortfolio(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="w-4 h-4"
                  />
                </label>
              </div>

              <textarea
                value={portfolio.about}
                onChange={e => setPortfolio(prev => ({ ...prev, about: e.target.value }))}
                placeholder="About you"
                rows={4}
                className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <input
                  value={portfolio.github || ''}
                  onChange={e => setPortfolio(prev => ({ ...prev, github: e.target.value }))}
                  placeholder="GitHub URL"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                <input
                  value={portfolio.linkedin || ''}
                  onChange={e => setPortfolio(prev => ({ ...prev, linkedin: e.target.value }))}
                  placeholder="LinkedIn URL"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                <input
                  value={portfolio.website || ''}
                  onChange={e => setPortfolio(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="Website URL"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <textarea
                  value={highlightsInput}
                  onChange={e => setHighlightsInput(e.target.value)}
                  placeholder="Highlights (one per line)"
                  rows={5}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                <textarea
                  value={achievementsInput}
                  onChange={e => setAchievementsInput(e.target.value)}
                  placeholder="Achievements (one per line)"
                  rows={5}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-black text-slate-900">Projects</h3>
                  <button onClick={addProject} className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
                    <FiPlus className="w-4 h-4" /> Add Project
                  </button>
                </div>

                <div className="space-y-4">
                  {portfolio.projects.map((project, index) => (
                    <div key={`project-${index}`} className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          value={project.title}
                          onChange={e => updateProject(index, 'title', e.target.value)}
                          placeholder="Project title"
                          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                        />
                        <input
                          value={project.projectUrl || ''}
                          onChange={e => updateProject(index, 'projectUrl', e.target.value)}
                          placeholder="Project URL"
                          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                        />
                      </div>
                      <textarea
                        value={project.description}
                        onChange={e => updateProject(index, 'description', e.target.value)}
                        placeholder="Project description"
                        rows={3}
                        className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                      />
                      <input
                        value={(project.techStack || []).join(', ')}
                        onChange={e => updateProject(index, 'techStack', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                        placeholder="Tech stack (comma separated)"
                        className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                      />
                      <button
                        onClick={() => removeProject(index)}
                        className="mt-3 inline-flex items-center gap-1.5 text-rose-600 text-sm font-semibold"
                      >
                        <FiTrash2 className="w-4 h-4" /> Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="showcase"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 animate-pulse h-72" />
                  ))}
                </div>
              ) : showcaseUsers.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
                  <FiAward className="w-12 h-12 mx-auto text-slate-300" />
                  <h3 className="mt-3 text-2xl font-black text-slate-900">No portfolios yet</h3>
                  <p className="text-slate-500 mt-2">Students can publish their portfolio to appear in this showcase.</p>
                  {isStudent && (
                    <button
                      onClick={() => setTab('editor')}
                      className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white font-semibold"
                    >
                      <FiEdit3 className="w-4 h-4" /> Create Mine
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {showcaseUsers.map((student, index) => {
                    const p = student.portfolio;
                    if (!p) return null;

                    return (
                      <motion.article
                        key={student.uid}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: index * 0.05 }}
                        whileHover={{ y: -4 }}
                        className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden"
                      >
                        <div className="p-6 bg-gradient-to-r from-sky-50 to-emerald-50 border-b border-slate-100">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {student.avatar ? (
                                <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-xl object-cover" />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-600 to-emerald-600 text-white font-black grid place-items-center">
                                  {student.name?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <h3 className="font-black text-slate-900 truncate">{student.name}</h3>
                                <p className="text-xs text-slate-500 truncate">{student.branch || 'Student'} {student.year ? `• Year ${student.year}` : ''}</p>
                              </div>
                            </div>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full font-bold">
                              Portfolio
                            </span>
                          </div>
                          {p.headline && <p className="mt-3 text-sm font-semibold text-slate-700">{p.headline}</p>}
                        </div>

                        <div className="p-6 space-y-4">
                          {p.about && <p className="text-sm text-slate-600 line-clamp-3">{p.about}</p>}

                          {(student.skills || []).length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {(student.skills || []).slice(0, 6).map(skill => (
                                <span key={`${student.uid}-${skill}`} className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}

                          {(p.highlights || []).length > 0 && (
                            <ul className="space-y-1.5">
                              {p.highlights.slice(0, 3).map(item => (
                                <li key={item} className="text-sm text-slate-700 flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-2" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {(p.projects || []).length > 0 && (
                            <div>
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-400 font-bold mb-2">Featured Projects</p>
                              <div className="space-y-2">
                                {p.projects.slice(0, 2).map(project => (
                                  <div key={`${student.uid}-${project.title}`} className="rounded-xl border border-slate-200 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="font-semibold text-sm text-slate-800 truncate">{project.title}</p>
                                      {project.projectUrl && (
                                        <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600">
                                          <FiExternalLink className="w-4 h-4" />
                                        </a>
                                      )}
                                    </div>
                                    {project.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{project.description}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="px-6 pb-6 flex items-center gap-2">
                          {p.github && (
                            <a href={p.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                              <FiGithub className="w-3.5 h-3.5" /> GitHub
                            </a>
                          )}
                          {p.linkedin && (
                            <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                              <FiLinkedin className="w-3.5 h-3.5" /> LinkedIn
                            </a>
                          )}
                          {p.website && (
                            <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                              <FiGlobe className="w-3.5 h-3.5" /> Website
                            </a>
                          )}
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StudentPortfolioShowcase;
