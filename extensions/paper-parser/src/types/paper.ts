/**
 * Paper Parser Type Definitions
 *
 * Comprehensive types for structured representation of academic papers
 * optimized for visual novel generation in Paper2GalGame.
 */

/**
 * Supported paper section types for automatic recognition
 */
export type SectionType =
  | 'title'
  | 'abstract'
  | 'introduction'
  | 'methods'
  | 'results'
  | 'discussion'
  | 'conclusion'
  | 'references'
  | 'acknowledgments'
  | 'appendix'
  | 'other';

/**
 * Figure or image in the paper
 */
export interface Figure {
  /** Unique identifier for the figure */
  id: string;
  /** Figure caption text */
  caption: string;
  /** Type of figure content */
  type: 'image' | 'chart' | 'diagram' | 'graph' | 'flowchart';
  /** Position in document (page number or relative position) */
  position: number;
  /** Optional: extracted image data (base64 or file path) */
  imageData?: string;
  /** Optional: figure number/label (e.g., "Figure 1") */
  label?: string;
}

/**
 * Table in the paper
 */
export interface Table {
  /** Unique identifier for the table */
  id: string;
  /** Table caption text */
  caption: string;
  /** Position in document */
  position: number;
  /** Table headers */
  headers: string[];
  /** Table rows data */
  rows: string[][];
  /** Optional: table number/label (e.g., "Table 1") */
  label?: string;
}

/**
 * Mathematical equation or formula
 */
export interface Equation {
  /** Unique identifier for the equation */
  id: string;
  /** LaTeX representation of the equation */
  latex: string;
  /** Plain text representation */
  text: string;
  /** Position in document */
  position: number;
  /** Optional: equation number/label */
  label?: string;
  /** Whether this is an inline or block equation */
  inline: boolean;
}

/**
 * Citation reference
 */
export interface Citation {
  /** Citation key/identifier */
  id: string;
  /** Display text in document (e.g., "[1]", "(Smith, 2020)") */
  display: string;
  /** Position in document where cited */
  position: number;
  /** Optional: full bibliographic information */
  reference?: BibliographicReference;
}

/**
 * Bibliographic reference information
 */
export interface BibliographicReference {
  /** Reference identifier */
  id: string;
  /** Article/book title */
  title: string;
  /** Author names */
  authors: string[];
  /** Publication year */
  year?: number;
  /** Journal/conference/publisher name */
  venue?: string;
  /** Volume, issue, page numbers */
  volume?: string;
  issue?: string;
  pages?: string;
  /** DOI identifier */
  doi?: string;
  /** URL */
  url?: string;
  /** Publication type */
  type: 'journal' | 'conference' | 'book' | 'thesis' | 'preprint' | 'other';
}

/**
 * A section or subsection of the paper
 */
export interface PaperSection {
  /** Type of section */
  type: SectionType;
  /** Section title/heading */
  title: string;
  /** Main text content */
  content: string;
  /** Hierarchical level (1 = main section, 2 = subsection, etc.) */
  level: number;
  /** Position in document */
  position: number;
  /** Nested subsections */
  subsections?: PaperSection[];
  /** Figures in this section */
  figures?: Figure[];
  /** Tables in this section */
  tables?: Table[];
  /** Equations in this section */
  equations?: Equation[];
  /** Citations in this section */
  citations?: Citation[];
  /** Section confidence score (0-1) for automatic classification */
  confidence?: number;
}

/**
 * Paper metadata and authorship information
 */
export interface PaperMetadata {
  /** Paper title */
  title: string;
  /** Author names */
  authors: string[];
  /** Author affiliations */
  affiliations?: string[];
  /** Keywords */
  keywords: string[];
  /** Abstract text */
  abstract?: string;
  /** Publication date */
  date?: string;
  /** DOI identifier */
  doi?: string;
  /** ArXiv ID */
  arxivId?: string;
  /** Publication venue */
  venue?: string;
  /** Paper URL */
  url?: string;
  /** Language of the paper */
  language?: string;
  /** Subject area/field */
  subject?: string;
  /** Paper category (research, review, etc.) */
  category?: string;
}

/**
 * Parsing statistics and quality metrics
 */
export interface ParsingStats {
  /** Total number of pages processed */
  pageCount: number;
  /** Total word count */
  wordCount: number;
  /** Character count */
  charCount: number;
  /** Number of sections identified */
  sectionCount: number;
  /** Number of figures found */
  figureCount: number;
  /** Number of tables found */
  tableCount: number;
  /** Number of equations found */
  equationCount: number;
  /** Number of citations found */
  citationCount: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Parsing confidence score (0-1) */
  confidence: number;
  /** Detected language */
  detectedLanguage?: string;
}

/**
 * Main structure representing a fully parsed paper
 */
export interface ParsedPaper {
  /** Paper metadata and bibliographic info */
  metadata: PaperMetadata;
  /** Structured sections of the paper */
  sections: PaperSection[];
  /** All bibliographic references */
  references: BibliographicReference[];
  /** Raw text content (for fallback) */
  rawText: string;
  /** Parsing statistics and metrics */
  stats: ParsingStats;
  /** Parsing timestamp */
  timestamp: Date;
  /** Parser version used */
  parserVersion: string;
  /** Original file information */
  sourceFile: {
    name: string;
    size: number;
    type: string;
    hash?: string;
  };
}

/**
 * Error information for parsing failures
 */
export interface ParsingError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Technical details */
  details?: string;
  /** Position where error occurred */
  position?: number;
  /** Severity level */
  severity: 'warning' | 'error' | 'critical';
}

/**
 * Parsing result that may succeed or fail
 */
export interface ParseResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** Parsed paper data (if successful) */
  data?: ParsedPaper;
  /** Error information (if failed) */
  errors?: ParsingError[];
  /** Partial data (if parsing partially succeeded) */
  partialData?: Partial<ParsedPaper>;
}

/**
 * Configuration options for paper parsing
 */
export interface ParserConfig {
  /** Target language for section detection */
  language?: 'auto' | 'en' | 'zh' | 'ja';
  /** Whether to extract figures */
  extractFigures?: boolean;
  /** Whether to extract tables */
  extractTables?: boolean;
  /** Whether to extract equations */
  extractEquations?: boolean;
  /** Whether to extract citations */
  extractCitations?: boolean;
  /** Maximum pages to process (0 = no limit) */
  maxPages?: number;
  /** Confidence threshold for section classification */
  sectionConfidenceThreshold?: number;
  /** Custom section patterns */
  customSectionPatterns?: Record<string, RegExp[]>;
  /** Output format preferences */
  outputFormat?: {
    /** Include raw text in output */
    includeRawText?: boolean;
    /** Include parsing statistics */
    includeStats?: boolean;
    /** Include confidence scores */
    includeConfidence?: boolean;
  };
}
