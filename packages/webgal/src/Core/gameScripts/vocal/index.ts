import { ISentence } from '@/Core/controller/scene/sceneInterface';
import { logger } from '@/Core/util/logger';
import { webgalStore } from '@/store/store';
import { setStage } from '@/store/stageReducer';
import { getBooleanArgByKey, getNumberArgByKey, getStringArgByKey } from '@/Core/util/getSentenceArg';
import { IStageState } from '@/store/stageInterface';
import {
  audioContextWrapper,
  getAudioLevel,
  performBlinkAnimation,
  performMouthAnimation,
  updateThresholds,
} from '@/Core/gameScripts/vocal/vocalAnimation';
import { match } from '../../util/match';
import { WebGAL } from '@/Core/WebGAL';

/**
 * 播放一段语音
 * @param sentence 语句
 */
export const playVocal = (sentence: ISentence) => {
  logger.debug('play vocal');
  const performInitName = 'vocal-play';

  const url = getStringArgByKey(sentence, 'vocal') ?? ''; // 获取语音的url
  let volume = getNumberArgByKey(sentence, 'volume') ?? 100; // 获取语音的音量比
  volume = Math.max(0, Math.min(volume, 100)); // 限制音量在 0-100 之间

  let currentStageState: IStageState;
  currentStageState = webgalStore.getState().stage;

  let pos: 'center' | 'left' | 'right' = 'center';
  const leftFromArgs = getBooleanArgByKey(sentence, 'left') ?? false;
  const rightFromArgs = getBooleanArgByKey(sentence, 'right') ?? false;
  if (leftFromArgs) pos = 'left';
  if (rightFromArgs) pos = 'right';

  let key = getStringArgByKey(sentence, 'figureId') ?? '';

  const freeFigure = currentStageState.freeFigure;
  const figureAssociatedAnimation = currentStageState.figureAssociatedAnimation;
  let bufferLength = 0;
  let currentMouthValue = 0;
  const lerpSpeed = 1;

  // 先停止之前的语音
  let VocalControl: any = document.getElementById('currentVocal');
  WebGAL.gameplay.performController.unmountPerform('vocal-play', true);
  if (VocalControl !== null) {
    VocalControl.currentTime = 0;
    VocalControl.pause();
  }

  // 获得舞台状态
  webgalStore.dispatch(setStage({ key: 'playVocal', value: url }));
  webgalStore.dispatch(setStage({ key: 'vocal', value: url }));

  let isOver = false;

  /**
   * 嘴型同步
   */

  return {
    arrangePerformPromise: new Promise((resolve) => {
      // Set vocal volume immediately
      webgalStore.dispatch(setStage({ key: 'vocalVolume', value: volume }));

      // Wait for audio element to be ready using requestAnimationFrame polling
      const waitForAudioElement = (retries = 0) => {
        const VocalControl: HTMLAudioElement | null = document.getElementById('currentVocal') as HTMLAudioElement;

        if (!VocalControl) {
          // Element not yet rendered, retry with exponential backoff (max 10 retries = ~1s)
          if (retries < 10) {
            setTimeout(() => waitForAudioElement(retries + 1), Math.min(100, 10 * Math.pow(2, retries)));
          } else {
            logger.error('Audio element not found after retries');
          }
          return;
        }

        VocalControl.currentTime = 0;

        // Get actual audio duration when metadata is loaded
        const setupPerformance = (audioDuration: number) => {
          // Use actual duration or fallback to 5 minutes (reasonable max)
          const safeDuration = audioDuration > 0 && isFinite(audioDuration)
            ? audioDuration * 1000
            : 1000 * 60 * 5;

          const perform = {
            performName: performInitName,
            duration: safeDuration,
            isOver: false,
            isHoldOn: false,
            stopFunction: () => {
              clearInterval(audioContextWrapper.audioLevelInterval);
              VocalControl.pause();
              key = key ? key : `fig-${pos}`;
              const animationItem = figureAssociatedAnimation.find((tid) => tid.targetId === key);
              performMouthAnimation({
                audioLevel: 0,
                OPEN_THRESHOLD: 1,
                HALF_OPEN_THRESHOLD: 1,
                currentMouthValue,
                lerpSpeed,
                key,
                animationItem,
                pos,
              });
              clearTimeout(audioContextWrapper.blinkTimerID);
            },
            blockingNext: () => false,
            blockingAuto: () => {
              return !isOver;
            },
            skipNextCollect: true,
            stopTimeout: undefined,
          };
          WebGAL.gameplay.performController.arrangeNewPerform(perform, sentence, false);

          key = key ? key : `fig-${pos}`;
          const animationItem = figureAssociatedAnimation.find((tid) => tid.targetId === key);
          if (animationItem) {
            const foundFigure = freeFigure.find((figure) => figure.key === key);
            if (foundFigure) {
              pos = foundFigure.basePosition;
            }

            if (!audioContextWrapper.audioContext) {
              const audioContext = new AudioContext();
              audioContextWrapper.analyser = audioContext.createAnalyser();
              audioContextWrapper.analyser.fftSize = 256;
              audioContextWrapper.dataArray = new Uint8Array(audioContextWrapper.analyser.frequencyBinCount);
            }

            if (!audioContextWrapper.analyser) {
              audioContextWrapper.analyser = audioContextWrapper.audioContext.createAnalyser();
              audioContextWrapper.analyser.fftSize = 256;
            }

            bufferLength = audioContextWrapper.analyser.frequencyBinCount;
            audioContextWrapper.dataArray = new Uint8Array(bufferLength);
            const vocalControl = document.getElementById('currentVocal') as HTMLMediaElement;

            if (!audioContextWrapper.source) {
              audioContextWrapper.source = audioContextWrapper.audioContext.createMediaElementSource(vocalControl);
              audioContextWrapper.source.connect(audioContextWrapper.analyser);
            }

            audioContextWrapper.analyser.connect(audioContextWrapper.audioContext.destination);

            // Lip-sync Animation
            audioContextWrapper.audioLevelInterval = setInterval(() => {
              const audioLevel = getAudioLevel(
                audioContextWrapper.analyser!,
                audioContextWrapper.dataArray!,
                bufferLength,
              );
              const { OPEN_THRESHOLD, HALF_OPEN_THRESHOLD } = updateThresholds(audioLevel);

              performMouthAnimation({
                audioLevel,
                OPEN_THRESHOLD,
                HALF_OPEN_THRESHOLD,
                currentMouthValue,
                lerpSpeed,
                key,
                animationItem,
                pos,
              });
            }, 50);

            // Blink animation (10sec)
            const animationEndTime = Date.now() + 10000;
            performBlinkAnimation({ key, animationItem, pos, animationEndTime });

            setTimeout(() => {
              clearTimeout(audioContextWrapper.blinkTimerID);
            }, 10000);
          }
        };

        // Handle audio end event
        VocalControl.onended = () => {
          for (const e of WebGAL.gameplay.performController.performList) {
            if (e.performName === performInitName) {
              isOver = true;
              e.stopFunction();
              WebGAL.gameplay.performController.unmountPerform(e.performName);
            }
          }
        };

        // Handle audio error
        VocalControl.onerror = (e) => {
          logger.error('Audio playback error:', e);
          isOver = true;
        };

        // Wait for audio to be ready before playing
        if (VocalControl.readyState >= 2) {
          // HAVE_CURRENT_DATA or higher - can play
          setupPerformance(VocalControl.duration);
          VocalControl.play().catch((e) => logger.error('Audio play failed:', e));
        } else {
          // Wait for canplay event
          VocalControl.oncanplay = () => {
            setupPerformance(VocalControl.duration);
            VocalControl.play().catch((e) => logger.error('Audio play failed:', e));
          };
        }
      };

      // Start waiting for audio element on next frame
      requestAnimationFrame(() => waitForAudioElement());
    }),
  };
};
