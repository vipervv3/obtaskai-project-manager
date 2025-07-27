import React, { useMemo, useState } from 'react';
import { Task, Project } from '../../types';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  CalendarDaysIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline';

interface GanttChartProps {
  project: Project;
  tasks: Task[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
}

interface GanttTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  created_at?: string;
  project_id: string;
  assigned_to?: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  dependencies?: string[];
}

const GanttChart: React.FC<GanttChartProps> = ({ project, tasks, onTaskUpdate }) => {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Convert tasks to Gantt format
  const ganttTasks: GanttTask[] = useMemo(() => {
    return tasks.map(task => {
      const startDate = task.created_at ? new Date(task.created_at) : new Date();
      const endDate = task.deadline ? new Date(task.deadline) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Calculate progress based on status
      let progress = 0;
      if (task.status === 'done') progress = 100;
      else if (task.status === 'in_progress') progress = 50;
      else if (task.status === 'review') progress = 75;
      else if (task.status === 'todo') progress = 0;
      
      return {
        ...task,
        startDate,
        endDate,
        progress,
        dependencies: [] // TODO: Add dependencies support
      };
    });
  }, [tasks]);

  // Calculate date range
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (ganttTasks.length === 0) {
      const today = new Date();
      return {
        minDate: today,
        maxDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        totalDays: 30
      };
    }

    const dates = ganttTasks.flatMap(task => [task.startDate, task.endDate]);
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add padding
    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 7);
    
    const days = Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24));
    
    return { minDate: min, maxDate: max, totalDays: days };
  }, [ganttTasks]);

  // Generate date headers
  const dateHeaders = useMemo(() => {
    const headers: { date: Date; label: string; isWeekend: boolean }[] = [];
    const current = new Date(minDate);
    
    while (current <= maxDate) {
      const isWeekend = current.getDay() === 0 || current.getDay() === 6;
      headers.push({
        date: new Date(current),
        label: current.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          ...(viewMode === 'month' && { month: 'long', year: 'numeric' })
        }),
        isWeekend
      });
      
      // Increment based on view mode
      if (viewMode === 'day') current.setDate(current.getDate() + 1);
      else if (viewMode === 'week') current.setDate(current.getDate() + 7);
      else current.setMonth(current.getMonth() + 1);
    }
    
    return headers;
  }, [minDate, maxDate, viewMode]);

  // Calculate task position
  const getTaskPosition = (task: GanttTask) => {
    const startOffset = Math.floor((task.startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 border-green-500';
      case 'in_progress': return 'bg-blue-100 border-blue-500';
      case 'review': return 'bg-purple-100 border-purple-500';
      case 'todo': return 'bg-yellow-100 border-yellow-500';
      default: return 'bg-gray-100 border-gray-500';
    }
  };

  // Toggle task expansion
  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // Group tasks by assignee or status
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: GanttTask[] } = {};
    
    ganttTasks.forEach(task => {
      const key = task.assigned_to || 'Unassigned';
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    
    return groups;
  }, [ganttTasks]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Gantt Chart</h3>
            <span className="text-sm text-gray-500">({tasks.length} tasks)</span>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex" style={{ height: '600px' }}>
        {/* Task List */}
        <div className="w-80 border-r border-gray-200 overflow-y-auto">
          <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-4 py-2">
            <div className="text-sm font-medium text-gray-700">Tasks</div>
          </div>
          
          {Object.entries(groupedTasks).map(([group, groupTasks]) => (
            <div key={group}>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <div className="text-sm font-medium text-gray-700">{group}</div>
              </div>
              
              {groupTasks.map(task => (
                <div
                  key={task.id}
                  className={`px-4 py-3 border-b border-gray-200 hover:bg-gray-50 ${
                    expandedTasks.has(task.id) ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="mt-0.5 p-0.5 hover:bg-gray-200 rounded"
                    >
                      {expandedTasks.has(task.id) ? (
                        <ChevronDownIcon className="w-4 h-4" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {task.title}
                        </span>
                      </div>
                      
                      {expandedTasks.has(task.id) && (
                        <div className="mt-2 text-xs text-gray-500">
                          <div>Status: {task.status}</div>
                          <div>Progress: {task.progress}%</div>
                          {task.deadline && (
                            <div>Due: {new Date(task.deadline).toLocaleDateString()}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-full" style={{ minWidth: '800px' }}>
            {/* Date Headers */}
            <div className="sticky top-0 bg-white border-b border-gray-200 h-12 flex">
              {dateHeaders.map((header, index) => (
                <div
                  key={index}
                  className={`flex-1 px-2 py-3 text-xs font-medium text-center border-r border-gray-200 ${
                    header.isWeekend ? 'bg-gray-50 text-gray-500' : 'text-gray-700'
                  }`}
                  style={{ minWidth: viewMode === 'day' ? '60px' : viewMode === 'week' ? '120px' : '200px' }}
                >
                  {header.label}
                </div>
              ))}
            </div>

            {/* Task Bars */}
            <div className="relative">
              {Object.entries(groupedTasks).map(([group, groupTasks]) => (
                <div key={group}>
                  <div className="h-8 bg-gray-50 border-b border-gray-200" />
                  
                  {groupTasks.map(task => {
                    const position = getTaskPosition(task);
                    const isExpanded = expandedTasks.has(task.id);
                    
                    return (
                      <div
                        key={task.id}
                        className={`relative border-b border-gray-200 ${
                          isExpanded ? 'h-20' : 'h-12'
                        }`}
                      >
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex">
                          {dateHeaders.map((_, index) => (
                            <div
                              key={index}
                              className="flex-1 border-r border-gray-100"
                              style={{ minWidth: viewMode === 'day' ? '60px' : viewMode === 'week' ? '120px' : '200px' }}
                            />
                          ))}
                        </div>
                        
                        {/* Task bar */}
                        <div
                          className={`absolute top-2 h-8 rounded ${getStatusColor(task.status)} border-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                          style={{
                            left: position.left,
                            width: position.width,
                            minWidth: '40px'
                          }}
                          onClick={() => onTaskUpdate && onTaskUpdate(task.id, {})}
                        >
                          {/* Progress bar */}
                          <div
                            className={`h-full rounded-l ${getPriorityColor(task.priority)} opacity-30`}
                            style={{ width: `${task.progress}%` }}
                          />
                          
                          {/* Task label */}
                          <div className="absolute inset-0 flex items-center px-2">
                            <span className="text-xs font-medium text-gray-900 truncate">
                              {task.title}
                            </span>
                          </div>
                        </div>
                        
                        {/* Dependencies lines would go here */}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700">Priority:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-500 rounded-full" />
              <span>Urgent</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-orange-500 rounded-full" />
              <span>High</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Low</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700">Status:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-100 border border-green-500 rounded" />
              <span>Done</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-100 border border-blue-500 rounded" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-purple-100 border border-purple-500 rounded" />
              <span>Review</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-yellow-100 border border-yellow-500 rounded" />
              <span>To Do</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;