import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { sendVideoCallEmail } from '../services/email';

const router = Router();

export type NotificationType =
  | 'mentorship_request'
  | 'mentorship_accepted'
  | 'mentorship_rejected'
  | 'new_job'
  | 'discussion_answer'
  | 'message'
  | 'video_call';

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

/** Creates a notification document in Firestore. Call this helper from other routes. */
export async function createNotification(
  recipientId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  const id = uuidv4();
  const notif: Notification = {
    id,
    recipientId,
    type,
    title,
    body,
    link,
    read: false,
    createdAt: new Date().toISOString(),
  };
  await db.collection('notifications').doc(id).set(notif);
}

// GET /notifications — get current user's unread + recent notifications
router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const snapshot = await db
      .collection('notifications')
      .where('recipientId', '==', uid)
      .limit(50)
      .get();

    const notifications = snapshot.docs
      .map(doc => doc.data() as Notification)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);

    const unreadCount = notifications.filter(n => !n.read).length;

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /notifications/:id/read — mark one notification as read
router.put('/:id/read', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const uid = req.user?.uid;

    const notifRef = db.collection('notifications').doc(id);
    const notifDoc = await notifRef.get();

    if (!notifDoc.exists) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    const data = notifDoc.data() as Notification;
    if (data.recipientId !== uid) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await notifRef.update({ read: true });
    res.status(200).json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /notifications/read-all — mark all notifications as read
router.put('/read-all', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const snapshot = await db
      .collection('notifications')
      .where('recipientId', '==', uid)
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.update(doc.ref, { read: true }));
    await batch.commit();

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /notifications/video-call — notify a user someone is calling them
router.post('/video-call', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const callerUid = req.user?.uid;
    const { recipientId, callerName, roomName, callLink } = req.body;

    if (!recipientId || !callerName || !callLink) {
      res.status(400).json({ error: 'recipientId, callerName and callLink are required' });
      return;
    }

    // Prevent self-notification
    if (recipientId === callerUid) {
      res.status(200).json({ message: 'self-call ignored' });
      return;
    }

    // In-app notification
    await createNotification(
      recipientId,
      'video_call',
      `📹 Incoming Video Call`,
      `${callerName} is calling you — join now!`,
      callLink,
    );

    // Email notification
    const recipientDoc = await db.collection('users').doc(recipientId).get();
    const recipient = recipientDoc.data();
    if (recipient?.email && recipient?.emailNotifications?.messages !== false) {
      await sendVideoCallEmail(
        recipient.email,
        recipient.name || 'there',
        callerName,
        callLink,
      );
    }

    res.status(200).json({ message: 'Video call notification sent' });
  } catch (error) {
    console.error('Video call notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /notifications/video-call-invitation — send video call invitation to a mentored student
router.post('/video-call-invitation', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alumniUid = req.user?.uid;
    const { studentId, callLink, alumniName } = req.body;

    if (!studentId || !callLink || !alumniName) {
      res.status(400).json({ error: 'studentId, callLink, and alumniName are required' });
      return;
    }

    // Prevent self-notification
    if (studentId === alumniUid) {
      res.status(200).json({ message: 'self-call ignored' });
      return;
    }

    // Verify that the student has a mentorship request from this alumni (status: accepted)
    const mentorshipSnapshot = await db
      .collection('mentorship')
      .where('studentId', '==', studentId)
      .where('alumniId', '==', alumniUid)
      .where('status', '==', 'accepted')
      .get();

    if (mentorshipSnapshot.empty) {
      res.status(403).json({ error: 'No active mentorship with this student' });
      return;
    }

    // In-app notification
    await createNotification(
      studentId,
      'video_call',
      `🎬 Mentorship Video Call from ${alumniName}`,
      `${alumniName} is inviting you to a video call — join now!`,
      callLink,
    );

    // Email notification (fire-and-forget)
    (async () => {
      try {
        const studentDoc = await db.collection('users').doc(studentId).get();
        const student = studentDoc.data();
        if (student?.email && student?.emailNotifications?.messages !== false) {
          await sendVideoCallEmail(
            student.email,
            student.name || 'there',
            alumniName,
            callLink,
          );
        }
      } catch (err) {
        console.error('Failed to send video call invitation email:', err);
      }
    })();

    res.status(200).json({ message: 'Video call invitation sent' });
  } catch (error) {
    console.error('Video call invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
