/**
 * Minimax TTS Provider
 *
 * High-quality Japanese voice synthesis using Minimax Speech API
 * Supports 40+ languages with natural prosody
 * API Reference: https://platform.minimax.io/docs/api-reference/speech-t2a-http
 */

import type {
  CharacterVoiceSettings,
  MinimaxTTSRequest,
  MinimaxTTSResponse,
  MinimaxVoiceId,
  ProviderStatus,
  TTSEmotion,
  TTSOptions,
  TTSProvider,
} from '../types';

/**
 * Minimax TTS Provider
 * HTTP API endpoint: POST /v1/t2a_v2
 * Audio response format: hex-encoded
 */
export class MinimaxTTSProvider implements TTSProvider {
  readonly name = 'minimax';
  readonly supportedLanguages = ['zh', 'ja', 'en'];
  readonly supportedEmotions: TTSEmotion[] = ['neutral', 'happy', 'serious', 'excited', 'calm', 'sad', 'angry'];

  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(config?: {
    apiKey?: string;
    baseURL?: string;
    model?: string;
  }) {
    this.apiKey = config?.apiKey || process.env.MINIMAX_API_KEY || '';
    this.baseURL = config?.baseURL || process.env.MINIMAX_API_URL || 'https://api.minimax.io/v1/t2a_v2';
    // Model configurable via env, defaults to speech-2.6-hd (SOTA as of 2026)
    this.model = config?.model || process.env.MINIMAX_MODEL || 'speech-2.6-hd';
  }

  /**
   * Check API availability with a minimal test request
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          text: 'テスト',
          voice_setting: {
            voice_id: 'Japanese_GracefulMaiden',
            speed: 1.0,
            vol: 1,
            pitch: 0,
          },
        }),
      });

      return response.ok || response.status === 200;
    } catch (error) {
      console.error('Minimax availability check failed:', error);
      return false;
    }
  }

  /**
   * Get current provider status
   */
  async getStatus(): Promise<ProviderStatus> {
    const available = await this.isAvailable();
    return {
      name: this.name,
      available,
      lastChecked: new Date(),
      error: available ? undefined : 'API key not configured or service unavailable',
      version: this.model,
    };
  }

  /**
   * Generate audio from text
   * Note: HTTP API does not support emotion parameter
   */
  async generateAudio(text: string, voiceSettings: CharacterVoiceSettings, options?: TTSOptions): Promise<ArrayBuffer> {
    if (!this.apiKey) {
      throw new Error('Minimax API key not configured');
    }

    const minimaxSettings = voiceSettings.minimax;
    const modelName = minimaxSettings.model || this.model;

    const requestBody: MinimaxTTSRequest = {
      model: modelName,
      text: text,
      stream: false,
      voice_setting: {
        voice_id: minimaxSettings.voice,
        speed: options?.speed ?? 1.0,
        vol: options?.volume ?? 1,
        pitch: options?.pitch ?? 0,
      },
      audio_setting: {
        sample_rate: options?.sampleRate ?? 32000,
        bitrate: 128000,
        format: options?.format ?? 'mp3',
        channel: 1,
      },
    };

    const response = await this.makeRequest(requestBody);
    return this.extractAudioData(response);
  }

  /**
   * Send request to Minimax API
   */
  private async makeRequest(body: MinimaxTTSRequest): Promise<MinimaxTTSResponse> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Minimax API error (${response.status}): ${errorText}`);
    }

    return (await response.json()) as MinimaxTTSResponse;
  }

  /**
   * Extract audio data from hex-encoded response
   */
  private extractAudioData(response: MinimaxTTSResponse): ArrayBuffer {
    if (response.base_resp && response.base_resp.status_code !== 0) {
      throw new Error(`Minimax API error: ${response.base_resp.status_msg}`);
    }

    const hexAudio = response.data?.audio;
    if (!hexAudio) {
      throw new Error('No audio data in Minimax response');
    }

    return this.hexToArrayBuffer(hexAudio);
  }

  /**
   * Convert hex string to ArrayBuffer
   */
  private hexToArrayBuffer(hex: string): ArrayBuffer {
    const cleanHex = hex.replace(/\s/g, '').replace(/^0x/i, '');

    if (typeof Buffer !== 'undefined') {
      const buffer = Buffer.from(cleanHex, 'hex');
      const arrayBuffer = new ArrayBuffer(buffer.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
      return arrayBuffer;
    }

    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return bytes.buffer;
  }

  /**
   * Available Japanese voice IDs
   * Reference: https://platform.minimax.io/docs/faq/system-voice-id
   */
  static getAvailableVoices(): MinimaxVoiceId[] {
    return [
      // Female voices - suitable for narration
      'Japanese_GracefulMaiden', // Elegant, soft - ideal for host
      'Japanese_KindLady', // Warm, friendly
      'Japanese_CalmLady', // Composed, mature
      'Japanese_DecisivePrincess', // Confident, clear
      'Japanese_ColdQueen', // Cool, dignified
      'Japanese_DependableWoman', // Reliable, steady
      // Male voices
      'Japanese_IntellectualSenior', // Wise, scholarly
      'Japanese_GentleButler', // Polite, refined
      'Japanese_LoyalKnight', // Loyal, strong
      'Japanese_DominantMan', // Authoritative
      'Japanese_SeriousCommander', // Commanding presence
      // Youth voices
      'Japanese_OptimisticYouth', // Energetic, lively
      'Japanese_SportyStudent', // Active, enthusiastic
      'Japanese_InnocentBoy', // Innocent, curious
      'Japanese_GenerousIzakayaOwner', // Friendly, welcoming
    ];
  }

  /**
   * Recommended voices for academic narration
   */
  static getRecommendedVoices(): MinimaxVoiceId[] {
    return [
      'Japanese_GracefulMaiden', // Host - elegant narrator
      'Japanese_OptimisticYouth', // Energizer - lively discussion
      'Japanese_DecisivePrincess', // Analyst - clear analysis
      'Japanese_CalmLady', // Interpreter - composed explanation
    ];
  }

  /**
   * Validate voice ID
   */
  static isValidVoice(voiceId: string): voiceId is MinimaxVoiceId {
    return MinimaxTTSProvider.getAvailableVoices().includes(voiceId as MinimaxVoiceId);
  }
}
