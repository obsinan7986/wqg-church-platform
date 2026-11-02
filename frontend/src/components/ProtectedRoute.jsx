import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';

/**
 * ProtectedRoute
 * Guards authenticated dashboard routes.
 * Ensures state is safely checked and unauthenticated users or users logging out
 * are smoothly redirected to the public Home page ("/") without React hook or rendering crashes.
 */
const ProtectedRoute = ({ children, redirectTo = '/' }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen label="Fe'aa jira... (Loading profile...)" />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location.pathname + location.search }} replace />;
  }

  return children;
};

export default ProtectedRoute;
