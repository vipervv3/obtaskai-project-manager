import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from './store';
import { getCurrentUser, setInitialized } from './store/slices/authSlice';
import { authService } from './services/authService';
import { notificationEngine } from './services/notificationEngine';

// Layout components
import Layout from './components/Layout/Layout';
import AuthLayout from './components/Layout/AuthLayout';

// Auth pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';

// Main app pages
import Dashboard from './pages/Dashboard/Dashboard';
import Projects from './pages/Projects/Projects';
import ProjectDetail from './pages/Projects/ProjectDetail';
import Tasks from './pages/Tasks/Tasks';
import TaskDetail from './pages/Tasks/TaskDetail';
import Calendar from './pages/Calendar/Calendar';
import Meetings from './pages/Meetings/Meetings';
import MeetingDetail from './pages/Meetings/MeetingDetail';
import Team from './pages/Team/Team';
import Settings from './pages/Settings/Settings';
import Profile from './pages/Profile/Profile';

// Components
import LoadingSpinner from './components/UI/LoadingSpinner';
import ProtectedRoute from './components/Auth/ProtectedRoute';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, loading, user, initialized } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Check if user is already authenticated on app load
    const token = authService.getToken();
    if (token && !isAuthenticated && !loading && !initialized) {
      console.log('Found stored token, fetching user data...');
      dispatch(getCurrentUser()).catch((error) => {
        console.error('Failed to restore user session:', error);
        console.error('Error details:', error.response?.data);
        // Clear invalid tokens
        authService.clearTokens();
        dispatch(setInitialized());
      });
    } else if (!token && !initialized) {
      // No token found, mark as initialized
      console.log('No token found, marking as initialized');
      dispatch(setInitialized());
    }
  }, [dispatch, isAuthenticated, loading, initialized]);

  // Initialize real-time notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('Initializing real-time notifications for user:', user.id);
      
      // Connect to real-time notifications
      notificationEngine.connect(user.id);
      
      // Request notification permissions
      notificationEngine.requestNotificationPermission();
      
      // Cleanup on unmount
      return () => {
        notificationEngine.disconnect();
      };
    }
  }, [isAuthenticated, user]);

  // Show loading while checking authentication or during auth operations
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Protected app routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* Projects */}
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:projectId" element={<ProjectDetail />} />
        
        {/* Tasks */}
        <Route path="tasks" element={<Tasks />} />
        <Route path="tasks/:taskId" element={<TaskDetail />} />
        
        {/* Calendar */}
        <Route path="calendar" element={<Calendar />} />
        
        {/* Meetings */}
        <Route path="meetings" element={<Meetings />} />
        <Route path="meetings/:meetingId" element={<MeetingDetail />} />
        
        {/* Team & User Management */}
        <Route path="team" element={<Team />} />
        
        {/* Settings & Profile */}
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Redirect to login if not authenticated */}
      <Route path="*" element={
        isAuthenticated ? (
          <Navigate to="/dashboard" replace />
        ) : (
          <Navigate to="/auth/login" replace />
        )
      } />
    </Routes>
  );
}

export default App;