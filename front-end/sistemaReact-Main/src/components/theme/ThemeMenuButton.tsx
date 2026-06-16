import { useEffect, useRef, useState } from 'react';
import { useAppTheme, type AppThemeId } from '@/context/AppThemeContext';
import { MaterialIcon } from '@/shared/ui';

function iconColorOnSwatch(themeId: AppThemeId): string {
  return themeId === 'dark' ? '#e8e8e8' : '#2d2d2d';
}

interface ThemeMenuButtonProps {
  variant?: 'default' | 'compact';
}

export const ThemeMenuButton = ({ variant = 'default' }: ThemeMenuButtonProps) => {
  const { themeId, setTheme, themes } = useAppTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTheme = themes.find((t) => t.id === themeId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themePanel = open && (
    <div
      role="listbox"
      aria-label="Seleccionar tema"
      className={`absolute z-[60] rounded-2xl border app-theme-menu-panel shadow-xl overflow-hidden animate-fadeIn max-h-[min(320px,50vh)] overflow-y-auto ${
        variant === 'compact'
          ? 'left-full bottom-0 ml-2 w-[min(280px,calc(100vw-96px))]'
          : 'left-2 right-2 bottom-full mb-2'
      }`}
    >
      {themes.map((theme) => {
        const active = themeId === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => {
              setTheme(theme.id);
              setOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b last:border-b-0 app-theme-menu-item ${
              active ? 'app-theme-menu-item-active' : ''
            }`}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/10"
              style={{
                backgroundColor: theme.swatch,
                color: iconColorOnSwatch(theme.id),
              }}
              aria-hidden
            >
              <MaterialIcon icon={theme.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold leading-tight">{theme.label}</span>
              <span className="block text-[10px] font-medium opacity-70">{theme.description}</span>
            </span>
            {active && <MaterialIcon icon="check" className="h-4 w-4 shrink-0" />}
          </button>
        );
      })}
    </div>
  );

  if (variant === 'compact') {
    return (
      <div ref={containerRef} className="relative px-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="listbox"
          title={`Tema: ${activeTheme?.label ?? 'Apariencia'}`}
          className="app-nav-rail-item group flex min-h-[48px] w-full flex-col items-center justify-center gap-1 px-1 py-1 transition-colors"
        >
          <span
            className="relative flex h-8 w-14 items-center justify-center rounded-full transition-colors group-hover:bg-[var(--app-rail-hover)]"
            style={
              activeTheme
                ? {
                    backgroundColor: open ? 'var(--app-rail-indicator)' : undefined,
                  }
                : undefined
            }
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={
                activeTheme
                  ? {
                      backgroundColor: activeTheme.swatch,
                      color: iconColorOnSwatch(activeTheme.id),
                    }
                  : undefined
              }
            >
              <MaterialIcon icon={activeTheme?.icon ?? 'palette'} className="h-4 w-4" />
            </span>
          </span>
          <span className="text-[10px] font-medium app-nav-rail-label">Tema</span>
        </button>
        {themePanel}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative px-2 pb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="app-drawer-theme-trigger w-full flex items-center gap-3 rounded-xl py-3.5 px-4 transition-all duration-200 active:scale-[0.98] border border-transparent"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl app-drawer-theme-icon-wrap"
          style={
            activeTheme
              ? {
                  backgroundColor: activeTheme.swatch,
                  color: iconColorOnSwatch(activeTheme.id),
                }
              : undefined
          }
        >
          <MaterialIcon icon={activeTheme?.icon ?? 'palette'} className="h-5 w-5" />
        </span>
        <span className="flex-1 min-w-0 text-left">
          <span className="block text-[14px] font-bold tracking-tight app-drawer-text">
            Apariencia
          </span>
          <span className="block text-[11px] font-medium app-drawer-muted truncate">
            {activeTheme?.label ?? 'Tema'}
          </span>
        </span>
        <MaterialIcon
          icon="expand_more"
          className={`h-4 w-4 shrink-0 app-drawer-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {themePanel}
    </div>
  );
};
