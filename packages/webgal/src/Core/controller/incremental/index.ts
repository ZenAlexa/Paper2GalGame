/**
 * Incremental Controller Module
 *
 * Exports for dynamic content loading in WebGAL
 */

// Types
export type {
  SegmentInfo,
  SegmentStatus,
  DynamicContentState,
  DynamicContentEvent,
  DynamicContentListener,
  DynamicContentEventType,
  WaitingDialogue,
  IncrementalControllerConfig,
  MultiLanguageText,
  SegmentMarker,
  TransitionOptions
} from './types';

// Controller
export {
  IncrementalController,
  getIncrementalController,
  initIncrementalController
} from './IncrementalController';
