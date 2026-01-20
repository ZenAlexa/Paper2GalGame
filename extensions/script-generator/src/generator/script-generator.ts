/**
 * Script Generator Core
 *
 * High-level script generation orchestrator that combines OpenRouter API
 * with character configurations and prompt engineering
 */

import { getCharacter, validateCharacterSelection } from '../characters';
import { OpenRouterClient } from '../openrouter';
import type {
  Character,
  GenerationOptions,
  OpenRouterConfig,
  ParsedPaper,
  WebGALLine,
  WebGALScene,
  WebGALScript,
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
  async generateScript(paperData: ParsedPaper, options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // Validate inputs
      const validation = this.validateInputs(paperData, options);
      if (!validation.valid) {
        return this.createErrorResult(`Validation failed: ${validation.errors.join(', ')}`, Date.now() - startTime);
      }

      // Generate enhanced prompt
      const _prompt = this.buildEnhancedPrompt(paperData, options);

      // Call OpenRouter API
      const response = await this.openRouterClient.generateScript({
        paperData,
        characters: options.characters,
        options: {
          educationalWeight: options.style.educationalWeight,
          style: 'formal' as const,
          includeInteractions: options.style.interactive,
        },
      });

      // Parse and structure the generated script
      const script = await this.parseGeneratedScript(response.script, paperData, options, response.metadata);

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
            ...(response.metadata.usage.estimated_cost && { estimatedCost: response.metadata.usage.estimated_cost }),
          },
          quality,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(errorMessage, Date.now() - startTime);
    }
  }

  /**
   * Validate generation inputs
   */
  private validateInputs(
    paperData: ParsedPaper,
    options: GenerationOptions
  ): {
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
      errors,
    };
  }

  /**
   * Build enhanced prompt with multi-language support
   * Includes correct asset file mappings to prevent 404 errors
   */
  private buildEnhancedPrompt(paperData: ParsedPaper, options: GenerationOptions): string {
    const selectedCharacters = options.characters
      .map((id) => getCharacter(id))
      .filter((char): char is Character => char !== null);

    // Map character IDs to actual sprite files
    const characterSpriteMap: Record<string, string> = {
      host: 'stand.webp',
      energizer: 'stand2.webp',
      analyst: 'stand.webp',
      interpreter: 'stand2.webp',
    };

    const primaryLang = options.multiLanguage.primaryLanguage;
    const characterDetails = selectedCharacters
      .map((char) => {
        const sprite = characterSpriteMap[char.id] || 'stand.webp';
        return `
### ${char.name[primaryLang]} (${char.id})
- **Sprite**: ${sprite}
- **Personality**: ${char.personality.join(', ')}
- **Speaking Style**: ${char.speakingStyle.join(', ')}
- **Paper Role**: ${char.paperRole}
- **Phrases**: ${char.phrases.slice(0, 3).join(', ')}`;
      })
      .join('\n');

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
        if (
          section.type &&
          ['abstract', 'introduction', 'methodology', 'results', 'conclusion'].includes(section.type.toLowerCase())
        ) {
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
    _apiMetadata: any
  ): Promise<WebGALScript> {
    // DEBUG: Log raw script from AI
    console.log('[ScriptGenerator] ========== RAW AI SCRIPT (first 1000 chars) ==========');
    console.log(rawScript.substring(0, 1000));
    console.log('[ScriptGenerator] ========== END RAW SCRIPT ==========');
    console.log(`[ScriptGenerator] Total raw script length: ${rawScript.length} chars`);

    // Extract script content from markdown code blocks if present
    // Use multiple patterns to handle various AI output formats
    let cleanScript = rawScript;

    // Multiple patterns to try, in order of specificity
    const codeBlockPatterns = [
      /```webgal\s*\n([\s\S]*?)```/i, // Standard: ```webgal\n (case insensitive)
      /```\s*webgal\s*\n([\s\S]*?)```/i, // With spaces: ``` webgal \n
      /```\n([\s\S]*?)```/, // No language tag: ```\n
      /```([\s\S]*?)```/, // Minimal: ``` (no newline)
    ];

    let extracted = false;
    for (const pattern of codeBlockPatterns) {
      const match = rawScript.match(pattern);
      if (match?.[1]?.trim()) {
        cleanScript = match[1];
        extracted = true;
        console.log('[ScriptGenerator] Extracted code block with pattern:', pattern.toString().substring(0, 30));
        break;
      }
    }

    // Fallback: Extract lines that look like WebGAL commands
    if (!extracted) {
      const validCommands = [
        'changeBg',
        'changeFigure',
        'say',
        'bgm',
        'playBGM',
        'playSE',
        'wait',
        'choose',
        'label',
        'end',
        'jump',
      ];
      const webgalLines = rawScript.split('\n').filter((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return false;
        return validCommands.some((cmd) => trimmed.toLowerCase().startsWith(`${cmd.toLowerCase()}:`));
      });
      if (webgalLines.length > 0) {
        cleanScript = webgalLines.join('\n');
        console.warn('[ScriptGenerator] Used fallback: extracted', webgalLines.length, 'WebGAL lines from prose');
      } else {
        console.error('[ScriptGenerator] CRITICAL: Could not extract WebGAL script from AI response');
        console.error('[ScriptGenerator] Raw script first 500 chars:', rawScript.substring(0, 500));
      }
    }

    // DEBUG: Log clean script stats
    const cleanLines = cleanScript.split('\n').filter((line) => line.trim() && !line.trim().startsWith('//'));
    console.log(`[ScriptGenerator] Clean script has ${cleanLines.length} non-empty lines`);

    // Count command types
    const commandCounts: Record<string, number> = {};
    for (const line of cleanLines) {
      const match = line.match(/^(\w+):/);
      if (match?.[1]) {
        const cmd = match[1].toLowerCase();
        commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
      }
    }
    console.log('[ScriptGenerator] Command type counts:', JSON.stringify(commandCounts));

    // Check for critical commands
    const hasChangeBg = cleanLines.some((l) => l.toLowerCase().startsWith('changebg:'));
    const hasChangeFigure = cleanLines.some((l) => l.toLowerCase().startsWith('changefigure:'));
    console.log(`[ScriptGenerator] Has changeBg: ${hasChangeBg}, Has changeFigure: ${hasChangeFigure}`);

    if (!hasChangeBg) {
      console.warn('[ScriptGenerator] WARNING: No changeBg command found in script!');
    }
    if (!hasChangeFigure) {
      console.warn('[ScriptGenerator] WARNING: No changeFigure command found in script!');
    }

    const lines = cleanLines.map((line, index) => this.parseScriptLine(line, index));

    // Group lines into scenes based on content flow
    const scenes = this.groupLinesIntoScenes(lines, paperData);

    const script: WebGALScript = {
      metadata: {
        title: {
          zh: `${paperData.metadata.title} - WebGAL脚本`,
          jp: `${paperData.metadata.title} - WebGALスクリプト`,
          en: `${paperData.metadata.title} - WebGAL Script`,
        },
        paperTitle: {
          zh: paperData.metadata.title || '未知论文',
          jp: paperData.metadata.title || '不明な論文',
          en: paperData.metadata.title || 'Unknown Paper',
        },
        timestamp: new Date(),
        version: this.version,
        multiLanguage: {
          supportedLanguages: ['zh', 'jp', 'en'],
          primaryLanguage: options.multiLanguage.primaryLanguage,
          currentLanguage: options.multiLanguage.primaryLanguage,
        },
        characters: options.characters,
        totalDuration: this.estimateScriptDuration(lines),
      },
      scenes,
      validation: {
        isValid: true,
        errors: [],
        warnings: [],
      },
    };

    return script;
  }

  /**
   * Parse individual script line with multi-language support
   */
  private parseScriptLine(line: string, _index: number): WebGALLine {
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
              isMultiLanguage: true,
            },
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
            relevance: 1.0,
          },
        };
      }

      // For non-say commands, extract content WITHOUT options
      // E.g., "stand.webp -center" → content="stand.webp", options={center: true}
      const contentOnly = rest ? this.extractTextContent(rest) : '';
      return {
        command: command as any,
        params: [contentOnly],
        options: this.parseLineOptions(trimmedLine),
        raw: trimmedLine,
        metadata: {
          confidence: 1.0,
          relevance: 1.0,
        },
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
        relevance: 0.9,
      },
    };
  }

  /**
   * Extract clean text content from say command, removing options
   * Handles: "text content -speaker=xxx;" -> "text content"
   * Robust extraction with multiple fallback strategies
   */
  private extractTextContent(content: string): string {
    if (!content) return '';

    // Remove trailing semicolon first
    let text = content.replace(/;$/, '').trim();

    // Remove all WebGAL options (pattern: -optionName=value)
    // Options start with space + dash, followed by name=value
    text = text.replace(/\s+-\w+=[^\s;]+/g, '').trim();

    // If empty after extraction, try alternative strategies
    if (!text && content.trim()) {
      // Strategy 1: Everything before first " -" (space-dash)
      const optionStart = content.indexOf(' -');
      if (optionStart > 0) {
        text = content.substring(0, optionStart).replace(/;$/, '').trim();
      }

      // Strategy 2: If still empty, try splitting by -speaker/-vocal
      if (!text) {
        const speakerMatch = content.match(/^(.+?)\s+-(?:speaker|vocal)=/);
        if (speakerMatch?.[1]) {
          text = speakerMatch[1].replace(/;$/, '').trim();
        }
      }

      // Log warning if extraction produced empty from non-empty input
      if (!text) {
        console.warn(`[extractTextContent] Could not extract text from: "${content.substring(0, 100)}"`);
      }
    }

    return text;
  }

  /**
   * Parse multi-language content from say command
   * Format: "Chinese||Japanese||English"
   */
  private parseMultiLanguageContent(content: string): { zh: string; jp: string; en: string } | null {
    // Find the main content before -speaker option
    const speakerMatch = content.match(/(.*?)\s+-speaker=/);
    const mainContent = speakerMatch?.[1] ? speakerMatch[1].trim() : content.trim();

    const parts = mainContent.split('||');
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      return {
        zh: parts[0].trim(),
        jp: parts[1].trim(),
        en: parts[2].trim(),
      };
    }
    return null;
  }

  /**
   * Parse multi-language options from command line
   * Format: -speaker=ChineseName||JapaneseName||EnglishName
   */
  private parseMultiLanguageOptions(line: string): Record<string, any> {
    const options: Record<string, any> = {};

    // Parse speaker names
    const speakerMatch = line.match(/-speaker=([^\\s]+)/);
    if (speakerMatch?.[1]) {
      const speakerContent = speakerMatch[1];
      const speakerParts = speakerContent.split('||');
      if (speakerParts.length === 3 && speakerParts[0] && speakerParts[1] && speakerParts[2]) {
        options.speaker = {
          zh: speakerParts[0].trim(),
          jp: speakerParts[1].trim(),
          en: speakerParts[2].trim(),
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
   * Parse line options (e.g., -speaker=name -vocal=file.wav -center)
   * Handles both -key=value and -flag (boolean) formats
   */
  private parseLineOptions(line: string): Record<string, string | number | boolean> {
    const options: Record<string, string | number | boolean> = {};

    // Parse -key=value options
    const valueMatches = line.match(/-(\w+)=([^\s;]+)/g) || [];
    for (const match of valueMatches) {
      const parsed = match.match(/-(\w+)=([^\s;]+)/);
      if (parsed?.[1] && parsed[2]) {
        // Clean value: remove trailing semicolon if present
        options[parsed[1]] = parsed[2].replace(/;$/, '');
      }
    }

    // Parse -flag (boolean) options like -center, -left, -right, -next
    const flagMatches = line.match(/\s-(\w+)(?=\s|;|$)/g) || [];
    for (const match of flagMatches) {
      const key = match.trim().replace(/^-/, '');
      // Don't overwrite if already set as key=value
      if (key && !options[key]) {
        options[key] = true;
      }
    }

    return options;
  }

  /**
   * Group script lines into logical scenes
   */
  private groupLinesIntoScenes(lines: WebGALLine[], _paperData: ParsedPaper): WebGALScene[] {
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
            duration: this.estimateSceneDuration(currentSceneLines),
          },
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
      summary: 'Summary Review',
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
      summary: ['Consolidate knowledge', 'Summarize key points', 'Outlook applications'],
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
        const waitTime = parseInt(line.params[0] || '0', 10);
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
  private calculateQualityMetrics(
    script: WebGALScript,
    validation?: any
  ): {
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
      overallScore,
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
          overallScore: 0,
        },
      },
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
