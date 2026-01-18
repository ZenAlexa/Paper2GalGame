/**
 * Paper2GalGame Script Generator
 *
 * AI-powered script generation system for converting academic papers
 * into WebGAL format educational visual novels
 *
 * @version 0.2.0
 * @author Paper2GalGame Team
 */

// Main classes
export { ScriptGenerator } from './generator';
export type { GenerationResult } from './generator';
export { ScriptValidator } from './validator';
export { OpenRouterClient } from './openrouter';

// Incremental generation system
export {
  PaperSegmentationStrategy,
  createSegmentationStrategy,
  IncrementalScriptGenerator,
  createIncrementalGenerator,
  MultiPaperSaveSystem,
  createSaveSystem
} from './incremental';

export type {
  PaperSegment,
  SegmentType,
  SegmentStatus,
  SegmentProgress,
  GenerationProgress,
  BackgroundTask,
  IncrementalGenerationResult,
  SegmentEvent,
  SegmentEventListener,
  WaitingDialogue,
  IncrementalConfig,
  ScriptGeneratorInterface,
  GameInstance,
  SaveData,
  GameProgress,
  SaveSystemConfig
} from './incremental';

// Character system
export {
  CHARACTER_CONFIGS,
  CHARACTER_INTERACTIONS,
  getCharacter,
  getAvailableCharacters,
  validateCharacterSelection
} from './characters';

// Utilities
export { LanguageSwitcher } from './utils';
import { LanguageSwitcher } from './utils';

// Type definitions - re-export all types from types module
export type {
  // Character types
  Character,
  CharacterName,
  VoiceSettings,
  CharacterInteraction,
  DialogueLine,
  MultiLanguageContent,
  // Script types
  WebGALCommand,
  WebGALLine,
  WebGALScene,
  WebGALScript,
  GenerationOptions,
  MultiLanguageOptions,
  ValidationConfig,
  // OpenRouter types
  OpenRouterConfig,
  OpenRouterModel,
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  OpenRouterError,
  ScriptGenerationRequest,
  ScriptGenerationResponse,
  // Paper types
  ParsedPaper,
  PaperSection,
  PaperMetadata
} from './types';

// Validation results
export type {
  ValidationResult,
  SyntaxValidationResult,
  CharacterValidationResult,
  EducationalValidationResult,
  FlowValidationResult
} from './validator';

// Import needed classes locally for the main class
import { ScriptGenerator } from './generator';
import { ScriptValidator } from './validator';
import { getAvailableCharacters, getCharacter } from './characters';

/**
 * Main class that combines all functionality
 */
export class PaperScriptGenerator {
  private generator: ScriptGenerator;
  private validator: ScriptValidator;

  /**
   * Create a new script generator instance
   */
  constructor(openRouterApiKey: string, baseURL?: string) {
    this.generator = new ScriptGenerator({
      apiKey: openRouterApiKey,
      baseURL: baseURL || 'https://openrouter.ai/api/v1',
      httpReferer: 'https://paper2galgame.com',
      appTitle: 'Paper2GalGame'
    });

    this.validator = new ScriptValidator();
  }

  /**
   * Generate and validate script from paper with multi-language support
   */
  async generateValidatedScript(
    paperData: any, // ParsedPaper from @paper2galgame/paper-parser
    options: any, // GenerationOptions
    multiLanguageOptions?: {
      generateAll?: boolean;
      primaryLanguage?: 'zh' | 'jp' | 'en';
      qualityThreshold?: number;
      verifyTranslations?: boolean;
    }
  ) {
    // Apply default multi-language options
    const defaultMultiLanguage = {
      generateAll: true,
      primaryLanguage: 'jp' as const, // Default to Japanese for voice consistency
      qualityThreshold: 0.8,
      verifyTranslations: true
    };

    const finalOptions = {
      ...options,
      multiLanguage: {
        ...defaultMultiLanguage,
        ...multiLanguageOptions
      }
    };

    // Generate script
    const generationResult = await this.generator.generateScript(paperData, finalOptions);

    if (!generationResult.success || !generationResult.script) {
      return generationResult;
    }

    // Validate generated script
    const validationResult = await this.validator.validateScript(generationResult.script);

    // Combine results
    return {
      ...generationResult,
      validation: validationResult,
      script: {
        ...generationResult.script,
        validation: validationResult
      }
    };
  }

  /**
   * Switch script language
   */
  switchScriptLanguage(script: any, targetLanguage: 'zh' | 'jp' | 'en') {
    return LanguageSwitcher.switchScriptLanguage(script, targetLanguage);
  }

  /**
   * Export script for specific language
   */
  exportScriptForLanguage(script: any, targetLanguage: 'zh' | 'jp' | 'en'): string {
    return LanguageSwitcher.exportScriptForLanguage(script, targetLanguage);
  }

  /**
   * Generate translation quality report
   */
  getTranslationReport(script: any) {
    return LanguageSwitcher.generateTranslationReport(script);
  }

  /**
   * Test configuration and API connection
   */
  async testConfiguration(): Promise<boolean> {
    return await this.generator.testConfiguration();
  }

  /**
   * Get available characters
   */
  getAvailableCharacters() {
    return getAvailableCharacters();
  }

  /**
   * Get character details
   */
  getCharacterDetails(characterId: string) {
    return getCharacter(characterId);
  }
}

/**
 * Default export for easy usage
 */
export default PaperScriptGenerator;