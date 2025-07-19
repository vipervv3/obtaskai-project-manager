import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Task, CreateTaskDto, UpdateTaskDto } from '../../types';
import { taskService } from '../../services/taskService';

interface TasksState {
  tasks: Task[];
  currentTask: Task | null;
  loading: boolean;
  error: string | null;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
}

const initialState: TasksState = {
  tasks: [],
  currentTask: null,
  loading: false,
  error: null,
  creating: false,
  updating: false,
  deleting: false,
};

// Async thunks
export const fetchProjectTasks = createAsyncThunk(
  'tasks/fetchProjectTasks',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await taskService.getProjectTasks(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch tasks');
    }
  }
);

export const fetchTask = createAsyncThunk(
  'tasks/fetchTask',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await taskService.getTask(taskId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch task');
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData: CreateTaskDto & { project_id?: string }, { rejectWithValue }) => {
    try {
      console.log('Creating task with data:', taskData);
      const response = await taskService.createTask(taskData);
      console.log('Task creation response:', response);
      return response.data;
    } catch (error: any) {
      console.error('Task creation error:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create task';
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, updates }: { id: string; updates: UpdateTaskDto }, { rejectWithValue }) => {
    try {
      console.log('Updating task:', { id, updates });
      const response = await taskService.updateTask(id, updates);
      console.log('Update task response:', response);
      return response.data;
    } catch (error: any) {
      console.error('Update task error:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update task';
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (taskId: string, { rejectWithValue }) => {
    try {
      await taskService.deleteTask(taskId);
      return taskId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete task');
    }
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTask: (state, action: PayloadAction<Task | null>) => {
      state.currentTask = action.payload;
    },
    updateTaskInList: (state, action: PayloadAction<Task>) => {
      const index = state.tasks.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
    addTaskToList: (state, action: PayloadAction<Task>) => {
      state.tasks.unshift(action.payload);
    },
    removeTaskFromList: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter(t => t.id !== action.payload);
    },
    clearTasks: (state) => {
      state.tasks = [];
      state.currentTask = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch project tasks
      .addCase(fetchProjectTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.data || [];
        state.error = null;
      })
      .addCase(fetchProjectTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch task
      .addCase(fetchTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTask.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTask = action.payload.data || null;
        state.error = null;
        
        // Update task in list if it exists
        if (action.payload.data) {
          const index = state.tasks.findIndex(t => t.id === action.payload.data!.id);
          if (index !== -1) {
            state.tasks[index] = action.payload.data;
          }
        }
      })
      .addCase(fetchTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create task
      .addCase(createTask.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.creating = false;
        if (action.payload.data) {
          state.tasks.unshift(action.payload.data);
        }
        state.error = null;
      })
      .addCase(createTask.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      
      // Update task
      .addCase(updateTask.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.updating = false;
        
        if (action.payload.data) {
          // Update current task
          if (state.currentTask && state.currentTask.id === action.payload.data.id) {
            state.currentTask = action.payload.data;
          }
          
          // Update task in list
          const index = state.tasks.findIndex(t => t.id === action.payload.data!.id);
          if (index !== -1) {
            state.tasks[index] = action.payload.data;
          }
        }
        
        state.error = null;
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })
      
      // Delete task
      .addCase(deleteTask.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.deleting = false;
        state.tasks = state.tasks.filter(t => t.id !== action.payload);
        
        // Clear current task if it was deleted
        if (state.currentTask && state.currentTask.id === action.payload) {
          state.currentTask = null;
        }
        
        state.error = null;
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  setCurrentTask, 
  updateTaskInList, 
  addTaskToList, 
  removeTaskFromList,
  clearTasks
} = tasksSlice.actions;

export default tasksSlice.reducer;