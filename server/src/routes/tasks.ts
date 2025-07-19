import { Router } from 'express';
import { supabase } from '../services/supabase';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

// Get all tasks for a project
router.get('/project/:projectId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { projectId } = req.params;
  const { status, assignee_id, priority } = req.query;

  // Verify user has access to the project
  await verifyProjectAccess(projectId, req.user!.id);

  let query = supabase
    .from('tasks')
    .select(`
      *,
      assignee:users(id, email, full_name),
      subtasks:tasks!parent_task_id(
        *,
        assignee:users(id, email, full_name)
      ),
      comments:comments(
        *,
        user:users(id, email, full_name)
      ),
      dependencies:task_dependencies!task_id(
        *,
        depends_on:tasks!depends_on_task_id(id, title, status)
      )
    `)
    .eq('project_id', projectId)
    .is('parent_task_id', null); // Only get top-level tasks

  // Apply filters
  if (status) query = query.eq('status', status);
  if (assignee_id) query = query.eq('assignee_id', assignee_id);
  if (priority) query = query.eq('priority', priority);

  const { data: tasks, error } = await query;

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: tasks
  });
}));

// Get a specific task
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const { data: task, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(id, name, owner_id),
      assignee:users(id, email, full_name),
      subtasks:tasks!parent_task_id(
        *,
        assignee:users(id, email, full_name)
      ),
      comments:comments(
        *,
        user:users(id, email, full_name)
      ),
      dependencies:task_dependencies!task_id(
        *,
        depends_on:tasks!depends_on_task_id(id, title, status)
      ),
      time_entries:time_entries(
        *,
        user:users(id, email, full_name)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError('Task not found', 404);
    }
    throw createError(error.message, 500);
  }

  // Verify user has access to the project
  await verifyProjectAccess(task.project_id, req.user!.id);

  res.json({
    success: true,
    data: task
  });
}));

// Create a new task
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const {
    project_id,
    title,
    description,
    priority = 'medium',
    assignee_id,
    deadline,
    estimated_hours,
    parent_task_id
  } = req.body;

  if (!project_id || !title) {
    throw createError('Project ID and title are required', 400);
  }

  // Verify user has access to the project
  await verifyProjectAccess(project_id, req.user!.id);

  // If parent_task_id is provided, verify it exists and belongs to the same project
  if (parent_task_id) {
    const { data: parentTask, error: parentError } = await supabase
      .from('tasks')
      .select('project_id')
      .eq('id', parent_task_id)
      .single();

    if (parentError || parentTask.project_id !== project_id) {
      throw createError('Invalid parent task', 400);
    }
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      project_id,
      title,
      description,
      priority,
      assignee_id,
      deadline,
      estimated_hours,
      parent_task_id
    })
    .select(`
      *,
      assignee:users(id, email, full_name)
    `)
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  res.status(201).json({
    success: true,
    data: task
  });
}));

// Update a task
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    status,
    priority,
    assignee_id,
    deadline,
    estimated_hours,
    actual_hours
  } = req.body;

  // Get the task and verify access
  const { data: existingTask, error: taskError } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', id)
    .single();

  if (taskError) {
    if (taskError.code === 'PGRST116') {
      throw createError('Task not found', 404);
    }
    throw createError(taskError.message, 500);
  }

  await verifyProjectAccess(existingTask.project_id, req.user!.id);

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (assignee_id !== undefined) updateData.assignee_id = assignee_id;
  if (deadline !== undefined) updateData.deadline = deadline;
  if (estimated_hours !== undefined) updateData.estimated_hours = estimated_hours;
  if (actual_hours !== undefined) updateData.actual_hours = actual_hours;

  const { data: task, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      assignee:users(id, email, full_name)
    `)
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: task
  });
}));

// Delete a task
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  // Get the task and verify access
  const { data: existingTask, error: taskError } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', id)
    .single();

  if (taskError) {
    if (taskError.code === 'PGRST116') {
      throw createError('Task not found', 404);
    }
    throw createError(taskError.message, 500);
  }

  await verifyProjectAccess(existingTask.project_id, req.user!.id);

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    message: 'Task deleted successfully'
  });
}));

// Add task dependency
router.post('/:id/dependencies', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { depends_on_task_id } = req.body;

  if (!depends_on_task_id) {
    throw createError('Dependency task ID is required', 400);
  }

  // Get both tasks and verify they're in the same project
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', id)
    .single();

  const { data: dependsOnTask, error: dependsOnError } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', depends_on_task_id)
    .single();

  if (taskError || dependsOnError) {
    throw createError('One or both tasks not found', 404);
  }

  if (task.project_id !== dependsOnTask.project_id) {
    throw createError('Tasks must be in the same project', 400);
  }

  await verifyProjectAccess(task.project_id, req.user!.id);

  // Check for circular dependencies
  if (await hasCircularDependency(id, depends_on_task_id)) {
    throw createError('Circular dependency detected', 400);
  }

  const { data: dependency, error } = await supabase
    .from('task_dependencies')
    .insert({
      task_id: id,
      depends_on_task_id
    })
    .select(`
      *,
      depends_on:tasks!depends_on_task_id(id, title, status)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw createError('Dependency already exists', 409);
    }
    throw createError(error.message, 500);
  }

  res.status(201).json({
    success: true,
    data: dependency
  });
}));

// Remove task dependency
router.delete('/:id/dependencies/:dependencyId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id, dependencyId } = req.params;

  // Verify task access
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', id)
    .single();

  if (taskError) {
    throw createError('Task not found', 404);
  }

  await verifyProjectAccess(task.project_id, req.user!.id);

  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('id', dependencyId)
    .eq('task_id', id);

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    message: 'Dependency removed successfully'
  });
}));

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

// Helper function to check for circular dependencies
async function hasCircularDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
  // Simple implementation - check if dependsOnTaskId depends on taskId
  const { data: dependencies } = await supabase
    .from('task_dependencies')
    .select('depends_on_task_id')
    .eq('task_id', dependsOnTaskId);

  if (!dependencies) return false;

  for (const dep of dependencies) {
    if (dep.depends_on_task_id === taskId) {
      return true;
    }
    // Recursively check deeper dependencies
    if (await hasCircularDependency(taskId, dep.depends_on_task_id)) {
      return true;
    }
  }

  return false;
}

// Time tracking endpoints
router.post('/:id/time', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { hours, description, date } = req.body;

  if (!hours || hours <= 0) {
    throw createError('Hours must be greater than 0', 400);
  }

  // Get the task and verify access
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', id)
    .single();

  if (taskError) {
    if (taskError.code === 'PGRST116') {
      throw createError('Task not found', 404);
    }
    throw createError(taskError.message, 500);
  }

  await verifyProjectAccess(task.project_id, req.user!.id);

  const { data: timeEntry, error } = await supabase
    .from('time_entries')
    .insert({
      task_id: id,
      user_id: req.user!.id,
      hours,
      description,
      date: date || new Date().toISOString().split('T')[0]
    })
    .select(`
      *,
      user:users(id, email, full_name),
      task:tasks(id, title)
    `)
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  res.status(201).json({
    success: true,
    data: timeEntry
  });
}));

router.get('/:id/time', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  // Get the task and verify access
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', id)
    .single();

  if (taskError) {
    if (taskError.code === 'PGRST116') {
      throw createError('Task not found', 404);
    }
    throw createError(taskError.message, 500);
  }

  await verifyProjectAccess(task.project_id, req.user!.id);

  const { data: timeEntries, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      user:users(id, email, full_name)
    `)
    .eq('task_id', id)
    .order('date', { ascending: false });

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: timeEntries || []
  });
}));

// Update time entry
router.put('/:id/time/:timeId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id, timeId } = req.params;
  const { hours, description, date } = req.body;

  if (!hours || hours <= 0) {
    throw createError('Hours must be greater than 0', 400);
  }

  // Get the task and verify access
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', id)
    .single();

  if (taskError) {
    if (taskError.code === 'PGRST116') {
      throw createError('Task not found', 404);
    }
    throw createError(taskError.message, 500);
  }

  await verifyProjectAccess(task.project_id, req.user!.id);

  // Verify time entry belongs to this task and user
  const { data: existingEntry, error: entryError } = await supabase
    .from('time_entries')
    .select('*')
    .eq('id', timeId)
    .eq('task_id', id)
    .eq('user_id', req.user!.id)
    .single();

  if (entryError) {
    throw createError('Time entry not found or access denied', 404);
  }

  const { data: timeEntry, error } = await supabase
    .from('time_entries')
    .update({
      hours,
      description,
      date: date || existingEntry.date
    })
    .eq('id', timeId)
    .select(`
      *,
      user:users(id, email, full_name),
      task:tasks(id, title)
    `)
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: timeEntry
  });
}));

// Delete time entry
router.delete('/:id/time/:timeId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id, timeId } = req.params;

  // Get the task and verify access
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', id)
    .single();

  if (taskError) {
    if (taskError.code === 'PGRST116') {
      throw createError('Task not found', 404);
    }
    throw createError(taskError.message, 500);
  }

  await verifyProjectAccess(task.project_id, req.user!.id);

  // Verify time entry belongs to this task and user
  const { data: existingEntry, error: entryError } = await supabase
    .from('time_entries')
    .select('*')
    .eq('id', timeId)
    .eq('task_id', id)
    .eq('user_id', req.user!.id)
    .single();

  if (entryError) {
    throw createError('Time entry not found or access denied', 404);
  }

  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', timeId);

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    message: 'Time entry deleted successfully'
  });
}));

export default router;