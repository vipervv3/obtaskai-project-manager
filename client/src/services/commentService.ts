import { AxiosResponse } from 'axios';
import { Comment, CreateCommentDto, ApiResponse } from '../types';
import apiService from './api';

class CommentService {
  async getTaskComments(taskId: string): Promise<AxiosResponse<ApiResponse<Comment[]>>> {
    return apiService.get(`/comments/task/${taskId}`);
  }

  async createComment(taskId: string, commentData: CreateCommentDto): Promise<AxiosResponse<ApiResponse<Comment>>> {
    return apiService.post('/comments', {
      task_id: taskId,
      ...commentData,
    });
  }

  async updateComment(id: string, updates: {
    content: string;
    mentions?: string[];
  }): Promise<AxiosResponse<ApiResponse<Comment>>> {
    return apiService.put(`/comments/${id}`, updates);
  }

  async deleteComment(id: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService.delete(`/comments/${id}`);
  }
}

export const commentService = new CommentService();
export default commentService;