import { AxiosResponse } from 'axios';
import { Meeting, CreateMeetingDto, ApiResponse } from '../types';
import apiService from './api';

class MeetingService {
  async getProjectMeetings(projectId: string): Promise<AxiosResponse<ApiResponse<Meeting[]>>> {
    return apiService.get(`/meetings/project/${projectId}`);
  }

  async getMeeting(id: string): Promise<AxiosResponse<ApiResponse<Meeting>>> {
    return apiService.get(`/meetings/${id}`);
  }

  async createMeeting(meetingData: CreateMeetingDto): Promise<AxiosResponse<ApiResponse<Meeting>>> {
    return apiService.post('/meetings', meetingData);
  }

  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<AxiosResponse<ApiResponse<Meeting>>> {
    return apiService.put(`/meetings/${id}`, updates);
  }

  async deleteMeeting(id: string): Promise<AxiosResponse<ApiResponse>> {
    return apiService.delete(`/meetings/${id}`);
  }

  async uploadRecording(
    meetingId: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<AxiosResponse<ApiResponse<{ meeting: Meeting; recording_url: string }>>> {
    const formData = new FormData();
    formData.append('recording', file);

    return apiService.getInstance().post(`/meetings/${meetingId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  async addTranscription(meetingId: string, text: string): Promise<AxiosResponse<ApiResponse<Meeting>>> {
    return apiService.post(`/meetings/${meetingId}/transcribe`, { text });
  }

  async analyzeMeeting(meetingId: string): Promise<AxiosResponse<ApiResponse<{
    meeting: Meeting;
    analysis: any;
  }>>> {
    return apiService.post(`/meetings/${meetingId}/analyze`);
  }

  // Real-time transcription using Web Speech API
  startRealTimeTranscription(
    onResult: (text: string) => void,
    onError?: (error: any) => void
  ): SpeechRecognition | null {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onResult(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (onError) {
        onError(event.error);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
    };

    return recognition;
  }

  stopRealTimeTranscription(recognition: SpeechRecognition): void {
    if (recognition) {
      recognition.stop();
    }
  }
}

export const meetingService = new MeetingService();
export default meetingService;