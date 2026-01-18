/**
 * Character Configurations
 *
 * Development character definitions for Paper2GalGame
 * Maps character roles to TTS voice settings
 */

import type { Character } from '../types';

/**
 * Character configurations for academic paper narration
 * Uses WebGAL default assets during development
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
      'Gentle and caring personality',
      'Good at listening and guiding',
      'Strong interest in academics',
      'Slightly airheaded but organized',
      'Emotionally perceptive'
    ],
    speakingStyle: [
      'Warm tone with polite speech',
      'Uses soft sentence endings',
      'Good at summarizing key points',
      'Asks thought-provoking questions',
      'Clear and logical speech'
    ],
    paperRole: 'Host and summarizer',
    voiceSettings: {
      voicevox: {
        speaker: 2,
        emotion: 'normal',
        speed: 1.0
      },
      minimax: {
        model: 'speech-2.6-hd',
        voice: 'Japanese_GracefulMaiden',
        emotion: 'neutral'
      }
    },
    phrases: [
      'Let me summarize for everyone',
      'That is an interesting question',
      'What do you all think?',
      'I understand',
      'Let us look at the next part'
    ],
    jpPhrases: [
      '皆さん、一緒にこの論文について学びましょう',
      'それは興味深い質問ですね',
      '皆さんはどう思いますか？',
      'なるほど、分かりました',
      '次の部分を見てみましょう'
    ],
    description: 'Gentle host who summarizes and guides discussion',
    sprite: 'stand.webp',
    relationship: {
      role: 'kouhai',
      jp: '後輩',
      description: 'Cute junior girl who calls the player "senpai"'
    },
    assignedPhase: 1
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
      'Cheerful and energetic',
      'Highly curious and inquisitive',
      'Quick-thinking with creative ideas',
      'Expressive emotions'
    ],
    speakingStyle: [
      'Lively tone with exclamations',
      'Uses interjections frequently',
      'Asks unexpected questions',
      'Uses metaphors and vivid expressions',
      'Direct emotional expression'
    ],
    paperRole: 'Energizer and questioner',
    voiceSettings: {
      voicevox: {
        speaker: 3,
        emotion: 'happy',
        speed: 1.1
      },
      minimax: {
        model: 'speech-2.6-hd',
        voice: 'Japanese_OptimisticYouth',
        emotion: 'neutral'
      }
    },
    phrases: [
      'Wow, that is so interesting!',
      'I get it now!',
      'Wait, I have another question!',
      'Oh, I see!',
      'That is amazing!'
    ],
    jpPhrases: [
      'わぁ！それすごいですね！',
      'なるほど〜、分かりました！',
      'あ、ちょっと質問があります！',
      'えっ、本当ですか？',
      'すごい！面白いですね！'
    ],
    description: 'Energetic character who makes content engaging',
    sprite: 'stand2.webp',
    relationship: {
      role: 'senpai',
      jp: '先輩',
      description: 'Energetic senior girl who calls the player "kouhai"'
    },
    assignedPhase: 4
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
      'Rational and rigorous scholar',
      'Strong logical thinking',
      'Pursues precision and deep understanding',
      'Conscientious and responsible'
    ],
    speakingStyle: [
      'Precise wording with clear logic',
      'Uses technical terminology',
      'Rigorous logical reasoning',
      'Serious but gentle tone'
    ],
    paperRole: 'Deep analyst and critical thinker',
    voiceSettings: {
      voicevox: {
        speaker: 8,
        emotion: 'normal',
        speed: 0.9
      },
      minimax: {
        model: 'speech-2.6-hd',
        voice: 'Japanese_DecisivePrincess',
        emotion: 'neutral'
      }
    },
    phrases: [
      'From a logical perspective',
      'There is an issue to discuss here',
      'Let us examine this more closely',
      'The data shows...',
      'According to the theoretical framework',
      'This conclusion needs verification'
    ],
    jpPhrases: [
      '論理的に考えると、この点は重要ですね',
      'ここに興味深い問題があります',
      'もう少し詳しく見てみましょう',
      'データによると...',
      '理論的枠組みから見れば',
      'この結論は検証が必要です'
    ],
    description: 'Rigorous analyst who examines logical structure',
    sprite: 'stand.webp',
    relationship: {
      role: 'teacher',
      jp: '先生',
      description: 'Scholarly teacher girl who calls the player "student"'
    },
    assignedPhase: 2
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
      'Knowledgeable and wise',
      'Good at making connections',
      'Kind-hearted',
      'Unique perspective on things'
    ],
    speakingStyle: [
      'Outgoing and talkative',
      'Uses modern expressions',
      'Creative explanations',
      'Good at analogies'
    ],
    paperRole: 'Practical interpreter and relatable explainer',
    voiceSettings: {
      voicevox: {
        speaker: 2,
        emotion: 'normal',
        speed: 0.85
      },
      minimax: {
        model: 'speech-2.6-hd',
        voice: 'Japanese_CalmLady',
        emotion: 'neutral'
      }
    },
    phrases: [
      'Hello everyone!',
      'This is like in our daily life...',
      'I think that...',
      'Simply put...',
      'I understand that feeling',
      'In other words...'
    ],
    jpPhrases: [
      'これって日常で言うと...',
      '身近な例で言えば...',
      '簡単に言うと、こういうことですね',
      '皆さんの生活で考えてみると...',
      'つまり、こういうイメージですね',
      '例えば料理で言うと...'
    ],
    description: 'Wise interpreter who connects concepts to daily life',
    sprite: 'stand2.webp',
    relationship: {
      role: 'cousin',
      jp: '表妹',
      description: 'Cute younger cousin girl who calls the player "biaoge" (older male cousin)'
    },
    assignedPhase: 3
  }
};

/**
 * Character interaction patterns for dialogue flow
 */
export const CHARACTER_INTERACTIONS: Record<string, Array<{
  participants: string[];
  pattern: string;
  context: string;
}>> = {
  explanation_flow: [
    {
      participants: ['host', 'energizer'],
      pattern: 'host introduces topic -> energizer asks questions -> host explains',
      context: 'Academic concept introduction'
    },
    {
      participants: ['analyst', 'interpreter'],
      pattern: 'analyst provides analysis -> interpreter gives analogy -> analyst adds details',
      context: 'Methodology discussion'
    }
  ],
  discussion_flow: [
    {
      participants: ['host', 'analyst', 'energizer'],
      pattern: 'host presents view -> analyst analyzes -> energizer responds',
      context: 'Results interpretation'
    },
    {
      participants: ['interpreter', 'energizer', 'analyst'],
      pattern: 'interpreter raises question -> energizer engages -> analyst answers',
      context: 'Concept clarification'
    }
  ]
};

/**
 * Get character by ID
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
