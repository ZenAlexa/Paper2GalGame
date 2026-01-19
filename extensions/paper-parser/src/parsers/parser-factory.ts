/**
 * Parser Factory Implementation
 *
 * Factory class for creating appropriate parser instances based on file type.
 */

import type { BaseParser, ExtendedParserOptions, ParserFactory, ParserOptions } from '../types';
import { PDFParserImpl } from './pdf-parser';
import { TxtParserImpl } from './txt-parser';
import { WordParserImpl } from './word-parser';

/**
 * Factory for creating parser instances
 */
export class ParserFactoryImpl implements ParserFactory {
  private readonly parsers: Map<string, BaseParser> = new Map();
  private readonly extensionMap: Map<string, string> = new Map();
  private readonly mimeTypeMap: Map<string, string> = new Map();

  constructor() {
    this.registerDefaultParsers();
  }

  /**
   * Register default parser implementations
   */
  private registerDefaultParsers(): void {
    // PDF Parser
    const pdfParser = new PDFParserImpl();
    this.registerParser(pdfParser, ['pdf'], ['application/pdf']);

    // Word Parser
    const wordParser = new WordParserImpl();
    this.registerParser(
      wordParser,
      ['docx', 'doc'],
      [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.ms-word',
      ]
    );

    // Text Parser
    const txtParser = new TxtParserImpl();
    this.registerParser(txtParser, ['txt', 'text', 'md', 'markdown'], ['text/plain', 'text/markdown']);
  }

  /**
   * Create parser instance based on file extension
   */
  createByExtension(extension: string, options?: ParserOptions): BaseParser | null {
    const normalizedExt = extension.toLowerCase().replace(/^\./, '');
    const parserId = this.extensionMap.get(normalizedExt);

    if (!parserId) {
      return null;
    }

    return this.createParserInstance(parserId, options);
  }

  /**
   * Create parser instance based on MIME type
   */
  createByMimeType(mimeType: string, options?: ParserOptions): BaseParser | null {
    const normalizedMime = mimeType.toLowerCase().split(';')[0]; // Remove charset info
    const parserId = this.mimeTypeMap.get(normalizedMime);

    if (!parserId) {
      return null;
    }

    return this.createParserInstance(parserId, options);
  }

  /**
   * Auto-detect document type and create appropriate parser
   */
  async createByContent(buffer: ArrayBuffer, filename?: string, options?: ParserOptions): Promise<BaseParser | null> {
    // First try by filename extension if provided
    if (filename) {
      const extension = this.extractExtension(filename);
      if (extension) {
        const parser = this.createByExtension(extension, options);
        if (parser && (await parser.canParse(buffer))) {
          return parser;
        }
      }
    }

    // Try all registered parsers to see which one can handle the content
    for (const [parserId, parser] of this.parsers) {
      try {
        if (await parser.canParse(buffer)) {
          return this.createParserInstance(parserId, options);
        }
      } catch (error) {
        // Continue to next parser if this one fails
        console.warn(`Parser ${parserId} failed content detection:`, error);
      }
    }

    // If no specific parser can handle it, try text parser as fallback
    const txtParser = this.parsers.get('txt');
    if (txtParser && (await txtParser.canParse(buffer))) {
      return this.createParserInstance('txt', options);
    }

    return null;
  }

  /**
   * Get all supported file extensions
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys()).sort();
  }

  /**
   * Get all supported MIME types
   */
  getSupportedMimeTypes(): string[] {
    return Array.from(this.mimeTypeMap.keys()).sort();
  }

  /**
   * Register a custom parser
   */
  registerParser(parser: BaseParser, extensions: string[], mimeTypes: string[]): void {
    const parserId = parser.getName().toLowerCase();

    // Store parser instance
    this.parsers.set(parserId, parser);

    // Map extensions to parser
    for (const ext of extensions) {
      const normalizedExt = ext.toLowerCase().replace(/^\./, '');
      this.extensionMap.set(normalizedExt, parserId);
    }

    // Map MIME types to parser
    for (const mimeType of mimeTypes) {
      const normalizedMime = mimeType.toLowerCase();
      this.mimeTypeMap.set(normalizedMime, parserId);
    }
  }

  /**
   * Get parser instance by ID
   */
  getParser(parserId: string): BaseParser | null {
    return this.parsers.get(parserId.toLowerCase()) || null;
  }

  /**
   * Check if a file type is supported
   */
  isSupported(extensionOrMimeType: string): boolean {
    const normalized = extensionOrMimeType.toLowerCase().replace(/^\./, '');
    return this.extensionMap.has(normalized) || this.mimeTypeMap.has(normalized);
  }

  /**
   * Get parser info for debugging
   */
  getParserInfo(): Array<{
    id: string;
    name: string;
    version: string;
    extensions: string[];
    mimeTypes: string[];
  }> {
    return Array.from(this.parsers.entries()).map(([id, parser]) => {
      const extensions = Array.from(this.extensionMap.entries())
        .filter(([, parserId]) => parserId === id)
        .map(([ext]) => ext);

      const mimeTypes = Array.from(this.mimeTypeMap.entries())
        .filter(([, parserId]) => parserId === id)
        .map(([mime]) => mime);

      return {
        id,
        name: parser.getName(),
        version: parser.getVersion(),
        extensions,
        mimeTypes,
      };
    });
  }

  /**
   * Create a new parser instance with options
   */
  private createParserInstance(parserId: string, _options?: ParserOptions): BaseParser | null {
    const baseParser = this.parsers.get(parserId);
    if (!baseParser) {
      return null;
    }

    // For now, return the existing parser instance
    // In a production implementation, you might want to create new instances
    // with specific options applied
    return baseParser;
  }

  /**
   * Extract file extension from filename
   */
  private extractExtension(filename: string): string | null {
    const match = filename.match(/\.([^.]+)$/);
    return match ? match[1] : null;
  }

  /**
   * Detect MIME type from buffer content (basic implementation)
   */
  async detectMimeType(buffer: ArrayBuffer): Promise<string | null> {
    const bytes = new Uint8Array(buffer.slice(0, 8));

    // PDF signature
    if (
      bytes.length >= 5 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d
    ) {
      return 'application/pdf';
    }

    // ZIP signature (DOCX files are ZIP archives)
    if (
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
      (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08)
    ) {
      // Could be DOCX, but we need more sophisticated detection
      // For now, we'll check for DOCX-specific content later
      try {
        // Try to decode as text to see if it's a plain ZIP vs DOCX
        const decoder = new TextDecoder('utf-8', { fatal: true });
        decoder.decode(buffer.slice(0, 512));
        return 'text/plain'; // If it decodes as text, probably not a DOCX
      } catch {
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
    }

    // DOC signature
    if (
      bytes.length >= 8 &&
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0 &&
      bytes[4] === 0xa1 &&
      bytes[5] === 0xb1 &&
      bytes[6] === 0x1a &&
      bytes[7] === 0xe1
    ) {
      return 'application/msword';
    }

    // Check if it's text
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      decoder.decode(buffer.slice(0, 1024));
      return 'text/plain';
    } catch {
      // Not valid UTF-8 text
    }

    return null; // Unknown type
  }

  /**
   * Create parser with progress callback support
   */
  createWithProgress(extensionOrMimeType: string, _options?: ExtendedParserOptions): BaseParser | null {
    // Try by extension first
    let parser = this.createByExtension(extensionOrMimeType, _options);

    // Try by MIME type if extension didn't work
    if (!parser) {
      parser = this.createByMimeType(extensionOrMimeType, _options);
    }

    // TODO: Wrap parser with progress callback support if needed
    // For now, return the basic parser
    return parser;
  }
}

/**
 * Default factory instance
 */
export const defaultParserFactory = new ParserFactoryImpl();

/**
 * Convenience function to create parser by file extension
 */
export function createParserByExtension(extension: string, options?: ParserOptions): BaseParser | null {
  return defaultParserFactory.createByExtension(extension, options);
}

/**
 * Convenience function to create parser by MIME type
 */
export function createParserByMimeType(mimeType: string, options?: ParserOptions): BaseParser | null {
  return defaultParserFactory.createByMimeType(mimeType, options);
}

/**
 * Convenience function to auto-detect parser by content
 */
export async function createParserByContent(
  buffer: ArrayBuffer,
  filename?: string,
  options?: ParserOptions
): Promise<BaseParser | null> {
  return await defaultParserFactory.createByContent(buffer, filename, options);
}
