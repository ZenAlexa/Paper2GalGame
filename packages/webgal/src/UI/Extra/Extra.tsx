import { CloseSmall } from '@icon-park/react';
import { useDispatch, useSelector } from 'react-redux';
import useSoundEffect from '@/hooks/useSoundEffect';
import useTrans from '@/hooks/useTrans';
import { setVisibility } from '@/store/GUIReducer';
import type { RootState } from '@/store/store';
import { ExtraBgm } from '@/UI/Extra/ExtraBgm';
import { ExtraCg } from './ExtraCg';
import styles from './extra.module.scss';

export function Extra() {
  const { playSeClick } = useSoundEffect();
  const showExtra = useSelector((state: RootState) => state.GUI.showExtra);
  const dispatch = useDispatch();

  const t = useTrans('extra.');
  return (
    <>
      {showExtra && (
        <div className={styles.extra}>
          <div className={styles.extra_top}>
            <CloseSmall
              className={styles.extra_top_icon}
              onClick={() => {
                dispatch(setVisibility({ component: 'showExtra', visibility: false }));
                playSeClick();
              }}
              onMouseEnter={playSeClick}
              theme="outline"
              size="4em"
              fill="#fff"
              strokeWidth={3}
            />
            <div className={styles.extra_title}>{t('title')}</div>
          </div>
          <div className={styles.mainContainer}>
            <ExtraCg />
            <ExtraBgm />
          </div>
        </div>
      )}
    </>
  );
}
