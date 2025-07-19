import { Task, Project, User, AuthUser } from '../types';
import apiService from './api';

interface AIRecommendation {
  id: string;
  type: 'priority' | 'workload' | 'deadline' | 'collaboration' | 'productivity' | 'scheduling' | 'resource' | 'timeline' | 'notification';
  title: string;
  description: string;
  confidence: number; // 0-1
  actionable: boolean;
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  estimatedImpact?: string;
  suggestedAction?: string;
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

  // 1. Smart Task Scheduling
  suggestOptimalSchedule(tasks: Task[], userWorkingHours: { start: number; end: number } = { start: 9, end: 17 }): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];
    const availableTasks = tasks.filter(t => t.status === 'todo');
    
    // Group tasks by priority and deadline urgency
    const urgentTasks = availableTasks.filter(t => {
      if (!t.deadline) return false;
      const daysUntil = Math.ceil((new Date(t.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 2;
    });

    const highPriorityTasks = availableTasks.filter(t => t.priority === 'high' || t.priority === 'urgent');
    
    // Suggest focus periods for different task types
    if (highPriorityTasks.length > 0) {
      recommendations.push({
        id: 'morning-focus-time',
        type: 'scheduling',
        title: 'Schedule High-Priority Tasks in Morning',
        description: `Focus on ${highPriorityTasks.length} high-priority tasks during 9-11 AM when energy is highest.`,
        confidence: 0.85,
        actionable: true,
        priority: 'high',
        estimatedImpact: 'Increases productivity by 30-40%',
        suggestedAction: 'Block 9-11 AM for high-priority work',
        data: { 
          tasks: highPriorityTasks.slice(0, 3),
          timeSlot: { start: 9, end: 11 },
          reason: 'peak-energy-hours'
        }
      });
    }

    if (urgentTasks.length > 0) {
      recommendations.push({
        id: 'urgent-task-scheduling',
        type: 'scheduling',
        title: 'Immediate Attention Required',
        description: `${urgentTasks.length} tasks due within 2 days need immediate scheduling. Consider rearranging today's priorities.`,
        confidence: 0.95,
        actionable: true,
        priority: 'urgent',
        estimatedImpact: 'Prevents deadline misses',
        suggestedAction: 'Schedule these tasks for today',
        data: { 
          tasks: urgentTasks,
          recommendedTime: 'immediate',
          impact: 'deadline-critical'
        }
      });
    }

    // Suggest optimal task batching
    const similarTasks = this.groupSimilarTasks(availableTasks);
    if (similarTasks.length > 1) {
      recommendations.push({
        id: 'task-batching',
        type: 'scheduling',
        title: 'Batch Similar Tasks',
        description: `Group ${similarTasks.length} similar tasks together to reduce context switching and improve efficiency.`,
        confidence: 0.8,
        actionable: true,
        priority: 'medium',
        estimatedImpact: 'Saves 25% time through focused work',
        suggestedAction: 'Schedule similar tasks in consecutive blocks',
        data: { taskGroups: similarTasks }
      });
    }

    return recommendations;
  }

  // 2. Enhanced Intelligent Project Analytics
  generateAdvancedProjectInsights(project: Project, historicalData?: any): ProjectInsights & {
    predictiveAnalytics: {
      riskFactors: Array<{ factor: string; impact: 'low' | 'medium' | 'high'; probability: number }>;
      successProbability: number;
      resourceNeeds: Array<{ resource: string; urgency: 'low' | 'medium' | 'high' }>;
    };
    performanceMetrics: {
      velocityTrend: 'increasing' | 'stable' | 'decreasing';
      qualityScore: number;
      teamSatisfaction: number;
    };
  } {
    const baseInsights = this.analyzeProject(project);
    const tasks = project.tasks || [];
    
    // Advanced risk factor analysis
    const riskFactors = [];
    
    // Scope creep risk
    if (tasks.length > 20) {
      riskFactors.push({
        factor: 'Large scope - potential for delays',
        impact: 'high' as const,
        probability: 0.7
      });
    }

    // Resource dependency risk
    const assigneeIds = new Set(tasks.map(t => t.assignee_id).filter(Boolean));
    if (assigneeIds.size < 2 && tasks.length > 5) {
      riskFactors.push({
        factor: 'Single point of failure - limited team diversity',
        impact: 'high' as const,
        probability: 0.8
      });
    }

    // Timeline compression risk
    const averageTaskDuration = 3; // days
    const totalEstimatedDays = tasks.length * averageTaskDuration;
    const projectDeadline = project.deadline ? new Date(project.deadline) : null;
    const daysUntilDeadline = projectDeadline ? 
      Math.ceil((projectDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

    if (daysUntilDeadline && daysUntilDeadline < totalEstimatedDays * 0.8) {
      riskFactors.push({
        factor: 'Aggressive timeline - insufficient buffer time',
        impact: 'medium' as const,
        probability: 0.6
      });
    }

    // Calculate success probability
    const completionRate = tasks.length > 0 ? tasks.filter(t => t.status === 'done').length / tasks.length : 0;
    const riskScore = riskFactors.reduce((sum, risk) => sum + (risk.probability * (risk.impact === 'high' ? 0.3 : risk.impact === 'medium' ? 0.2 : 0.1)), 0);
    const successProbability = Math.max(0.1, Math.min(0.95, completionRate * 0.6 + (1 - riskScore) * 0.4));

    return {
      ...baseInsights,
      predictiveAnalytics: {
        riskFactors,
        successProbability,
        resourceNeeds: [
          { resource: 'Senior Developer', urgency: riskFactors.length > 2 ? 'high' : 'medium' },
          { resource: 'Project Coordinator', urgency: tasks.length > 15 ? 'high' : 'low' },
          { resource: 'Quality Assurance', urgency: completionRate > 0.7 ? 'high' : 'medium' }
        ]
      },
      performanceMetrics: {
        velocityTrend: completionRate > 0.7 ? 'increasing' : completionRate > 0.4 ? 'stable' : 'decreasing',
        qualityScore: Math.min(95, 60 + (completionRate * 35)), // Base 60, up to 95
        teamSatisfaction: Math.min(90, 50 + (successProbability * 40)) // Correlated with project health
      }
    };
  }

  // 3. Automated Meeting Summaries (Enhanced)
  generateMeetingSummary(transcript: string, attendees: string[], duration: number): {
    executiveSummary: string;
    detailedSummary: string;
    actionItems: Array<{
      item: string;
      assignee?: string;
      dueDate?: string;
      priority: 'low' | 'medium' | 'high';
    }>;
    keyDecisions: Array<{
      decision: string;
      impact: 'low' | 'medium' | 'high';
      stakeholders: string[];
    }>;
    followUpActions: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    engagementScore: number;
    nextSteps: string[];
  } {
    // Enhanced NLP analysis (mock implementation)
    const words = transcript.toLowerCase().split(' ');
    const sentences = transcript.split(/[.!?]+/);
    
    // Action item detection
    const actionItemKeywords = ['will', 'should', 'need to', 'must', 'action item', 'follow up', 'by'];
    const potentialActionItems = sentences.filter(sentence => 
      actionItemKeywords.some(keyword => sentence.toLowerCase().includes(keyword))
    );

    const actionItems = potentialActionItems.slice(0, 5).map((item, index) => ({
      item: item.trim(),
      assignee: attendees[index % attendees.length],
      dueDate: this.extractDateFromText(item),
      priority: this.determinePriority(item) as 'low' | 'medium' | 'high'
    }));

    // Decision detection
    const decisionKeywords = ['decided', 'agreed', 'concluded', 'resolved', 'approved'];
    const potentialDecisions = sentences.filter(sentence =>
      decisionKeywords.some(keyword => sentence.toLowerCase().includes(keyword))
    );

    const keyDecisions = potentialDecisions.slice(0, 3).map(decision => ({
      decision: decision.trim(),
      impact: this.assessDecisionImpact(decision) as 'low' | 'medium' | 'high',
      stakeholders: attendees.slice(0, Math.min(3, attendees.length))
    }));

    // Engagement score based on participation
    const engagementScore = Math.min(95, Math.max(20, 
      (attendees.length * 10) + (duration > 30 ? 20 : 10) + (actionItems.length * 5)
    ));

    return {
      executiveSummary: `${duration}-minute meeting with ${attendees.length} attendees. Generated ${actionItems.length} action items and ${keyDecisions.length} key decisions.`,
      detailedSummary: `The meeting covered project progress, identified challenges, and established next steps. Team alignment was ${engagementScore > 70 ? 'strong' : 'moderate'} with clear action items assigned.`,
      actionItems,
      keyDecisions,
      followUpActions: [
        'Distribute meeting notes to all attendees',
        'Schedule follow-up for action item reviews',
        'Update project timeline based on decisions'
      ],
      sentiment: this.analyzeMeeting(transcript).sentiment,
      engagementScore,
      nextSteps: actionItems.map(item => item.item).slice(0, 3)
    };
  }

  // 4. Smart Resource Allocation
  optimizeResourceAllocation(projects: Project[], teamMembers: User[]): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];
    
    // Analyze skills and workload
    const memberWorkloads = teamMembers.map(member => {
      const assignedTasks = projects.flatMap(p => p.tasks || [])
        .filter(t => t.assignee_id === member.id && t.status !== 'done');
      
      return {
        member,
        currentTasks: assignedTasks.length,
        estimatedHours: assignedTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
        skillMatch: this.calculateSkillMatch(member, assignedTasks)
      };
    });

    // Find unbalanced workloads
    const avgWorkload = memberWorkloads.reduce((sum, m) => sum + m.estimatedHours, 0) / memberWorkloads.length;
    
    memberWorkloads.forEach(workload => {
      if (workload.estimatedHours > avgWorkload * 1.4) {
        recommendations.push({
          id: `redistribute-${workload.member.id}`,
          type: 'resource',
          title: 'Redistribute Workload',
          description: `${workload.member.full_name} is overloaded with ${workload.estimatedHours}h (${Math.round((workload.estimatedHours / avgWorkload - 1) * 100)}% above average). Recommend reassigning some tasks.`,
          confidence: 0.85,
          actionable: true,
          priority: 'high',
          estimatedImpact: 'Prevents burnout and improves delivery quality',
          suggestedAction: 'Reassign 2-3 lower priority tasks to available team members',
          data: { 
            memberId: workload.member.id,
            excessHours: workload.estimatedHours - avgWorkload,
            suggestedReassignments: workload.currentTasks
          }
        });
      } else if (workload.estimatedHours < avgWorkload * 0.6 && avgWorkload > 0) {
        recommendations.push({
          id: `utilize-${workload.member.id}`,
          type: 'resource',
          title: 'Optimize Resource Utilization',
          description: `${workload.member.full_name} has capacity for additional work (${workload.estimatedHours}h vs ${Math.round(avgWorkload)}h average). Consider assigning more tasks.`,
          confidence: 0.8,
          actionable: true,
          priority: 'medium',
          estimatedImpact: 'Improves team efficiency and project velocity',
          suggestedAction: 'Assign additional tasks matching their skills',
          data: { 
            memberId: workload.member.id,
            availableCapacity: avgWorkload - workload.estimatedHours
          }
        });
      }
    });

    // Skill matching recommendations
    const unassignedTasks = projects.flatMap(p => p.tasks || [])
      .filter(t => !t.assignee_id && t.status === 'todo');

    unassignedTasks.forEach(task => {
      const bestMatch = this.findBestAssignee(task, memberWorkloads);
      if (bestMatch) {
        recommendations.push({
          id: `assign-${task.id}`,
          type: 'resource',
          title: 'Optimal Task Assignment',
          description: `Task "${task.title}" would be best assigned to ${bestMatch.member.full_name} based on skills and current workload.`,
          confidence: 0.75,
          actionable: true,
          priority: 'medium',
          estimatedImpact: 'Improves task completion efficiency',
          suggestedAction: `Assign to ${bestMatch.member.full_name}`,
          data: { 
            taskId: task.id,
            recommendedAssignee: bestMatch.member.id,
            matchScore: bestMatch.skillMatch
          }
        });
      }
    });

    return recommendations;
  }

  // 5. Predictive Timeline Management
  generateTimelinePredictions(projects: Project[]): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    projects.forEach(project => {
      const tasks = project.tasks || [];
      const completedTasks = tasks.filter(t => t.status === 'done');
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
      const remainingTasks = tasks.filter(t => t.status === 'todo');

      // Calculate velocity (tasks completed per week)
      const projectStartEstimate = new Date(project.created_at);
      const weeksElapsed = Math.max(1, Math.ceil((new Date().getTime() - projectStartEstimate.getTime()) / (1000 * 60 * 60 * 24 * 7)));
      const velocity = completedTasks.length / weeksElapsed;

      // Predict completion date
      const estimatedWeeksRemaining = velocity > 0 ? (remainingTasks.length + inProgressTasks.length * 0.5) / velocity : remainingTasks.length * 2;
      const predictedCompletion = new Date();
      predictedCompletion.setDate(predictedCompletion.getDate() + (estimatedWeeksRemaining * 7));

      // Compare with deadline
      if (project.deadline) {
        const deadline = new Date(project.deadline);
        const daysDifference = Math.ceil((deadline.getTime() - predictedCompletion.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDifference < -7) {
          recommendations.push({
            id: `timeline-risk-${project.id}`,
            type: 'timeline',
            title: 'Project Timeline at Risk',
            description: `${project.name} is predicted to finish ${Math.abs(daysDifference)} days late. Current velocity: ${velocity.toFixed(1)} tasks/week.`,
            confidence: 0.8,
            actionable: true,
            priority: 'high',
            estimatedImpact: 'Prevents project delay and client dissatisfaction',
            suggestedAction: 'Increase team capacity or reduce scope',
            data: {
              projectId: project.id,
              predictedDelay: Math.abs(daysDifference),
              currentVelocity: velocity,
              requiredVelocity: (remainingTasks.length + inProgressTasks.length * 0.5) / (daysDifference / 7)
            }
          });
        } else if (daysDifference > 14) {
          recommendations.push({
            id: `timeline-opportunity-${project.id}`,
            type: 'timeline',
            title: 'Project Ahead of Schedule',
            description: `${project.name} is tracking ${daysDifference} days ahead of deadline. Consider adding value-add features or reallocating resources.`,
            confidence: 0.75,
            actionable: true,
            priority: 'low',
            estimatedImpact: 'Opportunity for scope expansion or early delivery',
            suggestedAction: 'Review scope for additional features or early delivery',
            data: {
              projectId: project.id,
              bufferDays: daysDifference,
              velocity: velocity
            }
          });
        }
      }

      // Bottleneck detection
      if (inProgressTasks.length > remainingTasks.length && inProgressTasks.length > 3) {
        recommendations.push({
          id: `bottleneck-${project.id}`,
          type: 'timeline',
          title: 'Workflow Bottleneck Detected',
          description: `${project.name} has ${inProgressTasks.length} tasks in progress vs ${remainingTasks.length} waiting. Focus on completion over starting new work.`,
          confidence: 0.9,
          actionable: true,
          priority: 'medium',
          estimatedImpact: 'Improves workflow efficiency and reduces cycle time',
          suggestedAction: 'Implement WIP limits and focus on task completion',
          data: {
            projectId: project.id,
            inProgressCount: inProgressTasks.length,
            todoCount: remainingTasks.length
          }
        });
      }
    });

    return recommendations;
  }

  // 6. Intelligent Notifications
  generateContextualNotifications(user: User | AuthUser, projects: Project[], recentActivity: any[]): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];
    const now = new Date();

    // Time-based notifications
    const morningHour = 9;
    const eveningHour = 17;
    const currentHour = now.getHours();

    // Daily standup reminders
    if (currentHour === morningHour) {
      const todayTasks = projects.flatMap(p => p.tasks || [])
        .filter(t => t.assignee_id === user.id && t.status !== 'done')
        .slice(0, 3);

      if (todayTasks.length > 0) {
        recommendations.push({
          id: 'daily-standup',
          type: 'notification',
          title: 'Daily Focus Areas',
          description: `Good morning! You have ${todayTasks.length} priority tasks for today. Start with the highest priority item.`,
          confidence: 0.9,
          actionable: true,
          priority: 'medium',
          estimatedImpact: 'Improves daily productivity and focus',
          suggestedAction: 'Review and prioritize today\'s tasks',
          data: { tasks: todayTasks }
        });
      }
    }

    // End-of-day wrap-up
    if (currentHour === eveningHour) {
      const completedToday = projects.flatMap(p => p.tasks || [])
        .filter(t => {
          if (t.status !== 'done' || !t.updated_at) return false;
          const updateDate = new Date(t.updated_at);
          return updateDate.toDateString() === now.toDateString();
        });

      if (completedToday.length > 0) {
        recommendations.push({
          id: 'daily-summary',
          type: 'notification',
          title: 'Daily Accomplishments',
          description: `Great work today! You completed ${completedToday.length} tasks. Plan tomorrow's priorities before you leave.`,
          confidence: 0.85,
          actionable: true,
          priority: 'low',
          estimatedImpact: 'Maintains momentum and work satisfaction',
          suggestedAction: 'Review tomorrow\'s task list',
          data: { completedTasks: completedToday }
        });
      }
    }

    // Deadline-based notifications
    projects.flatMap(p => p.tasks || [])
      .filter(t => t.assignee_id === user.id && t.deadline && t.status !== 'done')
      .forEach(task => {
        const deadline = new Date(task.deadline!);
        const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilDeadline <= 24 && hoursUntilDeadline > 0) {
          recommendations.push({
            id: `deadline-alert-${task.id}`,
            type: 'notification',
            title: 'Deadline Approaching',
            description: `"${task.title}" is due in ${Math.round(hoursUntilDeadline)} hours. Current status: ${task.status}.`,
            confidence: 0.95,
            actionable: true,
            priority: hoursUntilDeadline <= 4 ? 'urgent' : 'high',
            estimatedImpact: 'Prevents deadline miss',
            suggestedAction: hoursUntilDeadline <= 4 ? 'Complete immediately' : 'Prioritize for today',
            data: { 
              taskId: task.id,
              hoursRemaining: hoursUntilDeadline,
              urgencyLevel: hoursUntilDeadline <= 4 ? 'critical' : 'high'
            }
          });
        }
      });

    // Collaboration notifications
    const recentMentions = recentActivity.filter(activity => 
      activity.type === 'mention' && activity.userId === user.id
    );

    if (recentMentions.length > 0) {
      recommendations.push({
        id: 'collaboration-updates',
        type: 'notification',
        title: 'Team Collaboration Updates',
        description: `You have ${recentMentions.length} new mentions and updates requiring your attention.`,
        confidence: 0.8,
        actionable: true,
        priority: 'medium',
        estimatedImpact: 'Maintains team communication flow',
        suggestedAction: 'Review mentions and respond',
        data: { mentions: recentMentions }
      });
    }

    return recommendations;
  }

  // Helper methods
  private groupSimilarTasks(tasks: Task[]): Task[][] {
    // Simple grouping by keywords in title/description
    const groups: { [key: string]: Task[] } = {};
    
    tasks.forEach(task => {
      const key = task.title.toLowerCase().split(' ')[0] || 'misc';
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    return Object.values(groups).filter(group => group.length > 1);
  }

  private calculateSkillMatch(member: User, tasks: Task[]): number {
    // Mock skill matching - in production, this would use skills data
    return Math.random() * 0.4 + 0.6; // 60-100% match
  }

  private findBestAssignee(task: Task, memberWorkloads: any[]): any | null {
    // Find member with best skill match and reasonable workload
    return memberWorkloads
      .filter(m => m.estimatedHours < 40) // Not overloaded
      .sort((a, b) => b.skillMatch - a.skillMatch)[0] || null;
  }

  private extractDateFromText(text: string): string | undefined {
    // Simple date extraction - would use NLP in production
    const datePatterns = ['friday', 'monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday'];
    const found = datePatterns.find(pattern => text.toLowerCase().includes(pattern));
    
    if (found) {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 7); // Next week
      return nextDate.toISOString().split('T')[0];
    }
    
    return undefined;
  }

  private determinePriority(text: string): string {
    const urgentWords = ['urgent', 'asap', 'immediately', 'critical'];
    const highWords = ['important', 'priority', 'must'];
    
    if (urgentWords.some(word => text.toLowerCase().includes(word))) return 'high';
    if (highWords.some(word => text.toLowerCase().includes(word))) return 'medium';
    return 'low';
  }

  private assessDecisionImpact(decision: string): string {
    const highImpactWords = ['budget', 'timeline', 'scope', 'team', 'launch'];
    const mediumImpactWords = ['feature', 'design', 'process'];
    
    if (highImpactWords.some(word => decision.toLowerCase().includes(word))) return 'high';
    if (mediumImpactWords.some(word => decision.toLowerCase().includes(word))) return 'medium';
    return 'low';
  }
}

export const aiService = new AIService();
export default aiService;