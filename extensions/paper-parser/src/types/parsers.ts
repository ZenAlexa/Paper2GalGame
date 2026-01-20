/**
 * Parser Interface Type Definitions
 *
 * Defines the contract and interfaces for different document parsers
 */

import type { ParseResult, ParserConfig } from './paper';

/**
 * Base interface that all document parsers must implement
 */
export interface BaseParser {
  /**
   * Parse a document from buffer data
   * @param buffer - Document content as ArrayBuffer
   * @param config - Optional parsing configuration
   * @returns Promise resolving to parse result
   */
  parse(buffer: ArrayBuffer, config?: ParserConfig): Promise<ParseResult>;

  /**
   * Get supported file extensions for this parser
   * @returns Array of supported file extensions (without dot)
   */
  getSupportedExtensions(): string[];

  /**
   * Get parser name/identifier
   * @returns Parser name
   */
  getName(): string;

  /**
   * Validate if the buffer contains a supported document type
   * @param buffer - Document content as ArrayBuffer
   * @returns True if this parser can handle the document
   */
  canParse(buffer: ArrayBuffer): Promise<boolean>;

  /**
   * Get parser version information
   * @returns Version string
   */
  getVersion(): string;
}

/**
 * PDF-specific parser interface
 */
export interface PDFParser extends BaseParser {
  /**
   * Extract text from specific page range
   * @param buffer - PDF content as ArrayBuffer
   * @param startPage - Starting page (1-indexed)
   * @param endPage - Ending page (inclusive)
   * @returns Promise resolving to extracted text
   */
  extractPageRange(buffer: ArrayBuffer, startPage: number, endPage: number): Promise<string>;

  /**
   * Get PDF metadata (title, author, etc.)
   * @param buffer - PDF content as ArrayBuffer
   * @returns Promise resolving to PDF metadata
   */
  getMetadata(buffer: ArrayBuffer): Promise<{
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
    pageCount: number;
  }>;

  /**
   * Extract images from PDF
   * @param buffer - PDF content as ArrayBuffer
   * @returns Promise resolving to array of image data
   */
  extractImages(buffer: ArrayBuffer): Promise<
    Array<{
      pageNumber: number;
      imageData: string; // base64
      width: number;
      height: number;
    }>
  >;
}

/**
 * Word document parser interface
 */
export interface WordParser extends BaseParser {
  /**
   * Extract styles and formatting information
   * @param buffer - Word document content as ArrayBuffer
   * @returns Promise resolving to style information
   */
  extractStyles(buffer: ArrayBuffer): Promise<{
    headings: Array<{
      level: number;
      text: string;
      style: string;
    }>;
    paragraphStyles: string[];
  }>;

  /**
   * Extract embedded images
   * @param buffer - Word document content as ArrayBuffer
   * @returns Promise resolving to array of image data
   */
  extractImages(buffer: ArrayBuffer): Promise<
    Array<{
      id: string;
      imageData: string; // base64
      contentType: string;
    }>
  >;

  /**
   * Extract table data
   * @param buffer - Word document content as ArrayBuffer
   * @returns Promise resolving to table data
   */
  extractTables(buffer: ArrayBuffer): Promise<
    Array<{
      headers: string[];
      rows: string[][];
    }>
  >;
}

/**
 * Plain text parser interface
 */
export interface TxtParser extends BaseParser {
  /**
   * Detect text encoding
   * @param buffer - Text file content as ArrayBuffer
   * @returns Promise resolving to detected encoding
   */
  detectEncoding(buffer: ArrayBuffer): Promise<string>;

  /**
   * Parse text with specific encoding
   * @param buffer - Text file content as ArrayBuffer
   * @param encoding - Text encoding to use
   * @param config - Optional parsing configuration
   * @returns Promise resolving to parse result
   */
  parseWithEncoding(buffer: ArrayBuffer, encoding: string, config?: ParserConfig): Promise<ParseResult>;
}

/**
 * Parser factory interface for creating parser instances
 */
export interface ParserFactory {
  /**
   * Create parser instance based on file extension
   * @param extension - File extension (without dot)
   * @param options - Optional parser options
   * @returns Parser instance or null if not supported
   */
  createByExtension(extension: string, options?: ParserOptions): BaseParser | null;

  /**
   * Create parser instance based on MIME type
   * @param mimeType - MIME type of the document
   * @param options - Optional parser options
   * @returns Parser instance or null if not supported
   */
  createByMimeType(mimeType: string, options?: ParserOptions): BaseParser | null;

  /**
   * Auto-detect document type and create appropriate parser
   * @param buffer - Document content as ArrayBuffer
   * @param filename - Optional filename for extension detection
   * @param options - Optional parser options
   * @returns Promise resolving to parser instance or null
   */
  createByContent(buffer: ArrayBuffer, filename?: string, options?: ParserOptions): Promise<BaseParser | null>;

  /**
   * Get all supported file extensions
   * @returns Array of supported extensions
   */
  getSupportedExtensions(): string[];

  /**
   * Get all supported MIME types
   * @returns Array of supported MIME types
   */
  getSupportedMimeTypes(): string[];

  /**
   * Register a custom parser
   * @param parser - Parser instance to register
   * @param extensions - File extensions this parser handles
   * @param mimeTypes - MIME types this parser handles
   */
  registerParser(parser: BaseParser, extensions: string[], mimeTypes: string[]): void;
}

/**
 * Configuration options for parser instances
 */
export interface ParserOptions {
  /** Maximum memory usage in MB */
  maxMemoryMB?: number;
  /** Operation timeout in milliseconds */
  timeoutMs?: number;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Custom configuration per parser type */
  pdfOptions?: {
    /** Enable text layer extraction */
    enableTextLayer?: boolean;
    /** Enable image extraction */
    enableImages?: boolean;
    /** Maximum pages to process */
    maxPages?: number;
  };
  wordOptions?: {
    /** Enable style preservation */
    preserveStyles?: boolean;
    /** Include track changes */
    includeTrackChanges?: boolean;
  };
  txtOptions?: {
    /** Default encoding if detection fails */
    defaultEncoding?: string;
    /** Enable smart paragraph detection */
    smartParagraphs?: boolean;
  };
}

/**
 * Progress callback for long-running parsing operations
 */
export type ProgressCallback = (progress: {
  /** Current step description */
  step: string;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Current page being processed */
  currentPage?: number;
  /** Total pages */
  totalPages?: number;
}) => void;

/**
 * Extended parser options with progress callback
 */
export interface ExtendedParserOptions extends ParserOptions {
  /** Progress callback for long operations */
  onProgress?: ProgressCallback;
  /** Cancel token for aborting operations */
  cancelToken?: AbortSignal;
}
