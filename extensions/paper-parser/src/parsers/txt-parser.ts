/**
 * Plain Text Parser Implementation
 *
 * Handles plain text files with intelligent structure detection.
 */

import type {
  TxtParser,
  ParseResult,
  ParserConfig,
  ParsedPaper,
  PaperMetadata,
  ParsingStats
} from '../types';
import { BaseParserImpl } from './base-parser';

/**
 * Plain text parser implementation
 */
export class TxtParserImpl extends BaseParserImpl implements TxtParser {
  constructor() {
    super('TxtParser', ['txt', 'text']);
  }

  /**
   * Check if buffer contains plain text (always true for TXT parser)
   */
  protected checkMagicBytes(buffer: ArrayBuffer): boolean {
    // For text files, we'll check if it's valid UTF-8/ASCII
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      decoder.decode(buffer.slice(0, Math.min(1024, buffer.byteLength)));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Main parse method for plain text documents
   */
  async parse(buffer: ArrayBuffer, config?: ParserConfig): Promise<ParseResult> {
    this.validateConfig(config);
    const startTime = Date.now();

    try {
      // Detect encoding
      const encoding = await this.detectEncoding(buffer);

      // Decode text with detected encoding
      const rawText = this.decodeBuffer(buffer, encoding);

      // Clean and normalize the text
      const cleanedText = this.cleanText(rawText);

      // Extract metadata from text structure
      const metadata = this.extractTextMetadata(cleanedText);

      // Calculate processing time
      const processingTimeMs = Date.now() - startTime;

      // Create parsing statistics
      const stats: ParsingStats = {
        ...this.initializeStats(),
        pageCount: this.estimatePageCount(cleanedText),
        wordCount: this.calculateWordCount(cleanedText),
        charCount: this.calculateCharCount(cleanedText),
        processingTimeMs,
        confidence: 0.8, // Good confidence for text parsing
        detectedLanguage: this.detectLanguage(cleanedText)
      };

      // Create source file info
      const sourceFile = {
        name: 'document.txt',
        size: buffer.byteLength,
        type: 'text/plain',
        hash: await this.calculateHash(buffer)
      };

      // Create parsed paper structure
      const parsedPaper: ParsedPaper = {
        metadata,
        sections: [], // Will be populated by structure analyzer
        references: [], // Will be populated by citation extractor
        rawText: cleanedText,
        stats,
        timestamp: new Date(),
        parserVersion: this.getVersion(),
        sourceFile
      };

      return this.createSuccessResult(parsedPaper);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown text parsing error';

      return this.createErrorResult([
        this.createError(
          'TXT_PARSE_FAILED',
          `Failed to parse text document: ${errorMsg}`,
          'error',
          error instanceof Error ? error.stack : undefined
        )
      ]);
    }
  }

  /**
   * Detect text encoding
   */
  async detectEncoding(buffer: ArrayBuffer): Promise<string> {
    // Check for BOM first
    const bomEncoding = this.detectTextEncoding(buffer);
    if (bomEncoding !== 'utf-8' || this.hasBOM(buffer)) {
      return bomEncoding;
    }

    // For files without BOM, try to detect encoding
    const bytes = new Uint8Array(buffer);

    // Check for common non-ASCII patterns
    let nonAsciiCount = 0;
    let validUtf8Sequences = 0;

    for (let i = 0; i < Math.min(bytes.length, 2048); i++) {
      if (bytes[i] > 127) {
        nonAsciiCount++;

        // Check if it's a valid UTF-8 sequence
        if (this.isValidUtf8Sequence(bytes, i)) {
          validUtf8Sequences++;
        }
      }
    }

    // If we have non-ASCII characters and they're mostly valid UTF-8, assume UTF-8
    if (nonAsciiCount > 0 && validUtf8Sequences / nonAsciiCount > 0.8) {
      return 'utf-8';
    }

    // Try different encodings and see which one produces the most readable text
    const testEncodings = ['utf-8', 'utf-16le', 'utf-16be', 'iso-8859-1', 'windows-1252'];

    for (const encoding of testEncodings) {
      try {
        const decoder = new TextDecoder(encoding, { fatal: true });
        const text = decoder.decode(buffer.slice(0, Math.min(1024, buffer.byteLength)));

        // Check if the text looks reasonable (contains mostly printable characters)
        if (this.isReadableText(text)) {
          return encoding;
        }
      } catch {
        // Try next encoding
      }
    }

    // Default to UTF-8
    return 'utf-8';
  }

  /**
   * Parse text with specific encoding
   */
  async parseWithEncoding(buffer: ArrayBuffer, encoding: string, config?: ParserConfig): Promise<ParseResult> {
    try {
      const text = this.decodeBuffer(buffer, encoding);

      // Create a new buffer with the encoded text for normal parsing
      const encoder = new TextEncoder();
      const encodedBuffer = encoder.encode(text).buffer;

      return await this.parse(encodedBuffer, config);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown encoding error';

      return this.createErrorResult([
        this.createError(
          'ENCODING_ERROR',
          `Failed to parse text with encoding ${encoding}: ${errorMsg}`,
          'error'
        )
      ]);
    }
  }

  /**
   * Check if buffer has BOM (Byte Order Mark)
   */
  private hasBOM(buffer: ArrayBuffer): boolean {
    const bytes = new Uint8Array(buffer.slice(0, 4));

    // UTF-8 BOM
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return true;
    }

    // UTF-16 BOM
    if (bytes.length >= 2) {
      if ((bytes[0] === 0xFF && bytes[1] === 0xFE) || (bytes[0] === 0xFE && bytes[1] === 0xFF)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a byte sequence represents valid UTF-8
   */
  private isValidUtf8Sequence(bytes: Uint8Array, startIndex: number): boolean {
    const byte = bytes[startIndex];

    // Single byte (0xxxxxxx)
    if (byte <= 0x7F) {
      return true;
    }

    // Multi-byte sequence
    let expectedBytes = 0;

    if ((byte & 0xE0) === 0xC0) {
      expectedBytes = 1; // 110xxxxx 10xxxxxx
    } else if ((byte & 0xF0) === 0xE0) {
      expectedBytes = 2; // 1110xxxx 10xxxxxx 10xxxxxx
    } else if ((byte & 0xF8) === 0xF0) {
      expectedBytes = 3; // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
    } else {
      return false; // Invalid start byte
    }

    // Check continuation bytes
    for (let i = 1; i <= expectedBytes; i++) {
      if (startIndex + i >= bytes.length) {
        return false; // Not enough bytes
      }

      if ((bytes[startIndex + i] & 0xC0) !== 0x80) {
        return false; // Invalid continuation byte
      }
    }

    return true;
  }

  /**
   * Check if text appears to be readable (contains mostly printable characters)
   */
  private isReadableText(text: string): boolean {
    let printableCount = 0;
    let totalCount = 0;

    for (let i = 0; i < Math.min(text.length, 500); i++) {
      const charCode = text.charCodeAt(i);
      totalCount++;

      // Consider printable: space, tab, newline, and characters 32-126, 160+
      if (charCode === 32 || charCode === 9 || charCode === 10 || charCode === 13 ||
          (charCode >= 32 && charCode <= 126) || charCode >= 160) {
        printableCount++;
      }
    }

    return totalCount > 0 && printableCount / totalCount > 0.8;
  }

  /**
   * Extract metadata from text structure
   */
  private extractTextMetadata(text: string): PaperMetadata {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const metadata: PaperMetadata = {
      title: '',
      authors: [],
      keywords: []
    };

    if (lines.length === 0) {
      return metadata;
    }

    // Try to find title (usually first substantial line)
    for (const line of lines.slice(0, 5)) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && trimmed.length < 200 && !trimmed.match(/^\d+/)) {
        metadata.title = trimmed;
        break;
      }
    }

    // Look for author patterns
    const authorPatterns = [
      /^(?:By|Author[s]?|Written by):?\s*(.+)$/i,
      /^(.+)\s*\(.*\)\s*$/,  // Name (affiliation)
      /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+\s+[A-Z][a-z]+)*)$/  // Name patterns
    ];

    for (const line of lines.slice(0, 10)) {
      for (const pattern of authorPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const authors = match[1].split(/[,;]/).map(author => author.trim());
          metadata.authors.push(...authors);
          break;
        }
      }
      if (metadata.authors.length > 0) break;
    }

    // Look for keywords
    const keywordPatterns = [
      /^(?:Keywords?|Key\s*words?):?\s*(.+)$/i,
      /^(?:Tags?):?\s*(.+)$/i
    ];

    for (const line of lines) {
      for (const pattern of keywordPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const keywords = match[1].split(/[,;]/).map(keyword => keyword.trim());
          metadata.keywords.push(...keywords);
          break;
        }
      }
      if (metadata.keywords.length > 0) break;
    }

    return metadata;
  }

  /**
   * Estimate page count based on line count and average line length
   */
  private estimatePageCount(text: string): number {
    const lines = text.split('\n');
    const avgWordsPerLine = this.calculateWordCount(text) / lines.length;

    // Estimate based on typical page layout (40 lines, 12 words per line)
    const estimatedPages = (lines.length * avgWordsPerLine) / (40 * 12);

    return Math.max(1, Math.ceil(estimatedPages));
  }

  /**
   * Detect language from text content
   */
  private detectLanguage(text: string): string {
    const sample = text.substring(0, 1000); // Use first 1000 characters

    // Count character types
    const charCounts = {
      chinese: (sample.match(/[\u4e00-\u9fff]/g) || []).length,
      japanese: (sample.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length,
      korean: (sample.match(/[\uac00-\ud7af]/g) || []).length,
      cyrillic: (sample.match(/[\u0400-\u04ff]/g) || []).length,
      arabic: (sample.match(/[\u0600-\u06ff]/g) || []).length,
      english: (sample.match(/[a-zA-Z]/g) || []).length
    };

    // Find the most frequent character type
    const maxCount = Math.max(...Object.values(charCounts));

    if (charCounts.chinese === maxCount && maxCount > 10) return 'zh';
    if (charCounts.japanese === maxCount && maxCount > 10) return 'ja';
    if (charCounts.korean === maxCount && maxCount > 10) return 'ko';
    if (charCounts.cyrillic === maxCount && maxCount > 10) return 'ru';
    if (charCounts.arabic === maxCount && maxCount > 10) return 'ar';

    return 'en'; // Default to English
  }
}