/**
 * Incremental Generation Module
 *
 * Exports for paper segmentation and incremental script generation
 */

export type { ScriptGeneratorInterface } from './incremental-generator';
// Incremental Generator
export {
  createIncrementalGenerator,
  IncrementalScriptGenerator,
} from './incremental-generator';
export type {
  GameInstance,
  GameProgress,
  SaveData,
  SaveSystemConfig,
} from './save-system';
// Save System
export {
  createSaveSystem,
  MultiPaperSaveSystem,
} from './save-system';
// Segmentation Strategy
export {
  createSegmentationStrategy,
  PaperSegmentationStrategy,
} from './segmentation-strategy';
// Types
export type {
  BackgroundTask,
  GenerationProgress,
  IncrementalConfig,
  IncrementalGenerationResult,
  PaperSegment,
  SegmentEvent,
  SegmentEventListener,
  SegmentEventType,
  SegmentProgress,
  SegmentStatus,
  SegmentType,
  WaitingDialogue,
} from './types';
