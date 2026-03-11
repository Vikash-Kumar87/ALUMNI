import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { FiCheckCircle, FiMessageCircle, FiHome, FiClock, FiDollarSign } from 'react-icons/fi';

interface SessionState {
  mentorName: string;
  sessionDuration: string;
  amount: number;
  mentorId: string;
}

const PaymentSuccess: React.FC = () => {
  const { state } = useLocation();
  const { mentorName, sessionDuration, amount, mentorId } = (state as SessionState) || {};

  if (!mentorName) return <Navigate to="/mentors" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
        <div className="relative inline-block mb-5">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <FiCheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <span className="absolute inset-0 rounded-full bg-green-300 opacity-30 animate-ping" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Booking Confirmed!</h1>
        <p className="text-gray-500 mb-6 text-sm">Your mentorship session has been booked successfully.</p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Mentor</span>
            <span className="font-semibold text-gray-800">{mentorName}</span>
          </div>
          {amount && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1"><FiDollarSign className="w-3.5 h-3.5" /> Amount</span>
              <span className="font-semibold text-green-600">₹{amount}</span>
            </div>
          )}
          {sessionDuration && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1"><FiClock className="w-3.5 h-3.5" /> Duration</span>
              <span className="font-semibold text-gray-800">{sessionDuration}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className="font-semibold text-green-600">Booked ✓</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link to={`/chat?userId=${mentorId}`} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
            <FiMessageCircle className="w-4 h-4" /> Start Chat
          </Link>
          <Link to="/dashboard" className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm">
            <FiHome className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

