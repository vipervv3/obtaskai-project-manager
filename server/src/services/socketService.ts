import { Server, Socket } from 'socket.io';
import { supabase } from './supabase';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Handle mock token for development
      if (token === 'mock-token' && process.env.NODE_ENV === 'development') {
        // Find the test user by email
        const { data: testUser, error: userError } = await supabase
          .from('users')
          .select('id, email, full_name')
          .eq('email', 'test@example.com')
          .single();

        if (userError || !testUser) {
          return next(new Error('Authentication error: Mock user not found'));
        }

        socket.userId = testUser.id;
        socket.userEmail = testUser.email;
        return next();
      }

      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return next(new Error('Authentication error: Invalid token'));
      }

      socket.userId = user.id;
      socket.userEmail = user.email || '';
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userEmail} connected`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);
    
    // Handle joining user rooms for notifications
    socket.on('join_user_room', (userId: string) => {
      if (socket.userId === userId) {
        socket.join(`user:${userId}`);
        socket.emit('joined_user_room', { userId });
      }
    });

    // Handle joining project rooms
    socket.on('join_project', async (projectId: string) => {
      try {
        // Verify user has access to the project
        const { data: membership, error } = await supabase
          .from('project_members')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', socket.userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Project membership check error:', error);
          return;
        }

        // Also check if user is the project owner
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('owner_id')
          .eq('id', projectId)
          .single();

        if (membership || (project && project.owner_id === socket.userId)) {
          socket.join(`project:${projectId}`);
          socket.emit('joined_project', { projectId });
          
          // Notify other users in the project
          socket.to(`project:${projectId}`).emit('user_joined_project', {
            userId: socket.userId,
            userEmail: socket.userEmail,
            projectId
          });
        } else {
          socket.emit('error', { message: 'Access denied to project' });
        }
      } catch (error) {
        console.error('Join project error:', error);
        socket.emit('error', { message: 'Failed to join project' });
      }
    });

    // Handle leaving project rooms
    socket.on('leave_project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
      socket.to(`project:${projectId}`).emit('user_left_project', {
        userId: socket.userId,
        userEmail: socket.userEmail,
        projectId
      });
    });

    // Handle task updates
    socket.on('task_updated', async (data: { taskId: string; projectId: string; changes: any }) => {
      try {
        // Verify user has access to the task's project
        const { data: membership } = await supabase
          .from('project_members')
          .select('*')
          .eq('project_id', data.projectId)
          .eq('user_id', socket.userId)
          .single();

        const { data: project } = await supabase
          .from('projects')
          .select('owner_id')
          .eq('id', data.projectId)
          .single();

        if (membership || (project && project.owner_id === socket.userId)) {
          // Broadcast task update to all users in the project
          io.to(`project:${data.projectId}`).emit('task_updated', {
            taskId: data.taskId,
            changes: data.changes,
            updatedBy: socket.userId
          });
        }
      } catch (error) {
        console.error('Task update broadcast error:', error);
      }
    });

    // Handle real-time comments
    socket.on('comment_added', async (data: { taskId: string; projectId: string; comment: any }) => {
      try {
        // Verify access
        const { data: membership } = await supabase
          .from('project_members')
          .select('*')
          .eq('project_id', data.projectId)
          .eq('user_id', socket.userId)
          .single();

        const { data: project } = await supabase
          .from('projects')
          .select('owner_id')
          .eq('id', data.projectId)
          .single();

        if (membership || (project && project.owner_id === socket.userId)) {
          // Broadcast comment to all users in the project
          io.to(`project:${data.projectId}`).emit('comment_added', data.comment);
        }
      } catch (error) {
        console.error('Comment broadcast error:', error);
      }
    });

    // Handle meeting transcription updates
    socket.on('meeting_transcription', async (data: { meetingId: string; projectId: string; text: string }) => {
      try {
        // Verify access
        const { data: membership } = await supabase
          .from('project_members')
          .select('*')
          .eq('project_id', data.projectId)
          .eq('user_id', socket.userId)
          .single();

        const { data: project } = await supabase
          .from('projects')
          .select('owner_id')
          .eq('id', data.projectId)
          .single();

        if (membership || (project && project.owner_id === socket.userId)) {
          // Broadcast transcription to all users in the project
          io.to(`project:${data.projectId}`).emit('meeting_transcription', {
            meetingId: data.meetingId,
            text: data.text
          });
        }
      } catch (error) {
        console.error('Meeting transcription broadcast error:', error);
      }
    });

    // Handle typing indicators
    socket.on('user_typing', (data: { taskId: string }) => {
      // Get the task to find its project
      supabase
        .from('tasks')
        .select('project_id')
        .eq('id', data.taskId)
        .single()
        .then(({ data: task }) => {
          if (task) {
            socket.to(`project:${task.project_id}`).emit('user_typing', {
              taskId: data.taskId,
              userId: socket.userId,
              userName: socket.userEmail?.split('@')[0] || 'Unknown User'
            });
          }
        });
    });

    socket.on('user_viewing', (data: { entityId: string; entityType: 'task' | 'project' }) => {
      if (data.entityType === 'task') {
        // Get the task to find its project
        supabase
          .from('tasks')
          .select('project_id')
          .eq('id', data.entityId)
          .single()
          .then(({ data: task }) => {
            if (task) {
              socket.to(`project:${task.project_id}`).emit('user_viewing', {
                userId: socket.userId,
                entityId: data.entityId,
                entityType: data.entityType,
                userName: socket.userEmail?.split('@')[0] || 'Unknown User'
              });
            }
          });
      } else if (data.entityType === 'project') {
        socket.to(`project:${data.entityId}`).emit('user_viewing', {
          userId: socket.userId,
          entityId: data.entityId,
          entityType: data.entityType,
          userName: socket.userEmail?.split('@')[0] || 'Unknown User'
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.userEmail} disconnected`);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Utility function to send notifications to specific users
  const sendNotificationToUser = (userId: string, notification: any) => {
    io.to(`user:${userId}`).emit('notification', notification);
  };

  // Utility function to broadcast to all users in a project
  const broadcastToProject = (projectId: string, event: string, data: any) => {
    io.to(`project:${projectId}`).emit(event, data);
  };

  return {
    sendNotificationToUser,
    broadcastToProject
  };
};