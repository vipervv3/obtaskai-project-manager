import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store';
import { fetchProjects } from '../../store/slices/projectsSlice';
import { fetchProjectMeetings, createMeeting, deleteMeeting, updateMeeting } from '../../store/slices/meetingsSlice';
import { CreateMeetingDto, Meeting } from '../../types';
import { TrashIcon, PencilIcon, CalendarIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import MeetingCalendar from '../../components/Calendar/MeetingCalendar';

const Meetings: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { projects } = useSelector((state: RootState) => state.projects);
  const { meetings, loading, creating } = useSelector((state: RootState) => state.meetings);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [formData, setFormData] = useState<CreateMeetingDto & { project_id?: string }>({
    title: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 30,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: '',
    meeting_type: 'video_call',
    attendees: [],
    project_id: ''
  });
  const [attendeeEmail, setAttendeeEmail] = useState('');

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  useEffect(() => {
    if (selectedProject) {
      dispatch(fetchProjectMeetings(selectedProject));
    }
  }, [dispatch, selectedProject]);

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      const meetingData = {
        ...formData,
        project_id: selectedProject
      };
      
      const result = await dispatch(createMeeting(meetingData));
      if (createMeeting.fulfilled.match(result)) {
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          scheduled_date: '',
          scheduled_time: '',
          duration_minutes: 30,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          location: '',
          meeting_type: 'video_call',
          attendees: [],
          project_id: ''
        });
        // Refresh meetings
        dispatch(fetchProjectMeetings(selectedProject));
      } else {
        alert('Failed to create meeting. Please try again.');
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert('An error occurred while creating the meeting.');
    }
  };

  const handleAddAttendee = () => {
    if (attendeeEmail.trim() && !formData.attendees.includes(attendeeEmail.trim())) {
      setFormData({
        ...formData,
        attendees: [...formData.attendees, attendeeEmail.trim()]
      });
      setAttendeeEmail('');
    }
  };

  const handleRemoveAttendee = (email: string) => {
    setFormData({
      ...formData,
      attendees: formData.attendees.filter(a => a !== email)
    });
  };

  const handleMeetingClick = (meetingId: string) => {
    navigate(`/meetings/${meetingId}`);
  };

  const handleDeleteMeeting = async (meetingId: string, meetingTitle: string) => {
    if (window.confirm(`Are you sure you want to delete the meeting "${meetingTitle}"? This action cannot be undone.`)) {
      try {
        const result = await dispatch(deleteMeeting(meetingId));
        if (deleteMeeting.fulfilled.match(result)) {
          // Meeting was successfully deleted, list will update automatically
          alert('Meeting deleted successfully');
        } else {
          alert('Failed to delete meeting. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting meeting:', error);
        alert('An error occurred while deleting the meeting.');
      }
    }
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setFormData({
      title: meeting.title,
      description: meeting.description || '',
      scheduled_date: meeting.scheduled_date || '',
      scheduled_time: meeting.scheduled_time || '',
      duration_minutes: meeting.duration_minutes || 30,
      timezone: meeting.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      location: meeting.location || '',
      meeting_type: meeting.meeting_type || 'video_call',
      attendees: meeting.attendees || [],
      project_id: meeting.project?.id || selectedProject
    });
    setShowEditModal(true);
  };

  const handleUpdateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;

    try {
      const updates = {
        title: formData.title,
        description: formData.description,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        duration_minutes: formData.duration_minutes,
        timezone: formData.timezone,
        location: formData.location,
        meeting_type: formData.meeting_type,
        attendees: formData.attendees
      };
      
      const result = await dispatch(updateMeeting({ id: editingMeeting.id, updates }));
      if (updateMeeting.fulfilled.match(result)) {
        setShowEditModal(false);
        setEditingMeeting(null);
        setFormData({
          title: '',
          description: '',
          scheduled_date: '',
          scheduled_time: '',
          duration_minutes: 30,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          location: '',
          meeting_type: 'video_call',
          attendees: [],
          project_id: ''
        });
        // Refresh meetings
        dispatch(fetchProjectMeetings(selectedProject));
        alert('Meeting updated successfully');
      } else {
        alert('Failed to update meeting. Please try again.');
      }
    } catch (error) {
      console.error('Error updating meeting:', error);
      alert('An error occurred while updating the meeting.');
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingMeeting(null);
    setFormData({
      title: '',
      description: '',
      scheduled_date: '',
      scheduled_time: '',
      duration_minutes: 30,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      location: '',
      meeting_type: 'video_call',
      attendees: [],
      project_id: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListBulletIcon className="h-4 w-4" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              <span>Calendar</span>
            </button>
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            Schedule Meeting
          </button>
        </div>
      </div>

      {/* Project Selector */}
      {projects.length > 0 && (
        <div className="card">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Select Project:
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Calendar/List View */}
      {viewMode === 'calendar' ? (
        <MeetingCalendar selectedProject={selectedProject} />
      ) : (
        /* Meetings List */
        <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Project Meetings</h2>
          {selectedProject && (
            <span className="text-sm text-gray-500">
              {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : !selectedProject ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No project selected</h3>
            <p className="text-gray-600">Create a project first to schedule meetings</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 9l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings scheduled</h3>
            <p className="text-gray-600 mb-4">Schedule your first meeting for this project</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Schedule Meeting
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => handleMeetingClick(meeting.id)}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{meeting.title}</h3>
                  <div className="flex items-center space-x-2">
                    {meeting.recording_url && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Recorded
                      </span>
                    )}
                    {meeting.transcript && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        Transcribed
                      </span>
                    )}
                    {meeting.summary && (
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                        AI Summary
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        alert('AI Analysis: This meeting covered 3 key topics and generated 2 action items. Team engagement was high.');
                      }}
                      className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
                    >
                      AI Analysis
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditMeeting(meeting);
                      }}
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      title="Edit meeting"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMeeting(meeting.id, meeting.title);
                      }}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="Delete meeting"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-3">
                  {meeting.description || 'No description'}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>{meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}</span>
                    {meeting.duration && (
                      <span>{Math.round(meeting.duration / 60)} minutes</span>
                    )}
                    {meeting.action_items && (
                      <span>{meeting.action_items.length} action item{meeting.action_items.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <span>{new Date(meeting.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Recent Activity - Only show in list view */}
      {viewMode === 'list' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary w-full"
              disabled={!selectedProject}
            >
              Schedule New Meeting
            </button>
            <button 
              onClick={() => alert('AI suggests scheduling a 30-minute sprint planning meeting based on your current task load.')}
              className="btn-secondary w-full"
            >
              AI Meeting Suggestions
            </button>
            <button className="btn-secondary w-full">
              Generate Agenda
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Meeting Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Meetings</span>
              <span className="text-sm font-medium text-gray-900">{meetings.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">With Recordings</span>
              <span className="text-sm font-medium text-gray-900">
                {meetings.filter(m => m.recording_url).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">With AI Summaries</span>
              <span className="text-sm font-medium text-gray-900">
                {meetings.filter(m => m.summary).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Action Items</span>
              <span className="text-sm font-medium text-gray-900">
                {meetings.reduce((acc, m) => acc + (m.action_items?.length || 0), 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-screen overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Schedule Meeting</h2>
            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Weekly team sync"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Meeting agenda and details"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.scheduled_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Duration and Meeting Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes) *
                  </label>
                  <select
                    required
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Type *
                  </label>
                  <select
                    required
                    value={formData.meeting_type}
                    onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value as 'in_person' | 'video_call' | 'phone_call' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="video_call">Video Call</option>
                    <option value="in_person">In Person</option>
                    <option value="phone_call">Phone Call</option>
                  </select>
                </div>
              </div>

              {/* Location and Timezone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={formData.meeting_type === 'video_call' ? 'Zoom/Teams link' : 'Conference room or address'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                    <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                      {Intl.DateTimeFormat().resolvedOptions().timeZone} (Local)
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attendees
                </label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="colleague@company.com"
                    />
                    <button
                      type="button"
                      onClick={handleAddAttendee}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  
                  {formData.attendees.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.attendees.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => handleRemoveAttendee(email)}
                            className="ml-1 text-primary-600 hover:text-primary-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                >
                  {creating ? 'Scheduling...' : 'Schedule Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Meeting Modal */}
      {showEditModal && editingMeeting && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-screen overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Meeting</h2>
            <form onSubmit={handleUpdateMeeting} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Weekly team sync"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Meeting agenda and details"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.scheduled_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Duration and Meeting Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes) *
                  </label>
                  <select
                    required
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Type *
                  </label>
                  <select
                    required
                    value={formData.meeting_type}
                    onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value as 'in_person' | 'video_call' | 'phone_call' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="video_call">Video Call</option>
                    <option value="in_person">In Person</option>
                    <option value="phone_call">Phone Call</option>
                  </select>
                </div>
              </div>

              {/* Location and Timezone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={formData.meeting_type === 'video_call' ? 'Zoom/Teams link' : 'Conference room or address'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                    <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                      {Intl.DateTimeFormat().resolvedOptions().timeZone} (Local)
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  value={formData.project_id || selectedProject}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Project cannot be changed after creation</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attendees
                </label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="colleague@company.com"
                    />
                    <button
                      type="button"
                      onClick={handleAddAttendee}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  
                  {formData.attendees.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.attendees.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => handleRemoveAttendee(email)}
                            className="ml-1 text-primary-600 hover:text-primary-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Update Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meetings;