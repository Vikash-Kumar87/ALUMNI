import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /jobs - Get all job postings
router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, search } = req.query;

    let snapshot = await db
      .collection('jobs')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    let jobs = snapshot.docs.map(doc => doc.data());

    if (type && typeof type === 'string') {
      jobs = jobs.filter(j => j.type === type);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      jobs = jobs.filter(j =>
        String(j.title || '').toLowerCase().includes(q) ||
        String(j.company || '').toLowerCase().includes(q) ||
        String(j.description || '').toLowerCase().includes(q)
      );
    }

    res.status(200).json({ jobs });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /jobs/:id - Get a specific job
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobDoc = await db.collection('jobs').doc(req.params.id).get();
    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.status(200).json({ job: jobDoc.data() });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /jobs - Post a new job (alumni only)
router.post('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() as { role: string; name: string };

    if (userData?.role !== 'alumni') {
      res.status(403).json({ error: 'Only alumni can post jobs' });
      return;
    }

    const { title, company, description, type, location, salary, requirements, applyLink, referral } = req.body;

    if (!title || !company || !description || !type) {
      res.status(400).json({ error: 'Missing required fields: title, company, description, type' });
      return;
    }

    const jobId = uuidv4();
    const jobData = {
      id: jobId,
      title,
      company,
      description,
      type, // job | internship | referral
      location: location || 'Remote',
      salary: salary || '',
      requirements: requirements || [],
      applyLink: applyLink || '',
      referral: referral || '',
      postedBy: uid,
      postedByName: userData.name,
      createdAt: new Date().toISOString(),
    };

    await db.collection('jobs').doc(jobId).set(jobData);

    // Notify all students about the new opportunity (up to 200 to avoid write storms)
    const studentsSnap = await db.collection('users').where('role', '==', 'student').limit(200).get();
    const notifPromises = studentsSnap.docs.map(doc =>
      createNotification(
        doc.id,
        'new_job',
        `New ${type === 'internship' ? 'Internship' : type === 'referral' ? 'Referral' : 'Job'}: ${title}`,
        `${userData.name} posted a new ${type} at ${company}. Check it out!`,
        '/jobs',
      )
    );
    // Fire-and-forget — don't block the response
    Promise.all(notifPromises).catch(e => console.error('Job notification error:', e));

    res.status(201).json({ message: 'Job posted successfully', job: jobData });
  } catch (error) {
    console.error('Post job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /jobs/:id - Update a job posting
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const uid = req.user?.uid;

    const jobRef = db.collection('jobs').doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const job = jobDoc.data() as { postedBy: string };
    if (job.postedBy !== uid) {
      res.status(403).json({ error: 'Forbidden: Only the poster can update this job' });
      return;
    }

    const allowedFields = ['title', 'company', 'description', 'type', 'location', 'salary', 'requirements', 'applyLink', 'referral'];
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }

    await jobRef.update(updateData);
    res.status(200).json({ message: 'Job updated successfully' });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /jobs/:id - Delete a job posting
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const uid = req.user?.uid;

    const jobRef = db.collection('jobs').doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const job = jobDoc.data() as { postedBy: string };
    if (job.postedBy !== uid) {
      res.status(403).json({ error: 'Forbidden: Only the poster can delete this job' });
      return;
    }

    await jobRef.delete();
    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
