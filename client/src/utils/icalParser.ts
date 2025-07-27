// iCal/ICS Parser for Calendar Integration
import { CalendarEvent } from '../types/calendar';
import { extractTeamsInfo } from './teamsIntegration';

interface ICalEvent {
  uid: string;
  summary: string;
  description?: string;
  dtstart: string;
  dtend: string;
  location?: string;
  organizer?: string;
  attendees?: string[];
  status?: string;
}

export class ICalParser {
  private static parseDate(dateStr: string): Date {
    // Handle different date formats
    if (dateStr.includes('T')) {
      // YYYYMMDDTHHMMSS format
      const year = dateStr.substr(0, 4);
      const month = dateStr.substr(4, 2);
      const day = dateStr.substr(6, 2);
      const hour = dateStr.substr(9, 2);
      const minute = dateStr.substr(11, 2);
      const second = dateStr.substr(13, 2);
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
    } else {
      // YYYYMMDD format (all day event)
      const year = dateStr.substr(0, 4);
      const month = dateStr.substr(4, 2);
      const day = dateStr.substr(6, 2);
      return new Date(`${year}-${month}-${day}`);
    }
  }

  private static extractValue(line: string): string {
    const colonIndex = line.indexOf(':');
    return colonIndex > -1 ? line.substring(colonIndex + 1).trim() : '';
  }

  private static parseEvent(eventText: string): ICalEvent | null {
    const lines = eventText.split(/\r?\n/);
    const event: Partial<ICalEvent> = {};

    for (const line of lines) {
      if (line.startsWith('UID:')) {
        event.uid = this.extractValue(line);
      } else if (line.startsWith('SUMMARY:')) {
        event.summary = this.extractValue(line);
      } else if (line.startsWith('DESCRIPTION:')) {
        event.description = this.extractValue(line);
      } else if (line.startsWith('DTSTART')) {
        const dateStr = this.extractValue(line);
        event.dtstart = dateStr;
      } else if (line.startsWith('DTEND')) {
        const dateStr = this.extractValue(line);
        event.dtend = dateStr;
      } else if (line.startsWith('LOCATION:')) {
        event.location = this.extractValue(line);
      } else if (line.startsWith('ORGANIZER')) {
        const value = this.extractValue(line);
        event.organizer = value.replace('MAILTO:', '');
      } else if (line.startsWith('ATTENDEE')) {
        if (!event.attendees) event.attendees = [];
        const value = this.extractValue(line);
        event.attendees.push(value.replace('MAILTO:', ''));
      } else if (line.startsWith('STATUS:')) {
        event.status = this.extractValue(line);
      }
    }

    if (event.uid && event.summary && event.dtstart) {
      return event as ICalEvent;
    }

    return null;
  }

  public static parse(icalData: string): ICalEvent[] {
    const events: ICalEvent[] = [];
    
    // Split by VEVENT blocks
    const eventBlocks = icalData.split('BEGIN:VEVENT');
    
    for (let i = 1; i < eventBlocks.length; i++) {
      const endIndex = eventBlocks[i].indexOf('END:VEVENT');
      if (endIndex > -1) {
        const eventText = eventBlocks[i].substring(0, endIndex);
        const event = this.parseEvent(eventText);
        if (event) {
          events.push(event);
        }
      }
    }

    return events;
  }

  public static convertToCalendarEvents(icalEvents: ICalEvent[], source: string = 'outlook'): CalendarEvent[] {
    return icalEvents.map(event => {
      const startDate = this.parseDate(event.dtstart);
      const endDate = event.dtend ? this.parseDate(event.dtend) : startDate;
      
      // Calculate duration in minutes
      const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

      // Format time as HH:MM
      const hours = startDate.getHours().toString().padStart(2, '0');
      const minutes = startDate.getMinutes().toString().padStart(2, '0');
      const time = `${hours}:${minutes}`;

      // Extract Teams meeting information
      const teamsInfo = extractTeamsInfo(event.location, event.description);
      
      // Debug logging for Teams detection - log all events
      console.log('Event parsed:', {
        title: event.summary,
        location: event.location,
        description: event.description?.substring(0, 200),
        teamsInfo: teamsInfo,
        hasTeamsUrl: !!teamsInfo.joinUrl
      });

      return {
        id: `${source}-${event.uid}`,
        title: event.summary,
        date: startDate.toISOString().split('T')[0],
        type: 'external' as const,
        time: time !== '00:00' ? time : undefined,
        duration: duration > 0 ? duration : undefined,
        location: event.location,
        meetingType: teamsInfo.isTeamsMeeting ? 'video_call' :
                     event.location?.toLowerCase().includes('zoom') || 
                     event.location?.toLowerCase().includes('webex') ? 'video_call' : 
                     event.location ? 'in_person' : 'video_call',
        status: event.status?.toLowerCase() === 'cancelled' ? 'cancelled' : 'scheduled',
        project: `[${source.toUpperCase()}]`,
        source: 'outlook' as const,
        teamsUrl: teamsInfo.joinUrl,
        isTeamsMeeting: teamsInfo.isTeamsMeeting,
      };
    });
  }
}

// Function to fetch and parse iCal feed through backend proxy
export async function fetchICalFeed(feedUrl: string): Promise<CalendarEvent[]> {
  try {
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    // Get the correct token
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }
    
    // Use backend proxy to avoid CORS issues
    const response = await fetch(`${API_BASE_URL}/api/calendar/proxy-ical`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ feedUrl }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch calendar feed: ${response.statusText}`);
    }

    const result = await response.json();
    const icalData = result.data;
    
    const icalEvents = ICalParser.parse(icalData);
    const calendarEvents = ICalParser.convertToCalendarEvents(icalEvents, 'outlook');
    
    console.log('Parsed iCal events:', { 
      rawEvents: icalEvents.length, 
      calendarEvents: calendarEvents.length 
    });
    
    return calendarEvents;
  } catch (error) {
    console.error('Error fetching iCal feed:', error);
    throw error;
  }
}

// Local storage helper for caching
export function cacheICalEvents(events: CalendarEvent[]): void {
  localStorage.setItem('cached_ical_events', JSON.stringify({
    events,
    timestamp: Date.now()
  }));
}

export function getCachedICalEvents(): CalendarEvent[] | null {
  const cached = localStorage.getItem('cached_ical_events');
  if (!cached) return null;

  const { events, timestamp } = JSON.parse(cached);
  
  // Cache for 1 hour
  if (Date.now() - timestamp > 3600000) {
    localStorage.removeItem('cached_ical_events');
    return null;
  }

  return events;
}