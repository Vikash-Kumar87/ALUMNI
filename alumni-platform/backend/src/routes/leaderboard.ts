import { Router, Response } from 'express';
import { db, auth } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

interface HelpfulAlumniEntry {
  uid: string;
  name: string;
  company?: string;
  jobRole?: string;
  avatar?: string;
  score: number;
  rank: number;
  badges: string[];
  metrics: {
    mentorshipAccepted: number;
    discussionAnswers: number;
    answerUpvotes: number;
    referralsSuccessful: number;
    referralsHandled: number;
    referralJobsPosted: number;
    eventsHosted: number;
  };
}

async function getValidAuthUids(): Promise<Set<string>> {
  const validUids = new Set<string>();
  let nextPageToken: string | undefined;
  do {
    const result = await auth.listUsers(1000, nextPageToken);
    result.users.forEach(u => validUids.add(u.uid));
    nextPageToken = result.pageToken;
  } while (nextPageToken);
  return validUids;
}

// GET /leaderboard/helpful-alumni - rank alumni by contribution metrics
router.get('/helpful-alumni', verifyToken, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [alumniSnap, mentorshipSnap, discussionsSnap, referralsSnap, jobsSnap, eventsSnap, validUids] = await Promise.all([
      db.collection('users').where('role', '==', 'alumni').get(),
      db.collection('mentorship').where('status', '==', 'accepted').get(),
      db.collection('discussions').get(),
      db.collection('referrals').get(),
      db.collection('jobs').where('type', '==', 'referral').get(),
      db.collection('events').get(),
      getValidAuthUids(),
    ]);

    const mentorshipAccepted = new Map<string, number>();
    mentorshipSnap.docs.forEach(doc => {
      const d = doc.data() as { alumniId?: string };
      if (!d.alumniId) return;
      mentorshipAccepted.set(d.alumniId, (mentorshipAccepted.get(d.alumniId) || 0) + 1);
    });

    const discussionAnswers = new Map<string, number>();
    const answerUpvotes = new Map<string, number>();
    discussionsSnap.docs.forEach(doc => {
      const d = doc.data() as { answers?: Array<{ answeredBy?: string; answeredByRole?: string; upvotes?: number }> };
      const answers = d.answers || [];
      answers.forEach(answer => {
        if (!answer.answeredBy || answer.answeredByRole !== 'alumni') return;
        discussionAnswers.set(answer.answeredBy, (discussionAnswers.get(answer.answeredBy) || 0) + 1);
        answerUpvotes.set(answer.answeredBy, (answerUpvotes.get(answer.answeredBy) || 0) + (answer.upvotes || 0));
      });
    });

    const referralsSuccessful = new Map<string, number>();
    const referralsHandled = new Map<string, number>();
    referralsSnap.docs.forEach(doc => {
      const d = doc.data() as { alumniId?: string; status?: string };
      if (!d.alumniId) return;
      referralsHandled.set(d.alumniId, (referralsHandled.get(d.alumniId) || 0) + 1);
      if (d.status === 'offered' || d.status === 'joined') {
        referralsSuccessful.set(d.alumniId, (referralsSuccessful.get(d.alumniId) || 0) + 1);
      }
    });

    const referralJobsPosted = new Map<string, number>();
    jobsSnap.docs.forEach(doc => {
      const d = doc.data() as { postedBy?: string };
      if (!d.postedBy) return;
      referralJobsPosted.set(d.postedBy, (referralJobsPosted.get(d.postedBy) || 0) + 1);
    });

    const eventsHosted = new Map<string, number>();
    eventsSnap.docs.forEach(doc => {
      const d = doc.data() as { organizer?: { id?: string } };
      const organizerId = d.organizer?.id;
      if (!organizerId) return;
      eventsHosted.set(organizerId, (eventsHosted.get(organizerId) || 0) + 1);
    });

    const entries: HelpfulAlumniEntry[] = alumniSnap.docs
      .filter(doc => validUids.has(doc.id))
      .map(doc => {
        const d = doc.data() as { uid: string; name: string; company?: string; jobRole?: string; avatar?: string };
        const uid = d.uid || doc.id;

        const metrics = {
          mentorshipAccepted: mentorshipAccepted.get(uid) || 0,
          discussionAnswers: discussionAnswers.get(uid) || 0,
          answerUpvotes: answerUpvotes.get(uid) || 0,
          referralsSuccessful: referralsSuccessful.get(uid) || 0,
          referralsHandled: referralsHandled.get(uid) || 0,
          referralJobsPosted: referralJobsPosted.get(uid) || 0,
          eventsHosted: eventsHosted.get(uid) || 0,
        };

        const score =
          metrics.mentorshipAccepted * 10 +
          metrics.discussionAnswers * 6 +
          metrics.answerUpvotes * 2 +
          metrics.referralsSuccessful * 12 +
          metrics.referralJobsPosted * 8 +
          metrics.eventsHosted * 5 +
          metrics.referralsHandled * 2;

        const badges: string[] = [];
        if (metrics.mentorshipAccepted >= 5) badges.push('Mentor Champion');
        if (metrics.answerUpvotes >= 20) badges.push('Forum Star');
        if (metrics.referralsSuccessful >= 3) badges.push('Referral Pro');
        if (metrics.eventsHosted >= 2) badges.push('Community Host');

        return {
          uid,
          name: d.name || 'Alumni',
          company: d.company || '',
          jobRole: d.jobRole || '',
          avatar: d.avatar || '',
          score,
          rank: 0,
          badges,
          metrics,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    res.status(200).json({ leaderboard: entries });
  } catch (error) {
    console.error('Get helpful alumni leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
