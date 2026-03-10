import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /mentors - Get all alumni mentors with optional skill filtering
router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { skill, search } = req.query;

    let query = db.collection('users').where('role', '==', 'alumni');
    const snapshot = await query.get();

    let mentors = snapshot.docs.map(doc => doc.data());

    if (skill && typeof skill === 'string') {
      mentors = mentors.filter(m =>
        (m.skills as string[])?.some((s: string) =>
          s.toLowerCase().includes(skill.toLowerCase())
        )
      );
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      mentors = mentors.filter(m =>
        String(m.name || '').toLowerCase().includes(q) ||
        String(m.company || '').toLowerCase().includes(q) ||
        String(m.jobRole || '').toLowerCase().includes(q) ||
        (m.skills as string[])?.some((s: string) => s.toLowerCase().includes(q))
      );
    }

    res.status(200).json({ mentors });
  } catch (error) {
    console.error('Get mentors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /mentors/request - Student requests mentorship from an alumni
router.post('/request', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { alumniId, message } = req.body;
    const studentId = req.user?.uid;

    if (!alumniId || !studentId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Check if mentorship already exists
    const existing = await db
      .collection('mentorship')
      .where('studentId', '==', studentId)
      .where('alumniId', '==', alumniId)
      .get();

    if (!existing.empty) {
      res.status(409).json({ error: 'Mentorship request already exists' });
      return;
    }

    const mentorshipId = uuidv4();
    const mentorshipData = {
      id: mentorshipId,
      studentId,
      alumniId,
      status: 'pending',
      message: message || '',
      createdAt: new Date().toISOString(),
    };

    await db.collection('mentorship').doc(mentorshipId).set(mentorshipData);

    // Notify alumni about the new request
    const studentDoc = await db.collection('users').doc(studentId).get();
    const studentName = (studentDoc.data() as { name: string })?.name || 'A student';
    await createNotification(
      alumniId,
      'mentorship_request',
      'New Mentorship Request',
      `${studentName} has sent you a mentorship request.`,
      '/mentors',
    );

    res.status(201).json({ message: 'Mentorship request sent', mentorship: mentorshipData });
  } catch (error) {
    console.error('Mentorship request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /mentors/request/:id - Accept or reject mentorship request
router.put('/request/:id', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Use accepted or rejected' });
      return;
    }

    const mentorshipRef = db.collection('mentorship').doc(id);
    const mentorshipDoc = await mentorshipRef.get();

    if (!mentorshipDoc.exists) {
      res.status(404).json({ error: 'Mentorship request not found' });
      return;
    }

    const data = mentorshipDoc.data() as { alumniId: string; studentId: string };
    if (data.alumniId !== req.user?.uid) {
      res.status(403).json({ error: 'Forbidden: Only the mentor can update this request' });
      return;
    }

    await mentorshipRef.update({ status, updatedAt: new Date().toISOString() });

    // Notify the student about acceptance or rejection
    const alumniDoc = await db.collection('users').doc(req.user!.uid).get();
    const alumniName = (alumniDoc.data() as { name: string })?.name || 'An alumni';
    const notifType = status === 'accepted' ? 'mentorship_accepted' : 'mentorship_rejected';
    const notifTitle = status === 'accepted' ? 'Mentorship Request Accepted! 🎉' : 'Mentorship Request Update';
    const notifBody = status === 'accepted'
      ? `${alumniName} has accepted your mentorship request! Start a conversation.`
      : `${alumniName} is not available for mentorship right now.`;
    await createNotification(data.studentId, notifType, notifTitle, notifBody, '/mentors');

    res.status(200).json({ message: `Mentorship request ${status}` });
  } catch (error) {
    console.error('Update mentorship error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /mentors/my-requests - Get mentorship requests for current user
router.get('/my-requests', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const userDoc = await db.collection('users').doc(uid!).get();
    const userData = userDoc.data() as { role: string };

    let snapshot;
    if (userData?.role === 'student') {
      snapshot = await db.collection('mentorship').where('studentId', '==', uid).get();
    } else {
      snapshot = await db.collection('mentorship').where('alumniId', '==', uid).get();
    }

    const requests = snapshot.docs.map(doc => doc.data());
    res.status(200).json({ requests });
  } catch (error) {
    console.error('Get mentorship requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
