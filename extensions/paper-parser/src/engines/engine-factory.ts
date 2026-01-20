/**
 * Engine Factory - Intelligent Engine Selection and Management
 *
 * Provides unified interface for selecting and managing different parsing engines
 * with intelligent fallback mechanisms and cost optimization.
 */

// Import legacy parsers
import { PdfParser } from '../parsers/pdf-parser';
import { TxtParser } from '../parsers/txt-parser';
import { WordParser } from '../parsers/word-parser';
import type {
  EngineSelection,
  EnhancedParseResult,
  EnhancedParserConfig,
  ParsingEngine,
  ProgressCallback,
} from '../types/enhanced-paper';
// Import engines
import { MinerUEngine } from './modern/mineru-engine';
import { MultimodalEngine } from './modern/multimodal-engine';

/**
 * Engine capability assessment
 */
interface EngineCapabilities {
  /** Supports PDF processing */
  supportsPDF: boolean;

  /** Supports Word documents */
  supportsWord: boolean;

  /** Supports TXT files */
  supportsTXT: boolean;

  /** Has formula recognition */
  hasFormulaRecognition: boolean;

  /** Has AI enhancement */
  hasAIEnhancement: boolean;

  /** Quality score (0-1) */
  qualityScore: number;

  /** Relative cost (1=lowest, 10=highest) */
  costLevel: number;

  /** Speed score (0-1, 1=fastest) */
  speedScore: number;
}

/**
 * Engine health status
 */
interface EngineHealth {
  /** Engine is available */
  available: boolean;

  /** Last health check timestamp */
  lastChecked: Date;

  /** Response time in milliseconds */
  responseTime?: number;

  /** Error message if unavailable */
  error?: string;
}

/**
 * Unified parsing interface for all engines
 */
export interface UnifiedEngine {
  /** Engine name */
  name: string;

  /** Parse file */
  parseFile(filePath: string, config?: any): Promise<EnhancedParseResult>;

  /** Test engine availability */
  testConnection(): Promise<boolean>;

  /** Get engine capabilities */
  getCapabilities(): EngineCapabilities;

  /** Set progress callback */
  setProgressCallback?(callback: ProgressCallback): void;
}

/**
 * Engine factory for intelligent engine selection
 */
export class EngineFactory {
  private config: EnhancedParserConfig;
  private engineHealth: Map<string, EngineHealth> = new Map();
  private engines: Map<string, UnifiedEngine> = new Map();
  private progressCallback?: ProgressCallback;

  constructor(config: EnhancedParserConfig) {
    this.config = config;
    this.initializeEngines();
  }

  /**
   * Initialize all available engines
   */
  private initializeEngines(): void {
    // Initialize legacy engines
    this.engines.set('legacy-pdf', this.createLegacyPDFEngine());
    this.engines.set('legacy-word', this.createLegacyWordEngine());
    this.engines.set('legacy-txt', this.createLegacyTxtEngine());

    // Initialize modern engines if configured
    if (this.config.mineruConfig?.enabled) {
      this.engines.set('mineru', this.createMinerUEngine());
    }

    if (this.config.aiEnhancement?.enableFormulaAI) {
      this.engines.set('multimodal', this.createMultimodalEngine());
    }

    // Initialize hybrid engine
    this.engines.set('hybrid', this.createHybridEngine());
  }

  /**
   * Set progress callback for all engines
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;

    // Set callback for all engines that support it
    for (const engine of this.engines.values()) {
      if (engine.setProgressCallback) {
        engine.setProgressCallback(callback);
      }
    }
  }

  /**
   * Select best engine for file
   */
  async selectEngine(filePath: string, preferredEngine?: ParsingEngine): Promise<EngineSelection> {
    const fileType = this.detectFileType(filePath);

    // Check preferred engine first
    if (preferredEngine && preferredEngine !== 'auto') {
      const engine = await this.validateEngine(preferredEngine, fileType);
      if (engine) {
        return {
          engine: preferredEngine,
          reason: `User preference: ${preferredEngine}`,
          confidence: 0.9,
          fallbacks: await this.getFallbackEngines(preferredEngine, fileType),
        };
      }
    }

    // Intelligent selection based on file type and capabilities
    const candidates = await this.getAvailableEngines(fileType);
    const bestEngine = this.rankEngines(candidates, fileType);

    if (!bestEngine) {
      throw new Error(`No suitable engine found for file type: ${fileType}`);
    }

    return {
      engine: bestEngine.engine,
      reason: bestEngine.reason,
      confidence: bestEngine.confidence,
      fallbacks: candidates.slice(1).map((c) => c.engine),
    };
  }

  /**
   * Parse file using selected engine
   */
  async parseFile(filePath: string, selectedEngine?: ParsingEngine): Promise<EnhancedParseResult> {
    const selection = await this.selectEngine(filePath, selectedEngine);

    // Try primary engine
    try {
      const engine = this.engines.get(this.mapEngineToImplementation(selection.engine));
      if (!engine) {
        throw new Error(`Engine implementation not found: ${selection.engine}`);
      }

      this.reportProgress({
        stage: 'init',
        progress: 0,
        description: `Starting parsing with ${selection.engine} engine`,
      });

      const result = await engine.parseFile(filePath, this.config);

      // Enhance result with selection metadata
      return {
        ...result,
        aiSummary: {
          method: this.mapEngineToMethod(selection.engine),
          confidence: selection.confidence,
          recommendations: [],
          costs: {
            apiCalls: 0, // Will be updated by specific engines
            estimatedDollars: 0,
            tokensUsed: 0,
          },
        },
      };
    } catch (error) {
      console.warn(`Primary engine ${selection.engine} failed:`, error);

      // Try fallback engines
      for (const fallbackEngine of selection.fallbacks) {
        try {
          console.log(`Trying fallback engine: ${fallbackEngine}`);

          const engine = this.engines.get(this.mapEngineToImplementation(fallbackEngine));
          if (!engine) continue;

          this.reportProgress({
            stage: 'init',
            progress: 0,
            description: `Fallback to ${fallbackEngine} engine`,
          });

          const result = await engine.parseFile(filePath, this.config);

          return {
            ...result,
            aiSummary: {
              method: this.mapEngineToMethod(fallbackEngine),
              confidence: 0.7, // Lower confidence for fallback
              recommendations: [`Primary engine ${selection.engine} failed, used fallback`],
              costs: {
                apiCalls: 0,
                estimatedDollars: 0,
                tokensUsed: 0,
              },
            },
          };
        } catch (fallbackError) {
          console.warn(`Fallback engine ${fallbackEngine} failed:`, fallbackError);
        }
      }

      // All engines failed
      throw new Error(`All engines failed. Primary: ${error}`);
    }
  }

  /**
   * Check health of all engines
   */
  async checkEngineHealth(): Promise<Map<string, EngineHealth>> {
    const healthChecks = Array.from(this.engines.entries()).map(async ([name, engine]) => {
      const startTime = Date.now();

      try {
        const available = await engine.testConnection();
        const responseTime = Date.now() - startTime;

        return [
          name,
          {
            available,
            lastChecked: new Date(),
            responseTime,
          },
        ] as [string, EngineHealth];
      } catch (error) {
        return [
          name,
          {
            available: false,
            lastChecked: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ] as [string, EngineHealth];
      }
    });

    const results = await Promise.allSettled(healthChecks);

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        this.engineHealth.set(result.value[0], result.value[1]);
      }
    });

    return this.engineHealth;
  }

  /**
   * Get engine statistics
   */
  getEngineStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name, engine] of this.engines) {
      const health = this.engineHealth.get(name);
      stats[name] = {
        available: health?.available || false,
        capabilities: engine.getCapabilities(),
        lastCheck: health?.lastChecked,
        responseTime: health?.responseTime,
      };
    }

    return stats;
  }

  // Private methods

  private detectFileType(filePath: string): 'pdf' | 'word' | 'txt' {
    const ext = filePath.toLowerCase().split('.').pop();

    switch (ext) {
      case 'pdf':
        return 'pdf';
      case 'doc':
      case 'docx':
        return 'word';
      case 'txt':
      case 'md':
        return 'txt';
      default:
        return 'txt'; // Default fallback
    }
  }

  private async validateEngine(engine: ParsingEngine, fileType: string): Promise<boolean> {
    const implementationName = this.mapEngineToImplementation(engine);
    const engineInstance = this.engines.get(implementationName);

    if (!engineInstance) return false;

    const capabilities = engineInstance.getCapabilities();

    // Check file type support
    switch (fileType) {
      case 'pdf':
        return capabilities.supportsPDF;
      case 'word':
        return capabilities.supportsWord;
      case 'txt':
        return capabilities.supportsTXT;
      default:
        return false;
    }
  }

  private async getAvailableEngines(fileType: string) {
    const candidates = [];

    for (const [name, engine] of this.engines) {
      const capabilities = engine.getCapabilities();
      const health = this.engineHealth.get(name);

      // Check file type support
      let supported = false;
      switch (fileType) {
        case 'pdf':
          supported = capabilities.supportsPDF;
          break;
        case 'word':
          supported = capabilities.supportsWord;
          break;
        case 'txt':
          supported = capabilities.supportsTXT;
          break;
      }

      if (supported && health?.available !== false) {
        candidates.push({
          engine: this.mapImplementationToEngine(name),
          capabilities,
          health: health || { available: true, lastChecked: new Date() },
        });
      }
    }

    return candidates;
  }

  private rankEngines(candidates: any[], fileType: string) {
    if (candidates.length === 0) return null;

    // Score each candidate
    const scored = candidates.map((candidate) => {
      let score = 0;

      // Quality weight
      score += candidate.capabilities.qualityScore * 0.4;

      // Speed weight
      score += candidate.capabilities.speedScore * 0.3;

      // Cost efficiency (inverse of cost level)
      score += ((11 - candidate.capabilities.costLevel) / 10) * 0.2;

      // AI capabilities bonus for complex files
      if (fileType === 'pdf' && candidate.capabilities.hasFormulaRecognition) {
        score += 0.1;
      }

      return {
        engine: candidate.engine,
        score,
        confidence: Math.min(score, 0.95),
        reason: this.generateSelectionReason(candidate.capabilities),
      };
    });

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    return scored[0];
  }

  private async getFallbackEngines(primaryEngine: ParsingEngine, fileType: string): Promise<ParsingEngine[]> {
    const available = await this.getAvailableEngines(fileType);

    return available
      .map((c) => c.engine)
      .filter((engine) => engine !== primaryEngine)
      .slice(0, 3); // Limit to 3 fallbacks
  }

  private mapEngineToImplementation(engine: ParsingEngine): string {
    switch (engine) {
      case 'legacy':
        return 'legacy-pdf';
      case 'mineru':
        return 'mineru';
      case 'ai-enhanced':
        return 'multimodal';
      case 'full-ai':
        return 'hybrid';
      default:
        return 'legacy-pdf';
    }
  }

  private mapImplementationToEngine(implementation: string): ParsingEngine {
    switch (implementation) {
      case 'legacy-pdf':
      case 'legacy-word':
      case 'legacy-txt':
        return 'legacy';
      case 'mineru':
        return 'mineru';
      case 'multimodal':
        return 'ai-enhanced';
      case 'hybrid':
        return 'full-ai';
      default:
        return 'auto';
    }
  }

  private mapEngineToMethod(engine: ParsingEngine): 'legacy' | 'ai-enhanced' | 'full-ai' {
    switch (engine) {
      case 'legacy':
        return 'legacy';
      case 'ai-enhanced':
      case 'mineru':
        return 'ai-enhanced';
      case 'full-ai':
        return 'full-ai';
      default:
        return 'legacy';
    }
  }

  private generateSelectionReason(capabilities: EngineCapabilities): string {
    const reasons = [];

    if (capabilities.hasAIEnhancement) {
      reasons.push('AI enhancement');
    }

    if (capabilities.hasFormulaRecognition) {
      reasons.push('formula recognition');
    }

    if (capabilities.qualityScore > 0.8) {
      reasons.push('high quality');
    }

    if (capabilities.speedScore > 0.8) {
      reasons.push('fast processing');
    }

    return reasons.length > 0 ? `Selected for: ${reasons.join(', ')}` : 'Best available option';
  }

  private reportProgress(progress: Partial<ParsingProgress>): void {
    if (this.progressCallback) {
      this.progressCallback({
        stage: 'init',
        progress: 0,
        description: '',
        ...progress,
      });
    }
  }

  // Engine creation methods

  private createLegacyPDFEngine(): UnifiedEngine {
    // Wrapper for legacy PDF parser
    return {
      name: 'Legacy PDF Parser',
      parseFile: async (filePath: string) => {
        const parser = new PdfParser();
        const result = await parser.parse(filePath);

        return {
          success: result.success,
          data: result.data as any, // Type conversion needed
          errors: result.errors,
          partialData: result.partialData,
        };
      },
      testConnection: async () => true, // Always available
      getCapabilities: () => ({
        supportsPDF: true,
        supportsWord: false,
        supportsTXT: false,
        hasFormulaRecognition: false,
        hasAIEnhancement: false,
        qualityScore: 0.6,
        costLevel: 1,
        speedScore: 0.9,
      }),
    };
  }

  private createLegacyWordEngine(): UnifiedEngine {
    return {
      name: 'Legacy Word Parser',
      parseFile: async (filePath: string) => {
        const parser = new WordParser();
        const result = await parser.parse(filePath);

        return {
          success: result.success,
          data: result.data as any,
          errors: result.errors,
          partialData: result.partialData,
        };
      },
      testConnection: async () => true,
      getCapabilities: () => ({
        supportsPDF: false,
        supportsWord: true,
        supportsTXT: false,
        hasFormulaRecognition: false,
        hasAIEnhancement: false,
        qualityScore: 0.7,
        costLevel: 1,
        speedScore: 0.95,
      }),
    };
  }

  private createLegacyTxtEngine(): UnifiedEngine {
    return {
      name: 'Legacy Text Parser',
      parseFile: async (filePath: string) => {
        const parser = new TxtParser();
        const result = await parser.parse(filePath);

        return {
          success: result.success,
          data: result.data as any,
          errors: result.errors,
          partialData: result.partialData,
        };
      },
      testConnection: async () => true,
      getCapabilities: () => ({
        supportsPDF: false,
        supportsWord: false,
        supportsTXT: true,
        hasFormulaRecognition: false,
        hasAIEnhancement: false,
        qualityScore: 0.5,
        costLevel: 1,
        speedScore: 1.0,
      }),
    };
  }

  private createMinerUEngine(): UnifiedEngine {
    const engine = new MinerUEngine(this.config.mineruConfig);

    return {
      name: 'MinerU Engine',
      parseFile: async (filePath: string) => {
        const result = await engine.parsePDF(filePath);

        return {
          success: true,
          data: result as any,
          errors: [],
        };
      },
      testConnection: () => engine.testConnection(),
      setProgressCallback: (callback) => engine.setProgressCallback(callback),
      getCapabilities: () => ({
        supportsPDF: true,
        supportsWord: false,
        supportsTXT: false,
        hasFormulaRecognition: true,
        hasAIEnhancement: true,
        qualityScore: 0.95,
        costLevel: 3,
        speedScore: 0.7,
      }),
    };
  }

  private createMultimodalEngine(): UnifiedEngine {
    const engine = new MultimodalEngine({
      openRouter: this.config.openRouterConfig!,
      visionModel: this.config.aiEnhancement?.preferredModels?.vision || 'google/gemini-3-flash-preview',
      fallbackModels: ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet'],
      maxConcurrency: 3,
      costControl: this.config.aiEnhancement?.costControl || {
        maxCostPerPaper: 1.0,
        maxFormulasPerPaper: 50,
        enableCaching: true,
      },
      qualityThresholds: {
        minConfidence: 0.7,
        retryLowConfidence: true,
      },
    });

    return {
      name: 'Multimodal AI Engine',
      parseFile: async (_filePath: string) => {
        // This would need integration with MinerU or legacy parser first
        throw new Error('Multimodal engine requires base parsing first');
      },
      testConnection: () => engine.testConnection(),
      setProgressCallback: (callback) => engine.setProgressCallback(callback),
      getCapabilities: () => ({
        supportsPDF: true,
        supportsWord: false,
        supportsTXT: false,
        hasFormulaRecognition: true,
        hasAIEnhancement: true,
        qualityScore: 0.98,
        costLevel: 8,
        speedScore: 0.4,
      }),
    };
  }

  private createHybridEngine(): UnifiedEngine {
    // Combines MinerU + Multimodal for best results
    return {
      name: 'Hybrid AI Engine',
      parseFile: async (_filePath: string) => {
        // Would orchestrate multiple engines
        throw new Error('Hybrid engine implementation pending');
      },
      testConnection: async () => {
        const mineruOk = this.config.mineruConfig?.enabled ? await this.engines.get('mineru')?.testConnection() : true;
        const multimodalOk = this.config.aiEnhancement?.enableFormulaAI
          ? await this.engines.get('multimodal')?.testConnection()
          : true;

        return mineruOk && multimodalOk;
      },
      getCapabilities: () => ({
        supportsPDF: true,
        supportsWord: false,
        supportsTXT: false,
        hasFormulaRecognition: true,
        hasAIEnhancement: true,
        qualityScore: 0.99,
        costLevel: 10,
        speedScore: 0.3,
      }),
    };
  }
}
