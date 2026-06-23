import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Travel Search Page
// Category-specific search with city inputs, date pickers, passenger selectors

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import travelApi, { TravelService } from '@/services/travelApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const CATEGORIES = [
  { slug: 'flights', label: 'Flights', icon: 'airplane' },
  { slug: 'hotels', label: 'Hotels', icon: 'bed' },
  { slug: 'trains', label: 'Trains', icon: 'train' },
  { slug: 'bus', label: 'Bus', icon: 'bus' },
  { slug: 'cab', label: 'Cab', icon: 'car' },
  { slug: 'packages', label: 'Packages', icon: 'briefcase' },
];

function TravelSearchPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const initialCategory = (params.category as string) || 'flights';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [travelClass, setTravelClass] = useState('Economy');
  const [results, setResults] = useState<TravelService[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    try {
      setLoading(true);
      setHasSearched(true);
      const response = await travelApi.getByCategory(selectedCategory, {
        page: 1,
        limit: 20,
        sortBy: 'rating',
      });
      if (response.success && response.data) {
        if (!isMounted()) return;
        setResults(response.data.services || []);
      } else {
        if (!isMounted()) return;
        setResults([]);
      }
    } catch (err) {
      if (!isMounted()) return;
      setResults([]);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [selectedCategory]);
  const isMounted = useIsMounted();

  const needsRoute = ['flights', 'trains', 'bus'].includes(selectedCategory);
  const needsCity = ['hotels', 'cab'].includes(selectedCategory);

  const getCategoryDetailRoute = (serviceId: string): string => {
    switch (selectedCategory) {
      case 'flights': return `/flight/${serviceId}`;
      case 'hotels': return `/hotel/${serviceId}`;
      case 'trains': return `/train/${serviceId}`;
      case 'bus': return `/bus/${serviceId}`;
      case 'cab': return `/cab/${serviceId}`;
      case 'packages': return `/package/${serviceId}`;
      default: return `/flight/${serviceId}`;
    }
  };

  const renderResultCard = ({ item }: { item: TravelService }) => (
    <Pressable
      style={styles.resultCard}
      onPress={() => router.push(getCategoryDetailRoute(item._id) as any)}
     
    >
      <View style={styles.resultCardContent}>
        <View style={{ flex: 1 }}>
          <Text style={styles.resultName} numberOfLines={2}>{item.name}</Text>
          {item.store?.name && (
            <Text style={styles.resultStore}>{item.store.name}</Text>
          )}
          <View style={styles.resultRating}>
            <Ionicons name="star" size={14} color={Colors.warning} />
            <Text style={styles.resultRatingText}>
              {item.ratings?.average?.toFixed(1) || '0.0'} ({item.ratings?.count || 0})
            </Text>
          </View>
        </View>
        <View style={styles.resultPriceSection}>
          {item.pricing?.original > item.pricing?.selling && (
            <Text style={styles.resultOriginalPrice}>
              {currencySymbol}{item.pricing.original.toLocaleString()}
            </Text>
          )}
          <Text style={styles.resultPrice}>
            {currencySymbol}{item.pricing?.selling?.toLocaleString()}
          </Text>
          {item.cashback?.isActive && (
            <View style={styles.cashbackBadge}>
              <Text style={styles.cashbackText}>{item.cashback.percentage}% back</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.nileBlue, '#0f2a3d']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Search Travel</Text>
            <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Find travel cashback deals from our partners</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Category Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryBar}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.slug}
              style={[
                styles.categoryChip,
                selectedCategory === cat.slug && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.slug)}
            >
              <Ionicons
                name={cat.icon as any}
                size={16}
                color={selectedCategory === cat.slug ? Colors.nileBlue : '#94A3B8'}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.slug && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Form */}
        <View style={styles.searchForm}>
          {/* From / To (flights, trains, bus) */}
          {needsRoute && (
            <>
              <View style={styles.inputRow}>
                <Ionicons name="location" size={18} color={Colors.success} />
                <TextInput
                  style={styles.input}
                  placeholder="From City"
                  placeholderTextColor="#94A3B8"
                  value={fromCity}
                  onChangeText={setFromCity}
                />
              </View>
              <View style={styles.inputRow}>
                <Ionicons name="location" size={18} color={Colors.error} />
                <TextInput
                  style={styles.input}
                  placeholder="To City"
                  placeholderTextColor="#94A3B8"
                  value={toCity}
                  onChangeText={setToCity}
                />
              </View>
            </>
          )}

          {/* City (hotels, cab) */}
          {needsCity && (
            <View style={styles.inputRow}>
              <Ionicons name="location" size={18} color={Colors.info} />
              <TextInput
                style={styles.input}
                placeholder={selectedCategory === 'hotels' ? 'City or Hotel Name' : 'Pickup City'}
                placeholderTextColor="#94A3B8"
                value={fromCity}
                onChangeText={setFromCity}
              />
            </View>
          )}

          {/* Packages - destination */}
          {selectedCategory === 'packages' && (
            <View style={styles.inputRow}>
              <Ionicons name="globe" size={18} color={Colors.brand.purpleLight} />
              <TextInput
                style={styles.input}
                placeholder="Destination"
                placeholderTextColor="#94A3B8"
                value={fromCity}
                onChangeText={setFromCity}
              />
            </View>
          )}

          {/* Date */}
          <View style={styles.inputRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.text.tertiary} />
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#94A3B8"
              value={date}
              onChangeText={setDate}
            />
          </View>

          {/* Passengers + Class (for flights/trains) */}
          {(selectedCategory === 'flights' || selectedCategory === 'trains') && (
            <View style={styles.rowFields}>
              <View style={[styles.inputRow, { flex: 1 }]}>
                <Ionicons name="people-outline" size={18} color={Colors.text.tertiary} />
                <View style={styles.stepper}>
                  <Pressable
                    onPress={() => setPassengers(Math.max(1, passengers - 1))}
                    style={styles.stepBtn}
                  >
                    <Ionicons name="remove" size={18} color={Colors.text.tertiary} />
                  </Pressable>
                  <Text style={styles.stepperValue}>{passengers}</Text>
                  <Pressable
                    onPress={() => setPassengers(Math.min(9, passengers + 1))}
                    style={styles.stepBtn}
                  >
                    <Ionicons name="add" size={18} color={Colors.text.tertiary} />
                  </Pressable>
                </View>
              </View>
              <View style={[styles.inputRow, { flex: 1 }]}>
                <Ionicons name="star-outline" size={18} color={Colors.text.tertiary} />
                <Pressable
                  onPress={() => {
                    const classes = ['Economy', 'Business', 'First'];
                    const idx = classes.indexOf(travelClass);
                    setTravelClass(classes[(idx + 1) % classes.length]);
                  }}
                  style={{ flex: 1 }}
                >
                  <Text style={styles.classText}>{travelClass}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Search Button */}
          <Pressable onPress={handleSearch} style={styles.searchBtn}>
            <LinearGradient
              colors={[Colors.nileBlue, '#0f2a3d']}
              style={styles.searchBtnGradient}
            >
              <Ionicons name="search" size={20} color={Colors.text.inverse} />
              <Text style={styles.searchBtnText}>Search</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Results */}
        {loading && (
          <CardGridSkeleton />
        )}

        {!loading && hasSearched && results.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search criteria</Text>
          </View>
        )}

        {!loading && results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              {results.length} Result{results.length !== 1 ? 's' : ''}
            </Text>
            {results.map((item) => (
              <View key={item._id}>{renderResultCard({ item })}</View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...Typography.h4, fontWeight: '700', color: Colors.text.inverse },
  categoryBar: { gap: Spacing.sm },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  categoryChipActive: { backgroundColor: Colors.background.primary },
  categoryChipText: { ...Typography.bodySmall, fontWeight: '600', color: '#94A3B8' },
  categoryChipTextActive: { color: Colors.nileBlue },

  content: { padding: Spacing.base, paddingBottom: 120 },

  searchForm: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: Spacing.md,
  },
  input: { flex: 1, ...Typography.body, color: '#1E293B' },
  rowFields: { flexDirection: 'row', gap: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  stepBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.border.default,
    justifyContent: 'center', alignItems: 'center',
  },
  stepperValue: { ...Typography.bodyLarge, fontWeight: '700', color: '#1E293B' },
  classText: { ...Typography.body, color: '#1E293B', fontWeight: '500' },

  searchBtn: { borderRadius: 14, overflow: 'hidden', marginTop: Spacing.xs },
  searchBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.base,
  },
  searchBtnText: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.inverse },

  loadingContainer: { alignItems: 'center', paddingTop: 40 },
  loadingText: { marginTop: Spacing.md, color: colors.slateGray, fontSize: 14 },

  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyText: { ...Typography.bodyLarge, fontWeight: '600', color: '#475569', marginTop: Spacing.md },
  emptySubtext: { ...Typography.body, color: '#94A3B8', marginTop: Spacing.xs },

  resultsSection: { marginTop: Spacing.lg },
  resultsTitle: { ...Typography.bodyLarge, fontWeight: '700', color: '#1E293B', marginBottom: Spacing.md },

  resultCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    padding: Spacing.base,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  resultCardContent: { flexDirection: 'row', justifyContent: 'space-between' },
  resultName: { ...Typography.body, fontWeight: '600', color: '#1E293B', marginBottom: Spacing.xs },
  resultStore: { ...Typography.bodySmall, color: colors.slateGray, marginBottom: 6 },
  resultRating: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  resultRatingText: { ...Typography.bodySmall, color: colors.slateGray },
  resultPriceSection: { alignItems: 'flex-end' },
  resultOriginalPrice: { ...Typography.bodySmall, color: '#94A3B8', textDecorationLine: 'line-through' },
  resultPrice: { ...Typography.h4, fontWeight: '700', color: Colors.nileBlue },
  cashbackBadge: {
    backgroundColor: colors.successScale[50],
    paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: 6,
    marginTop: Spacing.xs,
  },
  cashbackText: { ...Typography.caption, fontWeight: '600', color: Colors.success },
});

export default withErrorBoundary(TravelSearchPage, 'TravelSearch');
