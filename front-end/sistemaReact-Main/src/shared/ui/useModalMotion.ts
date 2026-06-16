import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const MODAL_ENTER_DURATION_MS = 400;
export const MODAL_EXIT_DURATION_MS = 200;

export type ModalMotionPhase = 'entering' | 'open' | 'exiting' | 'closed';

export interface UseModalMotionOptions {
  open: boolean;
  onCloseComplete?: () => void;
}

export interface UseModalMotionResult {
  motionPhase: ModalMotionPhase;
  overlayClass: string;
  panelClass: string;
  sheetClass: string;
  shouldRender: boolean;
  requestClose: (callback?: () => void) => void;
}

export function useModalMotion({
  open,
  onCloseComplete,
}: UseModalMotionOptions): UseModalMotionResult {
  const [motionPhase, setMotionPhase] = useState<ModalMotionPhase>('closed');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeCallbackRef = useRef<(() => void) | undefined>(undefined);

  const clearMotionTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  useLayoutEffect(() => {
    if (open) {
      setMotionPhase('entering');
    }
  }, [open]);

  useEffect(() => {
    clearMotionTimeout();

    if (open) {
      timeoutRef.current = setTimeout(() => {
        setMotionPhase('open');
      }, MODAL_ENTER_DURATION_MS);
      return clearMotionTimeout;
    }

    setMotionPhase((prev) => {
      if (prev === 'open' || prev === 'entering') {
        return 'exiting';
      }
      return prev === 'exiting' ? prev : 'closed';
    });

    return clearMotionTimeout;
  }, [open, clearMotionTimeout]);

  useEffect(() => {
    if (motionPhase !== 'exiting') return undefined;

    clearMotionTimeout();
    timeoutRef.current = setTimeout(() => {
      setMotionPhase('closed');
      closeCallbackRef.current?.();
      onCloseComplete?.();
      closeCallbackRef.current = undefined;
    }, MODAL_EXIT_DURATION_MS);

    return clearMotionTimeout;
  }, [motionPhase, onCloseComplete, clearMotionTimeout]);

  useEffect(() => () => clearMotionTimeout(), [clearMotionTimeout]);

  const requestClose = useCallback((callback?: () => void) => {
    if (motionPhase === 'exiting' || motionPhase === 'closed') return;
    closeCallbackRef.current = callback;
    setMotionPhase('exiting');
  }, [motionPhase]);

  const isExiting = motionPhase === 'exiting';
  const shouldShowEnter = open && !isExiting;

  const overlayClass = isExiting
    ? 'modal-motion-overlay--exit'
    : shouldShowEnter
      ? 'modal-motion-overlay--enter'
      : '';

  const panelClass = isExiting
    ? 'modal-motion-panel--exit'
    : shouldShowEnter
      ? 'modal-motion-panel--enter'
      : '';

  const sheetClass = isExiting
    ? 'modal-motion-sheet--exit'
    : shouldShowEnter
      ? 'modal-motion-sheet--enter'
      : '';

  const shouldRender = open || motionPhase === 'exiting';

  return {
    motionPhase,
    overlayClass,
    panelClass,
    sheetClass,
    shouldRender,
    requestClose,
  };
}
