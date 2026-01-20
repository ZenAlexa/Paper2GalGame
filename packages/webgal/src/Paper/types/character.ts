/**
 * Paper Module - Character Types
 * Type definitions for character configuration in Paper mode
 */

/**
 * Multi-language character name
 */
export interface PaperCharacterName {
  zh: string; // Chinese name
  jp: string; // Japanese name
  en: string; // English name
}

/**
 * Sprite configuration for WebGAL rendering
 */
export interface SpriteConfig {
  /** Sprite filename (e.g., 'stand.webp') */
  filename: string;
  /** Default position on screen */
  defaultPosition: 'left' | 'center' | 'right';
}

/**
 * Voice synthesis configuration
 */
export interface VoiceConfig {
  /** TTS provider */
  provider: 'minimax' | 'voicevox';
  /** Voice identifier for the provider */
  voice: string;
  /** Emotion preset */
  emotion?: string;
  /** Speech speed multiplier */
  speed?: number;
}

/**
 * Main character configuration for Paper mode
 */
export interface PaperCharacter {
  /** Unique character identifier */
  id: string;
  /** Multi-language character name */
  name: PaperCharacterName;
  /** Role in paper discussion */
  paperRole: string;
  /** Sprite configuration */
  sprite: SpriteConfig;
  /** Voice synthesis settings */
  voice: VoiceConfig;
  /** Assigned paper phase (1-4) */
  assignedPhase?: number;
}

/**
 * Character position mapping for scene layout
 */
export interface CharacterPositionMap {
  [characterId: string]: {
    sprite: string;
    position: 'left' | 'center' | 'right';
  };
}
