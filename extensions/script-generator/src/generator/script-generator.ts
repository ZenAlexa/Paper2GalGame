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
   * Includes correct asset file mappings to prevent 404 errors
   */
  private buildEnhancedPrompt(paperData: ParsedPaper, options: GenerationOptions): string {
    const selectedCharacters = options.characters
      .map(id => getCharacter(id))
      .filter((char): char is Character => char !== null);

    // Map character IDs to actual sprite files
    const characterSpriteMap: Record<string, string> = {
      host: 'stand.webp',
      energizer: 'stand2.webp',
      analyst: 'stand.webp',
      interpreter: 'stand2.webp'
    };

    const primaryLang = options.multiLanguage.primaryLanguage;
    const characterDetails = selectedCharacters.map(char => {
      const sprite = characterSpriteMap[char.id] || 'stand.webp';
      return `
### ${char.name[primaryLang]} (${char.id})
- **Sprite**: ${sprite}
- **Personality**: ${char.personality.join(', ')}
- **Speaking Style**: ${char.speakingStyle.join(', ')}
- **Paper Role**: ${char.paperRole}
- **Phrases**: ${char.phrases.slice(0, 3).join(', ')}`;
    }).join('\n');

    const paperSummary = this.createPaperSummary(paperData);

    return `# Paper2GalGame Multi-Language Script Generation

## Task Overview
Convert academic paper to WebGAL format educational visual novel script with trilingual support (Chinese, Japanese, English).

## CRITICAL: Asset Requirements
### Available Backgrounds (MUST use only these):
- bg.webp (classroom/meeting room)

### Character Sprite Mapping (MUST follow exactly):
- host → stand.webp
- energizer → stand2.webp
- analyst → stand.webp
- interpreter → stand2.webp

## Example Format:
\`\`\`
changeBg:bg.webp;
changeFigure:stand.webp -center;
say:今日は論文について学びましょう。 -speaker=host;
changeFigure:stand2.webp -right;
say:楽しみですね！ -speaker=energizer;
\`\`\`

## Character Configuration
${characterDetails}

## Paper Content
**Title**: ${paperData.metadata.title}
**Authors**: ${paperData.metadata.authors?.join(', ') || 'Unknown'}

${paperSummary}

## Script Structure
1. **Opening** (2-3 dialogues): Set bg.webp, introduce characters
2. **Main Content** (20-30 dialogues): Explain paper content, character interactions
3. **Discussion** (8-12 dialogues): Analyze key points
4. **Summary** (4-6 dialogues): Summarize main takeaways
5. **Closing** (2 dialogues): Farewell

## Quality Standards
- Educational weight: ${(options.style.educationalWeight * 100).toFixed(0)}%
- Complexity: ${options.style.complexity}
- Primary language: ${primaryLang}
- Interactions: ${options.style.interactive ? 'enabled' : 'disabled'}

Generate complete WebGAL script with correct asset filenames. Use Japanese for dialogue content.`;
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
      summary = `### Paper Content\n${paperData.rawText.substring(0, 1200)}...\n`;
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

      // Parse multi-language content for 'say' commands
      if (command === 'say' && rest) {
        const multiLangContent = this.parseMultiLanguageContent(rest);
        if (multiLangContent) {
          return {
            command: command as any,
            params: [JSON.stringify(multiLangContent)],
            options: this.parseMultiLanguageOptions(trimmedLine),
            raw: trimmedLine,
            metadata: {
              confidence: 1.0,
              relevance: 1.0,
              isMultiLanguage: true
            }
          };
        }

        // For non-multi-language say commands, separate text from options
        // Pattern: "text content -speaker=xxx -other=yyy;"
        const textContent = this.extractTextContent(rest);
        return {
          command: command as any,
          params: [textContent],
          options: this.parseLineOptions(trimmedLine),
          raw: trimmedLine,
          metadata: {
            confidence: 1.0,
            relevance: 1.0
          }
        };
      }

      // For non-say commands, keep original behavior
      const params = rest ? [rest] : [];
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
   * Extract clean text content from say command, removing options
   * Handles: "text content -speaker=xxx;" -> "text content"
   */
  private extractTextContent(content: string): string {
    // Remove trailing semicolon first
    let text = content.replace(/;$/, '').trim();

    // Remove all WebGAL options (pattern: -optionName=value)
    // Options start with space + dash, followed by name=value
    text = text.replace(/\s+-\w+=[^\s;]+/g, '').trim();

    return text;
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
      introduction: 'Opening Introduction',
      content: `Content Explanation ${Math.floor(index / 2) + 1}`,
      discussion: `In-depth Discussion ${Math.floor(index / 2)}`,
      summary: 'Summary Review'
    };
    return titles[type as keyof typeof titles] || `Scene ${index + 1}`;
  }

  /**
   * Generate scene objectives
   */
  private generateSceneObjectives(type: string): string[] {
    const objectives = {
      introduction: ['Set learning atmosphere', 'Introduce paper topic', 'Character entrance'],
      content: ['Convey core paper content', 'Ensure concept understanding', 'Maintain learning interest'],
      discussion: ['Deepen understanding', 'Multi-angle analysis', 'Inspire thinking'],
      summary: ['Consolidate knowledge', 'Summarize key points', 'Outlook applications']
    };
    return objectives[type as keyof typeof objectives] || ['Advance story development'];
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