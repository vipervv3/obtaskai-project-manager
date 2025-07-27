export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'task' | 'meeting' | 'deadline' | 'external';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  project?: string;
  time?: string;
  meetingType?: 'video_call' | 'in_person' | 'phone_call';
  duration?: number;
  location?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  source?: 'internal' | 'outlook' | 'google' | 'other';
  teamsUrl?: string;
  isTeamsMeeting?: boolean;
}