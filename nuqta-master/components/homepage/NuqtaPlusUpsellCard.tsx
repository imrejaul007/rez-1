/**
 * NuqtaPlusUpsellCard — Homepage upsell for free users
 *
 * Shows missed cashback to encourage subscription upgrade.
 * Only visible to free-tier users with 3+ orders.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserIdentity } from '@/hooks/useUserIdentity';
import { useAuthStore } from '@/stores/authStore';

const NuqtaPlusUpsellCard = React.memo(function NuqtaPlusUpsellCard() {
  const { isNuqtaFree } = useUserIdentity();
  const user = useAuthStore((s) => s.state.user);
  const router = useRouter();

  const orderCount = (user as any)?.totalOrders ?? 0;
  if (!isNuqtaFree || orderCount < 3) return null;

  const lastMonthSpend = (user as any)?.totalSpent ?? 0;
  const missedCashback = Math.floor(lastMonthSpend * 0.05);

  if (missedCashback <= 0) return null;

  return (
    <Pressable onPress={() => router.push('/subscriptions' as any)} style={styles.card}>
      <View style={styles.iconContainer}>
        <Ionicons name="trending-up" size={24} color="#6D28D9" />
      </View>
      <View style={styles.content}>
        <Text style={styles.headline}>
          You missed {'\u20B9'}{missedCashback.toLocaleString()} in cashback
        </Text>
        <Text style={styles.sub}>
          Nuqta Plus Premium gives 2x on every purchase
        </Text>
        <Text style={styles.cta}>Upgrade for {'\u20B9'}199/mo {'\u2192'}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  headline: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  sub: {
    fontSize: 13,
    color: '#64748B',
  },
  cta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D28D9',
    marginTop: 4,
  },
});

export default NuqtaPlusUpsellCard;
