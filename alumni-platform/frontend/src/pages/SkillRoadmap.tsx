import React, { useState } from 'react';
import { aiAPI } from '../services/api';
import { Roadmap } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  FiMap, FiTarget, FiClock, FiBook, FiCheckCircle, FiChevronDown, FiChevronUp, FiStar, FiZap
} from 'react-icons/fi';

const POPULAR_GOALS = [
  'Full Stack Web Developer',
  'Data Scientist',
  'Machine Learning Engineer',
  'DevOps Engineer',
  'Mobile App Developer',
  'Cybersecurity Engineer',
  'Cloud Architect',
  'Backend Engineer',
];

const TIMEFRAMES = ['3 months', '6 months', '1 year', '2 years'];

const resourceTypeIcon: Record<string, string> = {
  video: '🎬',
  course: '📚',
  article: '📄',
  book: '📖',
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="icon-box w-11 h-11 bg-gradient-to-br from-cyan-500 to-blue-600">
          <FiMap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Skill Roadmap</h1>
          <p className="text-sm text-gray-500">Powered by Groq AI · Get a personalised learning path</p>
        </div>
      </div>

      {/* Form */}
      <div className="card mb-8">
        <form onSubmit={handleGenerate} className="space-y-5">
          <div>
            <label className="label">Your Career Goal</label>
            <input
              type="text"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              className="input"
              placeholder="e.g. Full Stack Web Developer, Data Scientist..."
              required
            />
          </div>

          {/* Popular goals */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">Popular goals:</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_GOALS.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGoal(g)}
                  className={goal === g ? 'chip chip-active text-xs' : 'chip chip-gray text-xs'}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Available Timeframe</label>
            <div className="flex gap-3 flex-wrap">
              {TIMEFRAMES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeframe(t)}
                  className={timeframe === t ? 'chip chip-active' : 'chip chip-gray'}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {currentSkills.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Your current skills (auto-detected from profile):</p>
              <div className="flex flex-wrap gap-1.5">
                {currentSkills.map(s => (
                  <span key={s} className="badge-blue text-xs">{s}</span>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !goal.trim()}
            className="btn-gradient w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating AI Roadmap...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <FiZap className="w-4 h-4" /> Generate My Roadmap
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Roadmap output */}
      {loading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" text="AI is crafting your personalised roadmap..." />
        </div>
      )}

      {roadmap && !loading && (
        <div className="animate-fade-in-up space-y-6">
          {/* Summary */}
          <div className="card bg-gradient-to-br from-primary-50 to-violet-50 border-primary-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{roadmap.title}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FiClock className="w-4 h-4" />
                  <span>Total duration: <strong className="text-primary-700">{roadmap.totalDuration}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm border border-primary-100">
                <FiTarget className="w-4 h-4 text-primary-600" />
                <span className="text-sm font-semibold text-primary-700">{roadmap.phases?.length || 0} Phases</span>
              </div>
            </div>
          </div>

          {/* Phases */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FiMap className="w-5 h-5 text-primary-600" />
              <h3 className="font-bold text-lg text-gray-900">Learning Phases</h3>
            </div>

            {roadmap.phases?.map((phase, idx) => (
              <div key={idx} className="card border-l-4 border-primary-500 overflow-hidden">
                <button
                  className="w-full text-left flex items-center justify-between"
                  onClick={() => setExpandedPhase(expandedPhase === idx ? null : idx)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-violet-600 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {phase.phase}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{phase.title}</p>
                      <div className="flex items-center gap-2">
                        <FiClock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{phase.duration}</span>
                      </div>
                    </div>
                  </div>
                  {expandedPhase === idx
                    ? <FiChevronUp className="w-4 h-4 text-gray-400" />
                    : <FiChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {expandedPhase === idx && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-slide-up">
                    {/* Topics */}
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Topics to cover</p>
                      <div className="flex flex-wrap gap-2">
                        {phase.topics?.map(t => (
                          <span key={t} className="badge bg-blue-50 text-blue-700 ring-1 ring-blue-100">{t}</span>
                        ))}
                      </div>
                    </div>

                    {/* Resources */}
                    {phase.resources?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Resources</p>
                        <div className="space-y-1.5">
                          {phase.resources.map((r, ri) => (
                            <div key={ri} className="flex items-center gap-2 text-sm">
                              <span>{resourceTypeIcon[r.type] || '📌'}</span>
                              <span className="text-gray-700">{r.name}</span>
                              {r.free && (
                                <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 text-xs">Free</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Milestone */}
                    {phase.milestone && (
                      <div className="bg-green-50 rounded-lg p-3 flex items-start gap-2">
                        <FiCheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-green-800 mb-0.5">Milestone</p>
                          <p className="text-sm text-green-700">{phase.milestone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tools */}
          {roadmap.tools?.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <FiBook className="w-4 h-4 text-primary-600" />
                <h4 className="font-semibold text-gray-900">Essential Tools & Technologies</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {roadmap.tools.map(t => (
                  <span key={t} className="badge-purple">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {roadmap.tips?.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <FiStar className="w-4 h-4 text-amber-500" />
                <h4 className="font-semibold text-gray-900">Pro Tips</h4>
              </div>
              <ul className="space-y-2">
                {roadmap.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-amber-500 mt-0.5 font-bold">✦</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SkillRoadmap;
