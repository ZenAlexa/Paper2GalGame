import * as localforage from 'localforage';
import { IUserData } from '@/store/userDataInterface';
import { IPersistedPaperData } from '@/store/paperInterface';
import { logger } from '../../util/logger';
import { webgalStore } from '@/store/store';
import { initState, resetUserData } from '@/store/userDataReducer';
import { restorePaperData, initialPaperState } from '@/store/paperReducer';

import { WebGAL } from '@/Core/WebGAL';

/**
 * Get the storage key for Paper data
 */
const getPaperStorageKey = () => `${WebGAL.gameKey}_paper`;

/**
 * 写入本地存储
 */
export const setStorage = debounce(() => {
  const userDataState = webgalStore.getState().userData;
  localforage.setItem(WebGAL.gameKey, userDataState).then(() => {
    logger.info('写入本地存储');
  });
}, 100);

/**
 * 从本地存储获取数据
 */
export const getStorage = debounce(() => {
  localforage.getItem(WebGAL.gameKey).then((newUserData) => {
    // 如果没有数据或者属性不完全，重新初始化
    if (!newUserData || !checkUserDataProperty(newUserData)) {
      logger.warn('现在重置数据');
      setStorage();
      return;
    }
    webgalStore.dispatch(resetUserData(newUserData as IUserData));
  });
}, 100);

/**
 * 防抖函数
 * @param func 要执行的函数
 * @param wait 防抖等待时间
 */
function debounce<T, K>(func: (...args: T[]) => K, wait: number) {
  let timeout: ReturnType<typeof setTimeout>;

  function context(...args: T[]): K {
    clearTimeout(timeout);
    let ret!: K;
    timeout = setTimeout(() => {
      ret = func.apply(context, args);
    }, wait);
    return ret;
  }

  return context;
}

export const dumpToStorageFast = () => {
  const userDataState = webgalStore.getState().userData;
  localforage.setItem(WebGAL.gameKey, userDataState).then(() => {
    localforage.getItem(WebGAL.gameKey).then((newUserData) => {
      // 如果没有数据，初始化
      if (!newUserData) {
        setStorage();
        return;
      }
      webgalStore.dispatch(resetUserData(newUserData as IUserData));
    });
    logger.info('同步本地存储');
  });
};

/**
 * 检查用户数据属性是否齐全
 * @param userData 需要检查的数据
 */
function checkUserDataProperty(userData: any) {
  let result = true;
  for (const key in initState) {
    if (!userData.hasOwnProperty(key)) {
      result = false;
    }
  }
  return result;
}

export async function setStorageAsync() {
  const userDataState = webgalStore.getState().userData;
  return await localforage.setItem(WebGAL.gameKey, userDataState);
}

export async function getStorageAsync() {
  const newUserData = await localforage.getItem(WebGAL.gameKey);
  if (!newUserData || !checkUserDataProperty(newUserData)) {
    const userDataState = webgalStore.getState().userData;
    logger.warn('现在重置数据');
    return await localforage.setItem(WebGAL.gameKey, userDataState);
  } else webgalStore.dispatch(resetUserData(newUserData as IUserData));

  // Also restore Paper data
  await getPaperStorageAsync();
  return;
}

// ==================== Paper Data Storage ====================

/**
 * Save Paper data to local storage (debounced)
 */
export const setPaperStorage = debounce(() => {
  const paperState = webgalStore.getState().paper;
  const dataToSave: IPersistedPaperData = {
    paperHistory: paperState.paperHistory,
    highlights: paperState.highlights,
    notes: paperState.notes,
  };
  localforage.setItem(getPaperStorageKey(), dataToSave).then(() => {
    logger.info('Paper data saved to storage');
  });
}, 100);

/**
 * Get Paper data from local storage (debounced)
 */
export const getPaperStorage = debounce(() => {
  localforage.getItem(getPaperStorageKey()).then((data) => {
    if (data && checkPaperDataProperty(data)) {
      webgalStore.dispatch(restorePaperData(data as IPersistedPaperData));
      logger.info('Paper data restored from storage');
    }
  });
}, 100);

/**
 * Save Paper data to local storage (async, immediate)
 */
export async function setPaperStorageAsync(): Promise<void> {
  const paperState = webgalStore.getState().paper;
  const dataToSave: IPersistedPaperData = {
    paperHistory: paperState.paperHistory,
    highlights: paperState.highlights,
    notes: paperState.notes,
  };
  await localforage.setItem(getPaperStorageKey(), dataToSave);
  logger.info('Paper data saved to storage (async)');
}

/**
 * Get Paper data from local storage (async, immediate)
 */
export async function getPaperStorageAsync(): Promise<void> {
  const data = await localforage.getItem(getPaperStorageKey());
  if (data && checkPaperDataProperty(data)) {
    webgalStore.dispatch(restorePaperData(data as IPersistedPaperData));
    logger.info('Paper data restored from storage (async)');
  }
}

/**
 * Check if Paper data has required properties
 */
function checkPaperDataProperty(data: any): boolean {
  if (!data) return false;
  // Check for essential properties
  const hasHistory = Array.isArray(data.paperHistory);
  const hasHighlights = Array.isArray(data.highlights);
  const hasNotes = Array.isArray(data.notes);
  return hasHistory && hasHighlights && hasNotes;
}

/**
 * Clear Paper data from storage
 */
export async function clearPaperStorage(): Promise<void> {
  await localforage.removeItem(getPaperStorageKey());
  logger.info('Paper data cleared from storage');
}
