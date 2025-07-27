-- Migration: Add meeting scheduling fields to meetings table
-- Run this SQL in your Supabase SQL editor to update the existing meetings table

-- Add new scheduling columns to meetings table
ALTER TABLE public.meetings 
ADD COLUMN scheduled_date DATE,
ADD COLUMN scheduled_time TIME,
ADD COLUMN duration_minutes INTEGER DEFAULT 30,
ADD COLUMN timezone TEXT DEFAULT 'UTC',
ADD COLUMN location TEXT,
ADD COLUMN meeting_type TEXT DEFAULT 'video_call',
ADD COLUMN status TEXT DEFAULT 'scheduled',
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add check constraints
ALTER TABLE public.meetings 
ADD CONSTRAINT meetings_meeting_type_check 
CHECK (meeting_type IN ('in_person', 'video_call', 'phone_call'));

ALTER TABLE public.meetings 
ADD CONSTRAINT meetings_status_check 
CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));

-- For existing meetings, set default values
UPDATE public.meetings 
SET 
  scheduled_date = created_at::date,
  scheduled_time = created_at::time,
  duration_minutes = COALESCE(duration, 30),
  timezone = 'UTC',
  meeting_type = 'video_call',
  status = 'completed',  -- Existing meetings are likely completed
  updated_at = NOW()
WHERE scheduled_date IS NULL;

-- Make required fields NOT NULL after setting defaults
ALTER TABLE public.meetings 
ALTER COLUMN scheduled_date SET NOT NULL,
ALTER COLUMN scheduled_time SET NOT NULL,
ALTER COLUMN duration_minutes SET NOT NULL,
ALTER COLUMN timezone SET NOT NULL;

-- Add indexes for better query performance
CREATE INDEX idx_meetings_scheduled_date ON public.meetings(scheduled_date);
CREATE INDEX idx_meetings_status ON public.meetings(status);
CREATE INDEX idx_meetings_project_scheduled ON public.meetings(project_id, scheduled_date);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meetings_updated_at 
BEFORE UPDATE ON public.meetings 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Update RLS policies if needed (keeping existing policies intact)
-- The existing RLS policies should continue to work with the new columns