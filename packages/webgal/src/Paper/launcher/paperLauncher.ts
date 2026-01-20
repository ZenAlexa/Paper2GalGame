/**
 * Paper Mode Launcher
 *
 * Provides functions to start Paper games with direct IScene injection,
 * bypassing the traditional script file parsing flow.
 */

import { nextSentence } from '@/Core/controller/gamePlay/nextSentence';
import type { IScene } from '@/Core/controller/scene/sceneInterface';
import { resetStage } from '@/Core/controller/stage/resetStage';
import { setPaperStorageAsync } from '@/Core/controller/storage/storageController';
import { WebGAL } from '@/Core/WebGAL';
import { setVisibility } from '@/store/GUIReducer';
import {
  enterPaperMode,
  exitPaperMode,
  savePaperToHistory,
  setPaper,
  setSession,
  setTotalDialogues,
} from '@/store/paperReducer';
import { webgalStore } from '@/store/store';
import { PaperSceneBuilder, type PaperSceneBuilderOptions } from '../builder';
import { TTSClient } from '../tts';
import type { AIGeneratedScript } from '../types';

/**
 * Start Paper game with a pre-built IScene
 * This is the lowest-level launcher - directly injects the scene
 */
export function startPaperGameWithScene(scene: IScene): void {
  console.log('[PaperLauncher] Starting game with pre-built scene:', scene.sceneName);
  console.log('[PaperLauncher] Scene has', scene.sentenceList.length, 'sentences');

  // Reset stage (clear existing state)
  resetStage(true);

  // Enter Paper mode and set total dialogues for progress tracking
  webgalStore.dispatch(enterPaperMode());
  webgalStore.dispatch(setTotalDialogues(scene.sentenceList.length));

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

  // Initialize Paper state with metadata
  if (script.metadata) {
    webgalStore.dispatch(
      setPaper({
        metadata: {
          paperId: sessionId || `paper_${Date.now()}`,
          title: script.metadata.paperTitle || 'Untitled Paper',
          authors: [], // Not available in current script format
          abstract: '', // Not available in current script format
          uploadedAt: new Date().toISOString(),
          source: 'upload',
        },
        totalDialogues: script.dialogues.length,
      })
    );
  }

  // Set session information if available
  if (sessionId) {
    webgalStore.dispatch(
      setSession({
        sessionId,
        apiBaseUrl: '/api',
        scriptGenerated: true,
        ttsGenerated: false,
      })
    );
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
export async function launchPaperGameFromAPI(sessionId: string, options?: PaperSceneBuilderOptions): Promise<void> {
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

/**
 * Options for launching Paper game with TTS
 */
export interface LaunchWithTTSOptions extends PaperSceneBuilderOptions {
  /** Skip TTS generation (use if audio already generated) */
  skipTTS?: boolean;
  /** TTS provider to use */
  ttsProvider?: 'minimax' | 'voicevox';
  /** Callback for TTS generation progress (future use) */
  onTTSProgress?: (completed: number, total: number) => void;
}

/**
 * Launch Paper game with TTS voice generation
 *
 * This is the recommended entry point for Paper mode. It:
 * 1. Generates TTS audio for all dialogues (unless skipTTS is true)
 * 2. Fetches the structured script data with vocal URLs
 * 3. Builds the IScene with all assets
 * 4. Starts the game
 *
 * @param sessionId - Session ID from /api/generate
 * @param options - Launch options including TTS settings
 */
export async function launchPaperGameWithTTS(sessionId: string, options: LaunchWithTTSOptions = {}): Promise<void> {
  console.log('[PaperLauncher] Launching Paper game with TTS for session:', sessionId);

  let ttsGenerated = false;

  try {
    // Step 1: Generate TTS audio (unless skipped)
    if (!options.skipTTS) {
      console.log('[PaperLauncher] Generating TTS vocals...');

      const ttsResult = await TTSClient.generateVocals(sessionId, {
        provider: options.ttsProvider,
      });

      if (ttsResult.success) {
        console.log(
          '[PaperLauncher] TTS generation complete:',
          ttsResult.audio?.totalFiles,
          'files,',
          `${ttsResult.audio?.successRate}% success rate`
        );
        ttsGenerated = true;
      } else {
        console.warn('[PaperLauncher] TTS generation failed:', ttsResult.error?.message, '- continuing without audio');
      }
    } else {
      console.log('[PaperLauncher] Skipping TTS generation (skipTTS=true)');
      ttsGenerated = true; // Assume already generated if skipped
    }

    // Step 2: Fetch structured script data (now includes vocals if generated)
    console.log('[PaperLauncher] Fetching structured script data...');

    const response = await fetch(`/api/generate/structured/${sessionId}`);
    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to fetch script data');
    }

    const script: AIGeneratedScript = result.data;
    console.log('[PaperLauncher] Loaded script with', script.dialogues.length, 'dialogues');

    // Step 3: Build scene and start game
    startPaperGameWithScript(script, sessionId, options);

    // Update session with TTS status
    webgalStore.dispatch(
      setSession({
        sessionId,
        apiBaseUrl: '/api',
        scriptGenerated: true,
        ttsGenerated,
      })
    );

    console.log('[PaperLauncher] Paper game with TTS launched successfully');
  } catch (error) {
    console.error('[PaperLauncher] Failed to launch game with TTS:', error);
    throw error;
  }
}

/**
 * Check if TTS is available and which providers are configured
 *
 * @returns TTS availability status
 */
export async function checkTTSAvailability(): Promise<{
  available: boolean;
  providers: Array<{
    id: string;
    name: string;
    configured: boolean;
  }>;
}> {
  return TTSClient.checkAvailability();
}

/**
 * Exit Paper mode and save progress to history
 *
 * Call this when the user returns to the title screen or closes the game.
 * This saves the current progress to paper history for resuming later.
 */
export async function exitPaperGame(): Promise<void> {
  console.log('[PaperLauncher] Exiting Paper mode');

  const paperState = webgalStore.getState().paper;

  if (paperState.isPaperMode && paperState.currentPaper) {
    // Save current progress to history before exiting
    webgalStore.dispatch(savePaperToHistory());
    console.log('[PaperLauncher] Progress saved to history');

    // Persist to storage
    await setPaperStorageAsync();
    console.log('[PaperLauncher] Progress persisted to storage');
  }

  // Exit Paper mode
  webgalStore.dispatch(exitPaperMode());

  console.log('[PaperLauncher] Paper mode exited');
}

/**
 * Get current Paper reading progress
 *
 * @returns Current progress or null if not in Paper mode
 */
export function getPaperProgress(): {
  currentDialogueIndex: number;
  totalDialogues: number;
  percentage: number;
  phaseName: string;
} | null {
  const paperState = webgalStore.getState().paper;

  if (!paperState.isPaperMode || !paperState.progress) {
    return null;
  }

  return {
    currentDialogueIndex: paperState.progress.currentDialogueIndex,
    totalDialogues: paperState.progress.totalDialogues,
    percentage: paperState.progress.percentage,
    phaseName: paperState.progress.phaseName,
  };
}

/**
 * Check if currently in Paper mode
 *
 * @returns True if Paper mode is active
 */
export function isPaperModeActive(): boolean {
  return webgalStore.getState().paper.isPaperMode;
}
