/**
 * Paper2GalGame Script Generator
 *
 * AI-powered script generation system for converting academic papers
 * into WebGAL format educational visual novels
 *
 * @version 0.2.0
 * @author Paper2GalGame Team
 */

// Character system
export {
  CHARACTER_CONFIGS,
  CHARACTER_INTERACTIONS,
  getAvailableCharacters,
  getCharacter,
  validateCharacterSelection,
} from './characters';
export type { GenerationResult } from './generator';
// Main classes
export { ScriptGenerator } from './generator';
export type {
  BackgroundTask,
  GameInstance,
  GameProgress,
  GenerationProgress,
  IncrementalConfig,
  IncrementalGenerationResult,
  PaperSegment,
  SaveData,
  SaveSystemConfig,
  ScriptGeneratorInterface,
  SegmentEvent,
  SegmentEventListener,
  SegmentProgress,
  SegmentStatus,
  SegmentType,
  WaitingDialogue,
} from './incremental';

// Incremental generation system
export {
  createIncrementalGenerator,
  createSaveSystem,
  createSegmentationStrategy,
  IncrementalScriptGenerator,
  MultiPaperSaveSystem,
  PaperSegmentationStrategy,
} from './incremental';
export { OpenRouterClient } from './openrouter';
// Utilities
export { LanguageSwitcher } from './utils';
export { ScriptValidator } from './validator';

import { LanguageSwitcher } from './utils';

// Type definitions - re-export all types from types module
export type {
  // Character types
  Character,
  CharacterInteraction,
  CharacterName,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  DialogueLine,
  GenerationOptions,
  MultiLanguageContent,
  MultiLanguageOptions,
  // OpenRouter types
  OpenRouterConfig,
  OpenRouterError,
  OpenRouterModel,
  PaperMetadata,
  PaperSection,
  // Paper types
  ParsedPaper,
  ScriptGenerationRequest,
  ScriptGenerationResponse,
  ValidationConfig,
  VoiceSettings,
  // Script types
  WebGALCommand,
  WebGALLine,
  WebGALScene,
  WebGALScript,
} from './types';

// Validation results
export type {
  CharacterValidationResult,
  EducationalValidationResult,
  FlowValidationResult,
  SyntaxValidationResult,
  ValidationResult,
} from './validator';

import { getAvailableCharacters, getCharacter } from './characters';
// Import needed classes locally for the main class
import { ScriptGenerator } from './generator';
import { ScriptValidator } from './validator';

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
      appTitle: 'Paper2GalGame',
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
      verifyTranslations: true,
    };

    const finalOptions = {
      ...options,
      multiLanguage: {
        ...defaultMultiLanguage,
        ...multiLanguageOptions,
      },
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
        validation: validationResult,
      },
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
