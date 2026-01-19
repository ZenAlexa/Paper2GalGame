/**
 * Paper Parser - Main Export
 *
 * Academic paper parsing library for Paper2GalGame.
 * Converts PDF, Word, and text documents into structured JSON format
 * suitable for visual novel generation.
 */

// Structure analysis
export { StructureAnalyzer } from './analyzer/structure-analyzer';

// Parser implementations
export {
  BaseParserImpl,
  createParserByContent,
  createParserByExtension,
  createParserByMimeType,
  defaultParserFactory,
  ParserFactoryImpl,
  PDFParserImpl,
  TxtParserImpl,
  WordParserImpl,
} from './parsers';
// Type definitions
export * from './types';
export type {
  DetectionContext,
  SectionDetectionResult,
} from './utils/section-detector';

// Section detection utilities
export {
  defaultSectionDetector,
  SectionDetector,
} from './utils/section-detector';
// Text processing utilities
export {
  cleanPDFText,
  cleanText,
  cleanWordText,
  comprehensiveTextClean,
  extractHeaders,
  fixOCRErrors,
  normalizeAcademicText,
  normalizeWhitespace,
  preserveCodeBlocks,
  removeFormattingArtifacts,
  restoreCodeBlocks,
  splitIntoParagraphs,
  splitIntoSentences,
} from './utils/text-cleaner';

import { StructureAnalyzer } from './analyzer/structure-analyzer';
// Import necessary classes
import { ParserFactoryImpl } from './parsers/parser-factory';

/**
 * Main API class for paper parsing
 */
export class PaperParser {
  private factory: ParserFactoryImpl;
  private analyzer: StructureAnalyzer;

  constructor() {
    this.factory = new ParserFactoryImpl();
    this.analyzer = new StructureAnalyzer();
  }

  /**
   * Parse a document buffer and return structured data
   */
  async parse(
    buffer: ArrayBuffer,
    options: {
      filename?: string;
      mimeType?: string;
      language?: 'auto' | 'en' | 'zh' | 'ja';
      extractFigures?: boolean;
      extractTables?: boolean;
      extractEquations?: boolean;
      extractCitations?: boolean;
    } = {}
  ) {
    // Auto-detect parser
    const parser = options.mimeType
      ? this.factory.createByMimeType(options.mimeType)
      : await this.factory.createByContent(buffer, options.filename);

    if (!parser) {
      throw new Error('Unsupported document type or corrupted file');
    }

    // Parse document
    const parseResult = await parser.parse(buffer, {
      language: options.language || 'auto',
      extractFigures: options.extractFigures ?? true,
      extractTables: options.extractTables ?? true,
      extractEquations: options.extractEquations ?? true,
      extractCitations: options.extractCitations ?? true,
    });

    if (!parseResult.success || !parseResult.data) {
      throw new Error(`Parsing failed: ${parseResult.errors?.map((e) => e.message).join(', ') || 'Unknown error'}`);
    }

    // Enrich with structure analysis
    const enrichedPaper = await this.analyzer.enrichParsedPaper(parseResult.data);

    return enrichedPaper;
  }

  /**
   * Get information about supported file types
   */
  getSupportedTypes(): {
    extensions: string[];
    mimeTypes: string[];
    parsers: Array<{
      id: string;
      name: string;
      version: string;
      extensions: string[];
      mimeTypes: string[];
    }>;
  } {
    return {
      extensions: this.factory.getSupportedExtensions(),
      mimeTypes: this.factory.getSupportedMimeTypes(),
      parsers: this.factory.getParserInfo(),
    };
  }

  /**
   * Check if a file type is supported
   */
  isSupported(extensionOrMimeType: string): boolean {
    return this.factory.isSupported(extensionOrMimeType);
  }

  /**
   * Parse only text content without structure analysis
   */
  async parseTextOnly(
    buffer: ArrayBuffer,
    options: {
      filename?: string;
      mimeType?: string;
    } = {}
  ): Promise<string> {
    const parser = options.mimeType
      ? this.factory.createByMimeType(options.mimeType)
      : await this.factory.createByContent(buffer, options.filename);

    if (!parser) {
      throw new Error('Unsupported document type');
    }

    const parseResult = await parser.parse(buffer, {
      extractFigures: false,
      extractTables: false,
      extractEquations: false,
      extractCitations: false,
    });

    if (!parseResult.success || !parseResult.data) {
      throw new Error('Text extraction failed');
    }

    return parseResult.data.rawText;
  }

  /**
   * Analyze structure of already extracted text
   */
  async analyzeStructure(
    text: string,
    _options: {
      language?: 'auto' | 'en' | 'zh' | 'ja';
      extractFigures?: boolean;
      extractTables?: boolean;
      extractEquations?: boolean;
      extractCitations?: boolean;
    } = {}
  ) {
    return await this.analyzer.analyze(text, undefined);
  }
}

/**
 * Default parser instance
 */
export const defaultPaperParser = new PaperParser();

/**
 * Convenience functions
 */

/**
 * Parse a paper from file buffer
 */
export async function parsePaper(buffer: ArrayBuffer, filename?: string) {
  const options = filename ? { filename } : {};
  return await defaultPaperParser.parse(buffer, options);
}

/**
 * Extract text from a document
 */
export async function extractText(buffer: ArrayBuffer, filename?: string): Promise<string> {
  const options = filename ? { filename } : {};
  return await defaultPaperParser.parseTextOnly(buffer, options);
}

/**
 * Check if file type is supported
 */
export function isSupported(extensionOrMimeType: string): boolean {
  return defaultPaperParser.isSupported(extensionOrMimeType);
}

/**
 * Get list of supported file types
 */
export function getSupportedTypes() {
  return defaultPaperParser.getSupportedTypes();
}

// Version information
export const VERSION = '1.0.0';
export const NAME = 'Paper Parser';
export const DESCRIPTION = 'Academic paper parsing library for Paper2GalGame';
