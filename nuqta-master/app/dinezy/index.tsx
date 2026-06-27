// @ts-nocheck
/**
 * Dinezy — Restaurant Discovery + Table Booking + Food Ordering
 * Wasil vertical app: branded restaurant experience using REZ wallet + coins.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CachedImage from '@/components/ui/CachedImage';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import { BRAND } from '@/constants/brand';

interface Restaurant { _id: string; name: string; logo?: string; coverImage?: string; category: string; rating: number; reviewCount: number; cashbackPercent: number; distance?: number; priceRange: string; cuisines: string[]; isOpen: boolean; }

const FILTERS = ['All', 'Near Me', 'Top Rated', 'Offers'] as const;

export default function DinezyHomePage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const fetchRestaurants = useCallback(async () => {
    try { setIsLoading(true);
      const res = await apiClient.get('/stores', { category: 'food-dining', limit: 30, sortBy: activeFilter === 'Top Rated' ? 'rating' : 'distance' });
      setRestaurants(res.data?.stores || []);
    } catch {} finally { setIsLoading(false); }
  }, [activeFilter]);

  useEffect(() => { if (!authLoading && isAuthenticated) fetchRestaurants(); }, [isAuthenticated, authLoading, fetchRestaurants]);

  const renderRestaurant = useCallback(({ item }: { item: Restaurant }) => (
    <Pressable style={s.card} onPress={() => router.push(`/store/${item._id}`)}>
      <CachedImage source={{ uri: item.coverImage || item.logo }} style={s.cardImage} contentFit="cover" />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={s.storeName} numberOfLines={1}>{item.name}</Text>
          <View style={s.ratingBadge}>
            <Ionicons name="star" size={12} color="#FFF" />
            <Text style={s.ratingText}>{item.rating?.toFixed(1)}</Text>
          </View>
        </View>
        <Text style={s.cuisines} numberOfLines={1}>{item.cuisines?.join(' • ') || item.category}</Text>
        <View style={s.metaRow}>
          {item.cashbackPercent > 0 && <Text style={s.cashback}>{item.cashbackPercent}% cashback</Text>}
          {item.distance != null && <Text style={s.distance}>{(item.distance / 1000).toFixed(1)} km</Text>}
          <Text style={s.price}>{item.priceRange || '₹₹'}</Text>
        </View>
      </View>
      {!item.isOpen && <View style={s.closedOverlay}><Text style={s.closedText}>Closed</Text></View>}
    </Pressable>
  ), [router]);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <View style={s.header}>
        <Text style={s.brand}>🍽️ Dinezy</Text>
        <Text style={s.tagline}>Discover, dine & earn</Text>
      </View>
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <Pressable key={f} style={[s.filterChip, activeFilter === f && s.filterActive]} onPress={() => setActiveFilter(f)}>
            <Text style={[s.filterText, activeFilter === f && s.filterTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>
      {isLoading ? <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#EF4444" /> : (
        <FlatList data={restaurants} keyExtractor={i => i._id} renderItem={renderRestaurant}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="restaurant-outline" size={48} color="#9CA3AF" /><Text style={s.emptyText}>No restaurants found nearby</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  brand: { fontSize: 24, fontWeight: '800', color: '#EF4444' },
  tagline: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6' },
  filterActive: { backgroundColor: '#EF4444' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFF' },
  card: { backgroundColor: '#FFF', borderRadius: 14, marginBottom: 14, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 3 } }) },
  cardImage: { width: '100%', height: 140, backgroundColor: '#F3F4F6' },
  cardBody: { padding: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storeName: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 2 },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  cuisines: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 6, alignItems: 'center' },
  cashback: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  distance: { fontSize: 12, color: '#9CA3AF' },
  price: { fontSize: 12, color: '#9CA3AF' },
  closedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  closedText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
});
