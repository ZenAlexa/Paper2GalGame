/**
 * Minimax TTS Provider
 *
 * Integration with Minimax Speech-02 API for high-quality voice synthesis
 * Supports multiple female voices with emotion control
 */

import type {
  TTSProvider,
  TTSOptions,
  TTSEmotion,
  ProviderStatus,
  CharacterVoiceSettings,
  MinimaxTTSRequest,
  MinimaxTTSResponse,
  MinimaxVoiceId,
  MinimaxEmotion
} from '../types';

/**
 * Minimax TTS Provider implementation
 */
export class MinimaxTTSProvider implements TTSProvider {
  readonly name = 'minimax';
  readonly supportedLanguages = ['zh', 'jp', 'en'];
  readonly supportedEmotions: TTSEmotion[] = [
    'neutral', 'happy', 'serious', 'excited', 'calm', 'sad', 'angry'
  ];

  private apiKey: string;
  private groupId: string;
  private baseURL: string;
  private model: string;

  constructor(config?: {
    apiKey?: string;
    groupId?: string;
    baseURL?: string;
    model?: string;
  }) {
    this.apiKey = config?.apiKey || process.env.MINIMAX_API_KEY || '';
    this.groupId = config?.groupId || process.env.MINIMAX_GROUP_ID || '';
    this.baseURL = config?.baseURL || 'https://api.minimax.chat/v1/t2a_v2';
    this.model = config?.model || 'speech-02-turbo';
  }

  /**
   * Check if Minimax API is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Make a minimal test request
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          text: 'test',
          voice_setting: {
            voice_id: 'Sweet_Girl_2',
            speed: 1.0
          }
        })
      });

      return response.ok || response.status === 200;
    } catch (error) {
      console.error('Minimax availability check failed:', error);
      return false;
    }
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<ProviderStatus> {
    const available = await this.isAvailable();
    return {
      name: this.name,
      available,
      lastChecked: new Date(),
      error: available ? undefined : 'API key not configured or service unavailable',
      version: this.model
    };
  }

  /**
   * Generate audio from text using Minimax API
   */
  async generateAudio(
    text: string,
    voiceSettings: CharacterVoiceSettings,
    options?: TTSOptions
  ): Promise<ArrayBuffer> {
    if (!this.apiKey) {
      throw new Error('Minimax API key not configured');
    }

    const minimaxSettings = voiceSettings.minimax;
    const emotion = this.mapEmotion(options?.emotion || 'neutral');

    const requestBody: MinimaxTTSRequest = {
      model: minimaxSettings.model || this.model,
      text: text,
      voice_setting: {
        voice_id: minimaxSettings.voice,
        speed: options?.speed ?? 1.0,
        vol: options?.volume ?? 5,
        pitch: options?.pitch ?? 0,
        emotion: emotion
      },
      audio_setting: {
        sample_rate: options?.sampleRate ?? 24000,
        bitrate: 128000,
        format: options?.format ?? 'mp3',
        channel: 1
      }
    };

    const response = await this.makeRequest(requestBody);
    return this.extractAudioData(response);
  }

  /**
   * Make API request to Minimax
   */
  private async makeRequest(body: MinimaxTTSRequest): Promise<MinimaxTTSResponse> {
    const url = this.groupId
      ? `${this.baseURL}?GroupId=${this.groupId}`
      : this.baseURL;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Minimax API error (${response.status}): ${errorText}`);
    }

    return await response.json() as MinimaxTTSResponse;
  }

  /**
   * Extract audio data from API response
   */
  private extractAudioData(response: MinimaxTTSResponse): ArrayBuffer {
    // Check for errors
    if (response.base_resp && response.base_resp.status_code !== 0) {
      throw new Error(`Minimax API error: ${response.base_resp.status_msg}`);
    }

    // Try to get audio from different response formats
    let base64Audio: string | undefined;

    if (response.audio_file) {
      base64Audio = response.audio_file;
    } else if (response.data?.audio) {
      base64Audio = response.data.audio;
    }

    if (!base64Audio) {
      throw new Error('No audio data in Minimax response');
    }

    // Decode base64 to ArrayBuffer
    return this.base64ToArrayBuffer(base64Audio);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    // Handle data URL format if present
    const base64Data = base64.includes(',')
      ? base64.split(',')[1]
      : base64;

    // Node.js environment
    if (typeof Buffer !== 'undefined') {
      const buffer = Buffer.from(base64Data, 'base64');
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
    }

    // Browser environment
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Map internal emotion to Minimax emotion format
   */
  private mapEmotion(emotion: TTSEmotion): MinimaxEmotion {
    const emotionMap: Record<TTSEmotion, MinimaxEmotion> = {
      neutral: 'calm',
      happy: 'happy',
      serious: 'calm',
      excited: 'happy',
      calm: 'calm',
      sad: 'sad',
      angry: 'angry'
    };
    return emotionMap[emotion] || 'calm';
  }

  /**
   * Get available voice IDs
   */
  static getAvailableVoices(): MinimaxVoiceId[] {
    return [
      'Sweet_Girl_2',
      'Lively_Girl',
      'Lovely_Girl',
      'Wise_Woman',
      'Young_Girl',
      'Gentle_Woman'
    ];
  }

  /**
   * Validate voice ID
   */
  static isValidVoice(voiceId: string): voiceId is MinimaxVoiceId {
    return MinimaxTTSProvider.getAvailableVoices().includes(voiceId as MinimaxVoiceId);
  }
}
