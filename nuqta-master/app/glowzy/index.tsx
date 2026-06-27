// @ts-nocheck
/**
 * Glowzy — Beauty Salon Booking + Products
 * Wasil vertical: beauty/wellness bookings using REZ wallet + coins.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CachedImage from '@/components/ui/CachedImage';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import apiClient from '@/services/apiClient';

interface Salon { _id: string; name: string; logo?: string; coverImage?: string; rating: number; reviewCount: number; cashbackPercent: number; distance?: number; services: string[]; priceRange: string; }
const FILTERS = ['All', 'Hair', 'Skin', 'Nails', 'Spa', 'Makeup'] as const;

export default function GlowzyHomePage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    apiClient.get('/stores', { category: 'beauty-wellness', limit: 30 }).then((res: any) => {
      setSalons(res.data?.stores || []);
    }).finally(() => setIsLoading(false));
  }, [isAuthenticated, authLoading]);

  const filtered = filter === 'All' ? salons : salons.filter(s => s.services?.some(sv => sv.toLowerCase().includes(filter.toLowerCase())));

  const renderSalon = useCallback(({ item }: { item: Salon }) => (
    <Pressable style={s.card} onPress={() => router.push(`/store/${item._id}`)}>
      <CachedImage source={{ uri: item.coverImage || item.logo }} style={s.cardImage} contentFit="cover" />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={s.salonName} numberOfLines={1}>{item.name}</Text>
          <View style={s.ratingBadge}><Ionicons name="star" size={11} color="#FFF" /><Text style={s.ratingText}>{item.rating?.toFixed(1)}</Text></View>
        </View>
        <Text style={s.services} numberOfLines={1}>{item.services?.join(' • ') || 'Beauty & Wellness'}</Text>
        <View style={s.metaRow}>
          {item.cashbackPercent > 0 && <Text style={s.cashback}>{item.cashbackPercent}% cashback</Text>}
          {item.distance != null && <Text style={s.dist}>{(item.distance / 1000).toFixed(1)} km</Text>}
          <Text style={s.price}>{item.priceRange || '₹₹'}</Text>
        </View>
      </View>
    </Pressable>
  ), [router]);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <View style={s.header}><Text style={s.brand}>✨ Glowzy</Text><Text style={s.tagline}>Glow up & earn</Text></View>
      <View style={s.filterRow}>{FILTERS.map(f => (
        <Pressable key={f} style={[s.chip, filter === f && s.chipActive]} onPress={() => setFilter(f)}><Text style={[s.chipText, filter === f && s.chipTextActive]}>{f}</Text></Pressable>
      ))}</View>
      {isLoading ? <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#EC4899" /> : (
        <FlatList data={filtered} keyExtractor={i => i._id} renderItem={renderSalon} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="sparkles-outline" size={48} color="#9CA3AF" /><Text style={s.emptyText}>No salons found nearby</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  brand: { fontSize: 24, fontWeight: '800', color: '#EC4899' },
  tagline: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FDF2F8' },
  chipActive: { backgroundColor: '#EC4899' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  chipTextActive: { color: '#FFF' },
  card: { backgroundColor: '#FFF', borderRadius: 14, marginBottom: 14, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 3 } }) },
  cardImage: { width: '100%', height: 130, backgroundColor: '#FDF2F8' },
  cardBody: { padding: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  salonName: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EC4899', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 2 },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  services: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  cashback: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  dist: { fontSize: 12, color: '#9CA3AF' },
  price: { fontSize: 12, color: '#9CA3AF' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
});
