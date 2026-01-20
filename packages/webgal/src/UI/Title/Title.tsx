import { useDispatch, useSelector } from 'react-redux';
import { continueGame, startPaperGame } from '@/Core/controller/gamePlay/startContinueGame';
import { playBgm } from '@/Core/controller/stage/playBgm';
import useApplyStyle from '@/hooks/useApplyStyle';
import useConfigData from '@/hooks/useConfigData';
import { keyboard } from '@/hooks/useHotkey';
import useSoundEffect from '@/hooks/useSoundEffect';
import useTrans from '@/hooks/useTrans';
import { setMenuPanelTag, setVisibility } from '@/store/GUIReducer';
import { MenuPanelTag } from '@/store/guiInterface';
import type { RootState } from '@/store/store';
import { fullScreenOption } from '@/store/userDataInterface';
import { showGlogalDialog } from '../GlobalDialog/GlobalDialog';
import { PaperSelection } from '../PaperSelection';
import styles from './title.module.scss';

/** 标题页 */
export default function Title() {
  const userDataState = useSelector((state: RootState) => state.userData);
  const GUIState = useSelector((state: RootState) => state.GUI);
  const dispatch = useDispatch();
  const fullScreen = userDataState.optionData.fullScreen;
  const background = GUIState.titleBg;
  const showBackground = background === '' ? 'rgba(0,0,0,1)' : `url("${background}")`;
  const t = useTrans('title.');
  const tCommon = useTrans('common.');
  const { playSeEnter, playSeClick } = useSoundEffect();

  const applyStyle = useApplyStyle('UI/Title/title.scss');
  useConfigData(); // 监听基础ConfigData变化

  const appreciationItems = useSelector((state: RootState) => state.userData.appreciationData);
  const hasAppreciationItems = appreciationItems.bgm.length > 0 || appreciationItems.cg.length > 0;

  // Handle game start after paper generation is ready
  const handleGameStart = async (sessionId: string) => {
    console.log('[Title] Starting paper game with session:', sessionId);
    dispatch(setVisibility({ component: 'showPaperSelection', visibility: false }));
    await startPaperGame(sessionId);
  };

  // Handle continue game from saved paper
  const handleGameContinue = (paperId: string) => {
    console.log('[Title] Continuing game for paper:', paperId);
    dispatch(setVisibility({ component: 'showPaperSelection', visibility: false }));
    dispatch(setVisibility({ component: 'showTitle', visibility: false }));
    continueGame();
  };

  // Handle back from PaperSelection
  const handlePaperSelectionBack = () => {
    dispatch(setVisibility({ component: 'showPaperSelection', visibility: false }));
  };

  return (
    <>
      {GUIState.showTitle && <div className={applyStyle('Title_backup_background', styles.Title_backup_background)} />}
      <div
        className="title__enter-game-target"
        onClick={() => {
          playBgm(GUIState.titleBgm);
          dispatch(setVisibility({ component: 'isEnterGame', visibility: true }));
          if (fullScreen === fullScreenOption.on) {
            document.documentElement.requestFullscreen();
            if (keyboard) keyboard.lock(['Escape', 'F11']);
          }
        }}
        onMouseEnter={playSeEnter}
      />
      {GUIState.showTitle && (
        <div
          className={applyStyle('Title_main', styles.Title_main)}
          style={{
            backgroundImage: showBackground,
            backgroundSize: 'cover',
          }}
        >
          <div className={applyStyle('Title_buttonList', styles.Title_buttonList)}>
            <div
              className={applyStyle('Title_button', styles.Title_button)}
              onClick={() => {
                playSeClick();
                dispatch(setVisibility({ component: 'showPaperSelection', visibility: true }));
              }}
              onMouseEnter={playSeEnter}
            >
              <div className={applyStyle('Title_button_text', styles.Title_button_text)}>{t('start.title')}</div>
            </div>
            <div
              className={applyStyle('Title_button', styles.Title_button)}
              onClick={async () => {
                playSeClick();
                dispatch(setVisibility({ component: 'showTitle', visibility: false }));
                continueGame();
              }}
              onMouseEnter={playSeEnter}
            >
              <div className={applyStyle('Title_button_text', styles.Title_button_text)}>{t('continue.title')}</div>
            </div>
            <div
              className={applyStyle('Title_button', styles.Title_button)}
              onClick={() => {
                playSeClick();
                dispatch(setVisibility({ component: 'showMenuPanel', visibility: true }));
                dispatch(setMenuPanelTag(MenuPanelTag.Option));
              }}
              onMouseEnter={playSeEnter}
            >
              <div className={applyStyle('Title_button_text', styles.Title_button_text)}>{t('options.title')}</div>
            </div>
            <div
              className={applyStyle('Title_button', styles.Title_button)}
              onClick={() => {
                playSeClick();
                dispatch(setVisibility({ component: 'showMenuPanel', visibility: true }));
                dispatch(setMenuPanelTag(MenuPanelTag.Load));
              }}
              onMouseEnter={playSeEnter}
            >
              <div className={applyStyle('Title_button_text', styles.Title_button_text)}>{t('load.title')}</div>
            </div>
            {GUIState.enableAppreciationMode && (
              <div
                className={`${applyStyle('Title_button', styles.Title_button)} ${
                  !hasAppreciationItems ? styles.Title_button_disabled : ''
                }`}
                onClick={() => {
                  if (hasAppreciationItems) {
                    playSeClick();
                    dispatch(setVisibility({ component: 'showExtra', visibility: true }));
                  }
                }}
                onMouseEnter={playSeEnter}
              >
                <div className={applyStyle('Title_button_text', styles.Title_button_text)}>{t('extra.title')}</div>
              </div>
            )}
            <div
              className={applyStyle('Title_button', styles.Title_button)}
              onClick={() => {
                playSeClick();
                showGlogalDialog({
                  title: t('exit.tips'),
                  leftText: tCommon('yes'),
                  rightText: tCommon('no'),
                  leftFunc: () => {
                    window.close();
                  },
                  rightFunc: () => {},
                });
              }}
              onMouseEnter={playSeEnter}
            >
              <div className={applyStyle('Title_button_text', styles.Title_button_text)}>{t('exit.title')}</div>
            </div>
          </div>
        </div>
      )}
      {/* Paper Selection overlay */}
      {GUIState.showPaperSelection && (
        <PaperSelection
          onGameStart={handleGameStart}
          onGameContinue={handleGameContinue}
          onBack={handlePaperSelectionBack}
        />
      )}
    </>
  );
}
