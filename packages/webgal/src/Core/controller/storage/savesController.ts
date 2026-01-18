import localforage from 'localforage';
import { WebGAL } from '@/Core/WebGAL';
import { logger } from '@/Core/util/logger';
import { webgalStore } from '@/store/store';
import { saveActions } from '@/store/savesReducer';
import { ISaveData } from '@/store/userDataInterface';

export function dumpSavesToStorage(startIndex: number, endIndex: number) {
  for (let i = startIndex; i <= endIndex; i++) {
    const save = webgalStore.getState().saveData.saveData[i];
    localforage.setItem(`${WebGAL.gameKey}-saves${i}`, save).then(() => {
      logger.info(`存档${i}写入本地存储`);
    });
  }
}

export function getSavesFromStorage(startIndex: number, endIndex: number) {
  for (let i = startIndex; i <= endIndex; i++) {
    localforage.getItem(`${WebGAL.gameKey}-saves${i}`).then((save) => {
      webgalStore.dispatch(saveActions.saveGame({ index: i, saveData: save as ISaveData }));
      logger.info(`存档${i}读取自本地存储`);
    });
  }
}

export async function dumpFastSaveToStorage() {
  const save = webgalStore.getState().saveData.quickSaveData;
  await localforage.setItem(`${WebGAL.gameKey}-saves-fast`, save);
  logger.info(`快速存档写入本地存储`);
}

/**
 * Synchronous fast save for beforeunload event
 * Uses localStorage as fallback since localforage is async
 */
export function dumpFastSaveToStorageSync() {
  try {
    const save = webgalStore.getState().saveData.quickSaveData;
    if (save) {
      const key = `${WebGAL.gameKey}-saves-fast-sync`;
      localStorage.setItem(key, JSON.stringify(save));
      logger.info('Fast save written to localStorage (sync)');
    }
  } catch (error) {
    logger.error('Failed to write sync fast save:', error);
  }
}

export async function getFastSaveFromStorage() {
  // First try to get from localforage (async storage)
  let save = await localforage.getItem(`${WebGAL.gameKey}-saves-fast`);

  // If not found, try localStorage (sync fallback from beforeunload)
  if (!save) {
    try {
      const syncKey = `${WebGAL.gameKey}-saves-fast-sync`;
      const syncData = localStorage.getItem(syncKey);
      if (syncData) {
        save = JSON.parse(syncData);
        // Migrate to localforage and clear localStorage
        await localforage.setItem(`${WebGAL.gameKey}-saves-fast`, save);
        localStorage.removeItem(syncKey);
        logger.info('Migrated sync fast save to localforage');
      }
    } catch (error) {
      logger.error('Failed to read sync fast save:', error);
    }
  }

  webgalStore.dispatch(saveActions.setFastSave(save as ISaveData));
  logger.info('Fast save loaded from storage');
}
