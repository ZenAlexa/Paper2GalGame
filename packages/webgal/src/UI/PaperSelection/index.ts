/**
 * Paper Selection Module
 *
 * Exports for paper upload and game management interface
 */

// Components
export { PaperSelection, default } from './PaperSelection';

// Types
export type {
  MultiLanguageText,
  UILabels,
  CharacterDisplayInfo,
  GameCardInfo,
  GenerationStatus,
  PaperSelectionProps,
  FileUploaderProps,
  CharacterSelectorProps,
  ProgressDisplayProps,
  GameCardProps
} from './types';

// Labels and utilities
export {
  UI_LABELS,
  CHARACTER_ROLES,
  getLabel,
  getCharacterInfo,
  formatDate
} from './labels';
