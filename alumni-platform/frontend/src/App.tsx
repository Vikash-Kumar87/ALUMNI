import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Navbar from './components/common/Navbar';
import { startKeepAlive } from './services/keepAlive';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import AlumniDashboard from './pages/AlumniDashboard';
import MentorshipRequests from './pages/MentorshipRequests';
import ProfilePage from './pages/ProfilePage';
import MentorPage from './pages/MentorPage';
import DiscussionForum from './pages/DiscussionForum';
import JobBoard from './pages/JobBoard';
import ChatPage from './pages/ChatPage';
import InterviewPractice from './pages/InterviewPractice';
import CareerChatbot from './pages/CareerChatbot';
import AdminDashboard from './pages/AdminDashboard';
import SkillRoadmap from './pages/SkillRoadmap';
import PaymentSuccess from './pages/PaymentSuccess';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import CoverLetterGenerator from './pages/CoverLetterGenerator';
import WeeklyCareerReport from './pages/WeeklyCareerReport';
import SkillGapAnalyzer from './pages/SkillGapAnalyzer';
import SuccessStoryGenerator from './pages/SuccessStoryGenerator';

/** Layout wrapper that renders the Navbar except on public-only pages */
const AppLayout: React.FC<{ showNav?: boolean; children: React.ReactNode }> = ({ showNav = true, children }) => (
  <>
    {showNav && <Navbar />}
    <main className={showNav ? 'min-h-[calc(100vh-64px)]' : 'min-h-screen'}>
      {children}
    </main>
  </>
);

const App: React.FC = () => {
  useEffect(() => {
    // Keep Render free-tier backend warm; prevents cold-start network errors
    const stopKeepAlive = startKeepAlive();
    return stopKeepAlive;
  }, []);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '10px', fontFamily: 'inherit', fontSize: '14px' },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Public landing page — no Navbar */}
          <Route path="/" element={
            <AppLayout showNav={false}>
              <LandingPage />
            </AppLayout>
          } />

          {/* Auth pages — no Navbar */}
          <Route path="/login" element={
            <AppLayout showNav={false}>
              <LoginPage />
            </AppLayout>
          } />
          <Route path="/signup" element={
            <AppLayout showNav={false}>
              <SignupPage />
            </AppLayout>
          } />

          {/* Protected pages — with Navbar */}
          <Route path="/dashboard" element={
            <AppLayout>
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </AppLayout>
          } />
          <Route path="/profile" element={
            <AppLayout>
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            </AppLayout>
          } />
          <Route path="/mentors" element={
            <AppLayout>
              <ProtectedRoute requiredRole="student">
                <MentorPage />
              </ProtectedRoute>
            </AppLayout>
          } />
          {/* Alumni-only: mentorship requests management */}
          <Route path="/mentorship-requests" element={
            <AppLayout>
              <ProtectedRoute requiredRole="alumni">
                <MentorshipRequests />
              </ProtectedRoute>
            </AppLayout>
          } />

          {/* Success Story Generator — alumni only */}
          <Route path="/success-story" element={
            <AppLayout>
              <ProtectedRoute requiredRole="alumni">
                <SuccessStoryGenerator />
              </ProtectedRoute>
            </AppLayout>
          } />
          {/* Alumni dashboard */}
          <Route path="/alumni-dashboard" element={
            <AppLayout>
              <ProtectedRoute requiredRole="alumni">
                <AlumniDashboard />
              </ProtectedRoute>
            </AppLayout>
          } />
          <Route path="/forum" element={
            <AppLayout>
              <ProtectedRoute>
                <DiscussionForum />
              </ProtectedRoute>
            </AppLayout>
          } />
          <Route path="/jobs" element={
            <AppLayout>
              <ProtectedRoute>
                <JobBoard />
              </ProtectedRoute>
            </AppLayout>
          } />
          <Route path="/chat" element={
            <AppLayout>
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            </AppLayout>
          } />
          <Route path="/interview" element={
            <AppLayout>
              <ProtectedRoute requiredRole="student">
                <InterviewPractice />
              </ProtectedRoute>
            </AppLayout>
          } />
          <Route path="/chatbot" element={
            <AppLayout>
              <ProtectedRoute requiredRole="student">
                <CareerChatbot />
              </ProtectedRoute>
            </AppLayout>
          } />

          {/* Admin-only route */}
          <Route path="/admin" element={
            <AppLayout>
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            </AppLayout>
          } />

          {/* Skill Roadmap — student only */}
          <Route path="/roadmap" element={
            <AppLayout>
              <ProtectedRoute requiredRole="student">
                <SkillRoadmap />
              </ProtectedRoute>
            </AppLayout>
          } />

          <Route path="/resume" element={
            <AppLayout>
              <ProtectedRoute requiredRole="student">
                <ResumeAnalyzer />
              </ProtectedRoute>
            </AppLayout>
          } />

          {/* Cover Letter Generator — student only */}
          <Route path="/cover-letter" element={
            <AppLayout>
              <ProtectedRoute requiredRole="student">
                <CoverLetterGenerator />
              </ProtectedRoute>
            </AppLayout>
          } />

          {/* Weekly Career Report — student only */}
          <Route path="/weekly-report" element={
            <AppLayout>
              <ProtectedRoute requiredRole="student">
                <WeeklyCareerReport />
              </ProtectedRoute>
            </AppLayout>
          } />

          {/* Skill Gap Analyzer — student only */}
          <Route path="/skill-gap" element={
            <AppLayout>
              <ProtectedRoute requiredRole="student">
                <SkillGapAnalyzer />
              </ProtectedRoute>
            </AppLayout>
          } />

          {/* Payment success — protected, no specific role */}
          <Route path="/payment-success" element={
            <AppLayout showNav={false}>
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            </AppLayout>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
