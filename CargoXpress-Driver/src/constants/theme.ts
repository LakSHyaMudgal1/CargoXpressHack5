export const THEME = {
  colors: {
    primary: '#2563EB',       // Electric Blue / Freight Core
    primaryLight: '#3B82F6',
    primaryDark: '#1D4ED8',
    secondary: '#F59E0B',     // Logistics Amber
    secondaryLight: '#FBBF24',
    background: '#0F172A',    // Deep Slate background
    surface: '#1E293B',       // Card / Container Surface
    surfaceHover: '#334155',  // Elevated surface
    border: '#334155',        // Subtle borders
    text: '#F8FAFC',          // Primary high-contrast text
    textSecondary: '#94A3B8', // Subtitle text
    textMuted: '#64748B',     // Captions / placeholders
    success: '#10B981',       // Arrived / Delivered / Active
    successBg: 'rgba(16, 185, 129, 0.15)',
    warning: '#F59E0B',       // Pending / Review
    warningBg: 'rgba(245, 158, 11, 0.15)',
    danger: '#EF4444',        // Error / Reassigned / Cancelled
    dangerBg: 'rgba(239, 68, 68, 0.15)',
    info: '#06B6D4',          // Corridor / Stops info
    infoBg: 'rgba(6, 182, 212, 0.15)',
    white: '#FFFFFF',
    black: '#000000',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    titleLarge: {
      fontSize: 26,
      fontWeight: '700' as const,
      lineHeight: 32,
    },
    titleMedium: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 26,
    },
    titleSmall: {
      fontSize: 17,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
    },
    badge: {
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 0.5,
    },
  },
};
