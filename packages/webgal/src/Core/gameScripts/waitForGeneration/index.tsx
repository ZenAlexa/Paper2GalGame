import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import type { ISentence } from '@/Core/controller/scene/sceneInterface';
import type { IPerform } from '@/Core/Modules/perform/performInterface';
import { webgalStore } from '@/store/store';
import { WaitForGenerationUI } from './WaitForGenerationUI';

/**
 * Wait for AI generation command - triggers script generation and displays loading UI
 * Follows choose command pattern: renders to chooseContainer, blocks until generation completes
 *
 * Usage in WebGAL script:
 *   waitForGeneration;
 *   waitForGeneration:Generating your discussion...;
 */
export const waitForGeneration = (sentence: ISentence): IPerform => {
  // Extract prompt text from sentence content (optional)
  const promptText = sentence.content || 'Preparing discussion content...';

  // Render loading UI to chooseContainer (same as choose command)
  // eslint-disable-next-line react/no-deprecated
  ReactDOM.render(
    <Provider store={webgalStore}>
      <WaitForGenerationUI promptText={promptText} />
    </Provider>,
    document.getElementById('chooseContainer')
  );

  return {
    performName: 'waitForGeneration',
    duration: 1000 * 60 * 5, // 5 minutes max (will be terminated earlier on completion)
    isHoldOn: false,
    stopFunction: () => {
      // eslint-disable-next-line react/no-deprecated
      ReactDOM.render(<div />, document.getElementById('chooseContainer'));
    },
    blockingNext: () => true, // Block game progression until generation complete
    blockingAuto: () => true, // Block auto mode
    stopTimeout: undefined,
  };
};
