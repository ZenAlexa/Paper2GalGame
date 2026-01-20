import type { ISentence } from '@/Core/controller/scene/sceneInterface';
import type { IAnimationObject } from '@/Core/controller/stage/pixi/PixiController';
import { getAnimateDuration, getAnimationObject } from '@/Core/Modules/animationFunctions';
import type { IPerform } from '@/Core/Modules/perform/performInterface';
import { getBooleanArgByKey, getStringArgByKey } from '@/Core/util/getSentenceArg';
import { logger } from '@/Core/util/logger';
import { WebGAL } from '@/Core/WebGAL';
import { webgalStore } from '@/store/store';
import type { IUserAnimation } from '../Modules/animations';

/**
 * 设置临时动画
 * @param sentence
 */
export const setTempAnimation = (sentence: ISentence): IPerform => {
  const startDialogKey = webgalStore.getState().stage.currentDialogKey;
  const animationName = (Math.random() * 10).toString(16);
  const animationString = sentence.content;
  let animationObj;
  try {
    animationObj = JSON.parse(animationString);
  } catch (_e) {
    animationObj = [];
  }
  const newAnimation: IUserAnimation = { name: animationName, effects: animationObj };
  WebGAL.animationManager.addAnimation(newAnimation);
  const animationDuration = getAnimateDuration(animationName);
  const target = getStringArgByKey(sentence, 'target') ?? '0';
  const writeDefault = getBooleanArgByKey(sentence, 'writeDefault') ?? false;
  const keep = getBooleanArgByKey(sentence, 'keep') ?? false;

  const key = `${target}-${animationName}-${animationDuration}`;
  const performInitName = `animation-${target}`;

  WebGAL.gameplay.performController.unmountPerform(performInitName, true);

  let stopFunction = () => {};
  setTimeout(() => {
    WebGAL.gameplay.pixiStage?.stopPresetAnimationOnTarget(target);
    const animationObj: IAnimationObject | null = getAnimationObject(
      animationName,
      target,
      animationDuration,
      writeDefault
    );
    if (animationObj) {
      logger.debug(`动画${animationName}作用在${target}`, animationDuration);
      WebGAL.gameplay.pixiStage?.registerAnimation(animationObj, key, target);
    }
  }, 0);
  stopFunction = () => {
    setTimeout(() => {
      const endDialogKey = webgalStore.getState().stage.currentDialogKey;
      const _isHasNext = startDialogKey !== endDialogKey;
      WebGAL.gameplay.pixiStage?.removeAnimationWithSetEffects(key);
    }, 0);
  };

  return {
    performName: performInitName,
    duration: animationDuration,
    isHoldOn: keep,
    stopFunction,
    blockingNext: () => false,
    blockingAuto: () => !keep,
    stopTimeout: undefined, // 暂时不用，后面会交给自动清除
  };
};
