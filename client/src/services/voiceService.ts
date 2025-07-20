import apiService from './api';

export interface VoiceRecording {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: Date;
  transcription?: string;
  extractedNotes?: {
    summary: string;
    actionItems: string[];
    keyPoints: string[];
    tags: string[];
    priority: 'low' | 'medium' | 'high';
    category: 'general' | 'action' | 'idea' | 'decision' | 'issue';
  };
}

export interface VoiceNote {
  content: string;
  type: 'summary' | 'action' | 'idea' | 'decision' | 'issue';
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
  confidence: number;
}

class VoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  // Check if browser supports audio recording
  isSupported(): boolean {
    return !!(typeof navigator !== 'undefined' && 
              navigator.mediaDevices && 
              typeof navigator.mediaDevices.getUserMedia === 'function' && 
              typeof window !== 'undefined' && 
              window.MediaRecorder);
  }

  // Request microphone permission
  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately after permission check
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  // Start recording
  async startRecording(): Promise<void> {
    try {
      if (!this.isSupported()) {
        throw new Error('Audio recording not supported in this browser');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.getSupportedMimeType()
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
      console.log('Voice recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  // Stop recording and return the audio blob
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { 
          type: this.getSupportedMimeType() 
        });
        
        // Clean up
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];

        console.log('Voice recording stopped');
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error('Recording failed'));
      };

      this.mediaRecorder.stop();
    });
  }

  // Get supported MIME type for recording
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm'; // fallback
  }

  // Transcribe audio using backend service (with OpenAI/mock fallback)
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      console.log('Transcribing audio...', {
        size: audioBlob.size,
        type: audioBlob.type
      });
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      
      // Call the transcription API (will use OpenAI if available, or mock if not)
      const response = await apiService.post('/transcription/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        const { transcription, language, duration, confidence } = response.data.data;
        
        console.log('Transcription successful:', {
          transcription: transcription.substring(0, 100) + '...',
          language,
          duration,
          confidence
        });
        
        return transcription;
      } else {
        throw new Error(response.data.error || 'Transcription failed');
      }
    } catch (error: any) {
      console.error('Transcription failed:', error);
      
      // If transcription fails, try to provide a helpful error message
      if (error.response?.status === 413) {
        throw new Error('Audio file is too large. Please record a shorter message (max 25MB).');
      } else if (error.response?.status === 400) {
        throw new Error('Invalid audio format. Please try recording again.');
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('Failed to transcribe audio. Please check your internet connection and try again.');
      }
    }
  }


  // Extract intelligent notes from transcription
  extractIntelligentNotes(transcription: string): VoiceNote[] {
    const notes: VoiceNote[] = [];
    const text = transcription.toLowerCase();

    // Extract action items
    const actionKeywords = ['need to', 'should', 'must', 'will', 'assign', 'complete', 'finish', 'deliver'];
    const actionSentences = this.extractSentencesByKeywords(transcription, actionKeywords);
    
    actionSentences.forEach(sentence => {
      notes.push({
        content: sentence.trim(),
        type: 'action',
        priority: this.determinePriority(sentence),
        timestamp: new Date().toISOString(),
        confidence: 0.8
      });
    });

    // Extract decisions
    const decisionKeywords = ['decided', 'agreed', 'resolved', 'concluded', 'determined'];
    const decisionSentences = this.extractSentencesByKeywords(transcription, decisionKeywords);
    
    decisionSentences.forEach(sentence => {
      notes.push({
        content: sentence.trim(),
        type: 'decision',
        priority: this.determinePriority(sentence),
        timestamp: new Date().toISOString(),
        confidence: 0.85
      });
    });

    // Extract issues/problems
    const issueKeywords = ['problem', 'issue', 'bug', 'error', 'fail', 'stuck', 'blocker'];
    const issueSentences = this.extractSentencesByKeywords(transcription, issueKeywords);
    
    issueSentences.forEach(sentence => {
      notes.push({
        content: sentence.trim(),
        type: 'issue',
        priority: 'high',
        timestamp: new Date().toISOString(),
        confidence: 0.75
      });
    });

    // Extract ideas
    const ideaKeywords = ['idea', 'suggestion', 'propose', 'consider', 'maybe', 'could'];
    const ideaSentences = this.extractSentencesByKeywords(transcription, ideaKeywords);
    
    ideaSentences.forEach(sentence => {
      notes.push({
        content: sentence.trim(),
        type: 'idea',
        priority: 'medium',
        timestamp: new Date().toISOString(),
        confidence: 0.7
      });
    });

    // Generate summary if no specific notes found
    if (notes.length === 0) {
      const summary = this.generateSummary(transcription);
      notes.push({
        content: summary,
        type: 'summary',
        priority: 'medium',
        timestamp: new Date().toISOString(),
        confidence: 0.6
      });
    }

    return notes;
  }

  // Helper method to extract sentences containing specific keywords
  private extractSentencesByKeywords(text: string, keywords: string[]): string[] {
    const sentences = text.split(/[.!?]+/);
    return sentences.filter(sentence => 
      keywords.some(keyword => sentence.toLowerCase().includes(keyword))
    );
  }

  // Determine priority based on text content
  private determinePriority(text: string): 'low' | 'medium' | 'high' {
    const urgentWords = ['urgent', 'asap', 'immediately', 'critical', 'important'];
    const highWords = ['deadline', 'priority', 'must', 'required'];
    
    if (urgentWords.some(word => text.toLowerCase().includes(word))) return 'high';
    if (highWords.some(word => text.toLowerCase().includes(word))) return 'medium';
    return 'low';
  }

  // Generate summary from transcription
  private generateSummary(transcription: string): string {
    const words = transcription.split(' ');
    if (words.length <= 20) return transcription;
    
    // Simple extractive summary - take first and key sentences
    const sentences = transcription.split(/[.!?]+/);
    const keySentences = sentences.slice(0, Math.min(2, sentences.length));
    
    return keySentences.join('. ').trim() + '.';
  }

  // Get audio duration
  private getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.onerror = () => {
        resolve(10); // fallback duration
      };
      
      try {
        // Try URL.createObjectURL first
        const audioUrl = URL.createObjectURL(audioBlob);
        audio.src = audioUrl;
        
        // Clean up after loading
        audio.onloadedmetadata = () => {
          resolve(audio.duration);
          try {
            URL.revokeObjectURL(audioUrl);
          } catch (error) {
            console.warn('Failed to revoke object URL:', error);
          }
        };
      } catch (error) {
        console.warn('URL.createObjectURL blocked, using FileReader fallback for duration:', error);
        // Use FileReader as fallback
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            audio.src = e.target.result as string;
          } else {
            resolve(10); // fallback duration
          }
        };
        reader.onerror = () => resolve(10);
        reader.readAsDataURL(audioBlob);
      }
    });
  }

  // Save voice note to project/task
  async saveVoiceNote(
    entityType: 'project' | 'task',
    entityId: string,
    notes: VoiceNote[],
    originalTranscription: string
  ): Promise<void> {
    try {
      const payload = {
        entityType,
        entityId,
        notes,
        transcription: originalTranscription,
        timestamp: new Date().toISOString()
      };

      await apiService.post('/transcription/voice-notes', payload);
      console.log('Voice note saved successfully');
    } catch (error) {
      console.error('Failed to save voice note:', error);
      throw error;
    }
  }

  // Get voice notes for project/task
  async getVoiceNotes(entityType: 'project' | 'task', entityId: string): Promise<VoiceNote[]> {
    try {
      const response = await apiService.get(`/transcription/voice-notes/${entityType}/${entityId}`);
      console.log('Voice notes API response:', response.data);
      
      // Handle both possible response formats
      const notes = response.data.data?.notes || response.data.notes || [];
      console.log('Extracted voice notes:', notes);
      
      return notes;
    } catch (error) {
      console.error('Failed to fetch voice notes:', error);
      return [];
    }
  }
}

export const voiceService = new VoiceService();
export default voiceService;