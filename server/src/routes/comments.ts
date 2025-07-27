import { Router } from 'express';
import { supabase } from '../services/supabase';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { notifyCommentAdded } from './notifications';

const router = Router();

// Get comments for a task
router.get('/task/:taskId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { taskId } = req.params;

  // Verify user has access to the task
  await verifyTaskAccess(taskId, req.user!.id);

  const { data: comments, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:users(id, email, full_name, avatar_url)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: comments
  });
}));

// Create a new comment
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { task_id, content, mentions = [] } = req.body;

  if (!task_id || !content) {
    throw createError('Task ID and content are required', 400);
  }

  // Verify user has access to the task
  await verifyTaskAccess(task_id, req.user!.id);

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      task_id,
      user_id: req.user!.id,
      content,
      mentions
    })
    .select(`
      *,
      user:users(id, email, full_name, avatar_url)
    `)
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  // Get task info for notification
  const { data: task } = await supabase
    .from('tasks')
    .select('title')
    .eq('id', task_id)
    .single();

  // Send notification about new comment
  if (task) {
    await notifyCommentAdded(
      task_id,
      req.user!.full_name || req.user!.email,
      task.title
    );
  }

  // TODO: Send notifications to mentioned users
  if (mentions && mentions.length > 0) {
    await createMentionNotifications(mentions, comment, req.user!.id);
  }

  res.status(201).json({
    success: true,
    data: comment
  });
}));

// Update a comment
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { content, mentions } = req.body;

  if (!content) {
    throw createError('Content is required', 400);
  }

  // Get the comment and verify ownership
  const { data: existingComment, error: commentError } = await supabase
    .from('comments')
    .select('user_id, task_id')
    .eq('id', id)
    .single();

  if (commentError) {
    if (commentError.code === 'PGRST116') {
      throw createError('Comment not found', 404);
    }
    throw createError(commentError.message, 500);
  }

  if (existingComment.user_id !== req.user!.id) {
    throw createError('You can only edit your own comments', 403);
  }

  // Verify user has access to the task
  await verifyTaskAccess(existingComment.task_id, req.user!.id);

  const updateData: any = { content };
  if (mentions !== undefined) updateData.mentions = mentions;

  const { data: comment, error } = await supabase
    .from('comments')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      user:users(id, email, full_name, avatar_url)
    `)
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: comment
  });
}));

// Delete a comment
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  // Get the comment and verify ownership or project ownership
  const { data: comment, error: commentError } = await supabase
    .from('comments')
    .select(`
      user_id,
      task_id,
      task:tasks(
        project_id,
        project:projects(owner_id)
      )
    `)
    .eq('id', id)
    .single();

  if (commentError) {
    if (commentError.code === 'PGRST116') {
      throw createError('Comment not found', 404);
    }
    throw createError(commentError.message, 500);
  }

  // User can delete their own comments or project owner can delete any comment
  const canDelete = comment.user_id === req.user!.id || 
    (comment.task as any).project.owner_id === req.user!.id;

  if (!canDelete) {
    throw createError('You can only delete your own comments or comments in your projects', 403);
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    message: 'Comment deleted successfully'
  });
}));

// Helper function to verify task access
async function verifyTaskAccess(taskId: string, userId: string) {
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select(`
      project_id,
      project:projects(owner_id)
    `)
    .eq('id', taskId)
    .single();

  if (taskError) {
    throw createError('Task not found', 404);
  }

  // Check if user is project owner
  if ((task.project as any).owner_id === userId) {
    return true;
  }

  // Check if user is project member
  const { data: membership, error: membershipError } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', task.project_id)
    .eq('user_id', userId)
    .single();

  if (membershipError && membershipError.code === 'PGRST116') {
    throw createError('Access denied', 403);
  }

  if (membershipError) {
    throw createError(membershipError.message, 500);
  }

  return true;
}

// Helper function to create mention notifications
async function createMentionNotifications(mentions: string[], comment: any, authorId: string) {
  try {
    // Get mentioned users
    const { data: mentionedUsers, error } = await supabase
      .from('users')
      .select('id, email')
      .in('email', mentions);

    if (error || !mentionedUsers) {
      console.error('Error fetching mentioned users:', error);
      return;
    }

    // Create notifications for mentioned users (excluding the comment author)
    const notifications = mentionedUsers
      .filter(user => user.id !== authorId)
      .map(user => ({
        user_id: user.id,
        type: 'comment_added' as const,
        title: 'You were mentioned in a comment',
        message: `${comment.user.full_name} mentioned you in a comment`,
        data: {
          comment_id: comment.id,
          task_id: comment.task_id,
          comment_content: comment.content.substring(0, 100)
        }
      }));

    if (notifications.length > 0) {
      await supabase
        .from('notifications')
        .insert(notifications);
    }
  } catch (error) {
    console.error('Error creating mention notifications:', error);
  }
}

export default router;