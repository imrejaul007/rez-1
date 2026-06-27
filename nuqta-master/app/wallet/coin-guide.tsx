/**
 * Coin System Guide
 * Static explainer: REZ coins vs Promo vs Branded vs Privé
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND } from '@/constants/brand';

const COIN_TYPES = [
  {
    name: `${BRAND.COIN_NAME} (Core)`,
    icon: 'star',
    color: '#7C3AED',
    bg: '#F3E8FF',
    description: 'The primary currency of the REZ ecosystem. Earned through purchases, reviews, referrals, and daily engagement.',
    howToEarn: ['Shop at local stores via Near U', 'Complete daily check-ins', 'Write reviews', 'Refer friends', 'Participate in campaigns'],
    howToSpend: ['Redeem at checkout for discounts', 'Transfer to friends', 'Convert to gift cards via Privé', 'Use in games and challenges'],
    expiry: 'Coins expire after 12 months of inactivity',
  },
  {
    name: 'Promo Coins',
    icon: 'gift',
    color: '#3B82F6',
    bg: '#DBEAFE',
    description: 'Bonus coins awarded through campaigns, festivals, and special promotions. They have a shorter expiry.',
    howToEarn: ['Bonus zone campaigns', 'Festival offers', 'First-time purchase bonuses', 'Admin promotions'],
    howToSpend: ['Same as core coins at checkout', 'Cannot be transferred to friends', 'Used automatically before core coins'],
    expiry: 'Expires based on campaign rules (typically 30-90 days)',
  },
  {
    name: 'Branded Coins',
    icon: 'storefront',
    color: '#F59E0B',
    bg: '#FEF3C7',
    description: 'Merchant-specific coins issued by individual stores. Can only be redeemed at the issuing merchant.',
    howToEarn: ['Purchase at participating merchants', 'Merchant loyalty programs', 'Merchant-specific campaigns'],
    howToSpend: ['Only at the issuing merchant', 'Cannot be transferred', 'Check balance on merchant store page'],
    expiry: 'Set by each merchant (typically 6-12 months)',
  },
  {
    name: 'Privé Coins',
    icon: 'diamond',
    color: '#10B981',
    bg: '#D1FAE5',
    description: 'Premium coins for Privé members. Earned through social cashback campaigns and exclusive activities.',
    howToEarn: ['Complete Privé campaigns', 'Social media posts for brands', 'Privé missions and challenges', 'Exclusive Privé events'],
    howToSpend: ['Redeem for premium rewards', 'Access exclusive experiences', 'Convert to core coins at favorable rate'],
    expiry: 'Expires after 6 months of inactivity',
  },
];

export default function CoinGuidePage() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Coin System Guide</Text>
        <Text style={styles.subtitle}>Understanding the 4 types of coins in the {BRAND.APP_NAME} ecosystem</Text>

        {COIN_TYPES.map((coin, i) => (
          <View key={i} style={[styles.card, { borderLeftColor: coin.color }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: coin.bg }]}>
                <Ionicons name={coin.icon as any} size={22} color={coin.color} />
              </View>
              <Text style={[styles.coinName, { color: coin.color }]}>{coin.name}</Text>
            </View>

            <Text style={styles.description}>{coin.description}</Text>

            <Text style={styles.sectionLabel}>How to Earn</Text>
            {coin.howToEarn.map((item, j) => (
              <View key={j} style={styles.bulletRow}>
                <Ionicons name="add-circle" size={14} color="#10B981" />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}

            <Text style={styles.sectionLabel}>How to Spend</Text>
            {coin.howToSpend.map((item, j) => (
              <View key={j} style={styles.bulletRow}>
                <Ionicons name="remove-circle" size={14} color="#3B82F6" />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}

            <View style={styles.expiryRow}>
              <Ionicons name="time-outline" size={13} color="#9CA3AF" />
              <Text style={styles.expiryText}>{coin.expiry}</Text>
            </View>
          </View>
        ))}

        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={20} color="#F59E0B" />
          <Text style={styles.tipText}>
            Tip: Promo and branded coins are used first at checkout to maximize the value of your core {BRAND.COIN_NAME}.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 16, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  card: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 14, borderLeftWidth: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  coinName: { fontSize: 16, fontWeight: '700' },
  description: { fontSize: 13, color: '#4B5563', lineHeight: 19, marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 4 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 4 },
  bulletText: { fontSize: 12, color: '#4B5563', flex: 1 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  expiryText: { fontSize: 11, color: '#9CA3AF' },
  tipCard: { flexDirection: 'row', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, gap: 10, alignItems: 'flex-start', marginTop: 6 },
  tipText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
});
