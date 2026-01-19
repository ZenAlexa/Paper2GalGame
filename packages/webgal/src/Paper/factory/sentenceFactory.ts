/**
 * Paper Module - ISentence Factory Functions
 * Factory functions to create WebGAL ISentence objects programmatically
 */

import { commandType, ISentence, arg, IAsset } from '@/Core/controller/scene/sceneInterface';
import { fileType } from '@/Core/util/gameAssetsAccess/assetSetter';

/**
 * Helper to create an arg object
 */
function createArg(key: string, value: string | boolean | number): arg {
  return { key, value };
}

/**
 * Options for creating a say (dialogue) sentence
 */
export interface SaySentenceOptions {
  /** Dialogue text content */
  text: string;
  /** Character ID as speaker */
  speaker?: string;
  /** TTS audio URL */
  vocal?: string;
  /** Concatenate with previous dialogue */
  concat?: boolean;
  /** Font size override */
  fontSize?: 'small' | 'medium' | 'large';
  /** Text animation speed */
  textSpeed?: number;
}

/**
 * Create a say (dialogue) sentence
 */
export function createSaySentence(options: SaySentenceOptions): ISentence {
  const args: arg[] = [];

  if (options.speaker) {
    args.push(createArg('speaker', options.speaker));
  }
  if (options.vocal) {
    args.push(createArg('vocal', options.vocal));
  }
  if (options.concat) {
    args.push(createArg('concat', true));
  }
  if (options.fontSize) {
    args.push(createArg('fontSize', options.fontSize));
  }
  if (options.textSpeed !== undefined) {
    args.push(createArg('textSpeed', options.textSpeed));
  }

  const sentenceAssets: IAsset[] = [];
  if (options.vocal) {
    sentenceAssets.push({
      name: options.vocal,
      type: fileType.vocal,
      url: options.vocal,
      lineNumber: 0,
    });
  }

  return {
    command: commandType.say,
    commandRaw: options.speaker || 'say',
    content: options.text,
    args,
    sentenceAssets,
    subScene: [],
  };
}

/**
 * Options for creating a changeBg sentence
 */
export interface ChangeBgSentenceOptions {
  /** Background image filename */
  filename: string;
  /** Transition duration in ms */
  duration?: number;
  /** Auto-advance after command */
  next?: boolean;
}

/**
 * Create a changeBg (background change) sentence
 */
export function createChangeBgSentence(options: ChangeBgSentenceOptions): ISentence {
  const args: arg[] = [];

  if (options.duration !== undefined) {
    args.push(createArg('duration', options.duration));
  }
  // Default to auto-advance for Paper mode
  args.push(createArg('next', options.next ?? true));

  return {
    command: commandType.changeBg,
    commandRaw: 'changeBg',
    content: options.filename,
    args,
    sentenceAssets: [
      {
        name: options.filename,
        type: fileType.background,
        url: options.filename,
        lineNumber: 0,
      },
    ],
    subScene: [],
  };
}

/**
 * Options for creating a changeFigure sentence
 */
export interface ChangeFigureSentenceOptions {
  /** Sprite filename */
  filename: string;
  /** Position on screen */
  position?: 'left' | 'center' | 'right';
  /** Figure ID for multiple figures */
  id?: string;
  /** Auto-advance after command */
  next?: boolean;
  /** Entry animation duration */
  duration?: number;
}

/**
 * Create a changeFigure (character sprite) sentence
 */
export function createChangeFigureSentence(options: ChangeFigureSentenceOptions): ISentence {
  const args: arg[] = [];

  // Position flags are added as boolean flags (e.g., -left, -center, -right)
  if (options.position) {
    args.push(createArg(options.position, true));
  }
  if (options.id) {
    args.push(createArg('id', options.id));
  }
  if (options.duration !== undefined) {
    args.push(createArg('duration', options.duration));
  }
  // Default to auto-advance for Paper mode
  args.push(createArg('next', options.next ?? true));

  return {
    command: commandType.changeFigure,
    commandRaw: 'changeFigure',
    content: options.filename,
    args,
    sentenceAssets: [
      {
        name: options.filename,
        type: fileType.figure,
        url: options.filename,
        lineNumber: 0,
      },
    ],
    subScene: [],
  };
}

/**
 * Options for creating a bgm sentence
 */
export interface BgmSentenceOptions {
  /** BGM filename */
  filename: string;
  /** Volume level (0-100) */
  volume?: number;
  /** Fade-in duration in ms */
  enter?: number;
}

/**
 * Create a bgm (background music) sentence
 */
export function createBgmSentence(options: BgmSentenceOptions): ISentence {
  const args: arg[] = [];

  if (options.volume !== undefined) {
    args.push(createArg('volume', options.volume));
  }
  if (options.enter !== undefined) {
    args.push(createArg('enter', options.enter));
  }

  return {
    command: commandType.bgm,
    commandRaw: 'bgm',
    content: options.filename,
    args,
    sentenceAssets: [
      {
        name: options.filename,
        type: fileType.bgm,
        url: options.filename,
        lineNumber: 0,
      },
    ],
    subScene: [],
  };
}

/**
 * Options for creating a wait sentence
 */
export interface WaitSentenceOptions {
  /** Wait duration in ms */
  duration: number;
}

/**
 * Create a wait sentence
 */
export function createWaitSentence(options: WaitSentenceOptions): ISentence {
  return {
    command: commandType.wait,
    commandRaw: 'wait',
    content: String(options.duration),
    args: [],
    sentenceAssets: [],
    subScene: [],
  };
}

/**
 * Create an end sentence
 */
export function createEndSentence(): ISentence {
  return {
    command: commandType.end,
    commandRaw: 'end',
    content: '',
    args: [],
    sentenceAssets: [],
    subScene: [],
  };
}

/**
 * Options for batch sentence creation from AI dialogue
 */
export interface BatchSentenceOptions {
  /** Dialogue text */
  text: string;
  /** Character ID */
  characterId: string;
  /** Sprite filename */
  sprite: string;
  /** Sprite position */
  position: 'left' | 'center' | 'right';
  /** Speaker display name */
  speakerName?: string;
  /** TTS audio URL */
  vocal?: string;
  /** Whether speaker changed from previous */
  speakerChanged: boolean;
}

/**
 * Create sentences for a dialogue line
 * Returns changeFigure + say if speaker changed, otherwise just say
 */
export function createDialogueSentences(options: BatchSentenceOptions): ISentence[] {
  const sentences: ISentence[] = [];

  // Add changeFigure if speaker changed
  if (options.speakerChanged) {
    sentences.push(
      createChangeFigureSentence({
        filename: options.sprite,
        position: options.position,
        next: true,
      })
    );
  }

  // Add say sentence
  sentences.push(
    createSaySentence({
      text: options.text,
      speaker: options.speakerName || options.characterId,
      vocal: options.vocal,
    })
  );

  return sentences;
}

// ========================
// Paper-specific Commands
// ========================

/**
 * Options for creating a paperQuote sentence
 */
export interface PaperQuoteSentenceOptions {
  /** Quote text content */
  text: string;
  /** Source reference (e.g., "Section 3.2", "Figure 1") */
  source?: string;
  /** Quote style: blockquote, inline, or highlight */
  style?: 'blockquote' | 'inline' | 'highlight';
  /** Display duration in ms (if not set, calculated from text length) */
  duration?: number;
  /** Wait for user click before advancing */
  hold?: boolean;
}

/**
 * Create a paperQuote sentence for displaying paper citations
 */
export function createPaperQuoteSentence(options: PaperQuoteSentenceOptions): ISentence {
  const args: arg[] = [];

  if (options.source) {
    args.push(createArg('source', options.source));
  }
  if (options.style) {
    args.push(createArg('style', options.style));
  }
  if (options.duration !== undefined) {
    args.push(createArg('duration', options.duration));
  }
  if (options.hold) {
    args.push(createArg('hold', true));
  }

  return {
    command: commandType.paperQuote,
    commandRaw: 'paperQuote',
    content: options.text,
    args,
    sentenceAssets: [],
    subScene: [],
  };
}

/**
 * Options for creating a paperHighlight sentence
 */
export interface PaperHighlightSentenceOptions {
  /** Highlighted text content */
  text: string;
  /** Annotation or explanation */
  note?: string;
  /** Highlight color */
  color?: 'yellow' | 'green' | 'blue' | 'pink';
  /** Importance level */
  importance?: 'high' | 'medium' | 'low';
  /** Display duration in ms (if not set, calculated from text length and importance) */
  duration?: number;
  /** Wait for user click before advancing */
  hold?: boolean;
}

/**
 * Create a paperHighlight sentence for emphasizing paper content
 */
export function createPaperHighlightSentence(options: PaperHighlightSentenceOptions): ISentence {
  const args: arg[] = [];

  if (options.note) {
    args.push(createArg('note', options.note));
  }
  if (options.color) {
    args.push(createArg('color', options.color));
  }
  if (options.importance) {
    args.push(createArg('importance', options.importance));
  }
  if (options.duration !== undefined) {
    args.push(createArg('duration', options.duration));
  }
  if (options.hold) {
    args.push(createArg('hold', true));
  }

  return {
    command: commandType.paperHighlight,
    commandRaw: 'paperHighlight',
    content: options.text,
    args,
    sentenceAssets: [],
    subScene: [],
  };
}
