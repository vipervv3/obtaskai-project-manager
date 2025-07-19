import React, { useEffect, useState } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <div className="flex relative">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        
        {/* Sidebar - Hidden on mobile by default */}
        <div className={`${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          <Sidebar onMobileClose={() => setMobileMenuOpen(false)} />
        </div>
        
        {/* Main content */}
        <div className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
        } ml-0`}>
          {/* Header with mobile menu button */}
          <Header onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
          
          {/* Page content */}
          <main className="p-4 sm:p-6">
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