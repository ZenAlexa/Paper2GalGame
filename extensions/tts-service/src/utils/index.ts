/**
 * TTS Utilities Export
 */

export {
  detectEmotion,
  detectEmotionDetailed,
  mapEmotionForCharacter,
  getEmotionIntensity
} from './emotion-detector';

export type { DetailedEmotionAnalysis } from './emotion-detector';

export {
  detectAudioFormat,
  getWavInfo,
  formatAudioInfo,
  estimateMp3Duration,
  generateAudioFilename,
  parseVocalFilename,
  validateAudioBuffer,
  createSilentWav,
  concatenateWavBuffers
} from './audio-utils';

export type { AudioInfo } from './audio-utils';
