import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchProject } from '../../store/slices/projectsSlice';
import { fetchProjectTasks, createTask } from '../../store/slices/tasksSlice';
import { CreateTaskDto, Task } from '../../types';
import aiService from '../../services/aiService';
import VoiceNotes from '../../components/Voice/VoiceNotes';
import GanttChart from '../../components/Gantt/GanttChart';
import { CalendarDaysIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentProject, loading: projectLoading } = useSelector((state: RootState) => state.projects);
  const { tasks, loading: tasksLoading, creating } = useSelector((state: RootState) => state.tasks);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'gantt'>('kanban');
  const [formData, setFormData] = useState<CreateTaskDto & { project_id?: string }>({
    title: '',
    description: '',
    priority: 'medium',
    assignee_id: undefined,
    deadline: '',
    estimated_hours: undefined
  });
  const [projectInsights, setProjectInsights] = useState<any>(null);

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProject(projectId));
      dispatch(fetchProjectTasks(projectId));
    }
  }, [dispatch, projectId]);

  // Generate AI insights when project and tasks load
  useEffect(() => {
    if (currentProject && tasks) {
      const projectWithTasks = { ...currentProject, tasks };
      const insights = aiService.analyzeProject(projectWithTasks);
      setProjectInsights(insights);
    }
  }, [currentProject, tasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    
    try {
      // Clean up empty values that should be null/undefined for UUIDs
      const cleanedFormData = {
        ...formData,
        project_id: projectId,
        assignee_id: formData.assignee_id || undefined,
        deadline: formData.deadline || undefined,
        estimated_hours: formData.estimated_hours || undefined,
        parent_task_id: formData.parent_task_id || undefined
      };
      
      // Remove empty strings and undefined values
      Object.keys(cleanedFormData).forEach(key => {
        if (cleanedFormData[key as keyof typeof cleanedFormData] === '' || 
            cleanedFormData[key as keyof typeof cleanedFormData] === undefined) {
          delete cleanedFormData[key as keyof typeof cleanedFormData];
        }
      });
      
      console.log('Cleaned task data:', cleanedFormData);
      const result = await dispatch(createTask(cleanedFormData));
      if (createTask.fulfilled.match(result)) {
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          priority: 'medium',
          assignee_id: undefined,
          deadline: '',
          estimated_hours: undefined
        });
        // Refresh tasks list
        dispatch(fetchProjectTasks(projectId));
      } else {
        console.error('Failed to create task:', result);
        const errorMessage = result.payload || 'Failed to create task. Please try again.';
        alert(`Failed to create task: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert(`An error occurred while creating the task: ${error}`);
    }
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const getTasksByStatus = (status: Task['status']) => {
    return (tasks || []).filter(task => task.status === status);
  };

  if (projectLoading || !currentProject) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button 
              onClick={() => navigate('/projects')}
              className="text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center"
            >
              ← Back to Projects
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{currentProject.name}</h1>
            <p className="text-gray-600 mt-1">{currentProject.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            currentProject.status === 'active' ? 'bg-green-100 text-green-800' :
            currentProject.status === 'completed' ? 'bg-blue-100 text-blue-800' :
            currentProject.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {currentProject.status}
          </span>
        </div>
        {currentProject.deadline && (
          <p className="text-sm text-gray-500">
            Deadline: {new Date(currentProject.deadline).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Tasks Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded ${
                  viewMode === 'kanban' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
                }`}
              >
                <Squares2X2Icon className="w-4 h-4" />
                Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded ${
                  viewMode === 'list' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
                }`}
              >
                <ListBulletIcon className="w-4 h-4" />
                List
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded ${
                  viewMode === 'gantt' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
                }`}
              >
                <CalendarDaysIcon className="w-4 h-4" />
                Gantt
              </button>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              New Task
            </button>
            <button
              onClick={() => {
                if (projectInsights?.recommendations?.length > 0) {
                  const suggestions = projectInsights.recommendations.map((r: any) => `• ${r.title}: ${r.description}`).join('\n');
                  alert(`AI Project Insights:\n\n${suggestions}`);
                } else {
                  alert('AI suggests breaking down large tasks and setting realistic deadlines based on team capacity.');
                }
              }}
              className="btn-secondary"
            >
              AI Suggestions
            </button>
          </div>
        </div>

        {tasksLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(['todo', 'in_progress', 'review', 'done'] as const).map(status => (
              <div key={status} className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 capitalize">
                  {status.replace('_', ' ')}
                  <span className="ml-2 text-sm text-gray-500">
                    ({getTasksByStatus(status).length})
                  </span>
                </h3>
                <div className="space-y-2">
                  {getTasksByStatus(status).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">No tasks</p>
                  ) : (
                    getTasksByStatus(status).map(task => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task.id)}
                        className="bg-white p-3 rounded shadow hover:shadow-md cursor-pointer transition-shadow"
                      >
                        <h4 className="font-medium text-gray-900 text-sm mb-1">{task.title}</h4>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded ${
                            task.priority === 'high' ? 'bg-red-100 text-red-800' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.priority}
                          </span>
                          {task.deadline && (
                            <span className="text-xs text-gray-500">
                              {new Date(task.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deadline
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No tasks yet. Create your first task!
                    </td>
                  </tr>
                ) : (
                  tasks.map(task => (
                    <tr
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {task.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="capitalize">{task.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded ${
                          task.priority === 'high' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'gantt' ? (
          <GanttChart 
            project={currentProject}
            tasks={tasks}
            onTaskUpdate={(taskId) => handleTaskClick(taskId)}
          />
        ) : null}
      </div>

      {/* AI Insights Panel */}
      {tasks.length > 0 && projectInsights && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center mr-2">
              <span className="text-white text-xs">AI</span>
            </span>
            Project Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Project Health */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  projectInsights.riskLevel === 'low' ? 'bg-green-500' :
                  projectInsights.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                Project Health
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Risk Level:</span>
                  <span className={`font-medium capitalize ${
                    projectInsights.riskLevel === 'low' ? 'text-green-600' :
                    projectInsights.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {projectInsights.riskLevel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Completion:</span>
                  <span className="font-medium">
                    {Math.round((getTasksByStatus('done').length / Math.max(tasks.length, 1)) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Est. Completion:</span>
                  <span className="font-medium text-blue-600">
                    {new Date(projectInsights.completionPrediction.estimatedDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Confidence:</span>
                  <span className="font-medium">
                    {Math.round(projectInsights.completionPrediction.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Task Distribution */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2">Task Distribution</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>To Do: {getTasksByStatus('todo').length}</span>
                  <span>In Progress: {getTasksByStatus('in_progress').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Review: {getTasksByStatus('review').length}</span>
                  <span>Done: {getTasksByStatus('done').length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${Math.round((getTasksByStatus('done').length / Math.max(tasks.length, 1)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* AI Recommendations & Bottlenecks */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2">AI Analysis</h4>
              
              {projectInsights.bottlenecks?.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-sm font-medium text-red-600 mb-1">Bottlenecks:</h5>
                  <ul className="text-xs text-red-700 space-y-1">
                    {projectInsights.bottlenecks.slice(0, 2).map((bottleneck: string, index: number) => (
                      <li key={index}>• {bottleneck}</li>
                    ))}
                  </ul>
                </div>
              )}

              {projectInsights.recommendations?.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-blue-600 mb-1">Recommendations:</h5>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {projectInsights.recommendations.slice(0, 2).map((rec: any, index: number) => (
                      <li key={index}>• {rec.title}</li>
                    ))}
                    {projectInsights.recommendations.length > 2 && (
                      <li className="text-gray-500">+ {projectInsights.recommendations.length - 2} more...</li>
                    )}
                  </ul>
                </div>
              )}

              {(!projectInsights.bottlenecks?.length && !projectInsights.recommendations?.length) && (
                <div className="text-sm text-gray-600">
                  <p>• Project is {Math.round((getTasksByStatus('done').length / Math.max(tasks.length, 1)) * 100)}% complete</p>
                  <p>• {getTasksByStatus('in_progress').length} tasks in progress</p>
                  {getTasksByStatus('todo').filter(t => t.priority === 'high').length > 0 && (
                    <p>• {getTasksByStatus('todo').filter(t => t.priority === 'high').length} high-priority tasks pending</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voice Notes Section */}
      {projectId && (
        <div className="card">
          <VoiceNotes
            entityType="project"
            entityId={projectId}
            entityName={currentProject.name}
          />
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter task title"
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
                  placeholder="Enter task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.estimated_hours || ''}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;