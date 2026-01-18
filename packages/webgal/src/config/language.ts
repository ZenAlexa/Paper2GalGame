/**
 * Language configuration for Paper2GalGame
 * Only supports: Chinese, Japanese, English
 */

import en from '@/translations/en';
import jp from '@/translations/jp';
import zhCn from '@/translations/zh-cn';

export enum language {
  zhCn,
  en,
  jp,
}

const languages: Record<string, string> = {
  zhCn: '简体中文',
  en: 'English',
  jp: '日本語',
};

export const i18nTranslationResources: Record<string, { translation: Record<string, any> }> = {
  en: { translation: en },
  zhCn: { translation: zhCn },
  jp: { translation: jp },
};

export const defaultLanguage: language = language.zhCn;

export default languages;
