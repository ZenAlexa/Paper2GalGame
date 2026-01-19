/**
 * Multi-Paper Save System
 *
 * Manages independent save slots for each paper game instance
 * Supports traditional GalGame save/load experience
 */

import type { MultiLanguageContent } from '../types/character';
import type { GenerationProgress } from './types';

// Browser localStorage type declaration for cross-environment compatibility
declare const localStorage:
  | {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
      removeItem(key: string): void;
      key(index: number): string | null;
      length: number;
    }
  | undefined;

/**
 * Game progress state
 */
export interface GameProgress {
  /** Current segment being played */
  currentSegment: string;

  /** Segments available for play */
  availableSegments: string[];

  /** Segments fully completed */
  completedSegments: string[];

  /** Overall completion percentage */
  totalProgress: number;

  /** Current dialogue index */
  currentDialogueIndex: number;

  /** Current scene name */
  currentScene: string;
}

/**
 * Save data structure
 */
export interface SaveData {
  /** Paper identifier */
  paperId: string;

  /** Paper title (tri-language) */
  paperTitle: MultiLanguageContent;

  /** Save timestamp */
  savedAt: Date;

  /** Game state snapshot */
  gameState: {
    /** Current segment */
    segment: string;

    /** Current scene */
    scene: string;

    /** Dialogue index */
    dialogueIndex: number;

    /** Variables state */
    variables: Record<string, unknown>;

    /** Backlog history */
    backlog: string[];
  };

  /** Progress state */
  progress: GameProgress;

  /** Available segments at save time */
  availableSegments: string[];

  /** Screenshot URL for preview */
  screenshotUrl?: string;

  /** Save slot label (optional) */
  label?: string;

  /** Save description (tri-language) */
  description?: MultiLanguageContent;
}

/**
 * Game instance for a single paper
 */
export interface GameInstance {
  /** Unique paper identifier */
  paperId: string;

  /** Paper title (tri-language) */
  paperTitle: MultiLanguageContent;

  /** Instance creation timestamp */
  createdAt: Date;

  /** Last played timestamp */
  lastPlayedAt: Date;

  /** Manual save slots (typically 10) */
  saveSlots: (SaveData | null)[];

  /** Quick save slot */
  quickSave: SaveData | null;

  /** Auto save slot */
  autoSave: SaveData | null;

  /** Current game progress */
  gameProgress: GameProgress;

  /** Generation progress (if still generating) */
  generationProgress?: GenerationProgress;

  /** Game settings */
  settings: {
    /** Current display language */
    language: 'zh' | 'jp' | 'en';

    /** Text speed (0-10) */
    textSpeed: number;

    /** Auto play speed (0-10) */
    autoSpeed: number;

    /** BGM volume (0-100) */
    bgmVolume: number;

    /** Voice volume (0-100) */
    voiceVolume: number;

    /** SE volume (0-100) */
    seVolume: number;
  };

  /** Unlock state (for achievements/extras) */
  unlocks: {
    /** CG gallery unlocks */
    cgUnlocked: string[];

    /** Music unlocks */
    musicUnlocked: string[];

    /** Endings seen */
    endingsSeen: string[];
  };
}

/**
 * Save system configuration
 */
export interface SaveSystemConfig {
  /** Number of manual save slots */
  saveSlotCount: number;

  /** Enable auto save */
  enableAutoSave: boolean;

  /** Auto save interval (dialogues) */
  autoSaveInterval: number;

  /** Enable quick save */
  enableQuickSave: boolean;

  /** Storage key prefix */
  storagePrefix: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SaveSystemConfig = {
  saveSlotCount: 10,
  enableAutoSave: true,
  autoSaveInterval: 10,
  enableQuickSave: true,
  storagePrefix: 'paper_game_',
};

/**
 * Default game settings
 */
const DEFAULT_SETTINGS: GameInstance['settings'] = {
  language: 'zh',
  textSpeed: 5,
  autoSpeed: 5,
  bgmVolume: 80,
  voiceVolume: 100,
  seVolume: 80,
};

/**
 * Multi-Paper Save System
 */
export class MultiPaperSaveSystem {
  private config: SaveSystemConfig;
  private instances: Map<string, GameInstance>;
  private storage: StorageInterface;

  constructor(config: Partial<SaveSystemConfig> = {}, storage?: StorageInterface) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.instances = new Map();
    this.storage = storage || new LocalStorageAdapter(this.config.storagePrefix);

    // Load existing instances
    this.loadAllInstances();
  }

  /**
   * Create a new game instance for a paper
   */
  createPaperGameInstance(paperId: string, paperTitle: string | MultiLanguageContent): GameInstance {
    // Convert string title to multi-language if needed
    const title: MultiLanguageContent =
      typeof paperTitle === 'string' ? { zh: paperTitle, jp: paperTitle, en: paperTitle } : paperTitle;

    const gameInstance: GameInstance = {
      paperId,
      paperTitle: title,
      createdAt: new Date(),
      lastPlayedAt: new Date(),
      saveSlots: new Array(this.config.saveSlotCount).fill(null),
      quickSave: null,
      autoSave: null,
      gameProgress: {
        currentSegment: 'intro',
        availableSegments: ['intro'],
        completedSegments: [],
        totalProgress: 0,
        currentDialogueIndex: 0,
        currentScene: 'start',
      },
      settings: { ...DEFAULT_SETTINGS },
      unlocks: {
        cgUnlocked: [],
        musicUnlocked: [],
        endingsSeen: [],
      },
    };

    // Store in memory and persist
    this.instances.set(paperId, gameInstance);
    this.persistInstance(gameInstance);

    return gameInstance;
  }

  /**
   * Get game instance by paper ID
   */
  getGameInstance(paperId: string): GameInstance | undefined {
    return this.instances.get(paperId);
  }

  /**
   * Get all game instances
   */
  getAllPaperGames(): GameInstance[] {
    return Array.from(this.instances.values()).sort((a, b) => b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime());
  }

  /**
   * Save game to a slot
   */
  saveGame(
    paperId: string,
    slotIndex: number,
    gameState: SaveData['gameState'],
    screenshotUrl?: string,
    label?: string
  ): SaveData {
    const instance = this.instances.get(paperId);
    if (!instance) {
      throw new Error(`Game instance not found: ${paperId}`);
    }

    if (slotIndex < 0 || slotIndex >= this.config.saveSlotCount) {
      throw new Error(`Invalid save slot: ${slotIndex}`);
    }

    const saveData: SaveData = {
      paperId: instance.paperId,
      paperTitle: instance.paperTitle,
      savedAt: new Date(),
      gameState,
      progress: { ...instance.gameProgress },
      availableSegments: [...instance.gameProgress.availableSegments],
      description: this.generateSaveDescription(instance, gameState),
    };

    // Only set optional properties if they have values
    if (screenshotUrl) saveData.screenshotUrl = screenshotUrl;
    if (label) saveData.label = label;

    instance.saveSlots[slotIndex] = saveData;
    instance.lastPlayedAt = new Date();
    this.persistInstance(instance);

    return saveData;
  }

  /**
   * Quick save
   */
  quickSave(paperId: string, gameState: SaveData['gameState'], screenshotUrl?: string): SaveData {
    const instance = this.instances.get(paperId);
    if (!instance) {
      throw new Error(`Game instance not found: ${paperId}`);
    }

    const saveData: SaveData = {
      paperId: instance.paperId,
      paperTitle: instance.paperTitle,
      savedAt: new Date(),
      gameState,
      progress: { ...instance.gameProgress },
      availableSegments: [...instance.gameProgress.availableSegments],
      label: 'Quick Save',
      description: {
        zh: '快速存档',
        jp: 'クイックセーブ',
        en: 'Quick Save',
      },
    };

    if (screenshotUrl) saveData.screenshotUrl = screenshotUrl;

    instance.quickSave = saveData;
    instance.lastPlayedAt = new Date();
    this.persistInstance(instance);

    return saveData;
  }

  /**
   * Auto save
   */
  autoSave(paperId: string, gameState: SaveData['gameState'], screenshotUrl?: string): SaveData {
    const instance = this.instances.get(paperId);
    if (!instance) {
      throw new Error(`Game instance not found: ${paperId}`);
    }

    const saveData: SaveData = {
      paperId: instance.paperId,
      paperTitle: instance.paperTitle,
      savedAt: new Date(),
      gameState,
      progress: { ...instance.gameProgress },
      availableSegments: [...instance.gameProgress.availableSegments],
      label: 'Auto Save',
      description: {
        zh: '自动存档',
        jp: 'オートセーブ',
        en: 'Auto Save',
      },
    };

    if (screenshotUrl) saveData.screenshotUrl = screenshotUrl;

    instance.autoSave = saveData;
    instance.lastPlayedAt = new Date();
    this.persistInstance(instance);

    return saveData;
  }

  /**
   * Load game from a slot
   */
  loadGame(paperId: string, slotIndex: number): SaveData {
    const instance = this.instances.get(paperId);
    if (!instance) {
      throw new Error(`Game instance not found: ${paperId}`);
    }

    const saveData = instance.saveSlots[slotIndex];
    if (!saveData) {
      throw new Error(`Save slot is empty: ${slotIndex}`);
    }

    // Update last played
    instance.lastPlayedAt = new Date();
    this.persistInstance(instance);

    return saveData;
  }

  /**
   * Load quick save
   */
  loadQuickSave(paperId: string): SaveData {
    const instance = this.instances.get(paperId);
    if (!instance) {
      throw new Error(`Game instance not found: ${paperId}`);
    }

    if (!instance.quickSave) {
      throw new Error('No quick save available');
    }

    instance.lastPlayedAt = new Date();
    this.persistInstance(instance);

    return instance.quickSave;
  }

  /**
   * Load auto save
   */
  loadAutoSave(paperId: string): SaveData {
    const instance = this.instances.get(paperId);
    if (!instance) {
      throw new Error(`Game instance not found: ${paperId}`);
    }

    if (!instance.autoSave) {
      throw new Error('No auto save available');
    }

    instance.lastPlayedAt = new Date();
    this.persistInstance(instance);

    return instance.autoSave;
  }

  /**
   * Delete a save slot
   */
  deleteSave(paperId: string, slotIndex: number): void {
    const instance = this.instances.get(paperId);
    if (!instance) {
      throw new Error(`Game instance not found: ${paperId}`);
    }

    instance.saveSlots[slotIndex] = null;
    this.persistInstance(instance);
  }

  /**
   * Delete game instance
   */
  deleteGameInstance(paperId: string): void {
    this.instances.delete(paperId);
    this.storage.remove(`${paperId}`);
  }

  /**
   * Update game progress
   */
  updateProgress(paperId: string, progress: Partial<GameProgress>): void {
    const instance = this.instances.get(paperId);
    if (!instance) {
      throw new Error(`Game instance not found: ${paperId}`);
    }

    instance.gameProgress = { ...instance.gameProgress, ...progress };
    instance.lastPlayedAt = new Date();
    this.persistInstance(instance);
  }

  /**
   * Update game settings
   */
  updateSettings(paperId: string, settings: Partial<GameInstance['settings']>): void {
    const instance = this.instances.get(paperId);
    if (!instance) {
      throw new Error(`Game instance not found: ${paperId}`);
    }

    instance.settings = { ...instance.settings, ...settings };
    this.persistInstance(instance);
  }

  /**
   * Add segment to available segments
   */
  addAvailableSegment(paperId: string, segmentId: string): void {
    const instance = this.instances.get(paperId);
    if (!instance) {
      throw new Error(`Game instance not found: ${paperId}`);
    }

    if (!instance.gameProgress.availableSegments.includes(segmentId)) {
      instance.gameProgress.availableSegments.push(segmentId);
      this.persistInstance(instance);
    }
  }

  /**
   * Mark segment as completed
   */
  completeSegment(paperId: string, segmentId: string): void {
    const instance = this.instances.get(paperId);
    if (!instance) {
      throw new Error(`Game instance not found: ${paperId}`);
    }

    if (!instance.gameProgress.completedSegments.includes(segmentId)) {
      instance.gameProgress.completedSegments.push(segmentId);
      this.recalculateProgress(instance);
      this.persistInstance(instance);
    }
  }

  /**
   * Generate save description
   */
  private generateSaveDescription(instance: GameInstance, gameState: SaveData['gameState']): MultiLanguageContent {
    const progress = instance.gameProgress.totalProgress;
    return {
      zh: `进度 ${progress}% - ${gameState.scene}`,
      jp: `進捗 ${progress}% - ${gameState.scene}`,
      en: `Progress ${progress}% - ${gameState.scene}`,
    };
  }

  /**
   * Recalculate total progress
   */
  private recalculateProgress(instance: GameInstance): void {
    const totalSegments = instance.gameProgress.availableSegments.length;
    const completedSegments = instance.gameProgress.completedSegments.length;

    if (totalSegments > 0) {
      instance.gameProgress.totalProgress = Math.round((completedSegments / totalSegments) * 100);
    }
  }

  /**
   * Persist instance to storage
   */
  private persistInstance(instance: GameInstance): void {
    this.storage.set(instance.paperId, JSON.stringify(instance));
  }

  /**
   * Load all instances from storage
   */
  private loadAllInstances(): void {
    const keys = this.storage.keys();

    for (const key of keys) {
      try {
        const data = this.storage.get(key);
        if (data) {
          const instance = JSON.parse(data) as GameInstance;
          // Convert date strings back to Date objects
          instance.createdAt = new Date(instance.createdAt);
          instance.lastPlayedAt = new Date(instance.lastPlayedAt);

          // Convert save data dates
          for (const save of instance.saveSlots) {
            if (save) {
              save.savedAt = new Date(save.savedAt);
            }
          }
          if (instance.quickSave) {
            instance.quickSave.savedAt = new Date(instance.quickSave.savedAt);
          }
          if (instance.autoSave) {
            instance.autoSave.savedAt = new Date(instance.autoSave.savedAt);
          }

          this.instances.set(instance.paperId, instance);
        }
      } catch (error) {
        console.warn(`Failed to load game instance: ${key}`, error);
      }
    }
  }

  /**
   * Get save system statistics
   */
  getStats(): {
    totalInstances: number;
    totalSaves: number;
    storageUsed: number;
  } {
    let totalSaves = 0;

    for (const instance of this.instances.values()) {
      totalSaves += instance.saveSlots.filter((s) => s !== null).length;
      if (instance.quickSave) totalSaves++;
      if (instance.autoSave) totalSaves++;
    }

    return {
      totalInstances: this.instances.size,
      totalSaves,
      storageUsed: this.storage.getSize(),
    };
  }
}

/**
 * Storage interface for abstraction
 */
export interface StorageInterface {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
  getSize(): number;
}

/**
 * LocalStorage adapter
 */
class LocalStorageAdapter implements StorageInterface {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  get(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(`${this.prefix}${key}`);
  }

  set(key: string, value: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`${this.prefix}${key}`, value);
  }

  remove(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(`${this.prefix}${key}`);
  }

  keys(): string[] {
    if (typeof localStorage === 'undefined') return [];

    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key.replace(this.prefix, ''));
      }
    }
    return keys;
  }

  getSize(): number {
    if (typeof localStorage === 'undefined') return 0;

    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    }
    return size;
  }
}

/**
 * Create save system with default configuration
 */
export function createSaveSystem(config?: Partial<SaveSystemConfig>, storage?: StorageInterface): MultiPaperSaveSystem {
  return new MultiPaperSaveSystem(config, storage);
}
