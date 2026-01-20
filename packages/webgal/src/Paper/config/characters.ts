/**
 * Paper Module - Character Configurations
 * Default character definitions for Paper mode
 */

import type { CharacterPositionMap, PaperCharacter } from '../types';

/**
 * Default character configurations for academic paper narration
 * Maps to the 4-character system: host, energizer, analyst, interpreter
 */
export const PAPER_CHARACTERS: Record<string, PaperCharacter> = {
  host: {
    id: 'host',
    name: { zh: '小樱', jp: 'さくら', en: 'Sakura' },
    paperRole: 'Host and summarizer',
    sprite: { filename: 'stand.webp', defaultPosition: 'center' },
    voice: { provider: 'minimax', voice: 'Japanese_GracefulMaiden', emotion: 'neutral' },
    assignedPhase: 1,
  },
  energizer: {
    id: 'energizer',
    name: { zh: '小雪', jp: 'ゆき', en: 'Yuki' },
    paperRole: 'Energizer and questioner',
    sprite: { filename: 'stand2.webp', defaultPosition: 'right' },
    voice: { provider: 'minimax', voice: 'Japanese_OptimisticYouth', emotion: 'neutral' },
    assignedPhase: 4,
  },
  analyst: {
    id: 'analyst',
    name: { zh: '小雨', jp: 'あめ', en: 'Ame' },
    paperRole: 'Deep analyst and critical thinker',
    sprite: { filename: 'stand.webp', defaultPosition: 'left' },
    voice: { provider: 'minimax', voice: 'Japanese_DecisivePrincess', emotion: 'neutral' },
    assignedPhase: 2,
  },
  interpreter: {
    id: 'interpreter',
    name: { zh: '小风', jp: 'かぜ', en: 'Kaze' },
    paperRole: 'Practical interpreter and relatable explainer',
    sprite: { filename: 'stand2.webp', defaultPosition: 'right' },
    voice: { provider: 'minimax', voice: 'Japanese_CalmLady', emotion: 'neutral' },
    assignedPhase: 3,
  },
};

/**
 * Get character by ID
 */
export function getCharacter(id: string): PaperCharacter | undefined {
  return PAPER_CHARACTERS[id];
}

/**
 * Get all available character IDs
 */
export function getAvailableCharacterIds(): string[] {
  return Object.keys(PAPER_CHARACTERS);
}

/**
 * Build position map from selected characters
 * Generates sprite filename and position for each character
 */
export function buildPositionMap(characterIds: string[]): CharacterPositionMap {
  const map: CharacterPositionMap = {};

  for (const id of characterIds) {
    const character = PAPER_CHARACTERS[id];
    if (character) {
      map[id] = {
        sprite: character.sprite.filename,
        position: character.sprite.defaultPosition,
      };
    }
  }

  // Add fallback for unknown speakers
  map.unknown = {
    sprite: 'stand.webp',
    position: 'center',
  };

  return map;
}

/**
 * Get character display name in specified language
 */
export function getCharacterDisplayName(id: string, language: 'zh' | 'jp' | 'en' = 'jp'): string {
  const character = PAPER_CHARACTERS[id];
  if (!character) return id;
  return character.name[language];
}
