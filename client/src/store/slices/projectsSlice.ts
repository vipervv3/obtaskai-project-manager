import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Project, CreateProjectDto, UpdateProjectDto } from '../../types';
import { projectService } from '../../services/projectService';

interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
}

const initialState: ProjectsState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  creating: false,
  updating: false,
  deleting: false,
};

// Async thunks (real API implementations)
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      const response = await projectService.getProjects();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch projects');
    }
  }
);

export const fetchProject = createAsyncThunk(
  'projects/fetchProject',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await projectService.getProject(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch project');
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData: CreateProjectDto, { rejectWithValue }) => {
    try {
      const response = await projectService.createProject(projectData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create project');
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ id, updates }: { id: string; updates: UpdateProjectDto }, { rejectWithValue }) => {
    try {
      const response = await projectService.updateProject(id, updates);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update project');
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId: string, { rejectWithValue }) => {
    try {
      await projectService.deleteProject(projectId);
      return projectId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete project');
    }
  }
);

export const addProjectMember = createAsyncThunk(
  'projects/addProjectMember',
  async ({ projectId, userEmail, role }: { projectId: string; userEmail: string; role?: string }, { rejectWithValue }) => {
    try {
      const response = await projectService.addMember(projectId, userEmail, role);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add member');
    }
  }
);

// Create the slice
const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentProject: (state, action: PayloadAction<Project | null>) => {
      state.currentProject = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch projects
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload.data || [];
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch single project
      .addCase(fetchProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.data) {
          const project = action.payload.data;
          state.currentProject = project;
          
          // Update project in list if it exists
          const index = state.projects.findIndex(p => p.id === project.id);
          if (index !== -1) {
            state.projects[index] = project;
          }
        }
      })
      .addCase(fetchProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create project
      .addCase(createProject.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.creating = false;
        if (action.payload.data) {
          state.projects.unshift(action.payload.data);
        }
      })
      .addCase(createProject.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      
      // Update project
      .addCase(updateProject.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.updating = false;
        if (action.payload.data) {
          const project = action.payload.data;
          const index = state.projects.findIndex(p => p.id === project.id);
          if (index !== -1) {
            state.projects[index] = project;
          }
          
          // Update current project if it's the same
          if (state.currentProject?.id === project.id) {
            state.currentProject = project;
          }
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })
      
      // Delete project
      .addCase(deleteProject.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.deleting = false;
        const projectId = action.payload;
        state.projects = state.projects.filter(p => p.id !== projectId);
        
        // Clear current project if it was deleted
        if (state.currentProject?.id === projectId) {
          state.currentProject = null;
        }
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      })
      
      // Add project member
      .addCase(addProjectMember.fulfilled, (state, action) => {
        if (action.payload.data) {
          const member = action.payload.data;
          const projectId = member.project_id;
          
          // Update current project
          if (state.currentProject && state.currentProject.id === projectId) {
            if (!state.currentProject.members) {
              state.currentProject.members = [];
            }
            state.currentProject.members.push(member);
          }
          
          // Update project in list
          const project = state.projects.find(p => p.id === projectId);
          if (project) {
            if (!project.members) {
              project.members = [];
            }
            project.members.push(member);
          }
        }
      })
      .addCase(addProjectMember.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentProject } = projectsSlice.actions;

export default projectsSlice.reducer;