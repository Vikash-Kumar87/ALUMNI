import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCalendar, FiClock, FiMapPin, FiVideo, FiUsers, FiTag, FiPlus,
  FiFilter, FiSearch, FiExternalLink, FiUser, FiBriefcase, FiMail,
  FiTrendingUp, FiCheckCircle, FiX, FiEdit, FiTrash2
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import CreateEventModal from '../components/CreateEventModal';

type EventType = 'webinar' | 'workshop' | 'networking' | 'conference' | 'meetup';
type FilterType = 'all' | EventType;

interface Event {
  id: string;
  title: string;
  description: string;
  type: EventType;
  date: string;
  time: string;
  duration: number;
  location?: string;
  meetingLink?: string;
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

const EventsBoard: React.FC = () => {
  const { userProfile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);

  /* ── Event type configurations ─────────────────────────── */
  const eventTypeConfig = {
    webinar: { icon: '🎥', label: 'Webinar', bg: 'from-blue-500 to-blue-600', ring: 'ring-blue-500/20' },
    workshop: { icon: '🛠️', label: 'Workshop', bg: 'from-green-500 to-green-600', ring: 'ring-green-500/20' },
    networking: { icon: '🤝', label: 'Networking', bg: 'from-purple-500 to-purple-600', ring: 'ring-purple-500/20' },
    conference: { icon: '🏢', label: 'Conference', bg: 'from-indigo-500 to-indigo-600', ring: 'ring-indigo-500/20' },
    meetup: { icon: '☕', label: 'Meetup', bg: 'from-amber-500 to-amber-600', ring: 'ring-amber-500/20' },
  };

  /* ── Load events and user registrations ─────────────────── */
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const [eventsResponse, registrationsResponse] = await Promise.all([
          eventsAPI.getAll({ upcoming: true }),
          eventsAPI.getMyRegistrations(),
        ]);
        
        const allEvents = eventsResponse.data.events || [];
        const myRegistrations = registrationsResponse.data.events || [];
        
        setEvents(allEvents);
        setRegisteredEventIds(new Set(myRegistrations.map((e: Event) => e.id)));
      } catch (err) {
        console.error('Failed to fetch events:', err);
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  /* ── Filter and search events ─────────────────────────── */
  useEffect(() => {
    let filtered = events;

    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.type === filterType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.organizer.name.toLowerCase().includes(query) ||
        event.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredEvents(filtered);
  }, [events, filterType, searchQuery]);

  /* ── Handle event registration ─────────────────────────── */
  const handleRegister = async (eventId: string) => {
    try {
      setRegisteringEventId(eventId);
      
      if (registeredEventIds.has(eventId)) {
        await eventsAPI.unregister(eventId);
        setRegisteredEventIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
        toast.success('Successfully unregistered from event');
      } else {
        await eventsAPI.register(eventId);
        setRegisteredEventIds(prev => new Set(prev).add(eventId));
        toast.success('Successfully registered for event!');
      }
      
      // Update attendees count locally
      setEvents(prev => prev.map(event => {
        if (event.id === eventId) {
          return {
            ...event,
            attendeesCount: registeredEventIds.has(eventId) 
              ? event.attendeesCount - 1 
              : event.attendeesCount + 1
          };
        }
        return event;
      }));
      
    } catch (err) {
      console.error('Registration error:', err);
      toast.error('Failed to update registration');
    } finally {
      setRegisteringEventId(null);
    }
  };

  /* ── Format date and time ─────────────────────────────── */
  const formatEventDateTime = (date: string, time: string) => {
    try {
      const eventDate = parseISO(date);
      const [hours, minutes] = time.split(':');
      eventDate.setHours(parseInt(hours), parseInt(minutes));
      
      return {
        date: format(eventDate, 'MMM dd'),
        time: format(eventDate, 'h:mm a'),
        dayOfWeek: format(eventDate, 'EEEE'),
        isToday: format(eventDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
        isTomorrow: format(eventDate, 'yyyy-MM-dd') === format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      };
    } catch (err) {
      return { date: date, time: time, dayOfWeek: '', isToday: false, isTomorrow: false };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading events...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* ── Hero Header ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 relative overflow-hidden"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 px-6 py-16 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
                <FiCalendar className="w-6 h-6 text-white" />
                <span className="text-white font-semibold">Events & Webinars</span>
              </div>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-6xl font-bold text-white mb-4"
            >
              Connect & Learn
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-white/90 max-w-2xl mx-auto"
            >
              Join exclusive events, webinars, and workshops hosted by industry experts and alumni
            </motion.p>
          </div>

          {/* ── Search and Filter Section ─────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Search */}
              <div className="flex-1 relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search events, speakers, topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all"
                />
              </div>
              
              {/* Create Event Button (Alumni only) */}
              {userProfile?.role === 'alumni' && (
                <motion.button
                  onClick={() => setShowCreateModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 shadow-lg"
                >
                  <FiPlus className="w-5 h-5" />
                  Create Event
                </motion.button>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2">
              {(['all', ...Object.keys(eventTypeConfig)] as FilterType[]).map((type) => {
                const config = type === 'all' 
                  ? { icon: '📅', label: 'All Events' }
                  : eventTypeConfig[type as EventType];
                
                return (
                  <motion.button
                    key={type}
                    onClick={() => setFilterType(type)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      filterType === type
                        ? 'bg-white text-indigo-600 shadow-lg'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    <span>{config.icon}</span>
                    <span className="text-sm">{config.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Events Grid ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {filteredEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCalendar className="w-12 h-12 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Be the first to create an event!'}
            </p>
            {userProfile?.role === 'alumni' && !searchQuery && filterType === 'all' && (
              <motion.button
                onClick={() => setShowCreateModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
              >
                Create Your First Event
              </motion.button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredEvents.map((event, index) => {
                const config = eventTypeConfig[event.type];
                const dateTime = formatEventDateTime(event.date, event.time);
                const isRegistered = registeredEventIds.has(event.id);
                const isRegistering = registeringEventId === event.id;
                const isFull = event.maxAttendees && event.attendeesCount >= event.maxAttendees;
                const canRegister = event.status === 'upcoming' && !isFull;

                return (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -4 }}
                    className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border ${config.ring}`}
                  >
                    {/* Event header with type badge */}
                    <div className="relative p-6 pb-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`px-3 py-1.5 bg-gradient-to-r ${config.bg} text-white text-xs font-semibold rounded-full flex items-center gap-1.5`}>
                          <span>{config.icon}</span>
                          {config.label}
                        </div>
                        
                        {dateTime.isToday && (
                          <div className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                            TODAY
                          </div>
                        )}
                        {dateTime.isTomorrow && (
                          <div className="px-2 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">
                            TOMORROW
                          </div>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                        {event.title}
                      </h3>
                      
                      <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                        {event.description}
                      </p>

                      {/* Event details */}
                      <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <FiCalendar className="w-4 h-4" />
                          <span className="font-medium">{dateTime.dayOfWeek}, {dateTime.date}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <FiClock className="w-4 h-4" />
                          <span>{dateTime.time} • {event.duration}min</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {event.isOnline ? (
                            <>
                              <FiVideo className="w-4 h-4" />
                              {isRegistered ? (
                                <a
                                  href={event.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:underline font-semibold truncate"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Join Meeting
                                </a>
                              ) : (
                                <span>Online Event</span>
                              )}
                            </>
                          ) : (
                            <>
                              <FiMapPin className="w-4 h-4" />
                              <span className="truncate">{event.location}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <FiUsers className="w-4 h-4" />
                          <span>
                            {event.attendeesCount} attendee{event.attendeesCount !== 1 ? 's' : ''}
                            {event.maxAttendees && ` • ${event.maxAttendees} max`}
                          </span>
                        </div>
                      </div>

                      {/* Tags */}
                      {event.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-4">
                          {event.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                          {event.tags.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                              +{event.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Organizer info */}
                    <div className="px-6 py-4 bg-gray-50 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {event.organizer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{event.organizer.name}</p>
                            <p className="text-xs text-gray-500">
                              {event.organizer.jobRole || 'Organizer'}
                              {event.organizer.company && ` • ${event.organizer.company}`}
                            </p>
                          </div>
                        </div>

                        {/* Register button */}
                        <motion.button
                          onClick={() => canRegister && handleRegister(event.id)}
                          disabled={!canRegister || isRegistering}
                          whileHover={canRegister ? { scale: 1.02 } : {}}
                          whileTap={canRegister ? { scale: 0.98 } : {}}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                            isRegistered
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : isFull
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : canRegister
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {isRegistering ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : isRegistered ? (
                            <>
                              <FiCheckCircle className="w-4 h-4" />
                              Registered
                            </>
                          ) : isFull ? (
                            'Full'
                          ) : canRegister ? (
                            'Register'
                          ) : (
                            'Ended'
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Create Event Modal ─────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateEventModal
            onClose={() => setShowCreateModal(false)}
            onEventCreated={(newEvent) => {
              setEvents(prev => [newEvent, ...prev]);
              setShowCreateModal(false);
              toast.success('Event created successfully!');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventsBoard;