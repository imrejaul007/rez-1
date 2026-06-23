/**
 * Corporate Account
 * Company account overview: employees, spend, tier, perks.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import { BRAND } from '@/constants/brand';

export default function CorporateAccountPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [account, setAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    apiClient.get('/user/profile').then((res: any) => {
      setAccount(res.data?.corporateAccount || null);
    }).finally(() => setIsLoading(false));
  }, [isAuthenticated, authLoading]);

  if (isLoading) return <SafeAreaView style={s.container}><ActivityIndicator size="large" style={{ marginTop: 60 }} color="#7C3AED" /></SafeAreaView>;

  if (!account) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.empty}>
            <Ionicons name="business-outline" size={56} color="#9CA3AF" />
            <Text style={s.emptyTitle}>Corporate Perks</Text>
            <Text style={s.emptyText}>Register your company to unlock bulk ordering, team management, and exclusive corporate discounts.</Text>
            <Pressable style={s.ctaBtn} onPress={() => router.push('/corporate/team')}>
              <Text style={s.ctaBtnText}>Register Company</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>{account.companyName || 'Corporate Account'}</Text>
        <View style={s.statsRow}>
          {[
            { label: 'Employees', value: account.employeeCount || 0, icon: 'people' },
            { label: 'Monthly Spend', value: `₹${(account.monthlySpend || 0).toLocaleString()}`, icon: 'cash' },
            { label: 'Tier', value: account.tier || 'Standard', icon: 'ribbon' },
          ].map((s2, i) => (
            <View key={i} style={s.statCard}>
              <Ionicons name={s2.icon as any} size={20} color="#7C3AED" />
              <Text style={s.statValue}>{s2.value}</Text>
              <Text style={s.statLabel}>{s2.label}</Text>
            </View>
          ))}
        </View>
        <View style={s.menuList}>
          {[
            { label: 'Team Management', icon: 'people-circle', route: '/corporate/team' },
            { label: 'Bulk Orders', icon: 'cart', route: '/corporate/orders' },
            { label: 'Expense Reports', icon: 'document-text', route: '/corporate/orders' },
          ].map((item, i) => (
            <Pressable key={i} style={s.menuItem} onPress={() => router.push(item.route as any)}>
              <Ionicons name={item.icon as any} size={22} color="#374151" />
              <Text style={s.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 16, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 14, alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }) },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 6 },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  menuList: { gap: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 8, gap: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }) },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  ctaBtn: { backgroundColor: '#7C3AED', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, marginTop: 20 },
  ctaBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
