import { useSelector } from 'react-redux';
import { useSetBg } from '@/Stage/MainStage/useSetBg';
import { setStageObjectEffects } from '@/Stage/MainStage/useSetEffects';
import { useSetFigure } from '@/Stage/MainStage/useSetFigure';
import type { RootState } from '@/store/store';

export function MainStage() {
  const stageState = useSelector((state: RootState) => state.stage);
  useSetBg(stageState);
  useSetFigure(stageState);
  setStageObjectEffects(stageState);
  return <div style={{ display: 'none' }} />;
}
