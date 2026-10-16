import { StyleSheet, Platform } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgLavender,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primaryPurple,
  },
  screenLayout: {
    flex: 1,
    backgroundColor: COLORS.bgLavender,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 90,
  },
  // Header styles
  topHeaderBar: {
    backgroundColor: COLORS.primaryPurple,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '400',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.light,
  },

  // Input elements
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  inputField: {
    height: 48,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 16,
    fontSize: 14.5,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  inputFieldMultiline: {
    height: 90,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  fieldErrorText: {
    color: COLORS.redDangerText,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },

  // Buttons
  primaryButton: {
    height: 50,
    backgroundColor: COLORS.primaryPurple,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...SHADOWS.primaryBtn,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    height: 50,
    backgroundColor: COLORS.redLogout,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...SHADOWS.dangerBtn,
  },
  dangerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Cards
  card: {
    backgroundColor: COLORS.bgCardWhite,
    borderRadius: RADIUS.xl,
    padding: 20,
    ...SHADOWS.light,
  },
  cardPurple: {
    backgroundColor: COLORS.bgCardPurpleMuted,
    borderRadius: RADIUS.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },

  // Alerts & Messages
  errorBox: {
    backgroundColor: COLORS.redDangerBg,
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  errorBoxText: {
    color: COLORS.redDangerText,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: COLORS.greenBadgeBg,
    borderColor: '#6ee7b7',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  successBoxText: {
    color: COLORS.greenBadgeText,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Modal backdrop
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCenteredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
