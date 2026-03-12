import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { discussionAPI, aiAPI } from '../services/api';
import { Discussion } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiMessageSquare, FiThumbsUp, FiSend, FiPlus, FiX, FiChevronDown, FiChevronUp,
  FiTag, FiUser, FiClock, FiZap, FiExternalLink, FiBookOpen, FiCheckCircle,
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

interface AiDiscussionResult {
  answer: string;
  keyPoints: string[];
  resources: { title: string; url: string; type: string }[];
  confidence: 'high' | 'medium' | 'low';
}

const RESOURCE_ICONS: Record<string, string> = { docs: '📄', article: '📰', video: '🎬', course: '🎓' };

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const TAG_COLORS = [
  'bg-violet-100 text-violet-700 border border-violet-200',
  'bg-cyan-100 text-cyan-700 border border-cyan-200',
  'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'bg-rose-100 text-rose-700 border border-rose-200',
  'bg-amber-100 text-amber-700 border border-amber-200',
  'bg-indigo-100 text-indigo-700 border border-indigo-200',
];

const SkeletonCard = () => (
  <div className="bg-white/80 rounded-2xl p-5 border border-gray-100 shadow-sm">
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-1 pt-1">
        <div className="w-8 h-8 rounded-xl skeleton" />
        <div className="w-6 h-3 rounded skeleton" />
      </div>
      <div className="flex-1 space-y-3">
        <div className="h-4 w-4/5 rounded skeleton" />
        <div className="flex gap-2">
          <div className="h-4 w-14 rounded-full skeleton" />
          <div className="h-4 w-14 rounded-full skeleton" />
        </div>
        <div className="flex gap-3">
          <div className="h-3 w-20 rounded skeleton" />
          <div className="h-3 w-24 rounded skeleton" />
        </div>
      </div>
    </div>
  </div>
);

const DiscussionForum: React.FC = () => {
  const { userProfile } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [question, setQuestion] = useState('');
  const [tags, setTags] = useState('');
  const [posting, setPosting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [aiAnswerMap, setAiAnswerMap] = useState<Record<string, AiDiscussionResult | null>>({});
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);

  useEffect(() => { fetchDiscussions(); }, []);

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      const res = await discussionAPI.getAll();
      setDiscussions(res.data.discussions as Discussion[]);
    } catch { } finally { setLoading(false); }
  };

  const handlePost = async () => {
    if (!question.trim()) { toast.error('Please enter a question'); return; }
    setPosting(true);
    try {
      await discussionAPI.create({ question, tags: tags.split(',').map(t => t.trim()).filter(Boolean) });
      toast.success('Question posted! 🎉');
      setQuestion(''); setTags(''); setShowNew(false);
      await fetchDiscussions();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to post question');
    } finally { setPosting(false); }
  };

  const handleAnswer = async (id: string) => {
    const ans = answerMap[id];
    if (!ans?.trim()) { toast.error('Please write an answer'); return; }
    setAnsweringId(id);
    try {
      await discussionAPI.answer(id, ans);
      toast.success('Answer posted!');
      setAnswerMap(prev => ({ ...prev, [id]: '' }));
      await fetchDiscussions();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to post answer');
    } finally { setAnsweringId(null); }
  };

  const handleUpvote = async (id: string) => {
    try {
      await discussionAPI.upvote(id);
      setDiscussions(prev => prev.map(d => {
        if (d.id !== id) return d;
        const hasVoted = d.upvotedBy?.includes(userProfile!.uid);
        return {
          ...d,
          upvotes: hasVoted ? d.upvotes - 1 : d.upvotes + 1,
          upvotedBy: hasVoted
            ? (d.upvotedBy || []).filter(u => u !== userProfile!.uid)
            : [...(d.upvotedBy || []), userProfile!.uid],
        };
      }));
    } catch { }
  };

  const handleUpvoteAnswer = async (discId: string, answerId: string) => {
    try {
      await discussionAPI.upvoteAnswer(discId, answerId);
      setDiscussions(prev => prev.map(d => {
        if (d.id !== discId) return d;
        const answers = d.answers.map(a => {
          if (a.id !== answerId) return a;
          const hasVoted = a.upvotedBy?.includes(userProfile!.uid);
          return {
            ...a,
            upvotes: hasVoted ? a.upvotes - 1 : a.upvotes + 1,
            upvotedBy: hasVoted ? a.upvotedBy.filter(u => u !== userProfile!.uid) : [...(a.upvotedBy || []), userProfile!.uid],
          };
        });
        return { ...d, answers };
      }));
    } catch { }
  };

  const handleAskAI = async (d: Discussion) => {
    if (aiAnswerMap[d.id]) { setAiAnswerMap(prev => ({ ...prev, [d.id]: null })); return; }
    setAiLoadingId(d.id);
    if (expandedId !== d.id) setExpandedId(d.id);
    try {
      const res = await aiAPI.discussionAnswer(d.question, d.tags || []);
      setAiAnswerMap(prev => ({ ...prev, [d.id]: res.data.result }));
    } catch (err) {
      toast.error((err as Error).message || 'AI failed to answer. Try again.');
    } finally {
      setAiLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this discussion?')) return;
    try {
      await discussionAPI.delete(id);
      setDiscussions(prev => prev.filter(d => d.id !== id));
      toast.success('Deleted');
    } catch (err) { toast.error((err as Error).message || 'Failed to delete'); }
  };

  const totalAnswers = discussions.reduce((sum, d) => sum + (d.answers?.length || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/20 to-violet-50/30 relative overflow-x-hidden">
      {/* Aurora blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="aurora-blob w-[500px] h-[500px] bg-pink-300/20 -top-32 -right-32" style={{ animationDelay: '0s' }} />
        <div className="aurora-blob w-[400px] h-[400px] bg-violet-300/20 top-1/2 -left-24" style={{ animationDelay: '5s' }} />
        <div className="aurora-blob w-[350px] h-[350px] bg-fuchsia-300/15 bottom-0 right-1/3" style={{ animationDelay: '10s' }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden mb-8" style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
          <div className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 px-8 py-10">
            <div className="absolute inset-0 opacity-10 text-[120px] flex items-center justify-end pr-8 select-none pointer-events-none">
              💬
            </div>
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">💬</span>
                  <h1 className="text-3xl font-bold text-white">
                    Discussion <span className="text-yellow-300">Forum</span>
                  </h1>
                </div>
                <p className="text-pink-100 text-sm mb-4">Ask questions, share knowledge, get help from the community</p>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{discussions.length}</div>
                    <div className="text-xs text-pink-200">Questions</div>
                  </div>
                  <div className="w-px bg-white/20" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-300">{totalAnswers}</div>
                    <div className="text-xs text-pink-200">Answers</div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowNew(!showNew)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300"
                style={{
                  background: showNew ? 'rgba(255,255,255,0.15)' : 'white',
                  color: showNew ? 'white' : '#a21caf',
                  backdropFilter: 'blur(8px)',
                  boxShadow: showNew ? 'none' : '0 4px 24px rgba(0,0,0,0.15)',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {showNew ? <><FiX className="w-4 h-4" /> Cancel</> : <><FiPlus className="w-4 h-4" /> Ask Question</>}
              </button>
            </div>
          </div>
        </div>

        {/* New Question Form */}
        {showNew && (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-pink-100 shadow-xl p-6 mb-6" style={{ animation: 'fadeInUp 0.4s ease-out both' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
                <FiMessageSquare className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Post a New Question</h3>
            </div>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="What's your technical question? Be specific for better answers..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all resize-none mb-3"
              rows={4}
            />
            <div className="flex items-center gap-2 mb-4 bg-gray-50 rounded-xl px-3.5 py-2.5 border border-gray-200 focus-within:ring-2 focus-within:ring-violet-300 focus-within:border-transparent transition-all">
              <FiTag className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="Tags: React, Python, AWS... (comma separated)"
                className="flex-1 bg-transparent text-sm focus:outline-none text-gray-700 placeholder-gray-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{question.length} characters</p>
              <button
                onClick={handlePost}
                disabled={posting || !question.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                  boxShadow: posting ? 'none' : '0 4px 16px rgba(168,85,247,0.4)',
                }}
              >
                {posting ? (
                  <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"/></svg> Posting...</>
                ) : (
                  <><FiSend className="w-4 h-4" /> Post Question</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Discussions */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : discussions.length === 0 ? (
          <div className="text-center py-20" style={{ animation: 'fadeInUp 0.5s ease-out both' }}>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-violet-100 flex items-center justify-center mx-auto mb-4">
              <FiMessageSquare className="w-8 h-8 text-violet-400" />
            </div>
            <p className="text-gray-600 font-semibold text-lg">No discussions yet</p>
            <p className="text-gray-400 text-sm mt-1">Be the first to ask a question!</p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)', boxShadow: '0 4px 16px rgba(168,85,247,0.35)' }}
            >
              <FiPlus className="w-4 h-4" /> Ask First Question
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {discussions.map((d, i) => {
              const isExpanded = expandedId === d.id;
              const hasUpvoted = d.upvotedBy?.includes(userProfile?.uid || '');

              return (
                <div
                  key={d.id}
                  className="bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300"
                  style={{
                    animation: `fadeInUp 0.45s ease-out ${Math.min(i, 7) * 65}ms both`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(168,85,247,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
                >
                  {/* Left accent bar */}
                  <div className="flex">
                    <div className="w-1 shrink-0 bg-gradient-to-b from-pink-400 to-violet-500" />

                    <div className="flex-1 p-5">
                      <div className="flex items-start gap-3">
                        {/* Upvote column */}
                        <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                          <button
                            onClick={() => handleUpvote(d.id)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                            style={hasUpvoted ? {
                              background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                              color: 'white',
                              boxShadow: '0 2px 10px rgba(168,85,247,0.4)',
                              transform: 'scale(1.1)',
                            } : {
                              background: '#f3f4f6',
                              color: '#9ca3af',
                            }}
                            onMouseEnter={e => { if (!hasUpvoted) { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.color = '#7c3aed'; }}}
                            onMouseLeave={e => { if (!hasUpvoted) { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#9ca3af'; }}}
                          >
                            <FiThumbsUp className="w-4 h-4" />
                          </button>
                          <span className={`text-xs font-bold ${hasUpvoted ? 'text-violet-600' : 'text-gray-500'}`}>{d.upvotes}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 leading-snug mb-2 text-sm">{d.question}</h3>

                          {d.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2.5">
                              {d.tags.map((t, ti) => (
                                <span key={t} className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${TAG_COLORS[ti % TAG_COLORS.length]}`}>
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <FiUser className="w-3 h-3" />{d.postedByName}
                            </span>
                            <span className="flex items-center gap-1">
                              <FiClock className="w-3 h-3" />{formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                            </span>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : d.id)}
                              className="flex items-center gap-1 font-semibold transition-colors"
                              style={{ color: isExpanded ? '#a855f7' : '#6b7280' }}
                            >
                              <FiMessageSquare className="w-3.5 h-3.5" />
                              {d.answers?.length || 0} {d.answers?.length === 1 ? 'answer' : 'answers'}
                              {isExpanded ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            {/* Ask AI button */}
                            <motion.button
                              onClick={() => handleAskAI(d)}
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              disabled={aiLoadingId === d.id}
                              className="flex items-center gap-1 font-bold px-2.5 py-1 rounded-full transition-all disabled:opacity-70"
                              style={aiAnswerMap[d.id]
                                ? { background: '#ede9fe', color: '#7c3aed' }
                                : { background: 'linear-gradient(135deg,#f0abfc,#818cf8)', color: 'white', boxShadow: '0 2px 10px rgba(129,140,248,0.4)' }
                              }
                            >
                              {aiLoadingId === d.id
                                ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                : <FiZap className="w-3 h-3" />
                              }
                              {aiAnswerMap[d.id] ? 'Hide AI' : 'Ask AI'}
                            </motion.button>
                          </div>

                          {/* Answers Panel */}
                          {isExpanded && (
                            <div className="mt-4 border-t border-gray-100 pt-4 space-y-3" style={{ animation: 'fadeInUp 0.3s ease-out both' }}>

                              {/* AI Loading shimmer */}
                              <AnimatePresence>
                                {aiLoadingId === d.id && (
                                  <motion.div
                                    key="ai-loading"
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                    className="rounded-2xl overflow-hidden border border-violet-200"
                                    style={{ background: 'linear-gradient(135deg,#f5f3ff,#eef2ff)' }}
                                  >
                                    <div className="flex items-center gap-3 px-4 py-3 border-b border-violet-100">
                                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#a78bfa,#818cf8)' }}>
                                        <FiZap className="w-3.5 h-3.5 text-white" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-xs font-bold text-violet-700">AI is thinking…</p>
                                        <p className="text-[10px] text-violet-400">Searching knowledge base &amp; resources</p>
                                      </div>
                                      <div className="flex items-end gap-0.5 h-5">
                                        {[0.1,0.2,0.3,0.2,0.1].map((d, i) => (
                                          <motion.div key={i} className="w-1 rounded-full bg-violet-400"
                                            animate={{ height: ['4px','14px','4px'] }}
                                            transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                    <div className="p-4 space-y-2">
                                      {[1,0.7,0.5].map((w, i) => (
                                        <div key={i} className="h-3 rounded-full skeleton" style={{ width: `${w*100}%`, opacity: 1-i*0.2 }} />
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* AI Answer Panel */}
                              <AnimatePresence>
                                {aiAnswerMap[d.id] && (
                                  <motion.div
                                    key="ai-answer"
                                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.4 }}
                                    className="rounded-2xl overflow-hidden border border-violet-200"
                                    style={{ background: 'linear-gradient(135deg,#faf5ff,#eef2ff)' }}
                                  >
                                    {/* Header */}
                                    <div className="flex items-center gap-3 px-4 py-3 border-b border-violet-100" style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(99,102,241,0.08))' }}>
                                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 2px 10px rgba(139,92,246,0.4)' }}>
                                        <FiZap className="w-3.5 h-3.5 text-white" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-xs font-bold text-violet-800">AI Answer</p>
                                        <p className="text-[10px] text-violet-400">Instant response · Waiting for human experts too</p>
                                      </div>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        aiAnswerMap[d.id]!.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                                        aiAnswerMap[d.id]!.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                                        'bg-gray-100 text-gray-500'
                                      }`}>
                                        {aiAnswerMap[d.id]!.confidence} confidence
                                      </span>
                                    </div>

                                    {/* Answer body */}
                                    <div className="px-4 pt-3 pb-2">
                                      <p className="text-sm text-gray-700 leading-relaxed">{aiAnswerMap[d.id]!.answer}</p>
                                    </div>

                                    {/* Key points */}
                                    {aiAnswerMap[d.id]!.keyPoints?.length > 0 && (
                                      <div className="px-4 pt-1 pb-3">
                                        <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-2">Key Takeaways</p>
                                        <motion.ul variants={stagger} initial="hidden" animate="show" className="space-y-1.5">
                                          {aiAnswerMap[d.id]!.keyPoints.map((kp, ki) => (
                                            <motion.li key={ki} variants={fadeUp} className="flex items-start gap-2 text-xs text-gray-700">
                                              <FiCheckCircle className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                                              {kp}
                                            </motion.li>
                                          ))}
                                        </motion.ul>
                                      </div>
                                    )}

                                    {/* Resources */}
                                    {aiAnswerMap[d.id]!.resources?.length > 0 && (
                                      <div className="px-4 pb-4 border-t border-violet-100 pt-3">
                                        <div className="flex items-center gap-1.5 mb-2">
                                          <FiBookOpen className="w-3.5 h-3.5 text-violet-500" />
                                          <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">Cited Resources</p>
                                        </div>
                                        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
                                          {aiAnswerMap[d.id]!.resources.map((r, ri) => (
                                            <motion.a
                                              key={ri} variants={fadeUp}
                                              href={r.url} target="_blank" rel="noopener noreferrer"
                                              whileHover={{ x: 3 }}
                                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-violet-700 transition-all group"
                                              style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.12)' }}
                                            >
                                              <span className="text-sm">{RESOURCE_ICONS[r.type] ?? '🔗'}</span>
                                              <span className="flex-1 truncate">{r.title}</span>
                                              <FiExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                            </motion.a>
                                          ))}
                                        </motion.div>
                                      </div>
                                    )}

                                    {/* Waiting note */}
                                    <div className="mx-4 mb-4 px-3 py-2 rounded-xl text-[11px] text-amber-700 font-medium flex items-center gap-2" style={{ background: '#fef9c3', border: '1px solid #fde68a' }}>
                                      <span>⏳</span>
                                      Human experts from the community can still provide richer, experience-based answers below.
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              {d.answers?.length > 0 ? (
                                d.answers.map((a, ai) => {
                                  const ansHasUpvoted = a.upvotedBy?.includes(userProfile?.uid || '');
                                  return (
                                    <div
                                      key={a.id}
                                      className="rounded-xl p-3.5 border transition-all duration-200"
                                      style={{
                                        background: a.answeredByRole === 'alumni' ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : '#f8fafc',
                                        borderColor: a.answeredByRole === 'alumni' ? '#bbf7d0' : '#e2e8f0',
                                        animation: `fadeInUp 0.3s ease-out ${ai * 50}ms both`,
                                      }}
                                    >
                                      <p className="text-sm text-gray-800 leading-relaxed mb-2.5">{a.answer}</p>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                            style={a.answeredByRole === 'alumni'
                                              ? { background: '#dcfce7', color: '#16a34a' }
                                              : { background: '#dbeafe', color: '#2563eb' }
                                            }
                                          >
                                            {a.answeredByRole}
                                          </span>
                                          <span className="text-xs text-gray-500">{a.answeredByName}</span>
                                          <span className="text-xs text-gray-400">·</span>
                                          <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                                        </div>
                                        <button
                                          onClick={() => handleUpvoteAnswer(d.id, a.id)}
                                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-all duration-200"
                                          style={ansHasUpvoted
                                            ? { background: '#ede9fe', color: '#7c3aed' }
                                            : { background: '#f3f4f6', color: '#9ca3af' }
                                          }
                                        >
                                          <FiThumbsUp className="w-3 h-3" /> {a.upvotes}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-center py-4">
                                  <p className="text-sm text-gray-400">No answers yet — be the first to help!</p>
                                </div>
                              )}

                              {/* Answer input */}
                              <div className="flex gap-2 pt-1">
                                <textarea
                                  value={answerMap[d.id] || ''}
                                  onChange={e => setAnswerMap(prev => ({ ...prev, [d.id]: e.target.value }))}
                                  placeholder="Share your knowledge or experience..."
                                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all resize-none"
                                  rows={2}
                                />
                                <button
                                  onClick={() => handleAnswer(d.id)}
                                  disabled={answeringId === d.id}
                                  className="self-end w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 transition-all duration-200 disabled:opacity-60"
                                  style={{
                                    background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                                    boxShadow: '0 2px 10px rgba(168,85,247,0.4)',
                                  }}
                                >
                                  {answeringId === d.id
                                    ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"/></svg>
                                    : <FiSend className="w-4 h-4" />
                                  }
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Delete button */}
                        {d.postedBy === userProfile?.uid && (
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 shrink-0 transition-all duration-200"
                          >
                            <FiX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscussionForum;
