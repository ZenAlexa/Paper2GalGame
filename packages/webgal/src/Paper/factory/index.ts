/**
 * Paper Module - Factory Exports
 */

export {
  createSaySentence,
  createChangeBgSentence,
  createChangeFigureSentence,
  createBgmSentence,
  createWaitSentence,
  createEndSentence,
  createDialogueSentences,
  // Paper-specific command factories
  createPaperQuoteSentence,
  createPaperHighlightSentence,
} from './sentenceFactory';

export type {
  SaySentenceOptions,
  ChangeBgSentenceOptions,
  ChangeFigureSentenceOptions,
  BgmSentenceOptions,
  WaitSentenceOptions,
  BatchSentenceOptions,
  // Paper-specific options
  PaperQuoteSentenceOptions,
  PaperHighlightSentenceOptions,
} from './sentenceFactory';
