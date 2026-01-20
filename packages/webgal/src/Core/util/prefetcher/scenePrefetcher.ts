/**
 * 场景预加载
 * @param sceneList 需要预加载的场景文件列表
 */

import { logger } from '@/Core/util/logger';
import { WebGAL } from '@/Core/WebGAL';
import { sceneFetcher } from '../../controller/scene/sceneFetcher';
import { sceneParser } from '../../parser/sceneParser';

export const scenePrefetcher = (sceneList: Array<string>): void => {
  for (const e of sceneList) {
    if (!WebGAL.sceneManager.settledScenes.includes(e)) {
      logger.info(`现在预加载场景${e}`);
      sceneFetcher(e).then((r) => {
        sceneParser(r, e, e);
      });
    } else {
      logger.warn(`场景${e}已经加载过，无需再次加载`);
    }
  }
};
