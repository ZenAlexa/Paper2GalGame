import { useSelector } from 'react-redux';
import { FALLBACK_FONT_FAMILY } from '@/Core/util/fonts/fontOptions';
import { type RootState, webgalStore } from '@/store/store';

export function useFontFamily(): string {
  return useSelector(selectFontFamily);
}

export function getCurrentFontFamily(): string {
  return selectFontFamily(webgalStore.getState());
}

export function selectFontFamily(state: RootState): string {
  const index = state.userData.optionData.textboxFont ?? 0;
  const fonts = state.GUI.fontOptions;
  if (fonts[index]) {
    return fonts[index].family;
  }
  if (fonts.length > 0) {
    return fonts[0].family;
  }
  return FALLBACK_FONT_FAMILY;
}
