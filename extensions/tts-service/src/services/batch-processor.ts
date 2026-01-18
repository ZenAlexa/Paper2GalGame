/**
 * Batch TTS Processor
 *
 * Handles batch generation of TTS audio with concurrency control,
 * WebGAL script parsing, and progress tracking
 */

import type {
  TTSEmotion,
  BatchTTSRequest,
  BatchTTSResult,
  CharacterVoiceSettings
} from '../types';
import { TTSService } from './tts-service';

/**
 * Parsed say command from WebGAL script
 */
interface SayCommand {
  id: string;
  text: string;
  speaker: string;
  characterId: string;
  emotion?: TTSEmotion;
  vocalFile?: string;
}

/**
 * Emotion detection result
 */
interface EmotionAnalysis {
  emotion: TTSEmotion;
  confidence: number;
}

/**
 * Batch TTS Processor
 */
export class BatchTTSProcessor {
  private ttsService: TTSService;
  private characterConfigs: Map<string, CharacterVoiceSettings>;

  constructor(
    ttsService: TTSService,
    characterConfigs?: Map<string, CharacterVoiceSettings>
  ) {
    this.ttsService = ttsService;
    this.characterConfigs = characterConfigs || new Map();
  }

  /**
   * Set character configurations
   */
  setCharacterConfigs(configs: Map<string, CharacterVoiceSettings>): void {
    this.characterConfigs = configs;
  }

  /**
   * Add character configuration
   */
  addCharacterConfig(characterId: string, config: CharacterVoiceSettings): void {
    this.characterConfigs.set(characterId, config);
  }

  /**
   * Process batch TTS request
   */
  async processBatch(request: BatchTTSRequest): Promise<BatchTTSResult> {
    const startTime = Date.now();
    const successful: BatchTTSResult['successful'] = [];
    const failed: BatchTTSResult['failed'] = [];
    let cacheHits = 0;

    const concurrency = request.concurrency || 3;
    const chunks = this.chunkArray(request.items, concurrency);
    let completed = 0;

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map(async item => {
          const config = this.characterConfigs.get(item.characterId);
          if (!config) {
            throw new Error(`No voice config for character: ${item.characterId}`);
          }

          const emotion = item.emotion || this.detectEmotion(item.text).emotion;

          const url = await this.ttsService.generateSpeech(
            item.text,
            item.characterId,
            config,
            { emotion }
          );

          return { id: item.id, url };
        })
      );

      // Process results
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const item = chunk[i];
        completed++;

        if (result.status === 'fulfilled') {
          successful.push({
            id: result.value.id,
            url: result.value.url,
            cacheKey: `${item.characterId}_${item.emotion || 'neutral'}`
          });
        } else {
          failed.push({
            id: item.id,
            error: result.reason?.message || 'Unknown error'
          });
        }

        // Report progress
        if (request.onProgress) {
          request.onProgress(
            completed,
            request.items.length,
            item.text.substring(0, 50)
          );
        }
      }
    }

    // Calculate cache hits from service stats
    const cacheStats = this.ttsService.getCacheStats();
    if (cacheStats) {
      cacheHits = Math.round(cacheStats.hitRate * successful.length);
    }

    return {
      batchId: request.batchId,
      successful,
      failed,
      totalTime: Date.now() - startTime,
      cacheHits
    };
  }

  /**
   * Pre-generate audio for WebGAL script
   */
  async preGenerateScriptAudio(
    script: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, string>> {
    const sayCommands = this.extractSayCommands(script);
    const audioMap = new Map<string, string>();

    const batchRequest: BatchTTSRequest = {
      batchId: `script_${Date.now()}`,
      items: sayCommands.map(cmd => ({
        id: cmd.id,
        text: cmd.text,
        characterId: cmd.characterId,
        emotion: cmd.emotion
      })),
      concurrency: 3,
      onProgress
    };

    const result = await this.processBatch(batchRequest);

    for (const item of result.successful) {
      audioMap.set(item.id, item.url);
    }

    return audioMap;
  }

  /**
   * Extract say commands from WebGAL script
   */
  extractSayCommands(script: string): SayCommand[] {
    const commands: SayCommand[] = [];
    const lines = script.split('\n');
    let lineIndex = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith(';')) {
        lineIndex++;
        continue;
      }

      // Match say command pattern
      // Format: say:text -speaker=Name -vocal=file.wav;
      // Or simpler: speaker:text;
      const sayMatch = trimmed.match(
        /^(?:say:)?(.+?)\s*(?:-speaker=([^-;]+))?(?:-vocal=([^-;]+))?;?\s*$/
      );

      if (sayMatch) {
        const text = sayMatch[1].trim();
        const speaker = sayMatch[2]?.trim() || '';
        const vocalFile = sayMatch[3]?.trim();

        // Try to identify character from speaker name
        const characterId = this.identifyCharacter(speaker);

        if (characterId && text && !this.isMathOnly(text)) {
          commands.push({
            id: `line_${lineIndex}`,
            text: this.cleanTextForTTS(text),
            speaker,
            characterId,
            emotion: this.detectEmotion(text).emotion,
            vocalFile
          });
        }
      }

      lineIndex++;
    }

    return commands;
  }

  /**
   * Detect emotion from text content
   */
  detectEmotion(text: string): EmotionAnalysis {
    // Punctuation-based detection
    const exclamationCount = (text.match(/[！!]/g) || []).length;
    const questionCount = (text.match(/[？?]/g) || []).length;
    const ellipsisCount = (text.match(/\.\.\.|…/g) || []).length;

    // Keyword-based detection
    const happyKeywords = ['哈哈', '太棒了', '开心', '高兴', '嬉しい', '楽しい', 'わーい'];
    const sadKeywords = ['可惜', '遗憾', '难过', '悲しい', '残念'];
    const seriousKeywords = ['但是', '然而', '不过', '问题', 'しかし', 'ただし'];
    const excitedKeywords = ['诶', '哇', '居然', '真的吗', 'えー', 'すごい'];

    // Score each emotion
    const scores: Record<TTSEmotion, number> = {
      neutral: 1,
      happy: 0,
      serious: 0,
      excited: 0,
      calm: 0,
      sad: 0,
      angry: 0
    };

    // Punctuation scoring
    if (exclamationCount >= 2) scores.excited += 3;
    else if (exclamationCount === 1) scores.happy += 1;

    if (questionCount >= 1) scores.happy += 1;
    if (ellipsisCount >= 1) scores.serious += 1;

    // Keyword scoring
    for (const keyword of happyKeywords) {
      if (text.includes(keyword)) scores.happy += 2;
    }
    for (const keyword of sadKeywords) {
      if (text.includes(keyword)) scores.sad += 2;
    }
    for (const keyword of seriousKeywords) {
      if (text.includes(keyword)) scores.serious += 2;
    }
    for (const keyword of excitedKeywords) {
      if (text.includes(keyword)) scores.excited += 2;
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
    const confidence = maxScore / totalScore;

    return {
      emotion: maxEmotion,
      confidence
    };
  }

  /**
   * Identify character from speaker name
   */
  private identifyCharacter(speaker: string): string | null {
    const speakerLower = speaker.toLowerCase();

    // Direct ID match
    if (this.characterConfigs.has(speakerLower)) {
      return speakerLower;
    }

    // Name mappings
    const nameMap: Record<string, string> = {
      '绫地宁宁': 'nene',
      'あやちねね': 'nene',
      'ayachi nene': 'nene',
      '宁宁': 'nene',
      '丛雨': 'murasame',
      'むらさめ': 'murasame',
      'murasame': 'murasame',
      '在原七海': 'nanami',
      'ありはらななみ': 'nanami',
      'arihara nanami': 'nanami',
      '七海': 'nanami',
      '因幡巡': 'meguru',
      'いなばめぐる': 'meguru',
      'inaba meguru': 'meguru',
      '巡': 'meguru'
    };

    // Remove spaces and normalize
    const normalized = speaker.replace(/\s+/g, '').toLowerCase();

    for (const [name, id] of Object.entries(nameMap)) {
      if (normalized.includes(name.replace(/\s+/g, '').toLowerCase())) {
        return id;
      }
    }

    return null;
  }

  /**
   * Check if text is only math formula
   */
  private isMathOnly(text: string): boolean {
    // Remove LaTeX delimiters and check if anything meaningful remains
    const withoutMath = text
      .replace(/\$\$[\s\S]*?\$\$/g, '')
      .replace(/\$[^$]+\$/g, '')
      .trim();

    return withoutMath.length === 0;
  }

  /**
   * Clean text for TTS processing
   */
  private cleanTextForTTS(text: string): string {
    return text
      // Remove LaTeX formulas (will be handled separately)
      .replace(/\$\$[\s\S]*?\$\$/g, ' [公式] ')
      .replace(/\$[^$]+\$/g, ' [公式] ')
      // Remove WebGAL markup
      .replace(/-speaker=[^-;]+/g, '')
      .replace(/-vocal=[^-;]+/g, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
