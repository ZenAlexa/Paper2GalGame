import { sceneParser } from '@/Core/parser/sceneParser';
import { assetsPrefetcher } from '@/Core/util/prefetcher/assetsPrefetcher';
import { WebGAL } from '@/Core/WebGAL';
import { setStageVar } from '@/store/stageReducer';
import { webgalStore } from '@/store/store';

/**
 * Extend current scene by injecting additional WebGAL script at runtime
 * This is the core mechanism for UGC dynamic content injection
 *
 * Key features:
 * - Reuses WebGAL's standard sceneParser
 * - Preserves save/load compatibility via GameVar
 * - Triggers asset prefetching for new resources
 * - Maintains backlog history for all injected sentences
 *
 * @param additionalScript - WebGAL script text to inject
 * @param saveToGameVar - Whether to save script to GameVar for save/load (default: true)
 * @returns Number of sentences injected
 */
export const extendCurrentScene = (additionalScript: string, saveToGameVar = true): number => {
  // 1. Use existing parser to parse new script
  const parsedAddition = sceneParser(additionalScript, 'ai_dynamic', 'runtime.txt');

  // 2. Get current scene reference
  const currentScene = WebGAL.sceneManager.sceneData.currentScene;

  // 3. Append new sentences to the list
  currentScene.sentenceList.push(...parsedAddition.sentenceList);

  // 4. Merge asset lists (deduplicate)
  const newAssets = parsedAddition.assetsList.filter((a) => !currentScene.assetsList.some((e) => e.url === a.url));
  currentScene.assetsList.push(...newAssets);

  // 5. Trigger asset prefetching
  if (newAssets.length > 0) {
    assetsPrefetcher(newAssets);
  }

  // 6. Save script to GameVar for save/load compatibility
  if (saveToGameVar) {
    // Append to existing generated script if present
    const existingScript = webgalStore.getState().stage.GameVar.generatedScript as string | undefined;
    const fullScript = existingScript ? `${existingScript}\n${additionalScript}` : additionalScript;
    webgalStore.dispatch(setStageVar({ key: 'generatedScript', value: fullScript }));
  }

  console.log(
    `[extendCurrentScene] Injected ${parsedAddition.sentenceList.length} sentences, ${newAssets.length} new assets`
  );

  return parsedAddition.sentenceList.length;
};

/**
 * Get the current script injection point (for debugging)
 * @returns Current sentence ID and total sentence count
 */
export const getInjectionPoint = (): { currentId: number; totalSentences: number } => {
  const sceneData = WebGAL.sceneManager.sceneData;
  return {
    currentId: sceneData.currentSentenceId,
    totalSentences: sceneData.currentScene.sentenceList.length,
  };
};
