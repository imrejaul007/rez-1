import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '@/constants/DesignSystem';
import { earnStyles as styles } from './styles';

export interface ExclusiveZoneItem {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  shortDescription?: string;
  cashbackBonusPercent: number;
  offersCount: number;
  verificationRequired: boolean;
  userEligible?: boolean;
}

interface ExclusiveZonesSectionProps {
  zones: ExclusiveZoneItem[];
  navigateTo: (path: string) => void;
}

const ExclusiveZonesSection = React.memo(function ExclusiveZonesSection({
  zones,
  navigateTo,
}: ExclusiveZonesSectionProps) {
  if (!zones || zones.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="shield-checkmark" size={24} color={Colors.gold} />
        <Text style={styles.sectionTitle}>Exclusive Zones</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={zoneStyles.scrollContent}
      >
        {zones.map((zone) => (
          <Pressable
            key={zone._id || zone.slug}
            style={zoneStyles.card}
            onPress={() => {
              if (!zone?.slug) return;
              navigateTo(`/offers/zones/${zone.slug}`);
            }}
          >
            <View style={[zoneStyles.iconCircle, { backgroundColor: zone.backgroundColor }]}>
              <Ionicons
                name={(zone.icon || 'gift') as keyof typeof Ionicons.glyphMap}
                size={24}
                color={zone.iconColor}
              />
            </View>
            <Text style={zoneStyles.zoneName} numberOfLines={1}>{zone.name}</Text>
            {zone.cashbackBonusPercent > 0 && (
              <View style={zoneStyles.cashbackBadge}>
                <Text style={zoneStyles.cashbackText}>+{zone.cashbackBonusPercent}%</Text>
              </View>
            )}
            {zone.offersCount > 0 && (
              <Text style={zoneStyles.offersCount}>{zone.offersCount} offers</Text>
            )}
            {zone.userEligible && (
              <View style={zoneStyles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                <Text style={zoneStyles.verifiedText}>Verified</Text>
              </View>
            )}
            {zone.verificationRequired && !zone.userEligible && (
              <View style={zoneStyles.verifyBadge}>
                <Text style={zoneStyles.verifyText}>Verify</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
});

const zoneStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.base,
    gap: 12,
  },
  card: {
    width: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.06)' } as any,
    }),
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  zoneName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  cashbackBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  cashbackText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  offersCount: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: '600',
  },
  verifyBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  verifyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B45309',
  },
});

export default ExclusiveZonesSection;
