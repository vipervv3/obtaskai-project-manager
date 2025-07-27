// Sample calendar data for testing when real Outlook feed is not available
export const generateSampleICalData = () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sample Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Sample Work Calendar
X-WR-TIMEZONE:America/New_York

BEGIN:VEVENT
UID:sample-event-1@obtaskai.com
DTSTART:${formatDate(new Date(today.setHours(9, 0, 0, 0)))}
DTEND:${formatDate(new Date(today.setHours(10, 0, 0, 0)))}
SUMMARY:Daily Standup
DESCRIPTION:Team sync meeting
LOCATION:Microsoft Teams
STATUS:CONFIRMED
END:VEVENT

BEGIN:VEVENT
UID:sample-event-2@obtaskai.com
DTSTART:${formatDate(new Date(today.setHours(14, 0, 0, 0)))}
DTEND:${formatDate(new Date(today.setHours(15, 0, 0, 0)))}
SUMMARY:Project Review Meeting
DESCRIPTION:Quarterly project review with stakeholders
LOCATION:Conference Room A
STATUS:CONFIRMED
END:VEVENT

BEGIN:VEVENT
UID:sample-event-3@obtaskai.com
DTSTART:${formatDate(new Date(tomorrow.setHours(11, 0, 0, 0)))}
DTEND:${formatDate(new Date(tomorrow.setHours(12, 0, 0, 0)))}
SUMMARY:1:1 with Manager
DESCRIPTION:Weekly one-on-one meeting
LOCATION:Manager's Office
STATUS:CONFIRMED
END:VEVENT

BEGIN:VEVENT
UID:sample-event-4@obtaskai.com
DTSTART:${formatDate(new Date(nextWeek.setHours(13, 0, 0, 0)))}
DTEND:${formatDate(new Date(nextWeek.setHours(14, 30, 0, 0)))}
SUMMARY:Sprint Planning
DESCRIPTION:Planning meeting for next sprint
LOCATION:Zoom - https://zoom.us/j/123456789
STATUS:CONFIRMED
END:VEVENT

END:VCALENDAR`;
};

export const getSampleCalendarUrl = () => {
  // Create a data URL with the sample iCal data
  const sampleData = generateSampleICalData();
  const blob = new Blob([sampleData], { type: 'text/calendar' });
  return URL.createObjectURL(blob);
};