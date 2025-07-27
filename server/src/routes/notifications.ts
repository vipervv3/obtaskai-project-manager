import { Router } from 'express';
import { supabase } from '../services/supabase';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Server } from 'socket.io';

const router = Router();

// Get user's notifications
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const { page = '1', limit = '20' } = req.query;

  if (!userId) {
    throw createError('User not authenticated', 401);
  }

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit as string) - 1);

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: notifications || []
  });
}));

// Get unread notification count
router.get('/unread-count', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    throw createError('User not authenticated', 401);
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: { count: count || 0 }
  });
}));

// Mark notification as read
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { read } = req.body;

  if (!userId) {
    throw createError('User not authenticated', 401);
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ read })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  if (!data) {
    throw createError('Notification not found', 404);
  }

  res.json({
    success: true,
    data
  });
}));

// Mark all notifications as read
router.put('/mark-all-read', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    throw createError('User not authenticated', 401);
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
    .select();

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: { updated: data?.length || 0 }
  });
}));

// Delete notification
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw createError('User not authenticated', 401);
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    message: 'Notification deleted'
  });
}));

// Global socket.io instance - will be set from index.ts
let socketIo: Server | null = null;

export function setSocketIo(io: Server) {
  socketIo = io;
}

// Create a notification (internal use by other services)
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: any
) {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data: data || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    // Send real-time notification via Socket.io
    if (socketIo) {
      socketIo.to(`user:${userId}`).emit('notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        userId: notification.user_id,
        data: notification.data,
        timestamp: notification.created_at
      });
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

// Bulk create notifications for multiple users
export async function createBulkNotifications(
  userIds: string[],
  type: string,
  title: string,
  message: string,
  data?: any
) {
  try {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type,
      title,
      message,
      data: data || {}
    }));

    const { data: createdNotifications, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('Error creating bulk notifications:', error);
      return [];
    }

    // Send real-time notifications via Socket.io
    if (socketIo && createdNotifications) {
      createdNotifications.forEach(notification => {
        socketIo?.to(`user:${notification.user_id}`).emit('notification', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          userId: notification.user_id,
          data: notification.data,
          timestamp: notification.created_at
        });
      });
    }

    return createdNotifications || [];
  } catch (error) {
    console.error('Failed to create bulk notifications:', error);
    return [];
  }
}

// Helper functions for common notification types

export async function notifyTaskAssigned(taskId: string, assigneeId: string, assignerName: string, taskTitle: string) {
  await createNotification(
    assigneeId,
    'task_assigned',
    'New Task Assigned',
    `${assignerName} assigned you a task: "${taskTitle}"`,
    { taskId, assignerName, taskTitle }
  );
}

export async function notifyTaskUpdated(taskId: string, projectId: string, updaterName: string, taskTitle: string) {
  // Get project members to notify
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId);

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single();

  const userIds = new Set<string>();
  
  // Add project members
  if (members) {
    members.forEach(member => userIds.add(member.user_id));
  }
  
  // Add project owner
  if (project) {
    userIds.add(project.owner_id);
  }

  await createBulkNotifications(
    Array.from(userIds),
    'task_updated',
    'Task Updated',
    `${updaterName} updated task: "${taskTitle}"`,
    { taskId, taskTitle, updaterName }
  );
}

export async function notifyCommentAdded(taskId: string, commenterName: string, taskTitle: string) {
  // Get task assignee and project members
  const { data: task } = await supabase
    .from('tasks')
    .select('assignee_id, project_id')
    .eq('id', taskId)
    .single();

  if (!task) return;

  const userIds = new Set<string>();
  
  // Add task assignee
  if (task.assignee_id) {
    userIds.add(task.assignee_id);
  }

  // Add project members
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', task.project_id);

  if (members) {
    members.forEach(member => userIds.add(member.user_id));
  }

  // Add project owner
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', task.project_id)
    .single();

  if (project) {
    userIds.add(project.owner_id);
  }

  await createBulkNotifications(
    Array.from(userIds),
    'comment_added',
    'New Comment',
    `${commenterName} commented on "${taskTitle}"`,
    { taskId, taskTitle, commenterName }
  );
}

export async function notifyDeadlineApproaching(taskId: string, assigneeId: string, taskTitle: string, deadline: string) {
  await createNotification(
    assigneeId,
    'deadline_approaching',
    'Deadline Approaching',
    `Task "${taskTitle}" is due soon (${deadline})`,
    { taskId, taskTitle, deadline }
  );
}

export async function notifyMeetingScheduled(meetingId: string, projectId: string, meetingTitle: string, scheduledTime: string) {
  // Get project members
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId);

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single();

  const userIds = new Set<string>();
  
  if (members) {
    members.forEach(member => userIds.add(member.user_id));
  }
  
  if (project) {
    userIds.add(project.owner_id);
  }

  await createBulkNotifications(
    Array.from(userIds),
    'meeting_scheduled',
    'Meeting Scheduled',
    `New meeting: "${meetingTitle}" at ${scheduledTime}`,
    { meetingId, meetingTitle, scheduledTime }
  );
}

export default router;