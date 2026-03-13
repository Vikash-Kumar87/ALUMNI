import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiAward,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiMessageSquare,
  FiStar,
  FiTarget,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import { leaderboardAPI } from '../services/api';
import { HelpfulAlumniLeaderboardEntry } from '../types';

const medalStyles = [
  'from-amber-400 to-yellow-500',
  'from-slate-300 to-slate-400',
  'from-orange-400 to-amber-600',
];

const HelpfulAlumniLeaderboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<HelpfulAlumniLeaderboardEntry[]>([]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await leaderboardAPI.getHelpfulAlumni();
      setEntries(res.data.leaderboard || []);
    } catch (error) {
      console.error('Failed to load helpful alumni leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const topThree = entries.slice(0, 3);
  const remaining = entries.slice(3);

  const communityStats = useMemo(() => {
    const totalMentorships = entries.reduce((sum, e) => sum + e.metrics.mentorshipAccepted, 0);
    const totalAnswers = entries.reduce((sum, e) => sum + e.metrics.discussionAnswers, 0);
    const totalReferrals = entries.reduce((sum, e) => sum + e.metrics.referralsSuccessful, 0);
    return { totalMentorships, totalAnswers, totalReferrals };
  }, [entries]);

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-rose-600 to-fuchsia-700 text-white">
        <div className="absolute -top-24 -left-10 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 right-0 w-72 h-72 rounded-full bg-black/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-100">Community Impact Board</p>
            <h1 className="mt-2 text-3xl sm:text-5xl font-black">Most Helpful Alumni Leaderboard</h1>
            <p className="mt-3 text-rose-100 max-w-2xl text-sm sm:text-base">
              Celebrating alumni who actively mentor, answer questions, host events, and unlock referral opportunities.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <div className="rounded-2xl bg-white/15 border border-white/20 p-4 backdrop-blur-md">
              <FiUsers className="w-4 h-4 text-rose-100" />
              <p className="mt-2 text-2xl font-black">{communityStats.totalMentorships}</p>
              <p className="text-xs uppercase tracking-wider text-rose-100">Mentorships Accepted</p>
            </div>
            <div className="rounded-2xl bg-white/15 border border-white/20 p-4 backdrop-blur-md">
              <FiMessageSquare className="w-4 h-4 text-rose-100" />
              <p className="mt-2 text-2xl font-black">{communityStats.totalAnswers}</p>
              <p className="text-xs uppercase tracking-wider text-rose-100">Forum Answers</p>
            </div>
            <div className="rounded-2xl bg-white/15 border border-white/20 p-4 backdrop-blur-md">
              <FiCheckCircle className="w-4 h-4 text-rose-100" />
              <p className="mt-2 text-2xl font-black">{communityStats.totalReferrals}</p>
              <p className="text-xs uppercase tracking-wider text-rose-100">Referral Successes</p>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 rounded-3xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
            <FiAward className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="mt-4 text-2xl font-black text-slate-900">No leaderboard data yet</h3>
            <p className="mt-2 text-slate-500">Once alumni contributions grow, rankings will appear here.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-7">
              {topThree.map((entry, idx) => (
                <motion.article
                  key={entry.uid}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.08 }}
                  className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
                >
                  <div className={`h-24 bg-gradient-to-r ${medalStyles[idx] || 'from-slate-400 to-slate-500'}`} />
                  <div className="px-6 pb-6 -mt-8">
                    <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-md grid place-items-center text-slate-700 font-black text-xl">
                      {entry.avatar ? (
                        <img src={entry.avatar} alt={entry.name} className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        entry.name?.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-[0.16em] font-bold">Rank #{entry.rank}</p>
                        <h3 className="text-xl font-black text-slate-900">{entry.name}</h3>
                        <p className="text-sm text-slate-500">{entry.jobRole || 'Alumni'} {entry.company ? `• ${entry.company}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-slate-900">{entry.score}</p>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Impact Score</p>
                      </div>
                    </div>

                    {entry.badges.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {entry.badges.map(badge => (
                          <span key={badge} className="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700">
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900">Leaderboard Rankings</h2>
                <div className="inline-flex items-center gap-2 text-xs text-slate-500 uppercase tracking-[0.14em] font-bold">
                  <FiBarChart2 className="w-4 h-4" />
                  Contribution Metrics
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {entries.map((entry, idx) => (
                  <motion.div
                    key={entry.uid}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.02 }}
                    className="px-6 py-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-black grid place-items-center">#{entry.rank}</div>
                        <div className="min-w-0">
                          <h3 className="font-black text-slate-900 truncate">{entry.name}</h3>
                          <p className="text-sm text-slate-500 truncate">{entry.jobRole || 'Alumni'} {entry.company ? `• ${entry.company}` : ''}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2">
                          <p className="text-slate-400">Mentors</p>
                          <p className="font-bold text-slate-700">{entry.metrics.mentorshipAccepted}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2">
                          <p className="text-slate-400">Answers</p>
                          <p className="font-bold text-slate-700">{entry.metrics.discussionAnswers}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2">
                          <p className="text-slate-400">Upvotes</p>
                          <p className="font-bold text-slate-700">{entry.metrics.answerUpvotes}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2">
                          <p className="text-slate-400">Ref Success</p>
                          <p className="font-bold text-slate-700">{entry.metrics.referralsSuccessful}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2">
                          <p className="text-slate-400">Ref Handled</p>
                          <p className="font-bold text-slate-700">{entry.metrics.referralsHandled}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2">
                          <p className="text-slate-400">Ref Jobs</p>
                          <p className="font-bold text-slate-700">{entry.metrics.referralJobsPosted}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2">
                          <p className="text-slate-400">Events</p>
                          <p className="font-bold text-slate-700">{entry.metrics.eventsHosted}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(5, Math.round((entry.score / Math.max(entries[0].score || 1, 1)) * 100)))}%` }}
                          transition={{ duration: 0.45 }}
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500"
                        />
                      </div>
                      <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-2">
                        <FiTrendingUp className="w-3.5 h-3.5" />
                        Score {entry.score}
                        {entry.metrics.referralsSuccessful > 0 && (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <FiTarget className="w-3.5 h-3.5" /> {entry.metrics.referralsSuccessful} wins
                          </span>
                        )}
                        {entry.metrics.eventsHosted > 0 && (
                          <span className="inline-flex items-center gap-1 text-indigo-600">
                            <FiCalendar className="w-3.5 h-3.5" /> {entry.metrics.eventsHosted} hosted
                          </span>
                        )}
                        {entry.metrics.answerUpvotes > 0 && (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <FiStar className="w-3.5 h-3.5" /> {entry.metrics.answerUpvotes} upvotes
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HelpfulAlumniLeaderboardPage;
