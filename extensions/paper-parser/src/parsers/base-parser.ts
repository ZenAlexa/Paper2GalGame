/**
 * Base Parser Implementation
 *
 * Abstract base class providing common functionality for all document parsers.
 */

import type { BaseParser, ParsedPaper, ParseResult, ParserConfig, ParsingError, ParsingStats } from '../types';

/**
 * Abstract base parser class with common functionality
 */
export abstract class BaseParserImpl implements BaseParser {
  protected readonly name: string;
  protected readonly version: string = '1.0.0';
  protected readonly supportedExtensions: string[];

  constructor(name: string, supportedExtensions: string[]) {
    this.name = name;
    this.supportedExtensions = supportedExtensions;
  }

  /**
   * Main parse method - must be implemented by subclasses
   */
  abstract parse(buffer: ArrayBuffer, config?: ParserConfig): Promise<ParseResult>;

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[] {
    return [...this.supportedExtensions];
  }

  /**
   * Get parser name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get parser version
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * Validate if buffer can be parsed - default implementation checks magic bytes
   */
  async canParse(buffer: ArrayBuffer): Promise<boolean> {
    return this.checkMagicBytes(buffer);
  }

  /**
   * Check magic bytes for file type validation
   * Default implementation - should be overridden by subclasses
   */
  protected checkMagicBytes(buffer: ArrayBuffer): boolean {
    return buffer.byteLength > 0;
  }

  /**
   * Create a successful parse result
   */
  protected createSuccessResult(data: ParsedPaper): ParseResult {
    return {
      success: true,
      data,
      errors: [],
    };
  }

  /**
   * Create a failure parse result
   */
  protected createErrorResult(errors: ParsingError[], partialData?: Partial<ParsedPaper>): ParseResult {
    const result: ParseResult = {
      success: false,
      errors,
    };
    if (partialData) {
      result.partialData = partialData;
    }
    return result;
  }

  /**
   * Create a parsing error object
   */
  protected createError(
    code: string,
    message: string,
    severity: 'warning' | 'error' | 'critical' = 'error',
    details?: string,
    position?: number
  ): ParsingError {
    const error: ParsingError = {
      code,
      message,
      severity,
    };
    if (details !== undefined) {
      error.details = details;
    }
    if (position !== undefined) {
      error.position = position;
    }
    return error;
  }

  /**
   * Initialize parsing statistics
   */
  protected initializeStats(): ParsingStats {
    return {
      pageCount: 0,
      wordCount: 0,
      charCount: 0,
      sectionCount: 0,
      figureCount: 0,
      tableCount: 0,
      equationCount: 0,
      citationCount: 0,
      processingTimeMs: 0,
      confidence: 0,
    };
  }

  /**
   * Calculate word count from text
   */
  protected calculateWordCount(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Calculate character count from text (excluding whitespace)
   */
  protected calculateCharCount(text: string): number {
    return text.replace(/\s/g, '').length;
  }

  /**
   * Extract text encoding from buffer (basic UTF-8/UTF-16 detection)
   */
  protected detectTextEncoding(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer.slice(0, 4));

    // Check for BOM
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return 'utf-8'; // UTF-8 BOM
    }

    if (bytes.length >= 2) {
      if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        return 'utf-16le'; // UTF-16 LE BOM
      }
      if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        return 'utf-16be'; // UTF-16 BE BOM
      }
    }

    // Default to UTF-8
    return 'utf-8';
  }

  /**
   * Decode buffer to string with specified encoding
   */
  protected decodeBuffer(buffer: ArrayBuffer, encoding: string = 'utf-8'): string {
    const decoder = new TextDecoder(encoding);
    return decoder.decode(buffer);
  }

  /**
   * Validate configuration object
   */
  protected validateConfig(config?: ParserConfig): ParserConfig {
    const defaultConfig: ParserConfig = {
      language: 'auto',
      extractFigures: true,
      extractTables: true,
      extractEquations: true,
      extractCitations: true,
      maxPages: 0,
      sectionConfidenceThreshold: 0.7,
      outputFormat: {
        includeRawText: true,
        includeStats: true,
        includeConfidence: false,
      },
    };

    return { ...defaultConfig, ...config };
  }

  /**
   * Clean and normalize text content
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n') // Handle old Mac line endings
      .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
      .replace(/[ \t]+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Extract filename from path
   */
  protected extractFilename(filepath: string): string {
    return filepath.split(/[/\\]/).pop() || 'unknown';
  }

  /**
   * Calculate file hash (simple implementation)
   */
  protected async calculateHash(buffer: ArrayBuffer): Promise<string> {
    const crypto = globalThis.crypto || (await import('node:crypto')).webcrypto;
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create base parsed paper structure
   */
  protected createBaseParsedPaper(
    rawText: string,
    sourceFile: { name: string; size: number; type: string; hash?: string }
  ): Partial<ParsedPaper> {
    const stats = this.initializeStats();
    stats.charCount = this.calculateCharCount(rawText);
    stats.wordCount = this.calculateWordCount(rawText);

    return {
      metadata: {
        title: '',
        authors: [],
        keywords: [],
      },
      sections: [],
      references: [],
      rawText,
      stats,
      timestamp: new Date(),
      parserVersion: this.version,
      sourceFile,
    };
  }
}
