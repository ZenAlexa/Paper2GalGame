import { nextSentence } from '@/Core/controller/gamePlay/nextSentence';
import { resetStage } from '@/Core/controller/stage/resetStage';
import { hasFastSaveRecord, loadFastSaveGame } from '@/Core/controller/storage/fastSaveLoad';
import { restorePerform } from '@/Core/controller/storage/jumpFromBacklog';
import { setEbg } from '@/Core/gameScripts/changeBg/setEbg';
import { WebGAL } from '@/Core/WebGAL';
import { setVisibility } from '@/store/GUIReducer';
import { webgalStore } from '@/store/store';
import { sceneParser } from '../../parser/sceneParser';
import { assetSetter, fileType } from '../../util/gameAssetsAccess/assetSetter';
import { sceneFetcher } from '../scene/sceneFetcher';

// Re-export Paper launcher functions for convenience
export {
  checkTTSAvailability,
  exitPaperGame,
  getPaperProgress,
  isPaperModeActive,
  launchPaperGameFromAPI,
  launchPaperGameWithTTS,
  startPaperGameWithScene,
  startPaperGameWithScript,
} from '@/Paper/launcher';

/**
 * Start game from scratch (default start.txt)
 */
export const startGame = () => {
  resetStage(true);

  // Fetch initial scene
  const sceneUrl: string = assetSetter('start.txt', fileType.scene);
  // Load scene to runtime
  sceneFetcher(sceneUrl).then((rawScene) => {
    WebGAL.sceneManager.sceneData.currentScene = sceneParser(rawScene, 'start.txt', sceneUrl);
    // Start first sentence
    nextSentence();
  });
  webgalStore.dispatch(setVisibility({ component: 'showTitle', visibility: false }));
};

/**
 * Start paper game with dynamically generated script
 * @param sessionId Session ID from API
 */
export const startPaperGame = async (sessionId: string) => {
  resetStage(true);

  try {
    // Fetch generated script from API
    const response = await fetch(`/api/generate/script/${sessionId}`);
    const result = await response.json();

    if (!result.success || !result.data?.script) {
      console.error('[startPaperGame] Failed to fetch script:', result.error);
      return;
    }

    const rawScript = result.data.script;
    console.log(`[startPaperGame] Loaded script with ${result.data.metadata?.totalDialogues || 0} dialogues`);

    // DEBUG: Log raw script content
    console.log('[startPaperGame] ========== RAW SCRIPT ==========');
    console.log(rawScript);
    console.log('[startPaperGame] ========== END RAW SCRIPT ==========');

    // Parse script and load to runtime
    WebGAL.sceneManager.sceneData.currentScene = sceneParser(
      rawScript,
      `paper_${sessionId}.txt`,
      `/api/generate/script/${sessionId}`
    );

    // DEBUG: Log parsed sentenceList
    const sentenceList = WebGAL.sceneManager.sceneData.currentScene.sentenceList;
    console.log(`[startPaperGame] Parsed ${sentenceList.length} sentences`);
    console.log('[startPaperGame] ========== SENTENCE LIST ==========');
    sentenceList.slice(0, 20).forEach((sentence, idx) => {
      console.log(
        `[startPaperGame] Sentence ${idx}: command=${sentence.command}, commandRaw="${sentence.commandRaw}", content="${sentence.content?.substring(0, 50) || ''}"`,
        sentence.args
      );
    });
    if (sentenceList.length > 20) {
      console.log(`[startPaperGame] ... and ${sentenceList.length - 20} more sentences`);
    }
    console.log('[startPaperGame] ========== END SENTENCE LIST ==========');

    // Hide title screen BEFORE starting script execution
    // This prevents nextSentence() from early-returning due to showTitle check
    webgalStore.dispatch(setVisibility({ component: 'showTitle', visibility: false }));

    // Start first sentence
    nextSentence();
  } catch (error) {
    console.error('[startPaperGame] Error:', error);
  }
};

export async function continueGame() {
  /**
   * 重设模糊背景
   */
  setEbg(webgalStore.getState().stage.bgName);
  // 当且仅当游戏未开始时使用快速存档
  // 当游戏开始后 使用原来的逻辑
  if ((await hasFastSaveRecord()) && WebGAL.sceneManager.sceneData.currentSentenceId === 0) {
    // 恢复记录
    await loadFastSaveGame();
    return;
  }
  if (
    WebGAL.sceneManager.sceneData.currentSentenceId === 0 &&
    WebGAL.sceneManager.sceneData.currentScene.sceneName === 'start.txt'
  ) {
    // 如果游戏没有开始，开始游戏
    nextSentence();
  } else {
    restorePerform();
  }
}
