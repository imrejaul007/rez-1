/**
 * ScreenSkeleton — Universal full-screen loading skeleton
 *
 * Dispatch wrapper that maps variant strings to existing specialized
 * skeletons in components/skeletons/. Does NOT reinvent skeleton layouts.
 *
 * @example
 * // Simple usage
 * if (loading) return <ScreenSkeleton variant="list" />;
 *
 * // With header preserved during loading
 * if (loading) return <ScreenSkeleton variant="detail" header={<MyHeader />} />;
 *
 * // Custom skeleton layout
 * if (loading) return <ScreenSkeleton custom={<MyCustomSkeleton />} />;
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton';

// Lazy imports for skeleton variants — only resolved when the variant is used
import {
  TransactionListSkeleton,
  CardGridSkeleton,
  ProductGridSkeleton,
  DetailPageSkeleton,
  FormPageSkeleton,
  ProfileSkeleton,
  SectionListSkeleton,
  ChatSkeleton,
  NotificationListSkeleton,
  GamePageSkeleton,
  MapViewSkeleton,
  GalleryGridSkeleton,
  CategoryGridSkeleton,
} from '@/components/skeletons';

// ============================================================================
// Types
// ============================================================================

export type SkeletonVariant =
  | 'list'
  | 'grid'
  | 'cards'
  | 'detail'
  | 'form'
  | 'profile'
  | 'sections'
  | 'chat'
  | 'notifications'
  | 'game'
  | 'map'
  | 'gallery'
  | 'categories';

interface ScreenSkeletonProps {
  /** Named variant that maps to an existing skeleton component */
  variant?: SkeletonVariant;
  /** Custom skeleton ReactNode for layouts not covered by variants */
  custom?: React.ReactNode;
  /** Count of items for list/grid variants */
  count?: number;
  /** Header content to render above the skeleton (nav bar, etc.) */
  header?: React.ReactNode;
  /** Background color override */
  backgroundColor?: string;
  /** Custom container style */
  style?: ViewStyle;
}

// ============================================================================
// Variant Map (static — not recreated per render)
// ============================================================================

const VARIANT_MAP: Record<SkeletonVariant, React.ComponentType<any>> = {
  list: TransactionListSkeleton,
  grid: CardGridSkeleton,
  cards: ProductGridSkeleton,
  detail: DetailPageSkeleton,
  form: FormPageSkeleton,
  profile: ProfileSkeleton,
  sections: SectionListSkeleton,
  chat: ChatSkeleton,
  notifications: NotificationListSkeleton,
  game: GamePageSkeleton,
  map: MapViewSkeleton,
  gallery: GalleryGridSkeleton,
  categories: CategoryGridSkeleton,
};

// ============================================================================
// Fallback Skeleton (generic page layout)
// ============================================================================

function FallbackSkeleton() {
  return (
    <View style={fallbackStyles.container}>
      {/* Title area */}
      <ShimmerSkeleton variant="text" width="60%" height={24} />
      <View style={fallbackStyles.gap} />
      {/* Subtitle */}
      <ShimmerSkeleton variant="text" width="85%" height={14} />
      <View style={fallbackStyles.gapSm} />
      <ShimmerSkeleton variant="text" width="70%" height={14} />
      <View style={fallbackStyles.gapLg} />
      {/* Image placeholder */}
      <ShimmerSkeleton variant="rect" width="100%" height={180} />
      <View style={fallbackStyles.gapLg} />
      {/* Content lines */}
      <ShimmerSkeleton variant="text" width="100%" height={14} />
      <View style={fallbackStyles.gapSm} />
      <ShimmerSkeleton variant="text" width="90%" height={14} />
      <View style={fallbackStyles.gapSm} />
      <ShimmerSkeleton variant="text" width="75%" height={14} />
      <View style={fallbackStyles.gapLg} />
      {/* Card placeholders */}
      <ShimmerSkeleton variant="card" width="100%" height={80} />
      <View style={fallbackStyles.gap} />
      <ShimmerSkeleton variant="card" width="100%" height={80} />
      <View style={fallbackStyles.gap} />
      <ShimmerSkeleton variant="card" width="100%" height={80} />
    </View>
  );
}

const fallbackStyles = StyleSheet.create({
  container: { padding: spacing.base },
  gap: { height: spacing.md },
  gapSm: { height: spacing.sm },
  gapLg: { height: spacing.xl },
});

// ============================================================================
// Component
// ============================================================================

function ScreenSkeleton({
  variant,
  custom,
  count,
  header,
  backgroundColor,
  style,
}: ScreenSkeletonProps) {
  // Determine which skeleton to render
  let skeletonContent: React.ReactNode;

  if (custom) {
    skeletonContent = custom;
  } else if (variant && VARIANT_MAP[variant]) {
    const SkeletonComponent = VARIANT_MAP[variant];
    skeletonContent = <SkeletonComponent count={count} />;
  } else {
    skeletonContent = <FallbackSkeleton />;
  }

  return (
    <View
      style={[
        styles.container,
        backgroundColor ? { backgroundColor } : undefined,
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {header}
      {skeletonContent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});

export default React.memo(ScreenSkeleton);
