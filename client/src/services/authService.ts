import { AxiosResponse } from 'axios';
import { LoginCredentials, RegisterCredentials, AuthUser, ApiResponse } from '../types';
import apiService from './api';

class AuthService {
  async login(credentials: LoginCredentials): Promise<AxiosResponse<ApiResponse<{ user: AuthUser; session: any }>>> {
    return apiService.post('/auth/login', credentials);
  }

  async register(credentials: RegisterCredentials): Promise<AxiosResponse<ApiResponse<{ user: AuthUser; session?: any }>>> {
    return apiService.post('/auth/register', credentials);
  }

  async logout(): Promise<AxiosResponse<ApiResponse>> {
    return apiService.post('/auth/logout');
  }

  async refreshToken(refreshToken: string): Promise<AxiosResponse<ApiResponse<{ session: any }>>> {
    return apiService.post('/auth/refresh', { refresh_token: refreshToken });
  }

  async getCurrentUser(): Promise<AxiosResponse<ApiResponse<AuthUser>>> {
    return apiService.get('/auth/me');
  }

  async forgotPassword(email: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService.post('/auth/forgot-password', { email });
  }

  async resetPassword(accessToken: string, refreshToken: string, newPassword: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService.post('/auth/reset-password', {
      access_token: accessToken,
      refresh_token: refreshToken,
      new_password: newPassword,
    });
  }

  // Helper methods
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    return !!token;
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}

export const authService = new AuthService();
export default authService;