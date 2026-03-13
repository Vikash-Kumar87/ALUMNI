import { Router, Response } from 'express';
import { db, auth } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';
import { sendMentorshipAcceptedEmail } from '../services/email';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper: get set of all valid Firebase Auth UIDs
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

// GET /mentors - Get all alumni mentors with optional skill filtering
router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { skill, search } = req.query;

    const [snapshot, validUids] = await Promise.all([
      db.collection('users').where('role', '==', 'alumni').get(),
      getValidAuthUids(),
    ]);

    // Only return alumni whose Firebase Auth account still exists
    let mentors = snapshot.docs
      .filter(doc => validUids.has(doc.id))
      .map(doc => doc.data());

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
      const existingRequests = existing.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as { status?: string; createdAt?: string }) }))
        .sort((a, b) => new Date(String(b.createdAt || 0)).getTime() - new Date(String(a.createdAt || 0)).getTime());

      const active = existingRequests.find(r => r.status === 'pending' || r.status === 'accepted');
      if (active) {
        res.status(409).json({ error: 'Mentorship request already exists' });
        return;
      }

      // If previous request was rejected, allow request-again by resetting latest record
      const latestRejected = existingRequests.find(r => r.status === 'rejected');
      if (latestRejected) {
        const refreshed = {
          status: 'pending',
          message: message || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          mentorNote: '',
        };
        await db.collection('mentorship').doc(latestRejected.id).update(refreshed);

        const studentDoc = await db.collection('users').doc(studentId).get();
        const studentName = (studentDoc.data() as { name: string })?.name || 'A student';
        await createNotification(
          alumniId,
          'mentorship_request',
          'New Mentorship Request',
          `${studentName} has sent you a mentorship request.`,
          '/mentors',
        );

        res.status(201).json({ message: 'Mentorship request sent', mentorship: { id: latestRejected.id, ...refreshed } });
        return;
      }
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
    const { status, note } = req.body;

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

    await mentorshipRef.update({
      status,
      mentorNote: typeof note === 'string' ? note.trim().slice(0, 400) : '',
      updatedAt: new Date().toISOString(),
    });

    // Notify the student about acceptance or rejection
    const alumniDoc = await db.collection('users').doc(req.user!.uid).get();
    const alumniName = (alumniDoc.data() as { name: string })?.name || 'An alumni';
    const notifType = status === 'accepted' ? 'mentorship_accepted' : 'mentorship_rejected';
    const notifTitle = status === 'accepted' ? 'Mentorship Request Accepted! 🎉' : 'Mentorship Request Update';
    const safeNote = typeof note === 'string' ? note.trim().slice(0, 200) : '';
    const notifBody = status === 'accepted'
      ? `${alumniName} has accepted your mentorship request!${safeNote ? ` Note: ${safeNote}` : ' Start a conversation.'}`
      : `${alumniName} is not available for mentorship right now.${safeNote ? ` Note: ${safeNote}` : ''}`;
    await createNotification(data.studentId, notifType, notifTitle, notifBody, '/mentors');

    // Send email notification for acceptance (fire-and-forget)
    if (status === 'accepted') {
      (async () => {
        try {
          const studentDoc = await db.collection('users').doc(data.studentId).get();
          const studentData = studentDoc.data() as { email?: string; name?: string; emailNotifications?: { mentorship?: boolean } } | undefined;
          const alumniData = alumniDoc.data() as { name?: string; jobRole?: string; company?: string };
          if (studentData?.email && studentData?.emailNotifications?.mentorship !== false) {
            await sendMentorshipAcceptedEmail(
              studentData.email,
              studentData.name || 'there',
              alumniName,
              alumniData.jobRole,
              alumniData.company,
            );
          }
        } catch (err) {
          console.error('Failed to send mentorship acceptance email:', err);
        }
      })();
    }

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

    const requests = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const mentorshipData = doc.data();
        
        // Fetch student details for alumni, or alumni details for students
        let enrichedRequest = { ...mentorshipData };
        
        if (userData?.role === 'alumni' && mentorshipData.studentId) {
          // Alumni viewing requests - add student info
          try {
            const studentDoc = await db.collection('users').doc(mentorshipData.studentId).get();
            const studentData = studentDoc.data();
            enrichedRequest.studentName = studentData?.name || 'Unknown Student';
            enrichedRequest.studentEmail = studentData?.email || '';
          } catch (err) {
            console.error('Failed to fetch student data:', err);
            enrichedRequest.studentName = 'Unknown Student';
            enrichedRequest.studentEmail = '';
          }
        } else if (userData?.role === 'student' && mentorshipData.alumniId) {
          // Student viewing requests - add alumni info
          try {
            const alumniDoc = await db.collection('users').doc(mentorshipData.alumniId).get();
            const alumniData = alumniDoc.data();
            enrichedRequest.alumniName = alumniData?.name || 'Unknown Alumni';
            enrichedRequest.alumniEmail = alumniData?.email || '';
            enrichedRequest.alumniCompany = alumniData?.company || '';
            enrichedRequest.alumniJobRole = alumniData?.jobRole || '';
          } catch (err) {
            console.error('Failed to fetch alumni data:', err);
            enrichedRequest.alumniName = 'Unknown Alumni';
            enrichedRequest.alumniEmail = '';
          }
        }
        
        return enrichedRequest;
      })
    );

    res.status(200).json({ requests });
  } catch (error) {
    console.error('Get mentorship requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
