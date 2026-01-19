/**
 * Multimodal AI Engine - Advanced Formula Recognition
 *
 * Integrates with OpenRouter API for Gemini 3.0 and other multimodal models
 * to provide state-of-the-art formula recognition and semantic understanding.
 */

import { createHash } from 'node:crypto';
import { OpenRouterClient } from '../../../script-generator/src/openrouter/client';
import type { ChatCompletionRequest, OpenRouterConfig } from '../../../script-generator/src/types';
import type { EnhancedEquation, ParsingProgress, ProgressCallback } from '../../types/enhanced-paper';

/**
 * Formula analysis request
 */
interface FormulaAnalysisRequest {
  /** Base64 encoded image of the formula */
  imageData: string;

  /** Bounding box coordinates */
  bbox: [number, number, number, number];

  /** Context text around the formula */
  context: string;

  /** Expected complexity level */
  expectedComplexity?: 'simple' | 'medium' | 'complex';
}

/**
 * Formula analysis response from AI
 */
interface FormulaAnalysisResponse {
  /** LaTeX representation */
  latex: string;

  /** Semantic description */
  description: string;

  /** Mathematical concepts involved */
  concepts: string[];

  /** Confidence score (0-1) */
  confidence: number;

  /** Alternative representations */
  alternatives?: string[];

  /** Educational explanation */
  explanation?: string;

  /** Complexity assessment */
  complexity: 'simple' | 'medium' | 'complex';

  /** Math type classification */
  mathType: 'arithmetic' | 'algebra' | 'calculus' | 'statistics' | 'geometry' | 'logic' | 'other';
}

/**
 * Configuration for multimodal engine
 */
export interface MultimodalEngineConfig {
  /** OpenRouter configuration */
  openRouter: OpenRouterConfig;

  /** Preferred vision model */
  visionModel: string;

  /** Fallback models */
  fallbackModels: string[];

  /** Maximum concurrent API calls */
  maxConcurrency: number;

  /** Cost control settings */
  costControl: {
    maxCostPerPaper: number;
    maxFormulasPerPaper: number;
    enableCaching: boolean;
  };

  /** Quality thresholds */
  qualityThresholds: {
    minConfidence: number;
    retryLowConfidence: boolean;
  };
}

/**
 * Cache entry for formula recognition
 */
interface FormulaCacheEntry {
  hash: string;
  result: FormulaAnalysisResponse;
  timestamp: Date;
  model: string;
}

/**
 * Multimodal AI engine for advanced formula recognition
 */
export class MultimodalEngine {
  private client: OpenRouterClient;
  private config: MultimodalEngineConfig;
  private progressCallback?: ProgressCallback;
  private cache: Map<string, FormulaCacheEntry> = new Map();
  private apiCallCount = 0;
  private totalCost = 0;

  constructor(config: MultimodalEngineConfig) {
    this.config = config;
    this.client = new OpenRouterClient(config.openRouter);
  }

  /**
   * Set progress callback for long-running operations
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Enhanced formula recognition using multimodal AI
   */
  async enhanceFormulas(formulaRequests: FormulaAnalysisRequest[]): Promise<EnhancedEquation[]> {
    this.reportProgress({
      stage: 'ai-enhancement',
      progress: 0,
      description: 'Starting AI-powered formula analysis',
    });

    const enhancedFormulas: EnhancedEquation[] = [];
    const maxFormulas = Math.min(formulaRequests.length, this.config.costControl.maxFormulasPerPaper);

    // Process formulas in batches to respect concurrency limits
    const batchSize = this.config.maxConcurrency;

    for (let i = 0; i < maxFormulas; i += batchSize) {
      const batch = formulaRequests.slice(i, i + batchSize);
      const batchPromises = batch.map((request) => this.analyzeFormula(request));

      try {
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, batchIndex) => {
          const globalIndex = i + batchIndex;

          if (result.status === 'fulfilled') {
            enhancedFormulas.push(this.createEnhancedEquation(result.value, formulaRequests[globalIndex], globalIndex));
          } else {
            console.warn(`Formula analysis failed for index ${globalIndex}:`, result.reason);

            // Create fallback enhanced equation
            enhancedFormulas.push(this.createFallbackEquation(formulaRequests[globalIndex], globalIndex));
          }
        });

        // Report progress
        const progressPercent = ((i + batch.length) / maxFormulas) * 100;
        this.reportProgress({
          stage: 'ai-enhancement',
          progress: progressPercent,
          description: `Processed ${i + batch.length} of ${maxFormulas} formulas`,
          itemsProcessed: {
            current: i + batch.length,
            total: maxFormulas,
            type: 'formulas',
          },
        });

        // Check cost limit
        if (this.totalCost > this.config.costControl.maxCostPerPaper) {
          console.warn('Cost limit exceeded, stopping AI processing');
          break;
        }
      } catch (error) {
        console.error('Batch processing failed:', error);

        // Create fallback equations for the entire batch
        batch.forEach((request, batchIndex) => {
          const globalIndex = i + batchIndex;
          enhancedFormulas.push(this.createFallbackEquation(request, globalIndex));
        });
      }
    }

    return enhancedFormulas;
  }

  /**
   * Analyze individual formula using AI
   */
  private async analyzeFormula(request: FormulaAnalysisRequest): Promise<FormulaAnalysisResponse> {
    // Check cache first
    if (this.config.costControl.enableCaching) {
      const cacheKey = this.generateCacheKey(request);
      const cached = this.cache.get(cacheKey);

      if (cached && this.isCacheValid(cached)) {
        return cached.result;
      }
    }

    // Prepare the AI request
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(request);

    const chatRequest: ChatCompletionRequest = {
      model: this.config.visionModel,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${request.imageData}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1, // Low temperature for consistency
      max_tokens: 1000,
      reasoning: true, // Enable reasoning for better quality
    };

    try {
      const startTime = Date.now();
      const response = await this.client.chatCompletion(chatRequest);
      const _processingTime = Date.now() - startTime;

      this.apiCallCount++;
      this.estimateCost();

      const analysis = this.parseAnalysisResponse(response.choices[0].message.content || '');

      // Cache the result
      if (this.config.costControl.enableCaching) {
        const cacheKey = this.generateCacheKey(request);
        this.cache.set(cacheKey, {
          hash: cacheKey,
          result: analysis,
          timestamp: new Date(),
          model: this.config.visionModel,
        });
      }

      return analysis;
    } catch (error) {
      // Try fallback models
      for (const fallbackModel of this.config.fallbackModels) {
        try {
          const fallbackRequest = { ...chatRequest, model: fallbackModel };
          const response = await this.client.chatCompletion(fallbackRequest);

          this.apiCallCount++;
          this.estimateCost();

          return this.parseAnalysisResponse(response.choices[0].message.content || '');
        } catch (fallbackError) {
          console.warn(`Fallback model ${fallbackModel} also failed:`, fallbackError);
        }
      }

      throw new Error(`All models failed for formula analysis: ${error}`);
    }
  }

  /**
   * Build system prompt for formula analysis
   */
  private buildSystemPrompt(): string {
    return `# Mathematical Formula Analysis Expert

You are an expert in mathematical formula recognition and analysis. Your task is to:

1. **Extract LaTeX**: Provide accurate LaTeX representation of the mathematical formula
2. **Semantic Understanding**: Explain what the formula represents mathematically
3. **Educational Context**: Provide learning-friendly explanations suitable for a visual novel
4. **Quality Assessment**: Evaluate complexity and mathematical type

## Output Format

Respond with a JSON object containing:
\`\`\`json
{
  "latex": "LaTeX representation",
  "description": "What this formula represents",
  "concepts": ["list", "of", "mathematical", "concepts"],
  "confidence": 0.95,
  "complexity": "simple|medium|complex",
  "mathType": "arithmetic|algebra|calculus|statistics|geometry|logic|other",
  "explanation": "Educational explanation suitable for learning",
  "alternatives": ["alternative", "representations"]
}
\`\`\`

## Quality Guidelines

- Ensure LaTeX is syntactically correct
- Focus on educational value for visual novel context
- Consider the formula's role in academic learning
- Provide clear, jargon-free explanations
- Assess complexity appropriately for learning progression`;
  }

  /**
   * Build user prompt for specific formula
   */
  private buildUserPrompt(_request: FormulaAnalysisRequest): string {
    return `Please analyze this mathematical formula image.

**Context**: $request.context || 'No context provided'

**Expected Complexity**: $request.expectedComplexity || 'unknown'

Please provide accurate LaTeX representation and educational analysis suitable for a visual novel learning experience. Focus on making complex mathematical concepts approachable for learners.`;
  }

  /**
   * Parse AI response into structured analysis
   */
  private parseAnalysisResponse(content: string): FormulaAnalysisResponse {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/```json\\s*([\\s\\S]*?)\\s*```/) ||
        content.match(/```\\s*([\\s\\S]*?)\\s*```/) || [null, content];

      if (jsonMatch?.[1]) {
        const parsed = JSON.parse(jsonMatch[1]);

        return {
          latex: parsed.latex || '',
          description: parsed.description || '',
          concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
          confidence: Math.max(0, Math.min(1, parsed.confidence || 0.8)),
          complexity: ['simple', 'medium', 'complex'].includes(parsed.complexity) ? parsed.complexity : 'medium',
          mathType: ['arithmetic', 'algebra', 'calculus', 'statistics', 'geometry', 'logic', 'other'].includes(
            parsed.mathType
          )
            ? parsed.mathType
            : 'other',
          explanation: parsed.explanation || '',
          alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
        };
      }
    } catch (error) {
      console.warn('Failed to parse AI response as JSON:', error);
    }

    // Fallback to text parsing
    return {
      latex: this.extractLatexFromText(content),
      description: content.substring(0, 200),
      concepts: [],
      confidence: 0.6,
      complexity: 'medium',
      mathType: 'other',
      explanation: content,
    };
  }

  /**
   * Extract LaTeX from plain text response
   */
  private extractLatexFromText(text: string): string {
    // Look for LaTeX patterns in text
    const latexPatterns = [
      /\\$\\$([^$]+)\\$\\$/g, // $$...$$
      /\\$([^$]+)\\$/g, // $...$
      /\\\\\\[([^\\]]+)\\\\\\]/g, // \\[...\\]
      /\\\\\\(([^\\)]+)\\\\\\)/g, // \\(...\\)
    ];

    for (const pattern of latexPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    // If no LaTeX found, return cleaned text
    return text
      .replace(/[^\\w\\s\\+\\-\\*\\/\\(\\)\\=]/g, '')
      .trim()
      .substring(0, 100);
  }

  /**
   * Create enhanced equation from AI analysis
   */
  private createEnhancedEquation(
    analysis: FormulaAnalysisResponse,
    request: FormulaAnalysisRequest,
    index: number
  ): EnhancedEquation {
    return {
      id: `ai-formula-${index}`,
      latex: analysis.latex,
      text: analysis.description,
      position: index,
      inline: this.isInlineFromBbox(request.bbox),
      bbox: request.bbox,
      confidence: analysis.confidence,
      semanticDescription: analysis.description,
      context: request.context,
      complexity: analysis.complexity,
      mathType: analysis.mathType,
      visualImage: request.imageData,

      aiMetadata: {
        model: this.config.visionModel,
        processingTime: 0, // Will be updated
        alternatives: analysis.alternatives,
        method: 'visual',
        quality: {
          latexAccuracy: analysis.confidence,
          semanticRelevance: analysis.confidence * 0.9,
          contextAlignment: request.context ? 0.8 : 0.6,
        },
      },

      educational: {
        difficulty: this.mapComplexityToDifficulty(analysis.complexity),
        concepts: analysis.concepts,
        explanation: analysis.explanation,
      },
    };
  }

  /**
   * Create fallback equation when AI fails
   */
  private createFallbackEquation(request: FormulaAnalysisRequest, index: number): EnhancedEquation {
    return {
      id: `fallback-formula-${index}`,
      latex: 'Formula recognition failed',
      text: 'Mathematical formula (recognition failed)',
      position: index,
      inline: this.isInlineFromBbox(request.bbox),
      bbox: request.bbox,
      confidence: 0.3,
      complexity: 'medium',
      mathType: 'other',
      visualImage: request.imageData,
    };
  }

  /**
   * Helper methods
   */
  private isInlineFromBbox(bbox: [number, number, number, number]): boolean {
    const height = bbox[3] - bbox[1];
    return height < 0.05; // Less than 5% of page height
  }

  private mapComplexityToDifficulty(
    complexity: 'simple' | 'medium' | 'complex'
  ): 'beginner' | 'intermediate' | 'advanced' {
    const mapping = {
      simple: 'beginner' as const,
      medium: 'intermediate' as const,
      complex: 'advanced' as const,
    };
    return mapping[complexity];
  }

  private generateCacheKey(request: FormulaAnalysisRequest): string {
    const data = {
      image: request.imageData.substring(0, 100), // Hash portion
      bbox: request.bbox,
      context: request.context?.substring(0, 100),
    };
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private isCacheValid(entry: FormulaCacheEntry): boolean {
    const age = Date.now() - entry.timestamp.getTime();
    return age < 24 * 60 * 60 * 1000; // 24 hours
  }

  private estimateCost(): void {
    // Rough estimation: $0.01 per API call for vision models
    this.totalCost += 0.01;
  }

  private reportProgress(progress: ParsingProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Get processing statistics
   */
  getStats(): {
    apiCalls: number;
    totalCost: number;
    cacheHits: number;
    cacheMisses: number;
  } {
    return {
      apiCalls: this.apiCallCount,
      totalCost: this.totalCost,
      cacheHits: 0, // TODO: implement cache hit tracking
      cacheMisses: 0, // TODO: implement cache miss tracking
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Test connection to OpenRouter API
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.client.testConnection();
    } catch {
      return false;
    }
  }
}
