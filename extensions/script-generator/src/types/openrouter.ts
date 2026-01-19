/**
 * OpenRouter API Types
 *
 * Type definitions for OpenRouter API interactions
 */

/**
 * OpenRouter API configuration
 */
export interface OpenRouterConfig {
  /** API key */
  apiKey: string;

  /** Base URL (default: https://openrouter.ai/api/v1) */
  baseURL?: string;

  /** HTTP referer for API calls */
  httpReferer?: string;

  /** Application title */
  appTitle?: string;

  /** Default model */
  defaultModel?: string;

  /** Request timeout (ms) */
  timeout?: number;
}

/**
 * Supported OpenRouter models
 */
export type OpenRouterModel =
  | 'google/gemini-3-flash-preview'
  | 'google/gemini-3-pro-preview'
  | 'google/gemini-2.5-pro'
  | 'anthropic/claude-3.5-sonnet'
  | 'anthropic/claude-3.5-haiku'
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini';

/**
 * Chat completion message
 */
export interface ChatMessage {
  /** Message role */
  role: 'system' | 'user' | 'assistant';

  /** Message content */
  content: string;

  /** Optional message metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Chat completion request
 */
export interface ChatCompletionRequest {
  /** Model to use */
  model: OpenRouterModel;

  /** Conversation messages */
  messages: ChatMessage[];

  /** Temperature (0-2) */
  temperature?: number;

  /** Maximum tokens to generate */
  max_tokens?: number;

  /** Top-p sampling */
  top_p?: number;

  /** Frequency penalty */
  frequency_penalty?: number;

  /** Presence penalty */
  presence_penalty?: number;

  /** Stop sequences */
  stop?: string[];

  /** Enable reasoning (for supported models) */
  reasoning?: boolean;

  /** Stream response */
  stream?: boolean;
}

/**
 * Chat completion choice
 */
export interface ChatCompletionChoice {
  /** Choice index */
  index: number;

  /** Generated message */
  message: {
    role: 'assistant';
    content: string;
  };

  /** Finish reason */
  finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls';

  /** Reasoning details (if enabled) */
  reasoning_details?: {
    /** Reasoning content */
    content: string;

    /** Reasoning steps */
    steps?: string[];
  };
}

/**
 * API usage statistics
 */
export interface Usage {
  /** Input tokens */
  prompt_tokens: number;

  /** Output tokens */
  completion_tokens: number;

  /** Total tokens */
  total_tokens: number;

  /** Estimated cost (USD) */
  estimated_cost?: number;
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  /** Unique request ID */
  id: string;

  /** Object type */
  object: 'chat.completion';

  /** Creation timestamp */
  created: number;

  /** Model used */
  model: string;

  /** Generated choices */
  choices: ChatCompletionChoice[];

  /** Token usage */
  usage: Usage;

  /** Provider metadata */
  provider?: {
    name: string;
    model: string;
  };
}

/**
 * API error response
 */
export interface OpenRouterError {
  /** Error type */
  type: string;

  /** Error message */
  message: string;

  /** Error code */
  code?: string;

  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Script generation request
 */
export interface ScriptGenerationRequest {
  /** Paper data to convert */
  paperData: any; // Will be imported from @paper2galgame/paper-parser

  /** Selected characters */
  characters: string[];

  /** Generation options */
  options: {
    /** Educational weight */
    educationalWeight: number;

    /** Style preferences */
    style: 'formal' | 'casual' | 'entertaining';

    /** Include interactions */
    includeInteractions: boolean;
  };
}

/**
 * Script generation response
 */
export interface ScriptGenerationResponse {
  /** Generated script */
  script: string;

  /** Generation metadata */
  metadata: {
    /** Model used */
    model: string;

    /** Generation time (ms) */
    generationTime: number;

    /** Token usage */
    usage: Usage;

    /** Quality score (0-1) */
    qualityScore?: number;
  };

  /** Validation results */
  validation?: {
    /** Syntax valid */
    syntaxValid: boolean;

    /** Character consistency */
    characterConsistent: boolean;

    /** Educational accuracy */
    educationalAccurate: boolean;

    /** Issues found */
    issues: string[];
  };
}
