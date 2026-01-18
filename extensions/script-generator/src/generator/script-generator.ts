/**
 * Script Generator Core
 *
 * High-level script generation orchestrator that combines OpenRouter API
 * with character configurations and prompt engineering
 */

import { OpenRouterClient } from '../openrouter';
import { CHARACTER_CONFIGS, getCharacter, validateCharacterSelection } from '../characters';
import type {
  ParsedPaper,
  GenerationOptions,
  WebGALScript,
  WebGALScene,
  WebGALLine,
  Character,
  OpenRouterConfig
} from '../types';

/**
 * Script generation result
 */
export interface GenerationResult {
  /** Success flag */
  success: boolean;

  /** Generated script (if successful) */
  script?: WebGALScript;

  /** Error message (if failed) */
  error?: string;

  /** Generation metadata */
  metadata: {
    /** Time taken (ms) */
    generationTime: number;

    /** API usage stats */
    usage?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      estimatedCost?: number;
    };

    /** Quality metrics */
    quality: {
      syntaxScore: number;
      characterScore: number;
      educationalScore: number;
      overallScore: number;
    };
  };
}

/**
 * Main script generator class
 */
export class ScriptGenerator {
  private readonly openRouterClient: OpenRouterClient;
  private readonly version = '0.1.0';

  /**
   * Create script generator instance
   */
  constructor(openRouterConfig: OpenRouterConfig) {
    this.openRouterClient = new OpenRouterClient(openRouterConfig);
  }

  /**
   * Generate WebGAL script from parsed paper
   */
  async generateScript(
    paperData: ParsedPaper,
    options: GenerationOptions
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // Validate inputs
      const validation = this.validateInputs(paperData, options);
      if (!validation.valid) {
        return this.createErrorResult(
          `Validation failed: ${validation.errors.join(', ')}`,
          Date.now() - startTime
        );
      }

      // Generate enhanced prompt
      const prompt = this.buildEnhancedPrompt(paperData, options);

      // Call OpenRouter API
      const response = await this.openRouterClient.generateScript({
        paperData,
        characters: options.characters,
        options: {
          educationalWeight: options.style.educationalWeight,
          style: 'formal' as const,
          includeInteractions: options.style.interactive
        }
      });

      // Parse and structure the generated script
      const script = await this.parseGeneratedScript(
        response.script,
        paperData,
        options,
        response.metadata
      );

      // Calculate quality metrics
      const quality = this.calculateQualityMetrics(script, response.validation);

      return {
        success: true,
        script,
        metadata: {
          generationTime: Date.now() - startTime,
          usage: {
            inputTokens: response.metadata.usage.prompt_tokens,
            outputTokens: response.metadata.usage.completion_tokens,
            totalTokens: response.metadata.usage.total_tokens,
            ...(response.metadata.usage.estimated_cost && { estimatedCost: response.metadata.usage.estimated_cost })
          },
          quality
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(errorMessage, Date.now() - startTime);
    }
  }

  /**
   * Validate generation inputs
   */
  private validateInputs(paperData: ParsedPaper, options: GenerationOptions): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate paper data
    if (!paperData) {
      errors.push('Paper data is required');
    } else {
      if (!paperData.metadata?.title) {
        errors.push('Paper must have a title');
      }
      if (!paperData.rawText || paperData.rawText.length < 100) {
        errors.push('Paper content is too short');
      }
    }

    // Validate character selection
    const characterValidation = validateCharacterSelection(options.characters);
    if (!characterValidation.valid) {
      errors.push(...characterValidation.errors);
    }

    // Validate multi-language options
    if (!['zh', 'jp', 'en'].includes(options.multiLanguage.primaryLanguage)) {
      errors.push('Primary language must be zh, jp, or en');
    }

    if (options.style.educationalWeight < 0 || options.style.educationalWeight > 1) {
      errors.push('Educational weight must be between 0 and 1');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Build enhanced prompt with multi-language support
   */
  private buildEnhancedPrompt(paperData: ParsedPaper, options: GenerationOptions): string {
    const selectedCharacters = options.characters
      .map(id => getCharacter(id))
      .filter((char): char is Character => char !== null);

    const primaryLang = options.multiLanguage.primaryLanguage;
    const characterDetails = selectedCharacters.map(char => `
### ${char.name[primaryLang]} (${char.id})
- **性格**: ${char.personality.join('、')}
- **表达方式**: ${char.speakingStyle.join('、')}
- **论文角色**: ${char.paperRole}
- **常用语**: ${char.phrases.slice(0, 3).join('、')}
`).join('\n');

    const paperSummary = this.createPaperSummary(paperData);

    return `# Paper2GalGame 三语言并行剧本生成

## 任务概述
将学术论文转换为WebGAL格式的教育性Galgame脚本，**同时生成中文、日文、英文三个版本**，平衡教育价值与娱乐性。

## 重要要求 ⭐
**每句对话都必须提供中文、日文、英文三个版本，格式严格如下：**

示例格式:
changeBg:教室.webp;
changeFigure:nene.webp -center;
say:大家好，今天我们来学习这篇论文。||皆さん、こんにちは。今日はこの論文を学習しましょう。||Hello everyone, let's study this paper today. -speaker=绫地宁宁||あやち ねね||Ayachi Nene -vocal=nene_001.wav;

**格式说明**:
- 对话内容: 中文内容||日文内容||英文内容
- 角色名: 中文名||日文名||英文名
- 语音文件统一使用日文命名

## 角色配置
${characterDetails}

## 论文内容
**标题**: ${paperData.metadata.title}
**作者**: ${paperData.metadata.authors?.join('、') || '未知'}

${paperSummary}

## 生成要求

### 脚本结构
1. **开场** (2-3句): 角色登场，营造学习氛围
2. **内容讲解** (20-30句): 分段详细讲解，角色互动
3. **深入讨论** (8-12句): 重点难点分析，角色各抒己见
4. **总结回顾** (4-6句): 总结要点，加深理解
5. **结束** (2句): 结束语，期待下次

### 三语言对话要求
- **中文**: 标准现代汉语，教育性用词
- **日文**: 自然的口语日语，符合角色人设
- **英文**: 地道英语表达，学术性适中
- **一致性**: 三种语言表达相同含义，但要自然地道
- **角色特色**: 每种语言都要体现角色性格特点

### 质量标准
- 教育权重: ${(options.style.educationalWeight * 100).toFixed(0)}%
- 复杂度: ${options.style.complexity}
- 主要语言: ${primaryLang}
- 互动性: ${options.style.interactive ? '启用' : '禁用'}

请生成完整的三语言WebGAL脚本，确保每句话都有对应的三种语言版本，内容准确且自然。`;
  }

  /**
   * Create paper summary for prompt
   */
  private createPaperSummary(paperData: ParsedPaper): string {
    let summary = '';

    if (paperData.sections && paperData.sections.length > 0) {
      for (const section of paperData.sections) {
        if (section.type && ['abstract', 'introduction', 'methodology', 'results', 'conclusion'].includes(section.type.toLowerCase())) {
          summary += `### ${section.title}\n${section.content.substring(0, 400)}...\n\n`;
        }
      }
    }

    if (!summary) {
      summary = `### 论文内容\n${paperData.rawText.substring(0, 1200)}...\n`;
    }

    return summary;
  }

  /**
   * Parse generated script into structured format
   */
  private async parseGeneratedScript(
    rawScript: string,
    paperData: ParsedPaper,
    options: GenerationOptions,
    apiMetadata: any
  ): Promise<WebGALScript> {
    // Extract script content from markdown code blocks if present
    let cleanScript = rawScript;
    const codeBlockMatch = rawScript.match(/```(?:webgal)?\n([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleanScript = codeBlockMatch[1];
    }

    const lines = cleanScript.split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('//')) // Filter comments
      .map((line, index) => this.parseScriptLine(line, index));

    // Group lines into scenes based on content flow
    const scenes = this.groupLinesIntoScenes(lines, paperData);

    const script: WebGALScript = {
      metadata: {
        title: {
          zh: `${paperData.metadata.title} - WebGAL脚本`,
          jp: `${paperData.metadata.title} - WebGALスクリプト`,
          en: `${paperData.metadata.title} - WebGAL Script`
        },
        paperTitle: {
          zh: paperData.metadata.title || '未知论文',
          jp: paperData.metadata.title || '不明な論文',
          en: paperData.metadata.title || 'Unknown Paper'
        },
        timestamp: new Date(),
        version: this.version,
        multiLanguage: {
          supportedLanguages: ['zh', 'jp', 'en'],
          primaryLanguage: options.multiLanguage.primaryLanguage,
          currentLanguage: options.multiLanguage.primaryLanguage
        },
        characters: options.characters,
        totalDuration: this.estimateScriptDuration(lines)
      },
      scenes,
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    };

    return script;
  }

  /**
   * Parse individual script line with multi-language support
   */
  private parseScriptLine(line: string, index: number): WebGALLine {
    const trimmedLine = line.trim();

    if (trimmedLine.includes(':')) {
      const [command, rest] = trimmedLine.split(':', 2);
      const params = rest ? [rest] : [];

      // Parse multi-language content for 'say' commands
      if (command === 'say' && rest) {
        const multiLangContent = this.parseMultiLanguageContent(rest);
        if (multiLangContent) {
          return {
            command: command as any,
            params: [JSON.stringify(multiLangContent)], // Store as JSON for later extraction
            options: this.parseMultiLanguageOptions(trimmedLine),
            raw: trimmedLine,
            metadata: {
              confidence: 1.0,
              relevance: 1.0,
              isMultiLanguage: true
            }
          };
        }
      }

      return {
        command: command as any,
        params,
        options: this.parseLineOptions(trimmedLine),
        raw: trimmedLine,
        metadata: {
          confidence: 1.0,
          relevance: 1.0
        }
      };
    }

    // Fallback for non-command lines
    return {
      command: 'say',
      params: [trimmedLine],
      options: {},
      raw: trimmedLine,
      metadata: {
        confidence: 0.8,
        relevance: 0.9
      }
    };
  }

  /**
   * Parse multi-language content from say command
   * Format: "中文内容||日文内容||英文内容"
   */
  private parseMultiLanguageContent(content: string): { zh: string; jp: string; en: string; } | null {
    // Find the main content before -speaker option
    const speakerMatch = content.match(/(.*?)\s+-speaker=/);
    const mainContent = speakerMatch && speakerMatch[1] ? speakerMatch[1].trim() : content.trim();

    const parts = mainContent.split('||');
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      return {
        zh: parts[0].trim(),
        jp: parts[1].trim(),
        en: parts[2].trim()
      };
    }
    return null;
  }

  /**
   * Parse multi-language options from command line
   * Format: -speaker=中文名||日文名||英文名
   */
  private parseMultiLanguageOptions(line: string): Record<string, any> {
    const options: Record<string, any> = {};

    // Parse speaker names
    const speakerMatch = line.match(/-speaker=([^\\s]+)/);
    if (speakerMatch && speakerMatch[1]) {
      const speakerContent = speakerMatch[1];
      const speakerParts = speakerContent.split('||');
      if (speakerParts.length === 3 && speakerParts[0] && speakerParts[1] && speakerParts[2]) {
        options.speaker = {
          zh: speakerParts[0].trim(),
          jp: speakerParts[1].trim(),
          en: speakerParts[2].trim()
        };
      } else {
        options.speaker = speakerContent;
      }
    }

    // Parse vocal option (always single language - Japanese)
    const vocalMatch = line.match(/-vocal=([^\\s]+)/);
    if (vocalMatch) {
      options.vocal = vocalMatch[1];
    }

    return options;
  }

  /**
   * Parse line options (e.g., -speaker=name -vocal=file.wav)
   */
  private parseLineOptions(line: string): Record<string, string | number | boolean> {
    const options: Record<string, string | number | boolean> = {};
    const optionMatches = line.match(/-([\\w]+)=([^\\s]+)/g) || [];

    for (const match of optionMatches) {
      const [, key, value] = match.match(/-([\\w]+)=([^\\s]+)/) || [];
      if (key && value) {
        options[key] = value;
      }
    }

    return options;
  }

  /**
   * Group script lines into logical scenes
   */
  private groupLinesIntoScenes(lines: WebGALLine[], paperData: ParsedPaper): WebGALScene[] {
    const scenes: WebGALScene[] = [];
    let currentSceneLines: WebGALLine[] = [];
    let sceneIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      currentSceneLines.push(line);

      // Scene break detection (simplified)
      const nextLine = lines[i + 1];
      const isSceneBreak =
        currentSceneLines.length >= 15 || // Max lines per scene
        (i < lines.length - 1 && nextLine && nextLine.command === 'changeBg'); // Background change

      if (isSceneBreak || i === lines.length - 1) {
        const sceneType = this.determineSceneType(sceneIndex, currentSceneLines.length);

        scenes.push({
          name: `scene_${sceneIndex + 1}`,
          title: this.generateSceneTitle(sceneType, sceneIndex),
          lines: [...currentSceneLines],
          metadata: {
            type: sceneType,
            objectives: this.generateSceneObjectives(sceneType),
            duration: this.estimateSceneDuration(currentSceneLines)
          }
        });

        currentSceneLines = [];
        sceneIndex++;
      }
    }

    return scenes;
  }

  /**
   * Determine scene type based on position and content
   */
  private determineSceneType(index: number, lineCount: number): 'introduction' | 'content' | 'summary' | 'discussion' {
    if (index === 0) return 'introduction';
    if (lineCount < 10) return 'summary';
    return index % 2 === 1 ? 'content' : 'discussion';
  }

  /**
   * Generate scene title
   */
  private generateSceneTitle(type: string, index: number): string {
    const titles = {
      introduction: '开场介绍',
      content: `内容讲解 ${Math.floor(index / 2) + 1}`,
      discussion: `深入讨论 ${Math.floor(index / 2)}`,
      summary: '总结回顾'
    };
    return titles[type as keyof typeof titles] || `场景 ${index + 1}`;
  }

  /**
   * Generate scene objectives
   */
  private generateSceneObjectives(type: string): string[] {
    const objectives = {
      introduction: ['营造学习氛围', '介绍论文主题', '角色登场'],
      content: ['传达论文核心内容', '确保概念理解', '维持学习兴趣'],
      discussion: ['深化理解', '多角度分析', '激发思考'],
      summary: ['巩固知识', '总结要点', '展望应用']
    };
    return objectives[type as keyof typeof objectives] || ['推进剧情发展'];
  }

  /**
   * Estimate script duration
   */
  private estimateScriptDuration(lines: WebGALLine[]): number {
    return lines.reduce((total, line) => {
      if (line.command === 'say') {
        const content = line.params[0] || '';
        return total + (content.length * 0.1 + 2); // ~0.1s per character + 2s pause
      }
      if (line.command === 'wait') {
        const waitTime = parseInt(line.params[0] || '0');
        return total + waitTime / 1000;
      }
      return total + 1; // Default 1s for other commands
    }, 0);
  }

  /**
   * Estimate scene duration
   */
  private estimateSceneDuration(lines: WebGALLine[]): number {
    return this.estimateScriptDuration(lines);
  }

  /**
   * Calculate quality metrics
   */
  private calculateQualityMetrics(script: WebGALScript, validation?: any): {
    syntaxScore: number;
    characterScore: number;
    educationalScore: number;
    overallScore: number;
  } {
    const syntaxScore = validation?.syntaxValid ? 1.0 : 0.6;
    const characterScore = validation?.characterConsistent ? 1.0 : 0.7;
    const educationalScore = validation?.educationalAccurate ? 1.0 : 0.8;

    // Additional quality factors
    const lengthScore = script.scenes.length >= 3 ? 1.0 : 0.8;
    const dialogueScore = this.calculateDialogueQuality(script);

    const overallScore = (syntaxScore + characterScore + educationalScore + lengthScore + dialogueScore) / 5;

    return {
      syntaxScore,
      characterScore,
      educationalScore,
      overallScore
    };
  }

  /**
   * Calculate dialogue quality score
   */
  private calculateDialogueQuality(script: WebGALScript): number {
    let totalDialogueLines = 0;
    let qualityScore = 0;

    for (const scene of script.scenes) {
      for (const line of scene.lines) {
        if (line.command === 'say') {
          totalDialogueLines++;

          const content = line.params[0] || '';
          const hasProperLength = content.length > 10 && content.length < 200;
          const hasSpeaker = line.options?.speaker;

          if (hasProperLength && hasSpeaker) {
            qualityScore += 1;
          } else {
            qualityScore += 0.5;
          }
        }
      }
    }

    return totalDialogueLines > 0 ? qualityScore / totalDialogueLines : 0;
  }

  /**
   * Create error result
   */
  private createErrorResult(error: string, generationTime: number): GenerationResult {
    return {
      success: false,
      error,
      metadata: {
        generationTime,
        quality: {
          syntaxScore: 0,
          characterScore: 0,
          educationalScore: 0,
          overallScore: 0
        }
      }
    };
  }

  /**
   * Test generator configuration
   */
  async testConfiguration(): Promise<boolean> {
    try {
      return await this.openRouterClient.testConnection();
    } catch {
      return false;
    }
  }
}