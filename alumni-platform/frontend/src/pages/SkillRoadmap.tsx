import React, { useState } from 'react';
import { aiAPI } from '../services/api';
import { Roadmap } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiMap, FiTarget, FiClock, FiBook, FiCheckCircle,
  FiChevronDown, FiChevronUp, FiStar, FiZap, FiTrendingUp, FiLayers, FiCode
} from 'react-icons/fi';

const POPULAR_GOALS = [
  { label: 'Full Stack Web Developer', icon: '🌐' },
  { label: 'Data Scientist', icon: '📊' },
  { label: 'Machine Learning Engineer', icon: '🤖' },
  { label: 'DevOps Engineer', icon: '⚙️' },
  { label: 'Mobile App Developer', icon: '📱' },
  { label: 'Cybersecurity Engineer', icon: '🔐' },
  { label: 'Cloud Architect', icon: '☁️' },
  { label: 'Backend Engineer', icon: '🛠️' },
];

const TIMEFRAMES = [
  { label: '3 months', icon: '⚡', color: 'from-amber-400 to-orange-500' },
  { label: '6 months', icon: '🎯', color: 'from-cyan-400 to-blue-500' },
  { label: '1 year', icon: '🚀', color: 'from-violet-400 to-purple-600' },
  { label: '2 years', icon: '🏆', color: 'from-emerald-400 to-teal-600' },
];

const PHASE_COLORS = [
  { bg: 'from-cyan-500 to-blue-600', border: 'border-cyan-400', light: 'bg-cyan-50', text: 'text-cyan-700', ring: 'ring-cyan-100' },
  { bg: 'from-violet-500 to-purple-600', border: 'border-violet-400', light: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-100' },
  { bg: 'from-emerald-500 to-teal-600', border: 'border-emerald-400', light: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-100' },
  { bg: 'from-rose-500 to-pink-600', border: 'border-rose-400', light: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-100' },
  { bg: 'from-amber-500 to-orange-600', border: 'border-amber-400', light: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-100' },
];

const resourceTypeIcon: Record<string, string> = {
  video: '🎬', course: '📚', article: '📄', book: '📖',
};

const SkillRoadmap: React.FC = () => {
  const { userProfile } = useAuth();
  const [goal, setGoal] = useState('');
  const [timeframe, setTimeframe] = useState('6 months');
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);

  const currentSkills = userProfile?.skills || [];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) { toast.error('Please enter a career goal'); return; }
    setLoading(true);
    setRoadmap(null);
    try {
      const res = await aiAPI.getSkillRoadmap(goal, currentSkills, timeframe);
      const data = res.data.roadmap as Roadmap;
      if (!data) throw new Error('No roadmap returned');
      setRoadmap(data);
      setExpandedPhase(0);
      toast.success('Roadmap generated!');
    } catch (err: any) {
      const msg = err?.response?.data?.error || (err as Error)?.message || 'Failed to generate roadmap. Try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedTimeframe = TIMEFRAMES.find(t => t.label === timeframe)!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-blue-50/40 px-4 py-8">

      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="aurora-blob w-96 h-96 bg-cyan-300/20 -top-20 -right-20" />
        <div className="aurora-blob w-72 h-72 bg-blue-300/20 bottom-20 -left-10" style={{ animationDelay: '5s' }} />
        <div className="aurora-blob w-64 h-64 bg-indigo-300/15 top-1/2 right-1/4" style={{ animationDelay: '10s' }} />
      </div>

      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-8 animate-fade-in">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <FiMap className="w-7 h-7 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              AI Skill <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">Roadmap</span>
            </h1>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
              <FiZap className="w-3.5 h-3.5 text-cyan-400" /> Powered by Groq AI · Get a personalised learning path
            </p>
          </div>
        </div>

        {/* ── Form card ── */}
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-card p-6 mb-8 animate-slide-up">
          <form onSubmit={handleGenerate} className="space-y-6">

            {/* Career goal input */}
            <div>
              <label className="label flex items-center gap-1.5">
                <FiTarget className="w-3.5 h-3.5 text-gray-400" /> Your Career Goal
              </label>
              <input
                type="text"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                className="input input-glow text-base"
                placeholder="e.g. Full Stack Web Developer, Data Scientist..."
                required
              />
            </div>

            {/* Popular goals */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Popular goals</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_GOALS.map(g => (
                  <button
                    key={g.label}
                    type="button"
                    onClick={() => setGoal(g.label)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all duration-200 ${
                      goal === g.label
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700 scale-[1.04] shadow-sm'
                        : 'border-gray-150 bg-gray-50 text-gray-600 hover:border-cyan-300 hover:bg-cyan-50/50 hover:text-cyan-600'
                    }`}
                  >
                    <span>{g.icon}</span> {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeframe */}
            <div>
              <label className="label flex items-center gap-1.5">
                <FiClock className="w-3.5 h-3.5 text-gray-400" /> Available Timeframe
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TIMEFRAMES.map(t => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => setTimeframe(t.label)}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-200 flex flex-col items-center gap-1 ${
                      timeframe === t.label
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm scale-[1.04]'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-cyan-300 hover:bg-cyan-50/40'
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Current skills */}
            {currentSkills.length > 0 && (
              <div className="bg-gradient-to-r from-indigo-50 to-cyan-50 rounded-xl p-4 border border-indigo-100/60">
                <p className="text-xs font-semibold text-indigo-600 mb-2 flex items-center gap-1.5">
                  <FiCode className="w-3.5 h-3.5" /> Your current skills (auto-detected from profile):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {currentSkills.map(s => (
                    <span key={s} className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Generate button */}
            <button
              type="submit"
              disabled={loading || !goal.trim()}
              className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', boxShadow: '0 4px 20px rgba(6,182,212,0.4)' }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Generating AI Roadmap...
                  </>
                ) : (
                  <><FiZap className="w-5 h-5" /> Generate My Roadmap</>
                )}
              </span>
            </button>
          </form>
        </div>

        {/* ── Loading skeleton ── */}
        {loading && (
          <div style={{ animation: 'fadeInUp 0.4s ease-out both' }} className="space-y-4">
            <div className="bg-white/80 rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 skeleton rounded-lg" />
                  <div className="h-3 w-1/3 skeleton rounded-lg" />
                </div>
              </div>
              {[1,2,3].map(i => (
                <div key={i} className="mb-3 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg skeleton flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-1/2 skeleton rounded" />
                      <div className="h-3 w-1/4 skeleton rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-cyan-600 font-medium animate-pulse">
              ✨ AI is crafting your personalised roadmap...
            </p>
          </div>
        )}

        {/* ── Roadmap output ── */}
        {roadmap && !loading && (
          <div style={{ animation: 'fadeInUp 0.5s ease-out both' }} className="space-y-5">

            {/* Summary hero */}
            <div className="relative overflow-hidden rounded-2xl p-6 text-white"
              style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6,#4f46e5)' }}>
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FiMap className="w-5 h-5 text-cyan-200" />
                    <span className="text-sm font-medium text-cyan-200 uppercase tracking-wider">Your Roadmap</span>
                  </div>
                  <h2 className="text-2xl font-black mb-2">{roadmap.title}</h2>
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <FiClock className="w-4 h-4" />
                    <span>Duration: <strong className="text-white">{roadmap.totalDuration}</strong></span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-3 text-center">
                    <p className="text-2xl font-black">{roadmap.phases?.length || 0}</p>
                    <p className="text-xs text-white/80">Phases</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-3 text-center">
                    <p className="text-2xl font-black">{selectedTimeframe.icon}</p>
                    <p className="text-xs text-white/80">{timeframe}</p>
                  </div>
                </div>
              </div>
              {/* Progress line */}
              <div className="relative mt-5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="absolute h-full w-1/4 bg-white/70 rounded-full animate-pulse" />
              </div>
              <p className="text-xs text-white/60 mt-1.5">Start your journey</p>
            </div>

            {/* Phases */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FiLayers className="w-5 h-5 text-cyan-600" />
                <h3 className="font-bold text-lg text-gray-900">Learning Phases</h3>
                <span className="ml-auto badge bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200">
                  {roadmap.phases?.length} phases
                </span>
              </div>

              {/* Timeline */}
              <div className="relative">
                {/* vertical connector line */}
                <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-cyan-300 via-blue-300 to-indigo-300 hidden sm:block" />

                <div className="space-y-4">
                  {roadmap.phases?.map((phase, idx) => {
                    const c = PHASE_COLORS[idx % PHASE_COLORS.length];
                    const isOpen = expandedPhase === idx;
                    return (
                      <div
                        key={idx}
                        className="relative"
                        style={{ animation: `fadeInUp 0.4s ease-out ${idx * 80}ms both` }}
                      >
                        {/* dot on timeline */}
                        <div className={`absolute left-3.5 top-5 w-3 h-3 rounded-full bg-gradient-to-br ${c.bg} border-2 border-white shadow-md hidden sm:block z-10`} />

                        <div className={`sm:ml-12 bg-white/90 backdrop-blur rounded-2xl border-2 ${isOpen ? c.border : 'border-gray-100'} shadow-sm overflow-hidden transition-all duration-300`}>
                          <button
                            className="w-full text-left flex items-center justify-between p-5 group"
                            onClick={() => setExpandedPhase(isOpen ? null : idx)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 bg-gradient-to-br ${c.bg} rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm`}>
                                {phase.phase}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 group-hover:text-gray-700 transition-colors">{phase.title}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <FiClock className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">{phase.duration}</span>
                                  {phase.topics?.length > 0 && (
                                    <span className={`badge ${c.light} ${c.text} ring-1 ${c.ring} ml-1`}>
                                      {phase.topics.length} topics
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${isOpen ? `bg-gradient-to-br ${c.bg} text-white` : 'bg-gray-100 text-gray-400'}`}>
                              {isOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                            </div>
                          </button>

                          {isOpen && (
                            <div className="px-5 pb-5 pt-0 border-t border-gray-100 space-y-4" style={{ animation: 'fadeInUp 0.3s ease-out both' }}>

                              {/* Topics */}
                              <div className="pt-4">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                  <FiBook className="w-3.5 h-3.5" /> Topics to cover
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {phase.topics?.map(t => (
                                    <span key={t} className={`px-3 py-1 rounded-full text-xs font-semibold ${c.light} ${c.text} ring-1 ${c.ring}`}>
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Resources */}
                              {phase.resources?.length > 0 && (
                                <div>
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Resources</p>
                                  <div className="grid gap-2">
                                    {phase.resources.map((r, ri) => (
                                      <div key={ri} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                        <span className="text-lg">{resourceTypeIcon[r.type] || '📌'}</span>
                                        <span className="text-sm text-gray-700 flex-1">{r.name}</span>
                                        {r.free && (
                                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">Free</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Milestone */}
                              {phase.milestone && (
                                <div className={`flex items-start gap-3 ${c.light} rounded-xl p-4 border ${c.border.replace('border-', 'border-')}/30`}>
                                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c.bg} flex items-center justify-center flex-shrink-0`}>
                                    <FiCheckCircle className="w-4 h-4 text-white" />
                                  </div>
                                  <div>
                                    <p className={`text-xs font-bold ${c.text} mb-0.5 uppercase tracking-wide`}>Milestone</p>
                                    <p className="text-sm text-gray-700">{phase.milestone}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tools & Tips side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Tools */}
              {roadmap.tools?.length > 0 && (
                <div className="bg-white/90 backdrop-blur rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <FiCode className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900">Essential Tools</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {roadmap.tools.map(t => (
                      <span key={t} className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200 hover:bg-cyan-100 transition-colors">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {roadmap.tips?.length > 0 && (
                <div className="bg-white/90 backdrop-blur rounded-2xl border border-amber-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <FiStar className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900">Pro Tips</h4>
                  </div>
                  <ul className="space-y-2.5">
                    {roadmap.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* CTA - generate new */}
            <div className="flex justify-center pb-4">
              <button
                type="button"
                onClick={() => { setRoadmap(null); setGoal(''); }}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-cyan-600 transition-colors px-4 py-2 rounded-xl hover:bg-cyan-50"
              >
                <FiTrendingUp className="w-4 h-4" /> Generate a new roadmap
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default SkillRoadmap;
