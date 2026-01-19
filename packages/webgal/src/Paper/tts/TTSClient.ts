/**
 * Paper TTS Module - API Client
 *
 * Client for communicating with the backend TTS service.
 * Handles TTS generation requests and vocal map retrieval.
 */

import type { SessionAudioData, TTSGenerationOptions, TTSGenerationResult, VocalMap } from './types';

/**
 * Default API base URL
 * In production, this would be configured via environment
 */
const API_BASE_URL = '/api';

/**
 * Default timeout for TTS generation (5 minutes)
 */
const DEFAULT_TIMEOUT = 300000;

/**
 * TTSClient - Handles communication with the TTS backend service
 *
 * This client provides methods to:
 * - Generate TTS audio for a session
 * - Retrieve vocal maps for scenes
 * - Check TTS service availability
 */
export class TTSClient {
  /**
   * Generate TTS vocals for all dialogues in a session
   *
   * This is a synchronous operation that waits for all audio to be generated.
   * For large scripts, this may take several minutes.
   *
   * @param sessionId - Session ID from /api/generate
   * @param options - Generation options
   * @returns Generation result with audio statistics
   */
  static async generateVocals(sessionId: string, options: TTSGenerationOptions = {}): Promise<TTSGenerationResult> {
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;

    console.log('[TTSClient] Starting TTS generation for session:', sessionId);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${API_BASE_URL}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          provider: options.provider,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (!response.ok) {
        console.error('[TTSClient] TTS generation failed:', result.error);
        return {
          success: false,
          sessionId,
          error: result.error || {
            code: 'TTS_ERROR',
            message: 'TTS generation failed',
          },
        };
      }

      console.log('[TTSClient] TTS generation complete:', result.data?.audio);

      return {
        success: true,
        sessionId,
        audio: result.data?.audio,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      const errorMessage =
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'TTS generation timed out'
            : error.message
          : 'Unknown error';

      console.error('[TTSClient] TTS generation error:', errorMessage);

      return {
        success: false,
        sessionId,
        error: {
          code: error instanceof Error && error.name === 'AbortError' ? 'TTS_TIMEOUT' : 'TTS_ERROR',
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Fetch the vocal map for a session
   *
   * Retrieves the mapping of dialogue IDs to audio URLs
   * from the session's audio data.
   *
   * @param sessionId - Session ID
   * @returns Map of dialogueId to audio URL
   */
  static async fetchVocalMap(sessionId: string): Promise<VocalMap> {
    console.log('[TTSClient] Fetching vocal map for session:', sessionId);

    try {
      // Fetch session audio data
      const response = await fetch(`${API_BASE_URL}/generate/audio/${sessionId}`);
      const result = await response.json();

      if (!result.success || !result.data) {
        console.warn('[TTSClient] No audio data found for session');
        return {};
      }

      const audioData: SessionAudioData = result.data;
      const vocalMap: VocalMap = {};

      // Build map from audio files
      for (const file of audioData.files) {
        vocalMap[file.dialogueId] = file.url;
      }

      console.log('[TTSClient] Loaded vocal map with', Object.keys(vocalMap).length, 'entries');

      return vocalMap;
    } catch (error) {
      console.error('[TTSClient] Failed to fetch vocal map:', error);
      return {};
    }
  }

  /**
   * Generate vocals and return the vocal map in one call
   *
   * Convenience method that combines generation and map retrieval.
   *
   * @param sessionId - Session ID
   * @param options - Generation options
   * @returns Vocal map (dialogueId → audio URL)
   * @throws Error if generation fails
   */
  static async generateAndFetchVocals(sessionId: string, options: TTSGenerationOptions = {}): Promise<VocalMap> {
    // Generate vocals
    const result = await TTSClient.generateVocals(sessionId, options);

    if (!result.success) {
      throw new Error(result.error?.message || 'TTS generation failed');
    }

    // Fetch the vocal map
    return TTSClient.fetchVocalMap(sessionId);
  }

  /**
   * Check if TTS service is available
   *
   * @returns List of available providers
   */
  static async checkAvailability(): Promise<{
    available: boolean;
    providers: Array<{
      id: string;
      name: string;
      configured: boolean;
    }>;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/tts/providers`);
      const result = await response.json();

      if (!result.success) {
        return { available: false, providers: [] };
      }

      const providers = result.data || [];
      const available = providers.some((p: { configured: boolean }) => p.configured);

      return { available, providers };
    } catch (error) {
      console.error('[TTSClient] Failed to check TTS availability:', error);
      return { available: false, providers: [] };
    }
  }

  /**
   * Check if a session has TTS audio generated
   *
   * @param sessionId - Session ID
   * @returns True if audio exists for this session
   */
  static async hasAudio(sessionId: string): Promise<boolean> {
    try {
      const vocalMap = await TTSClient.fetchVocalMap(sessionId);
      return Object.keys(vocalMap).length > 0;
    } catch {
      return false;
    }
  }
}
