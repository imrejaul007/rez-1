// BookTableCard.tsx - Book a Table card for food/dining stores
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface BookTableCardProps {
  storeId: string;
  storeName: string;
  storeCategory: string;
  onPress: (storeId: string, storeName: string) => void;
}

function BookTableCard({ storeId, storeName, storeCategory, onPress }: BookTableCardProps) {
  // Only show for food/dining stores
  const isFoodStore = ['food', 'dining', 'restaurant', 'cafe', 'bakery', 'kitchen', 'street food']
    .some(k => storeCategory.toLowerCase().includes(k));

  if (!isFoodStore) return null;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.card}
        onPress={() => onPress(storeId, storeName)}
      >
        <LinearGradient
          colors={[Colors.nileBlue, '#0f2638']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="restaurant-outline" size={20} color={Colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Book a Table</Text>
              <Text style={styles.subtitle}>
                Reserve & earn cashback on dine-in
              </Text>
            </View>
            <View style={styles.cta}>
              <Ionicons name="chevron-forward" size={16} color={Colors.nileBlue} />
            </View>
          </View>
          <View style={styles.perks}>
            <View style={styles.perk}>
              <Ionicons name="checkmark-circle" size={13} color={colors.successScale[400]} />
              <Text style={styles.perkText}>No pre-payment</Text>
            </View>
            <View style={styles.perk}>
              <Ionicons name="wallet-outline" size={13} color={Colors.warning} />
              <Text style={styles.perkText}>Bonus coins</Text>
            </View>
            <View style={styles.perk}>
              <Ionicons name="time-outline" size={13} color={colors.infoScale[400]} />
              <Text style={styles.perkText}>Instant confirm</Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export default React.memo(BookTableCard);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  gradient: {
    padding: Spacing.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(251,191,36,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  subtitle: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  cta: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: Colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  perkText: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },
});
