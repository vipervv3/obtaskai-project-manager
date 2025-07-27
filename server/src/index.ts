import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { setupSocketHandlers } from './services/socketService';
import { initMockUser } from './utils/initMockUser';
import { dailyAssistant } from './services/dailyAssistant';

// Import routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import commentRoutes from './routes/comments';
import meetingRoutes from './routes/meetings';
import timeEntryRoutes from './routes/timeEntries';
import aiRoutes from './routes/ai';
import transcriptionRoutes from './routes/transcription';
import notificationRoutes, { setSocketIo } from './routes/notifications';
import calendarRoutes from './routes/calendar';
import userRoutes from './routes/user';

dotenv.config();

const app = express();
const server = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://obtaskai-project-manager.vercel.app', 'https://obtaskai-project-manager-git-main-vipervv3.vercel.app'] 
    : (origin, callback) => {
        // Allow any origin in development for mobile testing
        callback(null, true);
      },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Socket.io setup
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors(corsOptions));
app.use(compression());
app.use(limiter);
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.2.0' // Added version to trigger redeploy
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/comments', authMiddleware, commentRoutes);
app.use('/api/meetings', authMiddleware, meetingRoutes);
app.use('/api/time-entries', authMiddleware, timeEntryRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/transcription', transcriptionRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/calendar', authMiddleware, calendarRoutes);
app.use('/api/user', authMiddleware, userRoutes);

// Setup Socket.io handlers
setupSocketHandlers(io);

// Set socket.io instance for notifications
setSocketIo(io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Socket.io enabled`);
  console.log(`📧 Daily Assistant initialized`);
  
  // Initialize mock user for development
  await initMockUser();
  
  // Initialize daily assistant (will start cron jobs)
  console.log('Daily Assistant service is running with scheduled notifications');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export { io };