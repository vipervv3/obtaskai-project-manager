import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { fetchTask } from '../store/slices/tasksSlice';
import { fetchProject } from '../store/slices/projectsSlice';
import { fetchNotifications } from '../store/slices/notificationsSlice';

interface NotificationPayload {
  id: string;
  type: 'task_assigned' | 'task_updated' | 'comment_added' | 'meeting_scheduled' | 'deadline_approaching' | 'project_updated';
  title: string;
  message: string;
  userId: string;
  data?: any;
  timestamp: string;
}

interface RealTimeUpdate {
  type: 'task_update' | 'project_update' | 'comment_added' | 'time_logged';
  entityId: string;
  data: any;
  userId: string;
}

class NotificationEngine {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private notifications: NotificationPayload[] = [];
  private listeners: Set<(notification: NotificationPayload) => void> = new Set();

  // Initialize real-time connection
  connect(userId: string): void {
    if (this.socket) {
      this.disconnect();
    }

    const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
    
    this.socket = io(serverUrl, {
      auth: {
        token: localStorage.getItem('access_token')
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners(userId);
  }

  private setupEventListeners(userId: string): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Real-time connection established');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Join user's personal room for notifications
      this.socket?.emit('join_user_room', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('Real-time connection lost');
      this.isConnected = false;
      this.attemptReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.attemptReconnect();
    });

    // Notification events
    this.socket.on('notification', (notification: NotificationPayload) => {
      this.handleNotification(notification);
    });

    // Real-time updates
    this.socket.on('task_updated', (update: RealTimeUpdate) => {
      this.handleTaskUpdate(update);
    });

    this.socket.on('project_updated', (update: RealTimeUpdate) => {
      this.handleProjectUpdate(update);
    });

    this.socket.on('comment_added', (update: RealTimeUpdate) => {
      this.handleCommentAdded(update);
    });

    this.socket.on('time_logged', (update: RealTimeUpdate) => {
      this.handleTimeLogged(update);
    });

    // Collaboration events
    this.socket.on('user_typing', (data: { userId: string; taskId: string; userName: string }) => {
      this.showTypingIndicator(data);
    });

    this.socket.on('user_viewing', (data: { userId: string; entityId: string; entityType: string; userName: string }) => {
      this.showPresenceIndicator(data);
    });
  }

  // Handle incoming notifications
  private handleNotification(notification: NotificationPayload): void {
    console.log('New notification:', notification);
    
    // Add to local notifications
    this.notifications.unshift(notification);
    
    // Limit to 50 recent notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    // Show browser notification if permission granted
    this.showBrowserNotification(notification);
    
    // Show in-app notification
    this.showInAppNotification(notification);
    
    // Notify listeners
    this.listeners.forEach(listener => listener(notification));
    
    // Update Redux store
    store.dispatch(fetchNotifications());
  }

  // Handle real-time task updates
  private handleTaskUpdate(update: RealTimeUpdate): void {
    console.log('Task updated in real-time:', update);
    
    // Refresh task in Redux store
    store.dispatch(fetchTask(update.entityId));
    
    // Show subtle notification
    this.showToast(`Task \"${update.data.title}\" was updated`, 'info');
  }

  // Handle real-time project updates
  private handleProjectUpdate(update: RealTimeUpdate): void {
    console.log('Project updated in real-time:', update);
    
    // Refresh project in Redux store
    store.dispatch(fetchProject(update.entityId));
    
    this.showToast(`Project \"${update.data.name}\" was updated`, 'info');
  }

  // Handle new comments
  private handleCommentAdded(update: RealTimeUpdate): void {
    console.log('New comment added:', update);
    
    // Refresh task to get new comment
    if (update.data.taskId) {
      store.dispatch(fetchTask(update.data.taskId));
    }
    
    this.showToast(`New comment on \"${update.data.taskTitle}\"`, 'info');
  }

  // Handle time logging
  private handleTimeLogged(update: RealTimeUpdate): void {
    console.log('Time logged:', update);
    
    // Refresh task to update time totals
    if (update.data.taskId) {
      store.dispatch(fetchTask(update.data.taskId));
    }
  }

  // Show browser notifications
  private showBrowserNotification(notification: NotificationPayload): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id, // Prevent duplicates
        requireInteraction: notification.type === 'deadline_approaching'
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 5000);

      browserNotification.onclick = () => {
        window.focus();
        // Navigate to relevant page based on notification type
        this.handleNotificationClick(notification);
        browserNotification.close();
      };
    }
  }

  // Show in-app toast notification
  private showInAppNotification(notification: NotificationPayload): void {
    const toast = document.createElement('div');
    toast.className = `
      fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm
      ${this.getNotificationStyle(notification.type)}
      transform translate-x-full transition-transform duration-300 ease-in-out
    `;
    
    toast.innerHTML = `
      <div class="flex items-start">
        <div class="flex-1">
          <h4 class="font-medium text-sm">${notification.title}</h4>
          <p class="text-xs mt-1 opacity-90">${notification.message}</p>
        </div>
        <button class="ml-2 text-xl opacity-70 hover:opacity-100" onclick="this.parentElement.parentElement.remove()">
          ×
        </button>
      </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translate-x-0';
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.style.transform = 'translate-x-full';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 5000);

    // Click to navigate
    toast.addEventListener('click', () => {
      this.handleNotificationClick(notification);
      toast.remove();
    });
  }

  // Simple toast notifications
  private showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const toast = document.createElement('div');
    const colors = {
      info: 'bg-blue-500 text-white',
      success: 'bg-green-500 text-white',
      warning: 'bg-yellow-500 text-white',
      error: 'bg-red-500 text-white'
    };
    
    toast.className = `
      fixed bottom-4 right-4 z-50 p-3 rounded shadow-lg text-sm
      ${colors[type]} transform translate-y-full transition-transform duration-300
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translate-y-0';
    });

    setTimeout(() => {
      toast.style.transform = 'translate-y-full';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  // Get notification styling
  private getNotificationStyle(type: string): string {
    switch (type) {
      case 'task_assigned':
        return 'bg-blue-500 text-white';
      case 'task_updated':
        return 'bg-green-500 text-white';
      case 'comment_added':
        return 'bg-purple-500 text-white';
      case 'meeting_scheduled':
        return 'bg-indigo-500 text-white';
      case 'deadline_approaching':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-700 text-white';
    }
  }

  // Handle notification clicks
  private handleNotificationClick(notification: NotificationPayload): void {
    const { type, data } = notification;
    
    switch (type) {
      case 'task_assigned':
      case 'task_updated':
        if (data?.taskId) {
          window.location.href = `/tasks/${data.taskId}`;
        }
        break;
      case 'comment_added':
        if (data?.taskId) {
          window.location.href = `/tasks/${data.taskId}`;
        }
        break;
      case 'meeting_scheduled':
        if (data?.meetingId) {
          window.location.href = `/meetings/${data.meetingId}`;
        }
        break;
      case 'project_updated':
        if (data?.projectId) {
          window.location.href = `/projects/${data.projectId}`;
        }
        break;
      default:
        window.location.href = '/dashboard';
    }
  }

  // Show typing indicators
  private showTypingIndicator(data: { userId: string; taskId: string; userName: string }): void {
    const indicator = document.getElementById(`typing-${data.taskId}`);
    if (!indicator) {
      const element = document.createElement('div');
      element.id = `typing-${data.taskId}`;
      element.className = 'text-xs text-gray-500 italic';
      element.textContent = `${data.userName} is typing...`;
      
      // Find comment section and add indicator
      const commentSection = document.querySelector(`[data-task-id="${data.taskId}"] .comments-section`);
      commentSection?.appendChild(element);
      
      // Remove after 3 seconds
      setTimeout(() => {
        element.remove();
      }, 3000);
    }
  }

  // Show presence indicators
  private showPresenceIndicator(data: { userId: string; entityId: string; entityType: string; userName: string }): void {
    console.log(`${data.userName} is viewing ${data.entityType} ${data.entityId}`);
    
    // You could show "John is viewing this task" indicators
    this.showToast(`${data.userName} is also viewing this ${data.entityType}`, 'info');
  }

  // Collaboration features
  emitTyping(taskId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('user_typing', { taskId });
    }
  }

  emitViewing(entityId: string, entityType: 'task' | 'project'): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('user_viewing', { entityId, entityType });
    }
  }

  emitTaskUpdate(taskId: string, data: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('task_updated', { taskId, data });
    }
  }

  // Connection management
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.socket?.connect();
      }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Notification management
  addNotificationListener(callback: (notification: NotificationPayload) => void): void {
    this.listeners.add(callback);
  }

  removeNotificationListener(callback: (notification: NotificationPayload) => void): void {
    this.listeners.delete(callback);
  }

  getRecentNotifications(): NotificationPayload[] {
    return this.notifications.slice(0, 10);
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }

  // Request notification permissions
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.showToast('Notifications enabled! You\'ll receive updates in real-time.', 'success');
      }
      return permission;
    }
    return 'denied';
  }
}

export const notificationEngine = new NotificationEngine();
export default notificationEngine;