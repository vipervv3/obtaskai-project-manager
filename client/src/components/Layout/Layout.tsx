import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { initializeTheme } from '../../store/slices/uiSlice';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationPanel from '../Notifications/NotificationPanel';

const Layout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { sidebarOpen, theme } = useSelector((state: RootState) => state.ui);

  useEffect(() => {
    dispatch(initializeTheme());
  }, [dispatch]);

  useEffect(() => {
    // Apply theme class to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className={`min-h-screen bg-gray-50 ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content */}
        <div className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-16'
        }`}>
          {/* Header */}
          <Header />
          
          {/* Page content */}
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
      
      {/* Notification Panel */}
      <NotificationPanel />
    </div>
  );
};

export default Layout;