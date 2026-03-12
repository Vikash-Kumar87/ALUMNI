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
  // Mentorship pricing
  price_per_session?: number;
  session_duration?: string;
  availability?: string;
}

// ===== Paid Session Types =====
export interface PaidSession {
  id: string;
  student_id: string;
  mentor_id: string;
  amount: number;
  commission_amount: number;
  mentor_earning: number;
  payment_status: 'success' | 'failed' | 'pending';
  session_status: 'booked' | 'completed' | 'cancelled';
  created_at: string;
  student_name?: string;
  mentor_name?: string;
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

// ===== Weekly Career Report Types =====
export interface WeeklyReportLearnItem {
  topic: string;
  why: string;
  estimatedHours: number;
  resources: { title: string; url: string; type: 'video' | 'article' | 'course' | 'docs' }[];
}
export interface WeeklyReportJob {
  title: string;
  company: string;
  matchReason: string;
  urgency: 'hot' | 'normal';
  skills: string[];
}
export interface WeeklyReportMentor {
  name: string;
  role: string;
  company: string;
  matchReason: string;
  skills: string[];
}
export interface WeeklyReportSkillGap {
  skill: string;
  priority: 'high' | 'medium' | 'low';
  gap: string;
}
export interface WeeklyReport {
  greeting: string;
  weekLabel: string;
  energyLevel: 'leveling_up' | 'momentum' | 'focused' | 'catching_up';
  learn: WeeklyReportLearnItem[];
  jobs: WeeklyReportJob[];
  mentors: WeeklyReportMentor[];
  skillGaps: WeeklyReportSkillGap[];
  trending: string[];
  weeklyGoal: string;
  quote: string;
  stats: { profileStrength: number; weeklyOpportunities: number; mentorMatches: number };
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
  voiceInsights?: {
    confidenceScore: number;
    tone: string;
    pace: string;
    wpm: number;
    clarity: number;
    tips: string[];
    verdict: string;
  };
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

// ===== Chat Message History for Groq =====
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
