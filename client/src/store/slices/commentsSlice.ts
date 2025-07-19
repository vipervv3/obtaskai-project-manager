import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Comment, CreateCommentDto } from '../../types';
import { commentService } from '../../services/commentService';

interface CommentsState {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  creating: boolean;
}

const initialState: CommentsState = {
  comments: [],
  loading: false,
  error: null,
  creating: false,
};

// Async thunks
export const fetchTaskComments = createAsyncThunk(
  'comments/fetchTaskComments',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await commentService.getTaskComments(taskId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch comments');
    }
  }
);

export const createComment = createAsyncThunk(
  'comments/createComment',
  async ({ taskId, commentData }: { taskId: string; commentData: CreateCommentDto }, { rejectWithValue }) => {
    try {
      const response = await commentService.createComment(taskId, commentData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create comment');
    }
  }
);

export const updateComment = createAsyncThunk(
  'comments/updateComment',
  async ({ id, content, mentions }: { id: string; content: string; mentions?: string[] }, { rejectWithValue }) => {
    try {
      const response = await commentService.updateComment(id, { content, mentions });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update comment');
    }
  }
);

export const deleteComment = createAsyncThunk(
  'comments/deleteComment',
  async (commentId: string, { rejectWithValue }) => {
    try {
      await commentService.deleteComment(commentId);
      return commentId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete comment');
    }
  }
);

const commentsSlice = createSlice({
  name: 'comments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addComment: (state, action: PayloadAction<Comment>) => {
      state.comments.push(action.payload);
    },
    updateCommentInList: (state, action: PayloadAction<Comment>) => {
      const index = state.comments.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.comments[index] = action.payload;
      }
    },
    removeCommentFromList: (state, action: PayloadAction<string>) => {
      state.comments = state.comments.filter(c => c.id !== action.payload);
    },
    clearComments: (state) => {
      state.comments = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch task comments
      .addCase(fetchTaskComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskComments.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = action.payload.data || [];
        state.error = null;
      })
      .addCase(fetchTaskComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create comment
      .addCase(createComment.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createComment.fulfilled, (state, action) => {
        state.creating = false;
        if (action.payload.data) {
          state.comments.push(action.payload.data);
        }
        state.error = null;
      })
      .addCase(createComment.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      
      // Update comment
      .addCase(updateComment.fulfilled, (state, action) => {
        if (action.payload.data) {
          const index = state.comments.findIndex(c => c.id === action.payload.data!.id);
          if (index !== -1) {
            state.comments[index] = action.payload.data;
          }
        }
      })
      
      // Delete comment
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.comments = state.comments.filter(c => c.id !== action.payload);
      });
  },
});

export const { 
  clearError, 
  addComment, 
  updateCommentInList, 
  removeCommentFromList,
  clearComments
} = commentsSlice.actions;

export default commentsSlice.reducer;