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

    const body = {
      model: request.model || this.config.defaultModel,
      messages: request.messages,
      temperature: request.temperature ?? 0.8,
      max_tokens: request.max_tokens ?? 4000,
      top_p: request.top_p ?? 1.0,
      frequency_penalty: request.frequency_penalty ?? 0,
      presence_penalty: request.presence_penalty ?? 0,
      ...(request.stop && { stop: request.stop }),
      ...(request.reasoning && { reasoning: request.reasoning }),
      ...(request.stream && { stream: request.stream })
    };

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
        const error = await response.json() as OpenRouterError;
        throw new Error(`OpenRouter API error: ${error.message || 'Unknown error'}`);
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
      const generatedScript = choice.message.content;

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
   */
  private buildSystemPrompt(characters: string[]): string {
    // Multi-language generation - supports Chinese, Japanese, and English

    return `# Paper2GalGame 剧本生成专家

你是专门为Paper2GalGame项目生成高质量WebGAL脚本的AI助手。

## 角色设定
使用以下角色进行对话生成：${characters.join('、')}

每个角色都有独特的性格和表达方式，必须严格按照角色设定生成对话。

## WebGAL脚本格式要求
- 使用标准WebGAL命令格式
- 背景：changeBg:背景图片.webp;
- 角色：changeFigure:角色名.webp -position;
- 对话：say:对话内容 -speaker=角色名 -vocal=语音文件.wav;
- 等待：wait:时间毫秒;

## 生成要求
1. **教育性优先**：确保论文内容准确传达
2. **角色一致性**：严格遵循每个角色的性格特点
3. **对话自然**：角色间有真实的互动和讨论
4. **脚本完整**：包含开场、内容讲解、讨论、总结

## 语言要求
生成多语言对话（中文、日文、英文），语言表达要符合各角色特点。

请生成符合以上要求的完整WebGAL脚本。`;
  }

  /**
   * Build user prompt with paper data
   */
  private buildUserPrompt(paperData: any, options: any): string {
    const { language, educationalWeight, style } = options;

    return `# 论文转换任务

## 论文信息
**标题**：${paperData.metadata?.title || '未知标题'}
**作者**：${paperData.metadata?.authors?.join('、') || '未知作者'}

## 论文内容摘要
${this.extractPaperSummary(paperData)}

## 生成要求
- **语言**：${language === 'zh' ? '中文' : '日文'}
- **教育重点**：${educationalWeight * 100}%
- **难度**：${style}

## 脚本结构要求
1. **开场介绍** (2-3句)：角色登场，介绍论文主题
2. **核心内容** (15-25句)：分段讲解论文要点，角色互动讨论
3. **重点分析** (5-8句)：深入分析关键发现或方法
4. **总结讨论** (3-5句)：总结要点，角色发表感想
5. **结束语** (1-2句)：结束本次学习

请生成完整的WebGAL脚本，确保：
- 每个角色的对话都符合其性格特点
- 准确传达论文的核心内容和价值
- 对话自然流畅，富有教育意义
- 严格遵循WebGAL脚本格式`;
  }

  /**
   * Extract paper summary for prompt
   */
  private extractPaperSummary(paperData: any): string {
    if (!paperData.sections || paperData.sections.length === 0) {
      return paperData.rawText?.substring(0, 1000) || '无可用内容';
    }

    const sections = paperData.sections;
    let summary = '';

    // Extract key sections
    for (const section of sections) {
      if (section.type && ['abstract', 'introduction', 'conclusion'].includes(section.type.toLowerCase())) {
        summary += `### ${section.title}\n${section.content.substring(0, 300)}...\n\n`;
      }
    }

    return summary || paperData.rawText?.substring(0, 1000) || '无可用内容';
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