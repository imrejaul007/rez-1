/**
 * PriveHighlightsSection - Today's highlights cards
 * Curated Offer, Nearby Store, Opportunity
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from './priveTheme';

interface HighlightItem {
  id: string;
  type: 'offer' | 'store' | 'campaign';
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
}

interface PriveHighlightsSectionProps {
  highlights?: {
    curatedOffer: HighlightItem | null;
    nearbyStore: HighlightItem | null;
    opportunity: HighlightItem | null;
  };
}

export const PriveHighlightsSection: React.FC<PriveHighlightsSectionProps> = ({
  highlights,
}) => {
  const router = useRouter();

  // Collect non-null highlights
  const items: HighlightItem[] = [];
  if (highlights?.curatedOffer) items.push(highlights.curatedOffer);
  if (highlights?.nearbyStore) items.push(highlights.nearbyStore);
  if (highlights?.opportunity) items.push(highlights.opportunity);

  // Don't render section if no highlights available
  if (items.length === 0) {
    return null;
  }

  const handlePress = (item: HighlightItem) => {
    switch (item.type) {
      case 'offer':
        router.push(`/prive/prive-offers` as any);
        break;
      case 'store':
        router.push(`/MainStorePage?storeId=${item.id}` as any);
        break;
      case 'campaign':
        router.push(`/deals/${item.id}` as any);
        break;
    }
  };

  const renderHighlightCard = (item: HighlightItem) => (
    <Pressable
      key={item.id}
      style={styles.highlightCard}
      onPress={() => handlePress(item)}
     
    >
      <View style={[styles.highlightBadge, { backgroundColor: `${item.badgeColor}20` }]}>
        <Text style={[styles.highlightBadgeText, { color: item.badgeColor }]}>
          {item.badge}
        </Text>
      </View>
      <View style={styles.highlightIcon}>
        <Text style={styles.highlightEmoji}>{item.icon}</Text>
      </View>
      <Text style={styles.highlightTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.highlightSubtitle} numberOfLines={1}>
        {item.subtitle}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>TODAY'S PRIVE HIGHLIGHTS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map(renderHighlightCard)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: PRIVE_SPACING.lg,
  },
  sectionLabel: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    letterSpacing: 1.5,
    paddingHorizontal: PRIVE_SPACING.xl,
    marginBottom: PRIVE_SPACING.md,
  },
  scrollContent: {
    paddingHorizontal: PRIVE_SPACING.xl,
    gap: PRIVE_SPACING.md,
  },
  highlightCard: {
    width: 140,
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  highlightBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: PRIVE_SPACING.sm,
    paddingVertical: PRIVE_SPACING.xs,
    borderRadius: PRIVE_RADIUS.sm,
    marginBottom: PRIVE_SPACING.md,
  },
  highlightBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  highlightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIVE_COLORS.transparent.gold10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: PRIVE_SPACING.md,
  },
  highlightEmoji: {
    fontSize: 20,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.xs,
  },
  highlightSubtitle: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
  },
});

export default React.memo(PriveHighlightsSection);
