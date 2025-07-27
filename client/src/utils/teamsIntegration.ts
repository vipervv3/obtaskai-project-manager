// Microsoft Teams Integration Utilities

export interface TeamsMetadata {
  meetingUrl?: string;
  meetingId?: string;
  joinUrl?: string;
  conferenceId?: string;
  isTeamsMeeting: boolean;
}

// Extract Teams meeting information from various fields
export function extractTeamsInfo(location?: string, description?: string): TeamsMetadata {
  const teamsInfo: TeamsMetadata = {
    isTeamsMeeting: false
  };

  // Combine location and description for searching
  const searchText = `${location || ''} ${description || ''}`;

  // Teams meeting URL patterns
  const teamsUrlPatterns = [
    /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s]+/gi,
    /https:\/\/teams\.live\.com\/meet\/[^\s]+/gi,
    /https:\/\/[^\.]+\.teams\.microsoft\.com\/[^\s]+/gi
  ];

  // Search for Teams meeting URLs
  for (const pattern of teamsUrlPatterns) {
    const match = searchText.match(pattern);
    if (match) {
      teamsInfo.meetingUrl = match[0];
      teamsInfo.joinUrl = match[0];
      teamsInfo.isTeamsMeeting = true;
      break;
    }
  }

  // Extract meeting ID if present
  const meetingIdMatch = searchText.match(/Meeting ID[:\s]+(\d+[\s\d]*)/i);
  if (meetingIdMatch) {
    teamsInfo.meetingId = meetingIdMatch[1].replace(/\s/g, '');
  }

  // Extract conference ID if present
  const conferenceIdMatch = searchText.match(/Conference ID[:\s]+(\d+[\s\d]*)/i);
  if (conferenceIdMatch) {
    teamsInfo.conferenceId = conferenceIdMatch[1].replace(/\s/g, '');
  }

  // Check for Teams indicators even without URL
  if (!teamsInfo.isTeamsMeeting) {
    const teamsIndicators = [
      'microsoft teams meeting',
      'teams meeting',
      'join microsoft teams',
      'join teams meeting',
      'teams.microsoft.com'
    ];

    teamsInfo.isTeamsMeeting = teamsIndicators.some(indicator => 
      searchText.toLowerCase().includes(indicator)
    );
  }

  return teamsInfo;
}

// Format Teams meeting display information
export function formatTeamsDisplay(teamsInfo: TeamsMetadata): string {
  if (!teamsInfo.isTeamsMeeting) return '';
  
  const parts = [];
  if (teamsInfo.meetingId) {
    parts.push(`ID: ${teamsInfo.meetingId}`);
  }
  if (teamsInfo.conferenceId) {
    parts.push(`Conf: ${teamsInfo.conferenceId}`);
  }
  
  return parts.join(' | ');
}

// Create a direct join link for Teams meetings
export function createTeamsJoinLink(meetingUrl?: string): string | null {
  if (!meetingUrl) return null;
  
  // Ensure the URL is a valid Teams meeting link
  if (meetingUrl.includes('teams.microsoft.com') || meetingUrl.includes('teams.live.com')) {
    return meetingUrl;
  }
  
  return null;
}