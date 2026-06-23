/**
 * Book a Table Page
 * /MainCategory/food-dining/book-table
 * Table booking flow: select restaurant, date/time, party size
 * Fetches real availability from backend
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storesApi } from '@/services/storesApi';
import tableBookingApi from '@/services/tableBookingApi';
import { useAuthUser, useGetCurrencySymbol } from '@/stores/selectors';
import CountryCodePicker, { CountryCode, COUNTRY_CODES } from '@/components/common/CountryCodePicker';
import { platformAlertSimple } from '@/utils/platformAlert';
import SectionErrorBanner from '@/components/common/SectionErrorBanner';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  dark: colors.nileBlue,
  darkDeep: '#0f2638',
  gold: colors.warningScale[400],
  goldDark: colors.warningScale[400],
  green: colors.success,
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.offWhite,
  border: colors.neutral[200],
  unavailable: colors.neutral[200],
};

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];

interface TimeSlot {
  time: string;
  available: boolean;
  remainingCapacity: number;
}

function BookTablePage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ storeId?: string; storeName?: string }>();
  const user = useAuthUser();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const isMounted = useIsMounted();
  const [step, setStep] = useState<'restaurant' | 'details' | 'confirm'>(
    params.storeId ? 'details' : 'restaurant'
  );
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(!params.storeId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingNumber, setBookingNumber] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Availability
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Pre-fill from auth context
  const userFullName = user?.profile
    ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
    : '';
  const userPhone = user?.phoneNumber || '';

  // Booking form state
  const [selectedStore, setSelectedStore] = useState<any>(
    params.storeId ? { _id: params.storeId, name: params.storeName || '' } : null
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [customerName, setCustomerName] = useState(userFullName);
  const [customerPhone, setCustomerPhone] = useState(userPhone);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [specialRequests, setSpecialRequests] = useState('');

  // Filtered restaurants by search
  const filteredRestaurants = useMemo(() => {
    if (!searchQuery.trim()) return restaurants;
    const q = searchQuery.toLowerCase();
    return restaurants.filter((s: any) =>
      s.name?.toLowerCase().includes(q) ||
      s.location?.city?.toLowerCase().includes(q) ||
      s.tags?.some((t: string) => t.toLowerCase().includes(q))
    );
  }, [restaurants, searchQuery]);

  // Fetch dine-in restaurants
  const fetchRestaurants = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await storesApi.getStoresBySubcategorySlug('food-dining', 50);
      if (res.success && res.data) {
        const allStores = Array.isArray(res.data) ? res.data : (res.data.stores || []);
        const dineIn = allStores.filter((s: any) =>
          s.bookingType === 'RESTAURANT' ||
          s.bookingConfig?.enabled ||
          s.storeVisitConfig?.enabled
        );
        if (!isMounted()) return;
        setRestaurants(dineIn.length > 0 ? dineIn : allStores.slice(0, 20));
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load. Pull down to refresh.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!params.storeId) fetchRestaurants();
  }, [fetchRestaurants, params.storeId]);

  // Fetch availability when store or date changes
  const fetchAvailability = useCallback(async (storeId: string, date: Date) => {
    try {
      setIsLoadingAvailability(true);
      setTimeSlots([]);
      setSelectedTime('');
      const dateStr = date.toISOString().split('T')[0];
      const res = await tableBookingApi.checkAvailability(storeId, dateStr);
      if (res.success && res.data?.timeSlots) {
        const slots: TimeSlot[] = res.data.timeSlots.map((s: any) => ({
          time: s.time,
          available: s.available,
          remainingCapacity: s.remainingCapacity || 0,
        }));
        // Filter to reasonable dining hours (11:00 - 22:00)
        const diningSlots = slots.filter(s => {
          const hour = parseInt(s.time.split(':')[0]);
          return hour >= 11 && hour <= 22;
        });
        if (!isMounted()) return;
        setTimeSlots(diningSlots);
        // Auto-select first available slot
        const firstAvailable = diningSlots.find(s => s.available);
        if (firstAvailable) setSelectedTime(firstAvailable.time);
      }
    } catch (err) {
      // Fallback to default slots
      const fallback: TimeSlot[] = [
        '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
        '14:00', '18:00', '18:30', '19:00', '19:30',
        '20:00', '20:30', '21:00', '21:30',
      ].map(t => ({ time: t, available: true, remainingCapacity: 50 }));
      if (!isMounted()) return;
      setTimeSlots(fallback);
      setSelectedTime('19:00');
    } finally {
      if (!isMounted()) return;
      setIsLoadingAvailability(false);
    }
  }, []);

  useEffect(() => {
    if (step === 'details' && selectedStore?._id) {
      fetchAvailability(selectedStore._id, selectedDate);
    }
  }, [step, selectedStore?._id, selectedDate, fetchAvailability]);

  const handleSelectRestaurant = (store: any) => {
    setSelectedStore(store);
    setStep('details');
  };

  const getDateOptions = () => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const handleSubmit = async () => {
    if (!selectedStore?._id) {
      platformAlertSimple('Error', 'Please select a restaurant');
      return;
    }
    if (!selectedTime) {
      platformAlertSimple('Error', 'Please select a time slot');
      return;
    }
    if (!customerName.trim()) {
      platformAlertSimple('Error', 'Please enter your name');
      return;
    }
    const phoneRegex = /^\d{7,15}$/;
    if (!phoneRegex.test(customerPhone.trim())) {
      platformAlertSimple('Error', 'Please enter a valid phone number (digits only)');
      return;
    }

    // Check if selected slot is still available
    const slot = timeSlots.find(s => s.time === selectedTime);
    if (slot && !slot.available) {
      platformAlertSimple('Unavailable', 'This time slot is no longer available. Please select another.');
      return;
    }
    if (slot && slot.remainingCapacity < partySize) {
      platformAlertSimple(
        'Limited Capacity',
        `Only ${slot.remainingCapacity} seats available at this time. Please choose a different time or reduce party size.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      // Send date as YYYY-MM-DD using local date to avoid timezone offset issues
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      const bookingDateStr = `${y}-${m}-${d}`;
      const res = await tableBookingApi.createTableBooking({
        storeId: selectedStore._id,
        bookingDate: bookingDateStr,
        bookingTime: selectedTime,
        partySize,
        customerName: customerName.trim(),
        customerPhone: `${selectedCountry.dialCode}${customerPhone.trim()}`,
        specialRequests: specialRequests.trim().replace(/<[^>]*>/g, '').slice(0, 500) || undefined,
      });

      if (res.success) {
        if (!isMounted()) return;
        setBookingId(res.data?._id || null);
        setBookingNumber(res.data?.bookingNumber || null);
        setStep('confirm');
      } else {
        platformAlertSimple('Booking Failed', res.message || 'Could not create booking. Please try again.');
      }
    } catch (err: any) {
      platformAlertSimple('Error', err?.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setIsSubmitting(false);
    }
  };

  // Get cuisine tags string
  const getCuisineTags = (store: any): string => {
    if (store.tags?.length > 0) {
      const cuisine = store.tags
        .filter((t: string) => !['halal', 'pure-veg', 'veg', 'non-veg', 'jain'].includes(t.toLowerCase()))
        .slice(0, 3);
      if (cuisine.length) return cuisine.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(' · ');
    }
    return store.category?.name || 'Restaurant';
  };

  // ─────────── STEP 1: Restaurant Selection ───────────
  if (step === 'restaurant') {
    const renderStoreCard = ({ item: store }: { item: any }) => {
      const imageUri = store.banner?.[0] || store.logo;
      const rating = store.ratings?.average ? store.ratings.average.toFixed(1) : 'New';
      const reviewCount = store.ratings?.count || 0;
      const cashback = store.offers?.cashback || store.rewardRules?.baseCashbackPercent;
      const isHalal = store.tags?.some((t: string) => t.toLowerCase() === 'halal');

      return (
        <Pressable
          style={styles.storeCard}
          onPress={() => handleSelectRestaurant(store)}
         
          accessibilityLabel={`${store.name}, rated ${rating}`}
          accessibilityRole="button"
        >
          <View style={styles.storeImgWrap}>
            {imageUri ? (
              <CachedImage source={imageUri} style={styles.storeImg} contentFit="cover" />
            ) : (
              <View style={[styles.storeImg, styles.storeImgPlaceholder]}>
                <Ionicons name="restaurant" size={28} color={COLORS.textSecondary} />
              </View>
            )}
            {cashback ? (
              <View style={styles.storeCashbackBadge}>
                <Text style={styles.storeCashbackText}>{cashback}%</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.storeInfo}>
            <View style={styles.storeNameRow}>
              <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
              {isHalal && (
                <View style={styles.halalBadge}>
                  <Text style={styles.halalBadgeText}>Halal</Text>
                </View>
              )}
            </View>
            <Text style={styles.storeCuisine} numberOfLines={1}>{getCuisineTags(store)}</Text>
            <View style={styles.storeMetaRow}>
              <View style={styles.storeRating}>
                <Ionicons name="star" size={12} color={COLORS.goldDark} />
                <Text style={styles.storeRatingText}>{rating}</Text>
                <Text style={styles.storeReviewCount}>({reviewCount})</Text>
              </View>
              {store.location?.city && (
                <View style={styles.storeMetaItem}>
                  <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.storeMetaText}>{store.location.city}</Text>
                </View>
              )}
              {store.priceForTwo && (
                <Text style={styles.storeMetaText}>{currencySymbol}{store.priceForTwo} for 2</Text>
              )}
            </View>
          </View>
          <View style={styles.storeArrow}>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </View>
        </Pressable>
      );
    };

    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}
            accessibilityLabel="Go back" accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Book a Table</Text>
            <Text style={styles.headerSubtitle}>{restaurants.length} restaurants available</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search restaurants, cuisine..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.textSecondary}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} accessibilityLabel="Clear search" accessibilityRole="button">
                <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {error && <SectionErrorBanner message={error} onRetry={() => { setError(null); fetchRestaurants(); }} compact />}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.dark} />
            <Text style={styles.loadingText}>Finding restaurants...</Text>
          </View>
        ) : filteredRestaurants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matches found' : 'No restaurants available'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'Check back later for dine-in options'}
            </Text>
          </View>
        ) : (
          <FlashList
            data={filteredRestaurants}
            keyExtractor={(item) => item._id || item.id}
            renderItem={renderStoreCard}
            contentContainerStyle={styles.storeList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    );
  }

  // ─────────── STEP 3: Confirmation ───────────
  if (step === 'confirm') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.confirmContent} showsVerticalScrollIndicator={false}>
          {/* Success header with gradient background */}
          <LinearGradient
            colors={[COLORS.dark, '#0d3044']}
            style={styles.confirmHeroBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.confirmIconWrap}>
              <View style={styles.confirmIconRing}>
                <View style={styles.confirmIconInner}>
                  <Ionicons name="checkmark" size={36} color={COLORS.white} />
                </View>
              </View>
            </View>
            <Text style={styles.confirmTitle}>Table Reserved!</Text>
            <Text style={styles.confirmSubtitle}>
              Your reservation has been submitted successfully
            </Text>
            {bookingNumber && (
              <View style={styles.bookingIdWrap}>
                <Text style={styles.bookingIdLabel}>Booking Reference</Text>
                <View style={styles.bookingIdRow}>
                  <Text style={styles.bookingIdValue}>{bookingNumber}</Text>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        navigator.clipboard?.writeText(bookingNumber);
                      }
                    }}
                    style={styles.bookingIdCopy}
                    accessibilityLabel="Copy booking reference" accessibilityRole="button"
                  >
                    <Ionicons name="copy-outline" size={14} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                </View>
              </View>
            )}
          </LinearGradient>

          {/* Booking details card - overlaps the gradient */}
          <View style={styles.confirmCardOuter}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmRow}>
                <View style={[styles.confirmRowIcon, { backgroundColor: 'rgba(251,191,36,0.12)' }]}>
                  <Ionicons name="restaurant" size={18} color={COLORS.goldDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.confirmRowLabel}>Restaurant</Text>
                  <Text style={styles.confirmRowValue} numberOfLines={1}>{selectedStore?.name}</Text>
                </View>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmRow}>
                <View style={[styles.confirmRowIcon, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                  <Ionicons name="calendar" size={18} color={colors.infoScale[400]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.confirmRowLabel}>Date & Time</Text>
                  <Text style={styles.confirmRowValue}>{formatDate(selectedDate)} at {selectedTime}</Text>
                </View>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmRow}>
                <View style={[styles.confirmRowIcon, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                  <Ionicons name="people" size={18} color={colors.brand.purpleLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.confirmRowLabel}>Party Size</Text>
                  <Text style={styles.confirmRowValue}>
                    {partySize} {partySize === 1 ? 'guest' : 'guests'}
                  </Text>
                </View>
              </View>
              {customerName.trim() ? (
                <>
                  <View style={styles.confirmDivider} />
                  <View style={styles.confirmRow}>
                    <View style={[styles.confirmRowIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                      <Ionicons name="person" size={18} color={colors.successScale[400]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.confirmRowLabel}>Reserved For</Text>
                      <Text style={styles.confirmRowValue}>{customerName.trim()}</Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>

            {/* Coins note */}
            <View style={styles.confirmNote}>
              <LinearGradient
                colors={[colors.tint.amberLight, colors.tint.amber]}
                style={styles.confirmNoteGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.confirmNoteIconWrap}>
                  <Ionicons name="gift" size={16} color={COLORS.goldDark} />
                </View>
                <Text style={styles.confirmNoteText}>
                  The restaurant will confirm shortly. Earn bonus coins on check-in!
                </Text>
              </LinearGradient>
            </View>

            {/* Action buttons */}
            <Pressable
              style={styles.doneBtn}
              onPress={() => router.back()}
             
              accessibilityLabel="Back to dining" accessibilityRole="button"
            >
              <LinearGradient
                colors={[COLORS.dark, '#0d3044']}
                style={styles.doneBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="restaurant-outline" size={18} color={COLORS.white} />
                <Text style={styles.doneBtnText}>Back to Dining</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={styles.menuOrderBtn}
              onPress={() => router.push({
                pathname: '/menu/[storeId]',
                params: {
                  storeId: selectedStore?._id || '',
                  dineIn: 'true',
                  table: bookingNumber || '',
                },
              } as any)}
             
              accessibilityLabel="View menu and order" accessibilityRole="button"
            >
              <Ionicons name="restaurant-outline" size={16} color={COLORS.white} />
              <Text style={styles.menuOrderBtnText}>View Menu & Order</Text>
            </Pressable>

            <Pressable
              style={styles.viewBookingsBtn}
              onPress={() => router.push('/BookingsPage' as any)}
             
              accessibilityLabel="View all bookings" accessibilityRole="button"
            >
              <Ionicons name="list-outline" size={16} color={COLORS.dark} />
              <Text style={styles.viewBookingsBtnText}>View All Bookings</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────── STEP 2: Booking Details ───────────
  const availableCount = timeSlots.filter(s => s.available).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => params.storeId ? router.back() : setStep('restaurant')}
          style={styles.backBtn}
          accessibilityLabel="Go back" accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Reserve a Table</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {selectedStore?.name || 'Select details'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        {/* Store summary card */}
        {selectedStore?.name && (
          <View style={styles.storePreview}>
            <LinearGradient
              colors={[COLORS.dark, COLORS.darkDeep]}
              style={styles.storePreviewGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.storePreviewIcon}>
                <Ionicons name="restaurant" size={20} color={COLORS.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storePreviewName} numberOfLines={1}>
                  {selectedStore.name}
                </Text>
                <Text style={styles.storePreviewMeta}>
                  {selectedStore.location?.city || 'Dine-in available'}
                </Text>
              </View>
              <Pressable
                style={styles.viewMenuBtn}
                onPress={() => router.push({
                  pathname: '/menu/[storeId]',
                  params: { storeId: selectedStore._id, dineIn: 'true' },
                } as any)}
              >
                <Ionicons name="book-outline" size={14} color={COLORS.white} />
                <Text style={styles.viewMenuBtnText}>Menu</Text>
              </Pressable>
              {!params.storeId && (
                <Pressable onPress={() => setStep('restaurant')} style={{ marginLeft: 8 }}>
                  <Text style={styles.storePreviewChange}>Change</Text>
                </Pressable>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Date Selection */}
        <Text style={styles.formLabel}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          {getDateOptions().map((date, i) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = i === 0;
            return (
              <Pressable
                key={i}
                style={[styles.dateChip, isSelected && styles.dateChipActive]}
                onPress={() => setSelectedDate(date)}
                accessibilityLabel={`${isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}${isSelected ? ', selected' : ''}`}
                accessibilityRole="button"
              >
                <Text style={[styles.dateDay, isSelected && styles.dateDayActive]}>
                  {isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' })}
                </Text>
                <Text style={[styles.dateNum, isSelected && styles.dateNumActive]}>
                  {date.getDate()}
                </Text>
                <Text style={[styles.dateMonth, isSelected && styles.dateDayActive]}>
                  {date.toLocaleDateString(undefined, { month: 'short' })}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Time Selection */}
        <View style={styles.formLabelRow}>
          <Text style={styles.formLabel}>Select Time</Text>
          {isLoadingAvailability ? (
            <ActivityIndicator size="small" color={COLORS.dark} />
          ) : (
            <Text style={styles.availableLabel}>
              {availableCount} slots available
            </Text>
          )}
        </View>

        {isLoadingAvailability ? (
          <View style={styles.timeLoadingWrap}>
            <ActivityIndicator size="small" color={COLORS.dark} />
            <Text style={styles.timeLoadingText}>Checking availability...</Text>
          </View>
        ) : (
          <View style={styles.timeGrid}>
            {timeSlots.map(slot => {
              const isSelected = slot.time === selectedTime;
              const isUnavailable = !slot.available || slot.remainingCapacity < partySize;
              return (
                <Pressable
                  key={slot.time}
                  style={[
                    styles.timeChip,
                    isSelected && styles.timeChipActive,
                    isUnavailable && styles.timeChipUnavailable,
                  ]}
                  accessibilityLabel={`${slot.time}${isSelected ? ', selected' : ''}${isUnavailable ? ', unavailable' : ''}`}
                  accessibilityRole="button"
                  onPress={() => {
                    if (isUnavailable) {
                      platformAlertSimple(
                        'Unavailable',
                        !slot.available
                          ? 'This time slot is fully booked.'
                          : `Only ${slot.remainingCapacity} seats left at this time.`
                      );
                      return;
                    }
                    setSelectedTime(slot.time);
                  }}
                 
                >
                  <Text style={[
                    styles.timeText,
                    isSelected && styles.timeTextActive,
                    isUnavailable && styles.timeTextUnavailable,
                  ]}>
                    {slot.time}
                  </Text>
                  {isUnavailable && (
                    <Text style={styles.timeFullText}>Full</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Party Size */}
        <Text style={styles.formLabel}>Party Size</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.partyScroll}>
          {PARTY_SIZES.map(size => {
            const isSelected = size === partySize;
            return (
              <Pressable
                key={size}
                style={[styles.partyChip, isSelected && styles.partyChipActive]}
                onPress={() => setPartySize(size)}
                accessibilityLabel={`${size} ${size === 1 ? 'guest' : 'guests'}${isSelected ? ', selected' : ''}`}
                accessibilityRole="button"
              >
                <Ionicons
                  name="person"
                  size={14}
                  color={isSelected ? COLORS.white : COLORS.textSecondary}
                />
                <Text style={[styles.partyText, isSelected && styles.partyTextActive]}>
                  {size}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Customer Info */}
        <Text style={styles.formLabel}>Your Details</Text>
        <View style={styles.inputGroup}>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={customerName}
              onChangeText={setCustomerName}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={styles.inputDivider} />
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
            <CountryCodePicker
              selectedCountry={selectedCountry}
              onSelect={setSelectedCountry}
              style={styles.countryPicker}
            />
            <View style={styles.phoneDivider} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
        </View>

        <TextInput
          style={styles.inputMultiline}
          placeholder="Special requests (dietary, seating preference, occasion...)"
          value={specialRequests}
          onChangeText={setSpecialRequests}
          multiline
          numberOfLines={3}
          maxLength={500}
          placeholderTextColor={COLORS.textSecondary}
        />

        {/* Summary */}
        {selectedTime ? (
          <View style={styles.bookingSummary}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{formatDate(selectedDate)} at {selectedTime}</Text>
              <Text style={styles.summaryLabel}>{partySize} {partySize === 1 ? 'guest' : 'guests'}</Text>
            </View>
          </View>
        ) : null}

        {/* Submit */}
        <Pressable
          style={[
            styles.submitBtn,
            (isSubmitting || !selectedTime) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || !selectedTime}
         
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="calendar-outline" size={18} color={COLORS.white} />
              <Text style={styles.submitBtnText}>Confirm Reservation</Text>
            </>
          )}
        </Pressable>

        {/* Bonus note */}
        <View style={styles.bonusNote}>
          <View style={styles.bonusIconWrap}>
            <Ionicons name="wallet-outline" size={14} color={COLORS.goldDark} />
          </View>
          <Text style={styles.bonusText}>
            No pre-payment required. Earn bonus coins when you check in at the restaurant!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: COLORS.white },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  // Loading / Empty
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },

  // Restaurant list
  storeList: { padding: 16, paddingBottom: 100 },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    }),
  },
  storeImgWrap: { position: 'relative' },
  storeImg: { width: 64, height: 64, borderRadius: 14 },
  storeImgPlaceholder: { backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center' },
  storeCashbackBadge: {
    position: 'absolute', bottom: -4, right: -4,
    backgroundColor: COLORS.gold, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2,
  },
  storeCashbackText: { fontSize: 9, fontWeight: '700', color: COLORS.dark },
  storeInfo: { flex: 1 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storeName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  halalBadge: { backgroundColor: '#E0F2F1', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  halalBadgeText: { fontSize: 9, fontWeight: '600', color: '#00897B' },
  storeCuisine: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  storeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  storeRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  storeRatingText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  storeReviewCount: { fontSize: 11, color: COLORS.textSecondary },
  storeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  storeMetaText: { fontSize: 11, color: COLORS.textSecondary },
  storeArrow: { padding: 4 },

  // Store preview (details step)
  storePreview: { borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  storePreviewGradient: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  storePreviewIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(251,191,36,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  storePreviewName: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  storePreviewMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  storePreviewChange: { fontSize: 13, fontWeight: '600', color: COLORS.gold },

  // Form
  formContent: { padding: 16, paddingBottom: 100 },
  formLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12, marginTop: 20 },
  formLabelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, marginTop: 20,
  },
  availableLabel: { fontSize: 12, color: COLORS.green, fontWeight: '500' },

  // Date chips
  dateScroll: { marginBottom: 4 },
  dateChip: {
    width: 64, height: 78, borderRadius: 14, backgroundColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
    borderWidth: 1, borderColor: 'transparent',
  },
  dateChipActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  dateDay: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 2, fontWeight: '500' },
  dateDayActive: { color: 'rgba(255,255,255,0.7)' },
  dateNum: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  dateNumActive: { color: COLORS.white },
  dateMonth: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },

  // Time slots
  timeLoadingWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 16, backgroundColor: COLORS.white, borderRadius: 12,
  },
  timeLoadingText: { fontSize: 13, color: COLORS.textSecondary },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.white, minWidth: 70, alignItems: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  timeChipActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  timeChipUnavailable: { backgroundColor: colors.neutral[100], borderColor: colors.neutral[200] },
  timeText: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
  timeTextActive: { color: COLORS.white },
  timeTextUnavailable: { color: colors.neutral[300] },
  timeFullText: { fontSize: 9, color: colors.neutral[300], marginTop: 1, fontWeight: '500' },

  // Party size
  partyScroll: { marginBottom: 4 },
  partyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.white, marginRight: 8,
    borderWidth: 1, borderColor: 'transparent',
  },
  partyChipActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  partyText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  partyTextActive: { color: COLORS.white },

  // Inputs
  inputGroup: {
    backgroundColor: COLORS.white, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
    marginBottom: 12,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputIcon: { marginLeft: 14 },
  countryPicker: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  inputDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 46 },
  input: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 14,
    fontSize: 15, color: COLORS.textPrimary,
  },
  inputMultiline: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14,
    fontSize: 15, color: COLORS.textPrimary, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
    height: 80, textAlignVertical: 'top',
  },

  // Booking summary
  bookingSummary: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginTop: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  summaryTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  summaryLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.dark, borderRadius: 16, paddingVertical: 16, marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },

  bonusNote: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 14, padding: 14, backgroundColor: colors.tint.amber, borderRadius: 14,
  },
  bonusIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(251,191,36,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  bonusText: { flex: 1, fontSize: 12, color: colors.brand.amberDark, lineHeight: 17 },

  // Confirm
  confirmContent: { flexGrow: 1 },
  confirmHeroBg: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 60,
    paddingHorizontal: 32,
  },
  confirmIconWrap: { marginBottom: 20 },
  confirmIconRing: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: 'rgba(34,197,94,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  confirmIconInner: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: COLORS.green,
    justifyContent: 'center', alignItems: 'center',
  },
  confirmTitle: { fontSize: 26, fontWeight: '800', color: COLORS.white, marginBottom: 6 },
  confirmSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20 },
  bookingIdWrap: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 18, alignItems: 'center',
  },
  bookingIdLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 1, fontWeight: '600' },
  bookingIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookingIdValue: {
    fontSize: 14, fontWeight: '700', color: COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  bookingIdCopy: { padding: 4 },
  confirmCardOuter: {
    marginTop: -36,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  confirmCard: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
    }),
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 },
  confirmRowIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  confirmRowLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  confirmRowValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginTop: 2 },
  confirmDivider: { height: 1, backgroundColor: colors.neutral[100], marginVertical: 8, marginLeft: 54 },
  confirmNote: { marginTop: 16 },
  confirmNoteGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14,
  },
  confirmNoteIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(251,191,36,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  confirmNoteText: { flex: 1, fontSize: 13, color: colors.brand.amberDark, lineHeight: 18, fontWeight: '500' },
  doneBtn: {
    marginTop: 24, borderRadius: 16, overflow: 'hidden',
  },
  doneBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16,
  },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  viewMenuBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  viewMenuBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.white },
  menuOrderBtn: {
    marginTop: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
    borderRadius: 16, backgroundColor: colors.brand.purple,
  },
  menuOrderBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  viewBookingsBtn: {
    marginTop: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
    borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  viewBookingsBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
});

export default React.memo(BookTablePage);
