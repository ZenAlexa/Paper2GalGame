/**
 * Paper2GalGame TTS Service
 *
 * Dual TTS system supporting Minimax and VOICEVOX providers
 * with intelligent caching, emotion detection, and batch processing
 *
 * @example
 * ```typescript
 * import { createTTSService, BatchTTSProcessor } from '@paper2galgame/tts-service';
 *
 * const ttsService = createTTSService();
 * const audioUrl = await ttsService.generateSpeech(
 *   'こんにちは、みなさん！',
 *   'nene',
 *   neneVoiceSettings,
 *   { emotion: 'happy' }
 * );
 * ```
 */

// Providers
export { MinimaxTTSProvider } from './providers/minimax';
export { VOICEVOX_SPEAKERS, VoicevoxTTSProvider } from './providers/voicevox';
// Types
export type {
  AudioCacheEntry,
  AudioFormat,
  BatchTTSRequest,
  BatchTTSResult,
  CharacterVoiceSettings,
  MinimaxTTSRequest,
  MinimaxTTSResponse,
  MinimaxVoiceId,
  ProviderStatus,
  TTSEmotion,
  TTSOptions,
  TTSProvider,
  TTSResult,
  VoicevoxAudioQuery,
  VoicevoxSpeaker,
} from './types';

// Services
import { createTTSService as createService, TTSService as TTSServiceClass } from './services/tts-service';
export { TTSServiceClass as TTSService, createService as createTTSService };

// Cache
export { AudioCache } from './cache/audio-cache';
export { BatchTTSProcessor } from './services/batch-processor';
export type { TTSServiceConfig } from './services/tts-service';
export type { AudioInfo, DetailedEmotionAnalysis } from './utils';
// Utilities
export {
  createSilentWav,
  detectAudioFormat,
  detectEmotion,
  detectEmotionDetailed,
  formatAudioInfo,
  generateAudioFilename,
  getEmotionIntensity,
  getWavInfo,
  mapEmotionForCharacter,
  validateAudioBuffer,
} from './utils';

/**
 * Default export: Create TTS service with environment configuration
 */
export default createService;
