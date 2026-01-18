/**
 * Character Configurations
 *
 * Detailed character settings based on original game sources
 * Research sources: 萌娘百科, BANGUMI, official game data
 */

import type { Character } from '../types';

/**
 * Complete character configurations for development testing
 * Uses WebGAL default assets for local development
 */
export const CHARACTER_CONFIGS: Record<string, Character> = {
  host: {
    id: 'host',
    name: {
      zh: '小樱',
      jp: 'さくら',
      en: 'Sakura'
    },
    source: 'Development Character',
    personality: [
      '温柔体贴的大姐姐性格',
      '善于倾听和引导他人',
      '对学术有浓厚兴趣',
      '略带天然呆，但很有条理',
      '内心细腻，善于察言观色'
    ],
    speakingStyle: [
      '语调温和，使用敬语',
      '经常用"呢"、"哦"等语气词',
      '善于总结和归纳要点',
      '提出启发性问题',
      '说话有条理，逻辑清晰'
    ],
    paperRole: '主持人和总结者',
    voiceSettings: {
      voicevox: {
        speaker: 2,
        emotion: 'normal',
        speed: 1.0
      },
      minimax: {
        model: 'speech-02',
        voice: 'Sweet_Girl_2',
        emotion: 'neutral'
      }
    },
    phrases: [
      '让我来为大家总结一下呢',
      '这个问题很有意思哦',
      '大家觉得怎么样？',
      '嗯嗯，我明白了',
      '接下来我们看看...'
    ],
    description: '温柔善良的主持人角色，善于总结和引导讨论。',
    sprite: 'stand.webp'
  },

  energizer: {
    id: 'energizer',
    name: {
      zh: '小雪',
      jp: 'ゆき',
      en: 'Yuki'
    },
    source: 'Development Character',
    personality: [
      '活泼开朗的元气少女',
      '好奇心强，喜欢提问',
      '思维跳跃，反应敏捷',
      '对温暖的渴望很强烈'
    ],
    speakingStyle: [
      '语调活泼，感叹词丰富',
      '经常用"诶"、"哇"、"唔"',
      '时常提出意想不到的问题',
      '用比喻和形象化表达',
      '情绪表达直率而丰富'
    ],
    paperRole: '活跃气氛者和提问者',
    voiceSettings: {
      voicevox: {
        speaker: 3,
        emotion: 'happy',
        speed: 1.1
      },
      minimax: {
        model: 'speech-02',
        voice: 'Lively_Girl',
        emotion: 'cheerful'
      }
    },
    phrases: [
      '诶诶！这个好有趣！',
      '我懂了我懂了！',
      '等等等等，还有个问题！',
      '哇，原来如此呢',
      '那个...那个...',
      '真是不可思议呀'
    ],
    description: '活泼开朗的元气少女，用有趣的比喻让内容生动。',
    sprite: 'stand2.webp'
  },

  analyst: {
    id: 'analyst',
    name: {
      zh: '小雨',
      jp: 'あめ',
      en: 'Ame'
    },
    source: 'Development Character',
    personality: [
      '理性严谨的学者型',
      '逻辑思维极强',
      '追求精确和深度理解',
      '做事认真负责'
    ],
    speakingStyle: [
      '用词精准，逻辑清晰',
      '喜欢使用专业术语',
      '进行严密的逻辑推理',
      '语调相对严肃但温和'
    ],
    paperRole: '深度分析者和质疑者',
    voiceSettings: {
      voicevox: {
        speaker: 8,
        emotion: 'normal',
        speed: 0.9
      },
      minimax: {
        model: 'speech-02',
        voice: 'Lovely_Girl',
        emotion: 'serious'
      }
    },
    phrases: [
      '从逻辑上分析的话',
      '这里有个问题需要探讨',
      '让我们深入研究一下',
      '数据显示...',
      '按照理论框架',
      '嗯...这个结论还需要验证'
    ],
    description: '理性严谨的学者型，深入分析论文的逻辑结构。',
    sprite: 'stand.webp'
  },

  interpreter: {
    id: 'interpreter',
    name: {
      zh: '小风',
      jp: 'かぜ',
      en: 'Kaze'
    },
    source: 'Development Character',
    personality: [
      '博学睿智的知识者',
      '善于联想和扩展知识',
      '内心善良',
      '有着独特的价值观'
    ],
    speakingStyle: [
      '表面开朗健谈',
      '使用现代流行语汇',
      '创造性的表达方式',
      '善于用类比解释概念'
    ],
    paperRole: '生活化解释者和共鸣者',
    voiceSettings: {
      voicevox: {
        speaker: 2,
        emotion: 'normal',
        speed: 0.85
      },
      minimax: {
        model: 'speech-02',
        voice: 'Wise_Woman',
        emotion: 'calm'
      }
    },
    phrases: [
      '大家好！',
      '这就像我们生活中的...',
      '嗯嗯，我觉得',
      '简单来说就是',
      '啊，我懂这种感觉',
      '用我们的话来说就是'
    ],
    description: '博学睿智的知识渊博者，善于联想和扩展知识。',
    sprite: 'stand2.webp'
  }
};

/**
 * Character interaction patterns for natural dialogue flow
 */
export const CHARACTER_INTERACTIONS: Record<string, Array<{
  participants: string[];
  pattern: string;
  context: string;
}>> = {
  explanation_flow: [
    {
      participants: ['host', 'energizer'],
      pattern: 'host引导话题 → energizer好奇提问 → host耐心解答',
      context: '学术概念介绍'
    },
    {
      participants: ['analyst', 'interpreter'],
      pattern: 'analyst技术分析 → interpreter生活化类比 → analyst补充细节',
      context: '方法论讨论'
    }
  ],
  discussion_flow: [
    {
      participants: ['host', 'analyst', 'energizer'],
      pattern: 'host提出观点 → analyst逻辑分析 → energizer感性回应',
      context: '结果解读'
    },
    {
      participants: ['interpreter', 'energizer', 'analyst'],
      pattern: 'interpreter提出疑问 → energizer活跃响应 → analyst严谨回答',
      context: '概念澄清'
    }
  ]
};

/**
 * Get character by ID with validation
 */
export function getCharacter(id: string): Character | null {
  return CHARACTER_CONFIGS[id] || null;
}

/**
 * Get all available character IDs
 */
export function getAvailableCharacters(): string[] {
  return Object.keys(CHARACTER_CONFIGS);
}

/**
 * Validate character selection
 */
export function validateCharacterSelection(characterIds: string[]): {
  valid: boolean;
  errors: string[];
  validCharacters: string[];
} {
  const errors: string[] = [];
  const validCharacters: string[] = [];

  for (const id of characterIds) {
    if (CHARACTER_CONFIGS[id]) {
      validCharacters.push(id);
    } else {
      errors.push(`Unknown character ID: ${id}`);
    }
  }

  if (validCharacters.length === 0) {
    errors.push('No valid characters selected');
  }

  if (validCharacters.length > 4) {
    errors.push('Too many characters selected (max: 4)');
  }

  return {
    valid: errors.length === 0,
    errors,
    validCharacters
  };
}