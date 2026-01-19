/**
 * Audio Utilities
 *
 * Helper functions for audio processing and conversion
 */

import type { AudioFormat } from '../types';

/**
 * Audio file info
 */
export interface AudioInfo {
  format: AudioFormat;
  sampleRate: number;
  channels: number;
  duration?: number;
  bitDepth?: number;
  size: number;
}

/**
 * Detect audio format from buffer
 */
export function detectAudioFormat(buffer: ArrayBuffer): AudioFormat | null {
  const view = new Uint8Array(buffer);

  // Check for MP3 (ID3 tag or frame sync)
  if (
    (view[0] === 0x49 && view[1] === 0x44 && view[2] === 0x33) || // ID3
    (view[0] === 0xff && (view[1] & 0xe0) === 0xe0) // Frame sync
  ) {
    return 'mp3';
  }

  // Check for WAV (RIFF header)
  if (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46) {
    return 'wav';
  }

  // Check for FLAC
  if (view[0] === 0x66 && view[1] === 0x4c && view[2] === 0x61 && view[3] === 0x43) {
    return 'flac';
  }

  // Check for OGG
  if (view[0] === 0x4f && view[1] === 0x67 && view[2] === 0x67 && view[3] === 0x53) {
    return 'ogg';
  }

  return null;
}

/**
 * Get WAV file info
 */
export function getWavInfo(buffer: ArrayBuffer): AudioInfo | null {
  const view = new DataView(buffer);

  // Verify RIFF header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') return null;

  // Verify WAVE format
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (wave !== 'WAVE') return null;

  // Find fmt chunk
  let offset = 12;
  while (offset < buffer.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      const channels = view.getUint16(offset + 10, true);
      const sampleRate = view.getUint32(offset + 12, true);
      const bitDepth = view.getUint16(offset + 22, true);

      // Calculate duration from data chunk
      let dataSize = 0;
      let dataOffset = offset + 8 + chunkSize;
      while (dataOffset < buffer.byteLength - 8) {
        const dataChunkId = String.fromCharCode(
          view.getUint8(dataOffset),
          view.getUint8(dataOffset + 1),
          view.getUint8(dataOffset + 2),
          view.getUint8(dataOffset + 3)
        );
        if (dataChunkId === 'data') {
          dataSize = view.getUint32(dataOffset + 4, true);
          break;
        }
        dataOffset += 8 + view.getUint32(dataOffset + 4, true);
      }

      const duration = dataSize / (sampleRate * channels * (bitDepth / 8));

      return {
        format: 'wav',
        sampleRate,
        channels,
        duration,
        bitDepth,
        size: buffer.byteLength,
      };
    }

    offset += 8 + chunkSize;
  }

  return null;
}

/**
 * Convert WAV to basic format info string
 */
export function formatAudioInfo(info: AudioInfo): string {
  const parts = [info.format.toUpperCase(), `${info.sampleRate}Hz`, `${info.channels}ch`];

  if (info.bitDepth) {
    parts.push(`${info.bitDepth}bit`);
  }

  if (info.duration) {
    parts.push(`${info.duration.toFixed(2)}s`);
  }

  return parts.join(', ');
}

/**
 * Estimate audio duration from file size (rough estimate for MP3)
 */
export function estimateMp3Duration(sizeBytes: number, bitrate: number = 128000): number {
  // Duration = Size / (Bitrate / 8)
  return sizeBytes / (bitrate / 8);
}

/**
 * Generate WebGAL-compatible audio filename
 */
export function generateAudioFilename(characterId: string, index: number, format: AudioFormat = 'mp3'): string {
  const paddedIndex = index.toString().padStart(3, '0');
  return `${characterId}_${paddedIndex}.${format}`;
}

/**
 * Parse WebGAL vocal filename
 */
export function parseVocalFilename(filename: string): {
  characterId: string;
  index: number;
  format: string;
} | null {
  const match = filename.match(/^(\w+)_(\d+)\.(\w+)$/);
  if (!match) return null;

  return {
    characterId: match[1],
    index: parseInt(match[2], 10),
    format: match[3],
  };
}

/**
 * Validate audio buffer integrity
 */
export function validateAudioBuffer(
  buffer: ArrayBuffer,
  expectedFormat?: AudioFormat
): { valid: boolean; error?: string } {
  if (buffer.byteLength === 0) {
    return { valid: false, error: 'Empty buffer' };
  }

  if (buffer.byteLength < 100) {
    return { valid: false, error: 'Buffer too small' };
  }

  const detectedFormat = detectAudioFormat(buffer);

  if (!detectedFormat) {
    return { valid: false, error: 'Unknown audio format' };
  }

  if (expectedFormat && detectedFormat !== expectedFormat) {
    return {
      valid: false,
      error: `Format mismatch: expected ${expectedFormat}, got ${detectedFormat}`,
    };
  }

  return { valid: true };
}

/**
 * Create silent WAV buffer
 */
export function createSilentWav(durationMs: number, sampleRate: number = 24000): ArrayBuffer {
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataSize = numSamples * 2; // 16-bit mono
  const bufferSize = 44 + dataSize; // WAV header + data

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Data is already zeroed (silence)

  return buffer;
}

/**
 * Write string to DataView
 */
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Concatenate multiple audio buffers (WAV only)
 */
export function concatenateWavBuffers(buffers: ArrayBuffer[]): ArrayBuffer | null {
  if (buffers.length === 0) return null;
  if (buffers.length === 1) return buffers[0];

  // Get info from first buffer to verify compatibility
  const firstInfo = getWavInfo(buffers[0]);
  if (!firstInfo) return null;

  // Calculate total data size
  let totalDataSize = 0;
  const dataParts: Uint8Array[] = [];

  for (const buffer of buffers) {
    const view = new DataView(buffer);
    let offset = 12;

    while (offset < buffer.byteLength - 8) {
      const chunkId = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === 'data') {
        const data = new Uint8Array(buffer, offset + 8, chunkSize);
        dataParts.push(data);
        totalDataSize += chunkSize;
        break;
      }

      offset += 8 + chunkSize;
    }
  }

  // Create new buffer
  const resultSize = 44 + totalDataSize;
  const result = new ArrayBuffer(resultSize);
  const resultView = new DataView(result);
  const resultBytes = new Uint8Array(result);

  // Copy header from first buffer
  resultBytes.set(new Uint8Array(buffers[0], 0, 44), 0);

  // Update sizes
  resultView.setUint32(4, resultSize - 8, true);
  resultView.setUint32(40, totalDataSize, true);

  // Copy data parts
  let dataOffset = 44;
  for (const part of dataParts) {
    resultBytes.set(part, dataOffset);
    dataOffset += part.length;
  }

  return result;
}
