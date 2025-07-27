import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchProjects } from '../../store/slices/projectsSlice';
import { fetchProjectMeetings, clearMeetings } from '../../store/slices/meetingsSlice';
import { getCachedICalEvents } from '../../utils/icalParser';
import { CalendarEvent } from '../../types/calendar';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  FlagIcon,
  VideoCameraIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

const Calendar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { projects } = useSelector((state: RootState) => state.projects);
  const { meetings } = useSelector((state: RootState) => state.meetings);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'meetings' | 'tasks' | 'deadlines' | 'external'>('all');
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    // Only fetch projects once on mount
    dispatch(fetchProjects());
  }, []); // Remove dispatch dependency to prevent re-fetching

  useEffect(() => {
    // Fetch meetings for all projects
    if (projects.length > 0) {
      // Clear existing meetings before fetching new ones
      dispatch(clearMeetings());
      projects.forEach(project => {
        dispatch(fetchProjectMeetings(project.id));
      });
    }
  }, [dispatch, projects]);

  useEffect(() => {
    // Generate events from projects, tasks, and meetings
    console.log('Calendar: Generating events from:', { 
      projectsCount: projects.length, 
      meetingsCount: meetings.length,
      projects: projects.map(p => ({ id: p.id, name: p.name, deadline: p.deadline, tasksCount: p.tasks?.length || 0 })),
      meetings: meetings.map(m => ({ id: m.id, title: m.title, scheduled_date: m.scheduled_date, project_id: m.project_id }))
    });
    const calendarEvents: CalendarEvent[] = [];

    projects.forEach((project) => {
      // Add project deadline as event
      if (project.deadline) {
        calendarEvents.push({
          id: `project-${project.id}`,
          title: `${project.name} - Deadline`,
          date: project.deadline,
          type: 'deadline',
          project: project.name,
        });
      }

      // Add task deadlines as events
      project.tasks?.forEach((task) => {
        if (task.deadline) {
          calendarEvents.push({
            id: `task-${task.id}`,
            title: task.title,
            date: task.deadline,
            type: 'task',
            priority: task.priority,
            project: project.name,
          });
        }
      });
    });

    // Add meetings as events
    meetings.forEach((meeting) => {
      if (meeting.scheduled_date) {
        calendarEvents.push({
          id: `meeting-${meeting.id}`,
          title: meeting.title,
          date: meeting.scheduled_date,
          type: 'meeting',
          project: meeting.project?.name,
          time: meeting.scheduled_time,
          meetingType: meeting.meeting_type,
          duration: meeting.duration_minutes,
          location: meeting.location,
          status: meeting.status,
        });
      }
    });

    // Add external calendar events if available
    const cachedExternalEvents = getCachedICalEvents();
    if (cachedExternalEvents) {
      setExternalEvents(cachedExternalEvents);
      // Events are already properly typed as 'external'
      calendarEvents.push(...cachedExternalEvents);
    }

    // Remove test event - calendar is working fine

    console.log('Calendar: Total events generated:', calendarEvents.length, calendarEvents);
    setEvents(calendarEvents);
  }, [projects, meetings]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getEventsForDate = (date: string) => {
    const filteredEvents = events.filter(event => event.date === date);
    
    if (filteredEvents.length > 0) {
      console.log('Calendar: Found events for date', date, filteredEvents);
    }
    
    // Apply filter
    if (filterType === 'all') return filteredEvents;
    if (filterType === 'meetings') return filteredEvents.filter(e => e.type === 'meeting');
    if (filterType === 'tasks') return filteredEvents.filter(e => e.type === 'task');
    if (filterType === 'deadlines') return filteredEvents.filter(e => e.type === 'deadline');
    if (filterType === 'external') return filteredEvents.filter(e => e.type === 'external');
    
    return filteredEvents;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEventTypeIcon = (type: string, meetingType?: string, isTeamsMeeting?: boolean) => {
    // If it's a Teams meeting, always show video icon in purple
    if (isTeamsMeeting) {
      return <VideoCameraIcon className="w-3 h-3 text-purple-600" />;
    }
    
    switch (type) {
      case 'meeting':
        switch (meetingType) {
          case 'video_call':
            return <VideoCameraIcon className="w-3 h-3" />;
          case 'phone_call':
            return <PhoneIcon className="w-3 h-3" />;
          case 'in_person':
            return <BuildingOfficeIcon className="w-3 h-3" />;
          default:
            return <UserIcon className="w-3 h-3" />;
        }
      case 'external':
        return <CalendarIcon className="w-3 h-3" />;
      case 'deadline':
        return <FlagIcon className="w-3 h-3" />;
      default:
        return <ClockIcon className="w-3 h-3" />;
    }
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 p-1 border border-gray-200"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateString = formatDate(date);
      const dayEvents = getEventsForDate(dateString);
      const isSelected = selectedDate && isSameDate(date, selectedDate);
      const isTodayDate = isToday(date);

      days.push(
        <div
          key={day}
          className={`h-24 p-1 border border-gray-200 cursor-pointer hover:bg-gray-50 ${
            isSelected ? 'bg-primary-50 border-primary-300' : ''
          } ${isTodayDate ? 'bg-blue-50 border-blue-300' : ''}`}
          onClick={() => setSelectedDate(date)}
        >
          <div className={`text-sm font-medium ${
            isTodayDate ? 'text-blue-600' : 'text-gray-900'
          }`}>
            {day}
          </div>
          <div className="mt-1 space-y-1">
            {dayEvents.slice(0, 2).map((event) => (
              <div
                key={event.id}
                className={`text-xs px-1 py-0.5 rounded truncate flex items-center gap-1 ${
                  event.type === 'deadline' ? 'bg-red-100 text-red-800' :
                  event.type === 'meeting' ? 'bg-blue-100 text-blue-800' :
                  event.type === 'external' ? 'bg-gray-100 text-gray-700 border border-gray-300' :
                  getPriorityColor(event.priority || 'medium')
                }`}
                title={`${event.title}${event.time ? ` at ${event.time}` : ''}${event.duration ? ` (${event.duration}min)` : ''}${event.isTeamsMeeting ? ' - Microsoft Teams' : ''} - ${event.project || ''}`}
              >
                {getEventTypeIcon(event.type, event.meetingType, event.isTeamsMeeting)}
                <span className="truncate">
                  {event.time && event.type === 'meeting' ? `${event.time} ` : ''}
                  {event.title}
                </span>
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(formatDate(selectedDate)) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Unified Calendar</h1>
        <div className="flex items-center gap-3">
          {/* Filter Buttons */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'meetings', label: 'Meetings' },
              { key: 'tasks', label: 'Tasks' },
              { key: 'deadlines', label: 'Deadlines' },
              { key: 'external', label: 'Outlook' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterType(key as any)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filterType === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setCurrentDate(new Date())}
            className="btn-secondary text-sm px-3 py-2"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <div className="card">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              <h2 className="text-lg font-semibold">
                {currentDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </h2>
              
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-0 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0">
              {renderCalendarDays()}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Date Events */}
          {selectedDate && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              
              {selectedDateEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">No events scheduled</p>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div key={event.id} className="border-l-4 border-primary-400 pl-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{event.title}</h4>
                          {event.project && (
                            <p className="text-sm text-gray-600">{event.project}</p>
                          )}
                          {(event.type === 'meeting' || event.type === 'external') && (
                            <div className="text-sm text-gray-600 mt-1">
                              {event.time && (
                                <div>🕒 {event.time}{event.duration ? ` (${event.duration}min)` : ''}</div>
                              )}
                              {event.location && (
                                <div>📍 {event.location}</div>
                              )}
                              {event.meetingType && (
                                <div>
                                  {event.isTeamsMeeting ? '💻 Microsoft Teams' :
                                   event.meetingType === 'video_call' ? '📹 Video Call' :
                                   event.meetingType === 'phone_call' ? '📞 Phone Call' :
                                   event.meetingType === 'in_person' ? '👥 In Person' : ''}
                                </div>
                              )}
                              {event.teamsUrl && (
                                <div className="mt-2">
                                  <a
                                    href={event.teamsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700"
                                  >
                                    Join Teams Meeting
                                    <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              event.type === 'deadline' ? 'bg-red-100 text-red-800' :
                              event.type === 'meeting' ? 'bg-blue-100 text-blue-800' :
                              event.type === 'external' ? 'bg-gray-100 text-gray-800' :
                              getPriorityColor(event.priority || 'medium')
                            }`}>
                              {event.type === 'deadline' ? 'Deadline' : 
                               event.type === 'meeting' ? 
                                 `Meeting${event.status ? ` - ${event.status}` : ''}` : 
                               event.type === 'external' ? 'External Event' :
                               `${event.priority} priority`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upcoming Events */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
            {events.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {events
                  .filter(event => {
                    if (filterType === 'all') return new Date(event.date) >= new Date();
                    if (filterType === 'meetings') return new Date(event.date) >= new Date() && event.type === 'meeting';
                    if (filterType === 'tasks') return new Date(event.date) >= new Date() && event.type === 'task';
                    if (filterType === 'deadlines') return new Date(event.date) >= new Date() && event.type === 'deadline';
                    return new Date(event.date) >= new Date();
                  })
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 5)
                  .map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        {getEventTypeIcon(event.type, event.meetingType, event.isTeamsMeeting)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {event.time && event.type === 'meeting' ? `${event.time} - ` : ''}
                          {event.title}
                        </h4>
                        <p className="text-xs text-gray-600">{event.project}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.date).toLocaleDateString()}
                          {event.type === 'meeting' && event.duration && ` • ${event.duration}min`}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Legend</h3>
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-800 mb-2">Event Types</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                  <span className="text-sm text-gray-700">Project Deadlines</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                  <span className="text-sm text-gray-700">Scheduled Meetings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                  <span className="text-sm text-gray-700">Task Deadlines</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                  <span className="text-sm text-gray-700">External Events (Outlook)</span>
                </div>
              </div>
              
              <div className="text-sm font-medium text-gray-800 mb-2 pt-2 border-t">Meeting Types</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <VideoCameraIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">Video Call</span>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">Phone Call</span>
                </div>
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-700">In Person</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;