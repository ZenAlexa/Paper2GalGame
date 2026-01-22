import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import type { ISentence } from '@/Core/controller/scene/sceneInterface';
import type { IPerform } from '@/Core/Modules/perform/performInterface';
import { webgalStore } from '@/store/store';
import { UploadPaperUI } from './UploadPaperUI';

/**
 * Upload paper command - triggers in-game paper upload UI
 * Follows choose command pattern: renders to chooseContainer, blocks until user completes upload
 *
 * Usage in WebGAL script:
 *   uploadPaper;
 *   uploadPaper:Please upload your paper;
 */
export const uploadPaper = (sentence: ISentence): IPerform => {
  // Extract prompt text from sentence content (optional)
  const promptText = sentence.content || 'Please upload your paper';

  // Render upload UI to chooseContainer (same as choose command)
  // eslint-disable-next-line react/no-deprecated
  ReactDOM.render(
    <Provider store={webgalStore}>
      <UploadPaperUI promptText={promptText} />
    </Provider>,
    document.getElementById('chooseContainer')
  );

  return {
    performName: 'uploadPaper',
    duration: 1000 * 60 * 60 * 24, // 24 hours (effectively infinite wait)
    isHoldOn: false,
    stopFunction: () => {
      // eslint-disable-next-line react/no-deprecated
      ReactDOM.render(<div />, document.getElementById('chooseContainer'));
    },
    blockingNext: () => true, // Block game progression until upload complete
    blockingAuto: () => true, // Block auto mode
    stopTimeout: undefined,
  };
};
