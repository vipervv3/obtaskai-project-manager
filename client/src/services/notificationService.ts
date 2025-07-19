import { AxiosResponse } from 'axios';
import { Notification as AppNotification, ApiResponse } from '../types';
import apiService from './api';

class NotificationService {
  async getNotifications(): Promise<AxiosResponse<ApiResponse<AppNotification[]>>> {
    return apiService.get('/notifications');
  }

  async markAsRead(notificationId: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService.put(`/notifications/${notificationId}`, { read: true });
  }

  async markAllAsRead(): Promise<AxiosResponse<ApiResponse>> {
    return apiService.put('/notifications/mark-all-read');
  }

  async deleteNotification(notificationId: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService.delete(`/notifications/${notificationId}`);
  }

  async getUnreadCount(): Promise<AxiosResponse<ApiResponse<{ count: number }>>> {
    return apiService.get('/notifications/unread-count');
  }

  // Browser notification helpers
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return 'denied';
    }

    return await Notification.requestPermission();
  }

  showBrowserNotification(title: string, options?: NotificationOptions): globalThis.Notification | null {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return null;
    }

    return new globalThis.Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }

  getPermission(): NotificationPermission {
    return Notification.permission;
  }
}

export const notificationService = new NotificationService();
export default notificationService;