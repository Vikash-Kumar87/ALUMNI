import { Router, Response } from 'express';
import { db } from '../config/firebase';
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

// DELETE /users/:uid (admin only)
router.delete('/:uid', verifyToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    await db.collection('users').doc(uid).delete();
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
