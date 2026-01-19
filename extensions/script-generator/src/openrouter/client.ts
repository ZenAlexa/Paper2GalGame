/**
 * OpenRouter API Client
 *
 * Unified interface for accessing multiple AI models via OpenRouter
 * Supports the latest Gemini 3.0 models and other providers
 */

import fetch from 'node-fetch';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  OpenRouterConfig,
  OpenRouterError,
  ScriptGenerationRequest,
  ScriptGenerationResponse,
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
      timeout: 60000,
      ...config,
    };

    if (!this.config.apiKey) {
      throw new Error('OpenRouter API key is required');
    }
  }

  /**
   * Make chat completion request with timeout handling
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
      ...(request.stream && { stream: request.stream }),
    };

    // Add reasoning for Gemini 3 models (uses object format)
    if (request.reasoning && body.model?.includes('gemini-3')) {
      body.reasoning = { effort: 'medium' };
    }

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.config.httpReferer,
          'X-Title': this.config.appTitle,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      // Clear timeout on successful response
      clearTimeout(timeoutId);

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

      const result = (await response.json()) as ChatCompletionResponse;
      return result;
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        // Handle abort/timeout specifically
        if (error.name === 'AbortError') {
          throw new Error(`OpenRouter API request timed out after ${this.config.timeout / 1000} seconds`);
        }
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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 256000, // Gemini 3 supports 1M context, output up to 256K
        reasoning: true, // Enable reasoning for better script quality
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
          qualityScore: this.calculateQualityScore(generatedScript, validation),
        },
        validation,
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
   * Implements 4-phase paper structure with character assignments
   */
  private buildSystemPrompt(_characters: string[]): string {
    return `# Paper2GalGame 論文解説スクリプト生成エキスパート

あなたは学術論文をWebGAL形式の教育的ビジュアルノベルスクリプトに変換する専門AIです。
これは美少女ゲーム（ギャルゲー）形式です。4人の美少女キャラクターが論文を解説します。

## 四人の美少女キャラクター設定

### 1. 小樱 (Sakura) - ID: host - プレイヤーの後輩
- **性別**: 女性（美少女）
- **役割**: 司会進行・全体まとめ
- **性格**: 穏やかで面倒見が良い、知的で落ち着いている
- **口調**: 丁寧語、「〜ですね」「〜でしょうか」「前輩〜」を多用
- **関係**: プレイヤーを「前輩」と呼ぶ後輩（プレイヤーは彼女の前輩）
- **立ち絵**: stand.webp
- **担当フェーズ**: フェーズ1（背景・導入）

### 2. 小雪 (Yuki) - ID: energizer - プレイヤーの先輩
- **性別**: 女性（美少女）
- **役割**: 場を盛り上げる・素朴な質問
- **性格**: 元気で好奇心旺盛、純粋で熱心
- **口調**: 「わぁ！」「すごい！」「学弟くん〜」など感嘆詞多め
- **関係**: プレイヤーを「学弟」と呼ぶ先輩（プレイヤーは彼女の学弟）
- **立ち絵**: stand2.webp
- **担当フェーズ**: フェーズ4（結論・応用）

### 3. 小雨 (Ame) - ID: analyst - プレイヤーの先生
- **性別**: 女性（美少女）
- **役割**: 深い分析・批判的思考
- **性格**: 真面目で論理的、細部にこだわる
- **口調**: 「論理的に考えると」「データによると」「学生さん」など学術的表現
- **関係**: プレイヤーを「学生」と呼ぶ先生役（プレイヤーは彼女の学生）
- **立ち絵**: stand.webp
- **担当フェーズ**: フェーズ2（方法論）

### 4. 小风 (Kaze) - ID: interpreter - プレイヤーの表妹
- **性別**: 女性（美少女）
- **役割**: 日常生活との関連付け・わかりやすい説明
- **性格**: 親しみやすく、例え話が上手
- **口調**: 「これって日常で言うと」「表哥〜」「身近な例で言えば」
- **関係**: プレイヤーを「表哥」と呼ぶいとこ（プレイヤーは彼女の表哥＝年上の従兄）
- **立ち絵**: stand2.webp
- **担当フェーズ**: フェーズ3（実験・結果）

## 四段階構成（CRITICAL - 必ず従うこと）

論文は以下の4つのフェーズに分けて解説します：

### フェーズ1: 背景と導入 (20-30対話)
- **主担当**: 小樱 (host/前輩)
- **内容**: Abstract、Introduction、研究背景
- **目的**: 読者に論文の文脈と重要性を理解させる
- 他のキャラクターは質問や反応で参加

### フェーズ2: 方法論とアプローチ (25-35対話)
- **主担当**: 小雨 (analyst/学生)
- **内容**: Methods、提案手法、技術的詳細
- **目的**: 研究がどのように行われたかを詳しく解説
- 小樱が補足、小雪が素朴な疑問を投げかける

### フェーズ3: 実験と結果 (25-35対話)
- **主担当**: 小风 (interpreter/表哥)
- **内容**: Experiments、Results、図表の解釈
- **目的**: 結果を日常的な視点から分かりやすく説明
- 小雨が詳細分析、小雪が感想を述べる

### フェーズ4: 結論と応用 (20-30対話)
- **主担当**: 小雪 (energizer/学弟)
- **内容**: Discussion、Conclusion、Future Work、応用可能性
- **目的**: 研究の意義と今後の展望を熱意を持って伝える
- 全員で議論しながらまとめる

## アセット要件（厳守）

### 背景（これのみ使用可能）:
- bg.webp (教室/会議室)

### 立ち絵マッピング:
- host → stand.webp (-center または -left)
- energizer → stand2.webp (-right)
- analyst → stand.webp (-left)
- interpreter → stand2.webp (-right)

## WebGALスクリプト形式

\`\`\`
changeBg:bg.webp;
changeFigure:stand.webp -center;
say:皆さん、今日はこの論文について一緒に学びましょう。 -speaker=host;
changeFigure:stand2.webp -right;
say:わぁ、楽しみです！どんな内容ですか？ -speaker=energizer;
\`\`\`

## 生成要件

1. **総対話数**: 90-130対話（各フェーズで適切に配分）
2. **言語**: 日本語（自然なTTS音声合成のため）
3. **キャラクター性**: 各キャラクターの口調と性格を厳守
4. **教育性**: 論文の内容を正確に、かつ分かりやすく伝える
5. **インタラクション**: キャラクター間の自然な会話と議論

完全なWebGALスクリプトを生成してください。`;
  }

  /**
   * Build user prompt with paper data
   * Implements detailed 4-phase paper content extraction
   */
  private buildUserPrompt(paperData: any, options: any): string {
    const { educationalWeight, style } = options;

    // Extract paper content organized by phases
    const phaseContent = this.extractPaperByPhases(paperData);

    return `# 論文変換タスク

## 論文情報
**タイトル**: ${paperData.metadata?.title || '不明なタイトル'}
**著者**: ${paperData.metadata?.authors?.join(', ') || '不明な著者'}
**キーワード**: ${paperData.metadata?.keywords?.join(', ') || ''}

## 論文内容（フェーズ別）

### フェーズ1用コンテンツ: 背景と導入
${phaseContent.phase1}

### フェーズ2用コンテンツ: 方法論とアプローチ
${phaseContent.phase2}

### フェーズ3用コンテンツ: 実験と結果
${phaseContent.phase3}

### フェーズ4用コンテンツ: 結論と応用
${phaseContent.phase4}

## 生成設定
- **教育重視度**: ${(educationalWeight * 100).toFixed(0)}%
- **難易度**: ${style}

## 重要なリマインダー（厳守）

### アセット要件:
1. changeBg: **bg.webp のみ** 使用可能
2. changeFigure: **stand.webp** または **stand2.webp のみ**
3. スクリプト開始: changeBg:bg.webp;

### キャラクター立ち絵:
- host (小樱/前輩) → stand.webp -center/-left
- energizer (小雪/学弟) → stand2.webp -right
- analyst (小雨/学生) → stand.webp -left
- interpreter (小风/表哥) → stand2.webp -right

## 対話数の目標

| フェーズ | 主担当 | 目標対話数 |
|---------|--------|-----------|
| フェーズ1: 導入 | host (前輩) | 20-30対話 |
| フェーズ2: 方法論 | analyst (学生) | 25-35対話 |
| フェーズ3: 結果 | interpreter (表哥) | 25-35対話 |
| フェーズ4: 結論 | energizer (学弟) | 20-30対話 |
| **合計** | | **90-130対話** |

## キャラクター間の会話例

**前輩から学弟への呼びかけ**: 「小雪くん、何か質問ある？」
**学弟の反応**: 「わぁ！それすごいですね、前輩！」
**学生の分析**: 「論理的に考えると、このアプローチは...」
**表哥の例え**: 「身近な例で言えば、これって料理のレシピみたいなもので...」

## スクリプト開始

今すぐ完全なWebGALスクリプトを生成してください。
- 4つのフェーズすべてを含める
- 各フェーズの主担当キャラクターを中心に
- 他のキャラクターも積極的に会話に参加
- 90-130対話を目標に詳細なスクリプトを生成`;
  }

  /**
   * Extract paper content organized by 4 phases
   */
  private extractPaperByPhases(paperData: any): {
    phase1: string;
    phase2: string;
    phase3: string;
    phase4: string;
  } {
    const sections = paperData.sections || [];
    const rawText = paperData.rawText || '';

    // Helper to find section by type
    const findSection = (types: string[]): string => {
      for (const type of types) {
        const section = sections.find(
          (s: any) =>
            s.type?.toLowerCase() === type.toLowerCase() || s.title?.toLowerCase().includes(type.toLowerCase())
        );
        if (section) {
          return `**${section.title}**\n${section.content.substring(0, 1500)}`;
        }
      }
      return '';
    };

    // Phase 1: Background & Introduction
    const phase1Parts = [findSection(['abstract']), findSection(['introduction', 'background', 'overview'])].filter(
      Boolean
    );
    const phase1 =
      phase1Parts.length > 0 ? phase1Parts.join('\n\n') : `**論文冒頭部分**\n${rawText.substring(0, 2000)}`;

    // Phase 2: Methods & Approach
    const phase2Parts = [
      findSection(['methods', 'methodology', 'approach']),
      findSection(['model', 'architecture', 'framework']),
      findSection(['proposed', 'technique', 'algorithm']),
    ].filter(Boolean);
    const phase2 =
      phase2Parts.length > 0 ? phase2Parts.join('\n\n') : `**方法論部分**\n${rawText.substring(2000, 4500)}`;

    // Phase 3: Experiments & Results
    const phase3Parts = [
      findSection(['experiments', 'experimental']),
      findSection(['results', 'findings', 'evaluation']),
      findSection(['analysis', 'comparison']),
    ].filter(Boolean);
    const phase3 =
      phase3Parts.length > 0 ? phase3Parts.join('\n\n') : `**実験・結果部分**\n${rawText.substring(4500, 7000)}`;

    // Phase 4: Conclusion & Applications
    const phase4Parts = [
      findSection(['discussion']),
      findSection(['conclusion', 'conclusions']),
      findSection(['future', 'future work', 'limitations']),
      findSection(['applications', 'implications']),
    ].filter(Boolean);
    const phase4 =
      phase4Parts.length > 0
        ? phase4Parts.join('\n\n')
        : `**結論部分**\n${rawText.substring(Math.max(0, rawText.length - 2500))}`;

    return { phase1, phase2, phase3, phase4 };
  }

  /**
   * Sanitize generated script to ensure correct asset filenames
   * Post-processing to fix any AI-generated incorrect asset references
   */
  static sanitizeScript(script: string): string {
    let sanitized = script;

    // Fix background references - only bg.webp is available
    sanitized = sanitized.replace(/changeBg:([^;]+\.webp)/gi, 'changeBg:bg.webp');

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
  private validateGeneratedScript(
    script: string,
    characters: string[]
  ): {
    syntaxValid: boolean;
    characterConsistent: boolean;
    educationalAccurate: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check basic WebGAL syntax
    const lines = script.split('\n').filter((line) => line.trim());
    let syntaxValid = true;

    for (const line of lines) {
      if (line.includes(':') && !this.isValidWebGALCommand(line)) {
        syntaxValid = false;
        issues.push(`Invalid WebGAL syntax: ${line.substring(0, 50)}...`);
      }
    }

    // Check character consistency
    const scriptSpeakers = this.extractSpeakers(script);
    const characterConsistent =
      characters.length > 0 && scriptSpeakers.every((speaker) => this.isValidSpeaker(speaker, characters));

    if (!characterConsistent) {
      issues.push("Character names in script don't match expected characters");
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
      issues,
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
    return speakerMatches.map((match) => {
      const cleanMatch = match.replace('-speaker=', '');
      return cleanMatch;
    });
  }

  /**
   * Check if speaker name is valid for given characters
   */
  private isValidSpeaker(speaker: string, _characters: string[]): boolean {
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
        max_tokens: 10,
      });

      return response.choices && response.choices.length > 0;
    } catch {
      return false;
    }
  }
}
