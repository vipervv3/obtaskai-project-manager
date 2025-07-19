import { Router } from 'express';
import { supabase } from '../services/supabase';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

// Get time entries for a task
router.get('/task/:taskId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { taskId } = req.params;

  // Verify user has access to the task
  await verifyTaskAccess(taskId, req.user!.id);

  const { data: timeEntries, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      user:users(id, email, full_name),
      task:tasks(id, title, project_id)
    `)
    .eq('task_id', taskId)
    .order('date', { ascending: false });

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: timeEntries
  });
}));

// Get time entries for a project
router.get('/project/:projectId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { projectId } = req.params;
  const { user_id, start_date, end_date } = req.query;

  // Verify user has access to the project
  await verifyProjectAccess(projectId, req.user!.id);

  let query = supabase
    .from('time_entries')
    .select(`
      *,
      user:users(id, email, full_name),
      task:tasks(id, title, status, priority)
    `)
    .eq('task.project_id', projectId);

  // Apply filters
  if (user_id) {
    query = query.eq('user_id', user_id);
  }

  if (start_date) {
    query = query.gte('date', start_date);
  }

  if (end_date) {
    query = query.lte('date', end_date);
  }

  query = query.order('date', { ascending: false });

  const { data: timeEntries, error } = await query;

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: timeEntries
  });
}));

// Get user's time entries
router.get('/user/me', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { start_date, end_date, project_id } = req.query;

  let query = supabase
    .from('time_entries')
    .select(`
      *,
      task:tasks(
        id,
        title,
        status,
        priority,
        project:projects(id, name)
      )
    `)
    .eq('user_id', req.user!.id);

  // Apply filters
  if (start_date) {
    query = query.gte('date', start_date);
  }

  if (end_date) {
    query = query.lte('date', end_date);
  }

  if (project_id) {
    query = query.eq('task.project_id', project_id);
  }

  query = query.order('date', { ascending: false });

  const { data: timeEntries, error } = await query;

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: timeEntries
  });
}));

// Create a new time entry
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { task_id, hours, description, date } = req.body;

  if (!task_id || !hours || !date) {
    throw createError('Task ID, hours, and date are required', 400);
  }

  if (hours <= 0 || hours > 24) {
    throw createError('Hours must be between 0 and 24', 400);
  }

  // Verify user has access to the task
  await verifyTaskAccess(task_id, req.user!.id);

  const { data: timeEntry, error } = await supabase
    .from('time_entries')
    .insert({
      task_id,
      user_id: req.user!.id,
      hours,
      description,
      date
    })
    .select(`
      *,
      user:users(id, email, full_name),
      task:tasks(id, title, project_id)
    `)
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  // Update task's actual hours
  await updateTaskActualHours(task_id);

  res.status(201).json({
    success: true,
    data: timeEntry
  });
}));

// Update a time entry
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { hours, description, date } = req.body;

  // Get the time entry and verify ownership
  const { data: existingEntry, error: entryError } = await supabase
    .from('time_entries')
    .select('user_id, task_id')
    .eq('id', id)
    .single();

  if (entryError) {
    if (entryError.code === 'PGRST116') {
      throw createError('Time entry not found', 404);
    }
    throw createError(entryError.message, 500);
  }

  if (existingEntry.user_id !== req.user!.id) {
    throw createError('You can only edit your own time entries', 403);
  }

  // Verify user has access to the task
  await verifyTaskAccess(existingEntry.task_id, req.user!.id);

  const updateData: any = {};
  if (hours !== undefined) {
    if (hours <= 0 || hours > 24) {
      throw createError('Hours must be between 0 and 24', 400);
    }
    updateData.hours = hours;
  }
  if (description !== undefined) updateData.description = description;
  if (date !== undefined) updateData.date = date;

  const { data: timeEntry, error } = await supabase
    .from('time_entries')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      user:users(id, email, full_name),
      task:tasks(id, title, project_id)
    `)
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  // Update task's actual hours if hours changed
  if (hours !== undefined) {
    await updateTaskActualHours(existingEntry.task_id);
  }

  res.json({
    success: true,
    data: timeEntry
  });
}));

// Delete a time entry
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  // Get the time entry and verify ownership
  const { data: existingEntry, error: entryError } = await supabase
    .from('time_entries')
    .select('user_id, task_id')
    .eq('id', id)
    .single();

  if (entryError) {
    if (entryError.code === 'PGRST116') {
      throw createError('Time entry not found', 404);
    }
    throw createError(entryError.message, 500);
  }

  if (existingEntry.user_id !== req.user!.id) {
    throw createError('You can only delete your own time entries', 403);
  }

  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', id);

  if (error) {
    throw createError(error.message, 500);
  }

  // Update task's actual hours
  await updateTaskActualHours(existingEntry.task_id);

  res.json({
    success: true,
    message: 'Time entry deleted successfully'
  });
}));

// Get time tracking summary for a project
router.get('/project/:projectId/summary', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { projectId } = req.params;
  const { start_date, end_date } = req.query;

  // Verify user has access to the project
  await verifyProjectAccess(projectId, req.user!.id);

  // Get all time entries for the project
  let query = supabase
    .from('time_entries')
    .select(`
      hours,
      date,
      user:users(id, email, full_name),
      task:tasks(id, title, status)
    `)
    .eq('task.project_id', projectId);

  if (start_date) {
    query = query.gte('date', start_date);
  }

  if (end_date) {
    query = query.lte('date', end_date);
  }

  const { data: timeEntries, error } = await query;

  if (error) {
    throw createError(error.message, 500);
  }

  // Calculate summary statistics
  const totalHours = timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0;
  
  const userHours = timeEntries?.reduce((acc: Record<string, number>, entry) => {
    const userId = (entry.user as any).id;
    acc[userId] = (acc[userId] || 0) + entry.hours;
    return acc;
  }, {}) || {};

  const taskHours = timeEntries?.reduce((acc: Record<string, number>, entry) => {
    const taskId = (entry.task as any).id;
    acc[taskId] = (acc[taskId] || 0) + entry.hours;
    return acc;
  }, {}) || {};

  res.json({
    success: true,
    data: {
      total_hours: totalHours,
      user_hours: userHours,
      task_hours: taskHours,
      entries_count: timeEntries?.length || 0
    }
  });
}));

// Start/stop timer for a task
router.post('/timer/:taskId/:action', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { taskId, action } = req.params;

  if (!['start', 'stop'].includes(action)) {
    throw createError('Action must be "start" or "stop"', 400);
  }

  // Verify user has access to the task
  await verifyTaskAccess(taskId, req.user!.id);

  if (action === 'start') {
    // Check if user already has an active timer
    const { data: activeTimer } = await supabase
      .from('active_timers')
      .select('*')
      .eq('user_id', req.user!.id)
      .single();

    if (activeTimer) {
      throw createError('You already have an active timer running', 400);
    }

    // Start new timer
    const { data: timer, error } = await supabase
      .from('active_timers')
      .insert({
        user_id: req.user!.id,
        task_id: taskId,
        started_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) {
      throw createError(error.message, 500);
    }

    res.json({
      success: true,
      data: timer,
      message: 'Timer started'
    });
  } else {
    // Stop timer and create time entry
    const { data: timer, error: timerError } = await supabase
      .from('active_timers')
      .select('*')
      .eq('user_id', req.user!.id)
      .eq('task_id', taskId)
      .single();

    if (timerError) {
      throw createError('No active timer found for this task', 404);
    }

    const startTime = new Date(timer.started_at);
    const endTime = new Date();
    const hours = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 100) / 100;

    // Create time entry
    const { data: timeEntry, error: entryError } = await supabase
      .from('time_entries')
      .insert({
        task_id: taskId,
        user_id: req.user!.id,
        hours,
        description: 'Auto-tracked time',
        date: endTime.toISOString().split('T')[0]
      })
      .select(`
        *,
        user:users(id, email, full_name),
        task:tasks(id, title, project_id)
      `)
      .single();

    if (entryError) {
      throw createError(entryError.message, 500);
    }

    // Delete timer
    await supabase
      .from('active_timers')
      .delete()
      .eq('id', timer.id);

    // Update task's actual hours
    await updateTaskActualHours(taskId);

    res.json({
      success: true,
      data: timeEntry,
      message: 'Timer stopped and time entry created'
    });
  }
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

// Helper function to verify project access
async function verifyProjectAccess(projectId: string, userId: string) {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single();

  if (projectError) {
    throw createError('Project not found', 404);
  }

  if (project.owner_id === userId) {
    return true;
  }

  const { data: membership, error: membershipError } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
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

// Helper function to update task's actual hours
async function updateTaskActualHours(taskId: string) {
  try {
    // Calculate total hours for the task
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('hours')
      .eq('task_id', taskId);

    const totalHours = timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0;

    // Update task
    await supabase
      .from('tasks')
      .update({ actual_hours: totalHours })
      .eq('id', taskId);
  } catch (error) {
    console.error('Error updating task actual hours:', error);
  }
}

export default router;