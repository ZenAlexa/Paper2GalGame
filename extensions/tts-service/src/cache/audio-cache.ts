/**
 * Audio Cache System
 *
 * Two-tier caching for TTS audio: memory LRU + disk persistence
 * Optimizes for > 80% cache hit rate target
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import type { AudioCacheEntry, TTSEmotion } from '../types';

/**
 * LRU Cache implementation for memory caching
 */
class LRUCache<T> {
  private capacity: number;
  private cache: Map<string, T>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: string): T | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Audio Cache Manager
 */
export class AudioCache {
  private cacheDir: string;
  private memoryCache: LRUCache<AudioCacheEntry>;
  private stats: {
    hits: number;
    misses: number;
    diskReads: number;
    diskWrites: number;
  };

  constructor(config?: {
    cacheDir?: string;
    memoryCacheSize?: number;
  }) {
    this.cacheDir = config?.cacheDir || './public/game/vocal/generated';
    this.memoryCache = new LRUCache(config?.memoryCacheSize || 100);
    this.stats = {
      hits: 0,
      misses: 0,
      diskReads: 0,
      diskWrites: 0
    };
  }

  /**
   * Generate cache key for audio
   */
  generateKey(
    text: string,
    characterId: string,
    emotion: TTSEmotion
  ): string {
    const hash = crypto
      .createHash('md5')
      .update(`${text}:${characterId}:${emotion}`)
      .digest('hex');

    return `${characterId}_${emotion}_${hash.substring(0, 8)}`;
  }

  /**
   * Get cached audio URL
   */
  async get(key: string): Promise<string | null> {
    // Check memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      this.stats.hits++;
      memEntry.lastAccessed = new Date();
      return memEntry.url;
    }

    // Check disk cache
    const filePath = this.getFilePath(key);
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
      this.stats.diskReads++;
      this.stats.hits++;

      // Load into memory cache
      const stats = await fs.promises.stat(filePath);
      const entry: AudioCacheEntry = {
        key,
        filePath,
        url: this.getPublicUrl(key),
        characterId: key.split('_')[0],
        text: '',
        emotion: key.split('_')[1] as TTSEmotion,
        size: stats.size,
        createdAt: stats.birthtime,
        lastAccessed: new Date()
      };
      this.memoryCache.set(key, entry);

      return entry.url;
    } catch {
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Store audio data
   */
  async store(
    key: string,
    audioBuffer: ArrayBuffer,
    metadata?: {
      characterId?: string;
      text?: string;
      emotion?: TTSEmotion;
    }
  ): Promise<string> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);

    // Ensure directory exists
    await fs.promises.mkdir(dir, { recursive: true });

    // Write file
    await fs.promises.writeFile(filePath, Buffer.from(audioBuffer));
    this.stats.diskWrites++;

    // Create cache entry
    const url = this.getPublicUrl(key);
    const entry: AudioCacheEntry = {
      key,
      filePath,
      url,
      characterId: metadata?.characterId || key.split('_')[0],
      text: metadata?.text || '',
      emotion: metadata?.emotion || (key.split('_')[1] as TTSEmotion),
      size: audioBuffer.byteLength,
      createdAt: new Date(),
      lastAccessed: new Date()
    };

    this.memoryCache.set(key, entry);

    return url;
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    if (this.memoryCache.has(key)) {
      return true;
    }

    const filePath = this.getFilePath(key);
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<boolean> {
    this.memoryCache.delete(key);

    const filePath = this.getFilePath(key);
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    try {
      const files = await fs.promises.readdir(this.cacheDir);
      await Promise.all(
        files.map(file =>
          fs.promises.unlink(path.join(this.cacheDir, file))
        )
      );
    } catch (error) {
      console.warn('Failed to clear disk cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryCacheSize: number;
    hitRate: number;
    hits: number;
    misses: number;
    diskReads: number;
    diskWrites: number;
  } {
    const total = this.stats.hits + this.stats.misses;
    return {
      memoryCacheSize: this.memoryCache.size(),
      hitRate: total > 0 ? this.stats.hits / total : 0,
      ...this.stats
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      diskReads: 0,
      diskWrites: 0
    };
  }

  /**
   * Get disk cache size in bytes
   */
  async getDiskCacheSize(): Promise<number> {
    try {
      const files = await fs.promises.readdir(this.cacheDir);
      let totalSize = 0;

      for (const file of files) {
        const stats = await fs.promises.stat(path.join(this.cacheDir, file));
        totalSize += stats.size;
      }

      return totalSize;
    } catch {
      return 0;
    }
  }

  /**
   * Clean old cache entries
   */
  async cleanOldEntries(maxAgeDays: number = 7): Promise<number> {
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let cleaned = 0;

    try {
      const files = await fs.promises.readdir(this.cacheDir);

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.promises.stat(filePath);

        if (now - stats.mtimeMs > maxAge) {
          await fs.promises.unlink(filePath);
          cleaned++;

          // Also remove from memory cache
          const key = path.basename(file, path.extname(file));
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.warn('Failed to clean old cache entries:', error);
    }

    return cleaned;
  }

  /**
   * Get file path for cache key
   */
  private getFilePath(key: string): string {
    return path.join(this.cacheDir, `${key}.mp3`);
  }

  /**
   * Get public URL for WebGAL
   */
  private getPublicUrl(key: string): string {
    return `/game/vocal/generated/${key}.mp3`;
  }
}
