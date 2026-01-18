/**
 * Incremental Generation Types
 *
 * Types for paper segmentation and incremental script generation
 * supporting 50% completion game start mechanism
 */

import type { WebGALScript, WebGALScene, GenerationOptions } from '../types/script';
import type { MultiLanguageContent } from '../types/character';

// Re-export paper types locally to avoid cross-package dependency issues
// These mirror the types from @paper2galgame/paper-parser
export type SectionType =
  | 'title'
  | 'abstract'
  | 'introduction'
  | 'methods'
  | 'results'
  | 'discussion'
  | 'conclusion'
  | 'references'
  | 'acknowledgments'
  | 'appendix'
  | 'other';

export interface PaperSection {
  type: SectionType;
  title: string;
  content: string;
  level: number;
  position: number;
  subsections?: PaperSection[];
  figures?: Array<{ id: string; caption: string; type: string; position: number }>;
  tables?: Array<{ id: string; caption: string; position: number; headers: string[]; rows: string[][] }>;
  equations?: Array<{ id: string; latex: string; text: string; position: number; inline: boolean }>;
  confidence?: number;
}

export interface ParsedPaper {
  metadata: {
    title: string;
    authors: string[];
    keywords: string[];
    abstract?: string;
    doi?: string;
    url?: string;
  };
  sections: PaperSection[];
  references: Array<{ id: string; title: string; authors: string[] }>;
  rawText: string;
  stats: {
    pageCount: number;
    wordCount: number;
    sectionCount: number;
    figureCount: number;
    tableCount: number;
    equationCount: number;
  };
  timestamp: Date;
  parserVersion: string;
  sourceFile: {
    name: string;
    size: number;
    type: string;
  };
}

/**
 * Paper segment for incremental generation
 */
export interface PaperSegment {
  /** Unique segment identifier */
  id: string;

  /** Segment priority (1 = highest, generate first) */
  priority: number;

  /** Paper sections included in this segment */
  content: PaperSection[];

  /** Estimated number of dialogue lines */
  estimatedDialogues: number;

  /** Whether this segment must be generated before game start */
  mustGenerateFirst: boolean;

  /** Segment type for display */
  type: SegmentType;

  /** Segment title (tri-language) */
  title: MultiLanguageContent;

  /** Segment description (tri-language) */
  description: MultiLanguageContent;
}

/**
 * Segment types matching paper structure
 */
export type SegmentType =
  | 'intro'      // Abstract + Introduction
  | 'methods'    // Methodology/Approach
  | 'results'    // Results/Experiments
  | 'conclusion' // Discussion/Conclusion
  | 'extra';     // Additional content

/**
 * Segment generation status
 */
export type SegmentStatus =
  | 'pending'      // Not yet started
  | 'generating'   // Currently being generated
  | 'completed'    // Successfully generated
  | 'failed';      // Generation failed

/**
 * Segment generation progress
 */
export interface SegmentProgress {
  /** Segment identifier */
  segmentId: string;

  /** Current status */
  status: SegmentStatus;

  /** Progress percentage (0-100) */
  progress: number;

  /** Status message (tri-language) */
  message: MultiLanguageContent;

  /** Error message if failed */
  error?: string;

  /** Generated script for this segment */
  script?: WebGALScene[];

  /** Generation timestamp */
  timestamp: Date;
}

/**
 * Overall generation progress
 */
export interface GenerationProgress {
  /** Total segments */
  totalSegments: number;

  /** Completed segments */
  completedSegments: number;

  /** Overall progress percentage */
  overallProgress: number;

  /** Whether game can start (>= 50%) */
  canStartGame: boolean;

  /** Individual segment progress */
  segments: SegmentProgress[];

  /** Estimated time remaining (seconds) */
  estimatedTimeRemaining?: number;
}

/**
 * Background generation task
 */
export interface BackgroundTask {
  /** Segment to generate */
  segmentId: string;

  /** Paper data reference */
  paperData: ParsedPaper;

  /** Generation options */
  options: GenerationOptions;

  /** Estimated generation time (seconds) */
  estimatedTime: number;

  /** Task status */
  status: 'queued' | 'running' | 'completed' | 'failed';
}

/**
 * Incremental generation result
 */
export interface IncrementalGenerationResult {
  /** Immediately available script (first 50%) */
  immediateScript: WebGALScript;

  /** Background tasks for remaining segments */
  backgroundTasks: BackgroundTask[];

  /** Callback when game is ready to start */
  gameReadyCallback: () => void;

  /** Initial progress state */
  initialProgress: GenerationProgress;
}

/**
 * Segment event types
 */
export type SegmentEventType =
  | 'segment_started'
  | 'segment_progress'
  | 'segment_completed'
  | 'segment_failed'
  | 'game_ready';

/**
 * Segment event data
 */
export interface SegmentEvent {
  /** Event type */
  type: SegmentEventType;

  /** Related segment ID */
  segmentId: string;

  /** Event data */
  data: {
    /** Progress percentage */
    progress?: number;

    /** Dialogue count */
    dialogueCount?: number;

    /** Generated scenes */
    scenes?: WebGALScene[];

    /** Error message */
    error?: string;
  };

  /** Event timestamp */
  timestamp: Date;
}

/**
 * Event listener callback type
 */
export type SegmentEventListener = (event: SegmentEvent) => void;

/**
 * Waiting dialogue configuration
 */
export interface WaitingDialogue {
  /** Character ID for dialogue */
  characterId: string;

  /** Dialogue content (tri-language) */
  content: MultiLanguageContent;

  /** Context when to show */
  context: 'generating' | 'loading' | 'transition';
}

/**
 * Configuration for incremental generation
 */
export interface IncrementalConfig {
  /** Minimum completion percentage before game start */
  minStartPercentage: number;

  /** Enable background generation */
  enableBackgroundGeneration: boolean;

  /** Delay between background tasks (ms) */
  backgroundTaskDelay: number;

  /** Maximum concurrent background tasks */
  maxConcurrentTasks: number;

  /** Enable waiting dialogues */
  enableWaitingDialogues: boolean;

  /** Retry failed segments */
  retryFailedSegments: boolean;

  /** Maximum retry attempts */
  maxRetryAttempts: number;
}
