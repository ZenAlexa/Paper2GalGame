/**
 * Paper TTS Module - Type Definitions
 *
 * Types for TTS integration within the Paper module.
 * These types define the interface between the frontend Paper module
 * and the backend TTS service.
 */

/**
 * TTS Emotion types (matches backend TTSEmotion)
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
 * Map of dialogue IDs to audio URLs
 */
export type VocalMap = Record<string, string>;

/**
 * Single audio file information
 */
export interface AudioFileInfo {
  /** Dialogue ID this audio corresponds to */
  dialogueId: string;
  /** Filename of the audio file */
  filename: string;
  /** Public URL to access the audio */
  url: string;
  /** Duration in seconds (estimated) */
  duration: number;
}

/**
 * Result of TTS generation request
 */
export interface TTSGenerationResult {
  /** Whether generation was successful */
  success: boolean;
  /** Session ID */
  sessionId: string;
  /** Audio generation statistics */
  audio?: {
    /** Total number of audio files generated */
    totalFiles: number;
    /** Total estimated duration in seconds */
    totalDuration: number;
    /** Success rate percentage (0-100) */
    successRate: number;
  };
  /** Error information if generation failed */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Session audio data stored on the server
 */
export interface SessionAudioData {
  /** List of generated audio files */
  files: AudioFileInfo[];
  /** Total duration of all audio */
  totalDuration: number;
}

/**
 * Options for TTS generation
 */
export interface TTSGenerationOptions {
  /** TTS provider to use ('minimax' or 'voicevox') */
  provider?: 'minimax' | 'voicevox';
  /** Timeout in milliseconds (default: 300000 = 5 minutes) */
  timeout?: number;
}

/**
 * Progress callback for TTS generation
 * Note: Currently not used as API is synchronous,
 * but included for future async implementation
 */
export type TTSProgressCallback = (
  completed: number,
  total: number,
  currentItem?: string
) => void;

/**
 * TTS generation state (for UI state management)
 */
export type TTSGenerationState =
  | 'idle'
  | 'generating'
  | 'completed'
  | 'error';

/**
 * TTS status information
 */
export interface TTSStatus {
  /** Current generation state */
  state: TTSGenerationState;
  /** Progress information */
  progress: {
    completed: number;
    total: number;
    currentItem?: string;
  };
  /** Error message if state is 'error' */
  errorMessage?: string;
}
