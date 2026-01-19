/**
 * WebGAL Script Validator
 *
 * Validates generated scripts for WebGAL compatibility,
 * character consistency, and educational quality
 */

import { CHARACTER_CONFIGS } from '../characters';
import type { ValidationConfig, WebGALLine, WebGALScript } from '../types';

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Overall validation success */
  isValid: boolean;

  /** Validation score (0-1) */
  score: number;

  /** Detailed results */
  results: {
    syntax: SyntaxValidationResult;
    characters: CharacterValidationResult;
    educational: EducationalValidationResult;
    flow: FlowValidationResult;
  };

  /** Summary of issues */
  summary: {
    errors: string[];
    warnings: string[];
    suggestions: string[];
  };
}

/**
 * Syntax validation result
 */
export interface SyntaxValidationResult {
  isValid: boolean;
  score: number;
  issues: Array<{
    line: number;
    command: string;
    issue: string;
    severity: 'error' | 'warning';
  }>;
}

/**
 * Character validation result
 */
export interface CharacterValidationResult {
  isValid: boolean;
  score: number;
  characterConsistency: Record<
    string,
    {
      appearances: number;
      consistencyScore: number;
      issues: string[];
    }
  >;
}

/**
 * Educational validation result
 */
export interface EducationalValidationResult {
  isValid: boolean;
  score: number;
  educationalValue: number;
  contentAccuracy: number;
  learningObjectives: string[];
}

/**
 * Flow validation result
 */
export interface FlowValidationResult {
  isValid: boolean;
  score: number;
  sceneFlow: number;
  dialogueFlow: number;
  pacing: number;
}

/**
 * WebGAL script validator
 */
export class ScriptValidator {
  private readonly validCommands = new Set([
    'say',
    'changeBg',
    'changeFigure',
    'playBGM',
    'playSE',
    'wait',
    'choose',
    'jump',
    'label',
    'setVar',
    'callScene',
  ]);

  private readonly validPositions = new Set(['left', 'center', 'right', '-left', '-center', '-right']);

  /**
   * Validate complete WebGAL script
   */
  async validateScript(
    script: WebGALScript,
    config: ValidationConfig = this.getDefaultConfig()
  ): Promise<ValidationResult> {
    const results = {
      syntax: config.checkSyntax ? await this.validateSyntax(script) : this.createEmptyResult(),
      characters: config.checkCharacters ? await this.validateCharacters(script) : this.createEmptyResult(),
      educational: config.checkEducational ? await this.validateEducational(script) : this.createEmptyResult(),
      flow: config.checkFlow ? await this.validateFlow(script) : this.createEmptyResult(),
    };

    const overallScore =
      (results.syntax.score + results.characters.score + results.educational.score + results.flow.score) / 4;

    const summary = this.createSummary(results);

    const isValid =
      results.syntax.isValid &&
      results.characters.isValid &&
      results.educational.isValid &&
      results.flow.isValid &&
      (config.maxErrors ? summary.errors.length <= config.maxErrors : true);

    return {
      isValid,
      score: overallScore,
      results,
      summary,
    };
  }

  /**
   * Validate WebGAL syntax
   */
  private async validateSyntax(script: WebGALScript): Promise<SyntaxValidationResult> {
    const issues: Array<{
      line: number;
      command: string;
      issue: string;
      severity: 'error' | 'warning';
    }> = [];

    let lineNumber = 0;

    for (const scene of script.scenes) {
      for (const line of scene.lines) {
        lineNumber++;

        // Check command validity
        if (!this.validCommands.has(line.command)) {
          issues.push({
            line: lineNumber,
            command: line.command,
            issue: `Unknown command: ${line.command}`,
            severity: 'error',
          });
        }

        // Validate specific commands
        await this.validateSpecificCommand(line, lineNumber, issues);
      }
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    const score = Math.max(0, 1 - errorCount * 0.2 - warningCount * 0.05);

    return {
      isValid: errorCount === 0,
      score,
      issues,
    };
  }

  /**
   * Validate specific WebGAL command
   */
  private async validateSpecificCommand(
    line: WebGALLine,
    lineNumber: number,
    issues: Array<{ line: number; command: string; issue: string; severity: 'error' | 'warning' }>
  ): Promise<void> {
    switch (line.command) {
      case 'say':
        this.validateSayCommand(line, lineNumber, issues);
        break;

      case 'changeFigure':
        this.validateChangeFigureCommand(line, lineNumber, issues);
        break;

      case 'changeBg':
        this.validateChangeBgCommand(line, lineNumber, issues);
        break;

      case 'wait':
        this.validateWaitCommand(line, lineNumber, issues);
        break;

      case 'playBGM':
      case 'playSE':
        this.validateAudioCommand(line, lineNumber, issues);
        break;
    }
  }

  /**
   * Validate 'say' command
   */
  private validateSayCommand(
    line: WebGALLine,
    lineNumber: number,
    issues: Array<{ line: number; command: string; issue: string; severity: 'error' | 'warning' }>
  ): void {
    // Check if dialogue content exists
    if (!line.params[0] || line.params[0].trim().length === 0) {
      issues.push({
        line: lineNumber,
        command: line.command,
        issue: 'Empty dialogue content',
        severity: 'error',
      });
    }

    // Check speaker option
    if (!line.options?.speaker) {
      issues.push({
        line: lineNumber,
        command: line.command,
        issue: 'Missing speaker option',
        severity: 'warning',
      });
    }

    // Check dialogue length
    const content = line.params[0] || '';
    if (content.length > 200) {
      issues.push({
        line: lineNumber,
        command: line.command,
        issue: 'Dialogue too long (>200 characters)',
        severity: 'warning',
      });
    }

    // Check vocal option format
    if (line.options?.vocal && typeof line.options.vocal === 'string') {
      const vocal = line.options.vocal as string;
      if (!vocal.endsWith('.wav') && !vocal.endsWith('.mp3')) {
        issues.push({
          line: lineNumber,
          command: line.command,
          issue: 'Voice file should be .wav or .mp3',
          severity: 'warning',
        });
      }
    }
  }

  /**
   * Validate 'changeFigure' command
   */
  private validateChangeFigureCommand(
    line: WebGALLine,
    lineNumber: number,
    issues: Array<{ line: number; command: string; issue: string; severity: 'error' | 'warning' }>
  ): void {
    const figureFile = line.params[0];

    if (!figureFile) {
      issues.push({
        line: lineNumber,
        command: line.command,
        issue: 'Missing figure file',
        severity: 'error',
      });
      return;
    }

    // Check file extension
    if (!figureFile.endsWith('.webp') && !figureFile.endsWith('.png') && !figureFile.endsWith('.jpg')) {
      issues.push({
        line: lineNumber,
        command: line.command,
        issue: 'Figure file should be .webp, .png, or .jpg',
        severity: 'warning',
      });
    }

    // Check position parameter
    const positionMatch = line.raw.match(/-(left|center|right)\\b/);
    if (positionMatch) {
      const position = positionMatch[1];
      if (!this.validPositions.has(`-${position}`)) {
        issues.push({
          line: lineNumber,
          command: line.command,
          issue: `Invalid position: ${position}`,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validate 'changeBg' command
   */
  private validateChangeBgCommand(
    line: WebGALLine,
    lineNumber: number,
    issues: Array<{ line: number; command: string; issue: string; severity: 'error' | 'warning' }>
  ): void {
    const bgFile = line.params[0];

    if (!bgFile) {
      issues.push({
        line: lineNumber,
        command: line.command,
        issue: 'Missing background file',
        severity: 'error',
      });
      return;
    }

    // Check file extension
    if (!bgFile.endsWith('.webp') && !bgFile.endsWith('.jpg') && !bgFile.endsWith('.png')) {
      issues.push({
        line: lineNumber,
        command: line.command,
        issue: 'Background file should be .webp, .jpg, or .png',
        severity: 'warning',
      });
    }
  }

  /**
   * Validate 'wait' command
   */
  private validateWaitCommand(
    line: WebGALLine,
    lineNumber: number,
    issues: Array<{ line: number; command: string; issue: string; severity: 'error' | 'warning' }>
  ): void {
    const waitTime = line.params[0];

    if (!waitTime) {
      issues.push({
        line: lineNumber,
        command: line.command,
        issue: 'Missing wait time',
        severity: 'error',
      });
      return;
    }

    const timeMs = parseInt(waitTime, 10);
    if (Number.isNaN(timeMs) || timeMs < 0) {
      issues.push({
        line: lineNumber,
        command: line.command,
        issue: 'Invalid wait time (must be positive number)',
        severity: 'error',
      });
    }

    if (timeMs > 10000) {
      issues.push({
        line: lineNumber,
        command: line.command,
        issue: 'Wait time too long (>10 seconds)',
        severity: 'warning',
      });
    }
  }

  /**
   * Validate audio commands
   */
  private validateAudioCommand(
    line: WebGALLine,
    lineNumber: number,
    issues: Array<{ line: number; command: string; issue: string; severity: 'error' | 'warning' }>
  ): void {
    const audioFile = line.params[0];

    if (!audioFile) {
      issues.push({
        line: lineNumber,
        command: line.command,
        issue: 'Missing audio file',
        severity: 'error',
      });
      return;
    }

    const validExtensions = ['.mp3', '.wav', '.ogg'];
    const hasValidExtension = validExtensions.some((ext) => audioFile.endsWith(ext));

    if (!hasValidExtension) {
      issues.push({
        line: lineNumber,
        command: line.command,
        issue: `Audio file should have extension: ${validExtensions.join(', ')}`,
        severity: 'warning',
      });
    }
  }

  /**
   * Validate character consistency
   */
  private async validateCharacters(script: WebGALScript): Promise<CharacterValidationResult> {
    const characterStats: Record<
      string,
      {
        appearances: number;
        consistencyScore: number;
        issues: string[];
      }
    > = {};

    const expectedCharacters = new Set(script.metadata.characters);

    // Analyze character appearances
    for (const scene of script.scenes) {
      for (const line of scene.lines) {
        if (line.command === 'say' && line.options?.speaker) {
          const speaker = String(line.options.speaker);
          const characterId = this.findCharacterIdBySpeakerName(speaker);

          if (!characterStats[speaker]) {
            characterStats[speaker] = {
              appearances: 0,
              consistencyScore: 1.0,
              issues: [],
            };
          }

          // Use local reference to satisfy TypeScript after null check
          const speakerStats = characterStats[speaker]!;
          speakerStats.appearances++;

          // Check if character should be in expected list
          if (characterId && !expectedCharacters.has(characterId)) {
            speakerStats.issues.push('Character not in expected list');
            speakerStats.consistencyScore -= 0.2;
          }

          // Validate character voice file naming
          if (line.options?.vocal && characterId) {
            const vocal = String(line.options.vocal);
            if (!vocal.startsWith(characterId)) {
              speakerStats.issues.push("Voice file name doesn't match character ID");
              speakerStats.consistencyScore -= 0.1;
            }
          }
        }
      }
    }

    // Check that all expected characters appear
    for (const charId of expectedCharacters) {
      const character = CHARACTER_CONFIGS[charId];
      if (character) {
        const speakerNames = [character.name.zh, character.name.jp, character.name.en];

        const hasAppearances = speakerNames.some((name) => {
          const stats = characterStats[name];
          return stats !== undefined && stats.appearances > 0;
        });

        if (!hasAppearances) {
          // Add missing character to stats
          const mainName = character.name[script.metadata.multiLanguage.currentLanguage] || character.name.zh;
          if (!characterStats[mainName]) {
            characterStats[mainName] = {
              appearances: 0,
              consistencyScore: 0,
              issues: ['Character missing from script'],
            };
          }
        }
      }
    }

    // Calculate overall score
    const characters = Object.values(characterStats);
    const averageScore =
      characters.length > 0 ? characters.reduce((sum, char) => sum + char.consistencyScore, 0) / characters.length : 0;

    const hasAllExpectedCharacters =
      expectedCharacters.size === 0 ||
      Array.from(expectedCharacters).every((charId) => {
        const character = CHARACTER_CONFIGS[charId];
        if (!character) return false;
        const speakerNames = [character.name.zh, character.name.jp, character.name.en];
        return speakerNames.some((name) => {
          const stats = characterStats[name];
          return stats !== undefined && stats.appearances > 0;
        });
      });

    return {
      isValid: averageScore > 0.7 && hasAllExpectedCharacters,
      score: averageScore,
      characterConsistency: characterStats,
    };
  }

  /**
   * Find character ID by speaker name
   */
  private findCharacterIdBySpeakerName(speakerName: string): string | null {
    for (const [id, character] of Object.entries(CHARACTER_CONFIGS)) {
      if (character.name.zh === speakerName || character.name.jp === speakerName || character.name.en === speakerName) {
        return id;
      }
    }
    return null;
  }

  /**
   * Validate educational content
   */
  private async validateEducational(script: WebGALScript): Promise<EducationalValidationResult> {
    let totalDialogueLength = 0;
    let educationalKeywords = 0;
    const learningObjectives: string[] = [];

    // Define educational keywords
    const educationalTerms = [
      '研究',
      '方法',
      '结果',
      '结论',
      '分析',
      '实验',
      '理论',
      '假设',
      '数据',
      '模型',
      '算法',
      '发现',
      '观察',
      '测试',
      '验证',
      '评估',
    ];

    for (const scene of script.scenes) {
      // Collect learning objectives from scene metadata
      if (scene.metadata.objectives) {
        learningObjectives.push(...scene.metadata.objectives);
      }

      for (const line of scene.lines) {
        if (line.command === 'say') {
          const content = line.params[0] || '';
          totalDialogueLength += content.length;

          // Count educational terms
          for (const term of educationalTerms) {
            if (content.includes(term)) {
              educationalKeywords++;
            }
          }
        }
      }
    }

    // Calculate metrics
    const educationalDensity = totalDialogueLength > 0 ? (educationalKeywords / totalDialogueLength) * 1000 : 0; // Keywords per 1000 characters

    const educationalValue = Math.min(1, educationalDensity / 5); // Target: 5 keywords per 1000 chars
    const contentAccuracy = 0.85; // Placeholder - would need more sophisticated analysis

    const score = (educationalValue + contentAccuracy) / 2;

    return {
      isValid: score > 0.6,
      score,
      educationalValue,
      contentAccuracy,
      learningObjectives: [...new Set(learningObjectives)], // Remove duplicates
    };
  }

  /**
   * Validate script flow and pacing
   */
  private async validateFlow(script: WebGALScript): Promise<FlowValidationResult> {
    let sceneFlowScore = 1.0;
    let dialogueFlowScore = 1.0;
    let pacingScore = 1.0;

    // Check scene progression
    if (script.scenes.length === 0) {
      sceneFlowScore = 0;
    } else {
      // Check for logical scene order
      const sceneTypes = script.scenes.map((scene) => scene.metadata.type);
      if (sceneTypes[0] !== 'introduction') {
        sceneFlowScore -= 0.3;
      }

      // Check scene length consistency
      const sceneLengths = script.scenes.map((scene) => scene.lines.length);
      const avgLength = sceneLengths.reduce((a, b) => a + b, 0) / sceneLengths.length;
      const lengthVariance =
        sceneLengths.reduce((sum, len) => sum + Math.abs(len - avgLength), 0) / sceneLengths.length;

      if (lengthVariance > avgLength * 0.5) {
        sceneFlowScore -= 0.2;
      }
    }

    // Check dialogue flow
    let previousSpeaker = '';
    let consecutiveSpeakerCount = 0;

    for (const scene of script.scenes) {
      for (const line of scene.lines) {
        if (line.command === 'say' && line.options?.speaker) {
          const currentSpeaker = String(line.options.speaker);

          if (currentSpeaker === previousSpeaker) {
            consecutiveSpeakerCount++;
            if (consecutiveSpeakerCount > 3) {
              dialogueFlowScore -= 0.1;
            }
          } else {
            consecutiveSpeakerCount = 1;
            previousSpeaker = currentSpeaker;
          }
        }
      }
    }

    // Check pacing
    const totalDuration = script.metadata.totalDuration || 0;
    const idealDurationRange = [300, 1800]; // 5-30 minutes

    if (totalDuration < (idealDurationRange[0] ?? 0)) {
      pacingScore -= 0.3; // Too short
    } else if (totalDuration > (idealDurationRange[1] ?? Infinity)) {
      pacingScore -= 0.2; // Too long
    }

    const overallScore = (sceneFlowScore + dialogueFlowScore + pacingScore) / 3;

    return {
      isValid: overallScore > 0.7,
      score: overallScore,
      sceneFlow: sceneFlowScore,
      dialogueFlow: dialogueFlowScore,
      pacing: pacingScore,
    };
  }

  /**
   * Create validation summary
   */
  private createSummary(results: any): {
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Collect syntax issues
    if (results.syntax.issues) {
      for (const issue of results.syntax.issues) {
        if (issue.severity === 'error') {
          errors.push(`Line ${issue.line}: ${issue.issue}`);
        } else {
          warnings.push(`Line ${issue.line}: ${issue.issue}`);
        }
      }
    }

    // Collect character issues
    if (results.characters.characterConsistency) {
      for (const [character, stats] of Object.entries(results.characters.characterConsistency)) {
        const characterStats = stats as { appearances: number; consistencyScore: number; issues: string[] };
        if (characterStats.appearances === 0) {
          errors.push(`Character "${character}" missing from script`);
        }
        for (const issue of characterStats.issues) {
          warnings.push(`Character "${character}": ${issue}`);
        }
      }
    }

    // Add suggestions based on scores
    if (results.educational.score < 0.7) {
      suggestions.push('Consider adding more educational content or terminology');
    }

    if (results.flow.score < 0.7) {
      suggestions.push('Review script pacing and scene transitions');
    }

    return { errors, warnings, suggestions };
  }

  /**
   * Get default validation configuration
   */
  private getDefaultConfig(): ValidationConfig {
    return {
      checkSyntax: true,
      checkCharacters: true,
      checkEducational: true,
      checkFlow: true,
      maxErrors: 5,
    };
  }

  /**
   * Create empty validation result
   */
  private createEmptyResult(): any {
    return {
      isValid: true,
      score: 1.0,
    };
  }
}
