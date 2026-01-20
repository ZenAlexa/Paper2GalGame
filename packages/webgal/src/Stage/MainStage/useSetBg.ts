import { useEffect } from 'react';
import type { IStageObject } from '@/Core/controller/stage/pixi/PixiController';
import { setEbg } from '@/Core/gameScripts/changeBg/setEbg';
import { getEnterExitAnimation } from '@/Core/Modules/animationFunctions';
import { logger } from '@/Core/util/logger';
import { WebGAL } from '@/Core/WebGAL';
import type { IStageState } from '@/store/stageInterface';

export function useSetBg(stageState: IStageState) {
  const bgName = stageState.bgName;

  /**
   * 设置背景
   */
  useEffect(() => {
    const thisBgKey = 'bg-main';
    if (bgName !== '') {
      const currentBg = WebGAL.gameplay.pixiStage?.getStageObjByKey(thisBgKey);
      if (currentBg) {
        if (currentBg.sourceUrl !== bgName) {
          removeBg(currentBg);
        }
      }
      addBg(undefined, thisBgKey, bgName);
      setEbg(bgName);
      logger.debug('重设背景');
      const { duration, animation } = getEnterExitAnimation('bg-main', 'enter', true);
      WebGAL.gameplay.pixiStage?.registerPresetAnimation(animation, 'bg-main-softin', thisBgKey, stageState.effects);
      setTimeout(() => WebGAL.gameplay.pixiStage?.removeAnimationWithSetEffects('bg-main-softin'), duration);
    } else {
      const currentBg = WebGAL.gameplay.pixiStage?.getStageObjByKey(thisBgKey);
      if (currentBg) {
        removeBg(currentBg);
      }
    }
  }, [bgName, stageState.effects]);
}

function removeBg(bgObject: IStageObject) {
  WebGAL.gameplay.pixiStage?.removeAnimationWithSetEffects('bg-main-softin');
  const oldBgKey = bgObject.key;
  bgObject.key = `bg-main-off${String(Date.now())}`;
  const bgKey = bgObject.key;
  const bgAniKey = `${bgObject.key}-softoff`;
  WebGAL.gameplay.pixiStage?.removeStageObjectByKey(oldBgKey);
  const { duration, animation } = getEnterExitAnimation('bg-main-off', 'exit', true, bgKey);
  WebGAL.gameplay.pixiStage?.registerAnimation(animation, bgAniKey, bgKey);
  setTimeout(() => {
    WebGAL.gameplay.pixiStage?.removeAnimation(bgAniKey);
    WebGAL.gameplay.pixiStage?.removeStageObjectByKey(bgKey);
  }, duration);
}

function addBg(_type?: 'image' | 'spine', ...args: any[]) {
  const url: string = args[1];
  if (['mp4', 'webm', 'mkv'].some((e) => url.toLocaleLowerCase().endsWith(e))) {
    // @ts-expect-error
    return WebGAL.gameplay.pixiStage?.addVideoBg(...args);
  } else if (url.toLocaleLowerCase().endsWith('.skel')) {
    // @ts-expect-error
    return WebGAL.gameplay.pixiStage?.addSpineBg(...args);
  } else {
    // @ts-expect-error
    return WebGAL.gameplay.pixiStage?.addBg(...args);
  }
}
