import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Meeting, CreateMeetingDto } from '../../types';
import { meetingService } from '../../services/meetingService';

interface MeetingsState {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  loading: boolean;
  error: string | null;
  creating: boolean;
  uploading: boolean;
  transcribing: boolean;
  analyzing: boolean;
}

const initialState: MeetingsState = {
  meetings: [],
  currentMeeting: null,
  loading: false,
  error: null,
  creating: false,
  uploading: false,
  transcribing: false,
  analyzing: false,
};

// Async thunks
export const fetchProjectMeetings = createAsyncThunk(
  'meetings/fetchProjectMeetings',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await meetingService.getProjectMeetings(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch meetings');
    }
  }
);

export const fetchMeeting = createAsyncThunk(
  'meetings/fetchMeeting',
  async (meetingId: string, { rejectWithValue }) => {
    try {
      const response = await meetingService.getMeeting(meetingId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch meeting');
    }
  }
);

export const createMeeting = createAsyncThunk(
  'meetings/createMeeting',
  async (meetingData: CreateMeetingDto, { rejectWithValue }) => {
    try {
      const response = await meetingService.createMeeting(meetingData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create meeting');
    }
  }
);

export const uploadRecording = createAsyncThunk(
  'meetings/uploadRecording',
  async ({ meetingId, file, onProgress }: { meetingId: string; file: File; onProgress?: (progress: number) => void }, { rejectWithValue }) => {
    try {
      const response = await meetingService.uploadRecording(meetingId, file, onProgress);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to upload recording');
    }
  }
);

export const addTranscription = createAsyncThunk(
  'meetings/addTranscription',
  async ({ meetingId, text }: { meetingId: string; text: string }, { rejectWithValue }) => {
    try {
      const response = await meetingService.addTranscription(meetingId, text);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add transcription');
    }
  }
);

export const analyzeMeeting = createAsyncThunk(
  'meetings/analyzeMeeting',
  async (meetingId: string, { rejectWithValue }) => {
    try {
      const response = await meetingService.analyzeMeeting(meetingId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to analyze meeting');
    }
  }
);

export const updateMeeting = createAsyncThunk(
  'meetings/updateMeeting',
  async ({ id, updates }: { id: string; updates: Partial<Meeting> }, { rejectWithValue }) => {
    try {
      const response = await meetingService.updateMeeting(id, updates);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update meeting');
    }
  }
);

const meetingsSlice = createSlice({
  name: 'meetings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentMeeting: (state, action: PayloadAction<Meeting | null>) => {
      state.currentMeeting = action.payload;
    },
    updateMeetingInList: (state, action: PayloadAction<Meeting>) => {
      const index = state.meetings.findIndex(m => m.id === action.payload.id);
      if (index !== -1) {
        state.meetings[index] = action.payload;
      }
    },
    addMeetingToList: (state, action: PayloadAction<Meeting>) => {
      state.meetings.unshift(action.payload);
    },
    appendTranscription: (state, action: PayloadAction<{ meetingId: string; text: string }>) => {
      const { meetingId, text } = action.payload;
      
      if (state.currentMeeting && state.currentMeeting.id === meetingId) {
        const currentTranscript = state.currentMeeting.transcript || '';
        state.currentMeeting.transcript = currentTranscript + (currentTranscript ? '\n' : '') + text;
      }
      
      const meeting = state.meetings.find(m => m.id === meetingId);
      if (meeting) {
        const currentTranscript = meeting.transcript || '';
        meeting.transcript = currentTranscript + (currentTranscript ? '\n' : '') + text;
      }
    },
    clearMeetings: (state) => {
      state.meetings = [];
      state.currentMeeting = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch project meetings
      .addCase(fetchProjectMeetings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectMeetings.fulfilled, (state, action) => {
        state.loading = false;
        state.meetings = action.payload.data || [];
        state.error = null;
      })
      .addCase(fetchProjectMeetings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch meeting
      .addCase(fetchMeeting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMeeting.fulfilled, (state, action) => {
        state.loading = false;
        state.currentMeeting = action.payload.data || null;
        state.error = null;
      })
      .addCase(fetchMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create meeting
      .addCase(createMeeting.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createMeeting.fulfilled, (state, action) => {
        state.creating = false;
        if (action.payload.data) {
          state.meetings.unshift(action.payload.data);
        }
        state.error = null;
      })
      .addCase(createMeeting.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      
      // Upload recording
      .addCase(uploadRecording.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadRecording.fulfilled, (state, action) => {
        state.uploading = false;
        
        if (action.payload.data && action.payload.data.meeting) {
          if (state.currentMeeting && state.currentMeeting.id === action.payload.data.meeting.id) {
            state.currentMeeting = action.payload.data.meeting;
          }
          
          const index = state.meetings.findIndex(m => m.id === action.payload.data!.meeting.id);
          if (index !== -1) {
            state.meetings[index] = action.payload.data.meeting;
          }
        }
        
        state.error = null;
      })
      .addCase(uploadRecording.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload as string;
      })
      
      // Add transcription
      .addCase(addTranscription.pending, (state) => {
        state.transcribing = true;
        state.error = null;
      })
      .addCase(addTranscription.fulfilled, (state, action) => {
        state.transcribing = false;
        
        if (action.payload.data) {
          if (state.currentMeeting && state.currentMeeting.id === action.payload.data.id) {
            state.currentMeeting = action.payload.data;
          }
          
          const index = state.meetings.findIndex(m => m.id === action.payload.data!.id);
          if (index !== -1) {
            state.meetings[index] = action.payload.data;
          }
        }
        
        state.error = null;
      })
      .addCase(addTranscription.rejected, (state, action) => {
        state.transcribing = false;
        state.error = action.payload as string;
      })
      
      // Analyze meeting
      .addCase(analyzeMeeting.pending, (state) => {
        state.analyzing = true;
        state.error = null;
      })
      .addCase(analyzeMeeting.fulfilled, (state, action) => {
        state.analyzing = false;
        
        if (action.payload.data && action.payload.data.meeting) {
          if (state.currentMeeting && state.currentMeeting.id === action.payload.data.meeting.id) {
            state.currentMeeting = action.payload.data.meeting;
          }
          
          const index = state.meetings.findIndex(m => m.id === action.payload.data!.meeting.id);
          if (index !== -1) {
            state.meetings[index] = action.payload.data.meeting;
          }
        }
        
        state.error = null;
      })
      .addCase(analyzeMeeting.rejected, (state, action) => {
        state.analyzing = false;
        state.error = action.payload as string;
      })
      
      // Update meeting
      .addCase(updateMeeting.fulfilled, (state, action) => {
        if (action.payload.data) {
          if (state.currentMeeting && state.currentMeeting.id === action.payload.data.id) {
            state.currentMeeting = action.payload.data;
          }
          
          const index = state.meetings.findIndex(m => m.id === action.payload.data!.id);
          if (index !== -1) {
            state.meetings[index] = action.payload.data;
          }
        }
      });
  },
});

export const { 
  clearError, 
  setCurrentMeeting, 
  updateMeetingInList, 
  addMeetingToList,
  appendTranscription,
  clearMeetings
} = meetingsSlice.actions;

export default meetingsSlice.reducer;