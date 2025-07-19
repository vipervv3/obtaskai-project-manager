import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../services/supabase';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP3, WAV, and MP4 files are allowed.'));
    }
  },
});

// Get meetings for a project
router.get('/project/:projectId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { projectId } = req.params;

  // Verify user has access to the project
  await verifyProjectAccess(projectId, req.user!.id);

  const { data: meetings, error } = await supabase
    .from('meetings')
    .select(`
      *,
      project:projects(id, name)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: meetings
  });
}));

// Get a specific meeting
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const { data: meeting, error } = await supabase
    .from('meetings')
    .select(`
      *,
      project:projects(id, name, owner_id)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError('Meeting not found', 404);
    }
    throw createError(error.message, 500);
  }

  // Verify user has access to the project
  await verifyProjectAccess(meeting.project_id, req.user!.id);

  res.json({
    success: true,
    data: meeting
  });
}));

// Create a new meeting
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { project_id, title, description, attendees = [] } = req.body;

  if (!project_id || !title) {
    throw createError('Project ID and title are required', 400);
  }

  // Verify user has access to the project
  await verifyProjectAccess(project_id, req.user!.id);

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      project_id,
      title,
      description,
      attendees
    })
    .select(`
      *,
      project:projects(id, name)
    `)
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  res.status(201).json({
    success: true,
    data: meeting
  });
}));

// Update a meeting
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { title, description, transcript, summary, attendees, action_items, duration } = req.body;

  // Get the meeting and verify access
  const { data: existingMeeting, error: meetingError } = await supabase
    .from('meetings')
    .select('project_id')
    .eq('id', id)
    .single();

  if (meetingError) {
    if (meetingError.code === 'PGRST116') {
      throw createError('Meeting not found', 404);
    }
    throw createError(meetingError.message, 500);
  }

  await verifyProjectAccess(existingMeeting.project_id, req.user!.id);

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (transcript !== undefined) updateData.transcript = transcript;
  if (summary !== undefined) updateData.summary = summary;
  if (attendees !== undefined) updateData.attendees = attendees;
  if (action_items !== undefined) updateData.action_items = action_items;
  if (duration !== undefined) updateData.duration = duration;

  const { data: meeting, error } = await supabase
    .from('meetings')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      project:projects(id, name)
    `)
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: meeting
  });
}));

// Upload meeting recording
router.post('/:id/upload', upload.single('recording'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    throw createError('No file uploaded', 400);
  }

  // Get the meeting and verify access
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('project_id, title')
    .eq('id', id)
    .single();

  if (meetingError) {
    if (meetingError.code === 'PGRST116') {
      throw createError('Meeting not found', 404);
    }
    throw createError(meetingError.message, 500);
  }

  await verifyProjectAccess(meeting.project_id, req.user!.id);

  try {
    // Upload file to Supabase Storage
    const fileName = `meetings/${id}/${Date.now()}-${file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      throw createError(`Upload failed: ${uploadError.message}`, 500);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('recordings')
      .getPublicUrl(fileName);

    // Update meeting with recording URL
    const { data: updatedMeeting, error: updateError } = await supabase
      .from('meetings')
      .update({ recording_url: urlData.publicUrl })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      throw createError(updateError.message, 500);
    }

    res.json({
      success: true,
      data: {
        meeting: updatedMeeting,
        recording_url: urlData.publicUrl
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    throw createError('Failed to upload recording', 500);
  }
}));

// Transcribe meeting (placeholder for AI integration)
router.post('/:id/transcribe', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { audio_data, text } = req.body;

  // Get the meeting and verify access
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('project_id, transcript')
    .eq('id', id)
    .single();

  if (meetingError) {
    throw createError('Meeting not found', 404);
  }

  await verifyProjectAccess(meeting.project_id, req.user!.id);

  // For now, just append the text to existing transcript
  // In a real implementation, you would integrate with speech-to-text services
  const existingTranscript = meeting.transcript || '';
  const newTranscript = existingTranscript + (existingTranscript ? '\n' : '') + text;

  const { data: updatedMeeting, error } = await supabase
    .from('meetings')
    .update({ transcript: newTranscript })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: updatedMeeting
  });
}));

// Analyze meeting for action items (placeholder for AI integration)
router.post('/:id/analyze', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  // Get the meeting and verify access
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single();

  if (meetingError) {
    throw createError('Meeting not found', 404);
  }

  await verifyProjectAccess(meeting.project_id, req.user!.id);

  if (!meeting.transcript) {
    throw createError('No transcript available for analysis', 400);
  }

  // Placeholder AI analysis - in a real implementation, you would:
  // 1. Send transcript to AI service (OpenAI, etc.)
  // 2. Extract action items, decisions, and summary
  // 3. Return structured data

  const mockAnalysis = {
    summary: 'Team discussed project milestones and upcoming deadlines.',
    action_items: [
      {
        content: 'Complete user authentication module',
        assignee: req.user!.email,
        priority: 'high',
        status: 'pending'
      },
      {
        content: 'Review and update project documentation',
        assignee: '',
        priority: 'medium',
        status: 'pending'
      }
    ],
    key_decisions: [
      'Decided to use React for frontend framework',
      'Agreed on weekly team meetings every Monday'
    ],
    next_steps: [
      'Schedule design review session',
      'Set up development environment for new team members'
    ]
  };

  // Update meeting with analysis results
  const { data: updatedMeeting, error } = await supabase
    .from('meetings')
    .update({
      summary: mockAnalysis.summary,
      action_items: mockAnalysis.action_items
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    data: {
      meeting: updatedMeeting,
      analysis: mockAnalysis
    }
  });
}));

// Delete a meeting
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  // Get the meeting and verify access
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('project_id, recording_url')
    .eq('id', id)
    .single();

  if (meetingError) {
    throw createError('Meeting not found', 404);
  }

  // Verify user is project owner
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', meeting.project_id)
    .single();

  if (project?.owner_id !== req.user!.id) {
    throw createError('Only project owner can delete meetings', 403);
  }

  // Delete recording file if it exists
  if (meeting.recording_url) {
    try {
      const fileName = meeting.recording_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('recordings')
          .remove([`meetings/${id}/${fileName}`]);
      }
    } catch (error) {
      console.error('Error deleting recording file:', error);
    }
  }

  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', id);

  if (error) {
    throw createError(error.message, 500);
  }

  res.json({
    success: true,
    message: 'Meeting deleted successfully'
  });
}));

// Helper function to verify project access
async function verifyProjectAccess(projectId: string, userId: string) {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single();

  if (projectError) {
    throw createError('Project not found', 404);
  }

  if (project.owner_id === userId) {
    return true;
  }

  const { data: membership, error: membershipError } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  if (membershipError && membershipError.code === 'PGRST116') {
    throw createError('Access denied', 403);
  }

  if (membershipError) {
    throw createError(membershipError.message, 500);
  }

  return true;
}

export default router;