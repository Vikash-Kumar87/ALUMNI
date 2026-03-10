import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'student' | 'alumni' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullPage text="Loading..." />;
  if (!currentUser) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!userProfile) return <Navigate to="/signup" state={{ from: location }} replace />;
  if (requiredRole && userProfile.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
