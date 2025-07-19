import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ViewMode } from '../../types';

interface UiState {
  sidebarOpen: boolean;
  taskViewMode: ViewMode;
  theme: 'light' | 'dark';
  selectedProjectId: string | null;
  isLoading: boolean;
  globalError: string | null;
  notifications: {
    isOpen: boolean;
  };
  modals: {
    createProject: boolean;
    createTask: boolean;
    createMeeting: boolean;
    taskDetails: string | null;
    projectSettings: string | null;
  };
  filters: {
    tasks: {
      status?: string;
      priority?: string;
      assignee?: string;
    };
    projects: {
      status?: string;
    };
  };
}

const initialState: UiState = {
  sidebarOpen: true,
  taskViewMode: 'kanban',
  theme: 'light',
  selectedProjectId: null,
  isLoading: false,
  globalError: null,
  notifications: {
    isOpen: false,
  },
  modals: {
    createProject: false,
    createTask: false,
    createMeeting: false,
    taskDetails: null,
    projectSettings: null,
  },
  filters: {
    tasks: {},
    projects: {},
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setTaskViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.taskViewMode = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    setSelectedProjectId: (state, action: PayloadAction<string | null>) => {
      state.selectedProjectId = action.payload;
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setGlobalError: (state, action: PayloadAction<string | null>) => {
      state.globalError = action.payload;
    },
    clearGlobalError: (state) => {
      state.globalError = null;
    },
    
    // Notifications
    toggleNotifications: (state) => {
      state.notifications.isOpen = !state.notifications.isOpen;
    },
    setNotificationsOpen: (state, action: PayloadAction<boolean>) => {
      state.notifications.isOpen = action.payload;
    },
    
    // Modals
    openCreateProjectModal: (state) => {
      state.modals.createProject = true;
    },
    closeCreateProjectModal: (state) => {
      state.modals.createProject = false;
    },
    openCreateTaskModal: (state) => {
      state.modals.createTask = true;
    },
    closeCreateTaskModal: (state) => {
      state.modals.createTask = false;
    },
    openCreateMeetingModal: (state) => {
      state.modals.createMeeting = true;
    },
    closeCreateMeetingModal: (state) => {
      state.modals.createMeeting = false;
    },
    openTaskDetailsModal: (state, action: PayloadAction<string>) => {
      state.modals.taskDetails = action.payload;
    },
    closeTaskDetailsModal: (state) => {
      state.modals.taskDetails = null;
    },
    openProjectSettingsModal: (state, action: PayloadAction<string>) => {
      state.modals.projectSettings = action.payload;
    },
    closeProjectSettingsModal: (state) => {
      state.modals.projectSettings = null;
    },
    closeAllModals: (state) => {
      state.modals = {
        createProject: false,
        createTask: false,
        createMeeting: false,
        taskDetails: null,
        projectSettings: null,
      };
    },
    
    // Filters
    setTaskFilters: (state, action: PayloadAction<{
      status?: string;
      priority?: string;
      assignee?: string;
    }>) => {
      state.filters.tasks = { ...state.filters.tasks, ...action.payload };
    },
    clearTaskFilters: (state) => {
      state.filters.tasks = {};
    },
    setProjectFilters: (state, action: PayloadAction<{
      status?: string;
    }>) => {
      state.filters.projects = { ...state.filters.projects, ...action.payload };
    },
    clearProjectFilters: (state) => {
      state.filters.projects = {};
    },
    clearAllFilters: (state) => {
      state.filters = {
        tasks: {},
        projects: {},
      };
    },
    
    // Initialize theme from localStorage
    initializeTheme: (state) => {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        state.theme = savedTheme;
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        state.theme = prefersDark ? 'dark' : 'light';
        localStorage.setItem('theme', state.theme);
      }
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setTaskViewMode,
  setTheme,
  setSelectedProjectId,
  setGlobalLoading,
  setGlobalError,
  clearGlobalError,
  
  toggleNotifications,
  setNotificationsOpen,
  
  openCreateProjectModal,
  closeCreateProjectModal,
  openCreateTaskModal,
  closeCreateTaskModal,
  openCreateMeetingModal,
  closeCreateMeetingModal,
  openTaskDetailsModal,
  closeTaskDetailsModal,
  openProjectSettingsModal,
  closeProjectSettingsModal,
  closeAllModals,
  
  setTaskFilters,
  clearTaskFilters,
  setProjectFilters,
  clearProjectFilters,
  clearAllFilters,
  
  initializeTheme,
} = uiSlice.actions;

export default uiSlice.reducer;