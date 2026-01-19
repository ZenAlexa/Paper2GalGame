/**
 * TTS Service Type Definitions
 *
 * Core types for text-to-speech synthesis providers
 */

/**
 * Emotion types supported by TTS providers
 */
export type TTSEmotion = 'neutral' | 'happy' | 'serious' | 'excited' | 'calm' | 'sad' | 'angry';

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
 * Note: GroupId is no longer needed for new Minimax API (api.minimax.io)
 */
export interface MinimaxConfig extends TTSProviderConfig {
  name: 'minimax';
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
 * Minimax official Japanese voice IDs
 * Reference: https://platform.minimax.io/docs/faq/system-voice-id
 */
export type MinimaxVoiceId =
  // Japanese female voices
  | 'Japanese_KindLady' // Kind Lady - warm, friendly
  | 'Japanese_GracefulMaiden' // Graceful Maiden - elegant, soft
  | 'Japanese_CalmLady' // Calm Lady - composed, mature
  | 'Japanese_DecisivePrincess' // Decisive Princess - confident
  | 'Japanese_ColdQueen' // Cold Queen - cool, dignified
  | 'Japanese_DependableWoman' // Dependable Woman - reliable
  // Japanese male voices
  | 'Japanese_IntellectualSenior' // Intellectual Senior - wise
  | 'Japanese_GentleButler' // Gentle Butler - polite
  | 'Japanese_LoyalKnight' // Loyal Knight - loyal
  | 'Japanese_DominantMan' // Dominant Man - strong
  | 'Japanese_SeriousCommander' // Serious Commander - authoritative
  // Japanese youth voices
  | 'Japanese_OptimisticYouth' // Optimistic Youth - energetic
  | 'Japanese_SportyStudent' // Sporty Student - active
  | 'Japanese_InnocentBoy' // Innocent Boy - innocent
  | 'Japanese_GenerousIzakayaOwner'; // Izakaya Owner - friendly

/**
 * Minimax HTTP API request body
 * Reference: https://platform.minimax.io/docs/api-reference/speech-t2a-http
 */
export interface MinimaxTTSRequest {
  /** Model version: speech-2.6-hd, speech-2.6-turbo, speech-02-hd, speech-02-turbo */
  model: string;
  /** Text to synthesize (max 10,000 characters) */
  text: string;
  /** Enable streaming output */
  stream?: boolean;
  /** Language hint (auto, English, Japanese, Chinese, etc.) */
  language_boost?: string;
  /** Output format: hex (default) or url */
  output_format?: 'hex' | 'url';
  /** Voice configuration */
  voice_setting: {
    voice_id: string;
    speed?: number;
    vol?: number;
    pitch?: number;
  };
  /** Audio output configuration */
  audio_setting?: {
    sample_rate?: number;
    bitrate?: number;
    format?: string;
    channel?: number;
  };
  /** Voice modification effects */
  voice_modify?: {
    pitch?: number;
    intensity?: number;
    timbre?: number;
    sound_effects?: string;
  };
}

/**
 * Minimax HTTP API response
 * Note: Audio is hex-encoded (not base64)
 * Reference: https://platform.minimax.io/docs/api-reference/speech-t2a-http
 */
export interface MinimaxTTSResponse {
  /** Hex-encoded audio data */
  data?: {
    audio?: string;
    status?: number;
  };

  /** Extra information about the generated audio */
  extra_info?: {
    audio_length?: number;
    audio_sample_rate?: number;
    audio_size?: number;
    word_count?: number;
    usage_characters?: number;
  };

  /** Request trace ID */
  trace_id?: string;

  /** Response status */
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
  generateAudio(text: string, voiceSettings: CharacterVoiceSettings, options?: TTSOptions): Promise<ArrayBuffer>;

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
