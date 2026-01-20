/**
 * Paper Selection Component - WebGAL Native Style
 * Uses WebGAL's existing UI patterns for seamless integration
 * Features: Paper upload, character selection, warm color scheme
 */

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import useApplyStyle from '@/hooks/useApplyStyle';
import useSoundEffect from '@/hooks/useSoundEffect';
import { getCharacterDisplayName, PAPER_CHARACTERS } from '@/Paper/config/characters';
import type { RootState } from '@/store/store';
import styles from './paperSelection.module.scss';

interface PaperSelectionProps {
  onGameStart?: (sessionId: string) => void;
  onGameContinue?: (paperId: string) => void;
  onBack?: () => void;
}

type GenerationStatus = 'idle' | 'uploading' | 'generating' | 'ready' | 'error';
type SelectionStep = 'upload' | 'characters' | 'generating';

// Poll interval and timeout constants
const POLL_INTERVAL_MS = 2000;
const GENERATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// All available characters
const ALL_CHARACTER_IDS = Object.keys(PAPER_CHARACTERS);

/**
 * Paper Selection - WebGAL Style
 */
export function PaperSelection({ onGameStart, onBack }: PaperSelectionProps) {
  const GUIState = useSelector((state: RootState) => state.GUI);
  const background = GUIState.titleBg;
  const showBackground = background === '' ? 'rgba(0,0,0,1)' : `url("${background}")`;

  const { playSeEnter, playSeClick } = useSoundEffect();
  const applyStyle = useApplyStyle('UI/Title/title.scss');

  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [step, setStep] = useState<SelectionStep>('upload');
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(ALL_CHARACTER_IDS);
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

  // Handle character toggle
  const toggleCharacter = useCallback(
    (characterId: string) => {
      playSeClick();
      setSelectedCharacters((prev) => {
        if (prev.includes(characterId)) {
          // Must keep at least one character
          if (prev.length <= 1) return prev;
          return prev.filter((id) => id !== characterId);
        }
        return [...prev, characterId];
      });
    },
    [playSeClick]
  );

  // Proceed from upload to character selection
  const handleProceedToCharacters = useCallback(() => {
    if (!selectedFile) return;
    playSeClick();
    setStep('characters');
  }, [selectedFile, playSeClick]);

  // Handle generation
  const handleStartGeneration = useCallback(async () => {
    if (!selectedFile || selectedCharacters.length === 0) return;

    setStep('generating');
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

      // Start generation request with selected characters
      const generatePromise = fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionId,
          characters: selectedCharacters,
          language: 'zh',
        }),
        signal: abortController.signal,
      });

      // Start polling for status
      pollingRef.current.intervalId = setInterval(async () => {
        try {
          // Check timeout
          if (Date.now() - pollingRef.current.startTime > GENERATION_TIMEOUT_MS) {
            if (pollingRef.current.intervalId) {
              clearInterval(pollingRef.current.intervalId);
            }
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
  }, [selectedFile, selectedCharacters, pollSessionStatus]);

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

  // Render character selection
  const renderCharacterSelection = () => (
    <div className={styles.characterSelection}>
      <h3 className={styles.sectionTitle}>Select Characters</h3>
      <p className={styles.sectionHint}>Choose which characters will narrate your paper</p>
      <div className={styles.characterGrid}>
        {ALL_CHARACTER_IDS.map((id) => {
          const character = PAPER_CHARACTERS[id];
          const isSelected = selectedCharacters.includes(id);
          return (
            <div
              key={id}
              className={`${styles.characterCard} ${isSelected ? styles.selected : ''}`}
              onClick={() => toggleCharacter(id)}
              onMouseEnter={playSeEnter}
            >
              <div className={styles.characterAvatar}>
                <img
                  src={`/game/figure/${character.sprite.filename}`}
                  alt={character.name.en}
                  className={styles.characterImage}
                />
              </div>
              <div className={styles.characterInfo}>
                <span className={styles.characterName}>{getCharacterDisplayName(id, 'jp')}</span>
                <span className={styles.characterRole}>{character.paperRole}</span>
              </div>
              <div className={styles.checkmark}>{isSelected ? '✓' : ''}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render progress
  const renderProgress = () => (
    <div className={styles.progressContainer}>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>
      <span className={styles.progressText}>
        {status === 'uploading' && 'Uploading paper...'}
        {status === 'generating' && `Generating script with ${selectedCharacters.length} characters...`}
        {status === 'ready' && 'Ready to play!'}
        {status === 'error' && errorMessage}
      </span>
    </div>
  );

  // Back button handler depends on current step
  const handleBack = () => {
    playSeClick();
    if (step === 'characters') {
      setStep('upload');
    } else if (step === 'generating' && status === 'error') {
      setStep('characters');
      setStatus('idle');
    } else {
      onBack?.();
    }
  };

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

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <>
            {renderUploadArea()}
            {errorMessage && <p className={styles.error}>{errorMessage}</p>}

            {selectedFile && (
              <div
                className={applyStyle('Title_button', styles.actionButton)}
                onClick={handleProceedToCharacters}
                onMouseEnter={playSeEnter}
              >
                <div className={applyStyle('Title_button_text', styles.buttonText)}>Next: Select Characters</div>
              </div>
            )}
          </>
        )}

        {/* Step 2: Character Selection */}
        {step === 'characters' && (
          <>
            {renderCharacterSelection()}

            <div
              className={applyStyle('Title_button', styles.actionButton)}
              onClick={() => handleStartGeneration()}
              onMouseEnter={playSeEnter}
            >
              <div className={applyStyle('Title_button_text', styles.buttonText)}>
                Start Generation ({selectedCharacters.length} characters)
              </div>
            </div>
          </>
        )}

        {/* Step 3: Generating */}
        {step === 'generating' && (
          <>
            {renderProgress()}

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
              <div
                className={applyStyle('Title_button', styles.actionButton)}
                onClick={() => {
                  playSeClick();
                  setStep('characters');
                  setStatus('idle');
                  setProgress(0);
                }}
                onMouseEnter={playSeEnter}
              >
                <div className={applyStyle('Title_button_text', styles.buttonText)}>Retry</div>
              </div>
            )}
          </>
        )}

        {/* Back button */}
        <div className={applyStyle('Title_button', styles.backButton)} onClick={handleBack} onMouseEnter={playSeEnter}>
          <div className={applyStyle('Title_button_text', styles.buttonText)}>
            {step === 'upload' ? 'Back' : 'Previous'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaperSelection;
