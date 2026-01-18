import { webgalStore } from '@/store/store';
import { getStorageAsync, setStorageAsync } from '@/Core/controller/storage/storageController';
import { ISaveData } from '@/store/userDataInterface';
import { loadGameFromStageData } from '@/Core/controller/storage/loadGame';
import { generateCurrentStageData } from '@/Core/controller/storage/saveGame';
import cloneDeep from 'lodash/cloneDeep';
import { WebGAL } from '@/Core/WebGAL';
import { saveActions } from '@/store/savesReducer';
import { dumpFastSaveToStorage, dumpFastSaveToStorageSync, getFastSaveFromStorage } from '@/Core/controller/storage/savesController';

export let fastSaveGameKey = '';
export let isFastSaveKey = '';
let lock = true;

export function initKey() {
  lock = false;
  fastSaveGameKey = `FastSaveKey-${WebGAL.gameName}-${WebGAL.gameKey}`;
  isFastSaveKey = `FastSaveActive-${WebGAL.gameName}-${WebGAL.gameKey}`;
}

/**
 * Async fast save for regular use
 */
export async function fastSaveGame() {
  const saveData: ISaveData = generateCurrentStageData(-1, false);
  const newSaveData = cloneDeep(saveData);
  webgalStore.dispatch(saveActions.setFastSave(newSaveData));
  await dumpFastSaveToStorage();
}

/**
 * Sync fast save for beforeunload event
 * Uses localStorage since async operations won't complete during page unload
 */
export function fastSaveGameSync() {
  const saveData: ISaveData = generateCurrentStageData(-1, false);
  const newSaveData = cloneDeep(saveData);
  webgalStore.dispatch(saveActions.setFastSave(newSaveData));
  dumpFastSaveToStorageSync();
}

/**
 * 判断是否有无存储紧急回避时的数据
 */
export async function hasFastSaveRecord() {
  // return await localforage.getItem(isFastSaveKey);
  await getStorageAsync();
  return webgalStore.getState().saveData.quickSaveData !== null;
}

/**
 * 加载紧急回避时的数据
 */
export async function loadFastSaveGame() {
  // 获得存档文件
  // const loadFile: ISaveData | null = await localforage.getItem(fastSaveGameKey);
  await getFastSaveFromStorage();
  const loadFile: ISaveData | null = webgalStore.getState().saveData.quickSaveData;
  if (!loadFile) {
    return;
  }
  loadGameFromStageData(loadFile);
}

/**
 * 移除紧急回避的数据
 */
export async function removeFastSaveGameRecord() {
  webgalStore.dispatch(saveActions.resetFastSave());
  await setStorageAsync();
  // await localforage.setItem(isFastSaveKey, false);
  // await localforage.setItem(fastSaveGameKey, null);
}
