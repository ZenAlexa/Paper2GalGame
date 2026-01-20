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

// Scene Builder
export * from './builder';

// Config
export * from './config';

// Factory functions
export * from './factory';
// Game Launcher
export * from './launcher';
// TTS Integration
export * from './tts';
// Types
export * from './types';
