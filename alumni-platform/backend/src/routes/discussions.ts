import { Router, Response } from 'express';
import { db, auth } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';
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

// GET /discussion - Get all discussions
router.get('/', verifyToken, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [snapshot, validUids] = await Promise.all([
      db.collection('discussions').orderBy('createdAt', 'desc').limit(50).get(),
      getValidAuthUids(),
    ]);

    // Only show discussions posted by users with active accounts
    const discussions = snapshot.docs
      .map(doc => doc.data())
      .filter(d => !d.postedBy || validUids.has(String(d.postedBy)));
    res.status(200).json({ discussions });
  } catch (error) {
    console.error('Get discussions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /discussion - Create a new question
router.post('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { question, tags } = req.body;
    const uid = req.user?.uid;

    if (!question || !uid) {
      res.status(400).json({ error: 'Question text is required' });
      return;
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() as { name: string };

    const discussionId = uuidv4();
    const discussionData = {
      id: discussionId,
      question,
      tags: tags || [],
      postedBy: uid,
      postedByName: userData?.name || 'Anonymous',
      answers: [],
      upvotes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('discussions').doc(discussionId).set(discussionData);
    res.status(201).json({ message: 'Question posted', discussion: discussionData });
  } catch (error) {
    console.error('Post discussion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /discussion/:id/answer - Answer a question
router.post('/:id/answer', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { answer } = req.body;
    const uid = req.user?.uid;

    if (!answer || !uid) {
      res.status(400).json({ error: 'Answer text is required' });
      return;
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() as { name: string; role: string };

    const discussionRef = db.collection('discussions').doc(id);
    const discussionDoc = await discussionRef.get();

    if (!discussionDoc.exists) {
      res.status(404).json({ error: 'Discussion not found' });
      return;
    }

    const discussion = discussionDoc.data() as { answers: unknown[] };
    const newAnswer = {
      id: uuidv4(),
      answer,
      answeredBy: uid,
      answeredByName: userData?.name || 'Anonymous',
      answeredByRole: userData?.role || 'student',
      upvotes: 0,
      upvotedBy: [],
      createdAt: new Date().toISOString(),
    };

    const updatedAnswers = [...(discussion.answers || []), newAnswer];
    await discussionRef.update({ answers: updatedAnswers, updatedAt: new Date().toISOString() });

    // Notify the question author (if not the same person answering)
    const discussionData = discussionDoc.data() as { postedBy: string; question: string };
    if (discussionData.postedBy !== uid) {
      await createNotification(
        discussionData.postedBy,
        'discussion_answer',
        'New Answer on Your Question',
        `${userData?.name || 'Someone'} answered your question: "${String(discussionData.question).slice(0, 60)}..."`,
        '/forum',
      );
    }

    res.status(201).json({ message: 'Answer posted', answer: newAnswer });
  } catch (error) {
    console.error('Post answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /discussion/:id/upvote - Upvote a discussion
router.post('/:id/upvote', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const uid = req.user?.uid!;

    const discussionRef = db.collection('discussions').doc(id);
    const discussionDoc = await discussionRef.get();

    if (!discussionDoc.exists) {
      res.status(404).json({ error: 'Discussion not found' });
      return;
    }

    const discussion = discussionDoc.data() as { upvotes: number; upvotedBy?: string[] };
    const upvotedBy: string[] = discussion.upvotedBy || [];

    if (upvotedBy.includes(uid)) {
      // Remove upvote
      await discussionRef.update({
        upvotes: discussion.upvotes - 1,
        upvotedBy: upvotedBy.filter(u => u !== uid),
      });
      res.status(200).json({ message: 'Upvote removed' });
    } else {
      // Add upvote
      await discussionRef.update({
        upvotes: discussion.upvotes + 1,
        upvotedBy: [...upvotedBy, uid],
      });
      res.status(200).json({ message: 'Upvoted successfully' });
    }
  } catch (error) {
    console.error('Upvote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /discussion/:id/upvote-answer/:answerId - Upvote an answer
router.post('/:id/upvote-answer/:answerId', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, answerId } = req.params;
    const uid = req.user?.uid!;

    const discussionRef = db.collection('discussions').doc(id);
    const discussionDoc = await discussionRef.get();

    if (!discussionDoc.exists) {
      res.status(404).json({ error: 'Discussion not found' });
      return;
    }

    const discussion = discussionDoc.data() as { answers: Array<{ id: string; upvotes: number; upvotedBy: string[] }> };
    const answers = discussion.answers;
    const answerIdx = answers.findIndex(a => a.id === answerId);

    if (answerIdx === -1) {
      res.status(404).json({ error: 'Answer not found' });
      return;
    }

    const answer = answers[answerIdx];
    const upvotedBy: string[] = answer.upvotedBy || [];

    if (upvotedBy.includes(uid)) {
      answers[answerIdx] = { ...answer, upvotes: answer.upvotes - 1, upvotedBy: upvotedBy.filter(u => u !== uid) };
    } else {
      answers[answerIdx] = { ...answer, upvotes: answer.upvotes + 1, upvotedBy: [...upvotedBy, uid] };
    }

    await discussionRef.update({ answers });
    res.status(200).json({ message: 'Answer upvote updated' });
  } catch (error) {
    console.error('Upvote answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /discussion/:id - Delete a discussion (author only)
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const uid = req.user?.uid;

    const discussionRef = db.collection('discussions').doc(id);
    const discussionDoc = await discussionRef.get();

    if (!discussionDoc.exists) {
      res.status(404).json({ error: 'Discussion not found' });
      return;
    }

    const discussion = discussionDoc.data() as { postedBy: string };
    if (discussion.postedBy !== uid) {
      res.status(403).json({ error: 'Forbidden: Only the author can delete this post' });
      return;
    }

    await discussionRef.delete();
    res.status(200).json({ message: 'Discussion deleted' });
  } catch (error) {
    console.error('Delete discussion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
