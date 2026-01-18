/**
 * Word Document Parser Implementation
 *
 * Uses mammoth.js to extract text, structure, and metadata from Word documents.
 */

import * as mammoth from 'mammoth';
import type {
  WordParser,
  ParseResult,
  ParserConfig,
  ParsedPaper,
  PaperMetadata,
  ParsingStats
} from '../types';
import { BaseParserImpl } from './base-parser';

/**
 * Word document parser implementation using mammoth.js
 */
export class WordParserImpl extends BaseParserImpl implements WordParser {
  constructor() {
    super('WordParser', ['docx', 'doc']);
  }

  /**
   * Check if buffer contains a Word document
   */
  protected checkMagicBytes(buffer: ArrayBuffer): boolean {
    const bytes = new Uint8Array(buffer.slice(0, 8));

    // DOCX files are ZIP archives, check for ZIP magic bytes
    if (bytes.length >= 4 &&
        bytes[0] === 0x50 && bytes[1] === 0x4B &&
        (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
        (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08)) {
      return true; // ZIP signature (DOCX)
    }

    // DOC files (older format) start with different signature
    if (bytes.length >= 8 &&
        bytes[0] === 0xD0 && bytes[1] === 0xCF &&
        bytes[2] === 0x11 && bytes[3] === 0xE0 &&
        bytes[4] === 0xA1 && bytes[5] === 0xB1 &&
        bytes[6] === 0x1A && bytes[7] === 0xE1) {
      return true; // OLE signature (DOC)
    }

    return false;
  }

  /**
   * Main parse method for Word documents
   */
  async parse(buffer: ArrayBuffer, config?: ParserConfig): Promise<ParseResult> {
    const validatedConfig = this.validateConfig(config);
    const startTime = Date.now();

    try {
      // Configure mammoth options for better text extraction
      const options: any = {
        convertImage: mammoth.images.imgElement((image: any) => {
          // Return placeholder for images
          return image.read("base64").then((imageBuffer: any) => {
            return {
              src: `data:${image.contentType};base64,${imageBuffer}`
            };
          });
        }),
        styleMap: [
          // Map Word styles to semantic meaning
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1.title:fresh",
          "p[style-name='Abstract'] => p.abstract",
          "p[style-name='Bibliography'] => p.references"
        ]
      };

      // Convert document to HTML for structured parsing
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer }, options);

      // Also get plain text
      const textResult = await mammoth.extractRawText({ arrayBuffer: buffer });

      // Clean the extracted text
      const cleanedText = this.cleanText(textResult.value);

      // Extract metadata from document properties
      const metadata = await this.extractDocumentMetadata(buffer);

      // Extract structured content from HTML
      // const structuredContent = this.parseHTMLStructure(htmlResult.value);

      // Extract images if requested
      const images: Array<{ id: string; imageData: string; contentType: string }> = [];
      if (validatedConfig.extractFigures) {
        // Images are embedded in the HTML conversion result
        const imageMatches = htmlResult.value.match(/<img[^>]+src="data:([^;]+);base64,([^"]+)"/g);
        if (imageMatches) {
          imageMatches.forEach((match: any, index: any) => {
            const [, contentType, imageData] = match.match(/data:([^;]+);base64,([^"]+)/) || [];
            if (contentType && imageData) {
              images.push({
                id: `img_${index + 1}`,
                imageData,
                contentType
              });
            }
          });
        }
      }

      // Calculate processing time
      const processingTimeMs = Date.now() - startTime;

      // Create parsing statistics
      const stats: ParsingStats = {
        ...this.initializeStats(),
        pageCount: this.estimatePageCount(cleanedText),
        wordCount: this.calculateWordCount(cleanedText),
        charCount: this.calculateCharCount(cleanedText),
        figureCount: images.length,
        processingTimeMs,
        confidence: 0.9, // High confidence for Word parsing
        detectedLanguage: this.detectLanguage(cleanedText)
      };

      // Create source file info
      const sourceFile = {
        name: 'document.docx',
        size: buffer.byteLength,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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

      // Include any conversion messages as warnings
      if (htmlResult.messages.length > 0) {
        const warnings = htmlResult.messages.map((msg: any) =>
          this.createError(
            'WORD_CONVERSION_WARNING',
            msg.message,
            'warning',
            `Element: ${msg.type}`
          )
        );

        return {
          success: true,
          data: parsedPaper,
          errors: warnings
        };
      }

      return this.createSuccessResult(parsedPaper);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown Word parsing error';

      return this.createErrorResult([
        this.createError(
          'WORD_PARSE_FAILED',
          `Failed to parse Word document: ${errorMsg}`,
          'error',
          error instanceof Error ? error.stack : undefined
        )
      ]);
    }
  }

  /**
   * Extract styles and formatting information
   */
  async extractStyles(buffer: ArrayBuffer): Promise<{
    headings: Array<{ level: number; text: string; style: string; }>;
    paragraphStyles: string[];
  }> {
    try {
      const options: any = {
        includeEmbeddedStyleMap: true,
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh"
        ]
      };

      const result = await mammoth.convertToHtml({ arrayBuffer: buffer }, options);
      const html = result.value;

      // Extract headings from HTML
      const headings: Array<{ level: number; text: string; style: string; }> = [];
      const headingMatches = html.match(/<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/g) || [];

      headingMatches.forEach((match: any) => {
        const [, levelStr, text] = match.match(/<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/) || [];
        if (levelStr && text) {
          headings.push({
            level: parseInt(levelStr),
            text: text.trim(),
            style: `Heading ${levelStr}`
          });
        }
      });

      // Extract paragraph styles (simplified)
      const paragraphStyles: string[] = [
        'Normal',
        'Heading 1',
        'Heading 2',
        'Heading 3',
        'Title',
        'Abstract',
        'Bibliography'
      ];

      return { headings, paragraphStyles };

    } catch (error) {
      throw new Error(`Failed to extract Word document styles: ${error}`);
    }
  }

  /**
   * Extract embedded images
   */
  async extractImages(buffer: ArrayBuffer): Promise<Array<{
    id: string;
    imageData: string;
    contentType: string;
  }>> {
    try {
      const options: any = {
        convertImage: mammoth.images.imgElement((image: any) => {
          return image.read("base64").then((imageBuffer: any) => ({
            src: `data:${image.contentType};base64,${imageBuffer}`
          }));
        })
      };

      const result = await mammoth.convertToHtml({ arrayBuffer: buffer }, options);
      const html = result.value;

      const images: Array<{ id: string; imageData: string; contentType: string; }> = [];
      const imageMatches = html.match(/<img[^>]+src="data:([^;]+);base64,([^"]+)"/g) || [];

      imageMatches.forEach((match, index) => {
        const [, contentType, imageData] = match.match(/data:([^;]+);base64,([^"]+)/) || [];
        if (contentType && imageData) {
          images.push({
            id: `image_${index + 1}`,
            imageData,
            contentType
          });
        }
      });

      return images;

    } catch (error) {
      throw new Error(`Failed to extract Word document images: ${error}`);
    }
  }

  /**
   * Extract table data
   */
  async extractTables(buffer: ArrayBuffer): Promise<Array<{
    headers: string[];
    rows: string[][];
  }>> {
    try {
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
      const html = result.value;

      const tables: Array<{ headers: string[]; rows: string[][]; }> = [];
      const tableMatches = html.match(/<table[^>]*>[\s\S]*?<\/table>/g) || [];

      tableMatches.forEach(tableHtml => {
        // Extract headers
        const headerMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/);
        const headers: string[] = [];

        if (headerMatch) {
          const headerCells = headerMatch[1].match(/<th[^>]*>([^<]*)<\/th>/g) || [];
          headers.push(...headerCells.map(cell => {
            const match = cell.match(/<th[^>]*>([^<]*)<\/th>/);
            return match ? match[1].trim() : '';
          }));
        }

        // Extract rows
        const bodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
        const rows: string[][] = [];

        if (bodyMatch) {
          const rowMatches = bodyMatch[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];

          rowMatches.forEach(rowHtml => {
            const cellMatches = rowHtml.match(/<td[^>]*>([^<]*)<\/td>/g) || [];
            const row = cellMatches.map(cell => {
              const match = cell.match(/<td[^>]*>([^<]*)<\/td>/);
              return match ? match[1].trim() : '';
            });
            if (row.length > 0) {
              rows.push(row);
            }
          });
        }

        if (headers.length > 0 || rows.length > 0) {
          tables.push({ headers, rows });
        }
      });

      return tables;

    } catch (error) {
      throw new Error(`Failed to extract Word document tables: ${error}`);
    }
  }

  /**
   * Extract document metadata from Word file
   */
  private async extractDocumentMetadata(buffer: ArrayBuffer): Promise<PaperMetadata> {
    // Note: mammoth.js doesn't directly expose document properties
    // In a production implementation, you might use additional libraries
    // or parse the DOCX structure directly for metadata

    const metadata: PaperMetadata = {
      title: '',
      authors: [],
      keywords: []
    };

    try {
      // For now, we'll try to extract title from the document content
      const textResult = await mammoth.extractRawText({ arrayBuffer: buffer });
      const lines = textResult.value.split('\n').filter(line => line.trim().length > 0);

      // Assume first substantial line might be the title
      if (lines.length > 0) {
        const potentialTitle = lines[0].trim();
        if (potentialTitle.length > 10 && potentialTitle.length < 200) {
          metadata.title = potentialTitle;
        }
      }

    } catch (error) {
      // Use default empty metadata if extraction fails
    }

    return metadata;
  }

  /**
   * Parse HTML structure to extract semantic content
   * Currently unused - could be used for more advanced structure analysis
   */
  /*
  private parseHTMLStructure(html: string): {
    headings: Array<{ level: number; text: string; position: number; }>;
    paragraphs: Array<{ text: string; className?: string; }>;
  } {
    const headings: Array<{ level: number; text: string; position: number; }> = [];
    const paragraphs: Array<{ text: string; className?: string; }> = [];

    // Extract headings
    const headingMatches = html.match(/<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/g) || [];
    headingMatches.forEach((match, index) => {
      const [, levelStr, text] = match.match(/<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/) || [];
      if (levelStr && text) {
        headings.push({
          level: parseInt(levelStr),
          text: text.trim(),
          position: index
        });
      }
    });

    // Extract paragraphs
    const paragraphMatches = html.match(/<p[^>]*>([^<]*)<\/p>/g) || [];
    paragraphMatches.forEach(match => {
      const [, text] = match.match(/<p[^>]*>([^<]*)<\/p>/) || [];
      if (text && text.trim().length > 0) {
        const className = match.match(/class="([^"]*)"/) ? match.match(/class="([^"]*)"/)?.[1] : undefined;
        const paragraph: any = { text: text.trim() };
        if (className) {
          paragraph.className = className;
        }
        paragraphs.push(paragraph);
      }
    });

    return { headings, paragraphs };
  }
  */

  /**
   * Estimate page count based on word count (rough estimate)
   */
  private estimatePageCount(text: string): number {
    const wordCount = this.calculateWordCount(text);
    // Rough estimate: 250 words per page for academic papers
    return Math.max(1, Math.ceil(wordCount / 250));
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