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

// Types
export type {
  TTSProvider,
  TTSOptions,
  TTSEmotion,
  TTSResult,
  ProviderStatus,
  CharacterVoiceSettings,
  AudioFormat,
  AudioCacheEntry,
  BatchTTSRequest,
  BatchTTSResult,
  MinimaxVoiceId,
  MinimaxEmotion,
  VoicevoxAudioQuery,
  VoicevoxSpeaker
} from './types';

// Providers
export { MinimaxTTSProvider } from './providers/minimax';
export { VoicevoxTTSProvider, VOICEVOX_SPEAKERS } from './providers/voicevox';

// Services
import { TTSService as TTSServiceClass, createTTSService as createService } from './services/tts-service';
export { TTSServiceClass as TTSService, createService as createTTSService };
export type { TTSServiceConfig } from './services/tts-service';
export { BatchTTSProcessor } from './services/batch-processor';

// Cache
export { AudioCache } from './cache/audio-cache';

// Utilities
export {
  detectEmotion,
  detectEmotionDetailed,
  mapEmotionForCharacter,
  getEmotionIntensity,
  detectAudioFormat,
  getWavInfo,
  formatAudioInfo,
  generateAudioFilename,
  validateAudioBuffer,
  createSilentWav
} from './utils';

export type { DetailedEmotionAnalysis, AudioInfo } from './utils';

/**
 * Default export: Create TTS service with environment configuration
 */
export default createService;
