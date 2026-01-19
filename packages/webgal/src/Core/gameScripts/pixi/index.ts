import type { ISentence } from '@/Core/controller/scene/sceneInterface';
import type { IPerform } from '@/Core/Modules/perform/performInterface';
import { logger } from '@/Core/util/logger';
import { WebGAL } from '@/Core/WebGAL';
import { call, type IResult } from '../../util/pixiPerformManager/pixiPerformManager';

/**
 * 运行一段pixi演出
 * @param sentence
 */
export const pixi = (sentence: ISentence): IPerform => {
  const pixiPerformName = `PixiPerform${sentence.content}`;
  WebGAL.gameplay.performController.performList.forEach((e) => {
    if (e.performName === pixiPerformName) {
      return {
        performName: 'none',
        duration: 0,
        isOver: false,
        isHoldOn: true,
        stopFunction: () => {},
        blockingNext: () => false,
        blockingAuto: () => false,
        stopTimeout: undefined, // 暂时不用，后面会交给自动清除
      };
    }
  });
  const res: IResult = call(sentence.content);
  const { fg, bg } = res;

  return {
    performName: pixiPerformName,
    duration: 0,
    isHoldOn: true,
    stopFunction: () => {
      logger.warn('现在正在卸载pixi演出');
      if (fg) {
        fg.container.destroy({ texture: true, baseTexture: true });
        WebGAL.gameplay.pixiStage?.foregroundEffectsContainer.removeChild(fg.container);
        WebGAL.gameplay.pixiStage?.removeAnimation(fg.tickerKey);
      }
      if (bg) {
        bg.container.destroy({ texture: true, baseTexture: true });
        WebGAL.gameplay.pixiStage?.backgroundEffectsContainer.removeChild(bg.container);
        WebGAL.gameplay.pixiStage?.removeAnimation(bg.tickerKey);
      }
    },
    blockingNext: () => false,
    blockingAuto: () => false,
    stopTimeout: undefined, // 暂时不用，后面会交给自动清除
  };
};
