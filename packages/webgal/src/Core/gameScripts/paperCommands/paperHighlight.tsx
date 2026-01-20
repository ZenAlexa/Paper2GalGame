/**
 * Paper Highlight Command
 *
 * Highlights important content from the paper with optional annotation.
 * Uses ReactDOM to render directly to a container element.
 *
 * Usage in script:
 * paperHighlight: "statistical significance (p < 0.05)" -note=Key finding -color=yellow -importance=high;
 *
 * Args:
 * - note: Annotation or explanation for the highlight
 * - color: Highlight color - "yellow" (default), "green", "blue", "pink"
 * - importance: Importance level - "high", "medium" (default), "low"
 * - duration: Display duration in ms (default: based on text length)
 * - hold: If true, wait for user click (default: false)
 */

import type React from 'react';
import ReactDOM from 'react-dom';
import type { ISentence } from '@/Core/controller/scene/sceneInterface';
import type { IPerform } from '@/Core/Modules/perform/performInterface';
import { getBooleanArgByKey, getNumberArgByKey, getStringArgByKey } from '@/Core/util/getSentenceArg';
import { logger } from '@/Core/util/logger';
import { WebGAL } from '@/Core/WebGAL';

// Container ID for paper highlight overlay
const PAPER_HIGHLIGHT_CONTAINER_ID = 'paperHighlightContainer';

// Map importance to visual weight
const importanceWeights: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

// Map color to hex values
const highlightColors: Record<string, string> = {
  yellow: '#ffeb3b',
  green: '#a5d6a7',
  blue: '#90caf9',
  pink: '#f48fb1',
};

/**
 * Get or create the paper highlight container element
 */
function getHighlightContainer(): HTMLElement | null {
  let container = document.getElementById(PAPER_HIGHLIGHT_CONTAINER_ID);
  if (!container) {
    // Try to find a parent container to append to
    const introContainer = document.getElementById('introContainer');
    if (introContainer?.parentElement) {
      container = document.createElement('div');
      container.id = PAPER_HIGHLIGHT_CONTAINER_ID;
      container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 12;
        display: none;
        pointer-events: none;
      `;
      introContainer.parentElement.appendChild(container);
    }
  }
  return container;
}

/**
 * Paper Highlight React Component
 */
interface PaperHighlightProps {
  text: string;
  note?: string;
  color: string;
  importance: 'high' | 'medium' | 'low';
}

const PaperHighlightComponent: React.FC<PaperHighlightProps> = ({ text, note, color, importance }) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    padding: '2em',
    boxSizing: 'border-box',
  };

  const highlightColor = highlightColors[color] || highlightColors.yellow;
  const importanceLevel = importanceWeights[importance] || 2;

  // Scale font size and border based on importance
  const baseFontSize = 1.4 + importanceLevel * 0.2;
  const borderWidth = importanceLevel;

  const highlightStyle: React.CSSProperties = {
    maxWidth: '80%',
    padding: '1.2em 1.8em',
    backgroundColor: `${highlightColor}40`, // 25% opacity
    borderLeft: `${borderWidth}px solid ${highlightColor}`,
    borderRadius: '4px',
    fontFamily: '"思源宋体", "Noto Serif JP", serif',
    fontSize: `${baseFontSize}em`,
    color: '#333',
    animation: 'paperHighlightFadeIn 0.4s ease-out forwards',
    boxShadow: importance === 'high' ? `0 0 20px ${highlightColor}60` : 'none',
  };

  const noteStyle: React.CSSProperties = {
    marginTop: '0.8em',
    padding: '0.5em 1em',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '4px',
    fontSize: '0.8em',
    color: '#666',
    fontStyle: 'italic',
  };

  const importanceBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    padding: '2px 8px',
    backgroundColor: importance === 'high' ? '#f44336' : importance === 'medium' ? '#ff9800' : '#9e9e9e',
    color: 'white',
    fontSize: '0.7em',
    borderRadius: '10px',
    textTransform: 'uppercase',
  };

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes paperHighlightFadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
      <div style={{ position: 'relative' }}>
        {importance === 'high' && <span style={importanceBadgeStyle}>Important</span>}
        <div style={highlightStyle}>
          <div>{text}</div>
          {note && <div style={noteStyle}>📝 {note}</div>}
        </div>
      </div>
    </div>
  );
};

export const paperHighlight = (sentence: ISentence): IPerform => {
  const performName = `paperHighlight-${Math.random().toString(36).slice(2, 11)}`;

  // Extract arguments
  const highlightText = sentence.content;
  const note = getStringArgByKey(sentence, 'note') ?? '';
  const colorArg = getStringArgByKey(sentence, 'color') ?? 'yellow';
  const importanceArg = getStringArgByKey(sentence, 'importance') ?? 'medium';
  const isHold = getBooleanArgByKey(sentence, 'hold') ?? false;

  // Validate color and importance
  const color = highlightColors[colorArg] ? colorArg : 'yellow';
  const importance = importanceWeights[importanceArg] ? (importanceArg as 'high' | 'medium' | 'low') : 'medium';

  // Calculate duration based on text length and importance
  const importanceMultiplier = importanceWeights[importance];
  const baseDuration = Math.max(2000, Math.min(10000, highlightText.length * 40));
  const defaultDuration = baseDuration * importanceMultiplier;
  const duration = getNumberArgByKey(sentence, 'duration') ?? (isHold ? 1000 * 60 * 60 * 24 : defaultDuration);

  logger.info('Paper highlight command executing', {
    text: `${highlightText.substring(0, 50)}...`,
    note,
    color,
    importance,
    duration,
  });

  // Render the highlight component
  const container = getHighlightContainer();
  if (container) {
    container.style.display = 'block';
    // Note: Using ReactDOM.render for React 17 compatibility
    // eslint-disable-next-line react/no-deprecated
    ReactDOM.render(
      <PaperHighlightComponent text={highlightText} note={note} color={color} importance={importance} />,
      container
    );
  }

  let isBlocking = true;
  const blockingTimeout = setTimeout(() => {
    isBlocking = false;
  }, duration - 500);

  // Handle user interaction to advance
  const handleUserNext = () => {
    WebGAL.gameplay.performController.unmountPerform(performName);
  };

  WebGAL.events.userInteractNext.on(handleUserNext);

  return {
    performName,
    duration,
    isHoldOn: isHold,
    stopFunction: () => {
      // Hide and clear the container
      if (container) {
        container.style.display = 'none';
        // eslint-disable-next-line react/no-deprecated
        ReactDOM.unmountComponentAtNode(container);
      }
      clearTimeout(blockingTimeout);
      WebGAL.events.userInteractNext.off(handleUserNext);
      logger.info('Paper highlight stopped', { performName });
    },
    blockingNext: () => isBlocking,
    blockingAuto: () => isBlocking,
    stopTimeout: undefined,
    goNextWhenOver: true,
  };
};

// Export constants for UI components
export const PaperHighlightKeys = {
  CONTAINER_ID: PAPER_HIGHLIGHT_CONTAINER_ID,
} as const;

export { highlightColors, importanceWeights };
