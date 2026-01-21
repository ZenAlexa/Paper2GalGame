import type React from 'react';
import type { FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { stopAll } from '@/Core/controller/gamePlay/fastSkip';
import { nextSentence } from '@/Core/controller/gamePlay/nextSentence';
import { isIOS } from '@/Core/initializeScript';
import { WebGAL } from '@/Core/WebGAL';
import { useHotkey } from '@/hooks/useHotkey';
import IntroContainer from '@/Stage/introContainer/IntroContainer';
import { MainStage } from '@/Stage/MainStage/MainStage';
import { TextBoxFilm } from '@/Stage/TextBox/TextBoxFilm';
import { setVisibility } from '@/store/GUIReducer';
import type { IGuiState } from '@/store/guiInterface';
import type { IStageState } from '@/store/stageInterface';
import { type RootState, webgalStore } from '@/store/store';
import { AudioContainer } from './AudioContainer/AudioContainer';
import { FullScreenPerform } from './FullScreenPerform/FullScreenPerform';
import styles from './stage.module.scss';
import { TextBox } from './TextBox/TextBox';

// import OldStage from '@/Components/Stage/OldStage/OldStage';

let timeoutEventHandle: ReturnType<typeof setTimeout> | null = null;
// Minimum movement threshold (pixels^2) to be considered "moved", e.g., 4px -> 16
const MOVE_THRESHOLD_SQ = 16;
let lastMouseX = 0;
let lastMouseY = 0;
let hasLastMousePos = false;

// Click debounce to prevent rapid clicks from skipping multiple sentences
let lastClickTime = 0;
const CLICK_DEBOUNCE_MS = 150;

/**
 * 检查并更新控制可见性
 * @param event 鼠标移动事件
 * @param stageState 场景状态
 * @param GUIState GUI状态
 * @param dispatch Redux dispatch函数
 */
// eslint-disable-next-line max-params
function updateControlsVisibility(
  event: React.MouseEvent,
  _stageState: IStageState,
  GUIState: IGuiState,
  dispatch: ReturnType<typeof useDispatch>
) {
  // 新逻辑：超过阈值的鼠标移动立刻显示，2s 无操作后隐藏（未锁定时）
  const { clientX, clientY } = event;
  let movedEnough = false;
  if (!hasLastMousePos) {
    movedEnough = true; // 第一次移动视为足够
    hasLastMousePos = true;
  } else {
    const dx = clientX - lastMouseX;
    const dy = clientY - lastMouseY;
    movedEnough = dx * dx + dy * dy >= MOVE_THRESHOLD_SQ;
  }
  lastMouseX = clientX;
  lastMouseY = clientY;

  if (!movedEnough) {
    // 微小移动，视为无操作，不重置计时器
    return;
  }

  if (timeoutEventHandle) {
    clearTimeout(timeoutEventHandle);
  }

  if (!GUIState.controlsVisibility) {
    dispatch(setVisibility({ component: 'controlsVisibility', visibility: true }));
  }

  timeoutEventHandle = setTimeout(() => {
    if (!webgalStore.getState().GUI.showControls) {
      dispatch(setVisibility({ component: 'controlsVisibility', visibility: false }));
    }
  }, 2000);
}

export const Stage: FC = () => {
  const stageState = useSelector((state: RootState) => state.stage);
  const GUIState = useSelector((state: RootState) => state.GUI);
  const dispatch = useDispatch();

  useHotkey();

  return (
    <div className={styles.MainStage_main}>
      <FullScreenPerform />
      {/* 已弃用旧的立绘与背景舞台 */}
      {/* <OldStage /> */}
      <MainStage />
      <div id="pixiContianer" className={styles.pixiContainer} style={{ zIndex: isIOS ? '-5' : undefined }} />
      <div id="chooseContainer" className={styles.chooseContainer} />
      {GUIState.showTextBox && stageState.enableFilm === '' && !stageState.isDisableTextbox && <TextBox />}
      {GUIState.showTextBox && stageState.enableFilm !== '' && <TextBoxFilm />}
      <AudioContainer />
      <div
        onClick={() => {
          // Debounce rapid clicks to prevent skipping multiple sentences
          const now = Date.now();
          if (now - lastClickTime < CLICK_DEBOUNCE_MS) {
            return;
          }
          lastClickTime = now;

          // Show textbox if hidden
          if (!GUIState.showTextBox) {
            dispatch(setVisibility({ component: 'showTextBox', visibility: true }));
            return;
          }
          stopAll();
          nextSentence();
        }}
        onDoubleClick={() => {
          WebGAL.events.fullscreenDbClick.emit();
        }}
        id="FullScreenClick"
        style={{ width: '100%', height: '100%', position: 'absolute', zIndex: '12', top: '0' }}
        onMouseMove={(e) => !GUIState.showControls && updateControlsVisibility(e, stageState, GUIState, dispatch)}
      />
      <IntroContainer />
    </div>
  );
};
