import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { nextSentence } from '@/Core/controller/gamePlay/nextSentence';
import { extendCurrentScene } from '@/Core/controller/scene/extendScene';
import { WebGAL } from '@/Core/WebGAL';
import useApplyStyle from '@/hooks/useApplyStyle';
import { useFontFamily } from '@/hooks/useFontFamily';
import { useSEByWebgalStore } from '@/hooks/useSoundEffect';
import type { RootState } from '@/store/store';
import styles from './waitForGeneration.module.scss';

// Session status from API
type SessionStatus =
  | 'created'
  | 'uploading'
  | 'parsing'
  | 'parsed'
  | 'generating'
  | 'generated'
  | 'synthesizing'
  | 'ready'
  | 'error';

// API response structure
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

interface SessionResponse {
  id: string;
  status: SessionStatus;
  error?: string;
}

interface ScriptResponse {
  script: string;
  metadata: {
    totalDialogues: number;
    characters: string[];
    estimatedDuration: number;
  };
}

// Polling configuration
const POLL_INTERVAL = 2000; // 2 seconds
const TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Default characters for generation
const DEFAULT_CHARACTERS = ['host', 'energizer', 'analyst', 'interpreter'];

export interface WaitForGenerationUIProps {
  promptText: string;
}

/**
 * Wait For Generation UI Component
 * Displays loading animation while AI generates the script
 * Polls session status and injects script when ready
 */
export function WaitForGenerationUI({ promptText }: WaitForGenerationUIProps) {
  const font = useFontFamily();
  const applyStyle = useApplyStyle('Stage/WaitForGeneration/waitForGeneration.scss');
  const { playSeEnter, playSeClick } = useSEByWebgalStore();

  // Get sessionId from GameVar (set by uploadPaper command)
  const stageState = useSelector((state: RootState) => state.stage);
  const sessionId = stageState.GameVar.paperSessionId as string | undefined;

  const [statusMessage, setStatusMessage] = useState(promptText);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const generationStartedRef = useRef(false);
  // Guard to prevent duplicate script injection (Codex review fix)
  const isFetchingScriptRef = useRef(false);

  // Fetch script and inject into current scene
  const fetchAndInjectScript = useCallback(async () => {
    // Guard: prevent duplicate injection (Codex review fix)
    if (!sessionId || isCompleted || isFetchingScriptRef.current) return;
    isFetchingScriptRef.current = true;

    try {
      // URL encode sessionId to prevent path injection (Codex review fix)
      const response = await fetch(`/api/generate/script/${encodeURIComponent(sessionId)}`, {
        signal: abortControllerRef.current?.signal,
      });

      // Check response.ok before parsing (Codex review fix)
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText) as ApiResponse;
          throw new Error(errorData.error?.message || `Server error: ${response.status}`);
        } catch {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const data = (await response.json()) as ApiResponse<ScriptResponse>;

      if (!data.success || !data.data) {
        setError(data.error?.message || 'Failed to get script');
        isFetchingScriptRef.current = false;
        return;
      }

      const { script, metadata } = data.data;

      // Inject script into current scene
      const injectedCount = extendCurrentScene(script);

      console.log(`[WaitForGeneration] Injected ${injectedCount} sentences (${metadata.totalDialogues} dialogues)`);

      // Mark as completed to prevent re-fetch
      setIsCompleted(true);

      // Small delay to show completion status
      setProgress(100);
      setStatusMessage('Discussion loaded!');
      await new Promise((r) => setTimeout(r, 500));

      // Unmount UI and continue game
      WebGAL.gameplay.performController.unmountPerform('waitForGeneration');
      nextSentence();
    } catch (err) {
      isFetchingScriptRef.current = false;
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Failed to load script');
      }
    }
  }, [sessionId, isCompleted]);

  // Poll session status
  const pollStatus = useCallback(async () => {
    if (!sessionId || isCompleted) return;

    try {
      // URL encode sessionId to prevent path injection (Codex review fix)
      const response = await fetch(`/api/session/${encodeURIComponent(sessionId)}`, {
        signal: abortControllerRef.current?.signal,
      });

      // Check response.ok before parsing (Codex review fix)
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText) as ApiResponse;
          throw new Error(errorData.error?.message || `Server error: ${response.status}`);
        } catch {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const data = (await response.json()) as ApiResponse<SessionResponse>;

      if (!data.success || !data.data) {
        setError(data.error?.message || 'Failed to get session status');
        return;
      }

      const sessionData = data.data;

      // Update progress and message based on status
      switch (sessionData.status) {
        case 'parsed':
          setStatusMessage('Paper analyzed, preparing to generate...');
          setProgress(20);
          break;
        case 'generating':
          setStatusMessage('AI is writing the discussion script...');
          setProgress(50);
          break;
        case 'generated':
          setStatusMessage('Script ready! Loading content...');
          setProgress(80);
          break;
        case 'synthesizing':
          setStatusMessage('Generating voice audio...');
          setProgress(90);
          break;
        case 'ready':
          setStatusMessage('All ready! Starting discussion...');
          setProgress(100);
          break;
        case 'error':
          setError(sessionData.error || 'Generation failed');
          return;
        default:
          setStatusMessage(promptText);
      }

      // If generated or ready, fetch and inject script
      if (sessionData.status === 'generated' || sessionData.status === 'ready') {
        await fetchAndInjectScript();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Network error');
      }
    }
  }, [sessionId, promptText, isCompleted, fetchAndInjectScript]);

  // Trigger script generation
  const startGeneration = useCallback(async () => {
    if (!sessionId || generationStartedRef.current) return;
    generationStartedRef.current = true;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          characters: DEFAULT_CHARACTERS,
          language: 'zh',
          style: 'educational',
        }),
        signal: abortControllerRef.current?.signal,
      });

      // Check response.ok before parsing (Codex review fix)
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText) as ApiResponse;
          throw new Error(errorData.error?.message || `Server error: ${response.status}`);
        } catch {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const data = (await response.json()) as ApiResponse;
      if (!data.success) {
        setError(data.error?.message || 'Failed to start generation');
      }
      // Generation started, polling will track progress
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Network error');
      }
    }
  }, [sessionId]);

  // Main effect: start generation and polling
  useEffect(() => {
    if (!sessionId) {
      setError('No session found. Please upload a paper first.');
      return;
    }

    abortControllerRef.current = new AbortController();
    startTimeRef.current = Date.now();

    // Start generation
    startGeneration();

    // Start polling
    const pollInterval = setInterval(() => {
      // Check timeout
      if (Date.now() - startTimeRef.current > TIMEOUT) {
        setError('Generation timed out. Please try again.');
        clearInterval(pollInterval);
        return;
      }

      pollStatus();
    }, POLL_INTERVAL);

    // Initial poll
    pollStatus();

    return () => {
      clearInterval(pollInterval);
      abortControllerRef.current?.abort();
    };
  }, [sessionId, startGeneration, pollStatus]);

  const containerClassName = applyStyle('WaitForGeneration_Container', styles.WaitForGeneration_Container);

  return (
    <div className={applyStyle('WaitForGeneration_Main', styles.WaitForGeneration_Main)}>
      <div className={containerClassName} style={{ fontFamily: font }}>
        <div className={applyStyle('WaitForGeneration_Title', styles.WaitForGeneration_Title)}>
          {error ? 'Error' : statusMessage}
        </div>

        {!error && (
          <>
            <div className={applyStyle('WaitForGeneration_Spinner', styles.WaitForGeneration_Spinner)}>
              <div className={applyStyle('WaitForGeneration_SpinnerInner', styles.WaitForGeneration_SpinnerInner)} />
            </div>

            <div className={applyStyle('WaitForGeneration_Progress', styles.WaitForGeneration_Progress)}>
              <div className={applyStyle('WaitForGeneration_ProgressBar', styles.WaitForGeneration_ProgressBar)}>
                <div
                  className={applyStyle('WaitForGeneration_ProgressFill', styles.WaitForGeneration_ProgressFill)}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className={applyStyle('WaitForGeneration_ProgressText', styles.WaitForGeneration_ProgressText)}>
                {progress}%
              </div>
            </div>

            <div className={applyStyle('WaitForGeneration_Hint', styles.WaitForGeneration_Hint)}>
              AI is preparing the discussion based on your paper...
            </div>
          </>
        )}

        {error && (
          <>
            <div className={applyStyle('WaitForGeneration_Error', styles.WaitForGeneration_Error)}>{error}</div>
            <button
              type="button"
              className={applyStyle('WaitForGeneration_RetryBtn', styles.WaitForGeneration_RetryBtn)}
              onClick={() => {
                playSeClick();
                // Reset state and retry
                setError(null);
                setProgress(0);
                generationStartedRef.current = false;
                isFetchingScriptRef.current = false;
                startTimeRef.current = Date.now();
                startGeneration();
              }}
              onMouseEnter={playSeEnter}
            >
              Retry
            </button>
            <button
              type="button"
              className={applyStyle('WaitForGeneration_CancelBtn', styles.WaitForGeneration_CancelBtn)}
              onClick={() => {
                playSeClick();
                // Unmount and continue game (skip generation)
                WebGAL.gameplay.performController.unmountPerform('waitForGeneration');
                nextSentence();
              }}
              onMouseEnter={playSeEnter}
            >
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  );
}
