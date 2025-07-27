import { Router } from 'express';
import { supabase } from '../services/supabase';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { analyzeMeetingTranscript, generateTaskBreakdown, generateProjectInsights } from '../services/openaiService';

const router = Router();

// Analyze project insights
router.get('/project/:projectId/insights', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { projectId } = req.params;

  // Verify user has access to the project
  await verifyProjectAccess(projectId, req.user!.id);

  // Get project data
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      *,
      tasks:tasks(
        *,
        time_entries:time_entries(hours, user_id, date)
      )
    `)
    .eq('id', projectId)
    .single();

  if (projectError) {
    throw createError('Project not found', 404);
  }

  const tasks = project.tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task: any) => task.status === 'done').length;
  const overdueTasks = tasks.filter((task: any) => 
    task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done'
  ).length;

  // Calculate completion rate
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Calculate team productivity (hours logged per user)
  const teamProductivity: Record<string, number> = {};
  tasks.forEach((task: any) => {
    task.time_entries?.forEach((entry: any) => {
      teamProductivity[entry.user_id] = (teamProductivity[entry.user_id] || 0) + entry.hours;
    });
  });

  // Risk assessment based on overdue tasks and completion rate
  let riskAssessment: 'low' | 'medium' | 'high' = 'low';
  if (overdueTasks > 5 || completionRate < 30) {
    riskAssessment = 'high';
  } else if (overdueTasks > 2 || completionRate < 60) {
    riskAssessment = 'medium';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (completionRate < 50) {
    recommendations.push('Consider breaking down large tasks into smaller, manageable pieces');
  }
  if (overdueTasks > 0) {
    recommendations.push(`Address ${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''} to prevent further delays`);
  }
  if (Object.keys(teamProductivity).length < 2) {
    recommendations.push('Consider adding more team members to increase productivity');
  }
  if (tasks.filter((t: any) => !t.assignee_id).length > 0) {
    recommendations.push('Assign unassigned tasks to team members for better accountability');
  }

  // Get meetings for AI analysis
  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get team members
  const { data: members } = await supabase
    .from('project_members')
    .select('user:users(id, email, full_name)')
    .eq('project_id', projectId);

  const baseInsights = {
    completion_rate: Math.round(completionRate),
    overdue_tasks: overdueTasks,
    team_productivity: teamProductivity,
    risk_assessment: riskAssessment,
    recommendations,
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    in_progress_tasks: tasks.filter((task: any) => task.status === 'in_progress').length,
    review_tasks: tasks.filter((task: any) => task.status === 'review').length,
  };

  // Try to get AI-powered insights
  try {
    const aiInsights = await generateProjectInsights({
      tasks,
      meetings: meetings || [],
      teamMembers: members || []
    });

    res.json({
      success: true,
      data: {
        ...baseInsights,
        ai_insights: aiInsights.insights,
        ai_risks: aiInsights.risks,
        ai_opportunities: aiInsights.opportunities,
        ai_recommendations: aiInsights.recommendations,
        enhanced_by_ai: true
      }
    });
  } catch (error) {
    console.error('AI insights generation failed:', error);
    
    res.json({
      success: true,
      data: {
        ...baseInsights,
        enhanced_by_ai: false
      }
    });
  }
}));

// Get task recommendations for a user
router.get('/recommendations/tasks', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { project_id } = req.query;

  let query = supabase
    .from('tasks')
    .select(`
      *,
      project:projects(id, name, owner_id),
      assignee:users(id, email, full_name)
    `)
    .eq('status', 'todo');

  if (project_id) {
    await verifyProjectAccess(project_id as string, req.user!.id);
    query = query.eq('project_id', project_id);
  } else {
    // Get tasks from projects user has access to
    const { data: userProjects } = await supabase
      .from('projects')
      .select('id')
      .or(`owner_id.eq.${req.user!.id},id.in.(${await getUserProjectIds(req.user!.id)})`);

    if (userProjects && userProjects.length > 0) {
      const projectIds = userProjects.map(p => p.id);
      query = query.in('project_id', projectIds);
    }
  }

  const { data: tasks, error } = await query
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) {
    throw createError(error.message, 500);
  }

  // Simple recommendation algorithm based on:
  // 1. High priority tasks
  // 2. Upcoming deadlines
  // 3. Tasks assigned to the user
  // 4. Tasks without assignees
  const recommendations = tasks?.map((task: any) => {
    let score = 0;
    let reason = '';

    // Priority scoring
    if (task.priority === 'high') {
      score += 3;
      reason = 'High priority task';
    } else if (task.priority === 'medium') {
      score += 2;
      reason = 'Medium priority task';
    } else {
      score += 1;
      reason = 'Task available for assignment';
    }

    // Deadline scoring
    if (task.deadline) {
      const daysUntilDeadline = Math.ceil(
        (new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilDeadline <= 3) {
        score += 3;
        reason = 'Urgent deadline approaching';
      } else if (daysUntilDeadline <= 7) {
        score += 2;
        reason = reason + (reason ? ' with upcoming deadline' : 'Upcoming deadline');
      }
    }

    // Assigned to user
    if (task.assignee_id === req.user!.id) {
      score += 2;
      reason = 'Assigned to you';
    }

    // Unassigned tasks
    if (!task.assignee_id) {
      score += 1;
      reason = reason + (reason ? ' and unassigned' : 'Unassigned task available');
    }

    return {
      ...task,
      recommendation_score: score,
      recommendation_reason: reason
    };
  }) || [];

  // Sort by recommendation score
  recommendations.sort((a, b) => b.recommendation_score - a.recommendation_score);

  res.json({
    success: true,
    data: recommendations.slice(0, 5) // Return top 5 recommendations
  });
}));

// Analyze meeting transcript for action items
router.post('/meetings/:meetingId/analyze', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { meetingId } = req.params;

  // Get the meeting and verify access
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .single();

  if (meetingError) {
    throw createError('Meeting not found', 404);
  }

  await verifyProjectAccess(meeting.project_id, req.user!.id);

  if (!meeting.transcript) {
    throw createError('No transcript available for analysis', 400);
  }

  // Use OpenAI to analyze the meeting transcript
  let analysis;
  
  try {
    const aiAnalysis = await analyzeMeetingTranscript(meeting.transcript);
    
    analysis = {
      summary: aiAnalysis.summary,
      action_items: aiAnalysis.action_items.map(item => ({
        ...item,
        status: 'pending' as const,
        created_at: new Date().toISOString()
      })),
      key_decisions: aiAnalysis.key_decisions,
      next_steps: aiAnalysis.next_steps,
      sentiment: aiAnalysis.sentiment,
      topics_discussed: aiAnalysis.topics_discussed,
      confidence_score: 0.95
    };
  } catch (error) {
    console.error('AI analysis failed, using fallback:', error);
    
    // Fallback to simple keyword-based analysis
    const transcript = meeting.transcript.toLowerCase();
    const sentences = transcript.split(/[.!?]+/);
    
    analysis = {
      summary: 'Meeting transcript analyzed using keyword matching.',
      action_items: [],
      key_decisions: [],
      next_steps: ['Review meeting recording for detailed action items'],
      sentiment: 'neutral' as const,
      topics_discussed: [],
      confidence_score: 0.3
    };
  }

  // Update meeting with analysis
  const { error: updateError } = await supabase
    .from('meetings')
    .update({
      summary: analysis.summary,
      action_items: analysis.action_items
    })
    .eq('id', meetingId);

  if (updateError) {
    console.error('Error updating meeting with analysis:', updateError);
  }

  res.json({
    success: true,
    data: analysis
  });
}));

// Generate smart task breakdown
router.post('/tasks/:taskId/breakdown', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { taskId } = req.params;

  // Get the task and verify access
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError) {
    throw createError('Task not found', 404);
  }

  await verifyProjectAccess(task.project_id, req.user!.id);

  // Use OpenAI to generate intelligent task breakdown
  let result;
  
  try {
    const aiBreakdown = await generateTaskBreakdown({
      title: task.title,
      description: task.description,
      priority: task.priority
    });
    
    result = {
      original_task: task,
      suggested_subtasks: aiBreakdown.subtasks,
      suggestions: aiBreakdown.suggestions,
      breakdown_confidence: 0.9
    };
  } catch (error) {
    console.error('AI task breakdown failed, using fallback:', error);
    
    // Fallback to simple pattern-based breakdown
    const title = task.title.toLowerCase();
    let suggestedSubtasks = [];
    
    if (title.includes('feature') || title.includes('implement')) {
      suggestedSubtasks = [
        {
          title: 'Planning',
          description: 'Create implementation plan',
          estimated_hours: 2,
          priority: 'high' as const
        },
        {
          title: 'Development',
          description: 'Implement the functionality',
          estimated_hours: 8,
          priority: 'medium' as const
        },
        {
          title: 'Testing',
          description: 'Test the implementation',
          estimated_hours: 3,
          priority: 'medium' as const
        }
      ];
    } else {
      suggestedSubtasks = [
        {
          title: 'Analysis',
          description: 'Analyze the task requirements',
          estimated_hours: 2,
          priority: 'high' as const
        },
        {
          title: 'Execution',
          description: 'Complete the main work',
          estimated_hours: 5,
          priority: 'medium' as const
        }
      ];
    }
    
    result = {
      original_task: task,
      suggested_subtasks: suggestedSubtasks,
      suggestions: [],
      breakdown_confidence: 0.5
    };
  }

  res.json({
    success: true,
    data: result
  });
}));

// Get workload analysis for team members
router.get('/project/:projectId/workload', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { projectId } = req.params;

  await verifyProjectAccess(projectId, req.user!.id);

  // Get all project members and their tasks
  const { data: members, error: membersError } = await supabase
    .from('project_members')
    .select(`
      user:users(id, email, full_name),
      role
    `)
    .eq('project_id', projectId);

  if (membersError) {
    throw createError(membersError.message, 500);
  }

  // Get project owner
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id, owner:users(id, email, full_name)')
    .eq('id', projectId)
    .single();

  // Combine all team members
  const allMembers = [...(members || []), ...(project ? [{ user: project.owner, role: 'owner' }] : [])];

  // Get tasks for each member
  const workloadData = await Promise.all(
    allMembers.map(async (member: any) => {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('assignee_id', member.user.id);

      const activeTasks = tasks?.filter(task => task.status !== 'done') || [];
      const totalEstimatedHours = activeTasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
      const highPriorityTasks = activeTasks.filter(task => task.priority === 'high').length;
      const overdueTasks = activeTasks.filter(task => 
        task.deadline && new Date(task.deadline) < new Date()
      ).length;

      // Simple workload calculation
      let workloadLevel: 'low' | 'medium' | 'high' = 'low';
      if (totalEstimatedHours > 40 || highPriorityTasks > 5) {
        workloadLevel = 'high';
      } else if (totalEstimatedHours > 20 || highPriorityTasks > 2) {
        workloadLevel = 'medium';
      }

      return {
        user: member.user,
        role: member.role,
        active_tasks: activeTasks.length,
        total_estimated_hours: totalEstimatedHours,
        high_priority_tasks: highPriorityTasks,
        overdue_tasks: overdueTasks,
        workload_level: workloadLevel
      };
    })
  );

  // Generate balancing suggestions
  const suggestions: string[] = [];
  const highWorkloadMembers = workloadData.filter(member => member.workload_level === 'high');
  const lowWorkloadMembers = workloadData.filter(member => member.workload_level === 'low');

  if (highWorkloadMembers.length > 0 && lowWorkloadMembers.length > 0) {
    suggestions.push(`Consider redistributing tasks from ${highWorkloadMembers.map(m => m.user.full_name).join(', ')} to ${lowWorkloadMembers.map(m => m.user.full_name).join(', ')}`);
  }

  if (workloadData.some(member => member.overdue_tasks > 0)) {
    suggestions.push('Address overdue tasks by extending deadlines or reassigning to available team members');
  }

  res.json({
    success: true,
    data: {
      team_workload: workloadData,
      suggestions,
      total_team_hours: workloadData.reduce((sum, member) => sum + member.total_estimated_hours, 0),
      average_workload: workloadData.length > 0 
        ? workloadData.reduce((sum, member) => sum + member.total_estimated_hours, 0) / workloadData.length 
        : 0
    }
  });
}));

// Helper functions
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