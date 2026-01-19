import { useEffect } from 'react';

// 挂载
export function useMounted(callback: Function) {
  useEffect(() => {
    callback();
  }, [callback]);
}

// 卸载
export function useUnMounted(callback: Function) {
  useEffect(() => {
    return () => {
      callback();
    };
  }, [callback]);
}

// 更新
export function useUpdated(callback: Function) {
  useEffect(() => {
    callback();
  });
}
