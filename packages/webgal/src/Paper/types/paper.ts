/**
 * Paper Module - Academic Paper Types
 * Type definitions for parsed academic paper content
 */

/**
 * Paper section types corresponding to standard academic structure
 */
export type PaperSectionType =
  | 'abstract'
  | 'introduction'
  | 'methods'
  | 'results'
  | 'discussion'
  | 'conclusion'
  | 'references'
  | 'other';

/**
 * A section of the academic paper
 */
export interface PaperSection {
  /** Section type */
  type: PaperSectionType;
  /** Section title */
  title: string;
  /** Section content text */
  content: string;
  /** Section level (1 = top level) */
  level?: number;
  /** Position in document */
  position?: number;
  /** Mapped game phase (1-4) */
  phase?: number;
}

/**
 * Parsed academic paper data
 */
export interface ParsedPaper {
  /** Paper title */
  title: string;
  /** Author names */
  authors: string[];
  /** Paper abstract */
  abstract: string;
  /** Paper sections */
  sections: PaperSection[];
  /** Keywords if available */
  keywords?: string[];
  /** Raw text content */
  rawText?: string;
}

/**
 * Paper processing statistics
 */
export interface PaperStats {
  /** Number of pages */
  pageCount?: number;
  /** Word count */
  wordCount?: number;
  /** Character count */
  charCount?: number;
  /** Number of sections */
  sectionCount: number;
  /** Number of figures */
  figureCount?: number;
  /** Number of tables */
  tableCount?: number;
}

/**
 * Paper session state for game progress tracking
 */
export interface PaperSessionState {
  /** Session identifier */
  sessionId: string;
  /** Paper being processed */
  paper: ParsedPaper;
  /** Paper statistics */
  stats: PaperStats;
  /** Selected character IDs */
  selectedCharacters: string[];
  /** Current game phase */
  currentPhase: number;
  /** Current dialogue index */
  currentDialogueIndex: number;
  /** Session status */
  status: 'uploading' | 'parsing' | 'generating' | 'playing' | 'completed' | 'error';
  /** Error message if status is 'error' */
  errorMessage?: string;
}
