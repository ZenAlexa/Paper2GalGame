/**
 * TTS Utilities Export
 */

export type { AudioInfo } from './audio-utils';
export {
  concatenateWavBuffers,
  createSilentWav,
  detectAudioFormat,
  estimateMp3Duration,
  formatAudioInfo,
  generateAudioFilename,
  getWavInfo,
  parseVocalFilename,
  validateAudioBuffer,
} from './audio-utils';
export type { DetailedEmotionAnalysis } from './emotion-detector';
export {
  detectEmotion,
  detectEmotionDetailed,
  getEmotionIntensity,
  mapEmotionForCharacter,
} from './emotion-detector';
