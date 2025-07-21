import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Project, CreateProjectDto, UpdateProjectDto } from '../../types';

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

// Mock data for projects
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Project Alpha',
    description: 'A sample project to demonstrate the interface',
    status: 'active',
    deadline: '2025-08-15',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
    owner_id: '1',
    members: [],
    tasks: []
  },
  {
    id: '2',
    name: 'Project Beta',
    description: 'Another project showcasing different features',
    status: 'active',
    deadline: '2025-09-01',
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2025-01-20T00:00:00Z',
    owner_id: '1',
    members: [],
    tasks: []
  },
  {
    id: '3',
    name: 'Project Gamma',
    description: 'Completed project example',
    status: 'completed',
    deadline: '2025-07-30',
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2025-01-25T00:00:00Z',
    owner_id: '1',
    members: [],
    tasks: []
  }
];

// Async thunks (mock implementations)
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get projects from localStorage or use mock data
      const stored = localStorage.getItem('mock_projects');
      const projects = stored ? JSON.parse(stored) : mockProjects;
      
      return { data: projects };
    } catch (error: any) {
      return rejectWithValue('Failed to fetch projects');
    }
  }
);

export const fetchProject = createAsyncThunk(
  'projects/fetchProject',
  async (projectId: string, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const stored = localStorage.getItem('mock_projects');
      const projects = stored ? JSON.parse(stored) : mockProjects;
      const project = projects.find((p: Project) => p.id === projectId);
      
      if (!project) {
        return rejectWithValue('Project not found');
      }
      
      return { data: project };
    } catch (error: any) {
      return rejectWithValue('Failed to fetch project');
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData: CreateProjectDto, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newProject: Project = {
        id: Date.now().toString(),
        name: projectData.name,
        description: projectData.description || '',
        status: 'active',
        deadline: projectData.deadline || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        owner_id: '1',
        members: [],
        tasks: []
      };
      
      // Save to localStorage
      const stored = localStorage.getItem('mock_projects');
      const projects = stored ? JSON.parse(stored) : mockProjects;
      projects.unshift(newProject);
      localStorage.setItem('mock_projects', JSON.stringify(projects));
      
      return { data: newProject };
    } catch (error: any) {
      return rejectWithValue('Failed to create project');
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ id, updates }: { id: string; updates: UpdateProjectDto }, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const stored = localStorage.getItem('mock_projects');
      const projects = stored ? JSON.parse(stored) : mockProjects;
      const projectIndex = projects.findIndex((p: Project) => p.id === id);
      
      if (projectIndex === -1) {
        return rejectWithValue('Project not found');
      }
      
      const updatedProject = {
        ...projects[projectIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      projects[projectIndex] = updatedProject;
      localStorage.setItem('mock_projects', JSON.stringify(projects));
      
      return { data: updatedProject };
    } catch (error: any) {
      return rejectWithValue('Failed to update project');
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId: string, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove from localStorage
      const stored = localStorage.getItem('mock_projects');
      const projects = stored ? JSON.parse(stored) : mockProjects;
      const updatedProjects = projects.filter((p: Project) => p.id !== projectId);
      localStorage.setItem('mock_projects', JSON.stringify(updatedProjects));
      
      return projectId;
    } catch (error: any) {
      return rejectWithValue('Failed to delete project');
    }
  }
);

// Simplified member management (mock implementation)
export const addProjectMember = createAsyncThunk(
  'projects/addProjectMember',
  async ({ projectId, userEmail, role }: { projectId: string; userEmail: string; role?: string }, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      // Mock member data
      const mockMember = {
        id: Date.now().toString(),
        project_id: projectId,
        user_id: '2',
        role: role || 'member',
        created_at: new Date().toISOString(),
        user: {
          id: '2',
          email: userEmail,
          name: userEmail.split('@')[0],
          avatar: null
        }
      };
      return { data: mockMember };
    } catch (error: any) {
      return rejectWithValue('Failed to add member');
    }
  }
);

export const removeProjectMember = createAsyncThunk(
  'projects/removeProjectMember',
  async ({ projectId, memberId }: { projectId: string; memberId: string }, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      return { projectId, memberId };
    } catch (error: any) {
      return rejectWithValue('Failed to remove member');
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