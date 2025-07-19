import { AxiosResponse } from 'axios';
import { Project, CreateProjectDto, UpdateProjectDto, ProjectMember, ApiResponse } from '../types';
import apiService from './api';

class ProjectService {
  async getProjects(): Promise<AxiosResponse<ApiResponse<Project[]>>> {
    return apiService.get('/projects');
  }

  async getProject(id: string): Promise<AxiosResponse<ApiResponse<Project>>> {
    return apiService.get(`/projects/${id}`);
  }

  async createProject(projectData: CreateProjectDto): Promise<AxiosResponse<ApiResponse<Project>>> {
    return apiService.post('/projects', projectData);
  }

  async updateProject(id: string, updates: UpdateProjectDto): Promise<AxiosResponse<ApiResponse<Project>>> {
    return apiService.put(`/projects/${id}`, updates);
  }

  async deleteProject(id: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService.delete(`/projects/${id}`);
  }

  async addMember(projectId: string, userEmail: string, role: string = 'member'): Promise<AxiosResponse<ApiResponse<ProjectMember>>> {
    return apiService.post(`/projects/${projectId}/members`, {
      user_email: userEmail,
      role,
    });
  }

  async removeMember(projectId: string, memberId: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService.delete(`/projects/${projectId}/members/${memberId}`);
  }

  async updateMemberRole(projectId: string, memberId: string, role: string): Promise<AxiosResponse<ApiResponse<ProjectMember>>> {
    return apiService.put(`/projects/${projectId}/members/${memberId}`, { role });
  }

  async getProjectInsights(projectId: string): Promise<AxiosResponse<ApiResponse<any>>> {
    return apiService.get(`/ai/project/${projectId}/insights`);
  }

  async getWorkloadAnalysis(projectId: string): Promise<AxiosResponse<ApiResponse<any>>> {
    return apiService.get(`/ai/project/${projectId}/workload`);
  }
}

export const projectService = new ProjectService();
export default projectService;