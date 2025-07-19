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

// Async thunks
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
      console.log('Adding project member:', { projectId, userEmail, role });
      const response = await projectService.addMember(projectId, userEmail, role);
      console.log('Add member response:', response);
      return response.data;
    } catch (error: any) {
      console.error('Add member error:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to add member';
      return rejectWithValue(errorMessage);
    }
  }
);

export const removeProjectMember = createAsyncThunk(
  'projects/removeProjectMember',
  async ({ projectId, memberId }: { projectId: string; memberId: string }, { rejectWithValue }) => {
    try {
      await projectService.removeMember(projectId, memberId);
      return { projectId, memberId };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to remove member');
    }
  }
);

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
    updateProjectInList: (state, action: PayloadAction<Project>) => {
      const index = state.projects.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
    },
    addProjectToList: (state, action: PayloadAction<Project>) => {
      state.projects.unshift(action.payload);
    },
    removeProjectFromList: (state, action: PayloadAction<string>) => {
      state.projects = state.projects.filter(p => p.id !== action.payload);
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
        state.error = null;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch project
      .addCase(fetchProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProject = action.payload.data || null;
        state.error = null;
        
        // Update project in list if it exists
        if (action.payload.data) {
          const index = state.projects.findIndex(p => p.id === action.payload.data!.id);
          if (index !== -1) {
            state.projects[index] = action.payload.data;
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
        state.error = null;
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
          // Update current project
          if (state.currentProject && state.currentProject.id === action.payload.data.id) {
            state.currentProject = action.payload.data;
          }
          
          // Update project in list
          const index = state.projects.findIndex(p => p.id === action.payload.data!.id);
          if (index !== -1) {
            state.projects[index] = action.payload.data;
          }
        }
        
        state.error = null;
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
        state.projects = state.projects.filter(p => p.id !== action.payload);
        
        // Clear current project if it was deleted
        if (state.currentProject && state.currentProject.id === action.payload) {
          state.currentProject = null;
        }
        
        state.error = null;
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
      
      // Remove project member
      .addCase(removeProjectMember.fulfilled, (state, action) => {
        const { projectId, memberId } = action.payload;
        
        // Update current project
        if (state.currentProject && state.currentProject.id === projectId && state.currentProject.members) {
          state.currentProject.members = state.currentProject.members.filter(m => m.id !== memberId);
        }
        
        // Update project in list
        const project = state.projects.find(p => p.id === projectId);
        if (project && project.members) {
          project.members = project.members.filter(m => m.id !== memberId);
        }
      });
  },
});

export const { 
  clearError, 
  setCurrentProject, 
  updateProjectInList, 
  addProjectToList, 
  removeProjectFromList 
} = projectsSlice.actions;

export default projectsSlice.reducer;