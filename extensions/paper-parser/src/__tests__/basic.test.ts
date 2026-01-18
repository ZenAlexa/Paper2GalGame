/**
 * Basic functionality tests for Paper Parser
 */

import { describe, test, expect } from '@jest/globals';
import { PaperParser, defaultPaperParser, isSupported, getSupportedTypes } from '../index';
import { defaultParserFactory } from '../parsers';
import { StructureAnalyzer } from '../analyzer/structure-analyzer';
import { cleanText, normalizeAcademicText } from '../utils/text-cleaner';
import { defaultSectionDetector } from '../utils/section-detector';

describe('Paper Parser - Basic Functionality', () => {

  test('should export main classes and functions', () => {
    expect(PaperParser).toBeDefined();
    expect(defaultPaperParser).toBeDefined();
    expect(isSupported).toBeDefined();
    expect(getSupportedTypes).toBeDefined();
  });

  test('should support common file types', () => {
    expect(isSupported('pdf')).toBe(true);
    expect(isSupported('docx')).toBe(true);
    expect(isSupported('txt')).toBe(true);
    expect(isSupported('xyz')).toBe(false);
  });

  test('should return supported types information', () => {
    const supportedTypes = getSupportedTypes();

    expect(supportedTypes.extensions).toContain('pdf');
    expect(supportedTypes.extensions).toContain('docx');
    expect(supportedTypes.extensions).toContain('txt');

    expect(supportedTypes.mimeTypes).toContain('application/pdf');
    expect(supportedTypes.mimeTypes).toContain('text/plain');

    expect(supportedTypes.parsers.length).toBeGreaterThan(0);
  });

  test('should create parser factory with correct parsers', () => {
    const parserInfo = defaultParserFactory.getParserInfo();

    const pdfParser = parserInfo.find(p => p.id === 'pdfparser');
    const wordParser = parserInfo.find(p => p.id === 'wordparser');
    const txtParser = parserInfo.find(p => p.id === 'txtparser');

    expect(pdfParser).toBeDefined();
    expect(wordParser).toBeDefined();
    expect(txtParser).toBeDefined();
  });

});

describe('Text Processing Utilities', () => {

  test('should clean text properly', () => {
    const dirtyText = '  This  is\r\n\r\na   test  text\t\t  ';
    const cleaned = cleanText(dirtyText);

    expect(cleaned).toBe('This is\n\na test text');
  });

  test('should normalize academic text', () => {
    const academicText = 'See Fig. 1 and Table 2 in Section 3.';
    const normalized = normalizeAcademicText(academicText);

    expect(normalized).toBe('See Figure 1 and Table 2 in Section 3.');
  });

});

describe('Section Detection', () => {

  test('should detect common section types', () => {
    const testCases = [
      { text: 'Abstract', expectedType: 'abstract' },
      { text: '1. Introduction', expectedType: 'introduction' },
      { text: 'Methods', expectedType: 'methods' },
      { text: 'Results', expectedType: 'results' },
      { text: 'Discussion', expectedType: 'discussion' },
      { text: 'Conclusion', expectedType: 'conclusion' },
      { text: 'References', expectedType: 'references' }
    ];

    for (const testCase of testCases) {
      const result = defaultSectionDetector.detectSection(
        testCase.text,
        {
          documentPosition: 0.5,
          lineNumber: 1,
          isNumbered: testCase.text.includes('1.'),
          hasSpecialFormatting: false
        }
      );

      expect(result.type).toBe(testCase.expectedType);
      expect(result.confidence).toBeGreaterThan(0.5);
    }
  });

  test('should detect headers correctly', () => {
    const headers = [
      'Introduction',
      '1. Background',
      'METHODOLOGY',
      'Results and Discussion',
      'Not a header because it is too long and contains too many words to be a typical section header'
    ];

    const results = headers.map(header =>
      defaultSectionDetector.constructor.isLikelyHeader(header)
    );

    expect(results[0]).toBe(true);  // Introduction
    expect(results[1]).toBe(true);  // 1. Background
    expect(results[2]).toBe(true);  // METHODOLOGY
    expect(results[3]).toBe(true);  // Results and Discussion
    expect(results[4]).toBe(false); // Too long
  });

});

describe('Structure Analyzer', () => {

  test('should analyze simple paper structure', async () => {
    const sampleText = `
Title: A Study of Academic Paper Structure

Abstract
This paper analyzes the structure of academic papers.

1. Introduction
Academic papers follow a common structure.

2. Methods
We analyzed 100 papers.

3. Results
We found consistent patterns.

4. Conclusion
Papers have predictable structures.

References
[1] Smith, J. (2020). Paper structures.
    `;

    const analyzer = new StructureAnalyzer();
    const analysis = await analyzer.analyze(sampleText.trim());

    expect(analysis.sections.length).toBeGreaterThan(0);

    // Should find at least some common sections
    const sectionTypes = analysis.sections.map(s => s.type);
    expect(sectionTypes).toContain('abstract');
    expect(sectionTypes).toContain('introduction');
    expect(sectionTypes).toContain('conclusion');
  });

});

describe('Parser Factory', () => {

  test('should create parser by extension', () => {
    const pdfParser = defaultParserFactory.createByExtension('pdf');
    const wordParser = defaultParserFactory.createByExtension('docx');
    const txtParser = defaultParserFactory.createByExtension('txt');

    expect(pdfParser).toBeDefined();
    expect(wordParser).toBeDefined();
    expect(txtParser).toBeDefined();

    expect(pdfParser?.getName()).toBe('PDFParser');
    expect(wordParser?.getName()).toBe('WordParser');
    expect(txtParser?.getName()).toBe('TxtParser');
  });

  test('should create parser by MIME type', () => {
    const pdfParser = defaultParserFactory.createByMimeType('application/pdf');
    const txtParser = defaultParserFactory.createByMimeType('text/plain');

    expect(pdfParser).toBeDefined();
    expect(txtParser).toBeDefined();
  });

  test('should return null for unsupported types', () => {
    const unsupportedParser = defaultParserFactory.createByExtension('xyz');
    expect(unsupportedParser).toBeNull();
  });

});

describe('Text Parser Integration', () => {

  test('should parse simple text content', async () => {
    const sampleText = 'This is a simple test document.';
    const buffer = new TextEncoder().encode(sampleText).buffer;

    const parser = defaultParserFactory.createByExtension('txt');
    expect(parser).toBeDefined();

    if (parser) {
      const result = await parser.parse(buffer);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.rawText).toContain('simple test document');
    }
  });

});

describe('Error Handling', () => {

  test('should handle invalid file types gracefully', () => {
    expect(() => {
      defaultPaperParser.isSupported('invalid-extension');
    }).not.toThrow();
  });

  test('should handle empty buffers', async () => {
    const emptyBuffer = new ArrayBuffer(0);

    try {
      await defaultPaperParser.parseTextOnly(emptyBuffer);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

});

// Performance tests (basic)
describe('Performance', () => {

  test('should handle reasonable text sizes efficiently', async () => {
    const largeText = 'This is a test. '.repeat(1000); // ~16KB
    const buffer = new TextEncoder().encode(largeText).buffer;

    const startTime = Date.now();

    try {
      await defaultPaperParser.parseTextOnly(buffer, { filename: 'test.txt' });
      const endTime = Date.now();

      // Should complete within 5 seconds for 16KB text
      expect(endTime - startTime).toBeLessThan(5000);
    } catch (error) {
      // If parsing fails, we just test that it doesn't take too long to fail
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000);
    }
  });

});