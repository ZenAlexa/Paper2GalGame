/**
 * Incremental Content Controller
 *
 * Manages dynamic content loading for Paper2GalGame
 * Enables 50% completion game start with seamless background generation
 */

import type {
  SegmentInfo,
  SegmentStatus,
  DynamicContentState,
  DynamicContentEvent,
  DynamicContentListener,
  WaitingDialogue,
  IncrementalControllerConfig,
  MultiLanguageText,
} from './types';

/**
 * Default waiting dialogues (tri-language)
 */
const DEFAULT_WAITING_DIALOGUES: Record<string, { name: MultiLanguageText; texts: MultiLanguageText[] }> = {
  nene: {
    name: { zh: '绫地宁宁', jp: '綾地寧々', en: 'Ayachi Nene' },
    texts: [
      {
        zh: '让我想想这个部分该怎么解释...',
        jp: 'この部分をどう説明すればいいか考えてみますね...',
        en: 'Let me think about how to explain this part...',
      },
      {
        zh: '请稍等一下，我整理一下思路。',
        jp: '少々お待ちください、考えを整理させてください。',
        en: 'Please wait a moment, let me organize my thoughts.',
      },
    ],
  },
  murasame: {
    name: { zh: '丛雨', jp: '叢雨', en: 'Murasame' },
    texts: [
      {
        zh: '诶诶！这里有些复杂的概念呢，稍等一下！',
        jp: 'えぇ！ここは少し複雑な概念がありますね、ちょっと待ってください！',
        en: 'Wow! There are some complex concepts here, just a moment!',
      },
      {
        zh: '等我一下，我去准备一些有趣的内容！',
        jp: 'ちょっと待ってね、面白い内容を準備してくるから！',
        en: "Wait for me, I'll prepare some interesting content!",
      },
    ],
  },
  nanami: {
    name: { zh: '在原七海', jp: '在原七海', en: 'Arihara Nanami' },
    texts: [
      {
        zh: '这部分内容需要仔细分析，请稍候...',
        jp: 'この部分は慎重に分析する必要があります、少々お待ちください...',
        en: 'This part requires careful analysis, please wait...',
      },
      {
        zh: '让我确认一下接下来的内容是否准确。',
        jp: '次の内容が正確かどうか確認させてください。',
        en: 'Let me verify if the next content is accurate.',
      },
    ],
  },
  meguru: {
    name: { zh: '因幡巡', jp: '因幡めぐる', en: 'Inaba Meguru' },
    texts: [
      {
        zh: '让我整理一下接下来要讲解的内容。',
        jp: '次に説明する内容を整理させてください。',
        en: 'Let me organize the content for the next section.',
      },
      {
        zh: '这里涉及一些专业知识，稍等片刻。',
        jp: 'ここには専門知識が含まれています、少々お待ちください。',
        en: 'This involves some specialized knowledge, just a moment.',
      },
    ],
  },
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG: IncrementalControllerConfig = {
  enabled: true,
  language: 'zh',
  transition: {
    showWaitingDialogue: true,
    waitingTimeout: 2000,
    allowSkip: false,
  },
  preloadNext: true,
  autoContinue: true,
};

/**
 * Incremental Content Controller
 */
export class IncrementalController {
  private state: DynamicContentState;
  private config: IncrementalControllerConfig;
  private segmentScripts: Map<string, string>;
  private waitingResolvers: Map<string, () => void>;

  constructor(config: Partial<IncrementalControllerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.state = {
      currentSegmentId: '',
      availableSegments: new Set(),
      segmentInfoMap: new Map(),
      loadingSegment: null,
      isBackgroundGenerating: false,
      listeners: new Set(),
    };

    this.segmentScripts = new Map();
    this.waitingResolvers = new Map();
  }

  /**
   * Initialize with segment information
   */
  initialize(segments: SegmentInfo[]): void {
    this.state.segmentInfoMap.clear();
    this.state.availableSegments.clear();

    for (const segment of segments) {
      this.state.segmentInfoMap.set(segment.id, segment);

      if (segment.status === 'available') {
        this.state.availableSegments.add(segment.id);
      }
    }

    // Set first available segment as current
    const firstAvailable = segments.find((s) => s.status === 'available');
    if (firstAvailable) {
      this.state.currentSegmentId = firstAvailable.id;
    }
  }

  /**
   * Register segment script content
   */
  registerSegmentScript(segmentId: string, scriptContent: string): void {
    this.segmentScripts.set(segmentId, scriptContent);
  }

  /**
   * Mark segment as available
   */
  markSegmentAvailable(segmentId: string): void {
    this.state.availableSegments.add(segmentId);

    const segmentInfo = this.state.segmentInfoMap.get(segmentId);
    if (segmentInfo) {
      segmentInfo.status = 'available';
    }

    // Resolve any waiting promises
    const resolver = this.waitingResolvers.get(segmentId);
    if (resolver) {
      resolver();
      this.waitingResolvers.delete(segmentId);
    }

    this.emitEvent({
      type: 'segment_available',
      segmentId,
      timestamp: new Date(),
    });
  }

  /**
   * Check if segment is available
   */
  isSegmentAvailable(segmentId: string): boolean {
    return this.state.availableSegments.has(segmentId);
  }

  /**
   * Get next segment ID
   */
  getNextSegmentId(currentSegmentId: string): string | null {
    const segments = Array.from(this.state.segmentInfoMap.values()).sort((a, b) => a.priority - b.priority);

    const currentIndex = segments.findIndex((s) => s.id === currentSegmentId);
    if (currentIndex >= 0 && currentIndex < segments.length - 1) {
      return segments[currentIndex + 1].id;
    }

    return null;
  }

  /**
   * Transition to next segment
   */
  async transitionToNextSegment(): Promise<{
    success: boolean;
    nextSegmentId: string | null;
    waitingDialogue?: WaitingDialogue;
  }> {
    const nextSegmentId = this.getNextSegmentId(this.state.currentSegmentId);

    if (!nextSegmentId) {
      return { success: false, nextSegmentId: null };
    }

    // Check if next segment is available
    if (this.isSegmentAvailable(nextSegmentId)) {
      this.state.currentSegmentId = nextSegmentId;
      return { success: true, nextSegmentId };
    }

    // Need to wait for segment
    this.state.loadingSegment = nextSegmentId;

    this.emitEvent({
      type: 'segment_loading',
      segmentId: nextSegmentId,
      timestamp: new Date(),
    });

    // Get waiting dialogue
    let waitingDialogue: WaitingDialogue | undefined;

    if (this.config.transition.showWaitingDialogue) {
      waitingDialogue = this.getRandomWaitingDialogue();
    }

    // Wait for segment to become available
    await this.waitForSegment(nextSegmentId);

    this.state.loadingSegment = null;
    this.state.currentSegmentId = nextSegmentId;

    this.emitEvent({
      type: 'segment_ready',
      segmentId: nextSegmentId,
      timestamp: new Date(),
    });

    return { success: true, nextSegmentId, waitingDialogue };
  }

  /**
   * Wait for segment to become available
   */
  private waitForSegment(segmentId: string): Promise<void> {
    if (this.isSegmentAvailable(segmentId)) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitingResolvers.set(segmentId, resolve);
    });
  }

  /**
   * Get a random waiting dialogue
   */
  getRandomWaitingDialogue(): WaitingDialogue {
    const characters = Object.keys(DEFAULT_WAITING_DIALOGUES);
    const randomChar = characters[Math.floor(Math.random() * characters.length)];
    const charData = DEFAULT_WAITING_DIALOGUES[randomChar];

    const randomText = charData.texts[Math.floor(Math.random() * charData.texts.length)];

    return {
      characterId: randomChar,
      sprite: `${randomChar}.webp`,
      name: charData.name[this.config.language],
      text: randomText[this.config.language],
    };
  }

  /**
   * Get all waiting dialogues for a character
   */
  getWaitingDialoguesForCharacter(characterId: string): WaitingDialogue[] {
    const charData = DEFAULT_WAITING_DIALOGUES[characterId];
    if (!charData) return [];

    return charData.texts.map((text) => ({
      characterId,
      sprite: `${characterId}.webp`,
      name: charData.name[this.config.language],
      text: text[this.config.language],
    }));
  }

  /**
   * Get current segment info
   */
  getCurrentSegment(): SegmentInfo | undefined {
    return this.state.segmentInfoMap.get(this.state.currentSegmentId);
  }

  /**
   * Get all segment info
   */
  getAllSegments(): SegmentInfo[] {
    return Array.from(this.state.segmentInfoMap.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get generation progress
   */
  getProgress(): {
    total: number;
    available: number;
    percentage: number;
    canStart: boolean;
  } {
    const total = this.state.segmentInfoMap.size;
    const available = this.state.availableSegments.size;
    const percentage = total > 0 ? Math.round((available / total) * 100) : 0;

    return {
      total,
      available,
      percentage,
      canStart: percentage >= 50,
    };
  }

  /**
   * Set background generation status
   */
  setBackgroundGenerating(isGenerating: boolean): void {
    this.state.isBackgroundGenerating = isGenerating;
  }

  /**
   * Check if background generation is active
   */
  isBackgroundGenerating(): boolean {
    return this.state.isBackgroundGenerating;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<IncrementalControllerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set display language
   */
  setLanguage(language: 'zh' | 'jp' | 'en'): void {
    this.config.language = language;
  }

  /**
   * Get current language
   */
  getLanguage(): 'zh' | 'jp' | 'en' {
    return this.config.language;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: DynamicContentListener): () => void {
    this.state.listeners.add(listener);
    return () => this.state.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: DynamicContentEvent): void {
    for (const listener of this.state.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }

  /**
   * Report generation progress
   */
  reportProgress(segmentId: string, progress: number): void {
    this.emitEvent({
      type: 'generation_progress',
      segmentId,
      progress,
      timestamp: new Date(),
    });
  }

  /**
   * Report generation error
   */
  reportError(segmentId: string, error: string): void {
    const segmentInfo = this.state.segmentInfoMap.get(segmentId);
    if (segmentInfo) {
      segmentInfo.status = 'unavailable';
    }

    this.emitEvent({
      type: 'segment_error',
      segmentId,
      error,
      timestamp: new Date(),
    });
  }

  /**
   * Check if all segments are complete
   */
  isAllComplete(): boolean {
    return this.state.availableSegments.size === this.state.segmentInfoMap.size;
  }

  /**
   * Mark all generation as complete
   */
  markAllComplete(): void {
    this.state.isBackgroundGenerating = false;

    this.emitEvent({
      type: 'all_complete',
      timestamp: new Date(),
    });
  }

  /**
   * Get script content for segment
   */
  getSegmentScript(segmentId: string): string | undefined {
    return this.segmentScripts.get(segmentId);
  }

  /**
   * Check if controller is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Reset controller state
   */
  reset(): void {
    this.state = {
      currentSegmentId: '',
      availableSegments: new Set(),
      segmentInfoMap: new Map(),
      loadingSegment: null,
      isBackgroundGenerating: false,
      listeners: new Set(),
    };

    this.segmentScripts.clear();
    this.waitingResolvers.clear();
  }
}

/**
 * Global incremental controller instance
 */
let globalController: IncrementalController | null = null;

/**
 * Get or create global incremental controller
 */
export function getIncrementalController(): IncrementalController {
  if (!globalController) {
    globalController = new IncrementalController();
  }
  return globalController;
}

/**
 * Initialize incremental controller with config
 */
export function initIncrementalController(config?: Partial<IncrementalControllerConfig>): IncrementalController {
  globalController = new IncrementalController(config);
  return globalController;
}
