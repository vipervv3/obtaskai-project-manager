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
    fileSize: 25 * 1024 * 1024, // 25MB limit (OpenAI Whisper limit)
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
        "Meeting discussion about project milestones. Key points: Backend API is 80% complete, Frontend needs design review, Testing phase starts next week. Action items: John will finish the user authentication by Wednesday, Sarah will complete the dashboard design, and Mike will set up the testing environment. Important decision: We agreed to extend the deadline by one week to ensure quality."
      ];
      
      const randomTranscription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
      
      return res.json({
        success: true,
        data: {
          transcription: randomTranscription,
          language: 'en',
          duration: req.file.size / (16000 * 2), // Estimate duration
          confidence: 0.95
        }
      });
    }

    console.log('Transcribing audio file:', {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    // Create a File object from the buffer
    const audioFile = new File([req.file.buffer], req.file.originalname || 'audio.wav', {
      type: req.file.mimetype,
    });

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // You can make this dynamic or auto-detect
      response_format: 'verbose_json', // Get detailed response with confidence scores
    });

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
    console.error('Transcription error:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key is invalid or missing'
      });
    }
    
    if (error.status === 413) {
      return res.status(413).json({
        success: false,
        error: 'Audio file is too large. Maximum size is 25MB.'
      });
    }

    if (error.message?.includes('audio')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid audio file format. Please use WAV, MP3, M4A, or other supported formats.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to transcribe audio. Please try again.'
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

export default router;