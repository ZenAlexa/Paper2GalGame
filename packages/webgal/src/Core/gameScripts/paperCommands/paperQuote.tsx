/**
 * Paper Quote Command
 *
 * Displays a styled quote/citation from the paper with source reference.
 * Uses ReactDOM to render directly to a container element.
 *
 * Usage in script:
 * paperQuote: "The quantum entanglement effect is observed..." -source=Section 3.2 -style=blockquote;
 *
 * Args:
 * - source: Source reference (e.g., "Section 3.2", "Figure 1", "Page 15")
 * - style: Quote style - "blockquote" (default), "inline", "highlight"
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

// Container ID for paper quote overlay
const PAPER_QUOTE_CONTAINER_ID = 'paperQuoteContainer';

/**
 * Get or create the paper quote container element
 */
function getQuoteContainer(): HTMLElement | null {
  let container = document.getElementById(PAPER_QUOTE_CONTAINER_ID);
  if (!container) {
    // Try to find a parent container to append to
    const introContainer = document.getElementById('introContainer');
    if (introContainer?.parentElement) {
      container = document.createElement('div');
      container.id = PAPER_QUOTE_CONTAINER_ID;
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
 * Paper Quote React Component
 */
interface PaperQuoteProps {
  text: string;
  source?: string;
  style: 'blockquote' | 'inline' | 'highlight';
}

const PaperQuoteComponent: React.FC<PaperQuoteProps> = ({ text, source, style }) => {
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

  const getQuoteStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      maxWidth: '80%',
      padding: '1.5em 2em',
      fontFamily: '"思源宋体", "Noto Serif JP", serif',
      animation: 'paperQuoteFadeIn 0.5s ease-out forwards',
    };

    switch (style) {
      case 'blockquote':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(255, 250, 240, 0.95)',
          borderLeft: '4px solid #FFB7C5',
          color: '#4A3728',
          fontSize: '1.8em',
          fontStyle: 'italic',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        };
      case 'inline':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #FFB7C5',
          borderRadius: '8px',
          color: '#4A3728',
          fontSize: '1.5em',
        };
      case 'highlight':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(255, 235, 59, 0.3)',
          borderRadius: '4px',
          color: '#333',
          fontSize: '1.6em',
        };
      default:
        return baseStyle;
    }
  };

  const sourceStyle: React.CSSProperties = {
    marginTop: '1em',
    fontSize: '0.9em',
    color: '#666',
    fontStyle: 'normal',
  };

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes paperQuoteFadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
      <div style={getQuoteStyle()}>
        <div>"{text}"</div>
        {source && <div style={sourceStyle}>— {source}</div>}
      </div>
    </div>
  );
};

export const paperQuote = (sentence: ISentence): IPerform => {
  const performName = `paperQuote-${Math.random().toString(36).slice(2, 11)}`;

  // Extract arguments
  const quoteText = sentence.content;
  const source = getStringArgByKey(sentence, 'source') ?? '';
  const styleArg = getStringArgByKey(sentence, 'style') ?? 'blockquote';
  const style = (['blockquote', 'inline', 'highlight'].includes(styleArg) ? styleArg : 'blockquote') as
    | 'blockquote'
    | 'inline'
    | 'highlight';
  const isHold = getBooleanArgByKey(sentence, 'hold') ?? false;

  // Calculate duration based on text length (50ms per character, min 3s, max 15s)
  const defaultDuration = Math.max(3000, Math.min(15000, quoteText.length * 50));
  const duration = getNumberArgByKey(sentence, 'duration') ?? (isHold ? 1000 * 60 * 60 * 24 : defaultDuration);

  logger.info('Paper quote command executing', {
    text: `${quoteText.substring(0, 50)}...`,
    source,
    style,
    duration,
  });

  // Render the quote component
  const container = getQuoteContainer();
  if (container) {
    container.style.display = 'block';
    // Note: Using ReactDOM.render for React 17 compatibility
    // eslint-disable-next-line react/no-deprecated
    ReactDOM.render(<PaperQuoteComponent text={quoteText} source={source} style={style} />, container);
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
      logger.info('Paper quote stopped', { performName });
    },
    blockingNext: () => isBlocking,
    blockingAuto: () => isBlocking,
    stopTimeout: undefined,
    goNextWhenOver: true,
  };
};

// Export stage keys for compatibility (even though we're not using Redux now)
export const PaperQuoteKeys = {
  CONTAINER_ID: PAPER_QUOTE_CONTAINER_ID,
} as const;
