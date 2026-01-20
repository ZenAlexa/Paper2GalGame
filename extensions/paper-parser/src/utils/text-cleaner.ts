/**
 * Text Cleaning Utilities
 *
 * Collection of functions for cleaning and normalizing text content
 * extracted from various document formats.
 */

/**
 * Clean and normalize text content
 */
export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n') // Handle old Mac line endings
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize multiple line breaks
    .replace(/[ \t]+/g, ' ') // Normalize whitespace
    .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
    .replace(/[\u2000-\u200B\u2028-\u2029]/g, ' ') // Replace various Unicode spaces
    .trim();
}

/**
 * Remove formatting artifacts from extracted text
 */
export function removeFormattingArtifacts(text: string): string {
  return text
    .replace(/\f/g, '\n') // Form feed to newline
    .replace(/\v/g, '\n') // Vertical tab to newline
    .replace(/\u000C/g, '\n') // Form feed character
    .replace(/[\u0000-\u0008\u000B\u000E-\u001F]/g, '') // Control characters
    .replace(/\uFEFF/g, '') // Byte order mark
    .replace(/\u200E\u200F/g, ''); // Left-to-right and right-to-left marks
}

/**
 * Fix common OCR errors and character misrecognition
 */
export function fixOCRErrors(text: string): string {
  const corrections: Array<[RegExp, string]> = [
    // Common OCR misrecognitions
    [/\bl\b/g, 'I'], // lowercase l to uppercase I in context
    [/\b0\b/g, 'O'], // zero to O in context
    [/rn/g, 'm'], // rn to m
    [/vv/g, 'w'], // vv to w
    [/\bf\b/g, 'f'], // Ensure f is preserved

    // Fix ligatures
    [/ﬀ/g, 'ff'],
    [/ﬁ/g, 'fi'],
    [/ﬂ/g, 'fl'],
    [/ﬃ/g, 'ffi'],
    [/ﬄ/g, 'ffl'],

    // Fix quotation marks
    [/[""]/g, '"'],
    [/['']/g, "'"],
    [/[‚„]/g, ','],

    // Fix dashes
    [/[–—]/g, '-'],

    // Fix spacing around punctuation
    [/\s+([.,;:!?])/g, '$1'],
    [/([.,;:!?])\s*([a-zA-Z])/g, '$1 $2'],
  ];

  let correctedText = text;
  for (const [pattern, replacement] of corrections) {
    correctedText = correctedText.replace(pattern, replacement);
  }

  return correctedText;
}

/**
 * Normalize academic text formatting
 */
export function normalizeAcademicText(text: string): string {
  return text
    .replace(/(?:Figure|Fig\.)\s*(\d+)/gi, 'Figure $1') // Normalize figure references
    .replace(/(?:Table|Tab\.)\s*(\d+)/gi, 'Table $1') // Normalize table references
    .replace(/(?:Section|Sec\.)\s*(\d+)/gi, 'Section $1') // Normalize section references
    .replace(/(?:Equation|Eq\.)\s*(\d+)/gi, 'Equation $1') // Normalize equation references
    .replace(/\b(\d+)th\b/g, '$1th') // Normalize ordinals
    .replace(/\b(\d+)st\b/g, '$1st')
    .replace(/\b(\d+)nd\b/g, '$1nd')
    .replace(/\b(\d+)rd\b/g, '$1rd');
}

/**
 * Split text into paragraphs intelligently
 */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/) // Split on double line breaks
    .map((paragraph) => paragraph.replace(/\n/g, ' ').trim()) // Join lines within paragraphs
    .filter((paragraph) => paragraph.length > 0); // Remove empty paragraphs
}

/**
 * Split text into sentences
 */
export function splitIntoSentences(text: string): string[] {
  // Improved sentence splitting that handles academic text
  const sentences = text
    .replace(/([.!?])\s*([A-Z])/g, '$1|$2') // Mark sentence boundaries
    .replace(/([.!?])\s*$/g, '$1|') // Handle end of text
    .split('|')
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  // Post-process to handle false positives
  const cleanedSentences: string[] = [];
  let currentSentence = '';

  for (const sentence of sentences) {
    currentSentence += (currentSentence ? ' ' : '') + sentence;

    // Check if this looks like a complete sentence
    if (isCompleteSentence(currentSentence)) {
      cleanedSentences.push(currentSentence);
      currentSentence = '';
    }
  }

  // Add any remaining text as a sentence
  if (currentSentence.trim()) {
    cleanedSentences.push(currentSentence);
  }

  return cleanedSentences;
}

/**
 * Check if a string appears to be a complete sentence
 */
function isCompleteSentence(text: string): boolean {
  const trimmed = text.trim();

  // Must have some minimum length
  if (trimmed.length < 10) return false;

  // Should end with sentence punctuation
  if (!/[.!?]$/.test(trimmed)) return false;

  // Should not end with common abbreviations
  const commonAbbreviations = /\b(?:Dr|Mr|Mrs|Ms|Prof|vs|etc|al|Fig|Tab|Eq|Sec|Vol|No|pp|cf|ie|eg|et)\.$$/i;
  if (commonAbbreviations.test(trimmed)) return false;

  // Should contain at least one word character
  if (!/\w/.test(trimmed)) return false;

  return true;
}

/**
 * Detect and preserve code blocks in text
 */
export function preserveCodeBlocks(text: string): { text: string; codeBlocks: string[] } {
  const codeBlocks: string[] = [];
  const placeholder = '___CODE_BLOCK_PLACEHOLDER___';

  let processedText = text;

  // Detect fenced code blocks
  processedText = processedText.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `${placeholder}${codeBlocks.length - 1}`;
  });

  // Detect indented code blocks (4+ spaces)
  processedText = processedText.replace(/\n((?: {4}|\t)[^\n]*(?:\n(?: {4}|\t)[^\n]*)*)/g, (_match, code) => {
    codeBlocks.push(code);
    return `\n${placeholder}${codeBlocks.length - 1}`;
  });

  return { text: processedText, codeBlocks };
}

/**
 * Restore code blocks in processed text
 */
export function restoreCodeBlocks(text: string, codeBlocks: string[]): string {
  const placeholder = '___CODE_BLOCK_PLACEHOLDER___';
  let restoredText = text;

  codeBlocks.forEach((codeBlock, index) => {
    restoredText = restoredText.replace(`${placeholder}${index}`, codeBlock);
  });

  return restoredText;
}

/**
 * Remove excessive whitespace while preserving structure
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
    .replace(/\n[ \t]+/g, '\n') // Remove leading whitespace on lines
    .replace(/[ \t]+\n/g, '\n') // Remove trailing whitespace on lines
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks to 2
    .trim();
}

/**
 * Extract and clean headers from text
 */
export function extractHeaders(text: string): Array<{ text: string; level: number; position: number }> {
  const lines = text.split('\n');
  const headers: Array<{ text: string; level: number; position: number }> = [];
  let position = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      position += line.length + 1;
      continue;
    }

    // Check for numbered headers
    const numberedMatch = trimmed.match(/^(\d+(?:\.\d+)*)\.\s*(.+)$/);
    if (numberedMatch) {
      const level = numberedMatch[1].split('.').length;
      headers.push({
        text: numberedMatch[2],
        level,
        position,
      });
    }

    // Check for all-caps headers (likely section titles)
    else if (trimmed.length > 3 && trimmed.length < 100 && trimmed === trimmed.toUpperCase()) {
      headers.push({
        text: trimmed,
        level: 1,
        position,
      });
    }

    // Check for title case headers
    else if (isTitleCase(trimmed) && trimmed.length > 3 && trimmed.length < 100) {
      headers.push({
        text: trimmed,
        level: 2,
        position,
      });
    }

    position += line.length + 1;
  }

  return headers;
}

/**
 * Check if text is in title case
 */
function isTitleCase(text: string): boolean {
  const words = text.split(/\s+/);
  if (words.length === 0) return false;

  // Most words should start with capital letter
  const capitalizedWords = words.filter((word) => /^[A-Z]/.test(word));
  return capitalizedWords.length / words.length > 0.6;
}

/**
 * Clean text extracted from PDFs (handles common PDF extraction issues)
 */
export function cleanPDFText(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Fix missing spaces between words
    .replace(/(\d)([A-Za-z])/g, '$1 $2') // Fix missing spaces after numbers
    .replace(/([A-Za-z])(\d)/g, '$1 $2') // Fix missing spaces before numbers
    .replace(/-\s*\n\s*/g, '') // Fix hyphenated words split across lines
    .replace(/\n(?=[a-z])/g, ' ') // Join lines that don't start with capital
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Clean text extracted from Word documents
 */
export function cleanWordText(text: string): string {
  return (
    text
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Removing Word document control characters
      .replace(/\x07/g, '') // Remove bell characters
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Removing Word document control characters
      .replace(/\x08/g, '') // Remove backspace characters
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Removing Word document control characters
      .replace(/\x0C/g, '\n') // Convert form feeds to newlines
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Removing Word document control characters
      .replace(/\x1F/g, '') // Remove unit separator
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Removing Word document control characters
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove other control characters
      .trim()
  );
}

/**
 * Comprehensive text cleaning pipeline
 */
export function comprehensiveTextClean(text: string, sourceType: 'pdf' | 'word' | 'txt' = 'txt'): string {
  let cleanedText = text;

  // Apply source-specific cleaning
  switch (sourceType) {
    case 'pdf':
      cleanedText = cleanPDFText(cleanedText);
      break;
    case 'word':
      cleanedText = cleanWordText(cleanedText);
      break;
    case 'txt':
      // Minimal cleaning for plain text
      break;
  }

  // Apply general cleaning
  cleanedText = removeFormattingArtifacts(cleanedText);
  cleanedText = fixOCRErrors(cleanedText);
  cleanedText = normalizeAcademicText(cleanedText);
  cleanedText = normalizeWhitespace(cleanedText);
  cleanedText = cleanText(cleanedText);

  return cleanedText;
}
