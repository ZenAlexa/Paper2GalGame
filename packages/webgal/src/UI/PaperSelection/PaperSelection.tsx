/**
 * Paper Selection Component
 *
 * Main entry point for paper upload, character selection,
 * and game management in Paper2GalGame
 */

import React, { useState, useCallback, useEffect } from 'react';
import styles from './paperSelection.module.scss';
import { UI_LABELS, CHARACTER_ROLES, formatDate, getLabel } from './labels';
import type {
  PaperSelectionProps,
  CharacterDisplayInfo,
  GameCardInfo,
  GenerationStatus,
  MultiLanguageText
} from './types';

/**
 * Paper Selection Main Component
 */
export function PaperSelection({
  initialLanguage = 'zh',
  onGameStart,
  onGameContinue,
  onLoadSave
}: PaperSelectionProps) {
  // State
  const [language, setLanguage] = useState<'zh' | 'jp' | 'en'>(initialLanguage);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [savedGames, setSavedGames] = useState<GameCardInfo[]>([]);
  const [currentView, setCurrentView] = useState<'main' | 'upload' | 'saves'>('main');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // Character list with current language
  const characters: CharacterDisplayInfo[] = Object.entries(CHARACTER_ROLES).map(
    ([id, data]) => ({
      id,
      name: data.name,
      role: data.role,
      description: data.description,
      sprite: `${id}.webp`,
      selected: selectedCharacters.includes(id)
    })
  );

  // Load saved games on mount
  useEffect(() => {
    loadSavedGames();
  }, []);

  // Load saved games from localStorage
  const loadSavedGames = useCallback(() => {
    const games: GameCardInfo[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('paper_game_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');
          games.push({
            paperId: data.paperId,
            paperTitle: data.paperTitle,
            progress: data.gameProgress?.totalProgress || 0,
            lastPlayedAt: new Date(data.lastPlayedAt),
            createdAt: new Date(data.createdAt),
            screenshotUrl: data.screenshotUrl,
            hasSaves: data.saveSlots?.some((s: unknown) => s !== null) ||
                      data.quickSave !== null ||
                      data.autoSave !== null
          });
        } catch (e) {
          console.warn('Failed to parse saved game:', key, e);
        }
      }
    }

    // Sort by last played
    games.sort((a, b) => b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime());
    setSavedGames(games);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setErrorMessage('');
  }, []);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle character toggle
  const handleCharacterToggle = useCallback((characterId: string) => {
    setSelectedCharacters(prev => {
      if (prev.includes(characterId)) {
        return prev.filter(id => id !== characterId);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, characterId];
    });
  }, []);

  // Handle start generation
  const handleStartGeneration = useCallback(async () => {
    if (!selectedFile || selectedCharacters.length < 2) {
      return;
    }

    setStatus('uploading');
    setProgress(0);

    try {
      // Simulate upload progress
      setStatus('parsing');
      setProgress(20);

      // TODO: Actual API call to parse and generate
      // This would integrate with the extensions/api module

      // Simulate generation progress
      setStatus('generating');
      for (let i = 30; i <= 50; i += 5) {
        await new Promise(r => setTimeout(r, 500));
        setProgress(i);
      }

      // Ready to play at 50%
      setStatus('ready');
      setProgress(50);

      // Continue background generation
      // Background generation would continue via the incremental generator

    } catch (error) {
      setStatus('error');
      setErrorMessage((error as Error).message);
    }
  }, [selectedFile, selectedCharacters]);

  // Handle continue game
  const handleContinueGame = useCallback((paperId: string) => {
    onGameContinue?.(paperId);
  }, [onGameContinue]);

  // Handle load save
  const handleLoadSave = useCallback((paperId: string, slotIndex: number) => {
    onLoadSave?.(paperId, slotIndex);
  }, [onLoadSave]);

  // Handle delete game
  const handleDeleteGame = useCallback((paperId: string) => {
    if (window.confirm(getLabel('deleteConfirm', language))) {
      localStorage.removeItem(`paper_game_${paperId}`);
      loadSavedGames();
    }
  }, [language, loadSavedGames]);

  // Get text for current language
  const t = useCallback((key: keyof typeof UI_LABELS) => {
    return UI_LABELS[key][language];
  }, [language]);

  // Render language selector
  const renderLanguageSelector = () => (
    <div className={styles.languageSelector}>
      <button
        className={`${styles.langBtn} ${language === 'zh' ? styles.active : ''}`}
        onClick={() => setLanguage('zh')}
      >
        中文
      </button>
      <button
        className={`${styles.langBtn} ${language === 'jp' ? styles.active : ''}`}
        onClick={() => setLanguage('jp')}
      >
        日本語
      </button>
      <button
        className={`${styles.langBtn} ${language === 'en' ? styles.active : ''}`}
        onClick={() => setLanguage('en')}
      >
        English
      </button>
    </div>
  );

  // Render file uploader
  const renderFileUploader = () => (
    <div
      className={`${styles.fileUploader} ${selectedFile ? styles.hasFile : ''}`}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onClick={() => document.getElementById('fileInput')?.click()}
    >
      <input
        id="fileInput"
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        style={{ display: 'none' }}
      />

      {selectedFile ? (
        <div className={styles.selectedFile}>
          <span className={styles.fileName}>{selectedFile.name}</span>
          <span className={styles.fileSize}>
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
      ) : (
        <>
          <div className={styles.uploadIcon}>📄</div>
          <p className={styles.uploadHint}>{t('dragDropHint')}</p>
          <p className={styles.supportedFormats}>{t('supportedFormats')}</p>
        </>
      )}
    </div>
  );

  // Render character selector
  const renderCharacterSelector = () => (
    <div className={styles.characterSelector}>
      <h3>{t('selectCharacters')}</h3>
      <p className={styles.hint}>{t('minCharactersHint')}</p>

      <div className={styles.characterGrid}>
        {characters.map(char => (
          <div
            key={char.id}
            className={`${styles.characterCard} ${
              selectedCharacters.includes(char.id) ? styles.selected : ''
            }`}
            onClick={() => handleCharacterToggle(char.id)}
          >
            <img
              src={`/game/figure/${char.sprite}`}
              alt={char.name[language]}
              className={styles.characterSprite}
            />
            <div className={styles.characterInfo}>
              <h4>{char.name[language]}</h4>
              <span className={styles.role}>{char.role[language]}</span>
              <p className={styles.description}>{char.description[language]}</p>
            </div>
            <div className={styles.selectIndicator}>
              {selectedCharacters.includes(char.id) ? '✓' : ''}
            </div>
          </div>
        ))}
      </div>

      {selectedCharacters.length < 2 && (
        <p className={styles.warning}>{t('characterRequired')}</p>
      )}
    </div>
  );

  // Render progress display
  const renderProgressDisplay = () => (
    <div className={styles.progressDisplay}>
      <h3>
        {status === 'ready' ? t('readyToPlay') : t('generating')}
      </h3>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className={styles.progressText}>
        {progress}% - {
          status === 'uploading' ? t('uploading') :
          status === 'parsing' ? t('parsing') :
          status === 'generating' ? t('generating') :
          status === 'ready' ? t('readyToPlay') :
          status === 'error' ? errorMessage :
          ''
        }
      </p>

      {status === 'ready' && (
        <button
          className={styles.playButton}
          onClick={() => onGameStart?.('new_paper')}
        >
          {t('play')}
        </button>
      )}

      {status === 'error' && (
        <button
          className={styles.retryButton}
          onClick={() => setStatus('idle')}
        >
          {t('back')}
        </button>
      )}
    </div>
  );

  // Render saved games list
  const renderSavedGames = () => (
    <div className={styles.savedGames}>
      <h2>{t('continueGame')}</h2>

      {savedGames.length === 0 ? (
        <p className={styles.noGames}>{t('noSavedGames')}</p>
      ) : (
        <div className={styles.gamesList}>
          {savedGames.map(game => (
            <div key={game.paperId} className={styles.gameCard}>
              {game.screenshotUrl && (
                <img
                  src={game.screenshotUrl}
                  alt=""
                  className={styles.gameScreenshot}
                />
              )}

              <div className={styles.gameInfo}>
                <h3>
                  {typeof game.paperTitle === 'string'
                    ? game.paperTitle
                    : game.paperTitle[language]}
                </h3>
                <p className={styles.progress}>
                  {t('progress')}: {game.progress}%
                </p>
                <p className={styles.lastPlayed}>
                  {t('lastPlayed')}: {formatDate(game.lastPlayedAt, language)}
                </p>
              </div>

              <div className={styles.gameActions}>
                <button
                  className={styles.continueBtn}
                  onClick={() => handleContinueGame(game.paperId)}
                >
                  {t('play')}
                </button>

                {game.hasSaves && (
                  <button
                    className={styles.loadSaveBtn}
                    onClick={() => {
                      setSelectedGameId(game.paperId);
                      setCurrentView('saves');
                    }}
                  >
                    {t('loadSave')}
                  </button>
                )}

                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteGame(game.paperId)}
                >
                  {t('deleteGame')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render main view
  const renderMainView = () => (
    <div className={styles.mainView}>
      <header className={styles.header}>
        <h1>{t('appTitle')}</h1>
        <p className={styles.subtitle}>{t('appSubtitle')}</p>
        {renderLanguageSelector()}
      </header>

      <div className={styles.content}>
        {/* New Game Section */}
        <section className={styles.newGameSection}>
          <h2>{t('newGame')}</h2>

          {status === 'idle' ? (
            <>
              {renderFileUploader()}

              {selectedFile && (
                <>
                  {renderCharacterSelector()}

                  <button
                    className={styles.startButton}
                    onClick={handleStartGeneration}
                    disabled={selectedCharacters.length < 2}
                  >
                    {t('startGeneration')}
                  </button>
                </>
              )}
            </>
          ) : (
            renderProgressDisplay()
          )}
        </section>

        {/* Continue Game Section */}
        {status === 'idle' && savedGames.length > 0 && (
          <section className={styles.continueSection}>
            {renderSavedGames()}
          </section>
        )}
      </div>

      <footer className={styles.footer}>
        <p>Paper2GalGame © 2026</p>
      </footer>
    </div>
  );

  return (
    <div className={styles.paperSelection}>
      {currentView === 'main' && renderMainView()}
    </div>
  );
}

export default PaperSelection;
