import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchProjectMeetings } from '../../store/slices/meetingsSlice';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Meeting } from '../../types';

interface MeetingCalendarProps {
  selectedProject?: string;
}

const MeetingCalendar: React.FC<MeetingCalendarProps> = ({ selectedProject }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { meetings, loading } = useSelector((state: RootState) => state.meetings);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (selectedProject) {
      dispatch(fetchProjectMeetings(selectedProject));
    }
  }, [dispatch, selectedProject]);

  // Get current month details
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Generate calendar days
  const calendarDays = [];
  
  // Previous month's trailing days
  for (let i = 0; i < firstDayWeekday; i++) {
    const day = new Date(year, month, -firstDayWeekday + i + 1);
    calendarDays.push({ date: day, isCurrentMonth: false });
  }
  
  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    calendarDays.push({ date, isCurrentMonth: true });
  }
  
  // Next month's leading days to fill the grid
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day);
    calendarDays.push({ date, isCurrentMonth: false });
  }

  // Get meetings for a specific date
  const getMeetingsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return meetings.filter(meeting => meeting.scheduled_date === dateStr);
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format meeting time
  const formatMeetingTime = (meeting: Meeting) => {
    if (!meeting.scheduled_time) return '';
    const [hours, minutes] = meeting.scheduled_time.split(':');
    const time = new Date();
    time.setHours(parseInt(hours), parseInt(minutes));
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Get meeting type icon
  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'video_call':
        return '📹';
      case 'in_person':
        return '👥';
      case 'phone_call':
        return '📞';
      default:
        return '📅';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            Today
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Week Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ date, isCurrentMonth }, index) => {
            const dayMeetings = getMeetingsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const isPast = date < new Date() && !isToday;

            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 border rounded-lg ${
                  isCurrentMonth 
                    ? 'bg-white border-gray-200' 
                    : 'bg-gray-50 border-gray-100'
                } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentMonth 
                    ? isToday 
                      ? 'text-blue-600' 
                      : isPast 
                        ? 'text-gray-400' 
                        : 'text-gray-900'
                    : 'text-gray-400'
                }`}>
                  {date.getDate()}
                </div>

                {/* Meetings for this day */}
                <div className="space-y-1">
                  {dayMeetings.slice(0, 2).map(meeting => (
                    <div
                      key={meeting.id}
                      className={`text-xs p-1 rounded truncate cursor-pointer hover:shadow-sm ${getStatusColor(meeting.status || 'scheduled')}`}
                      title={`${meeting.title} - ${formatMeetingTime(meeting)} (${meeting.duration_minutes || 30}min)`}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{getMeetingTypeIcon(meeting.meeting_type || 'video_call')}</span>
                        <span className="truncate">{formatMeetingTime(meeting)} {meeting.title}</span>
                      </div>
                    </div>
                  ))}
                  {dayMeetings.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayMeetings.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="border-t px-6 py-3 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <span>📹</span>
              <span>Video Call</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>👥</span>
              <span>In Person</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>📞</span>
              <span>Phone Call</span>
            </span>
          </div>
          <div className="text-right">
            {meetings.length > 0 && (
              <span>{meetings.length} meeting{meetings.length !== 1 ? 's' : ''} this month</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingCalendar;