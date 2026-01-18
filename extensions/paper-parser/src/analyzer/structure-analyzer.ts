/**
 * Structure Analyzer Implementation
 *
 * Analyzes parsed text to identify paper structure including sections,
 * figures, tables, citations, and other academic content.
 */

import type {
  PaperSection,
  SectionType,
  Figure,
  Table,
  Citation,
  Equation,
  BibliographicReference,
  ParsedPaper
} from '../types';

/**
 * Configuration for structure analysis
 */
export interface AnalyzerConfig {
  /** Language for section detection */
  language: 'auto' | 'en' | 'zh' | 'ja';
  /** Confidence threshold for section classification */
  confidenceThreshold: number;
  /** Whether to extract figures */
  extractFigures: boolean;
  /** Whether to extract tables */
  extractTables: boolean;
  /** Whether to extract equations */
  extractEquations: boolean;
  /** Whether to extract citations */
  extractCitations: boolean;
  /** Custom section patterns */
  customPatterns?: Record<string, RegExp[]>;
}

/**
 * Section detection patterns for different languages
 */
const SECTION_PATTERNS = {
  en: {
    title: [
      /^([A-Z][A-Za-z\s,:\-–—]+)$/,
      /^(.{10,100})$/
    ],
    abstract: [
      /^abstract$/i,
      /^summary$/i,
      /^executive\s+summary$/i
    ],
    introduction: [
      /^introduction$/i,
      /^1\.?\s*introduction$/i,
      /^background$/i,
      /^overview$/i
    ],
    methods: [
      /^methods?$/i,
      /^methodology$/i,
      /^approach$/i,
      /^materials?\s+and\s+methods?$/i,
      /^\d+\.?\s*methods?$/i
    ],
    results: [
      /^results?$/i,
      /^findings?$/i,
      /^experiments?$/i,
      /^\d+\.?\s*results?$/i
    ],
    discussion: [
      /^discussion$/i,
      /^analysis$/i,
      /^\d+\.?\s*discussion$/i,
      /^results?\s+and\s+discussion$/i
    ],
    conclusion: [
      /^conclusions?$/i,
      /^summary$/i,
      /^final\s+remarks?$/i,
      /^\d+\.?\s*conclusions?$/i
    ],
    references: [
      /^references?$/i,
      /^bibliography$/i,
      /^works?\s+cited$/i,
      /^citations?$/i
    ],
    acknowledgments: [
      /^acknowledgments?$/i,
      /^acknowledgements?$/i,
      /^thanks$/i
    ]
  },
  zh: {
    title: [
      /^([^\x00-\x7F]{5,50})$/,
      /^(.{10,100})$/
    ],
    abstract: [
      /^摘\s*要$/,
      /^概\s*述$/,
      /^内容提要$/
    ],
    introduction: [
      /^引\s*言$/,
      /^前\s*言$/,
      /^绪\s*论$/,
      /^背景$/,
      /^\d+\.?\s*引言$/
    ],
    methods: [
      /^方\s*法$/,
      /^研究方法$/,
      /^实验方法$/,
      /^\d+\.?\s*方法$/
    ],
    results: [
      /^结\s*果$/,
      /^实验结果$/,
      /^研究结果$/,
      /^\d+\.?\s*结果$/
    ],
    discussion: [
      /^讨\s*论$/,
      /^分\s*析$/,
      /^\d+\.?\s*讨论$/
    ],
    conclusion: [
      /^结\s*论$/,
      /^总\s*结$/,
      /^结语$/,
      /^\d+\.?\s*结论$/
    ],
    references: [
      /^参考文献$/,
      /^引用文献$/,
      /^文献$/
    ],
    acknowledgments: [
      /^致\s*谢$/,
      /^鸣\s*谢$/,
      /^感谢$/
    ]
  },
  ja: {
    title: [
      /^([^\x00-\x7F]{5,50})$/,
      /^(.{10,100})$/
    ],
    abstract: [
      /^要約$/,
      /^概要$/,
      /^抄録$/
    ],
    introduction: [
      /^はじめに$/,
      /^序論$/,
      /^導入$/,
      /^\d+\.?\s*はじめに$/
    ],
    methods: [
      /^方法$/,
      /^手法$/,
      /^実験方法$/,
      /^\d+\.?\s*方法$/
    ],
    results: [
      /^結果$/,
      /^実験結果$/,
      /^\d+\.?\s*結果$/
    ],
    discussion: [
      /^考察$/,
      /^議論$/,
      /^\d+\.?\s*考察$/
    ],
    conclusion: [
      /^結論$/,
      /^まとめ$/,
      /^終わりに$/,
      /^\d+\.?\s*結論$/
    ],
    references: [
      /^参考文献$/,
      /^文献$/,
      /^引用文献$/
    ],
    acknowledgments: [
      /^謝辞$/,
      /^感謝$/,
      /^あとがき$/
    ]
  }
};

/**
 * Main structure analyzer class
 */
export class StructureAnalyzer {
  private config: AnalyzerConfig;

  constructor(config: Partial<AnalyzerConfig> = {}) {
    this.config = {
      language: 'auto',
      confidenceThreshold: 0.7,
      extractFigures: true,
      extractTables: true,
      extractEquations: true,
      extractCitations: true,
      ...config
    };
  }

  /**
   * Main analysis method - converts raw text to structured sections
   */
  async analyze(
    rawText: string,
    _metadata?: { title?: string; authors?: string[] }
  ): Promise<{
    sections: PaperSection[];
    figures: Figure[];
    tables: Table[];
    equations: Equation[];
    citations: Citation[];
    references: BibliographicReference[];
  }> {
    // Detect language if auto
    const language = this.config.language === 'auto' ? this.detectLanguage(rawText) : this.config.language;

    // Split text into lines and identify potential sections
    const lines = this.splitIntoLines(rawText);
    const candidates = this.identifySectionCandidates(lines, language);

    // Build hierarchical structure
    const sections = this.buildSectionHierarchy(candidates, lines);

    // Extract additional elements
    const figures = this.config.extractFigures ? this.extractFigures(rawText) : [];
    const tables = this.config.extractTables ? this.extractTables(rawText) : [];
    const equations = this.config.extractEquations ? this.extractEquations(rawText) : [];
    const { citations, references } = this.config.extractCitations ?
      this.extractCitationsAndReferences(rawText) : { citations: [], references: [] };

    return {
      sections,
      figures,
      tables,
      equations,
      citations,
      references
    };
  }

  /**
   * Update a parsed paper with structure analysis
   */
  async enrichParsedPaper(parsedPaper: ParsedPaper): Promise<ParsedPaper> {
    const analysis = await this.analyze(parsedPaper.rawText, parsedPaper.metadata);

    return {
      ...parsedPaper,
      sections: analysis.sections,
      references: analysis.references,
      stats: {
        ...parsedPaper.stats,
        sectionCount: analysis.sections.length,
        figureCount: analysis.figures.length,
        tableCount: analysis.tables.length,
        equationCount: analysis.equations.length,
        citationCount: analysis.citations.length
      }
    };
  }

  /**
   * Detect language from text content
   */
  private detectLanguage(text: string): 'en' | 'zh' | 'ja' {
    const sample = text.substring(0, 2000);

    const charCounts = {
      chinese: (sample.match(/[\u4e00-\u9fff]/g) || []).length,
      japanese: (sample.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length,
      english: (sample.match(/[a-zA-Z]/g) || []).length
    };

    if (charCounts.chinese > charCounts.english * 0.1) return 'zh';
    if (charCounts.japanese > charCounts.english * 0.1) return 'ja';
    return 'en';
  }

  /**
   * Split text into lines and clean
   */
  private splitIntoLines(text: string): Array<{ text: string; number: number; position: number }> {
    return text.split('\n').map((line, index) => ({
      text: line.trim(),
      number: index + 1,
      position: text.split('\n').slice(0, index).join('\n').length
    })).filter(line => line.text.length > 0);
  }

  /**
   * Identify potential section headers
   */
  private identifySectionCandidates(
    lines: Array<{ text: string; number: number; position: number }>,
    language: 'en' | 'zh' | 'ja'
  ): Array<{
    line: { text: string; number: number; position: number };
    type: SectionType;
    confidence: number;
    level: number;
  }> {
    const patterns = SECTION_PATTERNS[language] || SECTION_PATTERNS.en;
    const candidates: Array<{
      line: { text: string; number: number; position: number };
      type: SectionType;
      confidence: number;
      level: number;
    }> = [];

    for (const line of lines) {
      // Skip very long lines (probably not headers)
      if (line.text.length > 200) continue;

      // Check against section patterns
      for (const [sectionType, sectionPatterns] of Object.entries(patterns)) {
        if (!Array.isArray(sectionPatterns)) continue;
        for (const pattern of sectionPatterns) {
          if (pattern.test(line.text)) {
            const confidence = this.calculateSectionConfidence(line.text, sectionType as SectionType, language);
            const level = this.determineSectionLevel(line.text);

            if (confidence >= this.config.confidenceThreshold) {
              candidates.push({
                line,
                type: sectionType as SectionType,
                confidence,
                level
              });
              break; // Only match first pattern
            }
          }
        }
      }
    }

    return candidates.sort((a, b) => a.line.number - b.line.number);
  }

  /**
   * Calculate confidence score for section classification
   */
  private calculateSectionConfidence(text: string, type: SectionType, language: 'en' | 'zh' | 'ja'): number {
    let confidence = 0.5; // Base confidence

    // Length-based scoring
    if (text.length > 5 && text.length < 100) {
      confidence += 0.2;
    }

    // Numbering patterns
    if (/^\d+\.?\s*/.test(text)) {
      confidence += 0.2;
    }

    // Capitalization (for English)
    if (language === 'en' && /^[A-Z]/.test(text)) {
      confidence += 0.1;
    }

    // Specific patterns for each section type
    switch (type) {
      case 'abstract':
        if (text.toLowerCase() === 'abstract' || text === '摘要') {
          confidence += 0.3;
        }
        break;
      case 'introduction':
        if (/^1\.?\s*introduction$/i.test(text) || text === '引言') {
          confidence += 0.3;
        }
        break;
      case 'conclusion':
        if (/conclusion/i.test(text) || /结论/.test(text)) {
          confidence += 0.3;
        }
        break;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Determine section hierarchical level
   */
  private determineSectionLevel(text: string): number {
    // Check for numbering patterns
    const numberMatch = text.match(/^(\d+)\.?/);
    if (numberMatch) {
      return 1; // Main section
    }

    const subNumberMatch = text.match(/^(\d+)\.(\d+)/);
    if (subNumberMatch) {
      return 2; // Subsection
    }

    // Check for formatting clues
    if (text.length < 30 && /^[A-Z]/.test(text)) {
      return 1; // Likely main section
    }

    return 1; // Default to main section
  }

  /**
   * Build hierarchical section structure
   */
  private buildSectionHierarchy(
    candidates: Array<{
      line: { text: string; number: number; position: number };
      type: SectionType;
      confidence: number;
      level: number;
    }>,
    allLines: Array<{ text: string; number: number; position: number }>
  ): PaperSection[] {
    const sections: PaperSection[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      const nextCandidate = candidates[i + 1];

      // Determine content range
      const startLine = candidate.line.number;
      const endLine = nextCandidate ? nextCandidate.line.number - 1 : allLines.length;

      // Extract content
      const contentLines = allLines.filter(line =>
        line.number > startLine && line.number <= endLine
      );

      const content = contentLines.map(line => line.text).join('\n').trim();

      // Create section
      const section: PaperSection = {
        type: candidate.type,
        title: candidate.line.text,
        content,
        level: candidate.level,
        position: candidate.line.position,
        confidence: candidate.confidence
      };

      sections.push(section);
    }

    return sections;
  }

  /**
   * Extract figure references from text
   */
  private extractFigures(text: string): Figure[] {
    const figures: Figure[] = [];
    const figurePatterns = [
      /Figure\s+(\d+)[:\.]?\s*([^\n]*)/gi,
      /Fig\.\s*(\d+)[:\.]?\s*([^\n]*)/gi,
      /图\s*(\d+)[：:]?\s*([^\n]*)/g
    ];

    let figureCount = 0;
    for (const pattern of figurePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        figureCount++;
        figures.push({
          id: `fig_${figureCount}`,
          caption: match[2] ? match[2].trim() : `Figure ${match[1]}`,
          type: 'image', // Default type
          position: match.index || 0,
          label: `Figure ${match[1]}`
        });
      }
    }

    return figures;
  }

  /**
   * Extract table references from text
   */
  private extractTables(text: string): Table[] {
    const tables: Table[] = [];
    const tablePatterns = [
      /Table\s+(\d+)[:\.]?\s*([^\n]*)/gi,
      /表\s*(\d+)[：:]?\s*([^\n]*)/g
    ];

    let tableCount = 0;
    for (const pattern of tablePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        tableCount++;
        tables.push({
          id: `table_${tableCount}`,
          caption: match[2] ? match[2].trim() : `Table ${match[1]}`,
          position: match.index || 0,
          headers: [], // Would need more sophisticated parsing
          rows: [],   // Would need more sophisticated parsing
          label: `Table ${match[1]}`
        });
      }
    }

    return tables;
  }

  /**
   * Extract mathematical equations
   */
  private extractEquations(text: string): Equation[] {
    const equations: Equation[] = [];

    // LaTeX equation patterns
    const latexPatterns = [
      /\$\$([^$]+)\$\$/g,  // Display math
      /\\\[([^\]]+)\\\]/g,  // Display math alternative
      /\$([^$]+)\$/g       // Inline math
    ];

    let equationCount = 0;
    for (const pattern of latexPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        equationCount++;
        equations.push({
          id: `eq_${equationCount}`,
          latex: match[1].trim(),
          text: match[1].trim(), // Simplified - would need proper LaTeX to text conversion
          position: match.index || 0,
          inline: pattern.source.includes('\\$') && !pattern.source.includes('\\$\\$')
        });
      }
    }

    return equations;
  }

  /**
   * Extract citations and references
   */
  private extractCitationsAndReferences(text: string): {
    citations: Citation[];
    references: BibliographicReference[];
  } {
    const citations: Citation[] = [];
    const references: BibliographicReference[] = [];

    // Citation patterns
    const citationPatterns = [
      /\[(\d+)\]/g,           // [1], [2], etc.
      /\(([^)]*\d{4}[^)]*)\)/g, // (Author, 2020)
    ];

    let citationCount = 0;
    for (const pattern of citationPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        citationCount++;
        citations.push({
          id: `cite_${citationCount}`,
          display: match[0],
          position: match.index || 0
        });
      }
    }

    // Reference extraction (simplified)
    const referenceSection = this.extractReferenceSection(text);
    if (referenceSection) {
      const refLines = referenceSection.split('\n').filter(line => line.trim().length > 0);
      let refCount = 0;

      for (const line of refLines) {
        // Simple pattern matching for references
        if (line.length > 20 && (line.includes('.') || line.includes(','))) {
          refCount++;
          references.push({
            id: `ref_${refCount}`,
            title: this.extractTitleFromReference(line),
            authors: this.extractAuthorsFromReference(line),
            type: 'other' // Default type
          });
        }
      }
    }

    return { citations, references };
  }

  /**
   * Extract reference section from text
   */
  private extractReferenceSection(text: string): string | null {
    const referencePatterns = [
      /(?:^|\n)\s*(?:REFERENCES?|BIBLIOGRAPHY|WORKS?\s+CITED|参考文献)\s*\n([\s\S]*?)(?:\n\n|\n(?=[A-Z]{2,})|$)/i
    ];

    for (const pattern of referencePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract title from reference line (simplified)
   */
  private extractTitleFromReference(refLine: string): string {
    // Try to find title patterns - often in quotes or after authors
    const titlePatterns = [
      /"([^"]+)"/,  // In quotes
      /\.\s*([^.]+)\.\s*[A-Z]/,  // Between dots
    ];

    for (const pattern of titlePatterns) {
      const match = refLine.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Fallback: take first substantial part
    const parts = refLine.split('.').filter(part => part.trim().length > 10);
    return parts.length > 0 ? parts[0].trim() : 'Unknown';
  }

  /**
   * Extract authors from reference line (simplified)
   */
  private extractAuthorsFromReference(refLine: string): string[] {
    // Very simplified author extraction
    const authorPattern = /^([^.]+)\./;
    const match = refLine.match(authorPattern);

    if (match) {
      return match[1].split(/,|and|\&/).map(author => author.trim()).filter(author => author.length > 0);
    }

    return [];
  }
}