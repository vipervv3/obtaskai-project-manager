import { Router } from 'express';
import { supabase } from '../services/supabase';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

// Get all projects for the authenticated user
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:users!projects_owner_id_fkey(id, email, full_name),
      members:project_members(
        id,
        role,
        joined_at,
        user:users(id, email, full_name)
      ),
      tasks:tasks(
        id,
        title,
        status,
        priority,
        assignee:users(id, email, full_name)
      )
    `)
    .or(`owner_id.eq.${req.user!.id},id.in.(${await getUserProjectIds(req.user!.id)})`);

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: projects
  });
}));

// Get a specific project
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:users!projects_owner_id_fkey(id, email, full_name),
      members:project_members(
        id,
        role,
        joined_at,
        user:users(id, email, full_name)
      ),
      tasks:tasks(
        *,
        assignee:users(id, email, full_name),
        comments:comments(
          *,
          user:users(id, email, full_name)
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError('Project not found', 404);
    }
    throw createError(error.message, 500);
  }

  // Check if user has access to this project
  const hasAccess = project.owner_id === req.user!.id || 
    project.members?.some((member: any) => member.user.id === req.user!.id);

  if (!hasAccess) {
    throw createError('Access denied', 403);
  }

  res.json({
    success: true,
    data: project
  });
}));

// Create a new project
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { name, description, deadline } = req.body;

  if (!name) {
    throw createError('Project name is required', 400);
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      name,
      description,
      deadline,
      owner_id: req.user!.id
    })
    .select(`
      *,
      owner:users!projects_owner_id_fkey(id, email, full_name)
    `)
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  res.status(201).json({
    success: true,
    data: project
  });
}));

// Update a project
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, description, status, deadline } = req.body;

  // Check if user is the project owner
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (projectError) {
    if (projectError.code === 'PGRST116') {
      throw createError('Project not found', 404);
    }
    throw createError(projectError.message, 500);
  }

  if (project.owner_id !== req.user!.id) {
    throw createError('Only project owner can update project', 403);
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (deadline !== undefined) updateData.deadline = deadline;

  const { data: updatedProject, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      owner:users!projects_owner_id_fkey(id, email, full_name)
    `)
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: updatedProject
  });
}));

// Delete a project
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  // Check if user is the project owner
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (projectError) {
    if (projectError.code === 'PGRST116') {
      throw createError('Project not found', 404);
    }
    throw createError(projectError.message, 500);
  }

  if (project.owner_id !== req.user!.id) {
    throw createError('Only project owner can delete project', 403);
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    message: 'Project deleted successfully'
  });
}));

// Add member to project
router.post('/:id/members', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { user_email, role = 'member' } = req.body;

  if (!user_email) {
    throw createError('User email is required', 400);
  }

  // Check if user is project owner or admin
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (projectError) {
    throw createError('Project not found', 404);
  }

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', id)
    .eq('user_id', req.user!.id)
    .single();

  const canAddMembers = project.owner_id === req.user!.id || 
    (membership && ['owner', 'admin'].includes(membership.role));

  if (!canAddMembers) {
    throw createError('Only project owners and admins can add members', 403);
  }

  // Find user by email
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', user_email)
    .single();

  if (userError) {
    throw createError('User not found', 404);
  }

  // Add member
  const { data: newMember, error } = await supabase
    .from('project_members')
    .insert({
      project_id: id,
      user_id: user.id,
      role
    })
    .select(`
      *,
      user:users(id, email, full_name)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw createError('User is already a member of this project', 409);
    }
    throw createError(error.message, 500);
  }

  res.status(201).json({
    success: true,
    data: newMember
  });
}));

// Remove member from project
router.delete('/:id/members/:memberId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id, memberId } = req.params;

  // Check if user is project owner or admin
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (projectError) {
    throw createError('Project not found', 404);
  }

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', id)
    .eq('user_id', req.user!.id)
    .single();

  const canRemoveMembers = project.owner_id === req.user!.id || 
    (membership && ['owner', 'admin'].includes(membership.role));

  if (!canRemoveMembers) {
    throw createError('Only project owners and admins can remove members', 403);
  }

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId)
    .eq('project_id', id);

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    message: 'Member removed successfully'
  });
}));

// Helper function to get project IDs where user is a member
async function getUserProjectIds(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  if (error || !data) {
    return '';
  }

  return data.map(item => item.project_id).join(',');
}

export default router;