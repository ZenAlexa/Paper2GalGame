/**
 * Enhanced Paper Parser Type Definitions - 2026 Edition
 *
 * Advanced types for modern multimodal AI-powered paper parsing
 * with professional formula recognition and layout understanding.
 */

import type {
  Equation,
  Figure,
  PaperSection,
  ParsedPaper,
  ParseResult,
  ParserConfig,
  ParsingStats,
  Table,
} from './paper';

/**
 * Enhanced equation with AI-powered analysis
 */
export interface EnhancedEquation extends Equation {
  /** Normalized bounding box coordinates [x1, y1, x2, y2] (0-1) */
  bbox?: [number, number, number, number];

  /** AI recognition confidence score (0-1) */
  confidence: number;

  /** Semantic description of the equation's meaning */
  semanticDescription?: string;

  /** Contextual information from surrounding text */
  context?: string;

  /** Mathematical complexity assessment */
  complexity: 'simple' | 'medium' | 'complex';

  /** Type of mathematics involved */
  mathType: 'arithmetic' | 'algebra' | 'calculus' | 'statistics' | 'geometry' | 'logic' | 'other';

  /** Original formula image (base64 encoded PNG) */
  visualImage?: string;

  /** AI processing metadata */
  aiMetadata?: {
    /** AI model used for recognition */
    model: string;
    /** Processing time in milliseconds */
    processingTime: number;
    /** Alternative LaTeX representations */
    alternatives?: string[];
    /** Recognition method used */
    method: 'structural' | 'visual' | 'hybrid';
    /** Quality assessment */
    quality: {
      latexAccuracy: number; // 0-1
      semanticRelevance: number; // 0-1
      contextAlignment: number; // 0-1
    };
  };

  /** Educational annotations for galgame use */
  educational?: {
    /** Difficulty level for learning */
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    /** Key concepts involved */
    concepts: string[];
    /** Suggested explanation approach */
    explanation?: string;
  };
}

/**
 * Enhanced figure with layout and AI analysis
 */
export interface EnhancedFigure extends Figure {
  /** Normalized bounding box coordinates */
  bbox?: [number, number, number, number];

  /** AI-generated detailed description */
  aiDescription?: string;

  /** Detected elements within the figure */
  elements?: {
    /** Text elements (OCR) */
    textRegions: Array<{
      text: string;
      bbox: [number, number, number, number];
      confidence: number;
    }>;
    /** Mathematical elements */
    mathRegions: Array<{
      latex: string;
      bbox: [number, number, number, number];
      confidence: number;
    }>;
  };

  /** Educational value assessment */
  educational?: {
    relevance: number; // 0-1
    explanation?: string;
    keyPoints: string[];
  };
}

/**
 * Enhanced table with structure analysis
 */
export interface EnhancedTable extends Table {
  /** Normalized bounding box coordinates */
  bbox?: [number, number, number, number];

  /** AI understanding of table structure */
  structure?: {
    /** Column types detected */
    columnTypes: ('text' | 'number' | 'formula' | 'mixed')[];
    /** Data patterns identified */
    patterns: string[];
    /** Statistical summary if applicable */
    summary?: string;
  };

  /** Enhanced cell data with metadata */
  enhancedCells?: Array<
    Array<{
      content: string;
      type: 'text' | 'number' | 'formula' | 'empty';
      latex?: string; // If cell contains formula
      confidence: number;
    }>
  >;
}

/**
 * Enhanced paper section with AI analysis
 */
export interface EnhancedPaperSection extends Omit<PaperSection, 'equations' | 'figures' | 'tables'> {
  /** Enhanced equations in this section */
  equations?: EnhancedEquation[];

  /** Enhanced figures in this section */
  figures?: EnhancedFigure[];

  /** Enhanced tables in this section */
  tables?: EnhancedTable[];

  /** AI-generated section summary */
  aiSummary?: string;

  /** Key concepts identified in this section */
  keyConcepts?: string[];

  /** Educational importance score */
  educationalValue?: number; // 0-1

  /** Recommended teaching approach */
  teachingNotes?: {
    approach: 'conceptual' | 'practical' | 'mathematical' | 'mixed';
    prerequisites: string[];
    learningObjectives: string[];
    suggestedExamples: string[];
  };
}

/**
 * Enhanced parsing statistics with AI metrics
 */
export interface EnhancedParsingStats extends ParsingStats {
  /** AI processing statistics */
  aiProcessing: {
    /** Total API calls made */
    apiCalls: number;
    /** Total AI processing time */
    aiProcessingTimeMs: number;
    /** Cost estimation */
    estimatedCost: number;
    /** AI models used */
    modelsUsed: string[];
    /** Overall AI confidence */
    overallAiConfidence: number; // 0-1
  };

  /** Quality metrics */
  quality: {
    /** Formula recognition accuracy estimate */
    formulaAccuracy: number; // 0-1
    /** Layout detection accuracy */
    layoutAccuracy: number; // 0-1
    /** Structure classification accuracy */
    structureAccuracy: number; // 0-1
  };

  /** Method used for processing */
  processingMethod: 'legacy' | 'mineru' | 'hybrid' | 'ai-only';
}

/**
 * Enhanced parsed paper with AI enrichment
 */
export interface EnhancedParsedPaper extends Omit<ParsedPaper, 'sections' | 'stats'> {
  /** Enhanced sections with AI analysis */
  sections: EnhancedPaperSection[];

  /** Enhanced statistics */
  stats: EnhancedParsingStats;

  /** Overall paper analysis */
  analysis?: {
    /** Academic field classification */
    field: string;
    /** Complexity assessment */
    complexity: 'undergraduate' | 'graduate' | 'research' | 'expert';
    /** Key mathematical concepts */
    mathConcepts: string[];
    /** Recommended character assignments for galgame */
    characterSuggestions: Array<{
      character: string;
      role: 'presenter' | 'questioner' | 'explainer' | 'challenger';
      sections: string[]; // Section types this character should handle
    }>;
    /** Educational pathway */
    learningPath: Array<{
      step: number;
      concept: string;
      prerequisites: string[];
      difficulty: number; // 1-10
    }>;
  };
}

/**
 * Enhanced parsing result with AI confidence
 */
export interface EnhancedParseResult extends Omit<ParseResult, 'data'> {
  /** Enhanced paper data */
  data?: EnhancedParsedPaper;

  /** AI processing summary */
  aiSummary?: {
    /** Processing method used */
    method: 'legacy' | 'ai-enhanced' | 'full-ai';
    /** Confidence in overall result */
    confidence: number;
    /** Recommendations for improvement */
    recommendations: string[];
    /** Cost breakdown */
    costs: {
      apiCalls: number;
      estimatedDollars: number;
      tokensUsed: number;
    };
  };
}

/**
 * Configuration for AI-enhanced parsing
 */
export interface EnhancedParserConfig extends ParserConfig {
  /** AI enhancement settings */
  aiEnhancement?: {
    /** Enable AI-powered formula recognition */
    enableFormulaAI: boolean;

    /** Enable layout analysis */
    enableLayoutAnalysis: boolean;

    /** Enable semantic understanding */
    enableSemanticAnalysis: boolean;

    /** Enable educational annotations */
    enableEducationalAnalysis: boolean;

    /** Maximum formulas to process with AI (cost control) */
    maxAIFormulas: number;

    /** Preferred AI models */
    preferredModels: {
      vision: string; // e.g., 'google/gemini-3-flash-preview'
      text: string; // e.g., 'google/gemini-3-flash-preview'
      fallback: string; // e.g., 'openai/gpt-4o'
    };

    /** Cost control */
    costControl: {
      maxCostPerPaper: number; // Maximum cost in dollars
      enableCaching: boolean; // Enable result caching
      fallbackToLegacy: boolean; // Fall back if cost exceeded
    };
  };

  /** MinerU service configuration */
  mineruConfig?: {
    /** MinerU service endpoint */
    serviceUrl: string;

    /** Enable MinerU for PDF processing */
    enabled: boolean;

    /** Timeout for MinerU calls */
    timeout: number;

    /** Fallback to legacy PDF parser if failed */
    fallbackToLegacy: boolean;
  };

  /** OpenRouter API configuration */
  openRouterConfig?: {
    /** API key */
    apiKey: string;

    /** Base URL */
    baseURL?: string;

    /** Request timeout */
    timeout?: number;

    /** Rate limiting */
    rateLimit?: {
      requestsPerMinute: number;
      burstLimit: number;
    };
  };
}

/**
 * Engine type for parsing
 */
export type ParsingEngine = 'auto' | 'legacy' | 'mineru' | 'ai-enhanced' | 'full-ai';

/**
 * Result from engine detection/selection
 */
export interface EngineSelection {
  /** Selected engine */
  engine: ParsingEngine;

  /** Reason for selection */
  reason: string;

  /** Confidence in selection */
  confidence: number;

  /** Fallback engines available */
  fallbacks: ParsingEngine[];
}

/**
 * Progress callback for long-running parsing
 */
export interface ParsingProgress {
  /** Current stage */
  stage: 'init' | 'pdf-extraction' | 'structure-analysis' | 'formula-processing' | 'ai-enhancement' | 'finalization';

  /** Progress percentage (0-100) */
  progress: number;

  /** Current operation description */
  description: string;

  /** Estimated remaining time in seconds */
  estimatedRemainingSeconds?: number;

  /** Items processed vs total */
  itemsProcessed?: {
    current: number;
    total: number;
    type: 'pages' | 'formulas' | 'figures' | 'sections';
  };
}

/**
 * Callback function type for progress updates
 */
export type ProgressCallback = (progress: ParsingProgress) => void;

/**
 * Cache entry for parsed results
 */
export interface CacheEntry {
  /** File hash */
  fileHash: string;

  /** Parsing configuration used */
  configHash: string;

  /** Cached result */
  result: EnhancedParseResult;

  /** Cache timestamp */
  timestamp: Date;

  /** Expiration time */
  expiresAt: Date;

  /** Cache metadata */
  metadata: {
    fileSize: number;
    processingTime: number;
    aiCost: number;
  };
}

/**
 * Validation result for parsed content
 */
export interface ValidationResult {
  /** Overall validation passed */
  valid: boolean;

  /** Validation score (0-1) */
  score: number;

  /** Issues found */
  issues: Array<{
    type: 'warning' | 'error' | 'critical';
    code: string;
    message: string;
    section?: string;
    position?: number;
    suggestion?: string;
  }>;

  /** Quality metrics */
  quality: {
    formulaQuality: number; // 0-1
    structureQuality: number; // 0-1
    contentCompleteness: number; // 0-1
    aiAccuracy: number; // 0-1
  };
}
