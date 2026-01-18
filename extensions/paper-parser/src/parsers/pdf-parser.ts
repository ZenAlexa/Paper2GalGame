/**
 * PDF Parser Implementation
 *
 * Uses pdf.js to extract text, structure, and metadata from PDF documents.
 */

// Use legacy build for Node.js compatibility
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import type {
  PDFParser,
  ParseResult,
  ParserConfig,
  ParsedPaper,
  PaperMetadata,
  ParsingStats
} from '../types';
import { BaseParserImpl } from './base-parser';

/**
 * PDF parser implementation using pdf.js legacy build
 * Uses legacy build for better Node.js compatibility without worker
 */
export class PDFParserImpl extends BaseParserImpl implements PDFParser {
  constructor() {
    super('PDFParser', ['pdf']);
    // Disable worker for Node.js - use main thread instead
    (pdfjs as any).GlobalWorkerOptions.workerSrc = '';
  }

  /**
   * Check if buffer contains a PDF file
   */
  protected checkMagicBytes(buffer: ArrayBuffer): boolean {
    const bytes = new Uint8Array(buffer.slice(0, 5));
    // PDF files start with "%PDF-"
    return bytes.length >= 5 &&
           bytes[0] === 0x25 && // %
           bytes[1] === 0x50 && // P
           bytes[2] === 0x44 && // D
           bytes[3] === 0x46 && // F
           bytes[4] === 0x2D;   // -
  }

  /**
   * Main parse method for PDF documents
   */
  async parse(buffer: ArrayBuffer, config?: ParserConfig): Promise<ParseResult> {
    const validatedConfig = this.validateConfig(config);
    const startTime = Date.now();

    try {
      // Load PDF document
      const loadingTask = pdfjs.getDocument({
        data: buffer,
        useSystemFonts: true,
        verbosity: 0 // Reduce verbosity
      });

      const pdfDoc = await loadingTask.promise;

      // Get metadata
      const metadata = await this.extractMetadata(pdfDoc);

      // Extract text from all pages
      const pageTexts: string[] = [];
      const maxPages = validatedConfig.maxPages || pdfDoc.numPages;
      const pagesToProcess = Math.min(pdfDoc.numPages, maxPages);

      for (let i = 1; i <= pagesToProcess; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();

        // Combine text items with proper spacing
        const pageText = textContent.items
          .filter((item: any): item is any => 'str' in item)
          .map((item: any) => item.str)
          .join(' ');

        pageTexts.push(this.cleanText(pageText));
      }

      const fullText = pageTexts.join('\n\n');

      // Extract images if requested
      const images: Array<{
        pageNumber: number;
        imageData: string;
        width: number;
        height: number;
      }> = [];

      if (validatedConfig.extractFigures) {
        for (let i = 1; i <= Math.min(5, pagesToProcess); i++) { // Limit to first 5 pages for demo
          const pageImages = await this.extractPageImages(pdfDoc, i);
          images.push(...pageImages);
        }
      }

      // Calculate processing time
      const processingTimeMs = Date.now() - startTime;

      // Create parsing statistics
      const stats: ParsingStats = {
        ...this.initializeStats(),
        pageCount: pagesToProcess,
        wordCount: this.calculateWordCount(fullText),
        charCount: this.calculateCharCount(fullText),
        processingTimeMs,
        confidence: 0.95, // High confidence for PDF parsing
        detectedLanguage: this.detectLanguage(fullText)
      };

      // Create source file info
      const sourceFile = {
        name: 'document.pdf',
        size: buffer.byteLength,
        type: 'application/pdf',
        hash: await this.calculateHash(buffer)
      };

      // Create parsed paper structure
      const parsedPaper: ParsedPaper = {
        metadata,
        sections: [], // Will be populated by structure analyzer
        references: [], // Will be populated by citation extractor
        rawText: fullText,
        stats,
        timestamp: new Date(),
        parserVersion: this.getVersion(),
        sourceFile
      };

      return this.createSuccessResult(parsedPaper);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown PDF parsing error';

      return this.createErrorResult([
        this.createError(
          'PDF_PARSE_FAILED',
          `Failed to parse PDF document: ${errorMsg}`,
          'error',
          error instanceof Error ? error.stack : undefined
        )
      ]);
    }
  }

  /**
   * Extract text from specific page range
   */
  async extractPageRange(buffer: ArrayBuffer, startPage: number, endPage: number): Promise<string> {
    try {
      const loadingTask = pdfjs.getDocument({ data: buffer });
      const pdfDoc = await loadingTask.promise;

      const pageTexts: string[] = [];
      const actualStartPage = Math.max(1, startPage);
      const actualEndPage = Math.min(pdfDoc.numPages, endPage);

      for (let i = actualStartPage; i <= actualEndPage; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .filter((item: any): item is any => 'str' in item)
          .map((item: any) => item.str)
          .join(' ');

        pageTexts.push(this.cleanText(pageText));
      }

      return pageTexts.join('\n\n');

    } catch (error) {
      throw new Error(`Failed to extract page range ${startPage}-${endPage}: ${error}`);
    }
  }

  /**
   * Get PDF metadata
   */
  async getMetadata(buffer: ArrayBuffer): Promise<{
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
    pageCount: number;
  }> {
    try {
      const loadingTask = pdfjs.getDocument({ data: buffer });
      const pdfDoc = await loadingTask.promise;

      const metadata = await this.extractMetadata(pdfDoc);

      const result: any = {
        pageCount: pdfDoc.numPages
      };

      if (metadata.title) result.title = metadata.title;
      if (metadata.authors.length > 0) result.author = metadata.authors.join(', ');
      if (metadata.date) result.creationDate = new Date(metadata.date);

      return result;

    } catch (error) {
      throw new Error(`Failed to extract PDF metadata: ${error}`);
    }
  }

  /**
   * Extract images from PDF
   */
  async extractImages(buffer: ArrayBuffer): Promise<Array<{
    pageNumber: number;
    imageData: string;
    width: number;
    height: number;
  }>> {
    try {
      const loadingTask = pdfjs.getDocument({ data: buffer });
      const pdfDoc = await loadingTask.promise;

      const allImages: Array<{
        pageNumber: number;
        imageData: string;
        width: number;
        height: number;
      }> = [];

      // Extract images from all pages
      for (let i = 1; i <= Math.min(pdfDoc.numPages, 10); i++) { // Limit to 10 pages
        const pageImages = await this.extractPageImages(pdfDoc, i);
        allImages.push(...pageImages);
      }

      return allImages;

    } catch (error) {
      throw new Error(`Failed to extract PDF images: ${error}`);
    }
  }

  /**
   * Extract metadata from PDF document object
   */
  private async extractMetadata(pdfDoc: any): Promise<PaperMetadata> {
    try {
      const metadata = await pdfDoc.getMetadata();
      const info = metadata.info;

      const paperMetadata: PaperMetadata = {
        title: info.Title || '',
        authors: info.Author ? [info.Author] : [],
        keywords: info.Keywords ? info.Keywords.split(/[,;]/).map((k: string) => k.trim()) : [],
      };

      if (info.CreationDate) {
        const parsedDate = this.parsePDFDate(info.CreationDate);
        if (parsedDate) {
          paperMetadata.date = parsedDate;
        }
      }

      return paperMetadata;

    } catch (error) {
      // Return minimal metadata if extraction fails
      return {
        title: '',
        authors: [],
        keywords: []
      };
    }
  }

  /**
   * Extract images from a specific page
   */
  private async extractPageImages(_pdfDoc: any, pageNumber: number): Promise<Array<{
    pageNumber: number;
    imageData: string;
    width: number;
    height: number;
  }>> {
    const images: Array<{
      pageNumber: number;
      imageData: string;
      width: number;
      height: number;
    }> = [];

    try {
      // const page = await pdfDoc.getPage(pageNumber);
      // const operatorList = await page.getOperatorList();

      // This is a simplified image extraction - full implementation would be more complex
      // For now, we'll return empty array as image extraction from PDF.js is quite involved
      // The page and operatorList would be used for image extraction but requires complex processing

    } catch (error) {
      console.warn(`Failed to extract images from page ${pageNumber}:`, error);
    }

    return images;
  }

  /**
   * Parse PDF date string to JavaScript Date
   */
  private parsePDFDate(pdfDateString: string): string | undefined {
    try {
      // PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
      // Extract just the date part for simplicity
      const match = pdfDateString.match(/D:(\d{4})(\d{2})(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        return `${year}-${month}-${day}`;
      }
    } catch (error) {
      // Return undefined if parsing fails
    }
    return undefined;
  }

  /**
   * Detect language from text content (basic implementation)
   */
  private detectLanguage(text: string): string {
    const sample = text.substring(0, 1000); // Use first 1000 characters

    // Simple language detection based on character patterns
    if (/[\u4e00-\u9fff]/.test(sample)) {
      return 'zh'; // Chinese
    } else if (/[\u3040-\u309f\u30a0-\u30ff]/.test(sample)) {
      return 'ja'; // Japanese
    } else {
      return 'en'; // Default to English
    }
  }
}