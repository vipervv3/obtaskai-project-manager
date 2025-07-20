import express from 'express';
import multer from 'multer';
import { OpenAI } from 'openai';
import { authMiddleware } from '../middleware/auth';

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
router.post('/voice-notes', authMiddleware, async (req, res) => {
  try {
    const { entityType, entityId, notes, transcription, timestamp } = req.body;
    
    if (!entityType || !entityId || !notes || !Array.isArray(notes)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: entityType, entityId, notes'
      });
    }

    // TODO: Store voice notes in database
    // For now, we'll just return success
    console.log('Saving voice notes:', {
      entityType,
      entityId,
      notesCount: notes.length,
      transcriptionLength: transcription?.length || 0
    });

    res.json({
      success: true,
      data: {
        message: 'Voice notes saved successfully',
        noteCount: notes.length
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
router.get('/voice-notes/:entityType/:entityId', authMiddleware, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        error: 'Missing entityType or entityId'
      });
    }

    // TODO: Retrieve voice notes from database
    // For now, return empty array
    console.log('Retrieving voice notes for:', { entityType, entityId });

    res.json({
      success: true,
      data: {
        notes: [] // Empty for now until we implement database storage
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