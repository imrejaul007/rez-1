// @ts-nocheck
/**
 * Student Zone
 *
 * Verified students get extra cashback at food, entertainment, shopping.
 * Verification via college ID → auto-verify via VerifiedInstitution model.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
  RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CachedImage from '@/components/ui/CachedImage';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import { BRAND } from '@/constants/brand';

interface StudentDeal {
  _id: string;
  title: string;
  description: string;
  storeName: string;
  storeLogo?: string;
  storeId: string;
  discountPercent: number;
  category: string;
  validTo: string;
}

export default function StudentZonePage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const [isVerified, setIsVerified] = useState(false);
  const [deals, setDeals] = useState<StudentDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [profileRes, dealsRes] = await Promise.all([
        apiClient.get('/user/profile'),
        apiClient.get('/offers', { segment: 'student', limit: 30 }),
      ]);
      setIsVerified(profileRes.data?.profile?.isStudentVerified || profileRes.data?.isStudentVerified || false);
      setDeals(dealsRes.data?.offers || dealsRes.data?.deals || []);
    } catch { /* fail silently */ }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchData();
  }, [isAuthenticated, authLoading, fetchData]);

  const renderDeal = useCallback(({ item }: { item: StudentDeal }) => (
    <Pressable style={styles.dealCard} onPress={() => router.push(`/store/${item.storeId}`)}>
      <View style={styles.dealRow}>
        {item.storeLogo ? (
          <CachedImage source={{ uri: item.storeLogo }} style={styles.dealLogo} contentFit="cover" />
        ) : (
          <View style={[styles.dealLogo, { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="storefront-outline" size={18} color="#9CA3AF" />
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.dealTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.dealStore}>{item.storeName}</Text>
        </View>
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{item.discountPercent}% OFF</Text>
        </View>
      </View>
    </Pressable>
  ), [router]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={deals}
        keyExtractor={item => item._id}
        renderItem={renderDeal}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchData(); }} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.pageTitle}>Student Zone</Text>
            {!isVerified ? (
              <Pressable style={styles.verifyBanner} onPress={() => router.push('/onboarding/student-verify')}>
                <Ionicons name="school-outline" size={24} color="#7C3AED" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.verifyTitle}>Verify Your Student ID</Text>
                  <Text style={styles.verifyText}>Get extra 10% cashback at food, entertainment & shopping</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
              </Pressable>
            ) : (
              <View style={styles.verifiedBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.verifiedText}>Student Verified — Exclusive deals unlocked!</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#7C3AED" /> : (
            <View style={styles.empty}>
              <Ionicons name="school-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No student deals right now</Text>
              <Text style={styles.emptyText}>Check back soon for exclusive student offers</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12 },
  verifyBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E8FF', borderRadius: 14, padding: 16, marginBottom: 16,
  },
  verifyTitle: { fontSize: 15, fontWeight: '700', color: '#7C3AED' },
  verifyText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  verifiedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', borderRadius: 10, padding: 12, marginBottom: 16 },
  verifiedText: { fontSize: 13, fontWeight: '600', color: '#065F46' },
  dealCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }),
  },
  dealRow: { flexDirection: 'row', alignItems: 'center' },
  dealLogo: { width: 44, height: 44, borderRadius: 10 },
  dealTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  dealStore: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  discountBadge: { backgroundColor: '#7C3AED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  discountText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 16 },
  emptyText: { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
});
