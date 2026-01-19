/**
 * React Hook for Paper Reading List Management
 *
 * Provides convenient access to the Paper reading list for UI components.
 * Supports listing, loading, and removing Paper reading entries.
 */

import { useCallback, useEffect, useState } from 'react';
import { loadGame } from '@/Core/controller/storage/loadGame';
import {
  clearPaperReadingList,
  getPaperReadingList,
  removePaperReadingEntry,
} from '@/Core/controller/storage/storageController';
import { logger } from '@/Core/util/logger';
import type { IPaperReadingEntry } from '@/store/paperInterface';
import { webgalStore } from '@/store/store';

export interface UsePaperReadingListReturn {
  /** List of paper reading entries */
  entries: IPaperReadingEntry[];
  /** Whether the list is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh the reading list from storage */
  refresh: () => Promise<void>;
  /** Load a paper from its reading entry */
  loadPaper: (entry: IPaperReadingEntry) => void;
  /** Remove a paper from the reading list */
  removePaper: (paperId: string) => Promise<void>;
  /** Clear all entries from the reading list */
  clearAll: () => Promise<void>;
  /** Check if Paper mode is currently active */
  isPaperMode: boolean;
}

/**
 * Hook for managing Paper reading list
 */
export function usePaperReadingList(): UsePaperReadingListReturn {
  const [entries, setEntries] = useState<IPaperReadingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get Paper mode status from Redux
  const isPaperMode = webgalStore.getState().paper.isPaperMode;

  /**
   * Refresh the reading list from storage
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await getPaperReadingList();
      setEntries(list.entries);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load reading list';
      setError(errorMessage);
      logger.error('Failed to load Paper reading list:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load a paper from its reading entry
   */
  const loadPaper = useCallback((entry: IPaperReadingEntry) => {
    if (entry.saveSlot >= 0) {
      // Load from save slot
      loadGame(entry.saveSlot);
      logger.info('Loading Paper from save slot', {
        paperId: entry.metadata.paperId,
        slot: entry.saveSlot,
      });
    } else {
      // Auto-save (slot -1) - would need quick save load
      logger.warn('Cannot load from auto-save directly, need quick save mechanism');
    }
  }, []);

  /**
   * Remove a paper from the reading list
   */
  const removePaper = useCallback(async (paperId: string) => {
    try {
      await removePaperReadingEntry(paperId);
      setEntries((prev) => prev.filter((e) => e.metadata.paperId !== paperId));
      logger.info('Paper removed from reading list', { paperId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove paper';
      setError(errorMessage);
      logger.error('Failed to remove paper from reading list:', err);
    }
  }, []);

  /**
   * Clear all entries from the reading list
   */
  const clearAll = useCallback(async () => {
    try {
      await clearPaperReadingList();
      setEntries([]);
      logger.info('Paper reading list cleared');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear reading list';
      setError(errorMessage);
      logger.error('Failed to clear Paper reading list:', err);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    entries,
    isLoading,
    error,
    refresh,
    loadPaper,
    removePaper,
    clearAll,
    isPaperMode,
  };
}

/**
 * Format progress percentage for display
 */
export function formatProgress(percentage: number): string {
  return `${Math.round(percentage)}%`;
}

/**
 * Format date for display
 */
export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return isoString;
  }
}

/**
 * Get phase display name in current language
 */
export function getPhaseName(phaseName: string, lang: 'zh' | 'ja' | 'en' = 'zh'): string {
  const names: Record<string, Record<string, string>> = {
    introduction: { zh: '导论', ja: '導入', en: 'Introduction' },
    methods: { zh: '方法', ja: '方法', en: 'Methods' },
    results: { zh: '结果', ja: '結果', en: 'Results' },
    discussion: { zh: '讨论', ja: '議論', en: 'Discussion' },
    conclusion: { zh: '结论', ja: '結論', en: 'Conclusion' },
  };
  return names[phaseName]?.[lang] || phaseName;
}
