import { Router, Response } from 'express';
import { db, auth } from '../config/firebase';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /users - Get all users (admin only)
router.get('/', verifyToken, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => doc.data());
    res.status(200).json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users/list - Get basic user list for chat (all authenticated users)
router.get('/list', verifyToken, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        uid: d.uid,
        name: d.name,
        role: d.role,
        avatar: d.avatar || null,
        branch: d.branch || null,        year: d.year || null,
        skills: d.skills || [],        company: d.company || null,
        jobRole: d.jobRole || null,
      };
    });
    res.status(200).json({ users });
  } catch (error) {
    console.error('Get users list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users/stats - Get platform statistics
router.get('/stats', verifyToken, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [usersSnap, jobsSnap, discussionsSnap, mentorshipSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('jobs').get(),
      db.collection('discussions').get(),
      db.collection('mentorship').where('status', '==', 'active').get(),
    ]);

    const users = usersSnap.docs.map(doc => doc.data());
    const students = users.filter(u => u.role === 'student').length;
    const alumni = users.filter(u => u.role === 'alumni').length;

    res.status(200).json({
      stats: {
        totalUsers: usersSnap.size,
        students,
        alumni,
        activeJobs: jobsSnap.size,
        discussions: discussionsSnap.size,
        activeMentorships: mentorshipSnap.size,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users/:uid - Get user by ID
router.get('/:uid', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user: userDoc.data() });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /users/:uid - Update user profile
router.put('/:uid', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;

    // Users can only update their own profile unless admin
    if (req.user?.uid !== uid) {
      res.status(403).json({ error: 'Forbidden: Cannot update another user\'s profile' });
      return;
    }

    const allowedFields = ['name', 'skills', 'branch', 'year', 'interests', 'goals', 'company', 'jobRole', 'experience', 'linkedin', 'bio', 'avatar'];
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    await db.collection('users').doc(uid).update(updateData);
    const updated = await db.collection('users').doc(uid).get();

    res.status(200).json({ message: 'Profile updated successfully', user: updated.data() });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper: batch delete a Firestore query snapshot
async function batchDelete(snapshot: FirebaseFirestore.QuerySnapshot): Promise<void> {
  if (snapshot.empty) return;
  const batchSize = 400;
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    docs.slice(i, i + batchSize).forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

// DELETE /users/:uid (admin only) - cascades and deletes ALL user data
router.delete('/:uid', verifyToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;

    // Verify user exists before deleting
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Run all collection queries in parallel
    const [
      jobsSnap,
      mentorshipAsStudentSnap,
      mentorshipAsAlumniSnap,
      discussionsSnap,
      notificationsSnap,
      sessionsAsStudentSnap,
      sessionsAsMentorSnap,
      chatMessagesSnap,
    ] = await Promise.all([
      db.collection('jobs').where('postedBy', '==', uid).get(),
      db.collection('mentorship').where('studentId', '==', uid).get(),
      db.collection('mentorship').where('alumniId', '==', uid).get(),
      db.collection('discussions').where('postedBy', '==', uid).get(),
      db.collection('notifications').where('userId', '==', uid).get(),
      db.collection('sessions').where('student_id', '==', uid).get(),
      db.collection('sessions').where('mentor_id', '==', uid).get(),
      db.collection('chats').where('senderId', '==', uid).get(),
    ]);

    // Delete all related data in parallel
    await Promise.all([
      batchDelete(jobsSnap),
      batchDelete(mentorshipAsStudentSnap),
      batchDelete(mentorshipAsAlumniSnap),
      batchDelete(discussionsSnap),
      batchDelete(notificationsSnap),
      batchDelete(sessionsAsStudentSnap),
      batchDelete(sessionsAsMentorSnap),
      batchDelete(chatMessagesSnap),
    ]);

    // Delete chatRooms that involve this user
    const chatRoomsSnap = await db.collection('chatRooms').get();
    const roomsToDelete = chatRoomsSnap.docs.filter(doc => {
      const participants: string[] = doc.data().participants || [];
      return participants.includes(uid);
    });
    if (roomsToDelete.length > 0) {
      const batch = db.batch();
      roomsToDelete.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    // Delete user Firestore document
    await db.collection('users').doc(uid).delete();

    // Delete Firebase Auth account
    try {
      await auth.deleteUser(uid);
    } catch (authErr: unknown) {
      // If auth user doesn't exist, continue gracefully
      const err = authErr as { code?: string };
      if (err.code !== 'auth/user-not-found') throw authErr;
    }

    res.status(200).json({
      message: 'User and all associated data deleted successfully',
      deleted: {
        jobs: jobsSnap.size,
        mentorshipRequests: mentorshipAsStudentSnap.size + mentorshipAsAlumniSnap.size,
        discussions: discussionsSnap.size,
        notifications: notificationsSnap.size,
        sessions: sessionsAsStudentSnap.size + sessionsAsMentorSnap.size,
        chatMessages: chatMessagesSnap.size,
        chatRooms: roomsToDelete.length,
      },
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
