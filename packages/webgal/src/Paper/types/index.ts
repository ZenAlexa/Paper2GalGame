/**
 * Paper Module - Type Exports
 */

// Character types
export type {
  PaperCharacterName,
  SpriteConfig,
  VoiceConfig,
  PaperCharacter,
  CharacterPositionMap,
} from './character';

// Dialogue types
export type {
  CharacterEmotion,
  AIDialogueLine,
  AIScriptMetadata,
  AIGeneratedScript,
  ResolvedDialogue,
  // Paper-specific element types
  PaperQuoteData,
  PaperHighlightData,
  AIGeneratedScriptExtended,
} from './dialogue';

// Paper types
export type {
  PaperSectionType,
  PaperSection,
  ParsedPaper,
  PaperStats,
  PaperSessionState,
} from './paper';
