-- Migration: Create notification system tables

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    morning_digest BOOLEAN DEFAULT true,
    lunch_reminder BOOLEAN DEFAULT true,
    end_of_day_summary BOOLEAN DEFAULT true,
    meeting_reminders BOOLEAN DEFAULT true,
    task_reminders BOOLEAN DEFAULT true,
    ai_insights BOOLEAN DEFAULT true,
    urgent_only BOOLEAN DEFAULT false,
    working_hours_start TIME DEFAULT '09:00',
    working_hours_end TIME DEFAULT '18:00',
    timezone TEXT DEFAULT 'UTC',
    notification_frequency TEXT DEFAULT 'hourly' CHECK (notification_frequency IN ('realtime', 'hourly', 'daily')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Notifications table for real-time notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    data JSONB,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification history table for tracking sent emails
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    data JSONB,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity log for AI insights
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    entity_type TEXT, -- 'task', 'meeting', 'project'
    entity_id UUID,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_timestamp ON user_activity_log(timestamp);

-- Add email notification preference to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

-- RLS Policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Notification history policies
CREATE POLICY "Users can view their own notification history" ON notification_history
    FOR SELECT USING (auth.uid() = user_id);

-- Activity log policies
CREATE POLICY "Users can view their own activity log" ON user_activity_log
    FOR SELECT USING (auth.uid() = user_id);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user preferences
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log task activity
    IF TG_TABLE_NAME = 'tasks' THEN
        INSERT INTO user_activity_log (user_id, activity_type, entity_type, entity_id, details)
        VALUES (
            COALESCE(NEW.assigned_to, OLD.assigned_to),
            CASE 
                WHEN TG_OP = 'INSERT' THEN 'task_created'
                WHEN TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN 'task_status_changed'
                WHEN TG_OP = 'UPDATE' THEN 'task_updated'
                WHEN TG_OP = 'DELETE' THEN 'task_deleted'
            END,
            'task',
            COALESCE(NEW.id, OLD.id),
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'title', COALESCE(NEW.title, OLD.title)
            )
        );
    END IF;
    
    -- Log meeting activity
    IF TG_TABLE_NAME = 'meetings' THEN
        -- Note: meetings don't have assigned_to, so we'd need to track differently
        -- For now, we'll use the creator or first attendee
        INSERT INTO user_activity_log (user_id, activity_type, entity_type, entity_id, details)
        VALUES (
            COALESCE(NEW.created_by, OLD.created_by), -- Assuming meetings have created_by
            CASE 
                WHEN TG_OP = 'INSERT' THEN 'meeting_created'
                WHEN TG_OP = 'UPDATE' THEN 'meeting_updated'
                WHEN TG_OP = 'DELETE' THEN 'meeting_deleted'
            END,
            'meeting',
            COALESCE(NEW.id, OLD.id),
            jsonb_build_object(
                'title', COALESCE(NEW.title, OLD.title),
                'scheduled_date', COALESCE(NEW.scheduled_date, OLD.scheduled_date)
            )
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Activity logging triggers
CREATE TRIGGER log_task_activity
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

-- Note: Uncomment if meetings table has created_by column
-- CREATE TRIGGER log_meeting_activity
--     AFTER INSERT OR UPDATE OR DELETE ON meetings
--     FOR EACH ROW
--     EXECUTE FUNCTION log_user_activity();