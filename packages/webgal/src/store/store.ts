import { configureStore } from '@reduxjs/toolkit';
import GUIReducer from '@/store/GUIReducer';
import savesReducer from '@/store/savesReducer';
import stageReducer from '@/store/stageReducer';
import userDataReducer from '@/store/userDataReducer';

/**
 * WebGAL global state management
 */
export const webgalStore = configureStore({
  reducer: {
    stage: stageReducer,
    GUI: GUIReducer,
    userData: userDataReducer,
    saveData: savesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// 在 TS 中的类型声明
export type RootState = ReturnType<typeof webgalStore.getState>;
