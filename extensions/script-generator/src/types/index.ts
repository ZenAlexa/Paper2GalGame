/**
 * Type Definitions Index
 *
 * Central export for all type definitions
 */

// Character types
export type {
  Character,
  CharacterInteraction,
  CharacterName,
  DialogueLine,
  MultiLanguageContent,
  VoiceSettings,
} from './character';
// OpenRouter API types
export type {
  ChatCompletionChoice,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  OpenRouterConfig,
  OpenRouterError,
  OpenRouterModel,
  ScriptGenerationRequest,
  ScriptGenerationResponse,
  Usage,
} from './openrouter';
// Script types
export type {
  GenerationOptions,
  MultiLanguageOptions,
  ValidationConfig,
  WebGALCommand,
  WebGALLine,
  WebGALScene,
  WebGALScript,
} from './script';

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
