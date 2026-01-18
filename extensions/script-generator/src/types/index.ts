/**
 * Type Definitions Index
 *
 * Central export for all type definitions
 */

// Character types
export type {
  CharacterName,
  VoiceSettings,
  Character,
  CharacterInteraction,
  DialogueLine,
  MultiLanguageContent
} from './character';

// Script types
export type {
  WebGALCommand,
  WebGALLine,
  WebGALScene,
  WebGALScript,
  GenerationOptions,
  MultiLanguageOptions,
  ValidationConfig
} from './script';

// OpenRouter API types
export type {
  OpenRouterConfig,
  OpenRouterModel,
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionChoice,
  Usage,
  ChatCompletionResponse,
  OpenRouterError,
  ScriptGenerationRequest,
  ScriptGenerationResponse
} from './openrouter';

// Re-export paper parser types if needed
// export type { ParsedPaper, PaperSection, PaperMetadata } from '@paper2galgame/paper-parser';

// Temporary type definitions until paper-parser is available
export interface ParsedPaper {
  metadata: PaperMetadata;
  sections: PaperSection[];
  rawText: string;
  stats: any;
  timestamp: Date;
  parserVersion: string;
  sourceFile: any;
}

export interface PaperSection {
  type: string;
  title: string;
  content: string;
  level?: number;
  confidence?: number;
}

export interface PaperMetadata {
  title: string;
  authors: string[];
  keywords: string[];
  date?: string;
}