import { useEffect } from 'react';

let scrollLockCount = 0;

/** Evita scroll del body mientras hay uno o más modales abiertos (portaleados). */
export function useModalBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    scrollLockCount += 1;
    if (scrollLockCount === 1) {
      document.documentElement.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
    }

    return () => {
      scrollLockCount -= 1;
      if (scrollLockCount === 0) {
        document.documentElement.classList.remove('modal-open');
        document.body.style.overflow = '';
      }
    };
  }, [locked]);
}
