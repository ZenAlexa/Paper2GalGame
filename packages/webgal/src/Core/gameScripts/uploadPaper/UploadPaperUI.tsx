import { useCallback, useEffect, useRef, useState } from 'react';
import { nextSentence } from '@/Core/controller/gamePlay/nextSentence';
import { WebGAL } from '@/Core/WebGAL';
import useApplyStyle from '@/hooks/useApplyStyle';
import { useFontFamily } from '@/hooks/useFontFamily';
import { useSEByWebgalStore } from '@/hooks/useSoundEffect';
import { setStageVar } from '@/store/stageReducer';
import { webgalStore } from '@/store/store';
import styles from './uploadPaper.module.scss';

// Allowed file types for paper upload
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Validate uploaded file type and size
 */
function validateFile(file: File, setError: (error: string | null) => void): boolean {
  const isValidType = ALLOWED_TYPES.includes(file.type);
  const isValidExtension = ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

  if (!isValidType && !isValidExtension) {
    setError('Please upload a PDF or DOCX file');
    return false;
  }

  if (file.size > MAX_FILE_SIZE) {
    setError('File size must be less than 50MB');
    return false;
  }

  setError(null);
  return true;
}

export interface UploadPaperUIProps {
  promptText: string;
}

/**
 * Upload Paper UI Component
 * Renders a drop zone for PDF/DOCX files with progress tracking
 * Styled to match WebGAL choose command UI
 */
export function UploadPaperUI({ promptText }: UploadPaperUIProps) {
  const font = useFontFamily();
  const { playSeEnter, playSeClick } = useSEByWebgalStore();
  const applyStyle = useApplyStyle('Stage/UploadPaper/uploadPaper.scss');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // XHR ref for abort cleanup (Codex review fix)
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Cleanup XHR on unmount (Codex review fix)
  useEffect(() => {
    return () => {
      if (xhrRef.current) {
        xhrRef.current.abort();
        xhrRef.current = null;
      }
    };
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (validateFile(file, setError)) {
        playSeClick();
        setSelectedFile(file);
        setUploadProgress(0);
      }
    },
    [playSeClick]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDropZoneClick = useCallback(() => {
    playSeEnter();
    fileInputRef.current?.click();
  }, [playSeEnter]);

  const handleDropZoneKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleDropZoneClick();
      }
    },
    [handleDropZoneClick]
  );

  const handleRemoveFile = useCallback(() => {
    playSeClick();
    setSelectedFile(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [playSeClick]);

  const handleSubmit = useCallback(async () => {
    if (!selectedFile || isUploading) return;

    playSeClick();
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Use XMLHttpRequest for progress tracking
      // Store in ref for cleanup (Codex review fix)
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      // API response structure from /api/upload
      interface UploadApiResponse {
        success: boolean;
        data?: {
          sessionId: string;
          paper: {
            title: string;
            authors: string[];
            abstract: string;
            sectionCount: number;
            wordCount: number;
          };
        };
        error?: {
          code: string;
          message: string;
        };
        timestamp: string;
      }

      const uploadPromise = new Promise<{ sessionId: string }>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText) as UploadApiResponse;
              if (response.success && response.data) {
                resolve({ sessionId: response.data.sessionId });
              } else {
                reject(new Error(response.error?.message || 'Upload failed'));
              }
            } catch {
              reject(new Error('Invalid response format'));
            }
          } else {
            // Try to parse error message from response
            try {
              const errorResponse = JSON.parse(xhr.responseText) as UploadApiResponse;
              reject(new Error(errorResponse.error?.message || `Upload failed: ${xhr.statusText || 'Server error'}`));
            } catch {
              reject(new Error(`Upload failed: ${xhr.statusText || 'Server error'}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error occurred'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);

      const data = await uploadPromise;
      // Clear XHR ref on success (Codex review fix)
      xhrRef.current = null;
      const sessionId = data.sessionId;

      // Store sessionId in GameVar for save/load compatibility
      webgalStore.dispatch(setStageVar({ key: 'paperSessionId', value: sessionId }));

      // Small delay to show 100% progress
      setUploadProgress(100);
      await new Promise((r) => setTimeout(r, 300));

      // Unmount UI and continue game
      WebGAL.gameplay.performController.unmountPerform('uploadPaper');
      nextSentence();
    } catch (err) {
      // Clear XHR ref on failure (Codex review fix)
      xhrRef.current = null;
      setIsUploading(false);
      setUploadProgress(0);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }
  }, [selectedFile, isUploading, playSeClick]);

  const dropZoneClassName = isDragActive
    ? `${applyStyle('UploadPaper_DropZone', styles.UploadPaper_DropZone)} ${applyStyle('UploadPaper_DropZone_Active', styles.UploadPaper_DropZone_Active)}`
    : applyStyle('UploadPaper_DropZone', styles.UploadPaper_DropZone);

  const containerClassName = isUploading
    ? `${applyStyle('UploadPaper_Container', styles.UploadPaper_Container)} ${applyStyle('UploadPaper_Uploading', styles.UploadPaper_Uploading)}`
    : applyStyle('UploadPaper_Container', styles.UploadPaper_Container);

  return (
    <div className={applyStyle('UploadPaper_Main', styles.UploadPaper_Main)}>
      <div className={containerClassName} style={{ fontFamily: font }}>
        <div className={applyStyle('UploadPaper_Title', styles.UploadPaper_Title)}>{promptText}</div>
        <div className={applyStyle('UploadPaper_Description', styles.UploadPaper_Description)}>
          PDF / DOCX (max 50MB)
        </div>

        {!isUploading && (
          <>
            {/* biome-ignore lint/a11y/useSemanticElements: div needed for drag-and-drop functionality */}
            <div
              role="button"
              tabIndex={0}
              className={dropZoneClassName}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleDropZoneClick}
              onKeyDown={handleDropZoneKeyDown}
              onMouseEnter={playSeEnter}
            >
              <div className={applyStyle('UploadPaper_Icon', styles.UploadPaper_Icon)}>+</div>
              <div className={applyStyle('UploadPaper_HintText', styles.UploadPaper_HintText)}>
                {isDragActive ? 'Drop file here' : 'Click or drag file'}
              </div>
              <div className={applyStyle('UploadPaper_SubHint', styles.UploadPaper_SubHint)}>PDF or DOCX</div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleInputChange}
              className={applyStyle('UploadPaper_FileInput', styles.UploadPaper_FileInput)}
            />

            {selectedFile && (
              <div className={applyStyle('UploadPaper_SelectedFile', styles.UploadPaper_SelectedFile)}>
                <span className={applyStyle('UploadPaper_FileName', styles.UploadPaper_FileName)}>
                  {selectedFile.name}
                </span>
                <button
                  type="button"
                  className={applyStyle('UploadPaper_RemoveBtn', styles.UploadPaper_RemoveBtn)}
                  onClick={handleRemoveFile}
                >
                  x
                </button>
              </div>
            )}
          </>
        )}

        {isUploading && (
          <div className={applyStyle('UploadPaper_Progress', styles.UploadPaper_Progress)}>
            <div className={applyStyle('UploadPaper_ProgressBar', styles.UploadPaper_ProgressBar)}>
              <div
                className={applyStyle('UploadPaper_ProgressFill', styles.UploadPaper_ProgressFill)}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className={applyStyle('UploadPaper_ProgressText', styles.UploadPaper_ProgressText)}>
              Uploading... {uploadProgress}%
            </div>
          </div>
        )}

        {error && <div className={applyStyle('UploadPaper_Error', styles.UploadPaper_Error)}>{error}</div>}

        {!isUploading && (
          <button
            type="button"
            className={applyStyle('UploadPaper_SubmitBtn', styles.UploadPaper_SubmitBtn)}
            onClick={handleSubmit}
            disabled={!selectedFile}
            onMouseEnter={playSeEnter}
          >
            Upload
          </button>
        )}
      </div>
    </div>
  );
}
