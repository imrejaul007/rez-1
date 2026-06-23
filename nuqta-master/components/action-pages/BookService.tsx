// @ts-nocheck
/**
 * Book a Service Page
 * /MainCategory/home-services/book-service
 * Booking flow: Select Service Type -> Choose Provider -> Pick Date/Time -> Enter Address -> Describe Issue -> Confirm
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
import { platformAlertSimple } from '@/utils/platformAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import serviceAppointmentApi from '@/services/serviceAppointmentApi';
import { storesApi } from '@/services/storesApi';
import { useAuthUser } from '@/stores/selectors';
import CountryCodePicker, { CountryCode, COUNTRY_CODES } from '@/components/common/CountryCodePicker';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  amber: colors.warningScale[400],
  amberDark: colors.warningScale[700],
  amberLight: colors.tint.amber,
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

const SERVICE_TYPES = [
  { id: 'plumbing', label: 'Plumbing', icon: '🔧', duration: '1-2 hrs' },
  { id: 'electrical', label: 'Electrical', icon: '⚡', duration: '1-2 hrs' },
  { id: 'cleaning', label: 'Cleaning', icon: '🧹', duration: '3-4 hrs' },
  { id: 'ac-repair', label: 'AC Repair', icon: '❄️', duration: '1 hr' },
  { id: 'pest-control', label: 'Pest Control', icon: '🪲', duration: '2-3 hrs' },
  { id: 'painting', label: 'Painting', icon: '🎨', duration: '1-2 days' },
  { id: 'carpentry', label: 'Carpentry', icon: '🪚', duration: '2-3 hrs' },
];

interface TimeSlot {
  time: string;
  available: boolean;
  remainingCapacity: number;
}

function BookServicePage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ storeId?: string; storeName?: string; service?: string }>();
  const user = useAuthUser();

  const isMounted = useIsMounted();
  const [step, setStep] = useState<'provider' | 'details' | 'confirm'>(
    params.storeId ? 'details' : 'provider'
  );
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(!params.storeId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingNumber, setBookingNumber] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  const userFullName = user?.profile
    ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
    : '';
  const userPhone = user?.phoneNumber || '';

  const [selectedStore, setSelectedStore] = useState<any>(
    params.storeId ? { _id: params.storeId, name: params.storeName || '' } : null
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedService, setSelectedService] = useState(params.service || '');
  const [customerName, setCustomerName] = useState(userFullName);
  const [customerPhone, setCustomerPhone] = useState(userPhone);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [serviceAddress, setServiceAddress] = useState('');
  const [issueDescription, setIssueDescription] = useState('');

  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return providers;
    const q = searchQuery.toLowerCase();
    return providers.filter((s: any) =>
      s.name?.toLowerCase().includes(q) ||
      s.location?.city?.toLowerCase().includes(q) ||
      s.tags?.some((t: string) => t.toLowerCase().includes(q))
    );
  }, [providers, searchQuery]);

  const fetchProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await storesApi.getStoresBySubcategorySlug('home-services', 50);
      if (res.success && res.data) {
        const allStores = Array.isArray(res.data) ? res.data : (res.data.stores || []);
        const bookable = allStores.filter((s: any) =>
          s.bookingType === 'SERVICE' ||
          s.bookingType === 'CONSULTATION' ||
          s.bookingConfig?.enabled ||
          s.storeVisitConfig?.enabled
        );
        if (!isMounted()) return;
        setProviders(bookable.length > 0 ? bookable : allStores.slice(0, 20));
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!params.storeId) fetchProviders();
  }, [fetchProviders, params.storeId]);

  const fetchAvailability = useCallback(async (storeId: string, date: Date) => {
    try {
      setIsLoadingAvailability(true);
      setTimeSlots([]);
      setSelectedTime('');
      const dateStr = date.toISOString().split('T')[0];
      const res = await serviceAppointmentApi.checkAvailability(storeId, dateStr);
      if (res.success && res.data?.slots) {
        const slots: TimeSlot[] = res.data.slots.map((s: any) => ({
          time: s.time,
          available: s.available,
          remainingCapacity: s.staffAvailable || 10,
        }));
        const serviceSlots = slots.filter(s => {
          const hour = parseInt(s.time.split(':')[0]);
          return hour >= 7 && hour <= 20;
        });
        if (!isMounted()) return;
        setTimeSlots(serviceSlots);
        const firstAvailable = serviceSlots.find(s => s.available);
        if (firstAvailable) setSelectedTime(firstAvailable.time);
      }
    } catch (err) {
      const fallback: TimeSlot[] = [
        '07:00', '08:00', '09:00', '10:00', '11:00',
        '12:00', '13:00', '14:00', '15:00', '16:00',
        '17:00', '18:00', '19:00',
      ].map(t => ({ time: t, available: true, remainingCapacity: 10 }));
      if (!isMounted()) return;
      setTimeSlots(fallback);
      setSelectedTime('09:00');
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

  const handleSelectProvider = (store: any) => {
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
    if (!selectedStore?._id) { platformAlertSimple('Error', 'Please select a service provider'); return; }
    if (!selectedService) { platformAlertSimple('Error', 'Please select a service type'); return; }
    if (!selectedTime) { platformAlertSimple('Error', 'Please select a time slot'); return; }
    if (!customerName.trim()) { platformAlertSimple('Error', 'Please enter your name'); return; }
    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      platformAlertSimple('Error', 'Please enter a valid phone number'); return;
    }

    try {
      setIsSubmitting(true);
      const bookingDateStr = selectedDate.toISOString().split('T')[0];
      const res = await serviceAppointmentApi.createServiceAppointment({
        storeId: selectedStore._id,
        serviceType: selectedService,
        appointmentDate: bookingDateStr,
        appointmentTime: selectedTime,
        duration: 60,
        customerName: customerName.trim(),
        customerPhone: `${selectedCountry.dialCode}${customerPhone.trim()}`,
        specialInstructions: [serviceAddress.trim() ? `Address: ${serviceAddress.trim()}` : '', issueDescription.trim() ? `Issue: ${issueDescription.trim()}` : ''].filter(Boolean).join('. ') || undefined,
      });

      if (res.success) {
        if (!isMounted()) return;
        setBookingId(res.data?.id || res.data?._id || null);
        setBookingNumber(res.data?.appointmentNumber || res.data?.bookingNumber || null);
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

  const getServiceTags = (store: any): string => {
    if (store.tags?.length > 0) {
      const tags = store.tags
        .filter((t: string) => !['premium', 'budget', 'same-day', 'urgent', 'emergency'].includes(t.toLowerCase()))
        .slice(0, 3);
      if (tags.length) return tags.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(' \u00B7 ');
    }
    return store.category?.name || 'Home Services';
  };

  // STEP 1: Provider Selection
  if (step === 'provider') {
    const renderStoreCard = ({ item: store }: { item: any }) => {
      const imageUri = store.banner?.[0] || store.logo;
      const rating = store.ratings?.average?.toFixed(1) || '4.5';
      const reviewCount = store.ratings?.count || 0;
      const cashback = store.offers?.cashback || store.rewardRules?.baseCashbackPercent;
      const isVerified = store.isVerified;

      return (
        <Pressable style={styles.storeCard} onPress={() => handleSelectProvider(store)}>
          <View style={styles.storeImgWrap}>
            {imageUri ? (
              <CachedImage source={imageUri} style={styles.storeImg} contentFit="cover" />
            ) : (
              <View style={[styles.storeImg, styles.storeImgPlaceholder]}>
                <Ionicons name="construct" size={28} color={COLORS.textSecondary} />
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
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
              )}
            </View>
            <Text style={styles.storeCuisine} numberOfLines={1}>{getServiceTags(store)}</Text>
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
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Book a Service</Text>
            <Text style={styles.headerSubtitle}>{providers.length} service providers available</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search service providers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.textSecondary}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.amber} />
            <Text style={styles.loadingText}>Finding service providers...</Text>
          </View>
        ) : filteredProviders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="construct-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyTitle}>{searchQuery ? 'No matches found' : 'No providers available'}</Text>
            <Text style={styles.emptySubtitle}>{searchQuery ? 'Try a different search term' : 'Check back later for booking options'}</Text>
          </View>
        ) : (
          <FlashList
            data={filteredProviders}
            keyExtractor={(item) => item._id || item.id}
            renderItem={renderStoreCard}
            contentContainerStyle={styles.storeList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    );
  }

  // STEP 3: Confirmation
  if (step === 'confirm') {
    const serviceName = SERVICE_TYPES.find(s => s.id === selectedService)?.label || selectedService;
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.confirmContent}>
          <View style={styles.confirmIconWrap}>
            <LinearGradient colors={[COLORS.amberLight, colors.tint.amberLight]} style={styles.confirmIconGradient}>
              <Ionicons name="checkmark-circle" size={64} color={COLORS.amber} />
            </LinearGradient>
          </View>
          <Text style={styles.confirmTitle}>Service Booked!</Text>
          <Text style={styles.confirmSubtitle}>Your service has been scheduled</Text>
          {bookingNumber && (
            <View style={styles.bookingIdWrap}>
              <Text style={styles.bookingIdLabel}>Booking Reference</Text>
              <Text style={styles.bookingIdValue}>{bookingNumber}</Text>
            </View>
          )}

          <View style={styles.confirmCard}>
            <View style={styles.confirmRow}>
              <View style={[styles.confirmRowIcon, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                <Ionicons name="construct" size={16} color={COLORS.amber} />
              </View>
              <View>
                <Text style={styles.confirmRowLabel}>Service Provider</Text>
                <Text style={styles.confirmRowValue}>{selectedStore?.name}</Text>
              </View>
            </View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmRow}>
              <View style={[styles.confirmRowIcon, { backgroundColor: 'rgba(139,92,246,0.1)' }]}>
                <Ionicons name="build" size={16} color={colors.brand.purpleLight} />
              </View>
              <View>
                <Text style={styles.confirmRowLabel}>Service Type</Text>
                <Text style={styles.confirmRowValue}>{serviceName}</Text>
              </View>
            </View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmRow}>
              <View style={[styles.confirmRowIcon, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                <Ionicons name="calendar" size={16} color={colors.infoScale[400]} />
              </View>
              <View>
                <Text style={styles.confirmRowLabel}>Date & Time</Text>
                <Text style={styles.confirmRowValue}>{formatDate(selectedDate)} at {selectedTime}</Text>
              </View>
            </View>
            {serviceAddress.trim() && (
              <>
                <View style={styles.confirmDivider} />
                <View style={styles.confirmRow}>
                  <View style={[styles.confirmRowIcon, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                    <Ionicons name="location" size={16} color={colors.success} />
                  </View>
                  <View>
                    <Text style={styles.confirmRowLabel}>Address</Text>
                    <Text style={styles.confirmRowValue}>{serviceAddress}</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          <View style={styles.confirmNote}>
            <Ionicons name="information-circle" size={16} color={COLORS.amber} />
            <Text style={styles.confirmNoteText}>
              The service provider will contact you to confirm the visit. Earn bonus coins on completion!
            </Text>
          </View>

          <Pressable style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Back to Home Services</Text>
          </Pressable>

          <Pressable style={styles.viewBookingsBtn} onPress={() => router.push('/orders' as any)}>
            <Text style={styles.viewBookingsBtnText}>View My Bookings</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // STEP 2: Booking Details
  const availableCount = timeSlots.filter(s => s.available).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => params.storeId ? router.back() : setStep('provider')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Book Service</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{selectedStore?.name || 'Select details'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        {selectedStore?.name && (
          <View style={styles.storePreview}>
            <LinearGradient colors={[COLORS.amber, COLORS.amberDark]} style={styles.storePreviewGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.storePreviewIcon}>
                <Ionicons name="construct" size={20} color={COLORS.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storePreviewName} numberOfLines={1}>{selectedStore.name}</Text>
                <Text style={styles.storePreviewMeta}>{selectedStore.location?.city || 'Home services available'}</Text>
              </View>
              {!params.storeId && (
                <Pressable onPress={() => setStep('provider')}>
                  <Text style={styles.storePreviewChange}>Change</Text>
                </Pressable>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Service Type Selection */}
        <Text style={styles.formLabel}>Select Service Type</Text>
        <View style={styles.serviceGrid}>
          {SERVICE_TYPES.map(service => {
            const isSelected = selectedService === service.id;
            return (
              <Pressable
                key={service.id}
                style={[styles.serviceChip, isSelected && styles.serviceChipActive]}
                onPress={() => setSelectedService(service.id)}
              >
                <Text style={styles.serviceEmoji}>{service.icon}</Text>
                <Text style={[styles.serviceLabel, isSelected && styles.serviceLabelActive]}>{service.label}</Text>
                <Text style={[styles.serviceDuration, isSelected && styles.serviceDurationActive]}>{service.duration}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Date Selection */}
        <Text style={styles.formLabel}>Pick Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          {getDateOptions().map((date, i) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = i === 0;
            return (
              <Pressable key={i} style={[styles.dateChip, isSelected && styles.dateChipActive]} onPress={() => setSelectedDate(date)}>
                <Text style={[styles.dateDay, isSelected && styles.dateDayActive]}>
                  {isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' })}
                </Text>
                <Text style={[styles.dateNum, isSelected && styles.dateNumActive]}>{date.getDate()}</Text>
                <Text style={[styles.dateMonth, isSelected && styles.dateDayActive]}>
                  {date.toLocaleDateString(undefined, { month: 'short' })}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Time Selection */}
        <View style={styles.formLabelRow}>
          <Text style={styles.formLabel}>Pick Time</Text>
          {isLoadingAvailability ? (
            <ActivityIndicator size="small" color={COLORS.amber} />
          ) : (
            <Text style={styles.availableLabel}>{availableCount} slots available</Text>
          )}
        </View>

        {isLoadingAvailability ? (
          <View style={styles.timeLoadingWrap}>
            <ActivityIndicator size="small" color={COLORS.amber} />
            <Text style={styles.timeLoadingText}>Checking availability...</Text>
          </View>
        ) : (
          <View style={styles.timeGrid}>
            {timeSlots.map(slot => {
              const isSelected = slot.time === selectedTime;
              const isUnavailable = !slot.available;
              return (
                <Pressable
                  key={slot.time}
                  style={[styles.timeChip, isSelected && styles.timeChipActive, isUnavailable && styles.timeChipUnavailable]}
                  onPress={() => {
                    if (isUnavailable) { platformAlertSimple('Unavailable', 'This time slot is fully booked.'); return; }
                    setSelectedTime(slot.time);
                  }}
                 
                >
                  <Text style={[styles.timeText, isSelected && styles.timeTextActive, isUnavailable && styles.timeTextUnavailable]}>{slot.time}</Text>
                  {isUnavailable && <Text style={styles.timeFullText}>Full</Text>}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Service Address */}
        <Text style={styles.formLabel}>Service Address</Text>
        <TextInput
          style={styles.inputMultiline}
          placeholder="Enter your full address for the service visit..."
          value={serviceAddress}
          onChangeText={setServiceAddress}
          multiline
          numberOfLines={2}
          placeholderTextColor={COLORS.textSecondary}
        />

        {/* Issue Description */}
        <Text style={styles.formLabel}>Describe the Issue</Text>
        <TextInput
          style={styles.inputMultiline}
          placeholder="Describe what needs to be fixed or serviced..."
          value={issueDescription}
          onChangeText={setIssueDescription}
          multiline
          numberOfLines={3}
          placeholderTextColor={COLORS.textSecondary}
        />

        {/* Customer Info */}
        <Text style={styles.formLabel}>Your Details</Text>
        <View style={styles.inputGroup}>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Full Name" value={customerName} onChangeText={setCustomerName} placeholderTextColor={COLORS.textSecondary} />
          </View>
          <View style={styles.inputDivider} />
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
            <CountryCodePicker selectedCountry={selectedCountry} onSelect={setSelectedCountry} style={styles.countryPicker} />
            <View style={styles.phoneDivider} />
            <TextInput style={styles.input} placeholder="Phone Number" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" placeholderTextColor={COLORS.textSecondary} />
          </View>
        </View>

        {selectedTime && selectedService ? (
          <View style={styles.bookingSummary}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {SERVICE_TYPES.find(s => s.id === selectedService)?.label} \u00B7 {formatDate(selectedDate)} at {selectedTime}
              </Text>
            </View>
          </View>
        ) : null}

        <Pressable
          style={[styles.submitBtn, (isSubmitting || !selectedTime || !selectedService) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || !selectedTime || !selectedService}
         
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="calendar-outline" size={18} color={COLORS.white} />
              <Text style={styles.submitBtnText}>Confirm Service</Text>
            </>
          )}
        </Pressable>

        <View style={styles.bonusNote}>
          <View style={styles.bonusIconWrap}>
            <Ionicons name="wallet-outline" size={14} color={COLORS.amber} />
          </View>
          <Text style={styles.bonusText}>
            No pre-payment required. Earn bonus coins when the service is completed!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: COLORS.white },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  storeList: { padding: 16, paddingBottom: 100 },
  storeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 10,
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
    backgroundColor: COLORS.amber, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2,
  },
  storeCashbackText: { fontSize: 9, fontWeight: '700', color: COLORS.white },
  storeInfo: { flex: 1 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storeName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  verifiedBadge: { backgroundColor: COLORS.amberLight, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  verifiedBadgeText: { fontSize: 9, fontWeight: '600', color: COLORS.amber },
  storeCuisine: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  storeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  storeRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  storeRatingText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  storeReviewCount: { fontSize: 11, color: COLORS.textSecondary },
  storeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  storeMetaText: { fontSize: 11, color: COLORS.textSecondary },
  storeArrow: { padding: 4 },
  storePreview: { borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  storePreviewGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  storePreviewIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  storePreviewName: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  storePreviewMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  storePreviewChange: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  formContent: { padding: 16, paddingBottom: 100 },
  formLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12, marginTop: 20 },
  formLabelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, marginTop: 20,
  },
  availableLabel: { fontSize: 12, color: COLORS.green, fontWeight: '500' },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: {
    width: '48%', flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  serviceChipActive: { backgroundColor: COLORS.amberLight, borderColor: COLORS.amber },
  serviceEmoji: { fontSize: 20 },
  serviceLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary, flex: 1 },
  serviceLabelActive: { color: COLORS.amberDark, fontWeight: '600' },
  serviceDuration: { fontSize: 10, color: COLORS.textSecondary },
  serviceDurationActive: { color: COLORS.amber },
  dateScroll: { marginBottom: 4 },
  dateChip: {
    width: 64, height: 78, borderRadius: 14, backgroundColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
    borderWidth: 1, borderColor: 'transparent',
  },
  dateChipActive: { backgroundColor: COLORS.amber, borderColor: COLORS.amber },
  dateDay: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 2, fontWeight: '500' },
  dateDayActive: { color: 'rgba(255,255,255,0.7)' },
  dateNum: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  dateNumActive: { color: COLORS.white },
  dateMonth: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
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
  timeChipActive: { backgroundColor: COLORS.amber, borderColor: COLORS.amber },
  timeChipUnavailable: { backgroundColor: colors.neutral[100], borderColor: colors.neutral[200] },
  timeText: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
  timeTextActive: { color: COLORS.white },
  timeTextUnavailable: { color: colors.neutral[300] },
  timeFullText: { fontSize: 9, color: colors.neutral[300], marginTop: 1, fontWeight: '500' },
  inputGroup: {
    backgroundColor: COLORS.white, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 12,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputIcon: { marginLeft: 14 },
  countryPicker: { borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 4, paddingVertical: 4 },
  phoneDivider: { width: 1, height: 24, backgroundColor: COLORS.border },
  inputDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 46 },
  input: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 14,
    fontSize: 15, color: COLORS.textPrimary,
  },
  inputMultiline: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14,
    fontSize: 15, color: COLORS.textPrimary, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border, height: 80, textAlignVertical: 'top',
  },
  bookingSummary: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginTop: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  summaryTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.amber, borderRadius: 16, paddingVertical: 16, marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  bonusNote: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 14, padding: 14, backgroundColor: COLORS.amberLight, borderRadius: 14,
  },
  bonusIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  bonusText: { flex: 1, fontSize: 12, color: COLORS.amberDark, lineHeight: 17 },
  confirmContent: { alignItems: 'center', padding: 32, paddingTop: 60 },
  confirmIconWrap: { marginBottom: 20 },
  confirmIconGradient: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  confirmTitle: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  confirmSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16, textAlign: 'center' },
  bookingIdWrap: {
    backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10,
    marginBottom: 24, alignItems: 'center',
  },
  bookingIdLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  bookingIdValue: {
    fontSize: 14, fontWeight: '700', color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  confirmCard: {
    width: '100%', backgroundColor: COLORS.white, borderRadius: 20, padding: 20, marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    }),
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  confirmRowIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  confirmRowLabel: { fontSize: 11, color: COLORS.textSecondary },
  confirmRowValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginTop: 1 },
  confirmDivider: { height: 1, backgroundColor: colors.neutral[100], marginVertical: 10, marginLeft: 50 },
  confirmNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 16, backgroundColor: COLORS.amberLight, borderRadius: 14, marginBottom: 24, width: '100%',
  },
  confirmNoteText: { flex: 1, fontSize: 13, color: COLORS.amberDark, lineHeight: 18 },
  doneBtn: {
    width: '100%', paddingVertical: 16, backgroundColor: COLORS.amber, borderRadius: 16, alignItems: 'center',
  },
  doneBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  viewBookingsBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  viewBookingsBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.amber },
});

export default React.memo(BookServicePage);
