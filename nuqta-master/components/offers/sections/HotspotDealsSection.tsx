/**
 * HotspotDealsSection Component
 *
 * Location-based hotspot deals
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { SectionHeader, HorizontalScrollSection } from '../common';
import { HotspotDeal } from '@/types/offers.types';
import { Spacing, BorderRadius, Typography, Shadows } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface HotspotDealsSectionProps {
  hotspots: HotspotDeal[];
  onHotspotPress: (hotspot: HotspotDeal) => void;
  selectedHotspot?: string;
}

export const HotspotDealsSection: React.FC<HotspotDealsSectionProps> = ({
  hotspots,
  onHotspotPress,
  selectedHotspot,
}) => {
  const { theme, isDark } = useOffersTheme();

  if (hotspots.length === 0) return null;

  const styles = StyleSheet.create({
    container: {
      marginBottom: Spacing.lg,
    },
    card: {
      minWidth: 160,
      backgroundColor: theme.colors.background.card,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : colors.tint.blueLight,
      padding: Spacing.md,
      ...(isDark ? {} : Shadows.subtle),
    },
    cardSelected: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.tint.blue,
      borderColor: colors.infoScale[400],
      borderWidth: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : colors.tint.blueLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    areaName: {
      ...Typography.label,
      color: theme.colors.text.primary,
      flex: 1,
    },
    dealsCount: {
      ...Typography.bodySmall,
      color: theme.colors.text.secondary,
    },
    viewText: {
      ...Typography.labelSmall,
      color: isDark ? colors.infoScale[400] : colors.brand.blue,
      marginTop: Spacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Hotspot Deals"
        subtitle="Top deals by area"
        icon="map"
        iconColor={colors.infoScale[400]}
        showViewAll={false}
      />
      <HorizontalScrollSection>
        {hotspots.map((hotspot) => {
          const isSelected = selectedHotspot === hotspot.areaId;
          return (
            <Pressable
              key={hotspot.id}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => onHotspotPress(hotspot)}
             
            >
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="location"
                    size={18}
                    color={isDark ? colors.infoScale[400] : colors.infoScale[400]}
                  />
                </View>
                <Text style={styles.areaName} numberOfLines={1}>
                  {hotspot.areaName}
                </Text>
              </View>
              <Text style={styles.dealsCount}>
                {hotspot.totalDeals} deals available
              </Text>
              <Text style={styles.viewText}>
                View deals →
              </Text>
            </Pressable>
          );
        })}
      </HorizontalScrollSection>
    </View>
  );
};

export default React.memo(HotspotDealsSection);
