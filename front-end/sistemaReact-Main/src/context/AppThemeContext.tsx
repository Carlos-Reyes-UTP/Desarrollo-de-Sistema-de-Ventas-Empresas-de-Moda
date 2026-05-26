import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';

export type AppThemeId =
  | 'classic'
  | 'dark'
  | 'pastel-dama'
  | 'pastel-caballero'
  | 'soft-neutral';

export interface AppThemeMeta {
  id: AppThemeId;
  label: string;
  description: string;
  swatch: string;
}

const STORAGE_KEY = 'dakani:app-theme';
const LEGACY_CAJERO_KEY = 'dakani:cajero-theme';

const THEME_IDS: AppThemeId[] = [
  'classic',
  'dark',
  'pastel-dama',
  'pastel-caballero',
  'soft-neutral',
];

// eslint-disable-next-line react-refresh/only-export-components
export const APP_THEMES: AppThemeMeta[] = [
  {
    id: 'classic',
    label: 'Clásico',
    description: 'Monocromo DK',
    swatch: '#fafafa',
  },
  {
    id: 'dark',
    label: 'Oscuro',
    description: 'Grises neutros',
    swatch: '#252526',
  },
  {
    id: 'pastel-dama',
    label: 'Pastel Dama',
    description: 'Rosa y nude suave',
    swatch: '#f5e4e8',
  },
  {
    id: 'pastel-caballero',
    label: 'Pastel Caballero',
    description: 'Azul niebla suave',
    swatch: '#dce6ef',
  },
  {
    id: 'soft-neutral',
    label: 'Neutro',
    description: 'Arena cálida',
    swatch: '#e8e4dd',
  },
];

function isAppThemeId(value: string | null): value is AppThemeId {
  return value !== null && THEME_IDS.includes(value as AppThemeId);
}

function readStoredTheme(): AppThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isAppThemeId(stored)) return stored;
    const legacy = localStorage.getItem(LEGACY_CAJERO_KEY);
    if (legacy === 'dark') return 'dark';
  } catch {
    /* ignore */
  }
  return 'classic';
}

function writeStoredTheme(themeId: AppThemeId): void {
  try {
    localStorage.setItem(STORAGE_KEY, themeId);
  } catch {
    /* ignore */
  }
}

interface AppThemeContextValue {
  themeId: AppThemeId;
  setTheme: (themeId: AppThemeId) => void;
  themes: AppThemeMeta[];
  isDark: boolean;
  showMesh: boolean;
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [themeId, setThemeId] = useState<AppThemeId>(() => {
    const stored = readStoredTheme();
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', stored);
    }
    return stored;
  });

  const esVendedor = useMemo(() => {
    return location.pathname.includes('/vendedor-solicitud-almacen');
  }, [location.pathname]);

  const temaEfectivo = esVendedor ? 'dark' : themeId;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', temaEfectivo);

    // Sincronizar el color de la barra de título nativa de la ventana (PWA) con el tema actual
    const themeColors: Record<AppThemeId, string> = {
      classic: '#fafafa',
      dark: '#0a0a0a',
      'pastel-dama': '#fdf6f6',
      'pastel-caballero': '#f4f7fa',
      'soft-neutral': '#f7f5f2',
    };

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', themeColors[temaEfectivo]);
  }, [temaEfectivo]);

  const setTheme = useCallback((id: AppThemeId) => {
    if (esVendedor) return;
    writeStoredTheme(id);
    setThemeId(id);
  }, [esVendedor]);

  const value = useMemo(
    () => ({
      themeId: temaEfectivo,
      setTheme,
      themes: esVendedor
        ? (APP_THEMES.filter((t) => t.id === 'dark') as AppThemeMeta[])
        : APP_THEMES,
      isDark: temaEfectivo === 'dark',
      showMesh: temaEfectivo === 'classic',
    }),
    [temaEfectivo, setTheme, esVendedor]
  );

  return (
    <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme debe usarse dentro de AppThemeProvider');
  }
  return ctx;
}
