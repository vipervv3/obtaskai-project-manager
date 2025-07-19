import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../../store';
import { fetchProjects } from '../../store/slices/projectsSlice';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import aiService from '../../services/aiService';
import {
  FolderIcon,
  Square2StackIcon,
  ClockIcon,
  UsersIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { projects, loading } = useSelector((state: RootState) => state.projects);
  const { user } = useSelector((state: RootState) => state.auth);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [nextTask, setNextTask] = useState<any>(null);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  // Generate AI insights when projects load
  useEffect(() => {
    if (projects.length > 0 && user) {
      const allTasks = projects.flatMap(p => p.tasks || []);
      
      // Get AI recommendations for all tasks
      const recommendations = aiService.analyzeTasks(allTasks, user);
      setAiRecommendations(recommendations);
      
      // Get suggested next task
      const suggested = aiService.suggestNextTask(allTasks);
      setNextTask(suggested);
    }
  }, [projects, user]);

  const stats = [
    {
      name: 'Total Projects',
      value: projects.length,
      icon: FolderIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      name: 'Active Tasks',
      value: projects.reduce((acc, project) => acc + (project.tasks?.filter(t => t.status !== 'done').length || 0), 0),
      icon: Square2StackIcon,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      name: 'Completed Tasks',
      value: projects.reduce((acc, project) => acc + (project.tasks?.filter(t => t.status === 'done').length || 0), 0),
      icon: ClockIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      name: 'Team Members',
      value: projects.reduce((acc, project) => acc + (project.members?.length || 0), 0),
      icon: UsersIcon,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.full_name || 'User'}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
          <a href="/projects" className="text-primary-600 hover:text-primary-500 text-sm font-medium">
            View all
          </a>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
            <div className="mt-6">
              <button 
                onClick={() => navigate('/projects')}
                className="btn-primary">
                <FolderIcon className="w-4 h-4 mr-2" />
                New Project
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project) => (
              <div
                key={project.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
                  <span className={`tag ${
                    project.status === 'active' ? 'tag-medium' : 
                    project.status === 'completed' ? 'tag-low' : 'tag-high'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {project.description || 'No description'}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{project.tasks?.length || 0} tasks</span>
                  <span>{project.members?.length || 0} members</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/projects')}
              className="btn-primary w-full">
              <FolderIcon className="w-4 h-4 mr-2" />
              New Project
            </button>
            <button className="btn-secondary w-full">
              <Square2StackIcon className="w-4 h-4 mr-2" />
              Create Task
            </button>
            <button className="btn-secondary w-full">
              <ClockIcon className="w-4 h-4 mr-2" />
              Schedule Meeting
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="text-sm">
                <p className="text-gray-900">No recent activity</p>
                <p className="text-gray-500">Start working on projects to see activity here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {projects.slice(0, 5).map((project) => {
                  const recentTasks = project.tasks?.slice(0, 2) || [];
                  return (
                    <div key={`activity-${project.id}`} className="border-l-2 border-primary-200 pl-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{project.name}</p>
                        <span className="text-xs text-gray-500">
                          {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : 'Recently'}
                        </span>
                      </div>
                      {recentTasks.length > 0 ? (
                        <div className="mt-1">
                          {recentTasks.map((task) => (
                            <p key={task.id} className="text-xs text-gray-600">
                              • {task.status === 'done' ? 'Completed' : 'Working on'}: {task.title}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600 mt-1">Project created</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">AI Insights</h3>
          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="text-sm">
                <p className="text-gray-900">No insights available</p>
                <p className="text-gray-500">Create projects and tasks to get AI-powered insights.</p>
              </div>
            ) : aiRecommendations.length === 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start mb-2">
                    <LightBulbIcon className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-blue-800">Getting Started</span>
                    </div>
                  </div>
                  <p className="text-sm text-blue-800">
                    Add tasks to your projects to get AI-powered insights and recommendations.
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start mb-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-green-800">Project Health</span>
                    </div>
                  </div>
                  <p className="text-sm text-green-800">
                    You have {projects.length} active project{projects.length !== 1 ? 's' : ''}. Great start!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {aiRecommendations.slice(0, 3).map((rec, index) => {
                  const getRecommendationStyle = (type: string) => {
                    switch (type) {
                      case 'priority':
                        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: ExclamationTriangleIcon, iconColor: 'text-red-500' };
                      case 'productivity':
                        return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: CheckCircleIcon, iconColor: 'text-green-500' };
                      case 'workload':
                        return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: LightBulbIcon, iconColor: 'text-yellow-500' };
                      case 'deadline':
                        return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: ClockIcon, iconColor: 'text-orange-500' };
                      default:
                        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: InformationCircleIcon, iconColor: 'text-blue-500' };
                    }
                  };

                  const style = getRecommendationStyle(rec.type);
                  const IconComponent = style.icon;

                  return (
                    <div key={index} className={`p-3 ${style.bg} rounded-lg border ${style.border}`}>
                      <div className="flex items-start mb-2">
                        <IconComponent className={`w-4 h-4 ${style.iconColor} mr-2 mt-0.5 flex-shrink-0`} />
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${style.text}`}>{rec.title}</span>
                          <div className="flex items-center mt-1">
                            <div className={`w-2 h-2 rounded-full mr-2 ${style.iconColor.replace('text-', 'bg-')}`}></div>
                            <span className="text-xs text-gray-600">
                              Confidence: {Math.round(rec.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className={`text-sm ${style.text}`}>
                        {rec.description}
                      </p>
                      {rec.actionable && (
                        <button 
                          className="mt-2 text-xs font-medium underline hover:no-underline"
                          onClick={() => {
                            if (rec.type === 'priority' && rec.data?.taskIds) {
                              navigate('/tasks');
                            } else if (rec.type === 'deadline' && rec.data?.tasks) {
                              navigate('/tasks');
                            } else {
                              navigate('/dashboard');
                            }
                          }}
                        >
                          Take Action →
                        </button>
                      )}
                    </div>
                  );
                })}
                
                {nextTask && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-start mb-2">
                      <LightBulbIcon className="w-4 h-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-purple-800">Suggested Next Task</span>
                        <div className="flex items-center mt-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                          <span className="text-xs text-gray-600">AI Recommendation</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-purple-800 font-medium">
                      {nextTask.title}
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      Priority: {nextTask.priority} • Due: {nextTask.deadline ? new Date(nextTask.deadline).toLocaleDateString() : 'No deadline'}
                    </p>
                    <button 
                      className="mt-2 text-xs font-medium underline hover:no-underline text-purple-800"
                      onClick={() => navigate(`/tasks/${nextTask.id}`)}
                    >
                      Start Task →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;