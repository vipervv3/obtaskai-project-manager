import React, { useState, useEffect } from 'react';
import { 
  EnvelopeIcon, 
  ClockIcon, 
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  CpuChipIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import apiService from '../../services/api';

interface NotificationSettings {
  email_notifications: boolean;
  morning_digest: boolean;
  lunch_reminder: boolean;
  end_of_day_summary: boolean;
  meeting_reminders: boolean;
  task_reminders: boolean;
  ai_insights: boolean;
  urgent_only: boolean;
  working_hours_start: string;
  working_hours_end: string;
  timezone: string;
  notification_frequency: 'realtime' | 'hourly' | 'daily';
}

const NotificationPreferences: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    morning_digest: true,
    lunch_reminder: true,
    end_of_day_summary: true,
    meeting_reminders: true,
    task_reminders: true,
    ai_insights: true,
    urgent_only: false,
    working_hours_start: '09:00',
    working_hours_end: '18:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notification_frequency: 'hourly',
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await apiService.get('/user/notification-preferences');
      if (response.data.data) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveStatus('idle');
    
    try {
      console.log('Saving notification settings:', settings);
      const response = await apiService.put('/user/notification-preferences', settings);
      console.log('Notification save response:', response.data);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      console.error('Error details:', error.response?.data);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    if (typeof settings[key] === 'boolean') {
      setSettings({ ...settings, [key]: !settings[key] });
    }
  };

  const testNotification = async (type: string) => {
    try {
      await apiService.post('/user/test-notification', { type });
      alert(`Test ${type} notification sent! Check your email.`);
    } catch (error) {
      alert('Failed to send test notification');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">📧 Daily Assistant Settings</h3>
        <p className="text-sm text-gray-600">
          Configure how your AI assistant keeps you informed throughout the day
        </p>
      </div>

      {/* Master Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="email_notifications"
              type="checkbox"
              checked={settings.email_notifications}
              onChange={() => handleToggle('email_notifications')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 flex-1">
            <label htmlFor="email_notifications" className="text-sm font-medium text-gray-900">
              Enable Email Notifications
            </label>
            <p className="text-sm text-gray-500">
              Receive intelligent notifications and daily digests via email
            </p>
          </div>
          <EnvelopeIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Daily Digests */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
          <CalendarDaysIcon className="h-5 w-5 mr-2 text-gray-500" />
          Daily Digests
        </h4>
        
        <div className="space-y-4">
          {/* Morning Digest */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="morning_digest"
                type="checkbox"
                checked={settings.morning_digest}
                onChange={() => handleToggle('morning_digest')}
                disabled={!settings.email_notifications}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
              />
            </div>
            <div className="ml-3 flex-1">
              <label htmlFor="morning_digest" className="text-sm font-medium text-gray-900">
                Morning Briefing (7:00 AM)
              </label>
              <p className="text-sm text-gray-500">
                Start your day with AI insights, priorities, and schedule overview
              </p>
            </div>
            <button
              onClick={() => testNotification('morning')}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              Test
            </button>
          </div>

          {/* Lunch Reminder */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="lunch_reminder"
                type="checkbox"
                checked={settings.lunch_reminder}
                onChange={() => handleToggle('lunch_reminder')}
                disabled={!settings.email_notifications}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
              />
            </div>
            <div className="ml-3 flex-1">
              <label htmlFor="lunch_reminder" className="text-sm font-medium text-gray-900">
                Lunch Break Reminder (12:00 PM)
              </label>
              <p className="text-sm text-gray-500">
                Gentle reminder to take a break with afternoon preview
              </p>
            </div>
          </div>

          {/* End of Day Summary */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="end_of_day_summary"
                type="checkbox"
                checked={settings.end_of_day_summary}
                onChange={() => handleToggle('end_of_day_summary')}
                disabled={!settings.email_notifications}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
              />
            </div>
            <div className="ml-3 flex-1">
              <label htmlFor="end_of_day_summary" className="text-sm font-medium text-gray-900">
                End of Day Summary (5:00 PM)
              </label>
              <p className="text-sm text-gray-500">
                Review accomplishments and prepare for tomorrow
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
          <CpuChipIcon className="h-5 w-5 mr-2 text-gray-500" />
          Smart Notifications
        </h4>
        
        <div className="space-y-4">
          {/* Meeting Reminders */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="meeting_reminders"
                type="checkbox"
                checked={settings.meeting_reminders}
                onChange={() => handleToggle('meeting_reminders')}
                disabled={!settings.email_notifications}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
              />
            </div>
            <div className="ml-3 flex-1">
              <label htmlFor="meeting_reminders" className="text-sm font-medium text-gray-900">
                Meeting Reminders
              </label>
              <p className="text-sm text-gray-500">
                Get notified 30 minutes before meetings start
              </p>
            </div>
          </div>

          {/* Task Reminders */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="task_reminders"
                type="checkbox"
                checked={settings.task_reminders}
                onChange={() => handleToggle('task_reminders')}
                disabled={!settings.email_notifications}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
              />
            </div>
            <div className="ml-3 flex-1">
              <label htmlFor="task_reminders" className="text-sm font-medium text-gray-900">
                Task Deadline Alerts
              </label>
              <p className="text-sm text-gray-500">
                Notifications for approaching and overdue tasks
              </p>
            </div>
          </div>

          {/* AI Insights */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="ai_insights"
                type="checkbox"
                checked={settings.ai_insights}
                onChange={() => handleToggle('ai_insights')}
                disabled={!settings.email_notifications}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
              />
            </div>
            <div className="ml-3 flex-1">
              <label htmlFor="ai_insights" className="text-sm font-medium text-gray-900">
                AI Proactive Insights
              </label>
              <p className="text-sm text-gray-500">
                Intelligent suggestions for optimization and risk prevention
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
          <ClockIcon className="h-5 w-5 mr-2 text-gray-500" />
          Notification Settings
        </h4>
        
        <div className="space-y-4">
          {/* Frequency */}
          <div>
            <label className="text-sm font-medium text-gray-700">Notification Frequency</label>
            <select
              value={settings.notification_frequency}
              onChange={(e) => setSettings({ ...settings, notification_frequency: e.target.value as any })}
              disabled={!settings.email_notifications}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md disabled:opacity-50"
            >
              <option value="realtime">Real-time (As they happen)</option>
              <option value="hourly">Hourly Digest</option>
              <option value="daily">Daily Summary Only</option>
            </select>
          </div>

          {/* Working Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Working Hours Start</label>
              <input
                type="time"
                value={settings.working_hours_start}
                onChange={(e) => setSettings({ ...settings, working_hours_start: e.target.value })}
                disabled={!settings.email_notifications}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Working Hours End</label>
              <input
                type="time"
                value={settings.working_hours_end}
                onChange={(e) => setSettings({ ...settings, working_hours_end: e.target.value })}
                disabled={!settings.email_notifications}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:opacity-50"
              />
            </div>
          </div>

          {/* Urgent Only */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="urgent_only"
                type="checkbox"
                checked={settings.urgent_only}
                onChange={() => handleToggle('urgent_only')}
                disabled={!settings.email_notifications}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="urgent_only" className="text-sm font-medium text-gray-900">
                Urgent Notifications Only
              </label>
              <p className="text-sm text-gray-500">
                Only receive notifications for high-priority and urgent items
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-gray-500">
          {saveStatus === 'success' && (
            <span className="flex items-center text-green-600">
              <CheckCircleIcon className="h-5 w-5 mr-1" />
              Settings saved successfully
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center text-red-600">
              <XCircleIcon className="h-5 w-5 mr-1" />
              Failed to save settings
            </span>
          )}
        </div>
        
        <button
          onClick={saveSettings}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">About Daily Assistant</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Your AI Daily Assistant helps you stay on top of everything by:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Analyzing your schedule and workload patterns</li>
                <li>Providing proactive insights and suggestions</li>
                <li>Detecting potential conflicts and risks</li>
                <li>Sending timely reminders and updates</li>
                <li>Helping you maintain work-life balance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;