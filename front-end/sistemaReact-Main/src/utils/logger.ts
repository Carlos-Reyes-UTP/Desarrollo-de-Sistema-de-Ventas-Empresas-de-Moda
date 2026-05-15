const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.debug('[DK]', ...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info('[DK]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[DK]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[DK]', ...args);
  },
};
