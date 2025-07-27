import express from 'express';
import multer from 'multer';
import { OpenAI } from 'openai';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const router = express.Router();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for larger recordings
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

// Initialize OpenAI client only if API key is provided
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// POST /api/transcription/transcribe
router.post('/transcribe', authMiddleware, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    if (!openai) {
      console.warn('OpenAI API key not configured, using mock transcription');
      // Fallback to mock transcription if no API key
      const mockTranscriptions = [
        "Quick note about the project progress.",
        "We need to update the project timeline and assign the frontend tasks to Sarah. The deadline is next Friday and we should prioritize the login functionality.",
        "Meeting discussion about project milestones. Key points: Backend API is 80% complete, Frontend needs design review, Testing phase starts next week. Action items: John will finish the user authentication by Wednesday, Sarah will complete the dashboard design, and Mike will set up the testing environment. Important decision: We agreed to extend the deadline by one week to ensure quality.",
        "This is a test transcription for an 18-minute meeting recording. We discussed the project roadmap, assigned action items to team members, and decided on next steps. The meeting covered important topics including budget allocation, timeline adjustments, and resource planning. Key decisions were made regarding the technology stack and deployment strategy."
      ];
      
      const randomTranscription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
      
      return res.json({
        success: true,
        data: {
          transcription: randomTranscription,
          language: 'en',
          duration: req.file.size / (16000 * 2), // Estimate duration
          confidence: 0.95,
          mode: 'mock'
        }
      });
    }

    console.log('Transcribing audio file:', {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      sizeMB: (req.file.size / (1024 * 1024)).toFixed(2) + 'MB'
    });

    // Create a File object from the buffer with correct extension
    let fileName = req.file.originalname || 'audio.wav';
    
    // Ensure proper file extension based on MIME type
    if (req.file.mimetype === 'audio/webm' && !fileName.endsWith('.webm')) {
      fileName = fileName.replace(/\.[^.]+$/, '.webm');
    } else if (req.file.mimetype === 'audio/mp4' && !fileName.endsWith('.m4a')) {
      fileName = fileName.replace(/\.[^.]+$/, '.m4a');
    } else if (req.file.mimetype === 'audio/mpeg' && !fileName.endsWith('.mp3')) {
      fileName = fileName.replace(/\.[^.]+$/, '.mp3');
    }
    
    console.log('Creating audio file for OpenAI:', {
      fileName,
      mimeType: req.file.mimetype,
      bufferSize: req.file.buffer.length
    });
    
    const audioFile = new File([req.file.buffer], fileName, {
      type: req.file.mimetype,
    });

    // Check file size and handle large files
    const maxWhisperSize = 25 * 1024 * 1024; // 25MB OpenAI limit
    let transcription;

    if (req.file.size > maxWhisperSize) {
      // For large files, inform user about chunking limitation
      return res.status(413).json({
        success: false,
        error: `Audio file is too large for transcription (${(req.file.size / (1024 * 1024)).toFixed(1)}MB). Please split recordings longer than 45 minutes into smaller segments, or use the recording backup feature to save your recording first.`
      });
    }
    
    // Log detailed file information for debugging
    console.log('Audio file validation passed:', {
      size: req.file.size,
      sizeMB: (req.file.size / (1024 * 1024)).toFixed(2),
      maxSizeMB: maxWhisperSize / (1024 * 1024),
      withinLimit: req.file.size <= maxWhisperSize
    });

    // Call OpenAI Whisper API with enhanced error handling
    console.log('Calling OpenAI Whisper API...');
    
    try {
      transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en', // You can make this dynamic or auto-detect
        response_format: 'verbose_json', // Get detailed response with confidence scores
        temperature: 0.2, // Lower temperature for more accurate transcription
      });
      
      console.log('OpenAI transcription successful');
    } catch (openaiError: any) {
      console.error('OpenAI transcription failed:', {
        status: openaiError.status,
        code: openaiError.code,
        message: openaiError.message,
        type: openaiError.type
      });
      throw openaiError;
    }

    console.log('Transcription successful:', {
      text: transcription.text.substring(0, 100) + '...',
      language: transcription.language,
      duration: transcription.duration
    });

    res.json({
      success: true,
      data: {
        transcription: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        confidence: 0.9 // Whisper doesn't return confidence, so we use a high default
      }
    });

  } catch (error: any) {
    console.error('Transcription error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      stack: error.stack?.substring(0, 500)
    });
    
    // Handle specific OpenAI errors with detailed messages
    if (error.status === 401) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key is invalid or expired. Please check your API key configuration.'
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'OpenAI API rate limit exceeded. Please try again in a few minutes.'
      });
    }
    
    if (error.status === 413 || error.message?.includes('size')) {
      const fileSizeMB = ((req.file?.size || 0) / (1024 * 1024)).toFixed(1);
      return res.status(413).json({
        success: false,
        error: `Audio file is too large (${fileSizeMB}MB). OpenAI Whisper has a 25MB limit. Please use the backup feature for large recordings.`
      });
    }
    
    if (error.message?.includes('billing') || error.message?.includes('quota')) {
      return res.status(402).json({
        success: false,
        error: 'OpenAI API billing issue. Please check your OpenAI account billing and usage limits.'
      });
    }
    
    if (error.message?.includes('format') || error.message?.includes('audio')) {
      return res.status(400).json({
        success: false,
        error: `Invalid audio format (${req.file?.mimetype || 'unknown'}). Supported formats: MP3, MP4, M4A, WAV, WEBM, FLAC.`
      });
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Network error connecting to OpenAI. Please check your internet connection.'
      });
    }

    // Generic error with more context
    const fileSizeMB = ((req.file?.size || 0) / (1024 * 1024)).toFixed(1);
    const mimeType = req.file?.mimetype || 'unknown format';
    res.status(500).json({
      success: false,
      error: `Transcription failed: ${error.message || 'Unknown error'}. File: ${fileSizeMB}MB ${mimeType}.`
    });
  }
});

// POST /api/transcription/voice-notes
router.post('/voice-notes', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { entityType, entityId, notes, transcription, timestamp } = req.body;
    const userId = req.user?.id;
    
    if (!entityType || !entityId || !notes || !Array.isArray(notes)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: entityType, entityId, notes'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    console.log('Saving voice notes to database:', {
      entityType,
      entityId,
      notesCount: notes.length,
      transcriptionLength: transcription?.length || 0,
      userId
    });

    // Save each extracted note to the database
    const voiceNoteRecords = notes.map((note: any) => ({
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      original_transcription: transcription || '',
      transcription_confidence: 0.95,
      transcription_language: 'en',
      note_type: note.type,
      note_content: note.content,
      note_priority: note.priority,
      note_confidence: note.confidence || 0.8
    }));

    const { data, error } = await supabase
      .from('voice_notes')
      .insert(voiceNoteRecords)
      .select();

    if (error) {
      console.error('Database error saving voice notes:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save voice notes to database'
      });
    }

    console.log('Voice notes saved successfully:', data?.length);

    res.json({
      success: true,
      data: {
        message: 'Voice notes saved successfully',
        noteCount: data?.length || 0,
        savedNotes: data
      }
    });

  } catch (error) {
    console.error('Save voice notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save voice notes'
    });
  }
});

// GET /api/transcription/voice-notes/:entityType/:entityId
router.get('/voice-notes/:entityType/:entityId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { entityType, entityId } = req.params;
    const userId = req.user?.id;
    
    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        error: 'Missing entityType or entityId'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    console.log('Retrieving voice notes from database:', { entityType, entityId, userId });

    // Retrieve voice notes from database
    const { data, error } = await supabase
      .from('voice_notes')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error retrieving voice notes:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve voice notes from database'
      });
    }

    // Transform database records to match frontend VoiceNote interface
    const transformedNotes = data?.map(record => ({
      content: record.note_content,
      type: record.note_type,
      priority: record.note_priority,
      timestamp: record.created_at,
      confidence: record.note_confidence || 0.8
    })) || [];

    console.log('Retrieved voice notes:', transformedNotes.length);

    res.json({
      success: true,
      data: {
        notes: transformedNotes
      }
    });

  } catch (error) {
    console.error('Get voice notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve voice notes'
    });
  }
});

// POST /api/transcription/backup-recording
router.post('/backup-recording', authMiddleware, upload.single('audio'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Create a unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `recordings/${userId}/${timestamp}-${req.file.originalname || 'recording.wav'}`;

    console.log('Backing up recording:', {
      fileName,
      size: req.file.size,
      type: req.file.mimetype,
      userId
    });

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Backup upload error:', uploadError);
      return res.status(500).json({
        success: false,
        error: `Failed to backup recording: ${uploadError.message}`
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('recordings')
      .getPublicUrl(fileName);

    console.log('Recording backed up successfully:', urlData.publicUrl);

    res.json({
      success: true,
      data: {
        backup_url: urlData.publicUrl,
        file_name: fileName,
        size: req.file.size,
        message: 'Recording backed up successfully. You can now safely attempt transcription.'
      }
    });

  } catch (error: any) {
    console.error('Backup recording error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to backup recording'
    });
  }
});

// GET /api/transcription/recordings
router.get('/recordings', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // List user's backed up recordings
    const { data: files, error } = await supabase.storage
      .from('recordings')
      .list(`recordings/${userId}`, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('List recordings error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve recordings'
      });
    }

    const recordings = files?.map(file => {
      const { data: urlData } = supabase.storage
        .from('recordings')
        .getPublicUrl(`recordings/${userId}/${file.name}`);
      
      return {
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at,
        url: urlData.publicUrl
      };
    }) || [];

    res.json({
      success: true,
      data: {
        recordings,
        total: recordings.length
      }
    });

  } catch (error: any) {
    console.error('Get recordings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recordings'
    });
  }
});

// Test endpoint to check OpenAI connectivity
router.get('/test-openai', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!openai) {
      return res.json({
        success: false,
        error: 'OpenAI not configured',
        details: 'OPENAI_API_KEY environment variable is missing'
      });
    }

    // Test with a simple API call
    console.log('Testing OpenAI connection...');
    const models = await openai.models.list();
    
    const whisperModel = models.data.find(model => model.id === 'whisper-1');
    
    res.json({
      success: true,
      data: {
        connection: 'working',
        whisper_available: !!whisperModel,
        api_key_configured: !!process.env.OPENAI_API_KEY,
        api_key_prefix: process.env.OPENAI_API_KEY?.substring(0, 20) + '...',
        total_models: models.data.length
      }
    });
  } catch (error: any) {
    console.error('OpenAI test failed:', error);
    res.json({
      success: false,
      error: 'OpenAI connection failed',
      details: {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type
      }
    });
  }
});

export default router;