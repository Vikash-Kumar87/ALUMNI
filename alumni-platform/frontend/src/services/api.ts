import axios, { AxiosRequestConfig } from 'axios';
import { auth } from '../config/firebase';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Render free tier can take 30-50s to cold-start — give it enough time
const REQUEST_TIMEOUT = 65000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 3000; // 3s, 6s, 9s

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const apiService = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT,
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

// Response interceptor: dismiss wakeup toast on success, retry on network/server errors
apiService.interceptors.response.use(
  (response) => {
    toast.dismiss('server-wakeup');
    return response;
  },
  async (error) => {
    const config = error.config;

    if (!config) {
      const message = error.response?.data?.error || error.message || 'Something went wrong';
      return Promise.reject(new Error(message));
    }

    const isNetworkError = !error.response; // server never responded
    const isServerError = error.response?.status >= 500;

    if (!config._retryCount) config._retryCount = 0;

    if ((isNetworkError || isServerError) && config._retryCount < MAX_RETRIES) {
      config._retryCount += 1;

      if (config._retryCount === 1) {
        // First retry — backend is likely cold-starting on Render free tier
        toast.loading('Server is waking up, please wait…', { id: 'server-wakeup', duration: Infinity });
      }

      await sleep(RETRY_BASE_DELAY * config._retryCount);
      return apiService(config);
    }

    toast.dismiss('server-wakeup');
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

export const paymentsAPI = {
  bookSession: (mentorId: string) =>
    apiService.post('/payments/book-session', { mentorId }),
  getMentorSessions: () => apiService.get('/payments/mentor-sessions'),
  getStudentSessions: () => apiService.get('/payments/student-sessions'),
  checkSession: (mentorId: string) =>
    apiService.get(`/payments/check-session/${mentorId}`),
  updateMentorSettings: (data: {
    price_per_session?: number;
    session_duration?: string;
    availability?: string;
  }) => apiService.put('/payments/mentor-settings', data),
};

export default apiService;
