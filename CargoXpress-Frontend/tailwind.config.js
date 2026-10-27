import daisyui from "daisyui"

function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme-mode="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Semantic canvas and surface tokens
        canvas: withOpacity('--color-canvas-rgb'),
        surface: {
          DEFAULT: withOpacity('--color-surface-rgb'),
          base: withOpacity('--color-surface-base-rgb'),
          card: withOpacity('--color-surface-rgb'),
          subtle: withOpacity('--color-surface-subtle-rgb'),
          elevated: withOpacity('--color-surface-elevated-rgb'),
          hover: withOpacity('--color-surface-hover-rgb'),
          active: withOpacity('--color-surface-active-rgb'),
        },
        // Hairline borders and dividers
        border: {
          DEFAULT: ({ opacityValue }) => {
            if (opacityValue !== undefined) {
              return `rgba(var(--color-border-rgb), ${opacityValue})`;
            }
            return `rgba(var(--color-border-rgb), var(--color-border-alpha, 0.08))`;
          },
          subtle: ({ opacityValue }) => {
            if (opacityValue !== undefined) {
              return `rgba(var(--color-border-rgb), ${opacityValue})`;
            }
            return `rgba(var(--color-border-rgb), var(--color-border-subtle-alpha, 0.05))`;
          },
          muted: ({ opacityValue }) => {
            if (opacityValue !== undefined) {
              return `rgba(var(--color-border-rgb), ${opacityValue})`;
            }
            return `rgba(var(--color-border-rgb), var(--color-border-muted-alpha, 0.12))`;
          },
          strong: ({ opacityValue }) => {
            if (opacityValue !== undefined) {
              return `rgba(var(--color-border-rgb), ${opacityValue})`;
            }
            return `rgba(var(--color-border-rgb), var(--color-border-strong-alpha, 0.20))`;
          },
        },
        // High-contrast ink typography hierarchy
        ink: {
          DEFAULT: withOpacity('--color-ink-rgb'),
          stark: withOpacity('--color-ink-stark-rgb'),
          secondary: withOpacity('--color-ink-secondary-rgb'),
          muted: withOpacity('--color-ink-muted-rgb'),
          subtle: withOpacity('--color-ink-subtle-rgb'),
          faint: withOpacity('--color-ink-subtle-rgb'),
        },
        // Functional Freight & Telemetry Signals (Strict semantic roles)
        signal: {
          aqua: withOpacity('--color-signal-aqua-rgb'),
          emerald: withOpacity('--color-signal-emerald-rgb'),
          coral: withOpacity('--color-signal-coral-rgb'),
          amber: withOpacity('--color-signal-amber-rgb'),
          sky: withOpacity('--color-signal-sky-rgb'),
          purple: withOpacity('--color-signal-purple-rgb'),
          // Semantic alias tokens
          success: withOpacity('--color-signal-emerald-rgb'),
          warning: withOpacity('--color-signal-amber-rgb'),
          error: withOpacity('--color-signal-coral-rgb'),
          info: withOpacity('--color-signal-aqua-rgb'),
          accent: withOpacity('--color-signal-purple-rgb'),
        },
        // Primary action tokens
        action: {
          primary: withOpacity('--color-primary-rgb'),
          'primary-hover': withOpacity('--color-primary-hover-rgb'),
          'primary-text': withOpacity('--color-primary-text-rgb'),
          secondary: withOpacity('--color-secondary-bg-rgb'),
          'secondary-hover': withOpacity('--color-secondary-hover-rgb'),
          'secondary-text': withOpacity('--color-secondary-text-rgb'),
        },
        // Brand palette alias
        brand: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: withOpacity('--color-primary-rgb'),
          600: withOpacity('--color-primary-hover-rgb'),
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          950: '#022C22',
        },
      },
      letterSpacing: {
        tighter: '-0.035em',
        tight: '-0.02em',
        normal: '0em',
        wide: '0.04em',
        eyebrow: '0.12em',
      },
      borderRadius: {
        none: '0px',
        xs: '3px',
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        full: '9999px',
      },
      boxShadow: {
        none: 'none',
        sm: 'var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.4))',
        'subtle-card': 'var(--shadow-subtle-card, 0 2px 8px -1px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08))',
        'elevated-card': 'var(--shadow-elevated-card, 0 8px 24px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.12))',
        'glow-aqua': '0 0 16px -4px rgba(var(--color-signal-aqua-rgb), 0.25)',
        'glow-emerald': '0 0 16px -4px rgba(var(--color-signal-emerald-rgb), 0.25)',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: ["dark", "light"],
  },
};
