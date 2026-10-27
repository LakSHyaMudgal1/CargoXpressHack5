import daisyui from "daisyui"

/** @type {import('tailwindcss').Config} */
export default {
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
        // Deep obsidian canvas and surfaces
        canvas: '#07090E',
        surface: {
          DEFAULT: '#0E131F',
          base: '#0D111A',
          card: '#0E131F',
          subtle: '#121824',
          elevated: '#182030',
          hover: '#1E293D',
          active: '#24324D',
        },
        // Hairline borders and dividers
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          subtle: 'rgba(255, 255, 255, 0.05)',
          muted: 'rgba(255, 255, 255, 0.12)',
          strong: 'rgba(255, 255, 255, 0.20)',
        },
        // High-contrast ink typography hierarchy
        ink: {
          DEFAULT: '#F8FAFC',
          stark: '#FFFFFF',
          secondary: '#CBD5E1',
          muted: '#94A3B8',
          subtle: '#64748B',
          faint: '#475569',
        },
        // Functional Freight & Telemetry Signals (CE-style strict semantic roles)
        signal: {
          aqua: '#19E8C8',    // Active Telemetry / En-Route / Live Connection
          emerald: '#10B981', // Delivered / Merge Approved / Success / Brand
          coral: '#FF4B3A',   // Exception / Delay / Cancellation / Destructive
          amber: '#F59E0B',   // Warning / Pending Carrier / In-Progress Review
          sky: '#0EA5E9',     // Route Waypoint / Information / Standard Transit
          purple: '#8B5CF6',  // AI Algorithmic Merge / Consolidated Multi-Stop
        },
        // Primary brand emerald palette
        brand: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
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
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'subtle-card': '0 2px 8px -1px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'elevated-card': '0 8px 24px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.12)',
        'glow-aqua': '0 0 16px -4px rgba(25, 232, 200, 0.25)',
        'glow-emerald': '0 0 16px -4px rgba(16, 185, 129, 0.25)',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: ["dark", "light"],
  },
};
