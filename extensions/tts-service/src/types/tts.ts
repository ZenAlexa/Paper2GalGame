/**
 * TTS Service Type Definitions
 *
 * Core types for text-to-speech synthesis providers
 */

/**
 * Emotion types supported by TTS providers
 */
export type TTSEmotion =
  | 'neutral'
  | 'happy'
  | 'serious'
  | 'excited'
  | 'calm'
  | 'sad'
  | 'angry';

/**
 * Audio format options
 */
export type AudioFormat = 'mp3' | 'wav' | 'flac' | 'ogg' | 'aac' | 'opus' | 'pcm';

/**
 * TTS generation options
 */
export interface TTSOptions {
  /** Emotion/mood for voice synthesis */
  emotion?: TTSEmotion;

  /** Speech speed (0.5-2.0, default: 1.0) */
  speed?: number;

  /** Pitch adjustment (-12 to 12, default: 0) */
  pitch?: number;

  /** Volume level (0-10, default: 5) */
  volume?: number;

  /** Output audio format */
  format?: AudioFormat;

  /** Sample rate in Hz */
  sampleRate?: 16000 | 24000 | 32000 | 44100 | 48000;

  /** Enable streaming output */
  streaming?: boolean;

  /** Custom voice parameters */
  customParams?: Record<string, unknown>;
}

/**
 * TTS generation result
 */
export interface TTSResult {
  /** Generated audio data */
  audioBuffer: ArrayBuffer;

  /** Audio format */
  format: AudioFormat;

  /** Audio duration in seconds */
  duration?: number;

  /** Sample rate */
  sampleRate: number;

  /** Provider that generated the audio */
  provider: string;

  /** Character ID */
  characterId: string;

  /** Generation timestamp */
  timestamp: Date;

  /** Cache key for this result */
  cacheKey?: string;
}

/**
 * TTS provider configuration
 */
export interface TTSProviderConfig {
  /** Provider name */
  name: string;

  /** API endpoint URL */
  endpoint: string;

  /** API key (if required) */
  apiKey?: string;

  /** Additional configuration */
  options?: Record<string, unknown>;
}

/**
 * Minimax-specific configuration
 */
export interface MinimaxConfig extends TTSProviderConfig {
  name: 'minimax';
  /** Group ID for Minimax API */
  groupId?: string;
  /** Model version */
  model?: 'speech-02-turbo' | 'speech-02-hd' | 'speech-2.6-turbo' | 'speech-2.6-hd';
}

/**
 * VOICEVOX-specific configuration
 */
export interface VoicevoxConfig extends TTSProviderConfig {
  name: 'voicevox';
  /** Local service port */
  port?: number;
}

/**
 * Provider status information
 */
export interface ProviderStatus {
  /** Provider name */
  name: string;

  /** Whether provider is available */
  available: boolean;

  /** Last check timestamp */
  lastChecked: Date;

  /** Error message if unavailable */
  error?: string;

  /** Provider version info */
  version?: string;
}

/**
 * Minimax voice IDs for female characters
 */
export type MinimaxVoiceId =
  | 'Sweet_Girl_2'    // Gentle, sweet voice
  | 'Lively_Girl'     // Energetic voice
  | 'Lovely_Girl'     // Cute voice
  | 'Wise_Woman'      // Mature voice
  | 'Young_Girl'      // Young voice
  | 'Gentle_Woman';   // Soft voice

/**
 * Minimax emotion options
 */
export type MinimaxEmotion =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'fearful'
  | 'disgusted'
  | 'surprised'
  | 'calm'
  | 'fluent';

/**
 * Minimax API request body
 */
export interface MinimaxTTSRequest {
  model: string;
  text: string;
  voice_setting: {
    voice_id: string;
    speed?: number;
    vol?: number;
    pitch?: number;
    emotion?: string;
  };
  audio_setting?: {
    sample_rate?: number;
    bitrate?: number;
    format?: string;
    channel?: number;
  };
}

/**
 * Minimax API response
 */
export interface MinimaxTTSResponse {
  /** Base64 encoded audio data */
  audio_file?: string;

  /** Audio data in hex format */
  data?: {
    audio?: string;
  };

  /** Error information */
  base_resp?: {
    status_code: number;
    status_msg: string;
  };
}

/**
 * VOICEVOX speaker style
 */
export interface VoicevoxStyle {
  name: string;
  id: number;
}

/**
 * VOICEVOX speaker info
 */
export interface VoicevoxSpeaker {
  name: string;
  speaker_uuid: string;
  styles: VoicevoxStyle[];
  version: string;
}

/**
 * VOICEVOX audio query response
 */
export interface VoicevoxAudioQuery {
  accent_phrases: Array<{
    moras: Array<{
      text: string;
      consonant?: string;
      consonant_length?: number;
      vowel: string;
      vowel_length: number;
      pitch: number;
    }>;
    accent: number;
    pause_mora?: {
      text: string;
      consonant?: string;
      consonant_length?: number;
      vowel: string;
      vowel_length: number;
      pitch: number;
    };
    is_interrogative?: boolean;
  }>;
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
  prePhonemeLength: number;
  postPhonemeLength: number;
  outputSamplingRate: number;
  outputStereo: boolean;
  kana?: string;
}

/**
 * Character voice settings interface (imported from script-generator)
 */
export interface CharacterVoiceSettings {
  voicevox: {
    speaker: number;
    emotion: string;
    speed: number;
  };
  minimax: {
    model: string;
    voice: string;
    emotion: string;
  };
}

/**
 * TTS provider interface
 */
export interface TTSProvider {
  /** Provider name */
  readonly name: string;

  /** Supported languages */
  readonly supportedLanguages: string[];

  /** Supported emotions */
  readonly supportedEmotions: TTSEmotion[];

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Generate audio from text
   */
  generateAudio(
    text: string,
    voiceSettings: CharacterVoiceSettings,
    options?: TTSOptions
  ): Promise<ArrayBuffer>;

  /**
   * Get provider status
   */
  getStatus(): Promise<ProviderStatus>;
}

/**
 * Cache entry for audio
 */
export interface AudioCacheEntry {
  /** Cache key */
  key: string;

  /** File path relative to game assets */
  filePath: string;

  /** URL for WebGAL */
  url: string;

  /** Character ID */
  characterId: string;

  /** Original text */
  text: string;

  /** Emotion used */
  emotion: TTSEmotion;

  /** File size in bytes */
  size: number;

  /** Creation timestamp */
  createdAt: Date;

  /** Last accessed timestamp */
  lastAccessed: Date;
}

/**
 * Batch generation request
 */
export interface BatchTTSRequest {
  /** Unique ID for this batch */
  batchId: string;

  /** Items to generate */
  items: Array<{
    id: string;
    text: string;
    characterId: string;
    emotion?: TTSEmotion;
  }>;

  /** Concurrency limit */
  concurrency?: number;

  /** Progress callback */
  onProgress?: (completed: number, total: number, currentItem?: string) => void;
}

/**
 * Batch generation result
 */
export interface BatchTTSResult {
  /** Batch ID */
  batchId: string;

  /** Successfully generated items */
  successful: Array<{
    id: string;
    url: string;
    cacheKey: string;
  }>;

  /** Failed items */
  failed: Array<{
    id: string;
    error: string;
  }>;

  /** Total processing time in ms */
  totalTime: number;

  /** Cache hit count */
  cacheHits: number;
}
