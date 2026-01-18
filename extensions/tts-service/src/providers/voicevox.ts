/**
 * VOICEVOX TTS Provider
 *
 * Integration with local VOICEVOX engine for Japanese voice synthesis
 * Free and high-quality option for development environment
 */

import type {
  TTSProvider,
  TTSOptions,
  TTSEmotion,
  ProviderStatus,
  CharacterVoiceSettings,
  VoicevoxAudioQuery,
  VoicevoxSpeaker
} from '../types';

/**
 * VOICEVOX speaker ID mapping for characters
 */
export const VOICEVOX_SPEAKERS = {
  // Shikoku Metan styles
  SHIKOKU_METAN_NORMAL: 2,
  SHIKOKU_METAN_AMAAM: 0,
  SHIKOKU_METAN_TSUTSU: 6,
  SHIKOKU_METAN_SEXY: 4,

  // Zundamon styles
  ZUNDAMON_NORMAL: 3,
  ZUNDAMON_AMAAM: 1,
  ZUNDAMON_TSUTSU: 7,
  ZUNDAMON_SEXY: 5,
  ZUNDAMON_SASAYAKI: 22,
  ZUNDAMON_HISOISO: 38,

  // Kasukabe Tsumugi
  KASUKABE_TSUMUGI: 8
} as const;

/**
 * VOICEVOX TTS Provider implementation
 */
export class VoicevoxTTSProvider implements TTSProvider {
  readonly name = 'voicevox';
  readonly supportedLanguages = ['jp'];
  readonly supportedEmotions: TTSEmotion[] = [
    'neutral', 'happy', 'serious', 'calm'
  ];

  private baseURL: string;
  private timeout: number;

  constructor(config?: {
    baseURL?: string;
    port?: number;
    timeout?: number;
  }) {
    const port = config?.port || 50021;
    this.baseURL = config?.baseURL || `http://localhost:${port}`;
    this.timeout = config?.timeout || 30000;
  }

  /**
   * Check if VOICEVOX engine is running
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseURL}/version`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<ProviderStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseURL}/version`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const version = await response.text();
        return {
          name: this.name,
          available: true,
          lastChecked: new Date(),
          version: version.replace(/"/g, '')
        };
      }

      return {
        name: this.name,
        available: false,
        lastChecked: new Date(),
        error: `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        name: this.name,
        available: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Generate audio from text using VOICEVOX
   */
  async generateAudio(
    text: string,
    voiceSettings: CharacterVoiceSettings,
    options?: TTSOptions
  ): Promise<ArrayBuffer> {
    const vvSettings = voiceSettings.voicevox;
    const speakerId = vvSettings.speaker;

    // Step 1: Create audio query
    const audioQuery = await this.createAudioQuery(text, speakerId);

    // Step 2: Adjust parameters based on options
    this.adjustQueryParameters(audioQuery, vvSettings, options);

    // Step 3: Synthesize audio
    return await this.synthesizeAudio(audioQuery, speakerId);
  }

  /**
   * Create audio query for text
   */
  private async createAudioQuery(
    text: string,
    speakerId: number
  ): Promise<VoicevoxAudioQuery> {
    const url = `${this.baseURL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`VOICEVOX audio_query failed (${response.status}): ${errorText}`);
      }

      return await response.json() as VoicevoxAudioQuery;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('VOICEVOX audio_query timeout');
      }
      throw error;
    }
  }

  /**
   * Adjust audio query parameters
   */
  private adjustQueryParameters(
    query: VoicevoxAudioQuery,
    vvSettings: CharacterVoiceSettings['voicevox'],
    options?: TTSOptions
  ): void {
    // Apply character-specific settings
    query.speedScale = options?.speed ?? vvSettings.speed ?? 1.0;
    query.pitchScale = options?.pitch ?? 0;
    query.intonationScale = 1.0;
    query.volumeScale = options?.volume ? options.volume / 5 : 1.0;

    // Set output parameters
    query.outputSamplingRate = options?.sampleRate ?? 24000;
    query.outputStereo = false;
  }

  /**
   * Synthesize audio from query
   */
  private async synthesizeAudio(
    audioQuery: VoicevoxAudioQuery,
    speakerId: number
  ): Promise<ArrayBuffer> {
    const url = `${this.baseURL}/synthesis?speaker=${speakerId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(audioQuery),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`VOICEVOX synthesis failed (${response.status}): ${errorText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('VOICEVOX synthesis timeout');
      }
      throw error;
    }
  }

  /**
   * Get available speakers
   */
  async getSpeakers(): Promise<VoicevoxSpeaker[]> {
    try {
      const response = await fetch(`${this.baseURL}/speakers`);
      if (!response.ok) {
        throw new Error(`Failed to get speakers: ${response.status}`);
      }
      return await response.json() as VoicevoxSpeaker[];
    } catch (error) {
      console.error('Failed to get VOICEVOX speakers:', error);
      return [];
    }
  }

  /**
   * Initialize speaker for faster first synthesis
   */
  async initializeSpeaker(speakerId: number): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseURL}/initialize_speaker?speaker=${speakerId}`,
        { method: 'POST' }
      );
      return response.ok;
    } catch (error) {
      console.warn(`Failed to initialize speaker ${speakerId}:`, error);
      return false;
    }
  }

  /**
   * Map emotion to speaker style
   */
  static mapEmotionToStyle(
    baseSpeakerId: number,
    emotion: TTSEmotion
  ): number {
    // Map emotions to VOICEVOX styles for Zundamon
    if (baseSpeakerId === 3) {
      switch (emotion) {
        case 'happy':
        case 'excited':
          return VOICEVOX_SPEAKERS.ZUNDAMON_AMAAM; // Sweeter style
        case 'calm':
        case 'serious':
          return VOICEVOX_SPEAKERS.ZUNDAMON_NORMAL;
        default:
          return baseSpeakerId;
      }
    }

    // Map emotions for Shikoku Metan
    if (baseSpeakerId === 2) {
      switch (emotion) {
        case 'happy':
          return VOICEVOX_SPEAKERS.SHIKOKU_METAN_AMAAM;
        case 'serious':
          return VOICEVOX_SPEAKERS.SHIKOKU_METAN_NORMAL;
        default:
          return baseSpeakerId;
      }
    }

    return baseSpeakerId;
  }

  /**
   * Get recommended speaker for character type
   */
  static getRecommendedSpeaker(characterType: string): number {
    switch (characterType.toLowerCase()) {
      case 'gentle':
      case 'host':
        return VOICEVOX_SPEAKERS.SHIKOKU_METAN_NORMAL;
      case 'energetic':
      case 'questioner':
        return VOICEVOX_SPEAKERS.ZUNDAMON_NORMAL;
      case 'analytical':
        return VOICEVOX_SPEAKERS.KASUKABE_TSUMUGI;
      default:
        return VOICEVOX_SPEAKERS.SHIKOKU_METAN_NORMAL;
    }
  }
}
