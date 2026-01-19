/**
 * Paper TTS Module - Exports
 *
 * Provides TTS (Text-to-Speech) integration for the Paper module.
 * Handles communication with the backend TTS service for generating
 * Japanese voice audio for dialogues.
 *
 * Usage:
 * ```typescript
 * import { TTSClient, VocalMap } from '@/Paper/tts';
 *
 * // Generate vocals for a session
 * const result = await TTSClient.generateVocals(sessionId);
 *
 * // Fetch vocal map after generation
 * const vocalMap = await TTSClient.fetchVocalMap(sessionId);
 *
 * // Or combine both in one call
 * const vocalMap = await TTSClient.generateAndFetchVocals(sessionId);
 * ```
 */

// Export types
export type {
  TTSEmotion,
  VocalMap,
  AudioFileInfo,
  TTSGenerationResult,
  SessionAudioData,
  TTSGenerationOptions,
  TTSProgressCallback,
  TTSGenerationState,
  TTSStatus,
} from './types';

// Export client
export { TTSClient } from './TTSClient';
