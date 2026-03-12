/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { eventsAPI } from '../services/api';
import { motion } from 'framer-motion';
import {
  FiX, FiCalendar, FiClock, FiMapPin, FiVideo, FiUsers, FiTag,
  FiType, FiFileText, FiLink, FiPlus, FiMinus, FiSave
} from 'react-icons/fi';
import toast from 'react-hot-toast';

type EventType = 'webinar' | 'workshop' | 'networking' | 'conference' | 'meetup';

interface CreateEventModalProps {
  onClose: () => void;
  onEventCreated: (event: any) => void;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ onClose, onEventCreated }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'webinar' as EventType,
    date: '',
    time: '',
    duration: 60,
    location: '',
    meetingLink: '',
    maxAttendees: '',
    isOnline: true,
    tags: [] as string[],
  });
  
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const eventTypes = [
    { value: 'webinar', label: 'Webinar', icon: '🎥', desc: 'Online presentation or seminar' },
    { value: 'workshop', label: 'Workshop', icon: '🛠️', desc: 'Hands-on learning session' },
    { value: 'networking', label: 'Networking', icon: '🤝', desc: 'Professional networking event' },
    { value: 'conference', label: 'Conference', icon: '🏢', desc: 'Large-scale professional event' },
    { value: 'meetup', label: 'Meetup', icon: '☕', desc: 'Casual community gathering' },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Event title is required';
    if (!formData.description.trim()) newErrors.description = 'Event description is required';
    if (!formData.date) newErrors.date = 'Event date is required';
    if (!formData.time) newErrors.time = 'Event time is required';
    if (formData.duration < 15) newErrors.duration = 'Duration must be at least 15 minutes';
    if (formData.duration > 480) newErrors.duration = 'Duration cannot exceed 8 hours';
    
    if (!formData.isOnline && !formData.location.trim()) {
      newErrors.location = 'Location is required for in-person events';
    }
    
    if (formData.isOnline && !formData.meetingLink.trim()) {
      newErrors.meetingLink = 'Meeting link is required for online events';
    }

    // Validate date is not in the past
    const eventDate = new Date(`${formData.date}T${formData.time}`);
    if (eventDate <= new Date()) {
      newErrors.date = 'Event cannot be scheduled in the past';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    try {
      setLoading(true);
      
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        location: formData.isOnline ? undefined : formData.location.trim(),
        meetingLink: formData.isOnline ? formData.meetingLink.trim() : undefined,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
        isOnline: formData.isOnline,
        tags: formData.tags.filter(tag => tag.trim().length > 0),
      };

      console.log('Creating event with data:', eventData); // Debug log

      const response = await eventsAPI.create(eventData);
      console.log('Event created successfully:', response.data); // Debug log
      
      toast.success('Event created successfully!');
      onEventCreated(response.data.event);
      onClose();
    } catch (err: any) {
      console.error('Create event error:', err);
      console.error('Error response:', err.response?.data); // Debug log
      
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create event';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim()) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create New Event</h2>
              <p className="text-indigo-100">Share your knowledge with the community</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="h-full max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="p-6 space-y-6">
            
            {/* Event Type Selection */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <FiType className="w-4 h-4" />
                Event Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {eventTypes.map((type) => (
                  <motion.button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: type.value as EventType }))}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      formData.type === type.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{type.icon}</span>
                      <span className="font-semibold text-gray-900">{type.label}</span>
                    </div>
                    <p className="text-sm text-gray-600">{type.desc}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <FiFileText className="w-4 h-4" />
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter a compelling event title..."
                className={`w-full p-4 border-2 rounded-xl focus:outline-none transition-colors ${
                  errors.title ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                }`}
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <FiFileText className="w-4 h-4" />
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what attendees will learn or experience..."
                rows={4}
                className={`w-full p-4 border-2 rounded-xl focus:outline-none transition-colors resize-none ${
                  errors.description ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                }`}
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FiCalendar className="w-4 h-4" />
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className={`w-full p-4 border-2 rounded-xl focus:outline-none transition-colors ${
                    errors.date ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                  }`}
                />
                {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FiClock className="w-4 h-4" />
                  Time *
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className={`w-full p-4 border-2 rounded-xl focus:outline-none transition-colors ${
                    errors.time ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                  }`}
                />
                {errors.time && <p className="mt-1 text-sm text-red-600">{errors.time}</p>}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FiClock className="w-4 h-4" />
                  Duration (minutes) *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, duration: Math.max(15, prev.duration - 15) }))}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <FiMinus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                    min="15"
                    max="480"
                    className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, duration: Math.min(480, prev.duration + 15) }))}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <FiPlus className="w-4 h-4" />
                  </button>
                </div>
                {errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration}</p>}
              </div>
            </div>

            {/* Online/Offline Toggle */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <FiVideo className="w-4 h-4" />
                Event Location
              </label>
              <div className="flex gap-4 mb-4">
                <motion.button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isOnline: true }))}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 p-4 border-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    formData.isOnline
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <FiVideo className="w-5 h-5" />
                  Online Event
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isOnline: false }))}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 p-4 border-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    !formData.isOnline
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <FiMapPin className="w-5 h-5" />
                  In-Person Event
                </motion.button>
              </div>

              {formData.isOnline ? (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FiLink className="w-4 h-4" />
                    Meeting Link *
                  </label>
                  <input
                    type="url"
                    value={formData.meetingLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
                    placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                    className={`w-full p-4 border-2 rounded-xl focus:outline-none transition-colors ${
                      errors.meetingLink ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                    }`}
                  />
                  {errors.meetingLink && <p className="mt-1 text-sm text-red-600">{errors.meetingLink}</p>}
                </div>
              ) : (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FiMapPin className="w-4 h-4" />
                    Venue Address *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Enter the venue address..."
                    className={`w-full p-4 border-2 rounded-xl focus:outline-none transition-colors ${
                      errors.location ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                    }`}
                  />
                  {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
                </div>
              )}
            </div>

            {/* Max Attendees */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <FiUsers className="w-4 h-4" />
                Maximum Attendees (Optional)
              </label>
              <input
                type="number"
                value={formData.maxAttendees}
                onChange={(e) => setFormData(prev => ({ ...prev, maxAttendees: e.target.value }))}
                placeholder="Leave empty for unlimited"
                min="1"
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Set a limit to create exclusivity, or leave empty for open registration
              </p>
            </div>

            {/* Tags */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <FiTag className="w-4 h-4" />
                Tags (Max 5)
              </label>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag) => (
                  <motion.span
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-2"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-indigo-500 hover:text-indigo-700"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </motion.span>
                ))}
              </div>

              {formData.tags.length < 5 && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag..."
                    className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                  <motion.button
                    type="button"
                    onClick={addTag}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={!newTag.trim()}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                  >
                    Add
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50 flex gap-3">
            <motion.button
              type="button"
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={loading ? {} : { scale: 1.02 }}
              whileTap={loading ? {} : { scale: 0.98 }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Event...
                </>
              ) : (
                <>
                  <FiSave className="w-5 h-5" />
                  Create Event
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CreateEventModal;