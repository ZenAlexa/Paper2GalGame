/**
 * Language Switcher Utility
 *
 * Provides functionality to switch between languages in multi-language WebGAL scripts
 */

import type { WebGALScript, WebGALLine, MultiLanguageContent } from '../types';

/**
 * Language switching utility class
 */
export class LanguageSwitcher {
  /**
   * Switch script to specific language
   */
  static switchScriptLanguage(
    script: WebGALScript,
    targetLanguage: 'zh' | 'jp' | 'en'
  ): WebGALScript {
    const switchedScript: WebGALScript = {
      ...script,
      metadata: {
        ...script.metadata,
        multiLanguage: {
          ...script.metadata.multiLanguage,
          currentLanguage: targetLanguage
        }
      },
      scenes: script.scenes.map(scene => ({
        ...scene,
        lines: scene.lines.map(line => this.switchLineLanguage(line, targetLanguage))
      }))
    };

    return switchedScript;
  }

  /**
   * Switch individual line to specific language
   */
  static switchLineLanguage(
    line: WebGALLine,
    targetLanguage: 'zh' | 'jp' | 'en'
  ): WebGALLine {
    if (line.command !== 'say' || !line.metadata?.isMultiLanguage) {
      return line;
    }

    try {
      // Parse multi-language content from params
      const multiLangContent = JSON.parse(line.params[0] || '{}') as MultiLanguageContent;

      // Check if speaker is multi-language content
      let multiLangSpeaker: MultiLanguageContent | null = null;
      try {
        if (typeof line.options?.speaker === 'string' && line.options?.speaker.includes('||')) {
          const [zh, jp, en] = line.options.speaker.split('||');
          multiLangSpeaker = { zh: zh || '', jp: jp || '', en: en || '' };
        } else if (typeof line.options?.speaker === 'object') {
          multiLangSpeaker = line.options.speaker as MultiLanguageContent;
        }
      } catch {
        multiLangSpeaker = null;
      }

      const finalContent = multiLangContent[targetLanguage] || line.params[0] || '';
      const finalSpeaker = multiLangSpeaker
        ? multiLangSpeaker[targetLanguage] || ''
        : (line.options?.speaker as string) || '';

      const switchedLine: WebGALLine = {
        ...line,
        params: [finalContent],
        options: {
          ...line.options,
          speaker: finalSpeaker
        },
        raw: this.reconstructWebGALLine(
          finalContent,
          finalSpeaker,
          (line.options?.vocal as string) || ''
        )
      };

      return switchedLine;
    } catch (error) {
      // Fallback to original line if parsing fails
      return line;
    }
  }

  /**
   * Extract multi-language content from script line
   */
  static extractMultiLanguageContent(line: WebGALLine): MultiLanguageContent | null {
    if (line.command !== 'say' || !line.metadata?.isMultiLanguage) {
      return null;
    }

    try {
      return JSON.parse(line.params[0] || '{}') as MultiLanguageContent;
    } catch {
      return null;
    }
  }

  /**
   * Get available languages in a script
   */
  static getAvailableLanguages(script: WebGALScript): ('zh' | 'jp' | 'en')[] {
    return script.metadata.multiLanguage.supportedLanguages || [];
  }

  /**
   * Check if script supports multi-language
   */
  static isMultiLanguageScript(script: WebGALScript): boolean {
    return (script.metadata.multiLanguage?.supportedLanguages?.length || 0) > 1;
  }

  /**
   * Validate script language completeness
   */
  static validateLanguageCompleteness(script: WebGALScript): {
    isComplete: boolean;
    missingLanguages: ('zh' | 'jp' | 'en')[];
    issues: string[];
  } {
    const expectedLanguages: ('zh' | 'jp' | 'en')[] = ['zh', 'jp', 'en'];
    const supportedLanguages = script.metadata.multiLanguage?.supportedLanguages || [];
    const missingLanguages = expectedLanguages.filter(lang => !supportedLanguages.includes(lang));
    const issues: string[] = [];

    // Check each dialogue line
    for (const scene of script.scenes) {
      for (const line of scene.lines) {
        if (line.command === 'say' && line.metadata?.isMultiLanguage) {
          const multiLangContent = this.extractMultiLanguageContent(line);
          if (multiLangContent) {
            for (const lang of expectedLanguages) {
              if (!multiLangContent[lang] || multiLangContent[lang].trim() === '') {
                issues.push(`Missing ${lang} content in line: ${line.raw.substring(0, 50)}...`);
              }
            }
          }
        }
      }
    }

    return {
      isComplete: missingLanguages.length === 0 && issues.length === 0,
      missingLanguages,
      issues
    };
  }

  /**
   * Generate language-specific WebGAL script export
   */
  static exportScriptForLanguage(
    script: WebGALScript,
    targetLanguage: 'zh' | 'jp' | 'en'
  ): string {
    const switchedScript = this.switchScriptLanguage(script, targetLanguage);

    let output = '';

    for (const scene of switchedScript.scenes) {
      output += `// Scene: ${scene.title}\n`;

      for (const line of scene.lines) {
        output += line.raw + '\n';
      }

      output += '\n';
    }

    return output;
  }

  /**
   * Generate translation quality report
   */
  static generateTranslationReport(script: WebGALScript): {
    totalLines: number;
    multiLanguageLines: number;
    averageQuality: Record<'zh' | 'jp' | 'en', number>;
    recommendations: string[];
  } {
    let totalLines = 0;
    let multiLanguageLines = 0;
    const qualityScores: Record<'zh' | 'jp' | 'en', number[]> = {
      zh: [],
      jp: [],
      en: []
    };
    const recommendations: string[] = [];

    for (const scene of script.scenes) {
      for (const line of scene.lines) {
        if (line.command === 'say') {
          totalLines++;

          if (line.metadata?.isMultiLanguage && line.metadata?.translationQuality) {
            multiLanguageLines++;
            const quality = line.metadata.translationQuality;

            if (quality.zh) qualityScores.zh.push(quality.zh);
            if (quality.jp) qualityScores.jp.push(quality.jp);
            if (quality.en) qualityScores.en.push(quality.en);

            // Add recommendations for low quality translations
            Object.entries(quality).forEach(([lang, score]) => {
              if (score < 0.8) {
                recommendations.push(
                  `Low quality ${lang.toUpperCase()} translation in: ${line.raw.substring(0, 50)}...`
                );
              }
            });
          }
        }
      }
    }

    const averageQuality = {
      zh: qualityScores.zh.length > 0 ?
        qualityScores.zh.reduce((a, b) => a + b, 0) / qualityScores.zh.length : 0,
      jp: qualityScores.jp.length > 0 ?
        qualityScores.jp.reduce((a, b) => a + b, 0) / qualityScores.jp.length : 0,
      en: qualityScores.en.length > 0 ?
        qualityScores.en.reduce((a, b) => a + b, 0) / qualityScores.en.length : 0
    };

    // Add general recommendations
    if (multiLanguageLines / totalLines < 0.8) {
      recommendations.push('Consider adding multi-language support to more dialogue lines');
    }

    if (averageQuality.jp < 0.9) {
      recommendations.push('Japanese translation quality could be improved for voice consistency');
    }

    return {
      totalLines,
      multiLanguageLines,
      averageQuality,
      recommendations
    };
  }

  /**
   * Reconstruct WebGAL line format
   */
  private static reconstructWebGALLine(
    content: string,
    speaker: string,
    vocal?: string
  ): string {
    let line = `say:${content}`;

    if (speaker) {
      line += ` -speaker=${speaker}`;
    }

    if (vocal) {
      line += ` -vocal=${vocal}`;
    }

    line += ';';

    return line;
  }
}