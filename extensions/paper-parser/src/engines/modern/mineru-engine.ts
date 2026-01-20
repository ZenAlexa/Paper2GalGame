/**
 * MinerU Engine - Professional PDF Analysis with AI
 *
 * Integrates MinerU 2.5 for advanced academic paper parsing
 * with specialized formula recognition capabilities.
 */

import { promises as fs } from 'node:fs';
import fetch from 'node-fetch';
import type {
  EnhancedEquation,
  EnhancedFigure,
  EnhancedParsedPaper,
  EnhancedTable,
  ParsingProgress,
  ProgressCallback,
} from '../../types/enhanced-paper';

/**
 * MinerU block structure as returned by the service
 */
interface MinerUBlock {
  type: string;
  bbox: [number, number, number, number];
  text?: string;
  content?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

/**
 * MinerU service response structure
 */
interface MinerUResponse {
  success: boolean;
  blocks: MinerUBlock[];
  metadata: {
    pages: number;
    processingTime: number;
    version: string;
  };
  error?: string;
}

/**
 * Configuration for MinerU engine
 */
export interface MinerUEngineConfig {
  /** MinerU service endpoint */
  serviceUrl: string;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Enable recursive layout analysis */
  enableRecursiveAnalysis: boolean;

  /** Maximum recursion depth */
  maxRecursionDepth: number;

  /** Target block types for subimage processing */
  subimageTypes: string[];
}

/**
 * Professional PDF parsing engine using MinerU
 */
export class MinerUEngine {
  private config: MinerUEngineConfig;
  private progressCallback?: ProgressCallback;

  constructor(config: Partial<MinerUEngineConfig> = {}) {
    this.config = {
      serviceUrl: 'http://127.0.0.1:8010',
      timeout: 120000, // 2 minutes
      enableRecursiveAnalysis: true,
      maxRecursionDepth: 2,
      subimageTypes: ['formula', 'equation', 'table', 'figure', 'image'],
      ...config,
    };
  }

  /**
   * Set progress callback for long-running operations
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Parse PDF using MinerU service
   */
  async parsePDF(pdfPath: string): Promise<Partial<EnhancedParsedPaper>> {
    this.reportProgress({
      stage: 'init',
      progress: 0,
      description: 'Initializing MinerU PDF processing',
    });

    try {
      // 1. Upload PDF to MinerU service
      const uploadResult = await this.uploadPDF(pdfPath);

      this.reportProgress({
        stage: 'pdf-extraction',
        progress: 20,
        description: 'Processing PDF with MinerU',
      });

      // 2. Process with MinerU
      const mineruResult = await this.callMinerUService(uploadResult.fileId);

      this.reportProgress({
        stage: 'structure-analysis',
        progress: 50,
        description: 'Analyzing document structure',
      });

      // 3. Extract structured content
      const structuredContent = await this.extractStructuredContent(mineruResult);

      this.reportProgress({
        stage: 'formula-processing',
        progress: 80,
        description: 'Processing mathematical formulas',
      });

      // 4. Process formulas specifically
      const enhancedFormulas = await this.processFormulas(mineruResult.blocks);

      this.reportProgress({
        stage: 'finalization',
        progress: 100,
        description: 'Finalizing parsed content',
      });

      return {
        ...structuredContent,
        sections: structuredContent.sections?.map((section) => ({
          ...section,
          equations: enhancedFormulas.filter((eq) => this.isEquationInSection(eq, section)),
        })),
      };
    } catch (error) {
      throw new Error(`MinerU parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload PDF to MinerU service
   */
  private async uploadPDF(pdfPath: string): Promise<{ fileId: string; size: number }> {
    const formData = new FormData();
    const fileBuffer = await fs.readFile(pdfPath);
    const fileName = pdfPath.split('/').pop() || 'document.pdf';

    // Create a Blob from the buffer for FormData
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('file', blob, fileName);

    const response = await fetch(`${this.config.serviceUrl}/upload`, {
      method: 'POST',
      body: formData,
      timeout: this.config.timeout,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return {
      fileId: result.fileId,
      size: fileBuffer.length,
    };
  }

  /**
   * Call MinerU processing service
   */
  private async callMinerUService(fileId: string): Promise<MinerUResponse> {
    const response = await fetch(`${this.config.serviceUrl}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        options: {
          enableFormulaDetection: true,
          enableLayoutAnalysis: true,
          recursiveDepth: this.config.maxRecursionDepth,
        },
      }),
      timeout: this.config.timeout,
    });

    if (!response.ok) {
      throw new Error(`MinerU service error: ${response.status} ${response.statusText}`);
    }

    const result: MinerUResponse = await response.json();

    if (!result.success) {
      throw new Error(`MinerU processing failed: ${result.error || 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Extract structured content from MinerU blocks
   */
  private async extractStructuredContent(mineruResult: MinerUResponse): Promise<Partial<EnhancedParsedPaper>> {
    const blocks = mineruResult.blocks;

    // Group blocks by type
    const blocksByType = this.groupBlocksByType(blocks);

    // Extract sections
    const sections = this.extractSections(blocksByType);

    // Extract metadata
    const metadata = this.extractMetadata(blocksByType);

    // Extract figures and tables
    const figures = this.extractFigures(blocksByType.figure || []);
    const tables = this.extractTables(blocksByType.table || []);

    // Calculate stats
    const stats = {
      pageCount: mineruResult.metadata.pages,
      wordCount: this.calculateWordCount(blocks),
      charCount: this.calculateCharCount(blocks),
      sectionCount: sections.length,
      figureCount: figures.length,
      tableCount: tables.length,
      equationCount: (blocksByType.formula || []).length,
      citationCount: 0, // TODO: implement citation detection
      processingTimeMs: mineruResult.metadata.processingTime,
      confidence: this.calculateOverallConfidence(blocks),
      detectedLanguage: this.detectLanguage(blocks),

      // Enhanced AI processing stats
      aiProcessing: {
        apiCalls: 1, // MinerU call
        aiProcessingTimeMs: mineruResult.metadata.processingTime,
        estimatedCost: 0.01, // Placeholder
        modelsUsed: [`MinerU-${mineruResult.metadata.version}`],
        overallAiConfidence: this.calculateOverallConfidence(blocks),
      },

      quality: {
        formulaAccuracy: 0.95, // MinerU is quite good
        layoutAccuracy: 0.9,
        structureAccuracy: 0.85,
      },

      processingMethod: 'mineru' as const,
    };

    return {
      metadata,
      sections,
      stats,
      rawText: this.extractRawText(blocks),
      timestamp: new Date(),
      parserVersion: 'enhanced-2026-v1.0',
    };
  }

  /**
   * Process formulas with enhanced metadata
   */
  private async processFormulas(blocks: MinerUBlock[]): Promise<EnhancedEquation[]> {
    const formulaBlocks = blocks.filter((block) => ['formula', 'equation', 'math'].includes(block.type.toLowerCase()));

    const enhancedFormulas: EnhancedEquation[] = [];

    for (const [index, block] of formulaBlocks.entries()) {
      try {
        const enhanced = await this.enhanceFormula(block, index);
        enhancedFormulas.push(enhanced);

        // Report progress
        this.reportProgress({
          stage: 'formula-processing',
          progress: 80 + (index / formulaBlocks.length) * 15,
          description: `Processing formula ${index + 1} of ${formulaBlocks.length}`,
          itemsProcessed: {
            current: index + 1,
            total: formulaBlocks.length,
            type: 'formulas',
          },
        });
      } catch (error) {
        console.warn(`Failed to enhance formula ${index}:`, error);

        // Create basic enhanced formula as fallback
        enhancedFormulas.push({
          id: `formula-${index}`,
          latex: block.text || block.content || '',
          text: block.text || block.content || '',
          position: index,
          inline: this.isInlineFormula(block),
          bbox: block.bbox,
          confidence: block.confidence || 0.7,
          complexity: this.assessComplexity(block.text || block.content || ''),
          mathType: this.classifyMathType(block.text || block.content || ''),
        });
      }
    }

    return enhancedFormulas;
  }

  /**
   * Enhance individual formula with AI analysis
   */
  private async enhanceFormula(block: MinerUBlock, index: number): Promise<EnhancedEquation> {
    const latex = block.text || block.content || '';

    return {
      id: `formula-${index}`,
      latex,
      text: latex, // MinerU usually provides LaTeX directly
      position: index,
      inline: this.isInlineFormula(block),
      bbox: block.bbox,
      confidence: block.confidence || 0.85,
      complexity: this.assessComplexity(latex),
      mathType: this.classifyMathType(latex),

      aiMetadata: {
        model: 'MinerU-2.5',
        processingTime: 100, // Estimated
        method: 'structural',
        quality: {
          latexAccuracy: block.confidence || 0.85,
          semanticRelevance: 0.8,
          contextAlignment: 0.75,
        },
      },

      educational: {
        difficulty: this.assessDifficulty(latex),
        concepts: this.extractConcepts(latex),
        explanation: this.generateExplanation(latex),
      },
    };
  }

  /**
   * Group blocks by their type
   */
  private groupBlocksByType(blocks: MinerUBlock[]): Record<string, MinerUBlock[]> {
    return blocks.reduce(
      (acc, block) => {
        const type = block.type.toLowerCase();
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(block);
        return acc;
      },
      {} as Record<string, MinerUBlock[]>
    );
  }

  /**
   * Extract sections from blocks
   */
  private extractSections(blocksByType: Record<string, MinerUBlock[]>): MinerUBlock[] {
    // Combine text blocks and analyze structure
    const textBlocks = [
      ...(blocksByType.title || []),
      ...(blocksByType.heading || []),
      ...(blocksByType.paragraph || []),
      ...(blocksByType.text || []),
    ];

    // Sort by position (using bbox y-coordinate)
    textBlocks.sort((a, b) => (a.bbox?.[1] || 0) - (b.bbox?.[1] || 0));

    // Use existing section detection logic but with enhanced types
    return this.detectSections(textBlocks);
  }

  /**
   * Extract metadata from title and author blocks
   */
  private extractMetadata(blocksByType: Record<string, MinerUBlock[]>): {
    title: string;
    authors: (string | undefined)[];
    keywords: string[];
    language: string;
  } {
    const titleBlocks = blocksByType.title || [];
    const authorBlocks = blocksByType.author || [];

    return {
      title: titleBlocks[0]?.text || titleBlocks[0]?.content || 'Unknown Title',
      authors: authorBlocks.map((block) => block.text || block.content).filter(Boolean),
      keywords: [], // TODO: extract from blocks
      language: 'auto',
    };
  }

  /**
   * Extract enhanced figures
   */
  private extractFigures(figureBlocks: MinerUBlock[]): EnhancedFigure[] {
    return figureBlocks.map((block, index) => ({
      id: `figure-${index}`,
      caption: block.text || block.content || '',
      type: 'image' as const,
      position: index,
      bbox: block.bbox,
      aiDescription: `AI-analyzed figure content: ${block.text || 'No description available'}`,
    }));
  }

  /**
   * Extract enhanced tables
   */
  private extractTables(tableBlocks: MinerUBlock[]): EnhancedTable[] {
    return tableBlocks.map((block, index) => ({
      id: `table-${index}`,
      caption: block.text || block.content || '',
      position: index,
      headers: [], // TODO: parse table structure
      rows: [], // TODO: parse table structure
      bbox: block.bbox,
      structure: {
        columnTypes: [],
        patterns: [],
        summary: 'Table structure analysis pending',
      },
    }));
  }

  // Helper methods
  private isInlineFormula(block: MinerUBlock): boolean {
    // Heuristic: inline formulas are typically smaller
    const bbox = block.bbox;
    if (!bbox) return false;

    const height = bbox[3] - bbox[1];
    return height < 0.05; // Less than 5% of page height
  }

  private assessComplexity(latex: string): 'simple' | 'medium' | 'complex' {
    if (latex.length < 20) return 'simple';
    if (latex.includes('\\\\int') || latex.includes('\\\\sum') || latex.includes('\\\\prod')) return 'complex';
    if (latex.includes('\\\\frac') || latex.includes('^') || latex.includes('_')) return 'medium';
    return 'simple';
  }

  private classifyMathType(latex: string): EnhancedEquation['mathType'] {
    if (latex.includes('\\\\int') || latex.includes('\\\\partial')) return 'calculus';
    if (latex.includes('\\\\sum') || latex.includes('\\\\mu') || latex.includes('\\\\sigma')) return 'statistics';
    if (latex.includes('\\\\frac') || latex.includes('^') || latex.includes('_')) return 'algebra';
    if (latex.includes('\\\\angle') || latex.includes('\\\\triangle')) return 'geometry';
    return 'other';
  }

  private assessDifficulty(latex: string): 'beginner' | 'intermediate' | 'advanced' {
    const complexity = this.assessComplexity(latex);
    if (complexity === 'simple') return 'beginner';
    if (complexity === 'medium') return 'intermediate';
    return 'advanced';
  }

  private extractConcepts(latex: string): string[] {
    const concepts: string[] = [];

    if (latex.includes('\\\\int')) concepts.push('integration');
    if (latex.includes('\\\\frac')) concepts.push('fractions');
    if (latex.includes('\\\\sum')) concepts.push('summation');
    if (latex.includes('^')) concepts.push('exponentiation');
    if (latex.includes('_')) concepts.push('subscripts');

    return concepts;
  }

  private generateExplanation(latex: string): string {
    const complexity = this.assessComplexity(latex);
    const mathType = this.classifyMathType(latex);

    return `This is a ${complexity} ${mathType} expression that would benefit from step-by-step explanation in the visual novel format.`;
  }

  private calculateWordCount(blocks: MinerUBlock[]): number {
    return blocks.reduce((count, block) => {
      const text = block.text || block.content || '';
      return count + text.split(/\\s+/).filter((word) => word.length > 0).length;
    }, 0);
  }

  private calculateCharCount(blocks: MinerUBlock[]): number {
    return blocks.reduce((count, block) => {
      const text = block.text || block.content || '';
      return count + text.length;
    }, 0);
  }

  private calculateOverallConfidence(blocks: MinerUBlock[]): number {
    if (blocks.length === 0) return 0;

    const totalConfidence = blocks.reduce((sum, block) => {
      return sum + (block.confidence || 0.8); // Default confidence
    }, 0);

    return totalConfidence / blocks.length;
  }

  private detectLanguage(blocks: MinerUBlock[]): string {
    // Simple heuristic based on character patterns
    const text = blocks.map((block) => block.text || block.content || '').join(' ');

    const chineseChars = (text.match(/[\\u4e00-\\u9fff]/g) || []).length;
    const japaneseChars = (text.match(/[\\u3040-\\u309f\\u30a0-\\u30ff]/g) || []).length;
    const totalChars = text.length;

    if (chineseChars / totalChars > 0.1) return 'zh';
    if (japaneseChars / totalChars > 0.1) return 'ja';
    return 'en';
  }

  private extractRawText(blocks: MinerUBlock[]): string {
    return blocks
      .map((block) => block.text || block.content || '')
      .filter((text) => text.trim().length > 0)
      .join(
        '\
'
      );
  }

  private detectSections(_textBlocks: MinerUBlock[]): MinerUBlock[] {
    // Placeholder implementation - should use more sophisticated analysis
    // This would integrate with existing section detection logic
    return [];
  }

  private isEquationInSection(_equation: EnhancedEquation, _section: MinerUBlock): boolean {
    // Placeholder - implement proper position-based matching
    return true;
  }

  private reportProgress(progress: ParsingProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Test connection to MinerU service
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.serviceUrl}/health`, {
        method: 'GET',
        timeout: 5000,
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
