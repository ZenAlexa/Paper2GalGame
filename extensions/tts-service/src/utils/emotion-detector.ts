/**
 * Emotion Detection Utilities
 *
 * Advanced emotion detection for Japanese/Chinese text
 */

import type { TTSEmotion } from '../types';

/**
 * Emotion detection result with detailed analysis
 */
export interface DetailedEmotionAnalysis {
  /** Primary detected emotion */
  emotion: TTSEmotion;

  /** Confidence score (0-1) */
  confidence: number;

  /** Individual factor scores */
  factors: {
    punctuation: number;
    keywords: number;
    patterns: number;
  };

  /** Detected indicators */
  indicators: string[];
}

/**
 * Emotion detection configuration
 */
interface EmotionConfig {
  keywords: string[];
  patterns: RegExp[];
  weight: number;
}

/**
 * Emotion detection rules
 */
const EMOTION_CONFIGS: Record<TTSEmotion, EmotionConfig> = {
  happy: {
    keywords: [
      // Chinese
      '开心', '高兴', '太好了', '太棒了', '真好', '很好', '喜欢', '爱',
      // Japanese
      '嬉しい', '楽しい', 'うれしい', 'たのしい', '好き', '大好き',
      // Expressions
      '哈哈', 'ふふ', 'わーい', 'やった'
    ],
    patterns: [
      /[♪♫♬]/,
      /～+/,
      /[笑]/
    ],
    weight: 1.5
  },

  excited: {
    keywords: [
      // Chinese
      '哇', '诶', '居然', '真的吗', '太厉害了', '不可思议', '惊人',
      // Japanese
      'すごい', 'えー', 'わあ', 'びっくり', '驚き', 'まじで', '信じられない'
    ],
    patterns: [
      /[！!]{2,}/,
      /[？?][！!]/,
      /诶{2,}/,
      /えー+/
    ],
    weight: 2.0
  },

  serious: {
    keywords: [
      // Chinese
      '但是', '然而', '不过', '虽然', '问题', '需要', '必须', '重要',
      // Japanese
      'しかし', 'ただし', 'けれども', '問題', '必要', '重要', '大切'
    ],
    patterns: [
      /\.{3,}/,
      /…+/,
      /、+$/
    ],
    weight: 1.3
  },

  calm: {
    keywords: [
      // Chinese
      '好的', '明白', '了解', '这样', '所以', '因此',
      // Japanese
      'そうですね', 'なるほど', '分かりました', 'では', 'さて'
    ],
    patterns: [
      /^[^！!？?]+[。\.]$/,
      /ですね$/,
      /呢$/
    ],
    weight: 1.0
  },

  sad: {
    keywords: [
      // Chinese
      '可惜', '遗憾', '难过', '伤心', '不幸', '失望',
      // Japanese
      '残念', '悲しい', 'かなしい', 'さびしい', '寂しい'
    ],
    patterns: [
      /[泪涙]/,
      /呜+/,
      /うう+/
    ],
    weight: 1.5
  },

  angry: {
    keywords: [
      // Chinese
      '生气', '愤怒', '可恶', '讨厌', '烦人',
      // Japanese
      '怒り', 'むかつく', 'いらいら', 'うざい', '腹が立つ'
    ],
    patterns: [
      /[！!]{3,}/,
      /くそ/,
      /该死/
    ],
    weight: 1.8
  },

  neutral: {
    keywords: [],
    patterns: [],
    weight: 1.0
  }
};

/**
 * Detect emotion from text with detailed analysis
 */
export function detectEmotionDetailed(text: string): DetailedEmotionAnalysis {
  const scores: Record<TTSEmotion, number> = {
    neutral: 1.0,
    happy: 0,
    excited: 0,
    serious: 0,
    calm: 0,
    sad: 0,
    angry: 0
  };

  const factors = {
    punctuation: 0,
    keywords: 0,
    patterns: 0
  };

  const indicators: string[] = [];

  // Analyze punctuation
  const exclamations = (text.match(/[！!]/g) || []).length;
  const questions = (text.match(/[？?]/g) || []).length;
  const ellipsis = (text.match(/\.\.\.|…/g) || []).length;

  if (exclamations >= 2) {
    factors.punctuation += 2;
    scores.excited += 2;
    indicators.push(`${exclamations} exclamations`);
  } else if (exclamations === 1) {
    factors.punctuation += 1;
    scores.happy += 1;
  }

  if (questions >= 1) {
    factors.punctuation += 0.5;
    scores.happy += 0.5;
  }

  if (ellipsis >= 1) {
    factors.punctuation += 1;
    scores.serious += 1;
    indicators.push('ellipsis detected');
  }

  // Analyze keywords and patterns for each emotion
  for (const [emotion, config] of Object.entries(EMOTION_CONFIGS)) {
    if (emotion === 'neutral') continue;

    // Keyword matching
    for (const keyword of config.keywords) {
      if (text.includes(keyword)) {
        const score = config.weight;
        scores[emotion as TTSEmotion] += score;
        factors.keywords += score;
        indicators.push(`keyword: ${keyword}`);
      }
    }

    // Pattern matching
    for (const pattern of config.patterns) {
      if (pattern.test(text)) {
        const score = config.weight * 0.8;
        scores[emotion as TTSEmotion] += score;
        factors.patterns += score;
        indicators.push(`pattern: ${pattern.source}`);
      }
    }
  }

  // Find highest scoring emotion
  let maxEmotion: TTSEmotion = 'neutral';
  let maxScore = scores.neutral;

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxEmotion = emotion as TTSEmotion;
    }
  }

  // Calculate confidence
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? maxScore / totalScore : 0;

  return {
    emotion: maxEmotion,
    confidence,
    factors,
    indicators
  };
}

/**
 * Simple emotion detection (backward compatible)
 */
export function detectEmotion(text: string): TTSEmotion {
  return detectEmotionDetailed(text).emotion;
}

/**
 * Map emotion to character-appropriate style
 */
export function mapEmotionForCharacter(
  emotion: TTSEmotion,
  characterType: 'gentle' | 'energetic' | 'analytical' | 'casual'
): TTSEmotion {
  // Adjust emotion based on character personality
  switch (characterType) {
    case 'gentle':
      // Tone down extreme emotions
      if (emotion === 'excited') return 'happy';
      if (emotion === 'angry') return 'serious';
      break;

    case 'energetic':
      // Amplify positive emotions
      if (emotion === 'happy') return 'excited';
      if (emotion === 'calm') return 'happy';
      break;

    case 'analytical':
      // Keep emotions more subdued
      if (emotion === 'excited') return 'happy';
      if (emotion === 'happy') return 'calm';
      break;

    case 'casual':
      // Natural emotion mapping
      break;
  }

  return emotion;
}

/**
 * Get emotion intensity (0-1)
 */
export function getEmotionIntensity(text: string): number {
  const analysis = detectEmotionDetailed(text);

  // Base intensity on confidence and factor scores
  const factorSum = Object.values(analysis.factors).reduce((a, b) => a + b, 0);
  const intensity = Math.min(1, factorSum / 10) * analysis.confidence;

  return intensity;
}
