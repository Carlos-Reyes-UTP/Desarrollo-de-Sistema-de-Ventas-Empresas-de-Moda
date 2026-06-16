import { useRef, useLayoutEffect } from "react";
import type { NavDestination } from "../navigationConfig";
import { isNavDestinationActive } from "../navigationConfig";
import { NavigationRailItem } from "./NavigationRailItem";
import { ThemeMenuButton } from "@/components/theme/ThemeMenuButton";
import { MaterialIcon } from "@/shared/ui";

interface NavigationRailProps {
  destinations: NavDestination[];
  vistaActual: string;
  openFlyoutId: string | null;
  onDestinationClick: (dest: NavDestination) => void;
  onDestinationIntent?: (dest: NavDestination) => void;
  onLogout: () => void;
  onAnchorTopChange?: (top: number | null) => void;
}

export function NavigationRail({
  destinations,
  vistaActual,
  openFlyoutId,
  onDestinationClick,
  onDestinationIntent,
  onLogout,
  onAnchorTopChange,
}: NavigationRailProps) {
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useLayoutEffect(() => {
    if (!openFlyoutId || !onAnchorTopChange) {
      onAnchorTopChange?.(null);
      return;
    }

    const el = itemRefs.current.get(openFlyoutId);
    if (!el) {
      onAnchorTopChange(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    onAnchorTopChange(rect.top + rect.height / 2);
  }, [openFlyoutId, destinations, onAnchorTopChange]);

  const setItemRef = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) {
      itemRefs.current.set(id, el);
    } else {
      itemRefs.current.delete(id);
    }
  };

  return (
    <aside
      className="app-nav-rail relative z-[var(--app-z-sidebar-rail)] hidden h-screen shrink-0 flex-col border-r md:flex"
      style={{ width: "var(--app-rail-width)" }}
      aria-label="Navegación principal"
      role="navigation"
    >
      <div className="flex w-full shrink-0 items-center justify-center pt-4 pb-2">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full app-nav-rail-logo"
          aria-hidden
        >
          <span className="text-[11px] font-semibold tracking-wide">DK</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-1 py-2 custom-scrollbar">
        {destinations.map((dest) => {
          const selected =
            isNavDestinationActive(dest, vistaActual) || openFlyoutId === dest.id;
          return (
            <NavigationRailItem
              key={dest.id}
              ref={setItemRef(dest.id)}
              icon={dest.icon}
              label={dest.shortLabel ?? dest.label}
              selected={selected}
              onClick={() => onDestinationClick(dest)}
              onIntent={() => onDestinationIntent?.(dest)}
              title={dest.label}
            />
          );
        })}
      </nav>

      <div className="mt-auto flex shrink-0 flex-col items-center gap-1 border-t py-2 app-nav-rail-footer">
        <ThemeMenuButton variant="compact" />
        <button
          type="button"
          onClick={onLogout}
          title="Cerrar sesión"
          className="app-nav-rail-item group flex min-h-[48px] w-full flex-col items-center justify-center gap-1 px-1 py-1 transition-colors"
        >
          <span className="relative flex h-8 w-14 items-center justify-center rounded-full">
            <MaterialIcon
              icon="logout"
              className="h-6 w-6 text-red-500/80 transition-colors group-hover:text-red-400"
            />
          </span>
          <span className="text-[10px] font-medium text-red-500/70 group-hover:text-red-400">
            Salir
          </span>
        </button>
      </div>
    </aside>
  );
}
