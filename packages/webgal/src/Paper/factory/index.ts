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
} from './sentenceFactory';

export type {
  SaySentenceOptions,
  ChangeBgSentenceOptions,
  ChangeFigureSentenceOptions,
  BgmSentenceOptions,
  WaitSentenceOptions,
  BatchSentenceOptions,
} from './sentenceFactory';
