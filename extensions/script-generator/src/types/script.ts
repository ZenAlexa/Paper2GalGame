/**
 * Script Generation Types
 *
 * Defines types for WebGAL script generation and validation
 */

import type { DialogueLine, MultiLanguageContent } from './character';

/**
 * WebGAL script command types
 */
export type WebGALCommand =
  | 'say' // Dialogue
  | 'changeBg' // Change background
  | 'changeFigure' // Change character sprite
  | 'playBGM' // Play background music
  | 'playSE' // Play sound effect
  | 'wait' // Wait/pause
  | 'choose' // Choice menu
  | 'jump' // Jump to label
  | 'label' // Label marker
  | 'setVar' // Set variable
  | 'callScene'; // Call scene

/**
 * WebGAL script line
 */
export interface WebGALLine {
  /** Command type */
  command: WebGALCommand;

  /** Command parameters */
  params: string[];

  /** Additional options */
  options?: Record<string, string | number | boolean>;

  /** Raw script line */
  raw: string;

  /** Line metadata */
  metadata?: {
    /** Source dialogue line */
    source?: DialogueLine;

    /** Generation confidence */
    confidence?: number;

    /** Educational relevance */
    relevance?: number;

    /** Multi-language specific metadata */
    isMultiLanguage?: boolean;

    /** Translation quality scores */
    translationQuality?: {
      zh?: number;
      jp?: number;
      en?: number;
    };
  };
}

/**
 * WebGAL script scene
 */
export interface WebGALScene {
  /** Scene name/identifier */
  name: string;

  /** Scene title */
  title: string;

  /** Script lines in the scene */
  lines: WebGALLine[];

  /** Scene metadata */
  metadata: {
    /** Related paper section */
    paperSection?: string;

    /** Scene type */
    type: 'introduction' | 'content' | 'summary' | 'discussion';

    /** Educational objectives */
    objectives: string[];

    /** Estimated duration (seconds) */
    duration?: number;
  };
}

/**
 * Complete WebGAL script with multi-language support
 */
export interface WebGALScript {
  /** Script metadata */
  metadata: {
    /** Script title (multi-language) */
    title: MultiLanguageContent;

    /** Generated from paper (multi-language) */
    paperTitle: MultiLanguageContent;

    /** Generation timestamp */
    timestamp: Date;

    /** Generator version */
    version: string;

    /** Multi-language generation info */
    multiLanguage: {
      /** Generated languages */
      supportedLanguages: ('zh' | 'jp' | 'en')[];

      /** Primary generation language */
      primaryLanguage: 'zh' | 'jp' | 'en';

      /** Current display language */
      currentLanguage: 'zh' | 'jp' | 'en';
    };

    /** Characters used */
    characters: string[];

    /** Total estimated duration */
    totalDuration?: number;
  };

  /** Script scenes */
  scenes: WebGALScene[];

  /** Script validation results */
  validation?: {
    /** Is script valid */
    isValid: boolean;

    /** Validation errors */
    errors: string[];

    /** Validation warnings */
    warnings: string[];
  };
}

/**
 * Script generation options
 */
/**
 * Multi-language generation mode
 */
export interface MultiLanguageOptions {
  /** Generate all three languages simultaneously */
  generateAll: boolean;

  /** Primary language for generation logic */
  primaryLanguage: 'zh' | 'jp' | 'en';

  /** Translation quality threshold (0-1) */
  qualityThreshold: number;

  /** Enable translation verification */
  verifyTranslations: boolean;
}

export interface GenerationOptions {
  /** Multi-language configuration */
  multiLanguage: MultiLanguageOptions;

  /** Selected characters (subset of 4) */
  characters: string[];

  /** Generation style */
  style: {
    /** Educational vs entertainment balance (0-1) */
    educationalWeight: number;

    /** Dialogue complexity level */
    complexity: 'simple' | 'intermediate' | 'advanced';

    /** Include interactive elements */
    interactive: boolean;

    /** Target audience */
    audience: 'general' | 'academic' | 'student';
  };

  /** Content preferences */
  content: {
    /** Include paper methodology */
    includeMethodology: boolean;

    /** Include results discussion */
    includeResults: boolean;

    /** Include conclusions */
    includeConclusions: boolean;

    /** Maximum script length (lines) */
    maxLength?: number;
  };

  /** Voice generation */
  voice: {
    /** Generate voice references */
    generateVoice: boolean;

    /** Voice provider */
    provider: 'voicevox' | 'minimax';
  };
}

/**
 * Script validation configuration
 */
export interface ValidationConfig {
  /** Check WebGAL syntax */
  checkSyntax: boolean;

  /** Check character consistency */
  checkCharacters: boolean;

  /** Check educational content accuracy */
  checkEducational: boolean;

  /** Check script flow */
  checkFlow: boolean;

  /** Maximum allowed errors */
  maxErrors?: number;
}
