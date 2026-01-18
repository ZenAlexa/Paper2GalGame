/**
 * Paper Parser Types Barrel Export
 *
 * Centralized export for all type definitions used in the paper parser module.
 */

// Core paper structure types
export type {
  SectionType,
  Figure,
  Table,
  Equation,
  Citation,
  BibliographicReference,
  PaperSection,
  PaperMetadata,
  ParsingStats,
  ParsedPaper,
  ParsingError,
  ParseResult,
  ParserConfig
} from './paper';

// Parser interface types
export type {
  BaseParser,
  PDFParser,
  WordParser,
  TxtParser,
  ParserFactory,
  ParserOptions,
  ExtendedParserOptions,
  ProgressCallback
} from './parsers';