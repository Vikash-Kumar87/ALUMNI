import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';

const router = Router();

export interface Event {
  id: string;
  title: string;
  description: string;
  type: 'webinar' | 'workshop' | 'networking' | 'conference' | 'meetup';
  date: string; // ISO string
  time: string; // HH:MM format
  duration: number; // minutes
  location?: string; // for physical events
  meetingLink?: string; // for online events
  maxAttendees?: number;
  isOnline: boolean;
  organizer: {
    id: string;
    name: string;
    email: string;
    company?: string;
    jobRole?: string;
  };
  tags: string[];
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  attendeesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventRegistration {
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  registeredAt: string;
  status: 'registered' | 'attended' | 'cancelled';
}

// POST /events - Create new event (alumni only)
router.post('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizerId = req.user?.uid;
    if (!organizerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify user is alumni
    const userDoc = await db.collection('users').doc(organizerId).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== 'alumni') {
      res.status(403).json({ error: 'Only alumni can create events' });
      return;
    }

    const {
      title,
      description,
      type,
      date,
      time,
      duration,
      location,
      meetingLink,
      maxAttendees,
      isOnline,
      tags
    } = req.body;

    if (!title || !description || !type || !date || !time || !duration) {
      res.status(400).json({ error: 'Required fields: title, description, type, date, time, duration' });
      return;
    }

    const eventId = uuidv4();
    const now = new Date().toISOString();

    const event: Event = {
      id: eventId,
      title: title.trim(),
      description: description.trim(),
      type,
      date,
      time,
      duration,
      location: location?.trim(),
      meetingLink: meetingLink?.trim(),
      maxAttendees: maxAttendees || null,
      isOnline: Boolean(isOnline),
      organizer: {
        id: organizerId,
        name: userData.name || 'Unknown Organizer',
        email: userData.email || '',
        company: userData.company,
        jobRole: userData.jobRole,
      },
      tags: Array.isArray(tags) ? tags : [],
      status: 'upcoming',
      attendeesCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('events').doc(eventId).set(event);
    res.status(201).json({ event, message: 'Event created successfully' });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /events - Get all upcoming events
router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, status, organizer, upcoming } = req.query;
    
    let query: admin.firestore.Query<admin.firestore.DocumentData> | admin.firestore.CollectionReference<admin.firestore.DocumentData> = db.collection('events');

    if (type) {
      query = query.where('type', '==', type);
    }

    if (status) {
      query = query.where('status', '==', status);
    } else if (upcoming === 'true') {
      query = query.where('status', '==', 'upcoming');
    }

    if (organizer) {
      query = query.where('organizer.id', '==', organizer);
    }

    const snapshot = await query.orderBy('date', 'asc').get();
    const events = snapshot.docs.map(doc => doc.data() as Event);

    res.status(200).json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /events/:id - Get specific event
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const eventDoc = await db.collection('events').doc(id).get();

    if (!eventDoc.exists) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const event = eventDoc.data() as Event;
    res.status(200).json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /events/:id - Update event (organizer only)
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;

    const eventDoc = await db.collection('events').doc(id).get();
    if (!eventDoc.exists) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const event = eventDoc.data() as Event;
    if (event.organizer.id !== userId) {
      res.status(403).json({ error: 'Only organizer can update event' });
      return;
    }

    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    delete updates.id;
    delete updates.organizer;
    delete updates.createdAt;
    delete updates.attendeesCount;

    await db.collection('events').doc(id).update(updates);
    res.status(200).json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /events/:id - Delete event (organizer only)
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;

    const eventDoc = await db.collection('events').doc(id).get();
    if (!eventDoc.exists) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const event = eventDoc.data() as Event;
    if (event.organizer.id !== userId) {
      res.status(403).json({ error: 'Only organizer can delete event' });
      return;
    }

    // Delete all registrations first
    const registrationsSnapshot = await db.collection('event_registrations')
      .where('eventId', '==', id).get();
    
    const batch = db.batch();
    registrationsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection('events').doc(id));
    
    await batch.commit();
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /events/:id/register - Register for event
router.post('/:id/register', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const eventDoc = await db.collection('events').doc(id).get();
    if (!eventDoc.exists) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const event = eventDoc.data() as Event;
    if (event.status !== 'upcoming') {
      res.status(400).json({ error: 'Cannot register for this event' });
      return;
    }

    // Check if already registered
    const existingRegistration = await db.collection('event_registrations')
      .where('eventId', '==', id)
      .where('userId', '==', userId)
      .get();

    if (!existingRegistration.empty) {
      res.status(400).json({ error: 'Already registered for this event' });
      return;
    }

    // Check if event is full
    if (event.maxAttendees && event.attendeesCount >= event.maxAttendees) {
      res.status(400).json({ error: 'Event is full' });
      return;
    }

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    const registrationId = uuidv4();
    const registration: EventRegistration = {
      eventId: id,
      userId,
      userName: userData?.name || 'Unknown User',
      userEmail: userData?.email || '',
      registeredAt: new Date().toISOString(),
      status: 'registered',
    };

    // Use transaction to ensure data consistency
    await db.runTransaction(async (transaction) => {
      transaction.set(db.collection('event_registrations').doc(registrationId), registration);
      transaction.update(db.collection('events').doc(id), {
        attendeesCount: event.attendeesCount + 1
      });
    });

    res.status(200).json({ message: 'Successfully registered for event' });
  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /events/:id/register - Unregister from event
router.delete('/:id/register', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;

    const registrationSnapshot = await db.collection('event_registrations')
      .where('eventId', '==', id)
      .where('userId', '==', userId)
      .get();

    if (registrationSnapshot.empty) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }

    const eventDoc = await db.collection('events').doc(id).get();
    if (!eventDoc.exists) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const event = eventDoc.data() as Event;

    // Use transaction to ensure data consistency
    await db.runTransaction(async (transaction) => {
      transaction.delete(registrationSnapshot.docs[0].ref);
      transaction.update(db.collection('events').doc(id), {
        attendeesCount: Math.max(0, event.attendeesCount - 1)
      });
    });

    res.status(200).json({ message: 'Successfully unregistered from event' });
  } catch (error) {
    console.error('Unregister from event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /events/:id/attendees - Get event attendees (organizer only)
router.get('/:id/attendees', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;

    const eventDoc = await db.collection('events').doc(id).get();
    if (!eventDoc.exists) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const event = eventDoc.data() as Event;
    if (event.organizer.id !== userId) {
      res.status(403).json({ error: 'Only organizer can view attendees' });
      return;
    }

    const attendeesSnapshot = await db.collection('event_registrations')
      .where('eventId', '==', id)
      .orderBy('registeredAt', 'desc')
      .get();

    const attendees = attendeesSnapshot.docs.map(doc => doc.data() as EventRegistration);
    res.status(200).json({ attendees });
  } catch (error) {
    console.error('Get attendees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /events/my/registrations - Get user's registered events
router.get('/my/registrations', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.uid;

    const registrationsSnapshot = await db.collection('event_registrations')
      .where('userId', '==', userId)
      .get();

    const eventIds = registrationsSnapshot.docs.map(doc => doc.data().eventId);
    
    if (eventIds.length === 0) {
      res.status(200).json({ events: [] });
      return;
    }

    // Fetch events in batches (Firestore 'in' query limit is 10)
    const events: Event[] = [];
    for (let i = 0; i < eventIds.length; i += 10) {
      const batch = eventIds.slice(i, i + 10);
      const eventsSnapshot = await db.collection('events')
        .where(admin.firestore.FieldPath.documentId(), 'in', batch)  // Use document ID instead of 'id' field
        .get();
      
      eventsSnapshot.docs.forEach(doc => {
        events.push(doc.data() as Event);
      });
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.status(200).json({ events });
  } catch (error) {
    console.error('Get my registrations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;