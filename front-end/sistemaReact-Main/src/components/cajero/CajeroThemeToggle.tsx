import { Moon, Sun } from 'lucide-react';
import { useCajeroTheme } from '@/context/CajeroThemeContext';

export const CajeroThemeToggle = () => {
  const { isDark, toggleTheme } = useCajeroTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="caj-icon-btn flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm transition-all hover:shadow-md active:scale-95"
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-[#e4e4e4]" strokeWidth={2} />
      ) : (
        <Moon className="h-5 w-5" strokeWidth={2} />
      )}
    </button>
  );
};
