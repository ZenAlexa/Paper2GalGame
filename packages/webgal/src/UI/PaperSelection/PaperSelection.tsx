/**
 * Paper Selection Component - WebGAL Native Style
 * Uses WebGAL's existing UI patterns for seamless integration
 */

import React, { useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import useTrans from '@/hooks/useTrans';
import useSoundEffect from '@/hooks/useSoundEffect';
import useApplyStyle from '@/hooks/useApplyStyle';
import styles from './paperSelection.module.scss';

interface PaperSelectionProps {
  onGameStart?: (sessionId: string) => void;
  onGameContinue?: (paperId: string) => void;
  onBack?: () => void;
}

type GenerationStatus = 'idle' | 'uploading' | 'generating' | 'ready' | 'error';

/**
 * Paper Selection - WebGAL Style
 */
export function PaperSelection({ onGameStart, onBack }: PaperSelectionProps) {
  const GUIState = useSelector((state: RootState) => state.GUI);
  const background = GUIState.titleBg;
  const showBackground = background === '' ? 'rgba(0,0,0,1)' : `url("${background}")`;

  const t = useTrans('title.');
  const { playSeEnter, playSeClick } = useSoundEffect();
  const applyStyle = useApplyStyle('UI/Title/title.scss');

  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
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
    [handleFileSelect],
  );

  // Handle generation
  const handleStartGeneration = useCallback(async () => {
    if (!selectedFile) return;

    setStatus('uploading');
    setProgress(10);

    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      if (!uploadResult.success) {
        throw new Error(uploadResult.error?.message || 'Upload failed');
      }

      setSessionId(uploadResult.data.sessionId);
      setProgress(40);
      setStatus('generating');

      // Generate script
      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: uploadResult.data.sessionId,
          characters: ['host', 'energizer', 'analyst', 'interpreter'],
          language: 'zh',
        }),
      });

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
      console.error('[PaperSelection] Error:', error);
      setStatus('error');
      setErrorMessage((error as Error).message);
    }
  }, [selectedFile]);

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
