/**
 * PaperSceneBuilder - Converts AI-generated scripts to WebGAL IScene
 *
 * This module replicates all external extension logic and integrates it
 * directly into the WebGAL engine, generating IScene objects instead of
 * text-based scripts.
 */

import { commandType, ISentence, IScene, IAsset } from '@/Core/controller/scene/sceneInterface';
import { fileType } from '@/Core/util/gameAssetsAccess/assetSetter';
import type { AIGeneratedScript, AIDialogueLine, ResolvedDialogue } from '../types';
import { PAPER_CHARACTERS, getCharacterDisplayName, buildPositionMap } from '../config';
import {
  createSaySentence,
  createChangeBgSentence,
  createChangeFigureSentence,
  createBgmSentence,
  createEndSentence,
} from '../factory';

/**
 * Configuration options for scene building
 */
export interface PaperSceneBuilderOptions {
  /** Default background image (fallback) */
  defaultBackground?: string;
  /** Default BGM file (fallback) */
  defaultBgm?: string;
  /** Default BGM volume (0-100) */
  defaultBgmVolume?: number;
  /** Language for character display names */
  displayLanguage?: 'zh' | 'jp' | 'en';
  /** Scene name prefix */
  sceneNamePrefix?: string;
}

/**
 * Default configuration values
 */
const DEFAULT_OPTIONS: Required<PaperSceneBuilderOptions> = {
  defaultBackground: 'bg.webp',
  defaultBgm: 's_Title.mp3',
  defaultBgmVolume: 80,
  displayLanguage: 'jp',
  sceneNamePrefix: 'paper',
};

/**
 * PaperSceneBuilder class
 *
 * Converts AIGeneratedScript to WebGAL IScene by:
 * 1. Ensuring changeBg at start (if not specified)
 * 2. Ensuring single BGM command (deduplication)
 * 3. Inserting changeFigure when speaker changes
 * 4. Injecting vocal parameters for TTS audio
 * 5. Collecting all assets for preloading
 */
export class PaperSceneBuilder {
  private options: Required<PaperSceneBuilderOptions>;

  constructor(options: PaperSceneBuilderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Build IScene from AIGeneratedScript
   */
  build(script: AIGeneratedScript, sessionId?: string): IScene {
    const sentences: ISentence[] = [];
    const assets: IAsset[] = [];

    // Step 1: Add changeBg at the beginning
    const background = script.background || this.options.defaultBackground;
    sentences.push(
      createChangeBgSentence({
        filename: background,
        next: true,
      })
    );
    assets.push({
      name: background,
      type: fileType.background,
      url: background,
      lineNumber: 0,
    });

    // Step 2: Add single BGM command (deduplication logic)
    const bgm = script.bgm || this.options.defaultBgm;
    const bgmVolume = script.bgmVolume ?? this.options.defaultBgmVolume;
    sentences.push(
      createBgmSentence({
        filename: bgm,
        volume: bgmVolume,
      })
    );
    assets.push({
      name: bgm,
      type: fileType.bgm,
      url: bgm,
      lineNumber: 1,
    });

    // Step 3: Build position map for speaker-sprite mapping
    const characterIds = script.metadata.characters;
    const positionMap = buildPositionMap(characterIds);

    // Step 4: Process dialogues with speaker change detection
    let currentSpeaker: string | null = null;
    let lineNumber = 2; // Start after changeBg and bgm

    for (const dialogue of script.dialogues) {
      const resolvedDialogue = this.resolveDialogue(dialogue, positionMap);

      // Insert changeFigure when speaker changes
      if (dialogue.characterId !== currentSpeaker) {
        sentences.push(
          createChangeFigureSentence({
            filename: resolvedDialogue.sprite,
            position: resolvedDialogue.position,
            next: true,
          })
        );

        // Add figure asset
        if (!assets.some((a) => a.name === resolvedDialogue.sprite && a.type === fileType.figure)) {
          assets.push({
            name: resolvedDialogue.sprite,
            type: fileType.figure,
            url: resolvedDialogue.sprite,
            lineNumber,
          });
        }

        currentSpeaker = dialogue.characterId;
        lineNumber++;
      }

      // Add say sentence with vocal if available
      sentences.push(
        createSaySentence({
          text: dialogue.text,
          speaker: resolvedDialogue.speakerName,
          vocal: dialogue.vocal,
        })
      );

      // Add vocal asset if present
      if (dialogue.vocal) {
        assets.push({
          name: dialogue.vocal,
          type: fileType.vocal,
          url: dialogue.vocal,
          lineNumber,
        });
      }

      lineNumber++;
    }

    // Step 5: Add end command
    sentences.push(createEndSentence());

    // Build scene name
    const sceneName = sessionId
      ? `${this.options.sceneNamePrefix}_${sessionId}`
      : `${this.options.sceneNamePrefix}_${Date.now()}`;

    return {
      sceneName,
      sceneUrl: `paper://${sceneName}`,
      sentenceList: sentences,
      assetsList: assets,
      subSceneList: [],
    };
  }

  /**
   * Resolve dialogue line with asset information
   */
  private resolveDialogue(
    dialogue: AIDialogueLine,
    positionMap: ReturnType<typeof buildPositionMap>
  ): ResolvedDialogue {
    const characterId = dialogue.characterId || 'unknown';
    const mapping = positionMap[characterId] || positionMap['unknown'];

    return {
      ...dialogue,
      sprite: mapping.sprite,
      position: mapping.position,
      speakerName: getCharacterDisplayName(characterId, this.options.displayLanguage),
    };
  }

  /**
   * Build IScene from raw dialogues (convenience method)
   * Use when you have dialogue data but not a full AIGeneratedScript
   */
  buildFromDialogues(
    dialogues: AIDialogueLine[],
    options: {
      paperTitle?: string;
      characters?: string[];
      background?: string;
      bgm?: string;
      bgmVolume?: number;
    } = {}
  ): IScene {
    const characters = options.characters || this.extractUniqueCharacters(dialogues);

    const script: AIGeneratedScript = {
      metadata: {
        paperTitle: options.paperTitle || 'Unknown Paper',
        characters,
        totalLines: dialogues.length,
      },
      dialogues,
      background: options.background,
      bgm: options.bgm,
      bgmVolume: options.bgmVolume,
    };

    return this.build(script);
  }

  /**
   * Extract unique character IDs from dialogues
   */
  private extractUniqueCharacters(dialogues: AIDialogueLine[]): string[] {
    const characters = new Set<string>();
    for (const dialogue of dialogues) {
      if (dialogue.characterId) {
        characters.add(dialogue.characterId);
      }
    }
    return Array.from(characters);
  }

  /**
   * Inject vocal URLs into existing dialogues
   * This is the engine-side equivalent of the extension's vocal injection
   */
  static injectVocals(
    dialogues: AIDialogueLine[],
    vocalMap: Map<string, string> | Record<string, string>
  ): AIDialogueLine[] {
    const vocalMapNormalized =
      vocalMap instanceof Map ? vocalMap : new Map(Object.entries(vocalMap));

    return dialogues.map((dialogue, index) => {
      const dialogueId = `dialogue_${index}`;
      const vocalUrl = vocalMapNormalized.get(dialogueId);

      if (vocalUrl && !dialogue.vocal) {
        return { ...dialogue, vocal: vocalUrl };
      }
      return dialogue;
    });
  }

  /**
   * Validate AIGeneratedScript before building
   */
  static validate(script: AIGeneratedScript): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!script.metadata) {
      errors.push('Missing metadata');
    }

    if (!script.dialogues || script.dialogues.length === 0) {
      errors.push('No dialogues in script');
    }

    for (let i = 0; i < script.dialogues.length; i++) {
      const dialogue = script.dialogues[i];
      if (!dialogue.text || dialogue.text.trim() === '') {
        errors.push(`Dialogue ${i} has empty text`);
      }
      if (!dialogue.characterId) {
        errors.push(`Dialogue ${i} has no characterId`);
      }
    }

    // Validate characters exist in configuration
    const knownCharacters = Object.keys(PAPER_CHARACTERS);
    for (const charId of script.metadata?.characters || []) {
      if (!knownCharacters.includes(charId) && charId !== 'unknown') {
        errors.push(`Unknown character: ${charId}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Factory function for quick scene building
 */
export function buildPaperScene(
  script: AIGeneratedScript,
  options?: PaperSceneBuilderOptions
): IScene {
  const builder = new PaperSceneBuilder(options);
  return builder.build(script);
}

/**
 * Factory function for building from dialogues
 */
export function buildPaperSceneFromDialogues(
  dialogues: AIDialogueLine[],
  options?: {
    paperTitle?: string;
    characters?: string[];
    background?: string;
    bgm?: string;
    bgmVolume?: number;
  } & PaperSceneBuilderOptions
): IScene {
  const builder = new PaperSceneBuilder(options);
  return builder.buildFromDialogues(dialogues, options);
}
