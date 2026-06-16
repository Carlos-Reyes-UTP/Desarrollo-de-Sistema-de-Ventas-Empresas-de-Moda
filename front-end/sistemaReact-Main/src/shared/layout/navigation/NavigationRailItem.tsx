import { forwardRef } from "react";
import { MaterialIcon } from "@/shared/ui";

interface NavigationRailItemProps {
  icon: string;
  label: string;
  selected: boolean;
  onClick: () => void;
  onIntent?: () => void;
  title?: string;
}

export const NavigationRailItem = forwardRef<HTMLButtonElement, NavigationRailItemProps>(
  function NavigationRailItem({ icon, label, selected, onClick, onIntent, title }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        onMouseEnter={onIntent}
        onFocus={onIntent}
        title={title ?? label}
        aria-current={selected ? "page" : undefined}
        className="app-nav-rail-item group relative flex w-full min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-1.5 transition-colors"
      >
        <span
          className={`app-nav-rail-indicator relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
            selected ? "app-nav-rail-indicator--active" : ""
          }`}
        >
          <MaterialIcon
            icon={icon}
            fill={selected}
            className={`h-6 w-6 transition-opacity ${
              selected ? "app-nav-rail-icon-active" : "app-nav-rail-icon-inactive"
            }`}
          />
        </span>
        <span
          className={`max-w-[72px] text-center text-[11px] font-medium leading-tight line-clamp-2 ${
            selected ? "app-nav-rail-label-active" : "app-nav-rail-label"
          }`}
        >
          {label}
        </span>
      </button>
    );
  }
);
