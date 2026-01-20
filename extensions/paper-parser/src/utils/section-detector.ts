/**
 * Section Detection Utilities
 *
 * Advanced algorithms for detecting and classifying sections in academic papers.
 */

import type { SectionType } from '../types';

/**
 * Section detection result
 */
export interface SectionDetectionResult {
  type: SectionType;
  confidence: number;
  indicators: string[];
}

/**
 * Context for section detection
 */
export interface DetectionContext {
  previousSection?: SectionType;
  documentPosition: number; // 0-1, position in document
  lineNumber: number;
  isNumbered: boolean;
  hasSpecialFormatting: boolean;
}

/**
 * Advanced section detector with context awareness
 */
export class SectionDetector {
  private readonly patterns: Map<SectionType, RegExp[]> = new Map();
  private readonly keywords: Map<SectionType, string[]> = new Map();
  private readonly weights: Map<SectionType, number> = new Map();

  constructor() {
    this.initializePatterns();
    this.initializeKeywords();
    this.initializeWeights();
  }

  /**
   * Detect section type for a given text with context
   */
  detectSection(text: string, context: DetectionContext, language: 'en' | 'zh' | 'ja' = 'en'): SectionDetectionResult {
    const candidates = this.getAllCandidates(text, language);
    const contextScores = this.calculateContextScores(candidates, context);

    // Combine pattern matching with context
    const finalScores = candidates.map((candidate) => ({
      ...candidate,
      confidence: candidate.confidence * 0.7 + (contextScores.get(candidate.type) || 0) * 0.3,
    }));

    // Sort by confidence and return best match
    finalScores.sort((a, b) => b.confidence - a.confidence);

    return (
      finalScores[0] || {
        type: 'other',
        confidence: 0,
        indicators: [],
      }
    );
  }

  /**
   * Detect multiple potential sections with confidence scores
   */
  detectMultipleSections(
    text: string,
    context: DetectionContext,
    language: 'en' | 'zh' | 'ja' = 'en',
    maxResults: number = 3
  ): SectionDetectionResult[] {
    const candidates = this.getAllCandidates(text, language);
    const contextScores = this.calculateContextScores(candidates, context);

    const finalScores = candidates
      .map((candidate) => ({
        ...candidate,
        confidence: candidate.confidence * 0.7 + (contextScores.get(candidate.type) || 0) * 0.3,
      }))
      .filter((result) => result.confidence > 0.3) // Filter low-confidence results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxResults);

    return finalScores;
  }

  /**
   * Initialize section patterns for different languages
   */
  private initializePatterns(): void {
    // English patterns
    this.patterns.set('title', [/^[A-Z][A-Za-z\s\-:,]+$/, /^.{10,100}$/]);

    this.patterns.set('abstract', [/^abstract$/i, /^summary$/i, /^executive\s+summary$/i]);

    this.patterns.set('introduction', [
      /^introduction$/i,
      /^1\.?\s*introduction$/i,
      /^background$/i,
      /^overview$/i,
      /^1\.?\s*background$/i,
    ]);

    this.patterns.set('methods', [
      /^methods?$/i,
      /^methodology$/i,
      /^approach$/i,
      /^materials?\s+and\s+methods?$/i,
      /^\d+\.?\s*methods?$/i,
      /^experimental\s+setup$/i,
    ]);

    this.patterns.set('results', [
      /^results?$/i,
      /^findings?$/i,
      /^experiments?$/i,
      /^\d+\.?\s*results?$/i,
      /^experimental\s+results?$/i,
    ]);

    this.patterns.set('discussion', [
      /^discussion$/i,
      /^analysis$/i,
      /^\d+\.?\s*discussion$/i,
      /^results?\s+and\s+discussion$/i,
    ]);

    this.patterns.set('conclusion', [
      /^conclusions?$/i,
      /^summary$/i,
      /^final\s+remarks?$/i,
      /^\d+\.?\s*conclusions?$/i,
      /^concluding\s+remarks?$/i,
    ]);

    this.patterns.set('references', [/^references?$/i, /^bibliography$/i, /^works?\s+cited$/i, /^citations?$/i]);

    this.patterns.set('acknowledgments', [/^acknowledgments?$/i, /^acknowledgements?$/i, /^thanks$/i]);

    // Chinese patterns
    const chinesePatterns = new Map([
      ['abstract', [/^摘\s*要$/, /^概\s*述$/, /^内容提要$/]],
      ['introduction', [/^引\s*言$/, /^前\s*言$/, /^绪\s*论$/, /^背景$/, /^\d+\.?\s*引言$/]],
      ['methods', [/^方\s*法$/, /^研究方法$/, /^实验方法$/, /^\d+\.?\s*方法$/]],
      ['results', [/^结\s*果$/, /^实验结果$/, /^研究结果$/, /^\d+\.?\s*结果$/]],
      ['discussion', [/^讨\s*论$/, /^分\s*析$/, /^\d+\.?\s*讨论$/]],
      ['conclusion', [/^结\s*论$/, /^总\s*结$/, /^结语$/, /^\d+\.?\s*结论$/]],
      ['references', [/^参考文献$/, /^引用文献$/, /^文献$/]],
      ['acknowledgments', [/^致\s*谢$/, /^鸣\s*谢$/, /^感谢$/]],
    ]);

    // Merge Chinese patterns
    for (const [type, patterns] of chinesePatterns) {
      const existingPatterns = this.patterns.get(type as SectionType) || [];
      this.patterns.set(type as SectionType, [...existingPatterns, ...patterns]);
    }
  }

  /**
   * Initialize section keywords for semantic matching
   */
  private initializeKeywords(): void {
    this.keywords.set('introduction', [
      'background',
      'motivation',
      'overview',
      'purpose',
      'objective',
      '背景',
      '动机',
      '目的',
      '目标',
    ]);

    this.keywords.set('methods', [
      'methodology',
      'approach',
      'procedure',
      'technique',
      'algorithm',
      'experimental',
      'setup',
      'implementation',
      '方法',
      '实验',
      '算法',
      '技术',
    ]);

    this.keywords.set('results', [
      'findings',
      'outcomes',
      'data',
      'performance',
      'evaluation',
      'measurements',
      'observations',
      '结果',
      '发现',
      '数据',
      '性能',
    ]);

    this.keywords.set('discussion', [
      'analysis',
      'interpretation',
      'implications',
      'limitations',
      'comparison',
      'significance',
      '分析',
      '讨论',
      '意义',
      '限制',
    ]);

    this.keywords.set('conclusion', [
      'summary',
      'conclusions',
      'future work',
      'contributions',
      'implications',
      'recommendations',
      '总结',
      '结论',
      '贡献',
      '未来',
    ]);
  }

  /**
   * Initialize section type weights (typical order in academic papers)
   */
  private initializeWeights(): void {
    this.weights.set('title', 0.1);
    this.weights.set('abstract', 0.15);
    this.weights.set('introduction', 0.2);
    this.weights.set('methods', 0.35);
    this.weights.set('results', 0.55);
    this.weights.set('discussion', 0.75);
    this.weights.set('conclusion', 0.9);
    this.weights.set('references', 0.95);
    this.weights.set('acknowledgments', 0.93);
  }

  /**
   * Get all section candidates with confidence scores
   */
  private getAllCandidates(text: string, _language: 'en' | 'zh' | 'ja'): SectionDetectionResult[] {
    const candidates: SectionDetectionResult[] = [];

    for (const [sectionType, patterns] of this.patterns) {
      const result = this.matchPatterns(text, sectionType, patterns);
      if (result.confidence > 0) {
        candidates.push(result);
      }
    }

    // Add keyword-based detection
    for (const [sectionType, keywords] of this.keywords) {
      const result = this.matchKeywords(text, sectionType, keywords);
      if (result.confidence > 0) {
        // Avoid duplicates, but boost confidence if both pattern and keyword match
        const existing = candidates.find((c) => c.type === sectionType);
        if (existing) {
          existing.confidence = Math.min(1.0, existing.confidence + result.confidence * 0.3);
          existing.indicators.push(...result.indicators);
        } else {
          candidates.push(result);
        }
      }
    }

    return candidates;
  }

  /**
   * Match text against section patterns
   */
  private matchPatterns(text: string, sectionType: SectionType, patterns: RegExp[]): SectionDetectionResult {
    let maxConfidence = 0;
    const indicators: string[] = [];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        let confidence = 0.8; // Base confidence for pattern match

        // Boost confidence for exact matches
        if (pattern.test(text.trim().toLowerCase())) {
          confidence += 0.15;
        }

        // Boost confidence for numbered sections
        if (/^\d+\.?\s*/.test(text)) {
          confidence += 0.05;
        }

        maxConfidence = Math.max(maxConfidence, confidence);
        indicators.push(`Pattern: ${pattern.source}`);
      }
    }

    return {
      type: sectionType,
      confidence: Math.min(1.0, maxConfidence),
      indicators,
    };
  }

  /**
   * Match text against section keywords
   */
  private matchKeywords(text: string, sectionType: SectionType, keywords: string[]): SectionDetectionResult {
    const lowerText = text.toLowerCase();
    let matchCount = 0;
    const indicators: string[] = [];

    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchCount++;
        indicators.push(`Keyword: ${keyword}`);
      }
    }

    const confidence = Math.min(0.7, (matchCount / keywords.length) * 0.7);

    return {
      type: sectionType,
      confidence,
      indicators,
    };
  }

  /**
   * Calculate context-based scores for section candidates
   */
  private calculateContextScores(
    candidates: SectionDetectionResult[],
    context: DetectionContext
  ): Map<SectionType, number> {
    const scores = new Map<SectionType, number>();

    for (const candidate of candidates) {
      let score = 0;

      // Position-based scoring
      const expectedPosition = this.weights.get(candidate.type) || 0.5;
      const positionDifference = Math.abs(context.documentPosition - expectedPosition);
      score += Math.max(0, 0.3 - positionDifference); // Max 0.3 points for good positioning

      // Sequential logic scoring
      if (context.previousSection) {
        score += this.getSequentialScore(context.previousSection, candidate.type);
      }

      // Early document position bonus for title/abstract
      if (context.documentPosition < 0.1) {
        if (candidate.type === 'title') score += 0.2;
        if (candidate.type === 'abstract') score += 0.15;
      }

      // Late document position bonus for conclusion/references
      if (context.documentPosition > 0.8) {
        if (candidate.type === 'conclusion') score += 0.2;
        if (candidate.type === 'references') score += 0.25;
        if (candidate.type === 'acknowledgments') score += 0.15;
      }

      // Numbering bonus
      if (context.isNumbered && this.isTypicallyNumbered(candidate.type)) {
        score += 0.1;
      }

      scores.set(candidate.type, Math.min(1.0, score));
    }

    return scores;
  }

  /**
   * Get sequential score based on typical paper organization
   */
  private getSequentialScore(previous: SectionType, current: SectionType): number {
    const sequences = new Map([
      ['title', ['abstract']],
      ['abstract', ['introduction']],
      ['introduction', ['methods', 'background']],
      ['methods', ['results', 'experiments']],
      ['results', ['discussion', 'analysis']],
      ['discussion', ['conclusion']],
      ['conclusion', ['references', 'acknowledgments']],
      ['references', ['acknowledgments']],
      ['acknowledgments', []],
    ]);

    const expectedNext = sequences.get(previous) || [];
    return expectedNext.includes(current) ? 0.2 : 0;
  }

  /**
   * Check if a section type is typically numbered
   */
  private isTypicallyNumbered(type: SectionType): boolean {
    return ['introduction', 'methods', 'results', 'discussion', 'conclusion'].includes(type);
  }

  /**
   * Check if text looks like a section header
   */
  static isLikelyHeader(text: string): boolean {
    const trimmed = text.trim();

    // Length check (headers are usually short)
    if (trimmed.length < 3 || trimmed.length > 200) {
      return false;
    }

    // Should not end with period (usually)
    if (trimmed.endsWith('.') && !trimmed.match(/^\d+\./)) {
      return false;
    }

    // Should not be all lowercase
    if (trimmed === trimmed.toLowerCase() && trimmed.length > 10) {
      return false;
    }

    // Positive indicators
    const positiveIndicators = [
      /^\d+\.?\s+/, // Starts with number
      /^[A-Z][A-Z\s]+$/, // All caps
      /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/, // Title case
      /^(Abstract|Introduction|Methods|Results|Discussion|Conclusion|References)/i,
    ];

    return positiveIndicators.some((pattern) => pattern.test(trimmed));
  }

  /**
   * Estimate confidence adjustment based on formatting
   */
  static getFormattingBonus(text: string): number {
    let bonus = 0;

    // Numbering
    if (/^\d+\.?\s*/.test(text)) bonus += 0.1;

    // All caps
    if (text === text.toUpperCase() && text.length > 3) bonus += 0.15;

    // Title case
    if (SectionDetector.isTitleCase(text)) bonus += 0.1;

    // Bold indicators (if preserved in text)
    if (text.includes('**') || text.includes('__')) bonus += 0.05;

    return Math.min(0.3, bonus); // Cap at 0.3
  }

  /**
   * Check if text is in title case
   */
  private static isTitleCase(text: string): boolean {
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    if (words.length === 0) return false;

    const capitalizedWords = words.filter((word) => /^[A-Z]/.test(word));
    return capitalizedWords.length / words.length > 0.6;
  }
}

/**
 * Default section detector instance
 */
export const defaultSectionDetector = new SectionDetector();
