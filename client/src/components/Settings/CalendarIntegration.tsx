import React, { useState, useEffect } from 'react';
import { LinkIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { fetchICalFeed, cacheICalEvents, getCachedICalEvents } from '../../utils/icalParser';
import { generateSampleICalData } from '../../utils/sampleCalendarData';

interface CalendarIntegrationProps {
  onIntegrationUpdate?: () => void;
}

const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({ onIntegrationUpdate }) => {
  const [feedUrl, setFeedUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    // Load saved feed URL and last sync info
    const savedUrl = localStorage.getItem('outlook_feed_url');
    const savedLastSync = localStorage.getItem('outlook_last_sync');
    
    if (savedUrl) {
      setFeedUrl(savedUrl);
    }
    
    if (savedLastSync) {
      setLastSync(savedLastSync);
    }

    // Check cached events
    const cached = getCachedICalEvents();
    if (cached) {
      setEventCount(cached.length);
      setStatus('success');
    }
  }, []);

  const testAndSaveFeed = async () => {
    if (!feedUrl.trim()) {
      setErrorMessage('Please enter a calendar feed URL');
      setStatus('error');
      return;
    }

    setIsLoading(true);
    setStatus('idle');
    setErrorMessage('');

    // Debug: Check available tokens
    console.log('Available tokens:', {
      token: localStorage.getItem('token'),
      access_token: localStorage.getItem('access_token'),
      refresh_token: localStorage.getItem('refresh_token'),
    });

    try {
      const testUrl = feedUrl.trim();
      
      // Check if it's a valid URL
      try {
        new URL(testUrl);
      } catch {
        throw new Error('Invalid URL format');
      }

      // Actually fetch and parse the iCal feed
      console.log('Fetching iCal feed from:', testUrl);
      const events = await fetchICalFeed(testUrl);
      
      // Cache the events
      cacheICalEvents(events);
      
      // Save settings
      localStorage.setItem('outlook_feed_url', testUrl);
      localStorage.setItem('outlook_last_sync', new Date().toISOString());
      
      setLastSync(new Date().toISOString());
      setStatus('success');
      setEventCount(events.length);
      
      console.log(`Successfully fetched ${events.length} events from Outlook calendar`);
      
      // Notify parent component
      if (onIntegrationUpdate) {
        onIntegrationUpdate();
      }

      // Show success message
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    } catch (error: any) {
      console.error('Error fetching calendar feed:', error);
      setErrorMessage(error.message || 'Failed to connect to calendar feed');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFeed = () => {
    localStorage.removeItem('outlook_feed_url');
    localStorage.removeItem('outlook_last_sync');
    localStorage.removeItem('cached_ical_events');
    setFeedUrl('');
    setLastSync(null);
    setEventCount(0);
    setStatus('idle');
  };

  const syncNow = async () => {
    await testAndSaveFeed();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Outlook Calendar Integration</h3>
        <p className="text-sm text-gray-600">
          Connect your Outlook calendar to see work meetings alongside your project meetings.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            iCal Feed URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://outlook.office365.com/owa/calendar/..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isLoading}
            />
            <button
              onClick={testAndSaveFeed}
              disabled={isLoading}
              className="btn-primary flex items-center gap-2"
            >
              {isLoading ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <LinkIcon className="h-4 w-4" />
              )}
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
          
          {status === 'success' && (
            <div className="mt-2 flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="h-5 w-5" />
              <span className="text-sm">Successfully connected!</span>
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-2 flex items-center gap-2 text-red-600">
              <XCircleIcon className="h-5 w-5" />
              <span className="text-sm">{errorMessage}</span>
            </div>
          )}
        </div>

        {lastSync && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircleIcon className="h-4 w-4" />
                  Connected
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Last Sync</span>
                <span className="text-sm text-gray-600">
                  {new Date(lastSync).toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Events Found</span>
                <span className="text-sm text-gray-600">{eventCount}</span>
              </div>
              
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <button
                  onClick={syncNow}
                  className="btn-secondary text-sm flex-1"
                  disabled={isLoading}
                >
                  Sync Now
                </button>
                <button
                  onClick={removeFeed}
                  className="btn-secondary text-sm flex-1 text-red-600 hover:bg-red-50"
                >
                  Disconnect
                </button>
              </div>
              
              {/* Debug button to check cached events */}
              <div className="mt-2">
                <button
                  onClick={() => {
                    const cached = getCachedICalEvents();
                    if (cached) {
                      console.log('=== CACHED CALENDAR EVENTS ===');
                      console.log(`Total events: ${cached.length}`);
                      cached.forEach((event, index) => {
                        console.log(`\nEvent ${index + 1}:`, {
                          title: event.title,
                          date: event.date,
                          time: event.time,
                          location: event.location,
                          type: event.type,
                          isTeamsMeeting: event.isTeamsMeeting,
                          teamsUrl: event.teamsUrl,
                          source: event.source
                        });
                      });
                      
                      // Look specifically for Teams meetings
                      const teamsEvents = cached.filter(e => e.isTeamsMeeting);
                      console.log(`\nTeams meetings found: ${teamsEvents.length}`);
                      
                      alert(`Found ${cached.length} total events, ${teamsEvents.length} are Teams meetings. Check console for details.`);
                    } else {
                      alert('No cached events found. Try syncing your calendar first.');
                    }
                  }}
                  className="btn-secondary text-sm w-full"
                >
                  Debug: Show Cached Events
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">How to get your Outlook calendar feed:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Go to Outlook on the web (outlook.office.com)</li>
            <li>Click Settings ⚙️ → View all Outlook settings</li>
            <li>Navigate to Calendar → Shared calendars</li>
            <li>Under "Publish a calendar", select your calendar</li>
            <li>Choose "Can view all details" permission level</li>
            <li>Click "Publish" to generate the public URL</li>
            <li>Copy the ICS link and paste it above</li>
          </ol>
          <div className="mt-3 p-2 bg-yellow-100 rounded text-sm text-yellow-800">
            <strong>Note:</strong> Make sure to use the public ICS link from the "Published calendars" section, not the private link. The URL should not require authentication.
          </div>
        </div>

        <div className="text-xs text-gray-500">
          <p>Note: Due to CORS restrictions, calendar sync happens through your backend server.</p>
          <p>Your calendar data is cached locally for 1 hour to improve performance.</p>
        </div>
        
        {/* Test with sample data */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 mb-2">Want to test the integration first?</p>
          <button
            onClick={async () => {
              const sampleData = generateSampleICalData();
              // Parse the sample data directly
              const { ICalParser } = await import('../../utils/icalParser');
              const events = ICalParser.parse(sampleData);
              const calendarEvents = ICalParser.convertToCalendarEvents(events, 'sample');
              
              // Cache the sample events
              cacheICalEvents(calendarEvents);
              setEventCount(calendarEvents.length);
              setStatus('success');
              setLastSync(new Date().toISOString());
              
              if (onIntegrationUpdate) {
                onIntegrationUpdate();
              }
              
              alert(`Successfully loaded ${calendarEvents.length} sample events! Check your calendar.`);
            }}
            className="text-sm btn-secondary"
          >
            Load Sample Calendar Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarIntegration;