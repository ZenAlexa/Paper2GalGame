/**
 * Unified TTS Service
 *
 * Main service integrating multiple TTS providers with automatic fallback,
 * caching, and character voice management
 */

import { AudioCache } from '../cache/audio-cache';
import { MinimaxTTSProvider } from '../providers/minimax';
import { VoicevoxTTSProvider } from '../providers/voicevox';
import type { CharacterVoiceSettings, ProviderStatus, TTSEmotion, TTSOptions, TTSProvider } from '../types';

/**
 * TTS Service configuration
 */
export interface TTSServiceConfig {
  /** Preferred provider ('minimax' or 'voicevox') */
  preferredProvider?: 'minimax' | 'voicevox';

  /** Enable automatic fallback */
  enableFallback?: boolean;

  /** Maximum retry attempts */
  maxRetries?: number;

  /** Retry delay in ms */
  retryDelay?: number;

  /** Minimax configuration */
  minimax?: {
    apiKey?: string;
    model?: string;
  };

  /** VOICEVOX configuration */
  voicevox?: {
    baseURL?: string;
    port?: number;
  };

  /** Cache configuration */
  cache?: {
    enabled?: boolean;
    cacheDir?: string;
    memoryCacheSize?: number;
  };
}

/**
 * Unified TTS Service
 */
export class TTSService {
  private providers: Map<string, TTSProvider>;
  private cache: AudioCache | null;
  private config: TTSServiceConfig;
  private preferredProvider: string;

  constructor(config: TTSServiceConfig = {}) {
    this.config = {
      preferredProvider: 'voicevox',
      enableFallback: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.providers = new Map();
    this.preferredProvider = this.config.preferredProvider || 'voicevox';

    // Initialize providers
    this.initializeProviders();

    // Initialize cache
    if (config.cache?.enabled !== false) {
      this.cache = new AudioCache({
        cacheDir: config.cache?.cacheDir,
        memoryCacheSize: config.cache?.memoryCacheSize,
      });
    } else {
      this.cache = null;
    }
  }

  /**
   * Initialize TTS providers
   */
  private initializeProviders(): void {
    // Initialize Minimax provider
    const minimaxProvider = new MinimaxTTSProvider({
      apiKey: this.config.minimax?.apiKey,
      model: this.config.minimax?.model,
    });
    this.providers.set('minimax', minimaxProvider);

    // Initialize VOICEVOX provider
    const voicevoxProvider = new VoicevoxTTSProvider({
      baseURL: this.config.voicevox?.baseURL,
      port: this.config.voicevox?.port,
    });
    this.providers.set('voicevox', voicevoxProvider);
  }

  /**
   * Generate speech from text
   */
  async generateSpeech(
    text: string,
    characterId: string,
    voiceSettings: CharacterVoiceSettings,
    options?: TTSOptions
  ): Promise<string> {
    const emotion: TTSEmotion = options?.emotion || 'neutral';

    // Check cache first
    if (this.cache) {
      const cacheKey = this.cache.generateKey(text, characterId, emotion);
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Select provider and generate
    const audioBuffer = await this.generateWithRetry(text, voiceSettings, options);

    // Store in cache
    if (this.cache) {
      const cacheKey = this.cache.generateKey(text, characterId, emotion);
      return await this.cache.store(cacheKey, audioBuffer, {
        characterId,
        text,
        emotion,
      });
    }

    // Return temporary URL (for non-cached scenarios)
    return this.createTemporaryUrl(audioBuffer);
  }

  /**
   * Generate audio with retry and fallback logic
   */
  private async generateWithRetry(
    text: string,
    voiceSettings: CharacterVoiceSettings,
    options?: TTSOptions
  ): Promise<ArrayBuffer> {
    const providers = this.getProviderOrder();
    let lastError: Error | null = null;

    for (const providerName of providers) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      // Check availability
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        console.warn(`Provider ${providerName} is not available`);
        continue;
      }

      // Attempt generation with retries
      for (let attempt = 1; attempt <= (this.config.maxRetries || 3); attempt++) {
        try {
          return await provider.generateAudio(text, voiceSettings, options);
        } catch (error) {
          lastError = error as Error;
          console.warn(`${providerName} generation failed (attempt ${attempt}):`, error);

          if (attempt < (this.config.maxRetries || 3)) {
            await this.delay(this.config.retryDelay || 1000);
          }
        }
      }

      // If fallback is disabled, throw immediately
      if (!this.config.enableFallback) {
        throw lastError || new Error('TTS generation failed');
      }
    }

    throw lastError || new Error('All TTS providers failed');
  }

  /**
   * Get provider execution order based on preference
   */
  private getProviderOrder(): string[] {
    const allProviders = Array.from(this.providers.keys());
    const preferred = this.preferredProvider;

    // Put preferred provider first
    return [preferred, ...allProviders.filter((p) => p !== preferred)];
  }

  /**
   * Create temporary URL for audio buffer
   */
  private createTemporaryUrl(_buffer: ArrayBuffer): string {
    // In Node.js, this would write to a temp file
    // In browser, this would create a blob URL
    const timestamp = Date.now();
    return `/game/vocal/temp/audio_${timestamp}.mp3`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get all provider statuses
   */
  async getProviderStatuses(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];

    for (const [_name, provider] of this.providers) {
      const status = await provider.getStatus();
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Check if any provider is available
   */
  async isAnyProviderAvailable(): Promise<boolean> {
    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Set preferred provider
   */
  setPreferredProvider(provider: 'minimax' | 'voicevox'): void {
    if (this.providers.has(provider)) {
      this.preferredProvider = provider;
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    if (!this.cache) {
      return null;
    }
    return this.cache.getStats();
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    if (this.cache) {
      await this.cache.clear();
    }
  }

  /**
   * Get specific provider
   */
  getProvider(name: string): TTSProvider | undefined {
    return this.providers.get(name);
  }
}

/**
 * Create TTS service from environment variables
 */
export function createTTSService(): TTSService {
  const provider = process.env.TTS_PROVIDER as 'minimax' | 'voicevox' | undefined;

  return new TTSService({
    preferredProvider: provider || 'voicevox',
    enableFallback: true,
    minimax: {
      apiKey: process.env.MINIMAX_API_KEY,
      model: process.env.MINIMAX_MODEL || 'speech-2.6-hd',
    },
    voicevox: {
      port: parseInt(process.env.VOICEVOX_PORT || '50021', 10),
    },
  });
}
