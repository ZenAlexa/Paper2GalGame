/**
 * Paper Module - Main Export
 *
 * Provides types, configurations, factory functions, and scene builders
 * for Paper mode which converts academic papers into visual novel experiences.
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
 *
 *   // Scene Builder
 *   PaperSceneBuilder,
 *   buildPaperScene,
 *   buildPaperSceneFromDialogues,
 * } from '@/Paper';
 * ```
 */

// Types
export * from './types';

// Config
export * from './config';

// Factory functions
export * from './factory';

// Scene Builder
export * from './builder';
