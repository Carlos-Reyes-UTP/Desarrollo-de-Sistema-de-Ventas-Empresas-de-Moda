/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@material-tailwind/react/components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@material-tailwind/react/theme/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        'app-bg': 'var(--app-bg)',
        'app-bg-muted': 'var(--app-bg-muted)',
        'app-surface': 'var(--app-surface)',
        'app-surface-elevated': 'var(--app-surface-elevated)',
        'app-surface-glass': 'var(--app-surface-glass)',
        'app-input': 'var(--app-input)',
        'app-border': 'var(--app-border)',
        'app-border-strong': 'var(--app-border-strong)',
        'app-text': 'var(--app-text)',
        'app-text-muted': 'var(--app-text-muted)',
        'app-text-faint': 'var(--app-text-faint)',
        'app-accent': 'var(--app-accent)',
        'app-accent-fg': 'var(--app-accent-fg)',
        'app-ring': 'var(--app-ring)',
        'app-hover-overlay': 'var(--app-hover-overlay)',
      },
    },
  },
  plugins: [],
};
