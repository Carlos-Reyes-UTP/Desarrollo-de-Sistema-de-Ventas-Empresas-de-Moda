import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import type { Location } from "react-router-dom";
import { NavigationType } from "react-router-dom";
import {
  buildLayoutTransitionKey,
  getPageTransitionClass,
  PAGE_ENTER_DURATION_MS,
  PAGE_EXIT_DURATION_MS,
  PAGE_MINI_ENTER_DURATION_MS,
  resolvePageTransition,
  type PageTransitionPhase,
  type PageTransitionSpec,
} from "./pageTransitionConfig";

const LAZY_FALLBACK_MAX_WAIT_MS = 600;

export const isPageFallbackContent = (): boolean => {
  const liveMount = document.getElementById("page-transition-live-mount");
  if (!liveMount) return false;
  return liveMount.querySelector("[data-page-fallback]") !== null;
};

const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(media.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  return reduced;
};

export interface UsePageTransitionResult {
  displayedContent: ReactNode;
  transitionClass: string;
  phase: PageTransitionPhase;
  spec: PageTransitionSpec;
  mountLiveContent: boolean;
}

interface DeferredTransitionOptions {
  reducedMotion: boolean;
  getSpec: (fromKey: string, toKey: string) => PageTransitionSpec;
  onBeforeEnter?: () => void;
}

function useDeferredViewTransition(
  transitionKey: string,
  content: ReactNode,
  { reducedMotion, getSpec, onBeforeEnter }: DeferredTransitionOptions
): UsePageTransitionResult {
  const isFirstRender = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rafRef = useRef<number | null>(null);
  const pendingContentRef = useRef(content);
  const pendingKeyRef = useRef(transitionKey);
  const isTransitioningRef = useRef(false);
  const prevKeyRef = useRef(transitionKey);
  const activeTargetKeyRef = useRef(transitionKey);
  const showingFallbackRef = useRef(false);
  const [miniEnter, setMiniEnter] = useState(false);

  pendingContentRef.current = content;
  pendingKeyRef.current = transitionKey;

  const [displayedContent, setDisplayedContent] = useState(content);
  const [phase, setPhase] = useState<PageTransitionPhase>("idle");
  const [spec, setSpec] = useState<PageTransitionSpec>({
    pattern: "fade-through",
    direction: "forward",
  });

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const scheduleEnterAnimation = useCallback((durationMs: number, onComplete: () => void) => {
    timeoutRef.current = setTimeout(onComplete, durationMs);
  }, []);

  const runEnterSequenceRef = useRef<(miniEnter?: boolean) => void>(() => undefined);

  runEnterSequenceRef.current = (useMiniEnter = false) => {
    setMiniEnter(useMiniEnter);
    onBeforeEnter?.();

    flushSync(() => {
      setPhase("enter-prep");
      setDisplayedContent(pendingContentRef.current);
    });

    showingFallbackRef.current = isPageFallbackContent();
    prevKeyRef.current = activeTargetKeyRef.current;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setPhase("entering");

        scheduleEnterAnimation(
          useMiniEnter ? PAGE_MINI_ENTER_DURATION_MS : PAGE_ENTER_DURATION_MS,
          () => {
            setPhase("idle");
            isTransitioningRef.current = false;
            setMiniEnter(false);

            if (pendingKeyRef.current !== prevKeyRef.current) {
              startTransitionRef.current(prevKeyRef.current, pendingKeyRef.current);
            }
          }
        );
      });
    });
  };

  const beginEnterRef = useRef<() => void>(() => undefined);
  beginEnterRef.current = () => runEnterSequenceRef.current(false);

  const runExitThenEnterRef = useRef<() => void>(() => undefined);

  runExitThenEnterRef.current = () => {
    timeoutRef.current = setTimeout(() => {
      setPhase("loading");
      const waitStart = Date.now();

      const attemptSwap = () => {
        const elapsed = Date.now() - waitStart;
        const stillFallback = isPageFallbackContent();

        if (stillFallback && elapsed < LAZY_FALLBACK_MAX_WAIT_MS) {
          timeoutRef.current = setTimeout(attemptSwap, 16);
          return;
        }

        beginEnterRef.current();
      };

      attemptSwap();
    }, PAGE_EXIT_DURATION_MS);
  };

  const startTransitionRef = useRef<(fromKey: string, toKey: string) => void>(() => undefined);

  startTransitionRef.current = (fromKey: string, toKey: string) => {
    clearTimers();
    activeTargetKeyRef.current = toKey;

    const nextSpec = getSpec(fromKey, toKey);

    if (reducedMotion) {
      prevKeyRef.current = toKey;
      pendingKeyRef.current = toKey;
      setSpec(nextSpec);
      setDisplayedContent(pendingContentRef.current);
      showingFallbackRef.current = isPageFallbackContent();
      setPhase("idle");
      isTransitioningRef.current = false;
      return;
    }

    isTransitioningRef.current = true;
    setSpec(nextSpec);
    setPhase("exiting");
    runExitThenEnterRef.current();
  };

  const triggerMiniEnterRef = useRef<() => void>(() => undefined);
  triggerMiniEnterRef.current = () => {
    if (reducedMotion) {
      setDisplayedContent(pendingContentRef.current);
      showingFallbackRef.current = false;
      return;
    }

    clearTimers();
    isTransitioningRef.current = true;
    runEnterSequenceRef.current(true);
  };

  useEffect(() => {
    if (phase !== "idle" || isTransitioningRef.current) return;
    if (transitionKey !== prevKeyRef.current) return;
    if (!showingFallbackRef.current) return;
    if (isPageFallbackContent()) return;

    triggerMiniEnterRef.current();
  }, [content, phase, transitionKey]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevKeyRef.current = transitionKey;
      pendingKeyRef.current = transitionKey;
      setDisplayedContent(content);
      showingFallbackRef.current = isPageFallbackContent();
      return;
    }

    if (transitionKey === prevKeyRef.current) {
      return;
    }

    pendingKeyRef.current = transitionKey;

    if (isTransitioningRef.current) {
      return;
    }

    startTransitionRef.current(prevKeyRef.current, transitionKey);
  }, [transitionKey, reducedMotion, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const transitionClass = [
    getPageTransitionClass(spec, phase, { miniEnter }),
    phase !== "idle" ? "page-transition--active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const mountLiveContent = phase !== "idle";

  // "Asentado" = en idle Y mostrando la ruta/vista actual (no un frame stale
  // tras navegar). Solo entonces renderizamos el árbol vivo (datos frescos);
  // de lo contrario mantenemos el snapshot anterior para evitar el parpadeo
  // de mostrar la página nueva un instante antes de animar.
  const isSettled = phase === "idle" && transitionKey === prevKeyRef.current;
  const resolvedContent = isSettled ? content : displayedContent;

  return {
    displayedContent: resolvedContent,
    transitionClass,
    phase,
    spec,
    mountLiveContent,
  };
}

export function usePageTransition(
  location: Location,
  content: ReactNode,
  navigationType: NavigationType = NavigationType.Push
): UsePageTransitionResult {
  const reducedMotion = usePrefersReducedMotion();
  const transitionKey = buildLayoutTransitionKey(location.pathname);

  const getSpec = useCallback(
    (fromKey: string, toKey: string) =>
      resolvePageTransition({
        from: { pathname: fromKey },
        to: { pathname: toKey },
        navigationType,
      }),
    [navigationType]
  );

  const onBeforeEnter = useCallback(() => {
    const mainEl = document.getElementById("main-scroll-area");
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return useDeferredViewTransition(transitionKey, content, {
    reducedMotion,
    getSpec,
    onBeforeEnter,
  });
}

export function useSubViewTransition(
  viewKey: string,
  content: ReactNode,
  resolveSpec: (fromKey: string, toKey: string) => PageTransitionSpec
): UsePageTransitionResult {
  const reducedMotion = usePrefersReducedMotion();

  const getSpec = useCallback(
    (fromKey: string, toKey: string) => resolveSpec(fromKey, toKey),
    [resolveSpec]
  );

  return useDeferredViewTransition(viewKey, content, {
    reducedMotion,
    getSpec,
  });
}
