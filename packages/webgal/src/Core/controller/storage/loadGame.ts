import { ISaveData } from '@/store/userDataInterface';
import { logger } from '../../util/logger';
import { sceneFetcher } from '../scene/sceneFetcher';
import { sceneParser } from '../../parser/sceneParser';
import { webgalStore } from '@/store/store';
import { resetStageState } from '@/store/stageReducer';
import { setVisibility } from '@/store/GUIReducer';
import { restorePerform } from './jumpFromBacklog';
import { stopAllPerform } from '@/Core/controller/gamePlay/stopAllPerform';
import cloneDeep from 'lodash/cloneDeep';
import uniqWith from 'lodash/uniqWith';
import { scenePrefetcher } from '@/Core/util/prefetcher/scenePrefetcher';
import { setEbg } from '@/Core/gameScripts/changeBg/setEbg';

import { WebGAL } from '@/Core/WebGAL';

/**
 * 读取游戏存档
 * @param index 要读取的存档的档位
 */
export const loadGame = (index: number) => {
  const userDataState = webgalStore.getState().saveData;
  // 获得存档文件
  const loadFile: ISaveData = userDataState.saveData[index];
  logger.debug('读取的存档数据', loadFile);
  // 加载存档
  loadGameFromStageData(loadFile);
};

export function loadGameFromStageData(stageData: ISaveData) {
  if (!stageData) {
    logger.info('暂无存档');
    return;
  }
  const loadFile = stageData;

  // Force stop all performances first
  stopAllPerform();

  // Fetch scene and restore state only after scene is loaded
  sceneFetcher(loadFile.sceneData.sceneUrl).then((rawScene) => {
    // Parse scene data
    WebGAL.sceneManager.sceneData.currentScene = sceneParser(
      rawScene,
      loadFile.sceneData.sceneName,
      loadFile.sceneData.sceneUrl,
    );

    // Set scene state AFTER scene is parsed
    WebGAL.sceneManager.sceneData.currentSentenceId = loadFile.sceneData.currentSentenceId;
    WebGAL.sceneManager.sceneData.sceneStack = cloneDeep(loadFile.sceneData.sceneStack);

    // Start scene prefetching
    const subSceneList = WebGAL.sceneManager.sceneData.currentScene.subSceneList;
    WebGAL.sceneManager.settledScenes.push(WebGAL.sceneManager.sceneData.currentScene.sceneUrl);
    const subSceneListUniq = uniqWith(subSceneList);
    scenePrefetcher(subSceneListUniq);

    // Restore backlog
    const newBacklog = loadFile.backlog;
    WebGAL.backlogManager.getBacklog().splice(0, WebGAL.backlogManager.getBacklog().length);
    for (const e of newBacklog) {
      WebGAL.backlogManager.getBacklog().push(e);
    }

    // Restore stage state
    const newStageState = cloneDeep(loadFile.nowStageState);
    const dispatch = webgalStore.dispatch;
    dispatch(resetStageState(newStageState));

    // Restore performances after state is set
    setTimeout(restorePerform, 0);

    dispatch(setVisibility({ component: 'showTitle', visibility: false }));
    dispatch(setVisibility({ component: 'showMenuPanel', visibility: false }));

    // Restore blurred background
    setEbg(webgalStore.getState().stage.bgName);
  }).catch((error) => {
    logger.error('Failed to load game scene:', error);
  });
}
