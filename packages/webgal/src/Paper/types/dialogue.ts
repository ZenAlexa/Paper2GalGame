/**
 * Paper Module - Dialogue Types
 * Type definitions for AI-generated dialogue and scripts
 */

/**
 * Character emotion for expression selection
 */
export type CharacterEmotion = 'neutral' | 'happy' | 'thinking' | 'surprised' | 'serious' | 'excited';

/**
 * Single dialogue line from AI generation
 */
export interface AIDialogueLine {
  /** Character ID (e.g., 'host', 'analyst') */
  characterId: string;
  /** Dialogue text content */
  text: string;
  /** Character emotion for expression selection */
  emotion?: CharacterEmotion;
  /** TTS audio URL (set after TTS generation) */
  vocal?: string;
  /** Dialogue index in sequence */
  index?: number;
}

/**
 * AI script generation metadata
 */
export interface AIScriptMetadata {
  /** Source paper title */
  paperTitle: string;
  /** Character IDs used in script */
  characters: string[];
  /** Total dialogue lines */
  totalLines: number;
  /** Estimated playback duration in seconds */
  estimatedDuration?: number;
  /** Generation timestamp */
  generatedAt?: Date;
}

/**
 * Complete AI-generated script
 * This is the structured format that replaces raw WebGAL script text
 */
export interface AIGeneratedScript {
  /** Script metadata */
  metadata: AIScriptMetadata;
  /** All dialogue lines in sequence */
  dialogues: AIDialogueLine[];
  /** Background image filename */
  background?: string;
  /** Background music filename */
  bgm?: string;
  /** BGM volume (0-100) */
  bgmVolume?: number;
}

/**
 * Dialogue line with resolved assets
 * Used after processing AI script with asset resolution
 */
export interface ResolvedDialogue extends AIDialogueLine {
  /** Resolved sprite filename */
  sprite: string;
  /** Resolved sprite position */
  position: 'left' | 'center' | 'right';
  /** Speaker display name */
  speakerName: string;
}

/**
 * Paper quote data for displaying citations
 */
export interface PaperQuoteData {
  /** Quote text content */
  text: string;
  /** Source reference (e.g., "Section 3.2", "Figure 1") */
  source?: string;
  /** Quote style */
  style?: 'blockquote' | 'inline' | 'highlight';
  /** Display duration in ms (null = wait for user) */
  duration?: number | null;
  /** Insert position (index in dialogue sequence) */
  insertAfter?: number;
}

/**
 * Paper highlight data for emphasizing content
 */
export interface PaperHighlightData {
  /** Highlighted text content */
  text: string;
  /** Annotation or explanation */
  note?: string;
  /** Highlight color */
  color?: 'yellow' | 'green' | 'blue' | 'pink';
  /** Importance level */
  importance?: 'high' | 'medium' | 'low';
  /** Display duration in ms (null = wait for user) */
  duration?: number | null;
  /** Insert position (index in dialogue sequence) */
  insertAfter?: number;
}

/**
 * Extended AI-generated script with Paper-specific elements
 */
export interface AIGeneratedScriptExtended extends AIGeneratedScript {
  /** Paper quotes to display */
  quotes?: PaperQuoteData[];
  /** Paper highlights to display */
  highlights?: PaperHighlightData[];
}
