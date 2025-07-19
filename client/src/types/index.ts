export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  deadline?: string;
  created_at: string;
  updated_at: string;
  owner?: User;
  tasks?: Task[];
  members?: ProjectMember[];
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
  user?: User;
}

export interface Task {
  id: string;
  project_id: string;
  parent_task_id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string;
  deadline?: string;
  estimated_hours?: number;
  actual_hours?: number;
  created_at: string;
  updated_at: string;
  assignee?: User;
  subtasks?: Task[];
  comments?: Comment[];
  dependencies?: TaskDependency[];
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentions?: string[];
  created_at: string;
  user?: User;
}

export interface Meeting {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  transcript?: string;
  summary?: string;
  recording_url?: string;
  duration?: number;
  attendees: string[];
  action_items?: ActionItem[];
  created_at: string;
  project?: Project;
}

export interface ActionItem {
  id: string;
  meeting_id: string;
  task_id?: string;
  content: string;
  assignee?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed';
  created_at: string;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  hours: number;
  description?: string;
  date: string;
  created_at: string;
  task?: Task;
  user?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'task_assigned' | 'task_updated' | 'comment_added' | 'meeting_scheduled' | 'deadline_approaching';
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, any>;
  created_at: string;
}

// Socket.io event types
export interface SocketEvents {
  // Task events
  task_created: Task;
  task_updated: Task;
  task_deleted: { taskId: string; projectId: string };
  
  // Project events
  project_updated: Project;
  
  // Comment events
  comment_added: Comment & { task: Task };
  
  // Real-time collaboration
  user_joined_project: { userId: string; projectId: string };
  user_left_project: { userId: string; projectId: string };
  
  // Meeting events
  meeting_started: { meetingId: string; projectId: string };
  meeting_transcription: { meetingId: string; text: string };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface CreateProjectDto {
  name: string;
  description?: string;
  deadline?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  status?: Project['status'];
  deadline?: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assignee_id?: string;
  deadline?: string;
  estimated_hours?: number;
  parent_task_id?: string;
  project_id?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assignee_id?: string;
  deadline?: string;
  estimated_hours?: number;
  actual_hours?: number;
}

export interface CreateCommentDto {
  content: string;
  mentions?: string[];
}

export interface CreateMeetingDto {
  title: string;
  description?: string;
  attendees: string[];
}

export interface CreateTimeEntryDto {
  hours: number;
  description?: string;
  date: string;
}

// View types for different displays
export type ViewMode = 'kanban' | 'calendar' | 'list';

export interface KanbanColumn {
  id: string;
  title: string;
  status: Task['status'];
  tasks: Task[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'task' | 'meeting' | 'deadline';
  data: Task | Meeting;
}

// AI Analysis types
export interface MeetingAnalysis {
  summary: string;
  action_items: Array<{
    content: string;
    assignee?: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  key_decisions: string[];
  next_steps: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface ProjectInsights {
  completion_rate: number;
  overdue_tasks: number;
  team_productivity: Record<string, number>;
  risk_assessment: 'low' | 'medium' | 'high';
  recommendations: string[];
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}