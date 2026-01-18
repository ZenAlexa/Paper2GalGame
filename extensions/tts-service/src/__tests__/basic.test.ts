/**
 * TTS Service Basic Tests
 */

import {
  detectEmotion,
  detectEmotionDetailed,
  mapEmotionForCharacter,
  getEmotionIntensity,
  detectAudioFormat,
  validateAudioBuffer,
  createSilentWav,
  generateAudioFilename,
  parseVocalFilename
} from '../utils';

import { AudioCache } from '../cache/audio-cache';
import type { TTSEmotion } from '../types';

describe('Emotion Detection', () => {
  test('detects happy emotion from keywords', () => {
    const emotion = detectEmotion('太棒了！我很开心！');
    expect(emotion).toBe('happy');
  });

  test('detects excited emotion from multiple exclamations', () => {
    const emotion = detectEmotion('哇！！真的吗！！太厉害了！！');
    expect(emotion).toBe('excited');
  });

  test('detects serious emotion from keywords', () => {
    const emotion = detectEmotion('但是这里有个问题需要讨论...');
    expect(emotion).toBe('serious');
  });

  test('returns neutral for plain text', () => {
    const emotion = detectEmotion('这是一段普通的文字。');
    expect(emotion).toBe('neutral');
  });

  test('detects Japanese emotions', () => {
    expect(detectEmotion('すごい！嬉しい！')).toBe('excited');
    expect(detectEmotion('残念ですね...')).toBe('sad');
  });

  test('detailed analysis returns indicators', () => {
    const analysis = detectEmotionDetailed('诶诶！这个好有趣！');
    expect(analysis.emotion).toBe('excited');
    expect(analysis.confidence).toBeGreaterThan(0);
    expect(analysis.indicators.length).toBeGreaterThan(0);
  });
});

describe('Emotion Mapping for Characters', () => {
  test('gentle character tones down excited', () => {
    const mapped = mapEmotionForCharacter('excited', 'gentle');
    expect(mapped).toBe('happy');
  });

  test('energetic character amplifies happy', () => {
    const mapped = mapEmotionForCharacter('happy', 'energetic');
    expect(mapped).toBe('excited');
  });

  test('analytical character subdues emotions', () => {
    const mapped = mapEmotionForCharacter('excited', 'analytical');
    expect(mapped).toBe('happy');
  });
});

describe('Emotion Intensity', () => {
  test('high intensity for emotional text', () => {
    const intensity = getEmotionIntensity('哇！！太棒了！！');
    expect(intensity).toBeGreaterThan(0.3);
  });

  test('low intensity for plain text', () => {
    const intensity = getEmotionIntensity('好的，我明白了。');
    expect(intensity).toBeLessThan(0.3);
  });
});

describe('Audio Format Detection', () => {
  test('detects WAV format', () => {
    const wavHeader = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // size
      0x57, 0x41, 0x56, 0x45  // WAVE
    ]);
    const format = detectAudioFormat(wavHeader.buffer);
    expect(format).toBe('wav');
  });

  test('detects MP3 with ID3 tag', () => {
    const mp3Header = new Uint8Array([
      0x49, 0x44, 0x33, // ID3
      0x04, 0x00, 0x00
    ]);
    const format = detectAudioFormat(mp3Header.buffer);
    expect(format).toBe('mp3');
  });

  test('detects MP3 frame sync', () => {
    const mp3Header = new Uint8Array([
      0xff, 0xfb, 0x90, 0x00
    ]);
    const format = detectAudioFormat(mp3Header.buffer);
    expect(format).toBe('mp3');
  });

  test('returns null for unknown format', () => {
    const unknownHeader = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    const format = detectAudioFormat(unknownHeader.buffer);
    expect(format).toBeNull();
  });
});

describe('Audio Buffer Validation', () => {
  test('invalid for empty buffer', () => {
    const result = validateAudioBuffer(new ArrayBuffer(0));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Empty buffer');
  });

  test('invalid for too small buffer', () => {
    const result = validateAudioBuffer(new ArrayBuffer(50));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Buffer too small');
  });
});

describe('Silent WAV Generation', () => {
  test('creates valid WAV buffer', () => {
    const buffer = createSilentWav(1000, 24000);
    expect(buffer.byteLength).toBeGreaterThan(44); // Header size

    const format = detectAudioFormat(buffer);
    expect(format).toBe('wav');
  });

  test('creates correct duration', () => {
    const durationMs = 500;
    const sampleRate = 24000;
    const buffer = createSilentWav(durationMs, sampleRate);

    // Expected size: header (44) + samples * 2 bytes
    const expectedSamples = Math.floor((sampleRate * durationMs) / 1000);
    const expectedSize = 44 + expectedSamples * 2;

    expect(buffer.byteLength).toBe(expectedSize);
  });
});

describe('Audio Filename Utilities', () => {
  test('generates correct filename', () => {
    const filename = generateAudioFilename('nene', 1);
    expect(filename).toBe('nene_001.mp3');
  });

  test('generates with custom format', () => {
    const filename = generateAudioFilename('murasame', 42, 'wav');
    expect(filename).toBe('murasame_042.wav');
  });

  test('parses valid filename', () => {
    const parsed = parseVocalFilename('nene_001.mp3');
    expect(parsed).toEqual({
      characterId: 'nene',
      index: 1,
      format: 'mp3'
    });
  });

  test('returns null for invalid filename', () => {
    const parsed = parseVocalFilename('invalid-filename');
    expect(parsed).toBeNull();
  });
});

describe('Audio Cache', () => {
  let cache: AudioCache;

  beforeEach(() => {
    cache = new AudioCache({
      cacheDir: '/tmp/test-cache',
      memoryCacheSize: 10
    });
  });

  test('generates consistent cache keys', () => {
    const key1 = cache.generateKey('text', 'nene', 'happy');
    const key2 = cache.generateKey('text', 'nene', 'happy');
    expect(key1).toBe(key2);
  });

  test('generates different keys for different inputs', () => {
    const key1 = cache.generateKey('text1', 'nene', 'happy');
    const key2 = cache.generateKey('text2', 'nene', 'happy');
    expect(key1).not.toBe(key2);
  });

  test('generates different keys for different emotions', () => {
    const key1 = cache.generateKey('text', 'nene', 'happy');
    const key2 = cache.generateKey('text', 'nene', 'serious');
    expect(key1).not.toBe(key2);
  });

  test('initial stats are zero', () => {
    const stats = cache.getStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });
});
