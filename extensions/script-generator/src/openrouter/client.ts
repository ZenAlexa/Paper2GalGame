/**
 * OpenRouter API Client
 *
 * Unified interface for accessing multiple AI models via OpenRouter
 * Supports the latest Gemini 3.0 models and other providers
 */

import fetch from 'node-fetch';
import type {
  OpenRouterConfig,
  OpenRouterModel,
  ChatCompletionRequest,
  ChatCompletionResponse,
  OpenRouterError,
  ScriptGenerationRequest,
  ScriptGenerationResponse
} from '../types';

/**
 * OpenRouter API client implementation
 */
export class OpenRouterClient {
  private readonly config: Required<OpenRouterConfig>;

  /**
   * Create OpenRouter client
   */
  constructor(config: OpenRouterConfig) {
    this.config = {
      baseURL: 'https://openrouter.ai/api/v1',
      httpReferer: 'https://paper2galgame.com',
      appTitle: 'Paper2GalGame',
      defaultModel: 'google/gemini-3-flash-preview',
      timeout: 30000,
      ...config
    };

    if (!this.config.apiKey) {
      throw new Error('OpenRouter API key is required');
    }
  }

  /**
   * Make chat completion request
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const url = `${this.config.baseURL}/chat/completions`;

    const body: Record<string, any> = {
      model: request.model || this.config.defaultModel,
      messages: request.messages,
      temperature: request.temperature ?? 0.8,
      max_tokens: request.max_tokens ?? 4000,
      top_p: request.top_p ?? 1.0,
      frequency_penalty: request.frequency_penalty ?? 0,
      presence_penalty: request.presence_penalty ?? 0,
      ...(request.stop && { stop: request.stop }),
      ...(request.stream && { stream: request.stream })
    };

    // Add reasoning for Gemini 3 models (uses object format)
    if (request.reasoning && body.model?.includes('gemini-3')) {
      body.reasoning = { effort: 'medium' };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.config.httpReferer,
          'X-Title': this.config.appTitle
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Unknown error';
        try {
          const error = JSON.parse(errorText) as OpenRouterError;
          errorMessage = error.message || JSON.stringify(error);
        } catch {
          errorMessage = `HTTP ${response.status}: ${errorText.substring(0, 200)}`;
        }
        throw new Error(`OpenRouter API error: ${errorMessage}`);
      }

      const result = await response.json() as ChatCompletionResponse;
      return result;

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenRouter API request failed: ${error.message}`);
      }
      throw new Error('Unknown error occurred during API request');
    }
  }

  /**
   * Generate script from paper data
   */
  async generateScript(request: ScriptGenerationRequest): Promise<ScriptGenerationResponse> {
    const startTime = Date.now();

    try {
      // Build the system prompt
      const systemPrompt = this.buildSystemPrompt(request.characters);

      // Build the user prompt
      const userPrompt = this.buildUserPrompt(request.paperData, request.options);

      // Make the API request
      const completionRequest: ChatCompletionRequest = {
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 6000,
        reasoning: true // Enable reasoning for better script quality
      };

      const response = await this.chatCompletion(completionRequest);

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response generated from OpenRouter');
      }

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('Empty script generated');
      }

      // Sanitize the generated script to fix any incorrect asset references
      const rawScript = choice.message.content;
      const generatedScript = OpenRouterClient.sanitizeScript(rawScript);

      // Basic validation
      const validation = this.validateGeneratedScript(generatedScript, request.characters);

      const result: ScriptGenerationResponse = {
        script: generatedScript,
        metadata: {
          model: response.model,
          generationTime: Date.now() - startTime,
          usage: response.usage,
          qualityScore: this.calculateQualityScore(generatedScript, validation)
        },
        validation
      };

      return result;

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Script generation failed: ${error.message}`);
      }
      throw new Error('Unknown error during script generation');
    }
  }

  /**
   * Build system prompt for script generation
   * Includes correct asset file mappings to prevent 404 errors
   */
  private buildSystemPrompt(characters: string[]): string {
    // Map character IDs to actual sprite files
    const characterSpriteMap: Record<string, string> = {
      host: 'stand.webp',
      energizer: 'stand2.webp',
      analyst: 'stand.webp',
      interpreter: 'stand2.webp'
    };

    // Build character-sprite mapping for prompt
    const characterMappings = characters.map(char => {
      const sprite = characterSpriteMap[char] || 'stand.webp';
      return `- ${char}: use "${sprite}"`;
    }).join('\n');

    return `# Paper2GalGame Script Generation Expert

You are an AI assistant specialized in generating high-quality WebGAL scripts for Paper2GalGame.

## Character Configuration
Available characters: ${characters.join(', ')}

Each character has unique personality and speaking style. Follow character settings strictly.

## CRITICAL: Asset File Requirements
You MUST use ONLY these exact file names:

### Available Backgrounds (use ONLY these):
- bg.webp (main classroom/meeting room)

### Character Sprite Mapping (MUST follow exactly):
${characterMappings}

### Position Options:
- -left (left side)
- -center (center)
- -right (right side)

## WebGAL Script Format
- Background: changeBg:bg.webp;
- Character: changeFigure:stand.webp -center; (use sprite from mapping above)
- Dialogue: say:dialogue content -speaker=character_id;
- Wait: wait:1000;
- BGM: playBgm:bgm.mp3;

## Script Structure
1. **Opening** (2-3 lines): Set background, introduce characters
2. **Main Content** (15-25 lines): Explain paper content with character interactions
3. **Analysis** (5-8 lines): Deep analysis of key findings
4. **Summary** (3-5 lines): Summarize key points
5. **Closing** (1-2 lines): Farewell

## Example Script Format:
\`\`\`
changeBg:bg.webp;
changeFigure:stand.webp -center;
say:Welcome everyone, today we'll discuss this paper. -speaker=host;
changeFigure:stand2.webp -right;
say:I'm excited to learn about this topic! -speaker=energizer;
\`\`\`

## Language
Generate dialogues in Japanese for natural voice synthesis. Include educational content accurately.

Generate a complete WebGAL script following the above requirements exactly.`;
  }

  /**
   * Build user prompt with paper data
   * Reinforces asset requirements to prevent 404 errors
   */
  private buildUserPrompt(paperData: any, options: any): string {
    const { educationalWeight, style } = options;

    return `# Paper Conversion Task

## Paper Information
**Title**: ${paperData.metadata?.title || 'Unknown Title'}
**Authors**: ${paperData.metadata?.authors?.join(', ') || 'Unknown Authors'}

## Paper Summary
${this.extractPaperSummary(paperData)}

## Generation Requirements
- **Language**: Japanese (for natural TTS voice synthesis)
- **Educational Focus**: ${(educationalWeight * 100).toFixed(0)}%
- **Complexity**: ${style}

## CRITICAL REMINDERS:
1. Use ONLY bg.webp for changeBg commands
2. Use ONLY stand.webp or stand2.webp for changeFigure commands
3. Start the script with: changeBg:bg.webp;
4. Each changeFigure must use the correct sprite from the mapping

## Script Structure:
1. **Opening** (2-3 dialogues): Set bg.webp, introduce characters with their sprites
2. **Main Content** (15-25 dialogues): Explain paper content, switch characters
3. **Analysis** (5-8 dialogues): Deep dive into key findings
4. **Summary** (3-5 dialogues): Key takeaways
5. **Closing** (1-2 dialogues): Farewell

Generate the complete WebGAL script now. Remember:
- Follow each character's personality
- Accurately convey the paper's core content
- Natural dialogue flow with educational value
- STRICTLY follow WebGAL script format with correct asset filenames`;
  }

  /**
   * Extract paper summary for prompt
   */
  private extractPaperSummary(paperData: any): string {
    if (!paperData.sections || paperData.sections.length === 0) {
      return paperData.rawText?.substring(0, 1000) || 'No content available';
    }

    const sections = paperData.sections;
    let summary = '';

    // Extract key sections
    for (const section of sections) {
      if (section.type && ['abstract', 'introduction', 'conclusion'].includes(section.type.toLowerCase())) {
        summary += `### ${section.title}\n${section.content.substring(0, 300)}...\n\n`;
      }
    }

    return summary || paperData.rawText?.substring(0, 1000) || 'No content available';
  }

  /**
   * Sanitize generated script to ensure correct asset filenames
   * Post-processing to fix any AI-generated incorrect asset references
   */
  static sanitizeScript(script: string): string {
    let sanitized = script;

    // Fix background references - only bg.webp is available
    sanitized = sanitized.replace(
      /changeBg:([^;]+\.webp)/gi,
      'changeBg:bg.webp'
    );

    // Fix figure references - map character names to actual sprites
    const figurePatterns = [
      { pattern: /changeFigure:host\.webp/gi, replacement: 'changeFigure:stand.webp' },
      { pattern: /changeFigure:energizer\.webp/gi, replacement: 'changeFigure:stand2.webp' },
      { pattern: /changeFigure:analyst\.webp/gi, replacement: 'changeFigure:stand.webp' },
      { pattern: /changeFigure:interpreter\.webp/gi, replacement: 'changeFigure:stand2.webp' },
      // Common AI-generated mistakes
      { pattern: /changeFigure:character[^;]*\.webp/gi, replacement: 'changeFigure:stand.webp' },
      { pattern: /changeFigure:figure[^;]*\.webp/gi, replacement: 'changeFigure:stand.webp' },
    ];

    for (const { pattern, replacement } of figurePatterns) {
      sanitized = sanitized.replace(pattern, replacement);
    }

    return sanitized;
  }

  /**
   * Validate generated script
   */
  private validateGeneratedScript(script: string, characters: string[]): {
    syntaxValid: boolean;
    characterConsistent: boolean;
    educationalAccurate: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check basic WebGAL syntax
    const lines = script.split('\n').filter(line => line.trim());
    let syntaxValid = true;

    for (const line of lines) {
      if (line.includes(':') && !this.isValidWebGALCommand(line)) {
        syntaxValid = false;
        issues.push(`Invalid WebGAL syntax: ${line.substring(0, 50)}...`);
      }
    }

    // Check character consistency
    const scriptSpeakers = this.extractSpeakers(script);
    const characterConsistent = characters.length > 0 &&
      scriptSpeakers.every(speaker => this.isValidSpeaker(speaker, characters));

    if (!characterConsistent) {
      issues.push('Character names in script don\'t match expected characters');
    }

    // Basic educational content check (placeholder)
    const educationalAccurate = script.length > 500; // Basic length check

    if (!educationalAccurate) {
      issues.push('Generated script appears too short for educational content');
    }

    return {
      syntaxValid,
      characterConsistent,
      educationalAccurate,
      issues
    };
  }

  /**
   * Check if line is valid WebGAL command
   */
  private isValidWebGALCommand(line: string): boolean {
    const validCommands = ['say', 'changeBg', 'changeFigure', 'playBGM', 'playSE', 'wait', 'choose'];
    const command = line.split(':')[0] || '';
    return validCommands.includes(command);
  }

  /**
   * Extract speakers from script
   */
  private extractSpeakers(script: string): string[] {
    const speakerMatches = script.match(/-speaker=([^\\s]+)/g) || [];
    return speakerMatches.map(match => {
      const cleanMatch = match.replace('-speaker=', '');
      return cleanMatch;
    });
  }

  /**
   * Check if speaker name is valid for given characters
   */
  private isValidSpeaker(speaker: string, characters: string[]): boolean {
    // This would need character name mapping - simplified for now
    return speaker.length > 0;
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(script: string, validation: any): number {
    let score = 1.0;

    if (!validation.syntaxValid) score -= 0.3;
    if (!validation.characterConsistent) score -= 0.2;
    if (!validation.educationalAccurate) score -= 0.2;

    // Additional quality factors
    if (script.length < 1000) score -= 0.1;
    if (validation.issues.length > 3) score -= 0.2;

    return Math.max(0, score);
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.chatCompletion({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: 'Hello, this is a test.' }],
        max_tokens: 10
      });

      return response.choices && response.choices.length > 0;
    } catch {
      return false;
    }
  }
}