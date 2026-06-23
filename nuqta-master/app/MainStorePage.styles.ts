// MainStorePage.styles.ts - Styles for the MainStorePage orchestrator
import { Platform, StyleSheet } from "react-native";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/DesignSystem";
import { colors } from '@/constants/theme';

export const createStyles = (HORIZONTAL_PADDING: number, _screenData: { width: number; height: number }) =>
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: Colors.background.secondary,
    },
    scrollContent: {
      paddingBottom: 0,
      paddingTop: 0,
    },
    webScrollContent: {
      paddingBottom: 0,
    },
    contentWrapper: {
      flex: 1,
    },
    imageSection: {
      paddingHorizontal: HORIZONTAL_PADDING,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
    },
    imageCard: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderRadius: BorderRadius.xl,
      overflow: "hidden",
      shadowColor: Colors.gold,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 10,
      padding: 0,
      borderWidth: 1,
      borderColor: "rgba(0, 192, 106, 0.1)",
    },
    tabsContainer: {
      marginTop: Spacing.base,
      marginHorizontal: HORIZONTAL_PADDING,
      marginBottom: Spacing.md,
    },
    sectionCard: {
      marginHorizontal: HORIZONTAL_PADDING,
      marginTop: Spacing.md,
      backgroundColor: Colors.background.primary,
      borderRadius: BorderRadius.lg,
      paddingVertical: 14,
      paddingHorizontal: 14,
      shadowColor: colors.brand.navyDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: "rgba(0, 0, 0, 0.03)",
    },
    errorToast: {
      position: "absolute",
      left: HORIZONTAL_PADDING + 4,
      right: HORIZONTAL_PADDING + 4,
      top: Platform.OS === "ios" ? 60 : 44,
    },
    errorInner: {
      backgroundColor: colors.errorScale[50],
      borderLeftWidth: 6,
      borderLeftColor: Colors.error,
      padding: Spacing.base,
      borderRadius: BorderRadius.lg,
      flexDirection: "row",
      alignItems: "center",
    },
    errorDot: {
      width: 12,
      height: 12,
      borderRadius: BorderRadius.sm,
      backgroundColor: Colors.error,
    },
    errorText: {
      color: "#991B1B",
      ...Typography.body,
      fontWeight: "600",
    },
    stickyTabsContainer: {
      position: "absolute",
      top: Platform.OS === "ios" ? 88 : Platform.OS === "web" ? 80 : 72,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: Colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(0, 0, 0, 0.06)",
      ...Platform.select({
        ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
        android: { elevation: 8 },
        web: { boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" },
      }),
    },
    stickyTabsInner: {
      paddingHorizontal: Spacing.base,
      paddingVertical: 0,
    },
  });
