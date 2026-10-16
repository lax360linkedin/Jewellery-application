/**
 * Theme & Color Tokens for SJ Jewelers Mobile App
 * Exact palette preserved from the approved web design.
 */

export const COLORS = {
  // Primary Brand Colors
  primaryPurple: '#583cf5',
  primaryPurpleHover: '#472be0',
  primaryPurpleLight: '#f1ecfe',
  primaryPurpleFaded: 'rgba(88, 60, 245, 0.12)',

  // Backgrounds & Surfaces
  bgLavender: '#eee7ff',
  bgLavenderLight: '#f7f4ff',
  bgDark: '#0f0d19',
  bgCardWhite: '#ffffff',
  bgCardPurpleLight: '#ded4fc',
  bgCardPurpleLighter: '#ede7fc',
  bgCardPurpleMuted: '#dcd0ff',
  bgCardPurpleSoft: '#f6f2ff',

  // Typography
  textDark: '#1e1b2e',
  textSecondary: '#3d3852',
  textMuted: '#736d85',
  textLight: '#ffffff',
  textPurple: '#583cf5',

  // Accent & Status Colors
  yellowAccent: '#ffd000',
  orangeRibbon: '#ff7a00',
  orangeBadgeBg: '#fef3c7',
  orangeBadgeText: '#d97706',
  greenBadgeBg: '#d1fae5',
  greenBadgeText: '#059669',
  blueBadgeBg: '#e0f2fe',
  blueBadgeText: '#0284c7',
  redDangerBg: '#fee2e2',
  redDangerText: '#dc2626',
  redLogout: '#ff3b30',

  // Asset Specific
  goldAccent: '#f5c242',
  goldBg: '#fde9b8',
  silverAccent: '#a0aab4',
  silverBg: '#e2e6ea',

  // Inputs & Borders
  inputBg: '#ffffff',
  inputBorder: '#dcd4fa',
  inputBorderFocus: '#583cf5',
  cardBorder: '#c9b8fc',
  borderSubtle: '#e8e2fa',
  borderDivider: '#c5b6f0',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
  extraBold: 'System',
};

export const SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 26,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#583cf5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
  },
  primaryBtn: {
    shadowColor: '#583cf5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },
  dangerBtn: {
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
};
