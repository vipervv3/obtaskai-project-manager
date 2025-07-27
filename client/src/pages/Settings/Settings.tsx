import React, { useState } from 'react';
import CalendarIntegration from '../../components/Settings/CalendarIntegration';
import NotificationPreferences from '../../components/Settings/NotificationPreferences';
import ProfileSettings from '../../components/Settings/ProfileSettings';
import SecuritySettings from '../../components/Settings/SecuritySettings';
import AppearanceSettings from '../../components/Settings/AppearanceSettings';
import { 
  Cog6ToothIcon, 
  CalendarIcon, 
  BellIcon, 
  UserCircleIcon,
  ShieldCheckIcon,
  PaintBrushIcon
} from '@heroicons/react/24/outline';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'calendar' | 'profile' | 'security' | 'appearance'>('notifications');
  
  const handleCalendarIntegrationUpdate = () => {
    // Refresh the page or update the calendar state
    window.location.reload();
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
    { id: 'notifications', name: 'Daily Assistant', icon: BellIcon },
    { id: 'calendar', name: 'Calendar', icon: CalendarIcon },
    { id: 'profile', name: 'Profile', icon: UserCircleIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'appearance', name: 'Appearance', icon: PaintBrushIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {activeTab === 'general' && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>
                  <p className="text-gray-600">General settings functionality coming soon...</p>
                </div>
              )}
              
              {activeTab === 'notifications' && (
                <NotificationPreferences />
              )}
              
              {activeTab === 'calendar' && (
                <CalendarIntegration onIntegrationUpdate={handleCalendarIntegrationUpdate} />
              )}
              
              {activeTab === 'profile' && (
                <ProfileSettings />
              )}
              
              {activeTab === 'security' && (
                <SecuritySettings />
              )}
              
              {activeTab === 'appearance' && (
                <AppearanceSettings />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;