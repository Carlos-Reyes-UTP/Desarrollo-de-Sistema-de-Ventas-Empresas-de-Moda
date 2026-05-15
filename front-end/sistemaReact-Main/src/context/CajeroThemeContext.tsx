import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'dakani:cajero-theme';

type CajeroThemeMode = 'dark' | 'light';

interface CajeroThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
  setDark: (dark: boolean) => void;
}

const CajeroThemeContext = createContext<CajeroThemeContextValue | null>(null);

function readStoredTheme(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark';
  } catch {
    return false;
  }
}

function writeStoredTheme(mode: CajeroThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore quota / private mode */
  }
}

export function CajeroThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(readStoredTheme);

  useEffect(() => {
    writeStoredTheme(isDark ? 'dark' : 'light');
  }, [isDark]);

  const setDark = useCallback((dark: boolean) => {
    setIsDark(dark);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({ isDark, toggleTheme, setDark }),
    [isDark, toggleTheme, setDark]
  );

  return (
    <CajeroThemeContext.Provider value={value}>
      {children}
    </CajeroThemeContext.Provider>
  );
}

export function useCajeroTheme(): CajeroThemeContextValue {
  const ctx = useContext(CajeroThemeContext);
  if (!ctx) {
    throw new Error('useCajeroTheme debe usarse dentro de CajeroThemeProvider');
  }
  return ctx;
}
