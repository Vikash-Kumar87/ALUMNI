import React, { useEffect, useRef, useState } from 'react';
import { discussionAPI } from '../services/api';
import { Discussion } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  FiMessageSquare, FiThumbsUp, FiSend, FiPlus, FiX, FiChevronDown, FiChevronUp, FiTag
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

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

  useEffect(() => {
    fetchDiscussions();
  }, []);

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
  }, [loading, discussions]);

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
      toast.success('Question posted!');
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this discussion?')) return;
    try {
      await discussionAPI.delete(id);
      setDiscussions(prev => prev.filter(d => d.id !== id));
      toast.success('Deleted');
    } catch (err) { toast.error((err as Error).message || 'Failed to delete'); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="section-title">Discussion <span className="text-gradient">Forum</span></h1>
          <p className="section-subtitle">Ask questions, share knowledge, get help from the community</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-gradient flex items-center gap-2 shrink-0">
          {showNew ? <><FiX className="w-4 h-4" /> Cancel</> : <><FiPlus className="w-4 h-4" /> Ask Question</>}
        </button>
      </div>

      {/* New Question Form */}
      {showNew && (
        <div className="card card-accent mb-6 animate-slide-up">
          <h3 className="font-semibold mb-3">Post a New Question</h3>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="What's your technical question?"
            className="input mb-3"
            rows={3}
          />
          <div className="flex items-center gap-2 mb-4">
            <FiTag className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="Tags: React, Python, AWS... (comma separated)"
              className="input"
            />
          </div>
          <button onClick={handlePost} disabled={posting} className="btn-primary flex items-center gap-2">
            <FiSend className="w-4 h-4" /> {posting ? 'Posting...' : 'Post Question'}
          </button>
        </div>
      )}

      {/* Discussions */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : discussions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiMessageSquare className="w-14 h-14 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No discussions yet</p>
          <p className="text-sm">Be the first to ask a question!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {discussions.map(d => {
            const isExpanded = expandedId === d.id;
            const hasUpvoted = d.upvotedBy?.includes(userProfile?.uid || '');

            return (
              <div key={d.id} className="card card-hover-glow animate-on-scroll" style={{ transitionDelay: `${Math.min(discussions.indexOf(d), 7) * 60}ms` }}>
                <div className="flex items-start gap-3">
                  {/* Upvote */}
                  <div className="flex flex-col items-center pt-1">
                    <button
                      onClick={() => handleUpvote(d.id)}
                      className={`p-1.5 rounded-lg transition-all duration-200 ${
                        hasUpvoted
                          ? 'text-primary-600 bg-primary-50 scale-110'
                          : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50 hover:scale-110'
                      }`}
                    >
                      <FiThumbsUp className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-medium text-gray-600 mt-0.5">{d.upvotes}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 leading-snug mb-2">{d.question}</h3>

                    {d.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {d.tags.map(t => <span key={t} className="chip-gray text-xs px-2 py-0.5">{t}</span>)}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                      <span>by {d.postedByName}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}</span>
                      <span>·</span>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : d.id)}
                        className="text-primary-600 font-medium flex items-center gap-0.5"
                      >
                        <FiMessageSquare className="w-3.5 h-3.5" />
                        {d.answers?.length || 0} answers
                        {isExpanded ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Answers */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 pt-3 space-y-3">
                        {d.answers?.length > 0 ? (
                          d.answers.map(a => {
                            const ansHasUpvoted = a.upvotedBy?.includes(userProfile?.uid || '');
                            return (
                              <div key={a.id} className="bg-gray-50 rounded-lg p-3">
                                <p className="text-sm text-gray-800 mb-2">{a.answer}</p>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span className={`badge ${a.answeredByRole === 'alumni' ? 'badge-green' : 'badge-blue'}`}>
                                      {a.answeredByRole}
                                    </span>
                                    <span>{a.answeredByName}</span>
                                    <span>·</span>
                                    <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                                  </div>
                                  <button
                                    onClick={() => handleUpvoteAnswer(d.id, a.id)}
                                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${ansHasUpvoted ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-primary-600'}`}
                                  >
                                    <FiThumbsUp className="w-3.5 h-3.5" /> {a.upvotes}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-gray-400 text-center py-2">No answers yet — be the first!</p>
                        )}

                        {/* Answer input */}
                        <div className="flex gap-2 pt-2">
                          <textarea
                            value={answerMap[d.id] || ''}
                            onChange={e => setAnswerMap(prev => ({ ...prev, [d.id]: e.target.value }))}
                            placeholder="Write your answer..."
                            className="input flex-1 resize-none"
                            rows={2}
                          />
                          <button
                            onClick={() => handleAnswer(d.id)}
                            disabled={answeringId === d.id}
                            className="btn-primary self-end px-4"
                          >
                            {answeringId === d.id ? '...' : <FiSend className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delete (author only) */}
                  {d.postedBy === userProfile?.uid && (
                    <button onClick={() => handleDelete(d.id)} className="text-gray-300 hover:text-red-500 p-1">
                      <FiX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DiscussionForum;
