/**
 * Incremental Script Generator
 *
 * Generates WebGAL scripts incrementally, enabling 50% completion game start
 * with seamless background generation for remaining content
 */

import type { MultiLanguageContent } from '../types/character';
import type { GenerationOptions, WebGALScene, WebGALScript } from '../types/script';
import { createSegmentationStrategy, type PaperSegmentationStrategy } from './segmentation-strategy';
import type {
  BackgroundTask,
  GenerationProgress,
  IncrementalConfig,
  IncrementalGenerationResult,
  PaperSegment,
  ParsedPaper,
  SegmentEvent,
  SegmentEventListener,
  SegmentProgress,
  WaitingDialogue,
} from './types';

/**
 * Default waiting dialogues (tri-language)
 */
const DEFAULT_WAITING_DIALOGUES: WaitingDialogue[] = [
  {
    characterId: 'nene',
    content: {
      zh: '让我想想这个部分该怎么解释...',
      jp: 'この部分をどう説明すればいいか考えてみますね...',
      en: 'Let me think about how to explain this part...',
    },
    context: 'generating',
  },
  {
    characterId: 'murasame',
    content: {
      zh: '诶诶！这里有些复杂的概念呢，稍等一下！',
      jp: 'えぇ！ここは少し複雑な概念がありますね、ちょっと待ってください！',
      en: 'Wow! There are some complex concepts here, just a moment!',
    },
    context: 'generating',
  },
  {
    characterId: 'nanami',
    content: {
      zh: '这部分内容需要仔细分析，请稍候...',
      jp: 'この部分は慎重に分析する必要があります、少々お待ちください...',
      en: 'This part requires careful analysis, please wait...',
    },
    context: 'generating',
  },
  {
    characterId: 'meguru',
    content: {
      zh: '让我整理一下接下来要讲解的内容。',
      jp: '次に説明する内容を整理させてください。',
      en: 'Let me organize the content for the next section.',
    },
    context: 'transition',
  },
];

/**
 * Incremental Script Generator
 */
export class IncrementalScriptGenerator {
  private segmentationStrategy: PaperSegmentationStrategy;
  private scriptGenerator: ScriptGeneratorInterface;
  private config: IncrementalConfig;
  private eventListeners: Set<SegmentEventListener>;
  private backgroundTasks: Map<string, BackgroundTask>;
  private generatedScripts: Map<string, WebGALScene[]>;
  private waitingDialogues: WaitingDialogue[];

  constructor(scriptGenerator: ScriptGeneratorInterface, config: Partial<IncrementalConfig> = {}) {
    this.scriptGenerator = scriptGenerator;
    this.config = {
      minStartPercentage: 50,
      enableBackgroundGeneration: true,
      backgroundTaskDelay: 1000,
      maxConcurrentTasks: 2,
      enableWaitingDialogues: true,
      retryFailedSegments: true,
      maxRetryAttempts: 3,
      ...config,
    };

    this.segmentationStrategy = createSegmentationStrategy(this.config);
    this.eventListeners = new Set();
    this.backgroundTasks = new Map();
    this.generatedScripts = new Map();
    this.waitingDialogues = [...DEFAULT_WAITING_DIALOGUES];
  }

  /**
   * Generate initial content (first 50%) and prepare background tasks
   */
  async generateInitialContent(
    paperData: ParsedPaper,
    options: GenerationOptions
  ): Promise<IncrementalGenerationResult> {
    // Segment the paper
    const segments = this.segmentationStrategy.segmentPaper(paperData);
    const prioritySegments = this.segmentationStrategy.getPrioritySegments(segments);
    const backgroundSegments = this.segmentationStrategy.getBackgroundSegments(segments);

    // Generate priority segments (blocking)
    const immediateScenes: WebGALScene[] = [];
    for (const segment of prioritySegments) {
      this.emitEvent({
        type: 'segment_started',
        segmentId: segment.id,
        data: {},
        timestamp: new Date(),
      });

      try {
        const scenes = await this.generateSegment(segment, paperData, options);
        immediateScenes.push(...scenes);
        this.generatedScripts.set(segment.id, scenes);

        this.emitEvent({
          type: 'segment_completed',
          segmentId: segment.id,
          data: {
            dialogueCount: scenes.reduce((sum, s) => sum + s.lines.length, 0),
            scenes,
          },
          timestamp: new Date(),
        });
      } catch (error) {
        this.emitEvent({
          type: 'segment_failed',
          segmentId: segment.id,
          data: { error: (error as Error).message },
          timestamp: new Date(),
        });
        throw error;
      }
    }

    // Prepare background tasks
    const backgroundTasks: BackgroundTask[] = backgroundSegments.map((segment) => ({
      segmentId: segment.id,
      paperData,
      options,
      estimatedTime: this.segmentationStrategy.estimateGenerationTime(segment),
      status: 'queued' as const,
    }));

    // Store background tasks
    for (const task of backgroundTasks) {
      this.backgroundTasks.set(task.segmentId, task);
    }

    // Build immediate script
    const immediateScript = this.buildScript(immediateScenes, paperData, options, prioritySegments);

    // Calculate initial progress
    const initialProgress = this.calculateProgress(segments);

    // Create game ready callback
    const gameReadyCallback = () => {
      this.emitEvent({
        type: 'game_ready',
        segmentId: 'all',
        data: {},
        timestamp: new Date(),
      });

      // Start background generation
      if (this.config.enableBackgroundGeneration) {
        this.startBackgroundGeneration(backgroundTasks, segments);
      }
    };

    return {
      immediateScript,
      backgroundTasks,
      gameReadyCallback,
      initialProgress,
    };
  }

  /**
   * Generate a single segment
   */
  private async generateSegment(
    segment: PaperSegment,
    paperData: ParsedPaper,
    options: GenerationOptions
  ): Promise<WebGALScene[]> {
    // Use the script generator to create scenes for this segment
    return await this.scriptGenerator.generateSegmentScenes(segment, paperData, options);
  }

  /**
   * Start background generation for remaining segments
   */
  private async startBackgroundGeneration(tasks: BackgroundTask[], allSegments: PaperSegment[]): Promise<void> {
    for (const task of tasks) {
      try {
        // Update task status
        task.status = 'running';
        this.backgroundTasks.set(task.segmentId, task);

        // Find segment
        const segment = allSegments.find((s) => s.id === task.segmentId);
        if (!segment) continue;

        // Emit start event
        this.emitEvent({
          type: 'segment_started',
          segmentId: task.segmentId,
          data: {},
          timestamp: new Date(),
        });

        // Generate with retry
        let scenes: WebGALScene[] | null = null;
        let attempts = 0;
        let lastError: Error | null = null;

        while (attempts < this.config.maxRetryAttempts && !scenes) {
          attempts++;
          try {
            scenes = await this.generateSegment(segment, task.paperData, task.options);
          } catch (error) {
            lastError = error as Error;
            if (attempts < this.config.maxRetryAttempts) {
              await this.delay(this.config.backgroundTaskDelay * attempts);
            }
          }
        }

        if (scenes) {
          // Success
          this.generatedScripts.set(task.segmentId, scenes);
          task.status = 'completed';

          this.emitEvent({
            type: 'segment_completed',
            segmentId: task.segmentId,
            data: {
              dialogueCount: scenes.reduce((sum, s) => sum + s.lines.length, 0),
              scenes,
            },
            timestamp: new Date(),
          });
        } else {
          // Failed after retries
          task.status = 'failed';

          this.emitEvent({
            type: 'segment_failed',
            segmentId: task.segmentId,
            data: { error: lastError?.message || 'Unknown error' },
            timestamp: new Date(),
          });
        }

        // Delay before next task
        await this.delay(this.config.backgroundTaskDelay);
      } catch (error) {
        task.status = 'failed';
        console.error(`Background generation failed for ${task.segmentId}:`, error);
      }
    }
  }

  /**
   * Build WebGAL script from scenes
   */
  private buildScript(
    scenes: WebGALScene[],
    paperData: ParsedPaper,
    options: GenerationOptions,
    segments: PaperSegment[]
  ): WebGALScript {
    return {
      metadata: {
        title: {
          zh: `${paperData.metadata.title} - 游戏脚本`,
          jp: `${paperData.metadata.title} - ゲームスクリプト`,
          en: `${paperData.metadata.title} - Game Script`,
        },
        paperTitle: {
          zh: paperData.metadata.title,
          jp: paperData.metadata.title, // May need translation
          en: paperData.metadata.title,
        },
        timestamp: new Date(),
        version: '1.0.0',
        multiLanguage: {
          supportedLanguages: ['zh', 'jp', 'en'],
          primaryLanguage: options.multiLanguage.primaryLanguage,
          currentLanguage: options.multiLanguage.primaryLanguage,
        },
        characters: options.characters,
        totalDuration: segments.reduce((sum, s) => sum + this.segmentationStrategy.estimateGenerationTime(s), 0),
      },
      scenes,
      validation: {
        isValid: true,
        errors: [],
        warnings: [],
      },
    };
  }

  /**
   * Calculate current generation progress
   */
  private calculateProgress(segments: PaperSegment[]): GenerationProgress {
    const segmentProgress: SegmentProgress[] = segments.map((segment) => {
      const generated = this.generatedScripts.has(segment.id);
      const task = this.backgroundTasks.get(segment.id);

      let status: SegmentProgress['status'];
      if (generated) {
        status = 'completed';
      } else if (task?.status === 'running') {
        status = 'generating';
      } else if (task?.status === 'failed') {
        status = 'failed';
      } else {
        status = 'pending';
      }

      const result: SegmentProgress = {
        segmentId: segment.id,
        status,
        progress: generated ? 100 : status === 'generating' ? 50 : 0,
        message: this.getProgressMessage(status, segment),
        timestamp: new Date(),
      };

      if (generated) {
        const script = this.generatedScripts.get(segment.id);
        if (script) {
          result.script = script;
        }
      }

      return result;
    });

    const completedCount = segmentProgress.filter((s) => s.status === 'completed').length;
    const totalEstimatedDialogues = segments.reduce((sum, s) => sum + s.estimatedDialogues, 0);
    const completedDialogues = segments
      .filter((s) => this.generatedScripts.has(s.id))
      .reduce((sum, s) => sum + s.estimatedDialogues, 0);

    const overallProgress =
      totalEstimatedDialogues > 0 ? Math.round((completedDialogues / totalEstimatedDialogues) * 100) : 0;

    return {
      totalSegments: segments.length,
      completedSegments: completedCount,
      overallProgress,
      canStartGame: overallProgress >= this.config.minStartPercentage,
      segments: segmentProgress,
      estimatedTimeRemaining: this.estimateRemainingTime(segments),
    };
  }

  /**
   * Get progress message for segment
   */
  private getProgressMessage(status: SegmentProgress['status'], segment: PaperSegment): MultiLanguageContent {
    switch (status) {
      case 'completed':
        return {
          zh: `${segment.title.zh} 已完成`,
          jp: `${segment.title.jp} 完了`,
          en: `${segment.title.en} completed`,
        };
      case 'generating':
        return {
          zh: `正在生成 ${segment.title.zh}...`,
          jp: `${segment.title.jp} を生成中...`,
          en: `Generating ${segment.title.en}...`,
        };
      case 'failed':
        return {
          zh: `${segment.title.zh} 生成失败`,
          jp: `${segment.title.jp} 生成失敗`,
          en: `${segment.title.en} generation failed`,
        };
      default:
        return {
          zh: `等待生成 ${segment.title.zh}`,
          jp: `${segment.title.jp} 生成待ち`,
          en: `Waiting to generate ${segment.title.en}`,
        };
    }
  }

  /**
   * Estimate remaining generation time
   */
  private estimateRemainingTime(segments: PaperSegment[]): number {
    let remaining = 0;

    for (const segment of segments) {
      if (!this.generatedScripts.has(segment.id)) {
        remaining += this.segmentationStrategy.estimateGenerationTime(segment);
      }
    }

    return remaining;
  }

  /**
   * Get generated script for a segment
   */
  getSegmentScript(segmentId: string): WebGALScene[] | undefined {
    return this.generatedScripts.get(segmentId);
  }

  /**
   * Check if segment is available
   */
  isSegmentAvailable(segmentId: string): boolean {
    return this.generatedScripts.has(segmentId);
  }

  /**
   * Get all generated scenes in order
   */
  getAllGeneratedScenes(): WebGALScene[] {
    const allScenes: WebGALScene[] = [];

    // Sort by segment priority and collect scenes
    const sortedKeys = Array.from(this.generatedScripts.keys()).sort();
    for (const key of sortedKeys) {
      const scenes = this.generatedScripts.get(key);
      if (scenes) {
        allScenes.push(...scenes);
      }
    }

    return allScenes;
  }

  /**
   * Get a random waiting dialogue
   */
  getWaitingDialogue(context: WaitingDialogue['context']): WaitingDialogue | undefined {
    const contextDialogues = this.waitingDialogues.filter((d) => d.context === context);
    if (contextDialogues.length === 0) return undefined;

    const index = Math.floor(Math.random() * contextDialogues.length);
    return contextDialogues[index];
  }

  /**
   * Add custom waiting dialogue
   */
  addWaitingDialogue(dialogue: WaitingDialogue): void {
    this.waitingDialogues.push(dialogue);
  }

  /**
   * Subscribe to segment events
   */
  addEventListener(listener: SegmentEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: SegmentEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Interface for the actual script generator
 * To be implemented by the main script generator
 */
export interface ScriptGeneratorInterface {
  generateSegmentScenes(
    segment: PaperSegment,
    paperData: ParsedPaper,
    options: GenerationOptions
  ): Promise<WebGALScene[]>;
}

/**
 * Create incremental script generator
 */
export function createIncrementalGenerator(
  scriptGenerator: ScriptGeneratorInterface,
  config?: Partial<IncrementalConfig>
): IncrementalScriptGenerator {
  return new IncrementalScriptGenerator(scriptGenerator, config);
}
