/**
 * FitEarn — Gym/Studio Booking + Workout Tracking
 * Wasil vertical: fitness bookings using REZ wallet + coins.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CachedImage from '@/components/ui/CachedImage';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import apiClient from '@/services/apiClient';

interface FitnessStore { _id: string; name: string; logo?: string; category: string; rating: number; cashbackPercent: number; distance?: number; services: string[]; }
const FILTERS = ['All', 'Gyms', 'Yoga', 'CrossFit', 'Swimming'] as const;

export default function FitEarnHomePage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [stores, setStores] = useState<FitnessStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    apiClient.get('/stores', { category: 'fitness-sports', limit: 30 }).then((res: any) => {
      setStores(res.data?.stores || []);
    }).finally(() => setIsLoading(false));
  }, [isAuthenticated, authLoading]);

  const filtered = filter === 'All' ? stores : stores.filter(s => s.services?.some(sv => sv.toLowerCase().includes(filter.toLowerCase())) || s.category?.toLowerCase().includes(filter.toLowerCase()));

  const renderStore = useCallback(({ item }: { item: FitnessStore }) => (
    <Pressable style={s.card} onPress={() => router.push(`/store/${item._id}`)}>
      <View style={s.cardRow}>
        {item.logo ? <CachedImage source={{ uri: item.logo }} style={s.logo} contentFit="cover" /> : (
          <View style={[s.logo, s.logoFallback]}><Ionicons name="fitness-outline" size={22} color="#10B981" /></View>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.storeName} numberOfLines={1}>{item.name}</Text>
          <Text style={s.services} numberOfLines={1}>{item.services?.join(' • ') || 'Fitness'}</Text>
          <View style={s.metaRow}>
            <View style={s.ratingBadge}><Ionicons name="star" size={11} color="#FFF" /><Text style={s.ratingText}>{item.rating?.toFixed(1)}</Text></View>
            {item.cashbackPercent > 0 && <Text style={s.cashback}>{item.cashbackPercent}% cashback</Text>}
            {item.distance != null && <Text style={s.dist}>{(item.distance / 1000).toFixed(1)} km</Text>}
          </View>
        </View>
        <Pressable style={s.bookBtn} onPress={() => router.push(`/fitness/book/${item._id}` as any)}>
          <Text style={s.bookText}>Book</Text>
        </Pressable>
      </View>
    </Pressable>
  ), [router]);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <View style={s.header}><Text style={s.brand}>💪 FitEarn</Text><Text style={s.tagline}>Sweat, save & earn</Text></View>
      <View style={s.filterRow}>{FILTERS.map(f => (
        <Pressable key={f} style={[s.chip, filter === f && s.chipActive]} onPress={() => setFilter(f)}><Text style={[s.chipText, filter === f && s.chipTextActive]}>{f}</Text></Pressable>
      ))}</View>
      {isLoading ? <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#10B981" /> : (
        <FlatList data={filtered} keyExtractor={i => i._id} renderItem={renderStore} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="fitness-outline" size={48} color="#9CA3AF" /><Text style={s.emptyText}>No fitness studios found nearby</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  brand: { fontSize: 24, fontWeight: '800', color: '#10B981' },
  tagline: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6' },
  chipActive: { backgroundColor: '#10B981' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#FFF' },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 2 } }) },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#F3F4F6' },
  logoFallback: { justifyContent: 'center', alignItems: 'center' },
  storeName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  services: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, gap: 2 },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  cashback: { fontSize: 11, fontWeight: '600', color: '#7C3AED' },
  dist: { fontSize: 11, color: '#9CA3AF' },
  bookBtn: { backgroundColor: '#10B981', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  bookText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
});
