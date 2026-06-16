import { useEffect, useRef, useState, useLayoutEffect, type CSSProperties } from "react";
import type { NavDestination } from "../navigationConfig";
import { isNavDestinationActive } from "../navigationConfig";
import { MaterialIcon } from "@/shared/ui";

interface NavigationFlyoutProps {
  parent: NavDestination;
  vistaActual: string;
  anchorTop: number;
  onSelect: (dest: NavDestination) => void;
  onIntent?: (dest: NavDestination) => void;
  onClose: () => void;
}

function clampAnchorTop(anchorTop: number, cardHeight: number): number {
  const half = cardHeight / 2;
  const minTop = 80 + half;
  const maxTop = window.innerHeight - half - 16;
  return Math.min(Math.max(anchorTop, minTop), maxTop);
}

export function NavigationFlyout({
  parent,
  vistaActual,
  anchorTop,
  onSelect,
  onIntent,
  onClose,
}: NavigationFlyoutProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [positionTop, setPositionTop] = useState(anchorTop);

  useLayoutEffect(() => {
    if (!panelRef.current) {
      setPositionTop(anchorTop);
      return;
    }
    const height = panelRef.current.offsetHeight;
    setPositionTop(clampAnchorTop(anchorTop, height));
  }, [anchorTop, parent.id, parent.children?.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;

      const rail = document.querySelector(".app-nav-rail");
      if (rail?.contains(target)) return;

      onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const headerLabel = parent.shortLabel ?? parent.label;

  return (
    <>
      <div
        className="app-nav-flyout-backdrop fixed inset-0 z-[var(--app-z-nav-flyout-backdrop)] hidden bg-black/10 backdrop-blur-[2px] md:block md:left-[var(--app-rail-width)] animate-fadeIn"
        aria-hidden
      />
      <div
        ref={panelRef}
        role="menu"
        aria-label={parent.label}
        className="app-nav-flyout app-nav-flyout--compact animate-nav-flyout-enter fixed z-[var(--app-z-nav-flyout)] hidden min-w-[220px] max-w-[260px] flex-col overflow-hidden md:flex"
        style={{
          left: "calc(var(--app-rail-width) + 8px)",
          top: positionTop,
        }}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 app-nav-flyout-header">
          <h2 className="truncate text-[13px] font-bold tracking-tight app-nav-flyout-text">
            {headerLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full app-nav-flyout-close transition-colors"
            aria-label="Cerrar menú"
          >
            <MaterialIcon icon="close" className="h-[18px] w-[18px]" />
          </button>
        </div>

        <nav className="flex flex-col gap-1.5 p-2 pt-0" aria-label={parent.label}>
          {parent.children?.map((child, index) => {
            const selected = isNavDestinationActive(child, vistaActual);
            return (
              <button
                key={child.id}
                type="button"
                role="menuitem"
                aria-current={selected ? "page" : undefined}
                onClick={() => onSelect(child)}
                onMouseEnter={() => onIntent?.(child)}
                onFocus={() => onIntent?.(child)}
                style={{ "--stagger-index": index + 1 } as CSSProperties}
                className={`app-nav-flyout-item animate-stagger-item flex w-full items-center gap-3 px-2.5 py-2.5 text-left transition-all active:scale-[0.98] ${
                  selected ? "app-nav-flyout-item--active" : ""
                }`}
              >
                <span
                  className={`app-nav-flyout-icon-wrap flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                    selected ? "app-nav-flyout-icon-wrap--active" : ""
                  }`}
                >
                  <MaterialIcon
                    icon={child.icon}
                    fill={selected}
                    className="h-5 w-5 shrink-0"
                  />
                </span>
                <span className="text-[13px] font-semibold tracking-tight">{child.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
