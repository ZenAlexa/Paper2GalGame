import cloneDeep from 'lodash/cloneDeep';
import { dumpSavesToStorage } from '@/Core/controller/storage/savesController';
import { WebGAL } from '@/Core/WebGAL';
import { saveActions } from '@/store/savesReducer';
import { webgalStore } from '@/store/store';
import type { ISaveData } from '@/store/userDataInterface';
import { logger } from '../../util/logger';

/**
 * 保存游戏
 * @param index 游戏的档位
 */
export const saveGame = (index: number) => {
  const saveData: ISaveData = generateCurrentStageData(index);
  webgalStore.dispatch(saveActions.saveGame({ index, saveData }));
  dumpSavesToStorage(index, index);
};

/**
 * 生成现在游戏的数据快照
 * @param index 游戏的档位
 */
export function generateCurrentStageData(index: number, isSavePreviewImage = true) {
  const stageState = webgalStore.getState().stage;
  const saveBacklog = cloneDeep(WebGAL.backlogManager.getBacklog());

  /**
   * Generate preview thumbnail with error handling
   */
  let urlToSave = '';
  if (isSavePreviewImage) {
    try {
      const canvas = document.getElementById('pixiCanvas') as HTMLCanvasElement | null;
      if (canvas) {
        const canvas2 = document.createElement('canvas');
        const context = canvas2.getContext('2d');
        if (context) {
          canvas2.width = 480;
          canvas2.height = 270;
          context.drawImage(canvas, 0, 0, 480, 270);
          urlToSave = canvas2.toDataURL('image/webp', 0.5);
        }
        canvas2.remove();
      } else {
        logger.warn('Preview canvas not found, saving without preview image');
      }
    } catch (error) {
      logger.error('Failed to generate preview image:', error);
      // Continue without preview image
    }
  }
  const saveData: ISaveData = {
    nowStageState: cloneDeep(stageState),
    backlog: saveBacklog, // 舞台数据
    index: index, // 存档的序号
    saveTime: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString('chinese', { hour12: false })}`, // 保存时间
    // 场景数据
    sceneData: {
      currentSentenceId: WebGAL.sceneManager.sceneData.currentSentenceId, // 当前语句ID
      sceneStack: cloneDeep(WebGAL.sceneManager.sceneData.sceneStack), // 场景栈
      sceneName: WebGAL.sceneManager.sceneData.currentScene.sceneName, // 场景名称
      sceneUrl: WebGAL.sceneManager.sceneData.currentScene.sceneUrl, // 场景url
    },
    previewImage: urlToSave,
  };

  return saveData;
}
