/**
 * Paper Selection UI Types
 *
 * Types for the paper selection and game management interface
 */

/**
 * Multi-language text content
 */
export interface MultiLanguageText {
  zh: string;
  jp: string;
  en: string;
}

/**
 * UI text labels (tri-language)
 */
export interface UILabels {
  // Main titles
  appTitle: MultiLanguageText;
  appSubtitle: MultiLanguageText;

  // New game section
  newGame: MultiLanguageText;
  uploadPaper: MultiLanguageText;
  selectFile: MultiLanguageText;
  dragDropHint: MultiLanguageText;
  supportedFormats: MultiLanguageText;

  // Character selection
  selectCharacters: MultiLanguageText;
  characterRequired: MultiLanguageText;
  minCharactersHint: MultiLanguageText;

  // Language selection
  selectLanguage: MultiLanguageText;
  languageHint: MultiLanguageText;

  // Generation
  startGeneration: MultiLanguageText;
  generating: MultiLanguageText;
  generationProgress: MultiLanguageText;
  readyToPlay: MultiLanguageText;

  // Continue game section
  continueGame: MultiLanguageText;
  noSavedGames: MultiLanguageText;
  lastPlayed: MultiLanguageText;
  progress: MultiLanguageText;
  loadSave: MultiLanguageText;
  deleteGame: MultiLanguageText;

  // Save/Load
  saveSlots: MultiLanguageText;
  quickSave: MultiLanguageText;
  autoSave: MultiLanguageText;
  emptySlot: MultiLanguageText;

  // Buttons
  play: MultiLanguageText;
  cancel: MultiLanguageText;
  confirm: MultiLanguageText;
  back: MultiLanguageText;

  // Status messages
  uploading: MultiLanguageText;
  parsing: MultiLanguageText;
  error: MultiLanguageText;
  success: MultiLanguageText;

  // Confirmations
  deleteConfirm: MultiLanguageText;
  overwriteConfirm: MultiLanguageText;
}

/**
 * Character display info
 */
export interface CharacterDisplayInfo {
  id: string;
  name: MultiLanguageText;
  role: MultiLanguageText;
  description: MultiLanguageText;
  sprite: string;
  selected: boolean;
}

/**
 * Game card display info
 */
export interface GameCardInfo {
  paperId: string;
  paperTitle: MultiLanguageText;
  progress: number;
  lastPlayedAt: Date;
  createdAt: Date;
  screenshotUrl?: string;
  hasSaves: boolean;
}

/**
 * Generation status
 */
export type GenerationStatus = 'idle' | 'uploading' | 'parsing' | 'generating' | 'ready' | 'error';

/**
 * Component props
 */
export interface PaperSelectionProps {
  /** Initial language */
  initialLanguage?: 'zh' | 'jp' | 'en';

  /** Callback when game starts */
  onGameStart?: (paperId: string) => void;

  /** Callback when game continues */
  onGameContinue?: (paperId: string) => void;

  /** Callback when load save */
  onLoadSave?: (paperId: string, slotIndex: number) => void;

  /** Callback when user wants to go back */
  onBack?: () => void;
}

/**
 * File uploader props
 */
export interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  acceptedTypes: string[];
  labels: Pick<UILabels, 'selectFile' | 'dragDropHint' | 'supportedFormats'>;
  language: 'zh' | 'jp' | 'en';
}

/**
 * Character selector props
 */
export interface CharacterSelectorProps {
  characters: CharacterDisplayInfo[];
  selectedCharacters: string[];
  onSelectionChange: (selected: string[]) => void;
  minSelection?: number;
  maxSelection?: number;
  labels: Pick<UILabels, 'selectCharacters' | 'characterRequired' | 'minCharactersHint'>;
  language: 'zh' | 'jp' | 'en';
}

/**
 * Progress display props
 */
export interface ProgressDisplayProps {
  status: GenerationStatus;
  progress: number;
  message: string;
  labels: Pick<UILabels, 'generating' | 'generationProgress' | 'readyToPlay'>;
  language: 'zh' | 'jp' | 'en';
}

/**
 * Game card props
 */
export interface GameCardProps {
  game: GameCardInfo;
  onContinue: () => void;
  onLoadSave: () => void;
  onDelete: () => void;
  labels: Pick<UILabels, 'lastPlayed' | 'progress' | 'loadSave' | 'deleteGame' | 'play'>;
  language: 'zh' | 'jp' | 'en';
}
