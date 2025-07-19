-- AI Project Manager Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.users(id) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project members table
CREATE TABLE public.project_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assignee_id UUID REFERENCES public.users(id),
  deadline TIMESTAMP WITH TIME ZONE,
  estimated_hours INTEGER,
  actual_hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task dependencies table
CREATE TABLE public.task_dependencies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

-- Comments table
CREATE TABLE public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  content TEXT NOT NULL,
  mentions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meetings table
CREATE TABLE public.meetings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  transcript TEXT,
  summary TEXT,
  recording_url TEXT,
  duration INTEGER,
  attendees JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time entries table
CREATE TABLE public.time_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_updated', 'comment_added', 'meeting_scheduled', 'deadline_approaching')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active timers table (for start/stop timer functionality)
CREATE TABLE public.active_timers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

-- Create indexes for better performance
CREATE INDEX idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX idx_comments_task_id ON public.comments(task_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_meetings_project_id ON public.meetings(project_id);
CREATE INDEX idx_time_entries_task_id ON public.time_entries(task_id);
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_date ON public.time_entries(date);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_active_timers_user_id ON public.active_timers(user_id);
CREATE INDEX idx_active_timers_task_id ON public.active_timers(task_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_timers ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view projects they're members of" ON public.projects
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.project_members 
      WHERE project_id = projects.id
    )
  );

CREATE POLICY "Project owners can update their projects" ON public.projects
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Project owners can delete their projects" ON public.projects
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Project members policies
CREATE POLICY "Users can view project members for their projects" ON public.project_members
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE owner_id = auth.uid() OR 
      id IN (
        SELECT project_id FROM public.project_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project owners and admins can manage members" ON public.project_members
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    ) OR
    project_id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Tasks policies
CREATE POLICY "Users can view tasks in their projects" ON public.tasks
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE owner_id = auth.uid() OR 
      id IN (
        SELECT project_id FROM public.project_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project members can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE owner_id = auth.uid() OR 
      id IN (
        SELECT project_id FROM public.project_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project members can update tasks" ON public.tasks
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE owner_id = auth.uid() OR 
      id IN (
        SELECT project_id FROM public.project_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Comments policies
CREATE POLICY "Users can view comments on tasks in their projects" ON public.comments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM public.tasks 
      WHERE project_id IN (
        SELECT id FROM public.projects 
        WHERE owner_id = auth.uid() OR 
        id IN (
          SELECT project_id FROM public.project_members 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Project members can create comments" ON public.comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    task_id IN (
      SELECT id FROM public.tasks 
      WHERE project_id IN (
        SELECT id FROM public.projects 
        WHERE owner_id = auth.uid() OR 
        id IN (
          SELECT project_id FROM public.project_members 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Meetings policies
CREATE POLICY "Users can view meetings in their projects" ON public.meetings
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE owner_id = auth.uid() OR 
      id IN (
        SELECT project_id FROM public.project_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project members can create meetings" ON public.meetings
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE owner_id = auth.uid() OR 
      id IN (
        SELECT project_id FROM public.project_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Time entries policies
CREATE POLICY "Users can view their own time entries" ON public.time_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own time entries" ON public.time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries" ON public.time_entries
  FOR UPDATE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Active timers policies
CREATE POLICY "Users can view their own active timers" ON public.active_timers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own active timers" ON public.active_timers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own active timers" ON public.active_timers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own active timers" ON public.active_timers
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();