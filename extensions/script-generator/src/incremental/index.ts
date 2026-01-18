/**
 * Incremental Generation Module
 *
 * Exports for paper segmentation and incremental script generation
 */

// Types
export type {
  PaperSegment,
  SegmentType,
  SegmentStatus,
  SegmentProgress,
  GenerationProgress,
  BackgroundTask,
  IncrementalGenerationResult,
  SegmentEventType,
  SegmentEvent,
  SegmentEventListener,
  WaitingDialogue,
  IncrementalConfig
} from './types';

// Segmentation Strategy
export {
  PaperSegmentationStrategy,
  createSegmentationStrategy
} from './segmentation-strategy';

// Incremental Generator
export {
  IncrementalScriptGenerator,
  createIncrementalGenerator
} from './incremental-generator';

export type { ScriptGeneratorInterface } from './incremental-generator';

// Save System
export {
  MultiPaperSaveSystem,
  createSaveSystem
} from './save-system';

export type {
  GameInstance,
  SaveData,
  GameProgress,
  SaveSystemConfig
} from './save-system';
