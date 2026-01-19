/**
 * Incremental Loading Types for WebGAL
 *
 * Types for dynamic content loading and segment management
 */

/**
 * Segment status in the game
 */
export type SegmentStatus =
  | 'available' // Ready to play
  | 'loading' // Currently loading
  | 'generating' // Being generated in background
  | 'unavailable'; // Not yet available

/**
 * Segment information
 */
export interface SegmentInfo {
  /** Segment identifier */
  id: string;

  /** Segment priority */
  priority: number;

  /** Current status */
  status: SegmentStatus;

  /** Segment title (current language) */
  title: string;

  /** Start sentence index in script */
  startIndex: number;

  /** End sentence index in script */
  endIndex: number;

  /** Whether this is the current segment */
  isCurrent: boolean;
}

/**
 * Multi-language text
 */
export interface MultiLanguageText {
  zh: string;
  jp: string;
  en: string;
}

/**
 * Waiting dialogue for loading states
 */
export interface WaitingDialogue {
  /** Character ID */
  characterId: string;

  /** Character sprite file */
  sprite: string;

  /** Character name (current language) */
  name: string;

  /** Dialogue text (current language) */
  text: string;

  /** Voice file (optional) */
  vocal?: string;
}

/**
 * Segment boundary marker in script
 */
export interface SegmentMarker {
  /** Marker type */
  type: 'segment_start' | 'segment_end';

  /** Segment identifier */
  segmentId: string;

  /** Position in sentence list */
  position: number;
}

/**
 * Dynamic content state
 */
export interface DynamicContentState {
  /** Currently active segment */
  currentSegmentId: string;

  /** Available segments */
  availableSegments: Set<string>;

  /** Segment information map */
  segmentInfoMap: Map<string, SegmentInfo>;

  /** Current loading segment (if any) */
  loadingSegment: string | null;

  /** Background generation active */
  isBackgroundGenerating: boolean;

  /** Event listeners */
  listeners: Set<DynamicContentListener>;
}

/**
 * Event types for dynamic content
 */
export type DynamicContentEventType =
  | 'segment_available'
  | 'segment_loading'
  | 'segment_ready'
  | 'segment_error'
  | 'generation_progress'
  | 'all_complete';

/**
 * Dynamic content event
 */
export interface DynamicContentEvent {
  type: DynamicContentEventType;
  segmentId?: string;
  progress?: number;
  error?: string;
  timestamp: Date;
}

/**
 * Event listener type
 */
export type DynamicContentListener = (event: DynamicContentEvent) => void;

/**
 * Transition dialogue options
 */
export interface TransitionOptions {
  /** Show waiting dialogue */
  showWaitingDialogue: boolean;

  /** Waiting dialogue to show */
  waitingDialogue?: WaitingDialogue;

  /** Timeout before showing waiting state (ms) */
  waitingTimeout: number;

  /** Allow skip while waiting */
  allowSkip: boolean;
}

/**
 * Incremental controller configuration
 */
export interface IncrementalControllerConfig {
  /** Enable incremental loading */
  enabled: boolean;

  /** Current display language */
  language: 'zh' | 'jp' | 'en';

  /** Transition options */
  transition: TransitionOptions;

  /** Preload next segment */
  preloadNext: boolean;

  /** Auto-continue when segment ready */
  autoContinue: boolean;
}
