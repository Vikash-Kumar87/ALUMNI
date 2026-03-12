import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';
import { sendNewMessageEmail } from '../services/email';

const router = Router();

// POST /chat - Send a message
router.post('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user?.uid;

    if (!receiverId || !message || !senderId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Fetch sender info so the frontend listener can display name/avatar
    const senderDoc = await db.collection('users').doc(senderId).get();
    const senderData = senderDoc.data() as { name?: string; avatar?: string } | undefined;

    // Create a consistent chat room ID (sort UIDs alphabetically)
    const chatRoomId = [senderId, receiverId].sort().join('_');
    const createdAt = new Date().toISOString();

    // Store in the format the frontend onValue listener expects
    const messageData = {
      senderId,
      senderName: senderData?.name || 'Unknown',
      senderPhoto: senderData?.avatar || null,
      text: message,
      createdAt,
    };

    // Store in Firestore messages sub-collection
    const messagesRef = db.collection('chats').doc(chatRoomId).collection('messages');
    const newMsgRef = await messagesRef.add(messageData);

    // Update chat metadata in Firestore
    await db.collection('chatRooms').doc(chatRoomId).set({
      participants: [senderId, receiverId],
      lastMessage: message,
      lastMessageAt: createdAt,
      updatedAt: createdAt,
    }, { merge: true });

    // Create a notification for the receiver
    await createNotification(
      receiverId,
      'message',
      `New message from ${senderData?.name || 'Someone'}`,
      message.length > 80 ? message.slice(0, 80) + '…' : message,
      '/chat',
    ).catch(() => { /* non-critical */ });

    // Send email notification if recipient has opted in (fire-and-forget — never block the response)
    (async () => {
      try {
        const receiverDoc = await db.collection('users').doc(receiverId).get();
        const receiverData = receiverDoc.data() as { email?: string; name?: string; emailNotifications?: { messages?: boolean } } | undefined;
        if (receiverData?.email && receiverData?.emailNotifications?.messages !== false) {
          await sendNewMessageEmail(
            receiverData.email,
            receiverData.name || 'there',
            senderData?.name || 'Someone',
            message.length > 120 ? message.slice(0, 120) + '…' : message,
          );
        }
      } catch { /* email failure must never affect chat */ }
    })();

    res.status(201).json({ message: 'Message sent', data: { ...messageData, id: newMsgRef.id } });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /chat/conversations - Get all conversations for current user
router.get('/conversations', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uid = req.user?.uid;

    const snapshot = await db
      .collection('chatRooms')
      .where('participants', 'array-contains', uid)
      .orderBy('updatedAt', 'desc')
      .get();

    const conversations = await Promise.all(
      snapshot.docs.map(async doc => {
        const data = doc.data() as { participants: string[]; lastMessage: string; lastMessageAt: string };
        const otherUserId = data.participants.find(p => p !== uid);
        let otherUser = null;

        if (otherUserId) {
          const otherUserDoc = await db.collection('users').doc(otherUserId).get();
          otherUser = otherUserDoc.data();
        }

        return {
          chatRoomId: doc.id,
          ...data,
          otherUser,
        };
      })
    );

    res.status(200).json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /chat/:chatRoomId - Get messages in a chat room
router.get('/:chatRoomId', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { chatRoomId } = req.params;
    const uid = req.user?.uid;

    // Validate user is in this chat room
    if (!chatRoomId.includes(uid!)) {
      res.status(403).json({ error: 'Forbidden: You are not in this chat room' });
      return;
    }

    const snapshot = await db
      .collection('chats')
      .doc(chatRoomId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    // reverse so oldest is first (ascending order for the client)
    const messages = snapshot.docs.reverse().map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
