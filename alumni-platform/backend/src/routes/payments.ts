import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const PLATFORM_COMMISSION_PERCENT = Number(process.env.PLATFORM_COMMISSION_PERCENT || 10);

// POST /payments/book-session
// Mock payment: creates a session record directly (no real payment gateway)
router.post('/book-session', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { mentorId } = req.body;
    const studentId = req.user?.uid;

    if (!mentorId || !studentId) {
      res.status(400).json({ error: 'Missing mentorId' });
      return;
    }

    // Fetch mentor pricing from Firestore
    const mentorDoc = await db.collection('users').doc(mentorId).get();
    if (!mentorDoc.exists) {
      res.status(404).json({ error: 'Mentor not found' });
      return;
    }
    const mentorData = mentorDoc.data() as Record<string, unknown>;
    const pricePerSession = Number(mentorData.price_per_session) || 0;

    if (pricePerSession <= 0) {
      res.status(400).json({ error: 'Mentor has not set a session price yet.' });
      return;
    }

    const commissionAmount = Math.round((pricePerSession * PLATFORM_COMMISSION_PERCENT) / 100);
    const mentorEarning = pricePerSession - commissionAmount;

    const sessionId = uuidv4();
    const sessionData = {
      id: sessionId,
      student_id: studentId,
      mentor_id: mentorId,
      amount: pricePerSession,
      commission_amount: commissionAmount,
      mentor_earning: mentorEarning,
      payment_status: 'success',
      session_status: 'booked',
      created_at: new Date().toISOString(),
    };

    await db.collection('sessions').doc(sessionId).set(sessionData);

    res.status(200).json({
      message: 'Session booked successfully',
      sessionId,
      session: sessionData,
      mentorName: mentorData.name,
      sessionDuration: mentorData.session_duration,
      pricePerSession,
    });
  } catch (error) {
    console.error('Book session error:', error);
    res.status(500).json({ error: 'Failed to book session' });
  }
});

// GET /payments/mentor-sessions
// Alumni sees all their booked sessions
router.get('/mentor-sessions', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const mentorId = req.user?.uid;
    const snapshot = await db.collection('sessions')
      .where('mentor_id', '==', mentorId)
      .get();

    const sessions = snapshot.docs.map(doc => doc.data())
      .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());

    // Enrich with student names
    const studentIds = [...new Set(sessions.map((s: Record<string, unknown>) => s.student_id as string))];
    const studentDocs = await Promise.all(studentIds.map(id => db.collection('users').doc(id).get()));
    const studentMap: Record<string, string> = {};
    studentDocs.forEach(doc => {
      if (doc.exists) {
        const d = doc.data() as Record<string, unknown>;
        studentMap[doc.id] = d.name as string;
      }
    });

    const enriched = sessions.map((s: Record<string, unknown>) => ({
      ...s,
      student_name: studentMap[s.student_id as string] || 'Unknown',
    }));

    res.status(200).json({ sessions: enriched });
  } catch (error) {
    console.error('Get mentor sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /payments/student-sessions
// Student sees all their booked sessions
router.get('/student-sessions', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.uid;
    const snapshot = await db.collection('sessions')
      .where('student_id', '==', studentId)
      .get();

    const sessions = snapshot.docs.map(doc => doc.data())
      .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());

    // Enrich with mentor names
    const mentorIds = [...new Set(sessions.map((s: Record<string, unknown>) => s.mentor_id as string))];
    const mentorDocs = await Promise.all(mentorIds.map(id => db.collection('users').doc(id).get()));
    const mentorMap: Record<string, string> = {};
    mentorDocs.forEach(doc => {
      if (doc.exists) {
        const d = doc.data() as Record<string, unknown>;
        mentorMap[doc.id] = d.name as string;
      }
    });

    const enriched = sessions.map((s: Record<string, unknown>) => ({
      ...s,
      mentor_name: mentorMap[s.mentor_id as string] || 'Unknown',
    }));

    res.status(200).json({ sessions: enriched });
  } catch (error) {
    console.error('Get student sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /payments/check-session/:mentorId
// Check if student has an active paid session with a specific mentor
router.get('/check-session/:mentorId', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.uid;
    const { mentorId } = req.params;

    const snapshot = await db.collection('sessions')
      .where('student_id', '==', studentId)
      .where('mentor_id', '==', mentorId)
      .where('payment_status', '==', 'success')
      .get();

    res.status(200).json({ hasPaidSession: !snapshot.empty });
  } catch (error) {
    console.error('Check session error:', error);
    res.status(500).json({ error: 'Failed to check session' });
  }
});

// PUT /payments/mentor-settings
// Alumni sets their session price, duration, availability
router.put('/mentor-settings', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const mentorId = req.user?.uid;
    const { price_per_session, session_duration, availability } = req.body;

    if (!mentorId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (price_per_session !== undefined && (isNaN(Number(price_per_session)) || Number(price_per_session) < 0)) {
      res.status(400).json({ error: 'Invalid price' });
      return;
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (price_per_session !== undefined) updateData.price_per_session = Number(price_per_session);
    if (session_duration !== undefined) updateData.session_duration = session_duration;
    if (availability !== undefined) updateData.availability = availability;

    await db.collection('users').doc(mentorId).update(updateData);

    res.status(200).json({ message: 'Mentorship settings updated' });
  } catch (error) {
    console.error('Update mentor settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET /payments/admin-commissions
// Admin views all platform commissions
router.get('/admin-commissions', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userDoc = await db.collection('users').doc(req.user!.uid).get();
    const userData = userDoc.data() as Record<string, unknown> | undefined;
    if (!userDoc.exists || userData?.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Admin only' });
      return;
    }

    const snapshot = await db.collection('sessions')
      .where('payment_status', '==', 'success')
      .get();

    const sessions = snapshot.docs.map(doc => doc.data())
      .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());
    const totalRevenue = sessions.reduce((sum: number, s: Record<string, unknown>) => sum + Number(s.amount || 0), 0);
    const totalCommission = sessions.reduce((sum: number, s: Record<string, unknown>) => sum + Number(s.commission_amount || 0), 0);

    res.status(200).json({ sessions, totalRevenue, totalCommission, commissionPercent: PLATFORM_COMMISSION_PERCENT });
  } catch (error) {
    console.error('Admin commissions error:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

export default router;

