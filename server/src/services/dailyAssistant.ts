import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './emailService';
import { generateAIInsights } from './openaiService';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DailyDigest {
  userId: string;
  userEmail: string;
  userName: string;
  date: string;
  summary: {
    tasksToday: number;
    meetingsToday: number;
    upcomingDeadlines: number;
    highPriorityItems: number;
  };
  todaySchedule: any[];
  aiInsights: {
    priorities: string[];
    risks: string[];
    suggestions: string[];
    focusAreas: string[];
  };
  notifications: any[];
}

export class DailyAssistantService {
  private static instance: DailyAssistantService;

  private constructor() {
    this.initializeSchedules();
  }

  static getInstance(): DailyAssistantService {
    if (!DailyAssistantService.instance) {
      DailyAssistantService.instance = new DailyAssistantService();
    }
    return DailyAssistantService.instance;
  }

  private initializeSchedules() {
    // Morning digest at 7:00 AM
    cron.schedule('0 7 * * *', () => {
      console.log('Running morning digest...');
      this.sendMorningDigest();
    });

    // Lunch reminder at 12:00 PM
    cron.schedule('0 12 * * *', () => {
      console.log('Running lunch time check...');
      this.sendLunchReminder();
    });

    // End of day summary at 5:00 PM
    cron.schedule('0 17 * * *', () => {
      console.log('Running end of day summary...');
      this.sendEndOfDaySummary();
    });

    // Hourly smart notifications (9 AM - 6 PM)
    cron.schedule('0 9-18 * * *', () => {
      console.log('Running hourly check...');
      this.checkAndSendSmartNotifications();
    });
  }

  async sendMorningDigest() {
    try {
      const users = await this.getActiveUsers();
      
      for (const user of users) {
        const digest = await this.generateDailyDigest(user.id, user.email, user.full_name);
        
        const emailContent = this.formatMorningEmail(digest);
        
        await sendEmail({
          to: user.email,
          subject: `🌅 Good Morning ${user.full_name}! Your Daily Assistant Update`,
          html: emailContent,
        });

        // Store notification record
        await this.recordNotification(user.id, 'morning_digest', digest);
      }
    } catch (error) {
      console.error('Error sending morning digest:', error);
    }
  }

  async generateDailyDigest(userId: string, userEmail: string, userName: string): Promise<DailyDigest> {
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch user's data
    const [tasks, meetings, projects] = await Promise.all([
      this.getUserTasks(userId, today),
      this.getUserMeetings(userId, today),
      this.getUserProjects(userId),
    ]);

    // Calculate summary
    const summary = {
      tasksToday: tasks.filter(t => this.isDueToday(t.deadline)).length,
      meetingsToday: meetings.filter(m => m.scheduled_date === today).length,
      upcomingDeadlines: tasks.filter(t => this.isUpcoming(t.deadline, 3)).length,
      highPriorityItems: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
    };

    // Generate today's schedule
    const todaySchedule = this.generateTodaySchedule(tasks, meetings);

    // Generate AI insights
    const aiInsights = await this.generateAIInsights({
      tasks,
      meetings,
      projects,
      userPreferences: await this.getUserPreferences(userId),
    });

    // Get pending notifications
    const notifications = await this.getPendingNotifications(userId);

    return {
      userId,
      userEmail,
      userName,
      date: today,
      summary,
      todaySchedule,
      aiInsights,
      notifications,
    };
  }

  private async generateAIInsights(data: any) {
    const prompt = `
      Based on the following user data, provide actionable insights:
      
      Tasks: ${JSON.stringify(data.tasks)}
      Meetings: ${JSON.stringify(data.meetings)}
      Projects: ${JSON.stringify(data.projects)}
      
      Generate:
      1. Top 3 priorities for today
      2. Potential risks or blockers
      3. Optimization suggestions
      4. Focus areas based on deadlines and importance
      
      Format as JSON with keys: priorities, risks, suggestions, focusAreas
    `;

    try {
      const insights = await generateAIInsights(prompt);
      return JSON.parse(insights);
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return {
        priorities: ['Review high-priority tasks', 'Attend scheduled meetings', 'Update project progress'],
        risks: ['Check for overdue tasks', 'Review conflicting schedules'],
        suggestions: ['Block focus time for deep work', 'Delegate where possible'],
        focusAreas: ['Complete urgent tasks first', 'Prepare for upcoming meetings'],
      };
    }
  }

  private formatMorningEmail(digest: DailyDigest): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .summary-card { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .metric { display: inline-block; margin: 10px 20px 10px 0; }
          .metric-value { font-size: 24px; font-weight: bold; color: #667eea; }
          .metric-label { font-size: 14px; color: #666; }
          .schedule-item { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 4px; }
          .ai-insight { background: #e3f2fd; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #2196f3; }
          .priority { color: #d32f2f; font-weight: bold; }
          .meeting { color: #1976d2; }
          .task { color: #388e3c; }
          .btn { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌅 Good Morning, ${digest.userName}!</h1>
            <p>Here's your intelligent daily briefing for ${new Date(digest.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div class="content">
            <!-- Summary Metrics -->
            <div class="summary-card">
              <h2>📊 Today's Overview</h2>
              <div>
                <div class="metric">
                  <div class="metric-value">${digest.summary.tasksToday}</div>
                  <div class="metric-label">Tasks Due</div>
                </div>
                <div class="metric">
                  <div class="metric-value">${digest.summary.meetingsToday}</div>
                  <div class="metric-label">Meetings</div>
                </div>
                <div class="metric">
                  <div class="metric-value">${digest.summary.highPriorityItems}</div>
                  <div class="metric-label">High Priority</div>
                </div>
                <div class="metric">
                  <div class="metric-value">${digest.summary.upcomingDeadlines}</div>
                  <div class="metric-label">Upcoming Deadlines</div>
                </div>
              </div>
            </div>

            <!-- AI Insights -->
            <div class="summary-card">
              <h2>🤖 AI Assistant Insights</h2>
              
              <h3>🎯 Today's Priorities</h3>
              ${digest.aiInsights.priorities.map(p => `<div class="ai-insight">• ${p}</div>`).join('')}
              
              <h3>⚠️ Potential Risks</h3>
              ${digest.aiInsights.risks.map(r => `<div class="ai-insight" style="border-left-color: #ff9800;">• ${r}</div>`).join('')}
              
              <h3>💡 Smart Suggestions</h3>
              ${digest.aiInsights.suggestions.map(s => `<div class="ai-insight" style="border-left-color: #4caf50;">• ${s}</div>`).join('')}
            </div>

            <!-- Today's Schedule -->
            <div class="summary-card">
              <h2>📅 Today's Schedule</h2>
              ${digest.todaySchedule.map(item => `
                <div class="schedule-item">
                  <strong>${item.time}</strong> - 
                  <span class="${item.type}">${item.title}</span>
                  ${item.priority ? `<span class="priority">[${item.priority.toUpperCase()}]</span>` : ''}
                  ${item.duration ? `<span style="color: #666;"> (${item.duration} min)</span>` : ''}
                </div>
              `).join('')}
            </div>

            <!-- Important Notifications -->
            ${digest.notifications.length > 0 ? `
              <div class="summary-card">
                <h2>🔔 Important Notifications</h2>
                ${digest.notifications.map(n => `
                  <div class="schedule-item" style="border-left-color: #ff5722;">
                    <strong>${n.title}</strong><br>
                    <span style="color: #666;">${n.message}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Action Buttons -->
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.APP_URL}/dashboard" class="btn">Open Dashboard</a>
              <a href="${process.env.APP_URL}/tasks" class="btn" style="background: #4caf50;">View Tasks</a>
              <a href="${process.env.APP_URL}/calendar" class="btn" style="background: #ff9800;">Check Calendar</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async checkAndSendSmartNotifications() {
    try {
      const users = await this.getActiveUsers();
      
      for (const user of users) {
        // Check for various notification triggers
        const notifications = await this.checkNotificationTriggers(user.id);
        
        if (notifications.length > 0) {
          // Send immediate notifications for urgent items
          for (const notification of notifications) {
            if (notification.priority === 'urgent') {
              await sendEmail({
                to: user.email,
                subject: `🚨 ${notification.title}`,
                html: this.formatNotificationEmail(notification, user.full_name),
              });
            }
          }
          
          // Store all notifications
          await this.storeNotifications(user.id, notifications);
        }
      }
    } catch (error) {
      console.error('Error checking smart notifications:', error);
    }
  }

  private async checkNotificationTriggers(userId: string): Promise<any[]> {
    const notifications = [];
    const now = new Date();
    
    // Check for meetings starting soon
    const upcomingMeetings = await this.getUpcomingMeetings(userId, 30); // 30 minutes
    for (const meeting of upcomingMeetings) {
      notifications.push({
        type: 'meeting_reminder',
        priority: 'high',
        title: 'Meeting Starting Soon',
        message: `"${meeting.title}" starts in 30 minutes`,
        data: meeting,
      });
    }
    
    // Check for overdue tasks
    const overdueTasks = await this.getOverdueTasks(userId);
    if (overdueTasks.length > 0) {
      notifications.push({
        type: 'overdue_tasks',
        priority: 'urgent',
        title: `${overdueTasks.length} Overdue Tasks`,
        message: 'You have tasks that need immediate attention',
        data: overdueTasks,
      });
    }
    
    // Check for tasks due today without progress
    const staleTasks = await this.getStaleTasks(userId);
    if (staleTasks.length > 0) {
      notifications.push({
        type: 'stale_tasks',
        priority: 'medium',
        title: 'Tasks Need Progress',
        message: `${staleTasks.length} tasks due today haven't been updated`,
        data: staleTasks,
      });
    }
    
    // AI-powered anomaly detection
    const anomalies = await this.detectAnomalies(userId);
    for (const anomaly of anomalies) {
      notifications.push({
        type: 'ai_anomaly',
        priority: anomaly.severity,
        title: 'AI Assistant Alert',
        message: anomaly.message,
        data: anomaly,
      });
    }
    
    return notifications;
  }

  private async detectAnomalies(userId: string): Promise<any[]> {
    const anomalies = [];
    
    // Detect schedule conflicts
    const conflicts = await this.detectScheduleConflicts(userId);
    if (conflicts.length > 0) {
      anomalies.push({
        severity: 'high',
        message: 'Schedule conflict detected - you have overlapping meetings',
        type: 'schedule_conflict',
        data: conflicts,
      });
    }
    
    // Detect workload spikes
    const workloadAnalysis = await this.analyzeWorkload(userId);
    if (workloadAnalysis.isOverloaded) {
      anomalies.push({
        severity: 'medium',
        message: `Your workload is ${workloadAnalysis.percentage}% higher than usual`,
        type: 'workload_spike',
        data: workloadAnalysis,
      });
    }
    
    // Detect project risks
    const projectRisks = await this.analyzeProjectRisks(userId);
    for (const risk of projectRisks) {
      anomalies.push({
        severity: risk.severity,
        message: risk.message,
        type: 'project_risk',
        data: risk,
      });
    }
    
    return anomalies;
  }

  async sendLunchReminder() {
    const users = await this.getActiveUsers();
    
    for (const user of users) {
      const afternoonTasks = await this.getAfternoonTasks(user.id);
      const afternoonMeetings = await this.getAfternoonMeetings(user.id);
      
      if (afternoonTasks.length > 0 || afternoonMeetings.length > 0) {
        const emailContent = this.formatLunchReminderEmail({
          userName: user.full_name,
          tasks: afternoonTasks,
          meetings: afternoonMeetings,
        });
        
        await sendEmail({
          to: user.email,
          subject: '🍽️ Lunch Break Reminder & Afternoon Preview',
          html: emailContent,
        });
      }
    }
  }

  async sendEndOfDaySummary() {
    const users = await this.getActiveUsers();
    
    for (const user of users) {
      const summary = await this.generateEndOfDaySummary(user.id);
      
      const emailContent = this.formatEndOfDayEmail({
        userName: user.full_name,
        ...summary,
      });
      
      await sendEmail({
        to: user.email,
        subject: '🌙 End of Day Summary & Tomorrow\'s Preview',
        html: emailContent,
      });
    }
  }

  // Helper methods
  private async getActiveUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email_notifications', true);
    
    return data || [];
  }

  // Get all team members for a specific project
  private async getProjectTeamMembers(projectId: string) {
    try {
      // Get project with team members
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          team_members,
          owner:users!projects_owner_id_fkey(id, email, full_name),
          members:project_members(
            user:users(id, email, full_name, email_notifications)
          )
        `)
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        console.error('Error fetching project team:', projectError);
        return [];
      }

      const teamMembers = [];

      // Add project owner
      if (project.owner && project.owner.email) {
        teamMembers.push({
          id: project.owner.id,
          email: project.owner.email,
          full_name: project.owner.full_name,
          role: 'owner'
        });
      }

      // Add team members
      if (project.members) {
        project.members.forEach((member: any) => {
          if (member.user && member.user.email && member.user.email_notifications) {
            teamMembers.push({
              id: member.user.id,
              email: member.user.email,
              full_name: member.user.full_name,
              role: 'member'
            });
          }
        });
      }

      return teamMembers;
    } catch (error) {
      console.error('Error getting project team members:', error);
      return [];
    }
  }

  // Send project-specific notifications to entire team
  async sendProjectTeamNotification(projectId: string, notificationType: string, data: any) {
    try {
      const teamMembers = await this.getProjectTeamMembers(projectId);
      
      if (teamMembers.length === 0) {
        console.log(`No team members found for project ${projectId}`);
        return;
      }

      console.log(`Sending ${notificationType} notification to ${teamMembers.length} team members for project ${projectId}`);

      for (const member of teamMembers) {
        const emailContent = await this.formatProjectNotificationEmail(member, notificationType, data);
        
        await sendEmail({
          to: member.email,
          subject: this.getProjectNotificationSubject(notificationType, data),
          html: emailContent,
        });

        // Record notification
        await this.recordNotification(member.id, notificationType, {
          projectId,
          memberRole: member.role,
          ...data
        });
      }
    } catch (error) {
      console.error('Error sending project team notification:', error);
    }
  }

  // Send notifications for project milestones, deadlines, updates
  async sendProjectMilestoneNotification(projectId: string, milestone: any) {
    const data = {
      projectId,
      milestone,
      type: 'milestone_reached'
    };
    await this.sendProjectTeamNotification(projectId, 'project_milestone', data);
  }

  async sendProjectDeadlineNotification(projectId: string, deadline: any) {
    const data = {
      projectId,
      deadline,
      type: 'deadline_approaching'
    };
    await this.sendProjectTeamNotification(projectId, 'project_deadline', data);
  }

  async sendProjectUpdateNotification(projectId: string, update: any) {
    const data = {
      projectId,
      update,
      type: 'project_update'
    };
    await this.sendProjectTeamNotification(projectId, 'project_update', data);
  }

  async sendTaskAssignmentNotification(projectId: string, task: any, assignedTo: string) {
    try {
      // Get the assigned user
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', assignedTo)
        .single();

      if (error || !user || !user.email_notifications) {
        return;
      }

      const emailContent = await this.formatTaskAssignmentEmail(user, task, projectId);
      
      await sendEmail({
        to: user.email,
        subject: `📋 New Task Assigned: ${task.title}`,
        html: emailContent,
      });

      // Also notify project owner if different from assignee
      const { data: project } = await supabase
        .from('projects')
        .select('owner_id, users!projects_owner_id_fkey(email, full_name, email_notifications)')
        .eq('id', projectId)
        .single();

      if (project && project.owner_id !== assignedTo && project.users && (project.users as any).email_notifications) {
        const owner = project.users as any;
        const ownerEmailContent = await this.formatTaskAssignmentNotificationEmail(owner, task, user);
        
        await sendEmail({
          to: owner.email,
          subject: `📋 Task Assigned in Your Project: ${task.title}`,
          html: ownerEmailContent,
        });
      }
    } catch (error) {
      console.error('Error sending task assignment notification:', error);
    }
  }

  // Email formatting methods for project notifications
  private async formatProjectNotificationEmail(member: any, notificationType: string, data: any): Promise<string> {
    const { projectId } = data;
    
    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('name, description')
      .eq('id', projectId)
      .single();

    const projectName = project?.name || 'Project';

    switch (notificationType) {
      case 'project_milestone':
        return this.formatMilestoneEmail(member, projectName, data.milestone);
      case 'project_deadline':
        return this.formatDeadlineEmail(member, projectName, data.deadline);
      case 'project_update':
        return this.formatProjectUpdateEmail(member, projectName, data.update);
      default:
        return this.formatGenericProjectEmail(member, projectName, data);
    }
  }

  private getProjectNotificationSubject(notificationType: string, data: any): string {
    switch (notificationType) {
      case 'project_milestone':
        return `🎯 Project Milestone Reached: ${data.milestone.title}`;
      case 'project_deadline':
        return `⏰ Project Deadline Approaching: ${data.deadline.title}`;
      case 'project_update':
        return `📢 Project Update: ${data.update.title}`;
      default:
        return `📋 Project Notification`;
    }
  }

  private formatMilestoneEmail(member: any, projectName: string, milestone: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎯 Milestone Achieved!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Great progress on ${projectName}</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Hello ${member.full_name}! 👋</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">✅ Milestone: ${milestone.title}</h3>
            <p style="color: #6c757d; margin: 10px 0;">${milestone.description || 'Another step forward in our project journey!'}</p>
            <p style="color: #28a745; font-weight: bold; margin: 0;">Status: Completed 🎉</p>
          </div>

          <div style="background: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0;">
            <h4 style="color: #0056b3; margin-top: 0;">Team Impact</h4>
            <p style="color: #0056b3; margin: 0;">This milestone brings us closer to our project goals. Great work, team!</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/projects/${milestone.projectId}" 
               style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              View Project Details
            </a>
          </div>

          <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
            You're receiving this as a member of the <strong>${projectName}</strong> project team.
          </p>
        </div>
      </div>
    `;
  }

  private formatDeadlineEmail(member: any, projectName: string, deadline: any): string {
    const daysUntil = Math.ceil((new Date(deadline.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">⏰ Deadline Alert</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${projectName}</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Hello ${member.full_name}! 👋</h2>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">📅 ${deadline.title}</h3>
            <p style="color: #856404; margin: 10px 0;">${deadline.description || 'Important project deadline approaching.'}</p>
            <p style="color: #dc3545; font-weight: bold; margin: 0;">
              ⚠️ Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} - ${new Date(deadline.date).toLocaleDateString()}
            </p>
          </div>

          <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
            <h4 style="color: #721c24; margin-top: 0;">Action Required</h4>
            <p style="color: #721c24; margin: 0;">Please review your tasks and ensure everything is on track for the deadline.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/projects/${deadline.projectId}" 
               style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              View Project & Tasks
            </a>
          </div>

          <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
            You're receiving this as a member of the <strong>${projectName}</strong> project team.
          </p>
        </div>
      </div>
    `;
  }

  private formatProjectUpdateEmail(member: any, projectName: string, update: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📢 Project Update</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${projectName}</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Hello ${member.full_name}! 👋</h2>
          
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1565c0; margin-top: 0;">📝 ${update.title}</h3>
            <p style="color: #1976d2; margin: 10px 0; line-height: 1.6;">${update.description || update.message}</p>
            <p style="color: #0d47a1; font-size: 12px; margin: 0;">
              Updated by: ${update.updatedBy || 'Project Team'} • ${new Date(update.date || Date.now()).toLocaleDateString()}
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/projects/${update.projectId}" 
               style="background: #0984e3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              View Full Update
            </a>
          </div>

          <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
            You're receiving this as a member of the <strong>${projectName}</strong> project team.
          </p>
        </div>
      </div>
    `;
  }

  private formatTaskAssignmentEmail(user: any, task: any, projectId: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📋 New Task Assigned</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">You have a new task to work on</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Hello ${user.full_name}! 👋</h2>
          
          <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin-top: 0;">📋 ${task.title}</h3>
            <p style="color: #0c5460; margin: 10px 0; line-height: 1.6;">${task.description || 'New task assigned to you.'}</p>
            <div style="display: flex; gap: 20px; margin-top: 15px;">
              <span style="color: #0c5460; font-size: 14px;">
                Priority: <strong>${task.priority || 'Medium'}</strong>
              </span>
              ${task.due_date ? `<span style="color: #0c5460; font-size: 14px;">Due: <strong>${new Date(task.due_date).toLocaleDateString()}</strong></span>` : ''}
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/tasks/${task.id}" 
               style="background: #00b894; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              View Task Details
            </a>
          </div>

          <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
            Ready to get started? Click the button above to view the full task details and begin working.
          </p>
        </div>
      </div>
    `;
  }

  private formatTaskAssignmentNotificationEmail(owner: any, task: any, assignee: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📋 Task Assigned</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">A task has been assigned in your project</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Hello ${owner.full_name}! 👋</h2>
          
          <p style="color: #666; margin: 15px 0;">A new task has been assigned to <strong>${assignee.full_name}</strong> in your project.</p>
          
          <div style="background: #f8f9fa; border-left: 4px solid #6c5ce7; padding: 20px; margin: 20px 0;">
            <h3 style="color: #5a5a5a; margin-top: 0;">📋 ${task.title}</h3>
            <p style="color: #666; margin: 10px 0;">Assigned to: <strong>${assignee.full_name}</strong></p>
            <p style="color: #666; margin: 10px 0;">Priority: <strong>${task.priority || 'Medium'}</strong></p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/tasks/${task.id}" 
               style="background: #6c5ce7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              View Task Details
            </a>
          </div>
        </div>
      </div>
    `;
  }

  private formatGenericProjectEmail(member: any, projectName: string, data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📋 Project Notification</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${projectName}</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Hello ${member.full_name}! 👋</h2>
          <p style="color: #666;">You have a new notification regarding the <strong>${projectName}</strong> project.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/projects/${data.projectId}" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              View Project
            </a>
          </div>
        </div>
      </div>
    `;
  }

  private async getUserTasks(userId: string, date?: string) {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', userId)
      .neq('status', 'done');
    
    if (date) {
      query = query.eq('deadline', date);
    }
    
    const { data } = await query;
    return data || [];
  }

  private async getUserMeetings(userId: string, date?: string) {
    let query = supabase
      .from('meetings')
      .select('*, project:projects(*)')
      .eq('attendees', userId);
    
    if (date) {
      query = query.eq('scheduled_date', date);
    }
    
    const { data } = await query;
    return data || [];
  }

  private async getUserProjects(userId: string) {
    const { data } = await supabase
      .from('projects')
      .select('*, tasks(*)')
      .or(`owner_id.eq.${userId},team_members.cs.{${userId}}`);
    
    return data || [];
  }

  private async getUserPreferences(userId: string) {
    const { data } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    return data || {
      working_hours_start: '09:00',
      working_hours_end: '18:00',
      timezone: 'UTC',
      notification_frequency: 'normal',
    };
  }

  private generateTodaySchedule(tasks: any[], meetings: any[]) {
    const schedule = [];
    
    // Add meetings with times
    meetings.forEach(meeting => {
      if (meeting.scheduled_time) {
        schedule.push({
          time: meeting.scheduled_time,
          title: meeting.title,
          type: 'meeting',
          duration: meeting.duration_minutes,
          priority: 'high',
        });
      }
    });
    
    // Add high-priority tasks
    tasks
      .filter(t => t.priority === 'urgent' || t.priority === 'high')
      .forEach(task => {
        schedule.push({
          time: 'Flexible',
          title: task.title,
          type: 'task',
          priority: task.priority,
        });
      });
    
    // Sort by time
    return schedule.sort((a, b) => {
      if (a.time === 'Flexible') return 1;
      if (b.time === 'Flexible') return -1;
      return a.time.localeCompare(b.time);
    });
  }

  private isDueToday(deadline: string): boolean {
    if (!deadline) return false;
    return deadline === new Date().toISOString().split('T')[0];
  }

  private isUpcoming(deadline: string, days: number): boolean {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= days;
  }

  private async recordNotification(userId: string, type: string, data: any) {
    await supabase.from('notification_history').insert({
      user_id: userId,
      type,
      data,
      sent_at: new Date().toISOString(),
    });
  }

  private async getPendingNotifications(userId: string) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(5);
    
    return data || [];
  }

  private formatNotificationEmail(notification: any, userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 500px; margin: 0 auto; padding: 20px; }
          .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; }
          .urgent { background: #f8d7da; border-color: #f5c6cb; }
          .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="alert ${notification.priority === 'urgent' ? 'urgent' : ''}">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <a href="${process.env.APP_URL}" class="btn">Take Action</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Additional helper methods for other features...
  private async getUpcomingMeetings(userId: string, minutes: number) {
    const now = new Date();
    const later = new Date(now.getTime() + minutes * 60000);
    
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('attendees', userId)
      .gte('scheduled_datetime', now.toISOString())
      .lte('scheduled_datetime', later.toISOString());
    
    return data || [];
  }

  private async getOverdueTasks(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', userId)
      .lt('deadline', today)
      .neq('status', 'done');
    
    return data || [];
  }

  private async getStaleTasks(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', userId)
      .eq('deadline', today)
      .eq('status', 'todo');
    
    return data || [];
  }

  private formatLunchReminderEmail(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 500px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; border-radius: 8px; text-align: center; }
          .content { background: #f8f9fa; padding: 20px; margin-top: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🍽️ Time for a Break, ${data.userName}!</h2>
            <p>Remember to take care of yourself</p>
          </div>
          <div class="content">
            <h3>Your Afternoon Ahead:</h3>
            <p><strong>${data.meetings.length}</strong> meetings scheduled</p>
            <p><strong>${data.tasks.length}</strong> tasks to complete</p>
            <p style="margin-top: 20px; font-style: italic;">
              💡 Tip: Use this break to recharge. You'll be more productive this afternoon!
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private async generateEndOfDaySummary(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    const [completedToday, tomorrowTasks, tomorrowMeetings] = await Promise.all([
      this.getCompletedTasks(userId, today),
      this.getUserTasks(userId, tomorrow),
      this.getUserMeetings(userId, tomorrow),
    ]);
    
    return {
      completedToday,
      tomorrowTasks,
      tomorrowMeetings,
      productivity: this.calculateProductivity(completedToday),
    };
  }

  private async getCompletedTasks(userId: string, date: string) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', userId)
      .eq('status', 'done')
      .gte('updated_at', `${date}T00:00:00`)
      .lte('updated_at', `${date}T23:59:59`);
    
    return data || [];
  }

  private calculateProductivity(completedTasks: any[]) {
    const score = completedTasks.length * 10;
    const highPriorityCompleted = completedTasks.filter(t => 
      t.priority === 'high' || t.priority === 'urgent'
    ).length;
    
    return {
      score: Math.min(100, score + highPriorityCompleted * 5),
      tasksCompleted: completedTasks.length,
      highPriorityCompleted,
    };
  }

  private formatEndOfDayEmail(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%); color: white; padding: 30px; border-radius: 10px; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { text-align: center; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .tomorrow { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🌙 Great Work Today, ${data.userName}!</h2>
            <p>Here's your daily summary and tomorrow's preview</p>
          </div>
          
          <div class="stats">
            <div class="stat">
              <h3>${data.completedToday.length}</h3>
              <p>Tasks Completed</p>
            </div>
            <div class="stat">
              <h3>${data.productivity.score}%</h3>
              <p>Productivity Score</p>
            </div>
            <div class="stat">
              <h3>${data.productivity.highPriorityCompleted}</h3>
              <p>High Priority Done</p>
            </div>
          </div>
          
          <div class="tomorrow">
            <h3>📅 Tomorrow's Schedule</h3>
            <p><strong>${data.tomorrowMeetings.length}</strong> meetings planned</p>
            <p><strong>${data.tomorrowTasks.length}</strong> tasks due</p>
            ${data.tomorrowTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length > 0 ? 
              `<p style="color: #d32f2f;">⚠️ ${data.tomorrowTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length} high priority items need attention</p>` : 
              ''
            }
          </div>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="${process.env.APP_URL}/dashboard" style="display: inline-block; padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 5px;">
              Plan Tomorrow
            </a>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private async detectScheduleConflicts(userId: string) {
    // Implementation for detecting overlapping meetings
    return [];
  }

  private async analyzeWorkload(userId: string) {
    // Implementation for workload analysis
    return { isOverloaded: false, percentage: 0 };
  }

  private async analyzeProjectRisks(userId: string) {
    // Implementation for project risk analysis
    return [];
  }

  private async getAfternoonTasks(userId: string) {
    // Implementation for getting afternoon tasks
    return [];
  }

  private async getAfternoonMeetings(userId: string) {
    // Implementation for getting afternoon meetings
    return [];
  }

  private async storeNotifications(userId: string, notifications: any[]) {
    // Store notifications in database
    for (const notification of notifications) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        data: notification.data,
        read: false,
        created_at: new Date().toISOString(),
      });
    }
  }
}

// Initialize the service
export const dailyAssistant = DailyAssistantService.getInstance();