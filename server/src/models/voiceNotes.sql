-- Voice Notes Table for Supabase
-- Create this table in your Supabase SQL editor

CREATE TABLE voice_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('project', 'task')),
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Original transcription
  original_transcription TEXT NOT NULL,
  transcription_confidence DECIMAL(3,2) DEFAULT 0.95,
  transcription_language VARCHAR(10) DEFAULT 'en',
  audio_duration_seconds INTEGER,
  
  -- Extracted note details
  note_type VARCHAR(20) NOT NULL CHECK (note_type IN ('action', 'decision', 'issue', 'idea', 'summary')),
  note_content TEXT NOT NULL,
  note_priority VARCHAR(10) DEFAULT 'medium' CHECK (note_priority IN ('low', 'medium', 'high')),
  note_confidence DECIMAL(3,2) DEFAULT 0.8,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_voice_notes_entity ON voice_notes(entity_type, entity_id);
CREATE INDEX idx_voice_notes_user ON voice_notes(user_id);
CREATE INDEX idx_voice_notes_created_at ON voice_notes(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only access their own voice notes
CREATE POLICY "Users can view their own voice notes" ON voice_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice notes" ON voice_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice notes" ON voice_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice notes" ON voice_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_voice_notes_updated_at
    BEFORE UPDATE ON voice_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();