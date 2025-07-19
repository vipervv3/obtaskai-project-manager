import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import projectsSlice from './slices/projectsSlice';
import tasksSlice from './slices/tasksSlice';
import commentsSlice from './slices/commentsSlice';
import meetingsSlice from './slices/meetingsSlice';
import notificationsSlice from './slices/notificationsSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    projects: projectsSlice,
    tasks: tasksSlice,
    comments: commentsSlice,
    meetings: meetingsSlice,
    notifications: notificationsSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;