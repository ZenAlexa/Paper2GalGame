import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

/**
 * 生成一个和redux自动同步的Ref对象
 */
export function useGenSyncRef<TState = unknown, Selected = unknown>(
  selector: (state: TState) => Selected
): { readonly current: Selected } {
  const Store = useSelector(selector);
  const Ref = useRef(Store);
  useEffect(() => {
    Ref.current = Store;
  }, [Store]);
  return Ref;
}
