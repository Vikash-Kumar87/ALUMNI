// ===== User Types =====
export interface User {
  uid: string;
  name: string;
  email: string;
  role: 'student' | 'alumni' | 'admin';
  skills: string[];
  avatar?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
  // Student fields
  branch?: string;
  year?: number;
  interests?: string[];
  goals?: string;
  // Alumni fields
  company?: string;
  jobRole?: string;
  experience?: number;
  linkedin?: string;
}

// ===== Job Types =====
export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  type: 'job' | 'internship' | 'referral';
  location: string;
  salary?: string;
  requirements: string[];
  applyLink?: string;
  referral?: string;
  postedBy: string;
  postedByName: string;
  createdAt: string;
}

// ===== Discussion Types =====
export interface Answer {
  id: string;
  answer: string;
  answeredBy: string;
  answeredByName: string;
  answeredByRole: string;
  upvotes: number;
  upvotedBy: string[];
  createdAt: string;
}

export interface Discussion {
  id: string;
  question: string;
  tags: string[];
  postedBy: string;
  postedByName: string;
  answers: Answer[];
  upvotes: number;
  upvotedBy?: string[];
  createdAt: string;
  updatedAt: string;
}

// ===== Message Types =====
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface Conversation {
  chatRoomId: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt: string;
  otherUser: User | null;
}

// ===== Mentorship Types =====
export interface MentorshipRequest {
  id: string;
  studentId: string;
  alumniId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string;
  createdAt: string;
}

// ===== AI Types =====
export interface InterviewQuestion {
  id: number;
  question: string;
  category: string;
  hint: string;
}

export interface InterviewEvaluation {
  score: number;
  grade: string;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
  feedback: string;
}

export interface RoadmapPhase {
  phase: number;
  title: string;
  duration: string;
  topics: string[];
  resources: { name: string; type: string; free: boolean }[];
  milestone: string;
}

export interface Roadmap {
  title: string;
  totalDuration: string;
  phases: RoadmapPhase[];
  tools: string[];
  tips: string[];
}

export interface MentorRecommendation {
  uid: string;
  matchScore: number;
  reason: string;
  alumni: User;
}

export interface SkillGapSkill {
  skill: string;
  importance: 'Essential' | 'Important' | 'Nice to have';
  currentLevel: string;
  targetLevel: string;
  resources: string[];
}

export interface SkillGapAnalysis {
  targetRole: string;
  requiredSkills: SkillGapSkill[];
  gapScore: number;
  estimatedTime: string;
  prioritizedLearningPath: string[];
}

export interface ResumeReview {
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: { section: string; issue: string; fix: string }[];
  keywords: { present: string[]; missing: string[] };
  atsScore: number;
  actionItems: string[];
}

// ===== Analytics =====
export interface PlatformStats {
  totalUsers: number;
  students: number;
  alumni: number;
  activeJobs: number;
  discussions: number;
  activeMentorships: number;
}

// ===== Chat Message History for Gemini =====
export interface ChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

// ===== Notifications =====
export type NotificationType =
  | 'mentorship_request'
  | 'mentorship_accepted'
  | 'mentorship_rejected'
  | 'new_job'
  | 'discussion_answer'
  | 'message';

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
