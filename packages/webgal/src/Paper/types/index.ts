/**
 * Paper Module - Type Exports
 */

// Character types
export type {
  CharacterPositionMap,
  PaperCharacter,
  PaperCharacterName,
  SpriteConfig,
  VoiceConfig,
} from './character';

// Dialogue types
export type {
  AIDialogueLine,
  AIGeneratedScript,
  AIGeneratedScriptExtended,
  AIScriptMetadata,
  CharacterEmotion,
  PaperHighlightData,
  // Paper-specific element types
  PaperQuoteData,
  ResolvedDialogue,
} from './dialogue';

// Paper types
export type {
  PaperSection,
  PaperSectionType,
  PaperSessionState,
  PaperStats,
  ParsedPaper,
} from './paper';
