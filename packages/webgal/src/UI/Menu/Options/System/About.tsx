import { Left } from '@icon-park/react';
import { __INFO } from '@/config/info';
import useTrans from '@/hooks/useTrans';
import s from './about.module.scss';

export default function About(props: { onClose: () => void }) {
  const t = useTrans('menu.options.pages.system.options.about.');
  return (
    <div className={s.about}>
      <div className={s.backButton} onClick={props.onClose}>
        <Left className={s.icon} theme="outline" size="35" strokeWidth={3} fill="#333" />
      </div>
      <div className={s.title}>{t('subTitle')}</div>
      <div className={s.title}>{t('version')}</div>
      <div className={s.text}>{__INFO.version}</div>
      <div className={s.title}>{t('source')}</div>
      <div className={s.text}>
        <a target="_blank" href="https://github.com/AdrianWang/Paper2GalGame" rel="noopener">
          https://github.com/AdrianWang/Paper2GalGame
        </a>
      </div>
      <div className={s.title}>{t('contributors')}</div>
      <div className={s.text}>
        <a target="_blank" href="https://x.com/Adrian_Z_Wang" rel="noopener">
          @Adrian_Z_Wang
        </a>
      </div>
      <div className={s.title}>{t('website')}</div>
      <div className={s.text}>
        <a target="_blank" href="https://x.com/Adrian_Z_Wang" rel="noopener">
          https://x.com/Adrian_Z_Wang
        </a>
      </div>
    </div>
  );
}
