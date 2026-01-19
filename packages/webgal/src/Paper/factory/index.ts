/**
 * Paper Module - Factory Exports
 */

export type {
  BatchSentenceOptions,
  BgmSentenceOptions,
  ChangeBgSentenceOptions,
  ChangeFigureSentenceOptions,
  PaperHighlightSentenceOptions,
  // Paper-specific options
  PaperQuoteSentenceOptions,
  SaySentenceOptions,
  WaitSentenceOptions,
} from './sentenceFactory';
export {
  createBgmSentence,
  createChangeBgSentence,
  createChangeFigureSentence,
  createDialogueSentences,
  createEndSentence,
  createPaperHighlightSentence,
  // Paper-specific command factories
  createPaperQuoteSentence,
  createSaySentence,
  createWaitSentence,
} from './sentenceFactory';
