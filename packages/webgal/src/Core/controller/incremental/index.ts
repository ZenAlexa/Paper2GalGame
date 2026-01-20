/**
 * Incremental Controller Module
 *
 * Exports for dynamic content loading in WebGAL
 */

// Controller
export { getIncrementalController, IncrementalController, initIncrementalController } from './IncrementalController';
// Types
export type {
  DynamicContentEvent,
  DynamicContentEventType,
  DynamicContentListener,
  DynamicContentState,
  IncrementalControllerConfig,
  MultiLanguageText,
  SegmentInfo,
  SegmentMarker,
  SegmentStatus,
  TransitionOptions,
  WaitingDialogue,
} from './types';
