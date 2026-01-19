/**
 * Paper Mode State Management
 *
 * Manages Paper-specific state using Redux Toolkit.
 * Follows the same patterns as other WebGAL reducers.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import cloneDeep from 'lodash/cloneDeep';
import {
  IPaperState,
  IPaperMetadata,
  IPaperSession,
  IPaperPlayback,
  IPaperHighlight,
  IPaperNote,
  IPaperProgress,
  ISetPaperPayload,
  IUpdateProgressPayload,
  IAddHighlightPayload,
  IAddNotePayload,
  IPersistedPaperData,
  IPaperSaveState,
} from '@/store/paperInterface';

/**
 * Initial paper state
 */
export const initialPaperState: IPaperState = {
  isPaperMode: false,
  currentPaper: null,
  session: null,
  progress: null,
  highlights: [],
  notes: [],
  playback: {
    isPlaying: false,
    isPaused: false,
    autoAdvanceSpeed: 3000, // 3 seconds default
  },
  paperHistory: [],
};

/**
 * Helper function to determine phase name from index
 */
function getPhaseNameFromIndex(phaseIndex: number): IPaperProgress['phaseName'] {
  const phases: IPaperProgress['phaseName'][] = [
    'introduction',
    'methods',
    'results',
    'discussion',
    'conclusion',
  ];
  return phases[Math.min(phaseIndex, phases.length - 1)] || 'introduction';
}

/**
 * Paper state slice
 */
const paperSlice = createSlice({
  name: 'paper',
  initialState: cloneDeep(initialPaperState),
  reducers: {
    // ==================== Mode Control ====================

    /**
     * Enter Paper mode
     */
    enterPaperMode(state) {
      state.isPaperMode = true;
    },

    /**
     * Exit Paper mode
     */
    exitPaperMode(state) {
      state.isPaperMode = false;
    },

    // ==================== Paper Loading ====================

    /**
     * Set current paper with metadata and total dialogues
     */
    setPaper(state, action: PayloadAction<ISetPaperPayload>) {
      const { metadata, totalDialogues } = action.payload;
      state.currentPaper = metadata;
      state.progress = {
        currentDialogueIndex: 0,
        totalDialogues,
        percentage: 0,
        phaseIndex: 0,
        phaseName: 'introduction',
        lastPlayedAt: new Date().toISOString(),
      };
    },

    /**
     * Clear current paper
     */
    clearPaper(state) {
      state.currentPaper = null;
      state.progress = null;
      state.session = null;
    },

    // ==================== Session Management ====================

    /**
     * Set session information
     */
    setSession(state, action: PayloadAction<IPaperSession>) {
      state.session = action.payload;
    },

    /**
     * Update session fields
     */
    updateSession(state, action: PayloadAction<Partial<IPaperSession>>) {
      if (state.session) {
        state.session = { ...state.session, ...action.payload };
      }
    },

    /**
     * Clear session
     */
    clearSession(state) {
      state.session = null;
    },

    // ==================== Progress Tracking ====================

    /**
     * Set total dialogues count
     */
    setTotalDialogues(state, action: PayloadAction<number>) {
      if (state.progress) {
        state.progress.totalDialogues = action.payload;
      }
    },

    /**
     * Update reading progress (called on each dialogue advance)
     */
    updateProgress(state, action: PayloadAction<IUpdateProgressPayload>) {
      if (state.progress) {
        const { currentIndex } = action.payload;
        const { totalDialogues } = state.progress;

        state.progress.currentDialogueIndex = currentIndex;
        state.progress.percentage =
          totalDialogues > 0 ? Math.round((currentIndex / totalDialogues) * 100) : 0;
        state.progress.lastPlayedAt = new Date().toISOString();

        // Auto-calculate phase based on progress percentage
        // Typical paper structure: intro(0-15%), methods(15-40%), results(40-70%), discussion(70-90%), conclusion(90-100%)
        const pct = state.progress.percentage;
        if (pct < 15) {
          state.progress.phaseIndex = 0;
          state.progress.phaseName = 'introduction';
        } else if (pct < 40) {
          state.progress.phaseIndex = 1;
          state.progress.phaseName = 'methods';
        } else if (pct < 70) {
          state.progress.phaseIndex = 2;
          state.progress.phaseName = 'results';
        } else if (pct < 90) {
          state.progress.phaseIndex = 3;
          state.progress.phaseName = 'discussion';
        } else {
          state.progress.phaseIndex = 4;
          state.progress.phaseName = 'conclusion';
        }
      }
    },

    /**
     * Manually set phase index
     */
    setPhase(state, action: PayloadAction<number>) {
      if (state.progress) {
        state.progress.phaseIndex = action.payload;
        state.progress.phaseName = getPhaseNameFromIndex(action.payload);
      }
    },

    // ==================== Annotations ====================

    /**
     * Add a highlight annotation
     */
    addHighlight(state, action: PayloadAction<IAddHighlightPayload>) {
      const highlight: IPaperHighlight = {
        ...action.payload,
        id: `hl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      };
      state.highlights.push(highlight);
    },

    /**
     * Remove a highlight by ID
     */
    removeHighlight(state, action: PayloadAction<string>) {
      state.highlights = state.highlights.filter((h) => h.id !== action.payload);
    },

    /**
     * Update a highlight
     */
    updateHighlight(
      state,
      action: PayloadAction<{ id: string; updates: Partial<Omit<IPaperHighlight, 'id' | 'createdAt'>> }>
    ) {
      const { id, updates } = action.payload;
      const index = state.highlights.findIndex((h) => h.id === id);
      if (index >= 0) {
        state.highlights[index] = { ...state.highlights[index], ...updates };
      }
    },

    /**
     * Add a note annotation
     */
    addNote(state, action: PayloadAction<IAddNotePayload>) {
      const note: IPaperNote = {
        ...action.payload,
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      };
      state.notes.push(note);
    },

    /**
     * Remove a note by ID
     */
    removeNote(state, action: PayloadAction<string>) {
      state.notes = state.notes.filter((n) => n.id !== action.payload);
    },

    /**
     * Update a note
     */
    updateNote(
      state,
      action: PayloadAction<{ id: string; updates: Partial<Omit<IPaperNote, 'id' | 'createdAt'>> }>
    ) {
      const { id, updates } = action.payload;
      const index = state.notes.findIndex((n) => n.id === id);
      if (index >= 0) {
        state.notes[index] = { ...state.notes[index], ...updates };
      }
    },

    /**
     * Clear all annotations for current paper
     */
    clearAnnotations(state) {
      state.highlights = [];
      state.notes = [];
    },

    // ==================== Playback Control ====================

    /**
     * Update playback settings
     */
    setPlayback(state, action: PayloadAction<Partial<IPaperPlayback>>) {
      state.playback = { ...state.playback, ...action.payload };
    },

    /**
     * Start auto-play
     */
    startAutoPlay(state) {
      state.playback.isPlaying = true;
      state.playback.isPaused = false;
    },

    /**
     * Pause auto-play
     */
    pauseAutoPlay(state) {
      state.playback.isPaused = true;
    },

    /**
     * Resume auto-play
     */
    resumeAutoPlay(state) {
      state.playback.isPaused = false;
    },

    /**
     * Stop auto-play
     */
    stopAutoPlay(state) {
      state.playback.isPlaying = false;
      state.playback.isPaused = false;
    },

    /**
     * Set auto-advance speed
     */
    setAutoAdvanceSpeed(state, action: PayloadAction<number>) {
      state.playback.autoAdvanceSpeed = action.payload;
    },

    // ==================== History Management ====================

    /**
     * Save current paper to history
     */
    savePaperToHistory(state) {
      if (state.currentPaper && state.progress) {
        const existingIndex = state.paperHistory.findIndex(
          (h) => h.metadata.paperId === state.currentPaper!.paperId
        );

        const entry = {
          metadata: cloneDeep(state.currentPaper),
          progress: cloneDeep(state.progress),
        };

        if (existingIndex >= 0) {
          // Update existing entry
          state.paperHistory[existingIndex] = entry;
        } else {
          // Add new entry at the beginning
          state.paperHistory.unshift(entry);
          // Keep only last 10 entries
          if (state.paperHistory.length > 10) {
            state.paperHistory.pop();
          }
        }
      }
    },

    /**
     * Remove a paper from history
     */
    removePaperFromHistory(state, action: PayloadAction<string>) {
      state.paperHistory = state.paperHistory.filter((h) => h.metadata.paperId !== action.payload);
    },

    /**
     * Clear all paper history
     */
    clearPaperHistory(state) {
      state.paperHistory = [];
    },

    // ==================== Persistence ====================

    /**
     * Restore paper data from storage
     */
    restorePaperData(state, action: PayloadAction<IPersistedPaperData>) {
      const { paperHistory, highlights, notes } = action.payload;
      state.paperHistory = paperHistory || [];
      state.highlights = highlights || [];
      state.notes = notes || [];
    },

    /**
     * Reset entire paper state
     */
    resetPaperState() {
      return cloneDeep(initialPaperState);
    },

    /**
     * Restore Paper state from a save file
     * Used when loading a save that contains Paper mode data
     */
    restoreFromSave(state, action: PayloadAction<IPaperSaveState>) {
      const { metadata, progress, sessionId, highlights, notes } = action.payload;
      state.isPaperMode = true;
      state.currentPaper = metadata;
      state.progress = progress;
      state.highlights = highlights || [];
      state.notes = notes || [];
      // Session is partial - only sessionId is restored
      // Full session reconnection requires API call
      state.session = sessionId
        ? {
            sessionId,
            apiBaseUrl: '/api', // Default API base URL
            scriptGenerated: true, // Assume script was generated
            ttsGenerated: false, // TTS may need regeneration
          }
        : null;
    },
  },
});

// Export actions
export const {
  // Mode control
  enterPaperMode,
  exitPaperMode,
  // Paper loading
  setPaper,
  clearPaper,
  // Session management
  setSession,
  updateSession,
  clearSession,
  // Progress tracking
  setTotalDialogues,
  updateProgress,
  setPhase,
  // Annotations
  addHighlight,
  removeHighlight,
  updateHighlight,
  addNote,
  removeNote,
  updateNote,
  clearAnnotations,
  // Playback control
  setPlayback,
  startAutoPlay,
  pauseAutoPlay,
  resumeAutoPlay,
  stopAutoPlay,
  setAutoAdvanceSpeed,
  // History management
  savePaperToHistory,
  removePaperFromHistory,
  clearPaperHistory,
  // Persistence
  restorePaperData,
  resetPaperState,
  restoreFromSave,
} = paperSlice.actions;

// Export all actions as a group
export const paperActions = paperSlice.actions;

// Export reducer
export default paperSlice.reducer;
