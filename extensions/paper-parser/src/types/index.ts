/**
 * Paper Parser Types Barrel Export
 *
 * Centralized export for all type definitions used in the paper parser module.
 */

// Core paper structure types
export type {
  BibliographicReference,
  Citation,
  Equation,
  Figure,
  PaperMetadata,
  PaperSection,
  ParsedPaper,
  ParseResult,
  ParserConfig,
  ParsingError,
  ParsingStats,
  SectionType,
  Table,
} from './paper';

// Parser interface types
export type {
  BaseParser,
  ExtendedParserOptions,
  ParserFactory,
  ParserOptions,
  PDFParser,
  ProgressCallback,
  TxtParser,
  WordParser,
} from './parsers';
