import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchTask, updateTask, deleteTask } from '../../store/slices/tasksSlice';
import { fetchTaskComments, createComment } from '../../store/slices/commentsSlice';
import { taskService } from '../../services/taskService';
import { Task, UpdateTaskDto, CreateCommentDto } from '../../types';
import VoiceNotes from '../../components/Voice/VoiceNotes';

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentTask, loading: taskLoading, updating, deleting } = useSelector((state: RootState) => state.tasks);
  const { comments, loading: commentsLoading, creating: commentCreating } = useSelector((state: RootState) => state.comments);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateTaskDto>({});
  const [newComment, setNewComment] = useState('');
  const [timeEntry, setTimeEntry] = useState({ hours: 0, description: '', date: new Date().toISOString().split('T')[0] });
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [totalLoggedTime, setTotalLoggedTime] = useState(0);
  const [editingTimeEntry, setEditingTimeEntry] = useState<any>(null);

  useEffect(() => {
    if (taskId) {
      dispatch(fetchTask(taskId));
      dispatch(fetchTaskComments(taskId));
      loadTimeEntries();
      
      // Emit viewing status for real-time collaboration
      import('../../services/notificationEngine').then(({ notificationEngine }) => {
        notificationEngine.emitViewing(taskId, 'task');
      });
    }
  }, [dispatch, taskId]);

  const loadTimeEntries = async () => {
    if (!taskId) return;
    try {
      const response = await taskService.getTimeEntries(taskId);
      const entries = response.data.data || [];
      setTimeEntries(entries);
      const total = entries.reduce((sum: number, entry: any) => sum + entry.hours, 0);
      setTotalLoggedTime(total);
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  };

  useEffect(() => {
    if (currentTask) {
      setEditForm({
        title: currentTask.title,
        description: currentTask.description,
        status: currentTask.status,
        priority: currentTask.priority,
        deadline: currentTask.deadline,
        estimated_hours: currentTask.estimated_hours,
        actual_hours: currentTask.actual_hours
      });
    }
  }, [currentTask]);

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId) return;

    try {
      // Clean up empty values
      const cleanedUpdates = { ...editForm };
      Object.keys(cleanedUpdates).forEach(key => {
        if (cleanedUpdates[key as keyof typeof cleanedUpdates] === '' || 
            cleanedUpdates[key as keyof typeof cleanedUpdates] === undefined) {
          delete cleanedUpdates[key as keyof typeof cleanedUpdates];
        }
      });
      
      console.log('Updating task with:', cleanedUpdates);
      const result = await dispatch(updateTask({ id: taskId, updates: cleanedUpdates }));
      if (updateTask.fulfilled.match(result)) {
        setIsEditing(false);
        alert('Task updated successfully!');
        
        // Emit real-time task update
        if (currentTask) {
          import('../../services/notificationEngine').then(({ notificationEngine }) => {
            notificationEngine.emitTaskUpdate(taskId, cleanedUpdates);
          });
        }
      } else {
        console.error('Failed to update task:', result);
        const errorMessage = String(result.payload || 'Failed to update task.');
        alert(`Failed to update task: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert(`Error updating task: ${error}`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !newComment.trim()) return;

    try {
      const commentData: CreateCommentDto = {
        content: newComment.trim()
      };
      const result = await dispatch(createComment({ taskId, commentData }));
      if (createComment.fulfilled.match(result)) {
        setNewComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!taskId || !currentTask) return;
    
    try {
      const result = await dispatch(updateTask({ id: taskId, updates: { status: newStatus } }));
      if (!updateTask.fulfilled.match(result)) {
        console.error('Failed to update status:', result);
        alert('Failed to update task status.');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      alert(`Error updating task status: ${error}`);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskId || !currentTask) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the task "${currentTask.title}"? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    try {
      const result = await dispatch(deleteTask(taskId));
      if (deleteTask.fulfilled.match(result)) {
        alert('Task deleted successfully!');
        navigate(-1); // Go back to previous page
      } else {
        console.error('Failed to delete task:', result);
        const errorMessage = String(result.payload || 'Failed to delete task.');
        alert(`Failed to delete task: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert(`Error deleting task: ${error}`);
    }
  };

  const handleDeleteTimeEntry = async (timeEntryId: string) => {
    if (!taskId) return;
    
    const confirmDelete = window.confirm('Are you sure you want to delete this time entry?');
    if (!confirmDelete) return;
    
    try {
      await taskService.deleteTimeEntry(taskId, timeEntryId);
      loadTimeEntries();
      dispatch(fetchTask(taskId)); // Refresh task
      alert('Time entry deleted successfully!');
    } catch (error) {
      console.error('Error deleting time entry:', error);
      alert('Failed to delete time entry.');
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'done': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (taskLoading || !currentTask) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center"
          >
            ← Back
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-secondary"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button
              onClick={() => setShowTimeModal(true)}
              className="btn-secondary"
            >
              Log Time
            </button>
            <button
              onClick={handleDeleteTask}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Task'}
            </button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdateTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={editForm.title || ''}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status || currentTask.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Task['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={editForm.priority || currentTask.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as Task['priority'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={editForm.deadline ? editForm.deadline.split('T')[0] : ''}
                  onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editForm.estimated_hours || ''}
                  onChange={(e) => setEditForm({ ...editForm, estimated_hours: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editForm.actual_hours || ''}
                  onChange={(e) => setEditForm({ ...editForm, actual_hours: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="btn-primary"
              >
                {updating ? 'Updating...' : 'Update Task'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentTask.title}</h1>
            <p className="text-gray-600 mb-4">{currentTask.description || 'No description'}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Status</span>
                <div className="mt-1">
                  <select
                    value={currentTask.status}
                    onChange={(e) => handleStatusChange(e.target.value as Task['status'])}
                    className={`px-3 py-1 rounded-full text-sm font-medium border-0 ${getStatusColor(currentTask.status)}`}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Priority</span>
                <div className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(currentTask.priority)}`}>
                    {currentTask.priority}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Deadline</span>
                <div className="mt-1 text-sm text-gray-900">
                  {currentTask.deadline ? new Date(currentTask.deadline).toLocaleDateString() : 'No deadline'}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Progress</span>
                <div className="mt-1 text-sm text-gray-900">
                  {totalLoggedTime.toFixed(1)}h / {currentTask.estimated_hours || 0}h
                  {currentTask.estimated_hours && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${Math.min((totalLoggedTime / currentTask.estimated_hours) * 100, 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments</h2>
        
        {/* Add Comment Form */}
        <form onSubmit={handleAddComment} className="mb-6">
          <div className="flex space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-600">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  // Emit typing indicator
                  if (taskId) {
                    import('../../services/notificationEngine').then(({ notificationEngine }) => {
                      notificationEngine.emitTyping(taskId);
                    });
                  }
                }}
                placeholder="Add a comment..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={commentCreating || !newComment.trim()}
                  className="btn-primary"
                >
                  {commentCreating ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Comments List */}
        {commentsLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {comment.user?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg px-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.user?.full_name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time Entries Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Time Entries</h2>
          <span className="text-sm text-gray-500">
            Total: {totalLoggedTime.toFixed(1)}h ({timeEntries.length} entries)
          </span>
        </div>
        
        {timeEntries.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No time entries yet. Click "Log Time" to start tracking!</p>
        ) : (
          <div className="space-y-3">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <span className="font-semibold text-primary-600 text-lg">{entry.hours}h</span>
                    <div className="text-sm text-gray-600">
                      <div>{new Date(entry.date).toLocaleDateString()}</div>
                      {entry.user?.full_name && (
                        <div className="text-xs text-gray-500">by {entry.user.full_name}</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{entry.description || 'No description'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setEditingTimeEntry(entry);
                      setTimeEntry({
                        hours: entry.hours,
                        description: entry.description || '',
                        date: entry.date
                      });
                      setShowTimeModal(true);
                    }}
                    className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTimeEntry(entry.id)}
                    className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voice Notes Section */}
      {taskId && (
        <div className="card">
          <VoiceNotes
            entityType="task"
            entityId={taskId}
            entityName={currentTask.title}
          />
        </div>
      )}

      {/* Time Logging Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingTimeEntry ? 'Edit Time Entry' : 'Log Time'}
            </h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={timeEntry.hours}
                  onChange={(e) => setTimeEntry({ ...timeEntry, hours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={timeEntry.description}
                  onChange={(e) => setTimeEntry({ ...timeEntry, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="What did you work on?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={timeEntry.date}
                  onChange={(e) => setTimeEntry({ ...timeEntry, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTimeModal(false);
                    setEditingTimeEntry(null);
                    setTimeEntry({ hours: 0, description: '', date: new Date().toISOString().split('T')[0] });
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!taskId || timeEntry.hours <= 0) return;
                    try {
                      if (editingTimeEntry) {
                        // Update existing time entry
                        await taskService.updateTimeEntry(taskId, editingTimeEntry.id, timeEntry);
                        alert('Time entry updated successfully!');
                      } else {
                        // Create new time entry
                        await taskService.logTime(taskId, timeEntry);
                        alert('Time logged successfully!');
                      }
                      
                      setShowTimeModal(false);
                      setTimeEntry({ hours: 0, description: '', date: new Date().toISOString().split('T')[0] });
                      setEditingTimeEntry(null);
                      loadTimeEntries();
                      dispatch(fetchTask(taskId));
                    } catch (error) {
                      console.error('Error with time entry:', error);
                      alert(editingTimeEntry ? 'Failed to update time entry.' : 'Failed to log time. Please try again.');
                    }
                  }}
                  className="btn-primary"
                >
                  {editingTimeEntry ? 'Update Entry' : 'Log Time'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;