/**
 * Paper Segmentation Strategy
 *
 * Intelligent segmentation of papers for incremental generation
 * Optimizes for 50% completion game start
 */

import type { MultiLanguageContent } from '../types/character';
import type { IncrementalConfig, PaperSection, PaperSegment, ParsedPaper, SectionType, SegmentType } from './types';

/**
 * Default segment configuration
 */
const DEFAULT_CONFIG: IncrementalConfig = {
  minStartPercentage: 50,
  enableBackgroundGeneration: true,
  backgroundTaskDelay: 1000,
  maxConcurrentTasks: 2,
  enableWaitingDialogues: true,
  retryFailedSegments: true,
  maxRetryAttempts: 3,
};

/**
 * Segment title definitions (tri-language)
 */
const SEGMENT_TITLES: Record<SegmentType, MultiLanguageContent> = {
  intro: {
    zh: '开场介绍',
    jp: 'オープニング紹介',
    en: 'Opening Introduction',
  },
  methods: {
    zh: '研究方法',
    jp: '研究方法',
    en: 'Research Methods',
  },
  results: {
    zh: '研究结果',
    jp: '研究結果',
    en: 'Research Results',
  },
  conclusion: {
    zh: '结论总结',
    jp: '結論まとめ',
    en: 'Conclusions',
  },
  extra: {
    zh: '附加内容',
    jp: '追加コンテンツ',
    en: 'Additional Content',
  },
};

/**
 * Segment description definitions (tri-language)
 */
const SEGMENT_DESCRIPTIONS: Record<SegmentType, MultiLanguageContent> = {
  intro: {
    zh: '了解论文的背景和研究目标',
    jp: '論文の背景と研究目的を理解する',
    en: 'Understand the background and research objectives',
  },
  methods: {
    zh: '深入了解研究采用的方法和技术',
    jp: '研究で採用された方法と技術を深く理解する',
    en: 'Deep dive into methods and techniques used',
  },
  results: {
    zh: '探索研究发现的主要结果',
    jp: '研究で発見された主な結果を探る',
    en: 'Explore the key findings of the research',
  },
  conclusion: {
    zh: '总结研究意义和未来展望',
    jp: '研究の意義と今後の展望をまとめる',
    en: 'Summarize significance and future directions',
  },
  extra: {
    zh: '补充材料和深入讨论',
    jp: '補足資料と詳細な議論',
    en: 'Supplementary materials and in-depth discussion',
  },
};

/**
 * Section type to segment type mapping
 */
const SECTION_TO_SEGMENT: Record<SectionType, SegmentType> = {
  title: 'intro',
  abstract: 'intro',
  introduction: 'intro',
  methods: 'methods',
  results: 'results',
  discussion: 'conclusion',
  conclusion: 'conclusion',
  references: 'extra',
  acknowledgments: 'extra',
  appendix: 'extra',
  other: 'extra',
};

/**
 * Paper Segmentation Strategy
 *
 * Automatically segments papers for optimal incremental generation
 */
export class PaperSegmentationStrategy {
  private config: IncrementalConfig;

  constructor(config: Partial<IncrementalConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Segment a parsed paper into incremental generation units
   */
  segmentPaper(paperData: ParsedPaper): PaperSegment[] {
    const segments: PaperSegment[] = [];
    const sectionGroups = this.groupSectionsBySegment(paperData.sections);

    // Segment 1: Introduction (Priority 1 - must generate first)
    const introSections = sectionGroups.get('intro') || [];
    if (introSections.length > 0) {
      segments.push(this.createSegment('intro', 1, introSections, true));
    }

    // Segment 2: Methods (Priority 2 - must generate first)
    const methodsSections = sectionGroups.get('methods') || [];
    if (methodsSections.length > 0) {
      segments.push(this.createSegment('methods', 2, methodsSections, true));
    }

    // Segment 3: Results (Priority 3 - can generate in background)
    const resultsSections = sectionGroups.get('results') || [];
    if (resultsSections.length > 0) {
      segments.push(this.createSegment('results', 3, resultsSections, false));
    }

    // Segment 4: Conclusion (Priority 4 - can generate in background)
    const conclusionSections = sectionGroups.get('conclusion') || [];
    if (conclusionSections.length > 0) {
      segments.push(this.createSegment('conclusion', 4, conclusionSections, false));
    }

    // Segment 5: Extra content (Priority 5 - optional)
    const extraSections = sectionGroups.get('extra') || [];
    if (extraSections.length > 0 && this.shouldIncludeExtras(extraSections)) {
      segments.push(this.createSegment('extra', 5, extraSections, false));
    }

    // Validate segmentation
    this.validateSegmentation(segments);

    return segments;
  }

  /**
   * Group paper sections by segment type
   */
  private groupSectionsBySegment(sections: PaperSection[]): Map<SegmentType, PaperSection[]> {
    const groups = new Map<SegmentType, PaperSection[]>();

    for (const section of sections) {
      const segmentType = SECTION_TO_SEGMENT[section.type] || 'extra';

      if (!groups.has(segmentType)) {
        groups.set(segmentType, []);
      }
      groups.get(segmentType)?.push(section);
    }

    return groups;
  }

  /**
   * Create a segment from sections
   */
  private createSegment(
    type: SegmentType,
    priority: number,
    sections: PaperSection[],
    mustGenerateFirst: boolean
  ): PaperSegment {
    const estimatedDialogues = this.estimateDialogueCount(sections);

    return {
      id: `segment_${type}`,
      priority,
      content: sections,
      estimatedDialogues,
      mustGenerateFirst,
      type,
      title: SEGMENT_TITLES[type],
      description: SEGMENT_DESCRIPTIONS[type],
    };
  }

  /**
   * Estimate dialogue count based on content
   */
  private estimateDialogueCount(sections: PaperSection[]): number {
    let totalWords = 0;

    for (const section of sections) {
      totalWords += this.countWords(section.content);

      // Include subsection content
      if (section.subsections) {
        for (const subsection of section.subsections) {
          totalWords += this.countWords(subsection.content);
        }
      }
    }

    // Roughly 1 dialogue per 50 words of content
    // With minimum of 4 and maximum of 20 per segment
    const estimated = Math.floor(totalWords / 50);
    return Math.max(4, Math.min(20, estimated));
  }

  /**
   * Count words in text (handles multiple languages)
   */
  private countWords(text: string): number {
    // Remove LaTeX formulas
    const cleanText = text.replace(/\$\$?[^$]+\$\$?/g, ' formula ');

    // Count words (handles CJK characters as well)
    const englishWords = cleanText.match(/[a-zA-Z]+/g)?.length || 0;
    const cjkChars = cleanText.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g)?.length || 0;

    // CJK characters roughly equal to 0.5 words each
    return englishWords + Math.floor(cjkChars * 0.5);
  }

  /**
   * Determine if extra sections should be included
   */
  private shouldIncludeExtras(sections: PaperSection[]): boolean {
    // Include extras if they have substantial content
    const totalContent = sections.reduce((sum, s) => sum + s.content.length, 0);
    return totalContent > 500;
  }

  /**
   * Validate segmentation meets requirements
   */
  private validateSegmentation(segments: PaperSegment[]): void {
    // Ensure at least one must-generate-first segment
    const mustGenerateFirst = segments.filter((s) => s.mustGenerateFirst);
    if (mustGenerateFirst.length === 0 && segments.length > 0) {
      // Force first segment to be must-generate-first
      const firstSegment = segments[0];
      if (firstSegment) {
        firstSegment.mustGenerateFirst = true;
      }
    }

    // Calculate total estimated dialogues
    const totalDialogues = segments.reduce((sum, s) => sum + s.estimatedDialogues, 0);
    const mustGenerateDialogues = mustGenerateFirst.reduce((sum, s) => sum + s.estimatedDialogues, 0);

    // Ensure must-generate-first segments are >= 50% of content
    if (totalDialogues > 0) {
      const mustGeneratePercentage = (mustGenerateDialogues / totalDialogues) * 100;

      if (mustGeneratePercentage < this.config.minStartPercentage) {
        // Adjust by marking next priority segment as must-generate-first
        const sortedSegments = [...segments].sort((a, b) => a.priority - b.priority);
        for (const segment of sortedSegments) {
          if (!segment.mustGenerateFirst) {
            segment.mustGenerateFirst = true;
            const newPercentage = ((mustGenerateDialogues + segment.estimatedDialogues) / totalDialogues) * 100;
            if (newPercentage >= this.config.minStartPercentage) {
              break;
            }
          }
        }
      }
    }
  }

  /**
   * Get segments that must be generated before game start
   */
  getPrioritySegments(segments: PaperSegment[]): PaperSegment[] {
    return segments.filter((s) => s.mustGenerateFirst).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get segments that can be generated in background
   */
  getBackgroundSegments(segments: PaperSegment[]): PaperSegment[] {
    return segments.filter((s) => !s.mustGenerateFirst).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Calculate estimated time for segment generation
   */
  estimateGenerationTime(segment: PaperSegment): number {
    // Estimate 3 seconds per dialogue line
    return segment.estimatedDialogues * 3;
  }

  /**
   * Calculate total estimated time for all segments
   */
  estimateTotalTime(segments: PaperSegment[]): number {
    return segments.reduce((sum, s) => sum + this.estimateGenerationTime(s), 0);
  }

  /**
   * Get configuration
   */
  getConfig(): IncrementalConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<IncrementalConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Create default segmentation strategy
 */
export function createSegmentationStrategy(config?: Partial<IncrementalConfig>): PaperSegmentationStrategy {
  return new PaperSegmentationStrategy(config);
}
