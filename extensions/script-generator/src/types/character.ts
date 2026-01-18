/**
 * Character Types for Script Generator
 *
 * Defines character configurations and dialogue properties
 */

/**
 * Multilingual character name
 */
export interface CharacterName {
  zh: string;  // Chinese name
  jp: string;  // Japanese name
  en: string;  // English name
}

/**
 * Voice settings for different TTS providers
 */
export interface VoiceSettings {
  voicevox: {
    speaker: number;
    emotion: 'normal' | 'happy' | 'sad' | 'angry' | 'surprised';
    speed: number;
  };
  minimax: {
    model: string;
    voice: string;
    emotion: 'neutral' | 'cheerful' | 'serious' | 'calm' | 'excited';
  };
}

/**
 * Character configuration interface
 */
export interface Character {
  /** Unique character identifier */
  id: string;

  /** Character names in different languages */
  name: CharacterName;

  /** Source game */
  source: string;

  /** Character personality traits */
  personality: string[];

  /** Speaking style characteristics */
  speakingStyle: string[];

  /** Role in paper discussion */
  paperRole: string;

  /** Voice synthesis settings */
  voiceSettings: VoiceSettings;

  /** Common phrases/catchphrases */
  phrases: string[];

  /** Character description (optional) */
  description?: string;

  /** Character avatar/sprite filename */
  sprite?: string;
}

/**
 * Character interaction patterns
 */
export interface CharacterInteraction {
  /** Characters involved */
  characters: string[];

  /** Interaction type */
  type: 'question' | 'explanation' | 'discussion' | 'agreement' | 'disagreement';

  /** Interaction template */
  template: string;
}

/**
 * Multi-language content for dialogue
 */
export interface MultiLanguageContent {
  /** Chinese content */
  zh: string;

  /** Japanese content */
  jp: string;

  /** English content */
  en: string;
}

/**
 * Dialogue line for a character with multi-language support
 */
export interface DialogueLine {
  /** Character ID */
  characterId: string;

  /** Character display name (multi-language) */
  speaker: MultiLanguageContent;

  /** Dialogue content (multi-language) */
  content: MultiLanguageContent;

  /** Emotion/tone */
  emotion?: string;

  /** Voice file reference (always Japanese for consistency) */
  vocal?: string;

  /** Line metadata */
  metadata?: {
    /** Content type (explanation, question, etc.) */
    type?: string;

    /** Related paper section */
    section?: string;

    /** Confidence in educational content */
    confidence?: number;

    /** Translation quality scores */
    translationQuality?: {
      zh: number; // 0-1 quality score for Chinese
      jp: number; // 0-1 quality score for Japanese
      en: number; // 0-1 quality score for English
    };
  };
}