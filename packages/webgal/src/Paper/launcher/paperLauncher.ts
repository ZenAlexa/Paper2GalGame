/**
 * Paper Mode Launcher
 *
 * Provides functions to start Paper games with direct IScene injection,
 * bypassing the traditional script file parsing flow.
 */

import { IScene } from '@/Core/controller/scene/sceneInterface';
import { resetStage } from '@/Core/controller/stage/resetStage';
import { webgalStore } from '@/store/store';
import { setVisibility } from '@/store/GUIReducer';
import { nextSentence } from '@/Core/controller/gamePlay/nextSentence';
import { WebGAL } from '@/Core/WebGAL';
import type { AIGeneratedScript } from '../types';
import { PaperSceneBuilder, PaperSceneBuilderOptions } from '../builder';

/**
 * Start Paper game with a pre-built IScene
 * This is the lowest-level launcher - directly injects the scene
 */
export function startPaperGameWithScene(scene: IScene): void {
  console.log('[PaperLauncher] Starting game with pre-built scene:', scene.sceneName);
  console.log('[PaperLauncher] Scene has', scene.sentenceList.length, 'sentences');

  // Reset stage (clear existing state)
  resetStage(true);

  // Reset sentence ID to start from beginning
  WebGAL.sceneManager.sceneData.currentSentenceId = 0;

  // Clear scene stack (no parent scenes)
  WebGAL.sceneManager.sceneData.sceneStack = [];

  // Inject the scene directly
  WebGAL.sceneManager.sceneData.currentScene = scene;

  // Register assets for prefetching
  for (const asset of scene.assetsList) {
    if (!WebGAL.sceneManager.settledAssets.includes(asset.url)) {
      WebGAL.sceneManager.settledAssets.push(asset.url);
    }
  }

  // Log first few sentences for debugging
  console.log('[PaperLauncher] First 5 sentences:');
  scene.sentenceList.slice(0, 5).forEach((s, i) => {
    console.log(`  [${i}] ${s.commandRaw}: ${s.content?.substring(0, 40)}...`);
  });

  // Hide title screen before starting execution
  webgalStore.dispatch(setVisibility({ component: 'showTitle', visibility: false }));

  // Start executing the first sentence
  nextSentence();

  console.log('[PaperLauncher] Game started successfully');
}

/**
 * Start Paper game from AIGeneratedScript
 * Builds the IScene using PaperSceneBuilder, then starts the game
 */
export function startPaperGameWithScript(
  script: AIGeneratedScript,
  sessionId?: string,
  options?: PaperSceneBuilderOptions
): void {
  console.log('[PaperLauncher] Building scene from AIGeneratedScript');
  console.log('[PaperLauncher] Script metadata:', script.metadata);

  // Validate script before building
  const validation = PaperSceneBuilder.validate(script);
  if (!validation.valid) {
    console.error('[PaperLauncher] Script validation failed:', validation.errors);
    throw new Error(`Invalid script: ${validation.errors.join(', ')}`);
  }

  // Build scene
  const builder = new PaperSceneBuilder(options);
  const scene = builder.build(script, sessionId);

  // Start game with built scene
  startPaperGameWithScene(scene);
}

/**
 * Fetch AIGeneratedScript from API and start game
 * This is the high-level entry point that replaces the old text-based approach
 */
export async function launchPaperGameFromAPI(
  sessionId: string,
  options?: PaperSceneBuilderOptions
): Promise<void> {
  console.log('[PaperLauncher] Launching Paper game for session:', sessionId);

  try {
    // Fetch structured script data from API
    // Note: API needs to be updated to return AIGeneratedScript format
    const response = await fetch(`/api/generate/structured/${sessionId}`);
    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to fetch script data');
    }

    const script: AIGeneratedScript = result.data;
    startPaperGameWithScript(script, sessionId, options);
  } catch (error) {
    console.error('[PaperLauncher] Failed to launch game:', error);
    throw error;
  }
}

/**
 * Legacy compatibility: Start Paper game from session ID (fetches text script)
 * This maintains backward compatibility with the existing API
 *
 * @deprecated Use launchPaperGameFromAPI when API returns structured data
 */
export async function startPaperGameLegacy(sessionId: string): Promise<void> {
  console.log('[PaperLauncher] Starting legacy Paper game for session:', sessionId);

  // Import the old implementation
  const { startPaperGame } = await import('@/Core/controller/gamePlay/startContinueGame');
  await startPaperGame(sessionId);
}
