import axios, { AxiosRequestConfig } from 'axios';
import { auth } from '../config/firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiService = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach Firebase ID token to every request
apiService.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // Token refresh failed, proceed without token
    }
  }
  return config;
});

// Response error handler
apiService.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

// ===== API Functions =====

export const authAPI = {
  signup: (data: Record<string, unknown>, config?: AxiosRequestConfig) =>
    apiService.post('/auth/signup', data, config),
  login: (config?: AxiosRequestConfig) =>
    apiService.post('/auth/login', {}, config),
};

export const usersAPI = {
  getStats: () => apiService.get('/users/stats'),
  getUser: (uid: string) => apiService.get(`/users/${uid}`),
  getAllUsers: () => apiService.get('/users/list'),
  updateProfile: (uid: string, data: Record<string, unknown>) =>
    apiService.put(`/users/${uid}`, data),
  deleteUser: (uid: string) => apiService.delete(`/users/${uid}`),
};

export const mentorsAPI = {
  getAll: (params?: { skill?: string; search?: string }) =>
    apiService.get('/mentors', { params }),
  requestMentorship: (alumniId: string, message: string) =>
    apiService.post('/mentors/request', { alumniId, message }),
  updateRequest: (id: string, status: 'accepted' | 'rejected') =>
    apiService.put(`/mentors/request/${id}`, { status }),
  getMyRequests: () => apiService.get('/mentors/my-requests'),
};

export const discussionAPI = {
  getAll: () => apiService.get('/discussion'),
  create: (data: { question: string; tags?: string[] }) =>
    apiService.post('/discussion', data),
  answer: (id: string, answer: string) =>
    apiService.post(`/discussion/${id}/answer`, { answer }),
  upvote: (id: string) => apiService.post(`/discussion/${id}/upvote`),
  upvoteAnswer: (id: string, answerId: string) =>
    apiService.post(`/discussion/${id}/upvote-answer/${answerId}`),
  delete: (id: string) => apiService.delete(`/discussion/${id}`),
};

export const jobsAPI = {
  getAll: (params?: { type?: string; search?: string }) =>
    apiService.get('/jobs', { params }),
  getById: (id: string) => apiService.get(`/jobs/${id}`),
  create: (data: Record<string, unknown>) => apiService.post('/jobs', data),
  update: (id: string, data: Record<string, unknown>) =>
    apiService.put(`/jobs/${id}`, data),
  delete: (id: string) => apiService.delete(`/jobs/${id}`),
};

export const chatAPI = {
  sendMessage: (receiverId: string, message: string) =>
    apiService.post('/chat', { receiverId, message }),
  getConversations: () => apiService.get('/chat/conversations'),
  getMessages: (chatRoomId: string) => apiService.get(`/chat/${chatRoomId}`),
};

export const aiAPI = {
  careerGuidance: (message: string, history?: unknown[]) =>
    apiService.post('/ai/career-guidance', { message, history }),
  generateInterviewQuestions: (topic: string, difficulty: string) =>
    apiService.post('/ai/interview', { action: 'generate', topic, difficulty }),
  evaluateAnswer: (topic: string, question: string, answer: string) =>
    apiService.post('/ai/interview', { action: 'evaluate', topic, question, answer }),
  getMentorRecommendations: () => apiService.post('/ai/mentor-recommend'),
  getSkillRoadmap: (goal: string, currentSkills: string[], timeframe: string) =>
    apiService.post('/ai/skill-roadmap', { goal, currentSkills, timeframe }),
  reviewResume: (resumeText: string, targetRole: string) =>
    apiService.post('/ai/resume-review', { resumeText, targetRole }),
  analyzeSkillGap: (currentSkills: string[], targetRole: string) =>
    apiService.post('/ai/skill-gap', { currentSkills, targetRole }),
};

export const notificationsAPI = {
  getAll: () => apiService.get('/notifications'),
  markRead: (id: string) => apiService.put(`/notifications/${id}/read`),
  markAllRead: () => apiService.put('/notifications/read-all'),
};

export default apiService;
