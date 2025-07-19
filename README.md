# AI-Powered Project Manager

A comprehensive full-stack project management application with AI capabilities, real-time collaboration, and smart meeting transcription.

## Features

### Core Project Management
- ✅ Create and manage multiple projects
- ✅ Hierarchical task system (projects → tasks → subtasks)
- ✅ Three view modes: Kanban board, Calendar view, and List view
- ✅ Task dependencies and timeline tracking
- ✅ Team member management with roles

### AI-Powered Features
- 🤖 Meeting transcription using Web Speech API
- 🤖 Automatic action item extraction from meetings
- 🤖 Smart task recommendations
- 🤖 Project risk assessment
- 🤖 Workload balancing suggestions
- 🤖 Productivity insights and reporting

### Real-time Collaboration
- 🔄 Real-time task updates via Socket.io
- 💬 Comment threads on tasks with mentions
- 📁 File attachments to tasks and projects
- 📋 Activity feeds showing project updates
- 🔔 Smart notification system

### Time Tracking & Analytics
- ⏱️ Manual time entry with start/stop timers
- 📊 Weekly productivity reports
- 📈 Time estimates vs actual tracking
- 📋 Comprehensive project analytics

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Redux Toolkit** for state management
- **Socket.io-client** for real-time features
- **React Router** for navigation

### Backend
- **Node.js** with Express and TypeScript
- **Socket.io** for real-time communication
- **Supabase** client for database operations
- **Multer** for file uploads
- **JWT** for authentication

### Database
- **PostgreSQL** via Supabase
- Real-time subscriptions for live updates
- Row Level Security (RLS) for data protection

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Git

### 1. Clone and Setup
```bash
git clone <repository-url>
cd ai-project-manager

# Install root dependencies
npm install

# Install all dependencies (client + server)
npm run install:all
```

### 2. Database Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `docs/database-schema.sql` in your Supabase SQL editor
3. Enable Row Level Security (RLS) on all tables
4. Create a storage bucket named "recordings" for file uploads

### 3. Environment Configuration

Copy the example environment files and fill in your values:

```bash
# Root environment
cp .env.example .env

# Client environment
cp client/.env.local.example client/.env.local

# Server environment
cp server/.env.example server/.env
```

**Required Environment Variables:**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (server only)
- `JWT_SECRET`: A secure random string for JWT signing

### 4. Start Development Servers
```bash
# Start both client and server concurrently
npm run dev

# Or start individually:
npm run client:dev  # React app on http://localhost:3000
npm run server:dev  # Express server on http://localhost:5000
```

## Project Structure

```
ai-project-manager/
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Main application pages
│   │   ├── store/           # Redux store and slices
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API and external service calls
│   │   ├── utils/           # Helper functions
│   │   └── types/           # TypeScript type definitions
├── server/                  # Express backend
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helper functions
│   │   └── types/           # TypeScript type definitions
├── shared/                  # Shared types and utilities
└── docs/                    # Documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token

### Projects
- `GET /api/projects` - Get all user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/members` - Add team member
- `DELETE /api/projects/:id/members/:memberId` - Remove team member

### Tasks
- `GET /api/tasks/project/:projectId` - Get project tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/dependencies` - Add task dependency

### Meetings
- `GET /api/meetings/project/:projectId` - Get project meetings
- `POST /api/meetings` - Create new meeting
- `POST /api/meetings/:id/upload` - Upload meeting recording
- `POST /api/meetings/:id/transcribe` - Add transcription
- `POST /api/meetings/:id/analyze` - AI analysis of meeting

### AI Features
- `GET /api/ai/project/:projectId/insights` - Get project insights
- `GET /api/ai/recommendations/tasks` - Get task recommendations
- `POST /api/ai/meetings/:meetingId/analyze` - Analyze meeting transcript
- `GET /api/ai/project/:projectId/workload` - Team workload analysis

## Development Guide

### Building Features
1. **Database**: Add tables/columns to `docs/database-schema.sql`
2. **Types**: Update shared types in `shared/types/index.ts`
3. **Backend**: Create routes in `server/src/routes/`
4. **Frontend**: Add services, store slices, and components
5. **Real-time**: Add Socket.io events for live updates

### Code Style
- Use TypeScript for type safety
- Follow established naming conventions
- Write reusable components
- Implement proper error handling
- Add loading states for async operations

### Testing
```bash
# Run client tests
cd client && npm test

# Run server tests
cd server && npm test
```

## Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Railway)
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main branch

### Database (Supabase)
- Supabase handles hosting and scaling
- Configure RLS policies for security
- Set up database backups

## Key Features Implementation

### Real-time Collaboration
- Socket.io rooms for project-based communication
- Live task updates and status changes
- Real-time chat and comments
- User presence indicators

### AI Meeting Assistant
- Web Speech API for real-time transcription
- File upload for meeting recordings
- AI analysis for action item extraction
- Meeting summaries and insights

### Smart Task Management
- Kanban board with drag-and-drop
- Task dependencies and timeline view
- Smart recommendations based on patterns
- Workload balancing across team members

### Security
- JWT-based authentication
- Row Level Security (RLS) in database
- CORS protection
- Rate limiting
- Input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `docs/` folder
- Review the example environment files for configuration help

---

## Screenshots

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Kanban Board
![Kanban Board](docs/screenshots/kanban.png)

### Meeting Transcription
![Meeting Transcription](docs/screenshots/meetings.png)

### AI Insights
![AI Insights](docs/screenshots/ai-insights.png)

---

**Built with ❤️ using React, Node.js, TypeScript, and Supabase**