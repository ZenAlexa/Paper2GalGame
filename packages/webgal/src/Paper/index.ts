/**
 * Paper Module - Main Export
 *
 * Provides types, configurations, and factory functions for Paper mode
 * which converts academic papers into visual novel experiences.
 *
 * Usage:
 * ```typescript
 * import {
 *   // Types
 *   PaperCharacter,
 *   AIGeneratedScript,
 *   AIDialogueLine,
 *
 *   // Config
 *   PAPER_CHARACTERS,
 *   getCharacter,
 *   buildPositionMap,
 *
 *   // Factory functions
 *   createSaySentence,
 *   createChangeBgSentence,
 *   createChangeFigureSentence,
 *   createBgmSentence,
 *   createDialogueSentences,
 * } from '@/Paper';
 * ```
 */

// Types
export * from './types';

// Config
export * from './config';

// Factory functions
export * from './factory';
