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

export default router;
