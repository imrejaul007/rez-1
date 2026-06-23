// @ts-nocheck
/**
 * Corporate Bulk Orders
 * Company-level order history, bulk ordering, expense tracking.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import apiClient from '@/services/apiClient';

interface CorpOrder { _id: string; orderRef: string; items: number; totalAmount: number; status: string; placedBy: string; createdAt: string; }

const STATUS_COLORS: Record<string, string> = { pending: '#F59E0B', confirmed: '#3B82F6', completed: '#10B981', cancelled: '#EF4444' };

export default function CorporateOrdersPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [orders, setOrders] = useState<CorpOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try { setIsLoading(true);
      const res = await apiClient.get('/orders', { limit: 30 });
      setOrders(res.data?.orders || []);
    } catch {} finally { setIsLoading(false); }
  }, []);

  useEffect(() => { if (!authLoading && isAuthenticated) fetchOrders(); }, [isAuthenticated, authLoading, fetchOrders]);

  const renderOrder = useCallback(({ item }: { item: CorpOrder }) => (
    <Pressable style={s.card} onPress={() => router.push(`/orders/${item._id}` as any)}>
      <View style={s.cardTop}>
        <Text style={s.orderRef}>{item.orderRef}</Text>
        <View style={[s.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || '#6B7280') + '20' }]}>
          <Text style={[s.statusText, { color: STATUS_COLORS[item.status] || '#6B7280' }]}>{item.status}</Text>
        </View>
      </View>
      <View style={s.cardMeta}>
        <Text style={s.metaText}>{item.items} items</Text>
        <Text style={s.metaDot}>{'\u2022'}</Text>
        <Text style={s.metaText}>₹{item.totalAmount?.toLocaleString()}</Text>
        <Text style={s.metaDot}>{'\u2022'}</Text>
        <Text style={s.metaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      {item.placedBy && <Text style={s.placedBy}>by {item.placedBy}</Text>}
    </Pressable>
  ), [router]);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <FlatList data={orders} keyExtractor={i => i._id} renderItem={renderOrder}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListHeaderComponent={<Text style={s.title}>Corporate Orders</Text>}
        ListEmptyComponent={isLoading ? <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#7C3AED" /> : (
          <View style={s.empty}><Ionicons name="receipt-outline" size={48} color="#9CA3AF" /><Text style={s.emptyText}>No orders yet</Text></View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }) },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderRef: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 12, color: '#6B7280' },
  metaDot: { fontSize: 12, color: '#D1D5DB', marginHorizontal: 6 },
  placedBy: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
});
