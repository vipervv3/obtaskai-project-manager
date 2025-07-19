import { Task, Project, User, AuthUser } from '../types';
import apiService from './api';

interface AIRecommendation {
  id: string;
  type: 'priority' | 'workload' | 'deadline' | 'collaboration' | 'productivity';
  title: string;
  description: string;
  confidence: number; // 0-1
  actionable: boolean;
  data?: any;
}

interface ProjectInsights {
  riskLevel: 'low' | 'medium' | 'high';
  completionPrediction: {
    estimatedDate: string;
    confidence: number;
  };
  bottlenecks: string[];
  recommendations: AIRecommendation[];
  teamPerformance: {
    mostActive: string;
    needsSupport: string[];
    workloadDistribution: Record<string, number>;
  };
}

class AIService {
  // Smart task prioritization
  analyzeTasks(tasks: Task[], user: User | AuthUser): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];
    
    // High priority overdue tasks
    const overdueTasks = tasks.filter(task => 
      task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done'
    );
    
    if (overdueTasks.length > 0) {
      recommendations.push({
        id: 'overdue-tasks',
        type: 'priority',
        title: 'Overdue Tasks Need Attention',
        description: `You have ${overdueTasks.length} overdue tasks. Consider rescheduling or completing them ASAP.`,
        confidence: 0.95,
        actionable: true,
        data: { taskIds: overdueTasks.map(t => t.id) }
      });
    }

    // Too many in-progress tasks
    const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
    if (inProgressTasks.length > 3) {
      recommendations.push({
        id: 'too-many-active',
        type: 'workload',
        title: 'Focus Your Efforts',
        description: `You have ${inProgressTasks.length} tasks in progress. Consider completing some before starting new ones.`,
        confidence: 0.8,
        actionable: true,
        data: { suggestedLimit: 3 }
      });
    }

    // Upcoming deadlines
    const upcomingDeadlines = tasks.filter(task => {
      if (!task.deadline || task.status === 'done') return false;
      const deadline = new Date(task.deadline);
      const today = new Date();
      const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
      return deadline <= threeDaysFromNow && deadline >= today;
    });

    if (upcomingDeadlines.length > 0) {
      recommendations.push({
        id: 'upcoming-deadlines',
        type: 'deadline',
        title: 'Deadlines Approaching',
        description: `${upcomingDeadlines.length} tasks are due within 3 days. Plan your time accordingly.`,
        confidence: 0.9,
        actionable: true,
        data: { tasks: upcomingDeadlines.map(t => ({ id: t.id, title: t.title, deadline: t.deadline })) }
      });
    }

    // Productivity insights
    const completedTasks = tasks.filter(task => task.status === 'done');
    const completionRate = tasks.length > 0 ? completedTasks.length / tasks.length : 0;
    
    if (completionRate > 0.8) {
      recommendations.push({
        id: 'high-productivity',
        type: 'productivity',
        title: 'Excellent Productivity!',
        description: `You've completed ${Math.round(completionRate * 100)}% of your tasks. Keep up the great work!`,
        confidence: 0.85,
        actionable: false,
        data: { completionRate }
      });
    } else if (completionRate < 0.4) {
      recommendations.push({
        id: 'low-productivity',
        type: 'productivity',
        title: 'Focus on Completion',
        description: `Only ${Math.round(completionRate * 100)}% of tasks are completed. Consider breaking down large tasks or reducing scope.`,
        confidence: 0.75,
        actionable: true,
        data: { completionRate, suggestion: 'break-down-tasks' }
      });
    }

    return recommendations;
  }

  // Project health analysis
  analyzeProject(project: Project): ProjectInsights {
    const tasks = project.tasks || [];
    const completedTasks = tasks.filter(t => t.status === 'done');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const overdueTasks = tasks.filter(t => 
      t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done'
    );

    // Risk assessment
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (overdueTasks.length > 0 || inProgressTasks.length > tasks.length * 0.8) {
      riskLevel = 'high';
    } else if (inProgressTasks.length > tasks.length * 0.5) {
      riskLevel = 'medium';
    }

    // Completion prediction
    const completionRate = tasks.length > 0 ? completedTasks.length / tasks.length : 0;
    const remainingTasks = tasks.length - completedTasks.length;
    const estimatedDaysToComplete = remainingTasks * 2; // Assuming 2 days per task
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + estimatedDaysToComplete);

    // Bottlenecks
    const bottlenecks: string[] = [];
    if (overdueTasks.length > 0) bottlenecks.push('Overdue tasks blocking progress');
    if (inProgressTasks.length > 5) bottlenecks.push('Too many concurrent tasks');
    if (tasks.filter(t => t.priority === 'high' && t.status !== 'done').length > 3) {
      bottlenecks.push('Multiple high-priority tasks pending');
    }

    // Team performance (mock data for now)
    const teamPerformance = {
      mostActive: project.owner?.full_name || 'Project Owner',
      needsSupport: [] as string[],
      workloadDistribution: {
        [project.owner?.full_name || 'Owner']: completedTasks.length
      }
    };

    const recommendations: AIRecommendation[] = [];
    
    if (riskLevel === 'high') {
      recommendations.push({
        id: 'high-risk-project',
        type: 'priority',
        title: 'Project Needs Attention',
        description: 'This project has high risk factors. Consider reassigning resources or extending deadlines.',
        confidence: 0.9,
        actionable: true
      });
    }

    if (completionRate > 0.75) {
      recommendations.push({
        id: 'project-nearing-completion',
        type: 'productivity',
        title: 'Project Almost Complete',
        description: 'Great progress! Focus on finishing the remaining tasks to complete this project.',
        confidence: 0.85,
        actionable: true
      });
    }

    return {
      riskLevel,
      completionPrediction: {
        estimatedDate: estimatedDate.toISOString(),
        confidence: Math.max(0.3, Math.min(0.9, completionRate + 0.1))
      },
      bottlenecks,
      recommendations,
      teamPerformance
    };
  }

  // Smart task suggestions
  suggestNextTask(tasks: Task[]): Task | null {
    // Filter available tasks (not done, not in progress)
    const availableTasks = tasks.filter(t => t.status === 'todo');
    
    if (availableTasks.length === 0) return null;

    // Prioritize by: 1) High priority, 2) Approaching deadline, 3) No dependencies
    const scoredTasks = availableTasks.map(task => {
      let score = 0;
      
      // Priority scoring
      if (task.priority === 'high') score += 10;
      else if (task.priority === 'medium') score += 5;
      else score += 1;
      
      // Deadline scoring
      if (task.deadline) {
        const daysUntilDeadline = Math.ceil(
          (new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilDeadline <= 1) score += 15;
        else if (daysUntilDeadline <= 3) score += 10;
        else if (daysUntilDeadline <= 7) score += 5;
      }
      
      // Estimated effort scoring (prefer smaller tasks for quick wins)
      if (task.estimated_hours && task.estimated_hours <= 2) score += 3;
      
      return { task, score };
    });

    // Return highest scoring task
    scoredTasks.sort((a, b) => b.score - a.score);
    return scoredTasks[0]?.task || null;
  }

  // Workload analysis
  analyzeWorkload(tasks: Task[], teamMembers: User[]): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];
    
    // Calculate workload per person
    const workloadByUser = teamMembers.reduce((acc, user) => {
      const userTasks = tasks.filter(t => t.assignee_id === user.id && t.status !== 'done');
      const totalHours = userTasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
      acc[user.id] = { user, tasks: userTasks.length, hours: totalHours };
      return acc;
    }, {} as Record<string, { user: User; tasks: number; hours: number }>);

    // Find overloaded and underutilized team members
    const workloads = Object.values(workloadByUser);
    const avgHours = workloads.reduce((sum, w) => sum + w.hours, 0) / workloads.length;
    
    workloads.forEach(workload => {
      if (workload.hours > avgHours * 1.5) {
        recommendations.push({
          id: `overloaded-${workload.user.id}`,
          type: 'workload',
          title: 'Team Member Overloaded',
          description: `${workload.user.full_name} has ${workload.hours}h of work (${Math.round(workload.hours / avgHours * 100)}% above average). Consider redistributing tasks.`,
          confidence: 0.8,
          actionable: true,
          data: { userId: workload.user.id, hours: workload.hours }
        });
      } else if (workload.hours < avgHours * 0.5 && avgHours > 0) {
        recommendations.push({
          id: `underutilized-${workload.user.id}`,
          type: 'workload',
          title: 'Team Member Available',
          description: `${workload.user.full_name} has light workload (${workload.hours}h). They could take on additional tasks.`,
          confidence: 0.7,
          actionable: true,
          data: { userId: workload.user.id, hours: workload.hours }
        });
      }
    });

    return recommendations;
  }

  // Get AI insights from server (if available)
  async getServerAIInsights(projectId: string): Promise<any> {
    try {
      const response = await apiService.get(`/ai/project/${projectId}/insights`);
      return response.data;
    } catch (error) {
      console.error('Server AI insights not available:', error);
      return null;
    }
  }

  // Meeting analysis
  analyzeMeeting(transcript: string): {
    summary: string;
    actionItems: string[];
    keyDecisions: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    participants: string[];
  } {
    // This is a mock implementation - in production, you'd use NLP APIs
    const words = transcript.toLowerCase().split(' ');
    
    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'agree', 'yes', 'perfect', 'love'];
    const negativeWords = ['bad', 'terrible', 'no', 'disagree', 'problem', 'issue', 'concern'];
    
    const positiveScore = positiveWords.reduce((sum, word) => 
      sum + (words.filter(w => w.includes(word)).length), 0
    );
    const negativeScore = negativeWords.reduce((sum, word) => 
      sum + (words.filter(w => w.includes(word)).length), 0
    );
    
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (positiveScore > negativeScore + 2) sentiment = 'positive';
    else if (negativeScore > positiveScore + 2) sentiment = 'negative';

    return {
      summary: 'Meeting discussed project progress and next steps. Team alignment on priorities was achieved.',
      actionItems: [
        'Complete pending code review by Friday',
        'Schedule follow-up meeting with stakeholders',
        'Update project timeline based on new requirements'
      ],
      keyDecisions: [
        'Approved change in project scope',
        'Agreed on new deadline extension',
        'Decided to add two more team members'
      ],
      sentiment,
      participants: ['Team Lead', 'Developer 1', 'Developer 2', 'Project Manager']
    };
  }
}

export const aiService = new AIService();
export default aiService;