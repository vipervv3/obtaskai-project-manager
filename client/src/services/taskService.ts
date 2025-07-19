import { AxiosResponse } from 'axios';
import { Task, CreateTaskDto, UpdateTaskDto, ApiResponse } from '../types';
import apiService from './api';

class TaskService {
  async getProjectTasks(projectId: string, filters?: {
    status?: string;
    assignee_id?: string;
    priority?: string;
  }): Promise<AxiosResponse<ApiResponse<Task[]>>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assignee_id) params.append('assignee_id', filters.assignee_id);
    if (filters?.priority) params.append('priority', filters.priority);
    
    const queryString = params.toString();
    const url = `/tasks/project/${projectId}${queryString ? `?${queryString}` : ''}`;
    
    return apiService.get(url);
  }

  async getTask(id: string): Promise<AxiosResponse<ApiResponse<Task>>> {
    return apiService.get(`/tasks/${id}`);
  }

  async createTask(taskData: CreateTaskDto & { project_id?: string }): Promise<AxiosResponse<ApiResponse<Task>>> {
    return apiService.post('/tasks', taskData);
  }

  async updateTask(id: string, updates: UpdateTaskDto): Promise<AxiosResponse<ApiResponse<Task>>> {
    return apiService.put(`/tasks/${id}`, updates);
  }

  async deleteTask(id: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService.delete(`/tasks/${id}`);
  }

  async addDependency(taskId: string, dependsOnTaskId: string): Promise<AxiosResponse<ApiResponse<any>>> {
    return apiService.post(`/tasks/${taskId}/dependencies`, {
      depends_on_task_id: dependsOnTaskId,
    });
  }

  async removeDependency(taskId: string, dependencyId: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService.delete(`/tasks/${taskId}/dependencies/${dependencyId}`);
  }

  // Time tracking methods
  async logTime(taskId: string, timeData: { hours: number; description: string; date: string }): Promise<AxiosResponse<ApiResponse<any>>> {
    return apiService.post(`/tasks/${taskId}/time`, timeData);
  }

  async getTimeEntries(taskId: string): Promise<AxiosResponse<ApiResponse<any[]>>> {
    return apiService.get(`/tasks/${taskId}/time`);
  }

  async updateTimeEntry(taskId: string, timeId: string, timeData: { hours: number; description: string; date: string }): Promise<AxiosResponse<ApiResponse<any>>> {
    return apiService.put(`/tasks/${taskId}/time/${timeId}`, timeData);
  }

  async deleteTimeEntry(taskId: string, timeId: string): Promise<AxiosResponse<ApiResponse<any>>> {
    return apiService.delete(`/tasks/${taskId}/time/${timeId}`);
  }

  async getTaskRecommendations(projectId?: string): Promise<AxiosResponse<ApiResponse<Task[]>>> {
    const params = projectId ? `?project_id=${projectId}` : '';
    return apiService.get(`/ai/recommendations/tasks${params}`);
  }

  async getTaskBreakdown(taskId: string): Promise<AxiosResponse<ApiResponse<any>>> {
    return apiService.post(`/ai/tasks/${taskId}/breakdown`);
  }
}

export const taskService = new TaskService();
export default taskService;