import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';

const router = Router();

export type ReferralStatus =
  | 'requested'
  | 'in_review'
  | 'referred'
  | 'interview'
  | 'offered'
  | 'rejected'
  | 'joined';

interface ReferralTimelineItem {
  status: ReferralStatus;
  note?: string;
  at: string;
  by: string;
}

interface ReferralRequestDoc {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  alumniId: string;
  alumniName: string;
  note?: string;
  resumeLink?: string;
  status: ReferralStatus;
  feedback?: string;
  timeline: ReferralTimelineItem[];
  createdAt: string;
  updatedAt: string;
}

const VALID_STATUS: ReferralStatus[] = ['requested', 'in_review', 'referred', 'interview', 'offered', 'rejected', 'joined'];

// POST /referrals - student creates referral request for a job
router.post('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const studentDoc = await db.collection('users').doc(uid).get();
    const student = studentDoc.data() as { role?: string; name?: string; email?: string } | undefined;

    if (!student || student.role !== 'student') {
      res.status(403).json({ error: 'Only students can request referrals' });
      return;
    }

    const { jobId, note, resumeLink } = req.body as { jobId?: string; note?: string; resumeLink?: string };

    if (!jobId) {
      res.status(400).json({ error: 'jobId is required' });
      return;
    }

    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const job = jobDoc.data() as { title?: string; company?: string; postedBy?: string; postedByName?: string; type?: string };
    if (!job.postedBy) {
      res.status(400).json({ error: 'This job cannot receive referrals' });
      return;
    }

    const existingSnap = await db.collection('referrals').where('studentId', '==', uid).limit(100).get();
    const duplicate = existingSnap.docs
      .map(d => d.data() as ReferralRequestDoc)
      .find(r => r.jobId === jobId && ['requested', 'in_review', 'referred', 'interview', 'offered'].includes(r.status));

    if (duplicate) {
      res.status(409).json({ error: 'Referral request already exists for this job' });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const referral: ReferralRequestDoc = {
      id,
      jobId,
      jobTitle: job.title || 'Untitled Role',
      company: job.company || 'Unknown Company',
      studentId: uid,
      studentName: student.name || 'Student',
      studentEmail: student.email || '',
      alumniId: job.postedBy,
      alumniName: job.postedByName || 'Alumni',
      note: typeof note === 'string' ? note.trim().slice(0, 600) : '',
      resumeLink: typeof resumeLink === 'string' ? resumeLink.trim() : '',
      status: 'requested',
      timeline: [{ status: 'requested', note: 'Request submitted', at: now, by: uid }],
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('referrals').doc(id).set(referral);

    createNotification(
      referral.alumniId,
      'referral_request',
      `New referral request: ${referral.jobTitle}`,
      `${referral.studentName} requested a referral at ${referral.company}`,
      '/referrals',
    ).catch(e => console.error('Referral notification error:', e));

    res.status(201).json({ message: 'Referral request created', referral });
  } catch (error) {
    console.error('Create referral error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /referrals/my - fetch referrals for current user
router.get('/my', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const user = userDoc.data() as { role?: string } | undefined;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const asStudentSnap = await db.collection('referrals').where('studentId', '==', uid).limit(200).get();
    const asAlumniSnap = await db.collection('referrals').where('alumniId', '==', uid).limit(200).get();

    const asStudent = asStudentSnap.docs
      .map(doc => doc.data() as ReferralRequestDoc)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const asAlumni = asAlumniSnap.docs
      .map(doc => doc.data() as ReferralRequestDoc)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const source = user.role === 'student' ? asStudent : asAlumni;
    const stats = {
      total: source.length,
      requested: source.filter(r => r.status === 'requested').length,
      inProgress: source.filter(r => ['in_review', 'referred', 'interview'].includes(r.status)).length,
      successful: source.filter(r => ['offered', 'joined'].includes(r.status)).length,
      rejected: source.filter(r => r.status === 'rejected').length,
    };

    res.status(200).json({ asStudent, asAlumni, stats });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /referrals/:id/status - alumni updates referral status
router.put('/:id/status', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const { id } = req.params;
    const { status, feedback } = req.body as { status?: ReferralStatus; feedback?: string };

    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!status || !VALID_STATUS.includes(status)) {
      res.status(400).json({ error: 'Invalid status value' });
      return;
    }

    const referralRef = db.collection('referrals').doc(id);
    const referralDoc = await referralRef.get();

    if (!referralDoc.exists) {
      res.status(404).json({ error: 'Referral request not found' });
      return;
    }

    const referral = referralDoc.data() as ReferralRequestDoc;
    if (referral.alumniId !== uid) {
      res.status(403).json({ error: 'Only the referral owner can update status' });
      return;
    }

    const now = new Date().toISOString();
    const timeline = Array.isArray(referral.timeline) ? [...referral.timeline] : [];
    timeline.push({ status, note: feedback?.trim() || `Status updated to ${status}`, at: now, by: uid });

    await referralRef.update({
      status,
      feedback: typeof feedback === 'string' ? feedback.trim().slice(0, 500) : '',
      timeline,
      updatedAt: now,
    });

    createNotification(
      referral.studentId,
      'referral_update',
      `Referral update: ${referral.jobTitle}`,
      `${referral.alumniName} marked your referral as ${status.replace('_', ' ')}`,
      '/referrals',
    ).catch(e => console.error('Referral update notification error:', e));

    res.status(200).json({ message: 'Referral status updated' });
  } catch (error) {
    console.error('Update referral status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
