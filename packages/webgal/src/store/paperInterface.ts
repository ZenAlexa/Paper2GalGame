/**
 * Paper Mode State Interfaces
 *
 * Manages Paper-specific state including:
 * - Paper metadata (title, author, etc.)
 * - Reading progress tracking
 * - User annotations (highlights, notes)
 * - Playback control
 */

/**
 * Paper document metadata
 */
export interface IPaperMetadata {
  /** Unique identifier (from session or generated) */
  paperId: string;
  /** Paper title */
  title: string;
  /** List of authors */
  authors: string[];
  /** Paper abstract */
  abstract: string;
  /** Upload timestamp (ISO 8601) */
  uploadedAt: string;
  /** Source type */
  source: 'upload' | 'url' | 'sample';
}

/**
 * Paper reading progress
 */
export interface IPaperProgress {
  /** Current dialogue index (0-based) */
  currentDialogueIndex: number;
  /** Total number of dialogues */
  totalDialogues: number;
  /** Completion percentage (0-100) */
  percentage: number;
  /** Current paper phase (0=intro, 1=method, 2=result, 3=conclusion) */
  phaseIndex: number;
  /** Phase names for display */
  phaseName: 'introduction' | 'methods' | 'results' | 'discussion' | 'conclusion';
  /** Last played timestamp (ISO 8601) */
  lastPlayedAt: string;
}

/**
 * Highlight annotation
 */
export interface IPaperHighlight {
  /** Unique identifier */
  id: string;
  /** Highlighted text content */
  text: string;
  /** Associated dialogue index */
  dialogueIndex: number;
  /** Highlight color */
  color: 'yellow' | 'green' | 'pink' | 'blue';
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
}

/**
 * Note annotation
 */
export interface IPaperNote {
  /** Unique identifier */
  id: string;
  /** Note content */
  content: string;
  /** Associated dialogue index */
  dialogueIndex: number;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
}

/**
 * Paper API session information (transient)
 */
export interface IPaperSession {
  /** Session ID from API */
  sessionId: string;
  /** API base URL */
  apiBaseUrl: string;
  /** Whether script has been generated */
  scriptGenerated: boolean;
  /** Whether TTS has been generated */
  ttsGenerated: boolean;
}

/**
 * Playback control state
 */
export interface IPaperPlayback {
  /** Whether currently playing (auto-advance) */
  isPlaying: boolean;
  /** Whether paused */
  isPaused: boolean;
  /** Auto-advance interval in milliseconds */
  autoAdvanceSpeed: number;
}

/**
 * Paper history entry for persistence
 */
export interface IPaperHistoryEntry {
  /** Paper metadata */
  metadata: IPaperMetadata;
  /** Reading progress at time of save */
  progress: IPaperProgress;
}

/**
 * Complete Paper state
 */
export interface IPaperState {
  /** Whether Paper mode is currently active */
  isPaperMode: boolean;

  /** Current paper metadata (null if no paper loaded) */
  currentPaper: IPaperMetadata | null;

  /** Current session information (transient, not persisted) */
  session: IPaperSession | null;

  /** Reading progress (null if no paper loaded) */
  progress: IPaperProgress | null;

  /** User highlights */
  highlights: IPaperHighlight[];

  /** User notes */
  notes: IPaperNote[];

  /** Playback control state */
  playback: IPaperPlayback;

  /** Paper reading history (persisted) */
  paperHistory: IPaperHistoryEntry[];
}

/**
 * Action payload types
 */
export interface ISetPaperPayload {
  metadata: IPaperMetadata;
  totalDialogues: number;
}

export interface IUpdateProgressPayload {
  currentIndex: number;
}

export interface IAddHighlightPayload {
  text: string;
  dialogueIndex: number;
  color: IPaperHighlight['color'];
}

export interface IAddNotePayload {
  content: string;
  dialogueIndex: number;
}

/**
 * Persisted paper data structure (for IndexedDB)
 */
export interface IPersistedPaperData {
  /** Paper history entries */
  paperHistory: IPaperHistoryEntry[];
  /** All highlights */
  highlights: IPaperHighlight[];
  /** All notes */
  notes: IPaperNote[];
}
