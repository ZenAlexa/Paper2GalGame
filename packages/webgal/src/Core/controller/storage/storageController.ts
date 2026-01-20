import * as localforage from 'localforage';
import { WebGAL } from '@/Core/WebGAL';
import type { IPaperReadingEntry, IPaperReadingList, IPersistedPaperData } from '@/store/paperInterface';
import { restorePaperData } from '@/store/paperReducer';
import { webgalStore } from '@/store/store';
import type { ISaveData, IUserData } from '@/store/userDataInterface';
import { initState, resetUserData } from '@/store/userDataReducer';
import { logger } from '../../util/logger';

/**
 * Get the storage key for Paper reading list
 */
const getPaperReadingListKey = () => `${WebGAL.gameKey}_paper_reading_list`;

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
    if (!Object.hasOwn(userData, key)) {
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

// ==================== Paper Reading List Storage ====================

const DEFAULT_MAX_READING_ENTRIES = 20;

/**
 * Get Paper reading list from storage
 */
export async function getPaperReadingList(): Promise<IPaperReadingList> {
  const data = await localforage.getItem(getPaperReadingListKey());
  if (data && typeof data === 'object' && Array.isArray((data as any).entries)) {
    return data as IPaperReadingList;
  }
  return {
    entries: [],
    maxEntries: DEFAULT_MAX_READING_ENTRIES,
  };
}

/**
 * Save Paper reading list to storage
 */
export async function savePaperReadingList(list: IPaperReadingList): Promise<void> {
  await localforage.setItem(getPaperReadingListKey(), list);
  logger.info('Paper reading list saved', { count: list.entries.length });
}

/**
 * Add or update an entry in the Paper reading list
 * Called when saving a Paper mode game
 */
export async function updatePaperReadingEntry(entry: IPaperReadingEntry): Promise<void> {
  const list = await getPaperReadingList();

  // Find existing entry by paper ID
  const existingIndex = list.entries.findIndex((e) => e.metadata.paperId === entry.metadata.paperId);

  if (existingIndex >= 0) {
    // Update existing entry
    list.entries[existingIndex] = entry;
    // Move to front (most recent)
    const updated = list.entries.splice(existingIndex, 1)[0];
    list.entries.unshift(updated);
  } else {
    // Add new entry at the front
    list.entries.unshift(entry);
    // Trim to max size
    while (list.entries.length > list.maxEntries) {
      list.entries.pop();
    }
  }

  await savePaperReadingList(list);
}

/**
 * Remove an entry from the Paper reading list
 */
export async function removePaperReadingEntry(paperId: string): Promise<void> {
  const list = await getPaperReadingList();
  list.entries = list.entries.filter((e) => e.metadata.paperId !== paperId);
  await savePaperReadingList(list);
  logger.info('Paper reading entry removed', { paperId });
}

/**
 * Create a reading entry from a save data object
 */
export function createPaperReadingEntry(saveData: ISaveData): IPaperReadingEntry | null {
  if (!saveData.paperState || !saveData.paperState.isPaperMode) {
    return null;
  }

  const entry: IPaperReadingEntry = {
    id: `reading_${saveData.paperState.metadata.paperId}_${Date.now()}`,
    metadata: saveData.paperState.metadata,
    progress: saveData.paperState.progress,
    previewImage: saveData.previewImage || '',
    lastSavedAt: saveData.saveTime || new Date().toISOString(),
    saveSlot: saveData.index,
  };

  return entry;
}

/**
 * Clear all Paper reading list entries
 */
export async function clearPaperReadingList(): Promise<void> {
  await localforage.removeItem(getPaperReadingListKey());
  logger.info('Paper reading list cleared');
}
