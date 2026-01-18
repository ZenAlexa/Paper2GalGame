/**
 * Paper Selection UI Labels
 *
 * Tri-language labels for the paper selection interface
 */

import type { UILabels } from './types';

/**
 * All UI labels in three languages
 */
export const UI_LABELS: UILabels = {
  // Main titles
  appTitle: {
    zh: 'Paper2GalGame',
    jp: 'Paper2GalGame',
    en: 'Paper2GalGame'
  },
  appSubtitle: {
    zh: '将学术论文转化为视觉小说体验',
    jp: '学術論文をビジュアルノベル体験に変換',
    en: 'Transform Academic Papers into Visual Novel Experience'
  },

  // New game section
  newGame: {
    zh: '开始新游戏',
    jp: '新しいゲームを始める',
    en: 'Start New Game'
  },
  uploadPaper: {
    zh: '上传论文',
    jp: '論文をアップロード',
    en: 'Upload Paper'
  },
  selectFile: {
    zh: '选择文件',
    jp: 'ファイルを選択',
    en: 'Select File'
  },
  dragDropHint: {
    zh: '将文件拖放到此处，或点击选择',
    jp: 'ファイルをここにドラッグ&ドロップ、またはクリックして選択',
    en: 'Drag & drop files here, or click to select'
  },
  supportedFormats: {
    zh: '支持格式：PDF、Word、TXT',
    jp: '対応形式：PDF、Word、TXT',
    en: 'Supported formats: PDF, Word, TXT'
  },

  // Character selection
  selectCharacters: {
    zh: '选择角色',
    jp: 'キャラクターを選択',
    en: 'Select Characters'
  },
  characterRequired: {
    zh: '请至少选择2位角色',
    jp: '2人以上のキャラクターを選択してください',
    en: 'Please select at least 2 characters'
  },
  minCharactersHint: {
    zh: '选择2-4位角色为你讲解论文内容',
    jp: '論文内容を説明する2〜4人のキャラクターを選択',
    en: 'Select 2-4 characters to explain the paper'
  },

  // Language selection
  selectLanguage: {
    zh: '选择语言',
    jp: '言語を選択',
    en: 'Select Language'
  },
  languageHint: {
    zh: '游戏文本语言（语音始终为日语）',
    jp: 'ゲームテキスト言語（音声は常に日本語）',
    en: 'Game text language (voice is always Japanese)'
  },

  // Generation
  startGeneration: {
    zh: '开始生成',
    jp: '生成開始',
    en: 'Start Generation'
  },
  generating: {
    zh: '生成中...',
    jp: '生成中...',
    en: 'Generating...'
  },
  generationProgress: {
    zh: '生成进度',
    jp: '生成進捗',
    en: 'Generation Progress'
  },
  readyToPlay: {
    zh: '准备就绪！',
    jp: '準備完了！',
    en: 'Ready to Play!'
  },

  // Continue game section
  continueGame: {
    zh: '继续游戏',
    jp: 'ゲームを続ける',
    en: 'Continue Game'
  },
  noSavedGames: {
    zh: '没有已保存的游戏',
    jp: '保存されたゲームはありません',
    en: 'No saved games'
  },
  lastPlayed: {
    zh: '最后游玩',
    jp: '最終プレイ',
    en: 'Last Played'
  },
  progress: {
    zh: '进度',
    jp: '進捗',
    en: 'Progress'
  },
  loadSave: {
    zh: '读取存档',
    jp: 'セーブデータを読込',
    en: 'Load Save'
  },
  deleteGame: {
    zh: '删除',
    jp: '削除',
    en: 'Delete'
  },

  // Save/Load
  saveSlots: {
    zh: '存档位',
    jp: 'セーブスロット',
    en: 'Save Slots'
  },
  quickSave: {
    zh: '快速存档',
    jp: 'クイックセーブ',
    en: 'Quick Save'
  },
  autoSave: {
    zh: '自动存档',
    jp: 'オートセーブ',
    en: 'Auto Save'
  },
  emptySlot: {
    zh: '空',
    jp: '空き',
    en: 'Empty'
  },

  // Buttons
  play: {
    zh: '开始游戏',
    jp: 'ゲーム開始',
    en: 'Play Game'
  },
  cancel: {
    zh: '取消',
    jp: 'キャンセル',
    en: 'Cancel'
  },
  confirm: {
    zh: '确认',
    jp: '確認',
    en: 'Confirm'
  },
  back: {
    zh: '返回',
    jp: '戻る',
    en: 'Back'
  },

  // Status messages
  uploading: {
    zh: '上传中...',
    jp: 'アップロード中...',
    en: 'Uploading...'
  },
  parsing: {
    zh: '解析论文中...',
    jp: '論文を解析中...',
    en: 'Parsing paper...'
  },
  error: {
    zh: '发生错误',
    jp: 'エラーが発生しました',
    en: 'An error occurred'
  },
  success: {
    zh: '成功',
    jp: '成功',
    en: 'Success'
  },

  // Confirmations
  deleteConfirm: {
    zh: '确定要删除这个游戏吗？所有存档将被清除。',
    jp: 'このゲームを削除してもよろしいですか？すべてのセーブデータが削除されます。',
    en: 'Are you sure you want to delete this game? All saves will be removed.'
  },
  overwriteConfirm: {
    zh: '此存档位已有数据，是否覆盖？',
    jp: 'このスロットには既にデータがあります。上書きしますか？',
    en: 'This slot already has data. Overwrite?'
  }
};

/**
 * Get label text for current language
 */
export function getLabel(
  labelKey: keyof UILabels,
  language: 'zh' | 'jp' | 'en'
): string {
  return UI_LABELS[labelKey][language];
}

/**
 * Character role descriptions (tri-language)
 */
export const CHARACTER_ROLES: Record<string, { name: import('./types').MultiLanguageText; role: import('./types').MultiLanguageText; description: import('./types').MultiLanguageText }> = {
  nene: {
    name: {
      zh: '绫地宁宁',
      jp: '綾地寧々',
      en: 'Ayachi Nene'
    },
    role: {
      zh: '主持人',
      jp: '司会者',
      en: 'Host'
    },
    description: {
      zh: '温柔体贴的大姐姐，善于总结和引导讨论',
      jp: '優しくて思いやりのある先輩、議論をまとめて導くのが得意',
      en: 'Gentle and caring, good at summarizing and guiding discussions'
    }
  },
  murasame: {
    name: {
      zh: '丛雨',
      jp: '叢雨',
      en: 'Murasame'
    },
    role: {
      zh: '活跃者',
      jp: '盛り上げ役',
      en: 'Energizer'
    },
    description: {
      zh: '活泼开朗的元气少女，用有趣的比喻让内容生动',
      jp: '元気いっぱいの明るい少女、面白い例えで内容を分かりやすく',
      en: 'Cheerful and energetic, makes content vivid with fun analogies'
    }
  },
  nanami: {
    name: {
      zh: '在原七海',
      jp: '在原七海',
      en: 'Arihara Nanami'
    },
    role: {
      zh: '分析者',
      jp: '分析者',
      en: 'Analyst'
    },
    description: {
      zh: '理性严谨的学者型，深入分析论文的逻辑结构',
      jp: '理性的で厳密な学者タイプ、論文の論理構造を深く分析',
      en: 'Rational and rigorous, deeply analyzes logical structure'
    }
  },
  meguru: {
    name: {
      zh: '因幡巡',
      jp: '因幡めぐる',
      en: 'Inaba Meguru'
    },
    role: {
      zh: '解读者',
      jp: '解説者',
      en: 'Interpreter'
    },
    description: {
      zh: '博学睿智的知识渊博者，善于联想和扩展知识',
      jp: '博識で知恵深い、知識を関連づけて広げるのが得意',
      en: 'Knowledgeable and wise, good at connecting and expanding knowledge'
    }
  }
};

/**
 * Get character info for display
 */
export function getCharacterInfo(
  characterId: string,
  language: 'zh' | 'jp' | 'en'
): { name: string; role: string; description: string } | undefined {
  const char = CHARACTER_ROLES[characterId];
  if (!char) return undefined;

  return {
    name: char.name[language],
    role: char.role[language],
    description: char.description[language]
  };
}

/**
 * Format date for display
 */
export function formatDate(date: Date, language: 'zh' | 'jp' | 'en'): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return { zh: '刚刚', jp: 'たった今', en: 'Just now' }[language];
  }

  if (diffMins < 60) {
    return {
      zh: `${diffMins}分钟前`,
      jp: `${diffMins}分前`,
      en: `${diffMins} min ago`
    }[language];
  }

  if (diffHours < 24) {
    return {
      zh: `${diffHours}小时前`,
      jp: `${diffHours}時間前`,
      en: `${diffHours} hours ago`
    }[language];
  }

  if (diffDays < 7) {
    return {
      zh: `${diffDays}天前`,
      jp: `${diffDays}日前`,
      en: `${diffDays} days ago`
    }[language];
  }

  // Format as date
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };

  const locale = {
    zh: 'zh-CN',
    jp: 'ja-JP',
    en: 'en-US'
  }[language];

  return date.toLocaleDateString(locale, options);
}
