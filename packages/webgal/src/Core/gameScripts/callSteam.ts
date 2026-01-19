import type { ISentence } from '@/Core/controller/scene/sceneInterface';
import type { IPerform } from '@/Core/Modules/perform/performInterface';
import { getStringArgByKey } from '@/Core/util/getSentenceArg';
import { logger } from '@/Core/util/logger';
import { WebGAL } from '@/Core/WebGAL';
import { WEBGAL_NONE } from '../constants';

/**
 * Unlocks a Steam achievement via the renderer → Electron bridge.
 * The script expects the first positional parameter to be the achievement id.
 */
export const callSteam = (sentence: ISentence): IPerform => {
  for (const arg of sentence.args) {
    if (arg.key === 'achievementId') {
      const achievementId = getStringArgByKey(sentence, 'achievementId');
      if (achievementId) {
        WebGAL.steam
          .unlockAchievement(achievementId)
          .then((result) => {
            logger.info(`callSteam: achievement ${achievementId} unlock ${result ? 'succeeded' : 'failed'}`);
          })
          .catch((error) => {
            logger.error(`callSteam: achievement ${achievementId} unlock threw`, error);
          });
      }
    }
  }
  const noperform: IPerform = {
    performName: WEBGAL_NONE,
    duration: 0,
    isHoldOn: false,
    stopFunction: () => {},
    blockingNext: () => false,
    blockingAuto: () => true,
    stopTimeout: undefined,
  };

  return noperform;
};
