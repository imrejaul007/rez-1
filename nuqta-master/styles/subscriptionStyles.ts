// Shared subscription component styles
// Common styling constants used across subscription components

import { StyleSheet } from 'react-native';

export const SUBSCRIPTION_COLORS = {
  purple: '#8B5CF6',
  purpleLight: '#A78BFA',
  amber: '#F59E0B',
  amberLight: '#FBBF24',
  gray: '#6B7280',
  grayLight: '#9CA3AF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  background: '#F9FAFB',
  white: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  disabled: '#D1D5DB',
};

export const SUBSCRIPTION_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const SUBSCRIPTION_BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const SUBSCRIPTION_SHADOW = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const subscriptionBaseStyles = StyleSheet.create({
  // Common card styles
  card: {
    backgroundColor: SUBSCRIPTION_COLORS.white,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.lg,
    ...SUBSCRIPTION_SHADOW.medium,
  },
  smallCard: {
    backgroundColor: SUBSCRIPTION_COLORS.white,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    ...SUBSCRIPTION_SHADOW.small,
  },

  // Common button styles
  button: {
    paddingVertical: SUBSCRIPTION_SPACING.lg,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: SUBSCRIPTION_COLORS.purple,
  },
  secondaryButton: {
    backgroundColor: SUBSCRIPTION_COLORS.border,
  },
  dangerButton: {
    backgroundColor: SUBSCRIPTION_COLORS.error,
  },

  // Common text styles
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: SUBSCRIPTION_COLORS.text,
  },
  subheading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: SUBSCRIPTION_COLORS.text,
  },
  body: {
    fontSize: 14,
    color: SUBSCRIPTION_COLORS.text,
  },
  caption: {
    fontSize: 12,
    color: SUBSCRIPTION_COLORS.textSecondary,
  },

  // Common container styles
  container: {
    flex: 1,
    backgroundColor: SUBSCRIPTION_COLORS.background,
  },
  section: {
    marginHorizontal: SUBSCRIPTION_SPACING.xl,
    marginVertical: SUBSCRIPTION_SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Icon styles
  iconContainer: {
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
