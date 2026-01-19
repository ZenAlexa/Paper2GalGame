/**
 * Paper Selection Component - WebGAL Native Style
 * Uses WebGAL's existing UI patterns for seamless integration
 */

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import useApplyStyle from '@/hooks/useApplyStyle';
import useSoundEffect from '@/hooks/useSoundEffect';
import useTrans from '@/hooks/useTrans';
import type { RootState } from '@/store/store';
import styles from './paperSelection.module.scss';

interface PaperSelectionProps {
  onGameStart?: (sessionId: string) => void;
  onGameContinue?: (paperId: string) => void;
  onBack?: () => void;
}

type GenerationStatus = 'idle' | 'uploading' | 'generating' | 'ready' | 'error';

// Poll interval and timeout constants
const POLL_INTERVAL_MS = 2000;
const GENERATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Paper Selection - WebGAL Style
 */
export function PaperSelection({ onGameStart, onBack }: PaperSelectionProps) {
  const GUIState = useSelector((state: RootState) => state.GUI);
  const background = GUIState.titleBg;
  const showBackground = background === '' ? 'rgba(0,0,0,1)' : `url("${background}")`;

  const _t = useTrans('title.');
  const { playSeEnter, playSeClick } = useSoundEffect();
  const applyStyle = useApplyStyle('UI/Title/title.scss');

  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection with validation
  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc|txt)$/i)) {
      setErrorMessage('Please select a PDF, Word, or text file');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
  }, []);

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  // Ref for tracking polling state
  const pollingRef = useRef<{
    intervalId: ReturnType<typeof setInterval> | null;
    startTime: number;
    abortController: AbortController | null;
  }>({ intervalId: null, startTime: 0, abortController: null });

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current.intervalId) {
        clearInterval(pollingRef.current.intervalId);
      }
      if (pollingRef.current.abortController) {
        pollingRef.current.abortController.abort();
      }
    };
  }, []);

  // Poll session status
  const pollSessionStatus = useCallback(async (sid: string): Promise<boolean> => {
    const response = await fetch(`/api/session/${sid}`);
    if (!response.ok) {
      throw new Error('Failed to get session status');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Session error');
    }

    const sessionStatus = result.data.status;

    // Check for completion states
    if (sessionStatus === 'generated' || sessionStatus === 'ready') {
      setProgress(100);
      setStatus('ready');
      return true; // Stop polling
    }

    if (sessionStatus === 'error') {
      throw new Error(result.data.error || 'Generation failed');
    }

    // Update progress based on status
    if (sessionStatus === 'parsing') {
      setProgress(30);
    } else if (sessionStatus === 'generating') {
      // Increment progress slowly during generation
      setProgress((prev) => Math.min(prev + 2, 90));
    }

    return false; // Continue polling
  }, []);

  // Handle generation
  const handleStartGeneration = useCallback(async () => {
    if (!selectedFile) return;

    setStatus('uploading');
    setProgress(10);

    // Create abort controller for this generation
    const abortController = new AbortController();
    pollingRef.current.abortController = abortController;

    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      if (!uploadResult.success) {
        throw new Error(uploadResult.error?.message || 'Upload failed');
      }

      const newSessionId = uploadResult.data.sessionId;
      setSessionId(newSessionId);
      setProgress(40);
      setStatus('generating');

      // Start generation (non-blocking approach)
      pollingRef.current.startTime = Date.now();

      // Start generation request
      const generatePromise = fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionId,
          characters: ['host', 'energizer', 'analyst', 'interpreter'],
          language: 'zh',
        }),
        signal: abortController.signal,
      });

      // Start polling for status
      pollingRef.current.intervalId = setInterval(async () => {
        try {
          // Check timeout
          if (Date.now() - pollingRef.current.startTime > GENERATION_TIMEOUT_MS) {
            clearInterval(pollingRef.current.intervalId!);
            pollingRef.current.intervalId = null;
            abortController.abort();
            setStatus('error');
            setErrorMessage('Generation timed out. Please try again.');
            return;
          }

          const done = await pollSessionStatus(newSessionId);
          if (done && pollingRef.current.intervalId) {
            clearInterval(pollingRef.current.intervalId);
            pollingRef.current.intervalId = null;
          }
        } catch (pollError) {
          console.error('[PaperSelection] Polling error:', pollError);
        }
      }, POLL_INTERVAL_MS);

      // Wait for generation to complete
      const generateResponse = await generatePromise;

      // Clear polling since we got a response
      if (pollingRef.current.intervalId) {
        clearInterval(pollingRef.current.intervalId);
        pollingRef.current.intervalId = null;
      }

      if (!generateResponse.ok) {
        throw new Error('Generation failed');
      }

      const generateResult = await generateResponse.json();
      if (!generateResult.success) {
        throw new Error(generateResult.error?.message || 'Generation failed');
      }

      setProgress(100);
      setStatus('ready');
    } catch (error) {
      // Clear polling on error
      if (pollingRef.current.intervalId) {
        clearInterval(pollingRef.current.intervalId);
        pollingRef.current.intervalId = null;
      }

      if ((error as Error).name === 'AbortError') {
        // Request was cancelled, don't show error
        return;
      }

      console.error('[PaperSelection] Error:', error);
      setStatus('error');
      setErrorMessage((error as Error).message);
    }
  }, [selectedFile, pollSessionStatus]);

  // Render upload area (WebGAL button style)
  const renderUploadArea = () => (
    <div
      className={styles.uploadArea}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => fileInputRef.current?.click()}
      onMouseEnter={playSeEnter}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        style={{ display: 'none' }}
      />
      {selectedFile ? (
        <div className={styles.fileInfo}>
          <span className={styles.fileName}>{selectedFile.name}</span>
          <span className={styles.fileSize}>({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
        </div>
      ) : (
        <span>Drop paper here or click to select</span>
      )}
    </div>
  );

  // Render progress
  const renderProgress = () => (
    <div className={styles.progressContainer}>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>
      <span className={styles.progressText}>
        {status === 'uploading' && 'Uploading...'}
        {status === 'generating' && 'Generating script...'}
        {status === 'ready' && 'Ready!'}
        {status === 'error' && errorMessage}
      </span>
    </div>
  );

  return (
    <div
      className={styles.paperSelection}
      style={{
        backgroundImage: showBackground,
        backgroundSize: 'cover',
      }}
    >
      <div className={styles.overlay} />

      <div className={styles.content}>
        <h1 className={styles.title}>Paper2GalGame</h1>
        <p className={styles.subtitle}>Transform academic papers into visual novel experiences</p>

        {status === 'idle' && (
          <>
            {renderUploadArea()}

            {selectedFile && (
              <div
                className={applyStyle('Title_button', styles.actionButton)}
                onClick={() => {
                  playSeClick();
                  handleStartGeneration();
                }}
                onMouseEnter={playSeEnter}
              >
                <div className={applyStyle('Title_button_text', styles.buttonText)}>Start Generation</div>
              </div>
            )}
          </>
        )}

        {(status === 'uploading' || status === 'generating') && renderProgress()}

        {status === 'ready' && sessionId && (
          <div
            className={applyStyle('Title_button', styles.actionButton)}
            onClick={() => {
              playSeClick();
              onGameStart?.(sessionId);
            }}
            onMouseEnter={playSeEnter}
          >
            <div className={applyStyle('Title_button_text', styles.buttonText)}>Play Now</div>
          </div>
        )}

        {status === 'error' && (
          <>
            <p className={styles.error}>{errorMessage}</p>
            <div
              className={applyStyle('Title_button', styles.actionButton)}
              onClick={() => {
                playSeClick();
                setStatus('idle');
                setSelectedFile(null);
              }}
              onMouseEnter={playSeEnter}
            >
              <div className={applyStyle('Title_button_text', styles.buttonText)}>Retry</div>
            </div>
          </>
        )}

        <div
          className={applyStyle('Title_button', styles.backButton)}
          onClick={() => {
            playSeClick();
            onBack?.();
          }}
          onMouseEnter={playSeEnter}
        >
          <div className={applyStyle('Title_button_text', styles.buttonText)}>Back</div>
        </div>
      </div>
    </div>
  );
}

export default PaperSelection;
