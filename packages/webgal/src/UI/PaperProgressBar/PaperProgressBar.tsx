/**
 * Paper Progress Bar Component
 * Displays reading progress during Paper mode gameplay
 * Shows current position, percentage, and phase information
 */

import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import styles from './paperProgressBar.module.scss';

/**
 * Phase display names for localization
 */
const PHASE_LABELS: Record<string, { zh: string; jp: string; en: string }> = {
  introduction: { zh: '引言', jp: '序論', en: 'Introduction' },
  methods: { zh: '方法', jp: '手法', en: 'Methods' },
  results: { zh: '结果', jp: '結果', en: 'Results' },
  discussion: { zh: '讨论', jp: '考察', en: 'Discussion' },
  conclusion: { zh: '结论', jp: '結論', en: 'Conclusion' },
};

interface PaperProgressBarProps {
  position?: 'top' | 'bottom';
  language?: 'zh' | 'jp' | 'en';
  showPhase?: boolean;
  showPercentage?: boolean;
  compact?: boolean;
}

/**
 * Paper Progress Bar - displays reading progress in Paper mode
 */
export function PaperProgressBar({
  position = 'top',
  language = 'jp',
  showPhase = true,
  showPercentage = true,
  compact = false,
}: PaperProgressBarProps) {
  const paperState = useSelector((state: RootState) => state.paper);

  // Only render in Paper mode
  if (!paperState.isPaperMode || !paperState.progress) {
    return null;
  }

  const { percentage, phaseName, currentDialogueIndex, totalDialogues } = paperState.progress;
  const phaseLabel = phaseName ? PHASE_LABELS[phaseName]?.[language] || phaseName : '';

  return (
    <div className={`${styles.progressBar} ${styles[position]} ${compact ? styles.compact : ''}`}>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${percentage}%` }} />
      </div>

      <div className={styles.progressInfo}>
        {showPhase && phaseLabel && <span className={styles.phase}>{phaseLabel}</span>}

        {showPercentage && (
          <span className={styles.percentage}>
            {percentage}%{compact ? '' : ` (${currentDialogueIndex + 1}/${totalDialogues})`}
          </span>
        )}
      </div>
    </div>
  );
}

export default PaperProgressBar;
