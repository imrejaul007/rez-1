// @ts-nocheck
/**
 * Generic Experiences Page
 * For categories that don't have a custom experiences page
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { experiencesApi, StoreExperience } from '@/services/experiencesApi';
import { getCategoryTheme } from '@/config/categoryThemeConfig';
import { getCategoryConfig } from '@/config/categoryConfig';
import SectionErrorBanner from '@/components/common/SectionErrorBanner';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function GenericExperiencesIndex() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = getCategoryTheme(slug || '');
  const categoryConfig = getCategoryConfig(slug || '');
  const categoryName = categoryConfig?.name || theme.name;

  const [experiences, setExperiences] = useState<StoreExperience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  const fetchExperiences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await experiencesApi.getExperiences({ category: slug, limit: 50 });
      if (res.success && res.data?.experiences) {
        if (!isMounted()) return;
        setExperiences(res.data.experiences);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load experiences. Pull down to refresh.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchExperiences(); }, [fetchExperiences]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchExperiences();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const renderExperience = ({ item }: { item: StoreExperience }) => (
    <Pressable
      style={styles.expCard}
      onPress={() => {
        const eid = item._id || item.slug;
        if (eid) router.push(`/MainCategory/${slug}/experiences/${eid}` as any);
      }}
    >
      <LinearGradient
        colors={(item.backgroundColor && /^#[0-9A-Fa-f]{6}$/.test(item.backgroundColor)
          ? [item.backgroundColor, item.backgroundColor + '80']
          : [theme.primaryColorLight + '30', theme.primaryColorLight + '15']) as any}
        style={styles.expGradient}
      >
        <View style={styles.expHeader}>
          <Text style={styles.expIcon}>{item.icon || '\uD83C\uDF1F'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.expTitle}>{item.title}</Text>
            {item.subtitle && <Text style={styles.expSubtitle} numberOfLines={2}>{item.subtitle}</Text>}
          </View>
          {item.badge && (
            <View style={[styles.expBadge, { backgroundColor: item.badgeBg || theme.primaryColor }]}>
              <Text style={[styles.expBadgeText, { color: item.badgeColor || colors.background.primary }]}>{item.badge}</Text>
            </View>
          )}
        </View>

        <View style={styles.expMeta}>
          {item.storeCount ? (
            <View style={styles.metaItem}>
              <Ionicons name="storefront-outline" size={14} color={colors.neutral[500]} />
              <Text style={styles.metaText}>{item.storeCount} stores</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={colors.neutral[500]} />
        </View>

        {item.benefits && item.benefits.length > 0 && (
          <View style={styles.benefitsRow}>
            {item.benefits.slice(0, 3).map((b, i) => (
              <View key={i} style={styles.benefitChip}>
                <Ionicons name="checkmark" size={12} color={colors.success} />
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.neutral[900]} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{categoryName} Experiences</Text>
          <Text style={styles.headerSubtitle}>{experiences.length} experiences</Text>
        </View>
      </View>

      {error && <SectionErrorBanner message={error} onRetry={() => { setError(null); fetchExperiences(); }} compact />}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
          <Text style={styles.loadingText}>Loading experiences...</Text>
        </View>
      ) : (
        <FlashList
          data={experiences}
          keyExtractor={(item, i) => item._id || item.slug || `exp-${i}`}
          renderItem={renderExperience}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primaryColor]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name={(theme.defaultMissionIcon || 'sparkles-outline') as any} size={48} color={colors.neutral[500]} />
              <Text style={styles.emptyTitle}>No experiences available</Text>
              <Text style={styles.emptySubtitle}>{categoryName} experiences will appear here soon</Text>
            </View>
          }
          estimatedItemSize={150}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.tint.warmGray },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.background.primary, borderBottomWidth: 1, borderBottomColor: colors.neutral[200], gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.neutral[900] },
  headerSubtitle: { fontSize: 12, color: colors.neutral[500] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.neutral[500] },
  list: { padding: 16, paddingBottom: 120 },
  expCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  expGradient: { padding: 16 },
  expHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  expIcon: { fontSize: 36 },
  expTitle: { fontSize: 17, fontWeight: '600', color: colors.neutral[900], marginBottom: 2 },
  expSubtitle: { fontSize: 13, color: colors.neutral[500] },
  expBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  expBadgeText: { fontSize: 10, fontWeight: '700' },
  expMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: colors.neutral[500] },
  benefitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  benefitChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successScale[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  benefitText: { fontSize: 11, color: '#166534' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.neutral[900], marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: colors.neutral[500], marginTop: 4 },
});

export default React.memo(GenericExperiencesIndex);
