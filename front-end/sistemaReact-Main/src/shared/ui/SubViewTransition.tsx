import { useCallback, type ReactNode } from "react";
import { useSubViewTransition } from "@/shared/layout/usePageTransition";
import {
  resolveSubViewTransition,
  type PageTransitionPattern,
} from "@/shared/layout/pageTransitionConfig";

interface SubViewTransitionProps {
  viewKey: string;
  pattern: PageTransitionPattern;
  indexOf?: (key: string) => number;
  className?: string;
  children: ReactNode;
}

export function SubViewTransition({
  viewKey,
  pattern,
  indexOf,
  className = "",
  children,
}: SubViewTransitionProps) {
  const resolveSpec = useCallback(
    (fromKey: string, toKey: string) => {
      const getIndex =
        indexOf ??
        ((key: string) => {
          const parsed = Number.parseInt(key, 10);
          return Number.isNaN(parsed) ? 0 : parsed;
        });
      return resolveSubViewTransition(pattern, fromKey, toKey, getIndex);
    },
    [pattern, indexOf]
  );

  const { displayedContent, transitionClass, phase } = useSubViewTransition(
    viewKey,
    children,
    resolveSpec
  );

  return (
    <div className={`relative ${className}`.trim()}>
      {phase !== "idle" && (
        <div className="page-transition-live-mount" aria-hidden="true">
          {children}
        </div>
      )}
      <div className={`page-transition ${transitionClass}`.trim()}>
        {displayedContent}
      </div>
    </div>
  );
}
