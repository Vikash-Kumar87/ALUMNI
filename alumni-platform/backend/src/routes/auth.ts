import { Router, Request, Response } from 'express';
import { auth, db } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /auth/signup - Create user profile after Firebase Auth registration
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, name, email, role, branch, year, skills, interests, goals, company, jobRole, experience, linkedin } = req.body;

    if (!uid || !name || !email || !role) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const userRef = db.collection('users').doc(uid);
    const existingUser = await userRef.get();

    if (existingUser.exists) {
      // Google two-step flow: basic profile was already created by signInWithGoogle,
      // this second call completes it with full profile fields — just update the doc.
      const updateData: Record<string, unknown> = {
        skills: skills || [],
        updatedAt: new Date().toISOString(),
      };
      if (role === 'student') {
        if (branch !== undefined) updateData.branch = branch;
        if (year !== undefined) updateData.year = year;
        if (interests !== undefined) updateData.interests = interests || [];
        if (goals !== undefined) updateData.goals = goals;
      } else if (role === 'alumni') {
        if (company !== undefined) updateData.company = company;
        if (jobRole !== undefined) updateData.jobRole = jobRole;
        if (experience !== undefined) updateData.experience = experience;
        if (linkedin !== undefined) updateData.linkedin = linkedin;
      }
      await userRef.update(updateData);
      const updatedDoc = await userRef.get();
      res.status(200).json({ message: 'Profile updated successfully', user: updatedDoc.data() });
      return;
    }

    const userData: Record<string, unknown> = {
      uid,
      name,
      email,
      role,
      skills: skills || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (role === 'student') {
      userData.branch = branch || '';
      userData.year = year || 1;
      userData.interests = interests || [];
      userData.goals = goals || '';
    } else if (role === 'alumni') {
      userData.company = company || '';
      userData.jobRole = jobRole || '';
      userData.experience = experience || 0;
      userData.linkedin = linkedin || '';
    }

    await userRef.set(userData);

    // Set custom claim for role
    await auth.setCustomUserClaims(uid, { role });

    res.status(201).json({ message: 'User profile created successfully', user: userData });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login - Verify token and return user data
router.post('/login', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      res.status(404).json({ error: 'User profile not found. Please complete registration.' });
      return;
    }

    res.status(200).json({ user: userDoc.data() });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/logout
router.post('/logout', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (uid) {
      await auth.revokeRefreshTokens(uid);
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
