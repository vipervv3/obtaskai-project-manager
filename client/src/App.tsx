import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from './store';
import { setInitialized, setUser } from './store/slices/authSlice';

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
import AIDashboard from './pages/AI/AIDashboard';
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
    // Safe initialization without external service calls
    const initAuth = () => {
      try {
        const token = localStorage.getItem('access_token');
        const userData = localStorage.getItem('user_data');
        
        if (token && userData) {
          const user = JSON.parse(userData);
          dispatch(setUser(user));
        }
      } catch (error) {
        console.warn('Failed to restore auth state:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
      }
      
      dispatch(setInitialized());
    };

    if (!initialized) {
      initAuth();
    }
  }, [dispatch, initialized]);

  // Initialize real-time notifications when user is authenticated (disabled for now)
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('User authenticated:', user.id);
      // Real-time notifications disabled for stability
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
        
        {/* AI Dashboard */}
        <Route path="ai" element={<AIDashboard />} />
        
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