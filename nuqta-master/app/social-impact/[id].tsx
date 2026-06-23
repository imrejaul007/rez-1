import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar,
  Linking,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Share,
  TextInput,
} from 'react-native';
import { DetailPageSkeleton } from '@/components/skeletons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import * as Location from 'expo-location';
import socialImpactApi, { SocialImpactEvent } from '@/services/socialImpactApi';
import { platformAlertDestructive } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { catchAndWarn } from '@/utils/catchAndReport';
import { useIsMounted } from '@/hooks/useIsMounted';

// Nuqta Brand Colors
const COLORS = {
  primary: Colors.gold,
  primaryDark: '#e6b84e',
  white: Colors.text.inverse,
  textDark: Colors.text.primary,
  textMuted: Colors.text.tertiary,
  background: Colors.background.secondary,
  border: 'rgba(0, 0, 0, 0.08)',
};

// Helper function for event type icon background colors
const getEventTypeIconBg = (eventType?: string): string => {
  const bgMap: Record<string, string> = {
    'blood-donation': 'rgba(239, 68, 68, 0.15)',
    'tree-plantation': 'rgba(255, 205, 87, 0.15)',
    'beach-cleanup': 'rgba(59, 130, 246, 0.15)',
    'digital-literacy': 'rgba(99, 102, 241, 0.15)',
    'food-drive': 'rgba(249, 115, 22, 0.15)',
    'health-camp': 'rgba(6, 182, 212, 0.15)',
    'skill-training': 'rgba(236, 72, 153, 0.15)',
    'women-empowerment': 'rgba(236, 72, 153, 0.15)',
    'education': 'rgba(99, 102, 241, 0.15)',
    'environment': 'rgba(255, 205, 87, 0.15)',
  };
  return bgMap[eventType || ''] || 'rgba(139, 92, 246, 0.15)';
};

// Helper function for event type emoji
const getEventTypeEmoji = (eventType?: string): string => {
  const emojiMap: Record<string, string> = {
    'blood-donation': '🩸',
    'tree-plantation': '🌳',
    'beach-cleanup': '🏖️',
    'digital-literacy': '💻',
    'food-drive': '🍛',
    'health-camp': '🏥',
    'skill-training': '👩‍💼',
    'women-empowerment': '👩‍💼',
    'education': '📚',
    'environment': '🌍',
  };
  return emojiMap[eventType || ''] || '✨';
};

// Format event time for display
const formatEventTime = (eventTime?: { start: string; end: string }): string => {
  if (!eventTime) return 'TBD';
  return `${eventTime.start} - ${eventTime.end}`;
};

// Format date for display
const formatEventDate = (dateString?: string): string => {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

function SocialImpactEventDetail() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // State
  const [event, setEvent] = useState<SocialImpactEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalState, setModalState] = useState<'loading' | 'success' | 'error'>('loading');
  const [modalMessage, setModalMessage] = useState('');

  // Check-in modal state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInTab, setCheckInTab] = useState<'qr' | 'otp' | 'geo'>('qr');
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const pollIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch event data
  const fetchEvent = useCallback(async (isRefresh = false) => {
    if (!id) return;

    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const response = await socialImpactApi.getEventById(id);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setEvent(response.data);
      } else {
        if (!isMounted()) return;
        setError('Event not found');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load event');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [id]);

  // Initial fetch
  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvent(true);
  }, [fetchEvent]);

  // Handle registration
  const handleRegister = async () => {
    if (!id || !event) return;

    setShowModal(true);
    setModalState('loading');
    setModalMessage('Processing your registration...');
    setActionLoading(true);

    try {
      const response = await socialImpactApi.registerForEvent(id);

      if (response.success) {
        if (!isMounted()) return;
        setModalState('success');
        if (!isMounted()) return;
        setModalMessage('Registration successful!');
        // Update local state
        if (!isMounted()) return;
        setEvent(prev => prev ? {
          ...prev,
          isEnrolled: true,
          enrollmentStatus: 'registered',
          capacity: prev.capacity ? {
            ...prev.capacity,
            enrolled: prev.capacity.enrolled + 1
          } : undefined
        } : null);

        // Close modal after delay
        setTimeout(() => {
          setShowModal(false);
        }, 1500);
      } else {
        if (!isMounted()) return;
        setModalState('error');
        if (!isMounted()) return;
        setModalMessage(response.message || 'Registration failed');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setModalState('error');
      if (!isMounted()) return;
      setModalMessage(err.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setActionLoading(false);
    }
  };

  // Handle cancel registration
  const handleCancelRegistration = () => {
    platformAlertDestructive(
      'Cancel Registration',
      'Are you sure you want to cancel your registration for this event?',
      async () => {
        if (!id || !event) return;

        setShowModal(true);
        setModalState('loading');
        setModalMessage('Cancelling registration...');
        setActionLoading(true);

        try {
          const response = await socialImpactApi.cancelRegistration(id);

          if (response.success) {
            if (!isMounted()) return;
            setModalState('success');
            if (!isMounted()) return;
            setModalMessage('Registration cancelled');
            // Update local state
            if (!isMounted()) return;
            setEvent(prev => prev ? {
              ...prev,
              isEnrolled: false,
              enrollmentStatus: undefined,
              enrollmentId: undefined,
              capacity: prev.capacity ? {
                ...prev.capacity,
                enrolled: Math.max(0, prev.capacity.enrolled - 1)
              } : undefined
            } : null);

            setTimeout(() => {
              setShowModal(false);
            }, 1500);
          } else {
            if (!isMounted()) return;
            setModalState('error');
            if (!isMounted()) return;
            setModalMessage(response.message || 'Cancellation failed');
          }
        } catch (err: any) {
          if (!isMounted()) return;
          setModalState('error');
          if (!isMounted()) return;
          setModalMessage(err.message || 'Something went wrong');
        } finally {
          if (!isMounted()) return;
          setActionLoading(false);
        }
      },
      'Yes, Cancel',
      'No, Keep It'
    );
  };

  const handleShare = async () => {
    if (!event) return;
    const message = `${event.name}\n${event.organizer?.name || ''}\n${formatEventDate(event.eventDate)}\n${event.location?.city || ''}\nEarn +${event.rewards?.rezCoins || 0} ${BRAND.COIN_NAME}!`;
    try {
      await Share.share({ message });
    } catch (_e) { /* silently handle */ }
  };

  const openMaps = () => {
    if (!event?.location?.address) return;
    const address = `${event.location.address}${event.location.city ? ', ' + event.location.city : ''}`;
    const encoded = encodeURIComponent(address);
    let url: string;
    if (Platform.OS === 'ios') {
      url = `maps:0,0?q=${encoded}`;
    } else if (Platform.OS === 'android') {
      url = `geo:0,0?q=${encoded}`;
    } else {
      // Web fallback — open Google Maps in a new tab
      url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    }
    try { Linking.openURL(url); } catch (e) { catchAndWarn(e, 'SocialImpactDetail/openURL'); }
  };

  const callPhone = () => {
    if (event?.contact?.phone) {
      try { Linking.openURL(`tel:${event.contact.phone}`); } catch (e) { catchAndWarn(e, 'SocialImpactDetail/openURL'); }
    }
  };

  const sendEmail = () => {
    if (event?.contact?.email) {
      try { Linking.openURL(`mailto:${event.contact.email}`); } catch (e) { catchAndWarn(e, 'SocialImpactDetail/openURL'); }
    }
  };

  // ======== CHECK-IN HANDLERS ========

  const getAvailableMethods = (): Array<'qr' | 'otp' | 'geo'> => {
    const methods = event?.verificationConfig?.methods;
    if (methods && methods.length > 0) {
      const mapped: Array<'qr' | 'otp' | 'geo'> = [];
      if (methods.includes('qr')) mapped.push('qr');
      if (methods.includes('otp')) mapped.push('otp');
      if (methods.includes('geo')) mapped.push('geo');
      return mapped.length > 0 ? mapped : ['qr', 'otp', 'geo'];
    }
    return ['qr', 'otp', 'geo'];
  };

  const handleGenerateQR = async () => {
    if (!id || event?.enrollmentStatus !== 'registered') return;
    setQrLoading(true);
    try {
      const response = await socialImpactApi.generateMyQR(id);
      if (response.success && response.data) {
        setQrPayload(response.data.qrPayload);
        startCheckInPolling();
      } else {
        if (!isMounted()) return;
        setShowCheckInModal(false);
        if (!isMounted()) return;
        setModalState('error');
        if (!isMounted()) return;
        setModalMessage('Failed to generate QR code');
        if (!isMounted()) return;
        setShowModal(true);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setShowCheckInModal(false);
      if (!isMounted()) return;
      setModalState('error');
      if (!isMounted()) return;
      setModalMessage(err.message || 'Failed to generate QR code');
      if (!isMounted()) return;
      setShowModal(true);
    } finally {
      if (!isMounted()) return;
      setQrLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!id || otpInput.length !== 6) return;
    setOtpLoading(true);
    try {
      const response = await socialImpactApi.verifyOTP(id, otpInput);
      if (response.success) {
        setShowCheckInModal(false);
        setOtpInput('');
        setEvent(prev => prev ? { ...prev, enrollmentStatus: 'checked_in' } : null);
        setModalState('success');
        setModalMessage('Checked in successfully!');
        setShowModal(true);
        setTimeout(() => setShowModal(false), 1500);
      } else {
        if (!isMounted()) return;
        setShowCheckInModal(false);
        if (!isMounted()) return;
        setModalState('error');
        if (!isMounted()) return;
        setModalMessage(response.message || 'Invalid OTP');
        if (!isMounted()) return;
        setShowModal(true);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setShowCheckInModal(false);
      if (!isMounted()) return;
      setModalState('error');
      if (!isMounted()) return;
      setModalMessage(err.message || 'OTP verification failed');
      if (!isMounted()) return;
      setShowModal(true);
    } finally {
      if (!isMounted()) return;
      setOtpLoading(false);
    }
  };

  const handleGeoCheckIn = async () => {
    if (!id) return;
    setGeoLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!isMounted()) return;
        setShowCheckInModal(false);
        if (!isMounted()) return;
        setModalState('error');
        if (!isMounted()) return;
        setModalMessage('Location permission is required for geo check-in. Please enable it in your device Settings.');
        if (!isMounted()) return;
        setShowModal(true);
        if (!isMounted()) return;
        setGeoLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const response = await socialImpactApi.verifyGeoCheckIn(
        id,
        location.coords.latitude,
        location.coords.longitude
      );
      if (response.success) {
        if (!isMounted()) return;
        setShowCheckInModal(false);
        if (!isMounted()) return;
        setEvent(prev => prev ? { ...prev, enrollmentStatus: 'checked_in' } : null);
        if (!isMounted()) return;
        setModalState('success');
        if (!isMounted()) return;
        setModalMessage('Location verified! You are checked in.');
        if (!isMounted()) return;
        setShowModal(true);
        setTimeout(() => setShowModal(false), 1500);
      } else {
        if (!isMounted()) return;
        setShowCheckInModal(false);
        if (!isMounted()) return;
        setModalState('error');
        if (!isMounted()) return;
        setModalMessage(response.message || 'Location verification failed');
        if (!isMounted()) return;
        setShowModal(true);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setShowCheckInModal(false);
      if (!isMounted()) return;
      setModalState('error');
      if (!isMounted()) return;
      setModalMessage(err.message || 'Geo check-in failed');
      if (!isMounted()) return;
      setShowModal(true);
    } finally {
      if (!isMounted()) return;
      setGeoLoading(false);
    }
  };

  // Poll enrollment status after QR is shown (detects when merchant scans)
  const startCheckInPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(async () => {
      if (!id) return;
      try {
        const response = await socialImpactApi.getEventById(id);
        if (response.success && response.data) {
          const status = response.data.enrollmentStatus;
          if (status === 'checked_in' || status === 'completed') {
            // Check-in detected!
            stopCheckInPolling();
            setCheckInSuccess(true);
            setEvent(prev => prev ? { ...prev, enrollmentStatus: status } : null);
          }
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 3000);
  }, [id]);

  const stopCheckInPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopCheckInPolling();
  }, [stopCheckInPolling]);

  const openCheckInModal = () => {
    const methods = getAvailableMethods();
    setCheckInTab(methods[0] || 'qr');
    setQrPayload(null);
    setOtpInput('');
    setCheckInSuccess(false);
    setShowCheckInModal(true);
  };

  const closeCheckInModal = () => {
    stopCheckInPolling();
    setShowCheckInModal(false);
    const wasCheckedIn = checkInSuccess || event?.enrollmentStatus === 'checked_in';
    setCheckInSuccess(false);
    if (wasCheckedIn) {
      fetchEvent(true);
    }
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailPageSkeleton />
      </>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
            </Pressable>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Event Not Found</Text>
            </View>
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.errorTitle}>Oops!</Text>
            <Text style={styles.errorText}>{error || 'Event not found'}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchEvent()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const isEventFull = event.capacity && event.capacity.enrolled >= event.capacity.goal;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>{event.name}</Text>
              {event.isCsrActivity && (
                <View style={styles.csrBadge}>
                  <Text style={styles.csrBadgeText}>CSR</Text>
                </View>
              )}
            </View>
            <Text style={styles.headerSubtitle}>{event.organizer?.name || 'Unknown Organizer'}</Text>
            {event.sponsor && (
              <View style={styles.sponsorRow}>
                <Ionicons name="business" size={11} color={Colors.brand.purpleLight} />
                <Text style={styles.sponsorText}>Sponsored by {event.sponsor.name}</Text>
              </View>
            )}
          </View>
          <Pressable style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={COLORS.textDark} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Hero Icon */}
          <View style={[styles.heroSection, { backgroundColor: getEventTypeIconBg(event.eventType) }]}>
            <Text style={styles.heroEmoji}>{getEventTypeEmoji(event.eventType)}</Text>
            {event.isEnrolled && (
              <View style={styles.enrolledBadgeHero}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
                <Text style={styles.enrolledBadgeHeroText}>
                  {event.enrollmentStatus === 'completed' ? 'Completed' :
                   event.enrollmentStatus === 'checked_in' ? 'Checked In' : 'Enrolled'}
                </Text>
              </View>
            )}
          </View>

          {/* Quick Info */}
          <View style={styles.quickInfoGrid}>
            <View style={styles.quickInfoCard}>
              <View style={styles.quickInfoHeader}>
                <Ionicons name="calendar" size={16} color={Colors.info} />
                <Text style={styles.quickInfoLabel}>Date</Text>
              </View>
              <Text style={styles.quickInfoValue}>{formatEventDate(event.eventDate)}</Text>
            </View>
            <View style={styles.quickInfoCard}>
              <View style={styles.quickInfoHeader}>
                <Ionicons name="time" size={16} color={colors.brand.orange} />
                <Text style={styles.quickInfoLabel}>Time</Text>
              </View>
              <Text style={styles.quickInfoValue}>{formatEventTime(event.eventTime)}</Text>
            </View>
          </View>

          {/* Location */}
          {event.location && (
            <View style={styles.sectionCard}>
              <View style={styles.locationHeader}>
                <Ionicons name="location" size={18} color={Colors.error} />
                <View style={styles.locationContent}>
                  <Text style={styles.locationTitle}>{event.location.address || 'Location'}</Text>
                  {event.location.city && (
                    <Text style={styles.locationAddress}>{event.location.city}</Text>
                  )}
                </View>
              </View>
              <Pressable style={styles.mapsButton} onPress={openMaps}>
                <Text style={styles.mapsButtonText}>Open in Maps</Text>
              </Pressable>
            </View>
          )}

          {/* Hosted By — Merchant & Store */}
          {(event.merchant || event.merchantStore) && (
            <View style={styles.hostedByCard}>
              <View style={styles.hostedByHeader}>
                <Ionicons name="storefront" size={18} color={Colors.success} />
                <Text style={styles.hostedByTitle}>Hosted By</Text>
              </View>

              {/* Merchant Info */}
              {event.merchant && (
                <View style={styles.hostedByRow}>
                  {event.merchant.logo ? (
                    <View style={styles.hostedByAvatar}>
                      <Text style={styles.hostedByAvatarText}>
                        {event.merchant.businessName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.hostedByAvatar}>
                      <Ionicons name="business" size={20} color={Colors.success} />
                    </View>
                  )}
                  <View style={styles.hostedByInfo}>
                    <Text style={styles.hostedByName}>{event.merchant.businessName}</Text>
                    {event.merchant.businessAddress?.city && (
                      <View style={styles.hostedByMeta}>
                        <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                        <Text style={styles.hostedByMetaText}>
                          {[event.merchant.businessAddress.city, event.merchant.businessAddress.state].filter(Boolean).join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Store Info */}
              {event.merchantStore && (
                <View style={styles.storeInfoRow}>
                  <Ionicons name="bag-outline" size={14} color={Colors.brand.purpleLight} />
                  <Text style={styles.storeInfoText}>{event.merchantStore.name}</Text>
                  {event.merchantStore.rating && event.merchantStore.rating.average > 0 && (
                    <View style={styles.storeRating}>
                      <Ionicons name="star" size={11} color={Colors.warning} />
                      <Text style={styles.storeRatingText}>{event.merchantStore.rating.average.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Contact */}
              {event.merchant?.phone && (
                <Pressable
                  style={styles.hostedByContact}
                  onPress={() => { try { Linking.openURL(`tel:${event.merchant!.phone}`); } catch (e) { catchAndWarn(e, 'SocialImpactDetail/openURL'); } }}
                >
                  <Ionicons name="call-outline" size={14} color={Colors.info} />
                  <Text style={styles.hostedByContactText}>{event.merchant.phone}</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Description */}
          {event.description && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>About This Event</Text>
              <Text style={styles.descriptionText}>{event.description}</Text>
            </View>
          )}

          {/* Impact & Progress */}
          {(event.impact || event.capacity) && (
            <View style={styles.impactCard}>
              <View style={styles.impactHeader}>
                <Ionicons name="trending-up" size={18} color={COLORS.primary} />
                <Text style={styles.impactTitle}>Expected Impact</Text>
              </View>
              {event.impact?.description && (
                <Text style={styles.impactText}>{event.impact.description}</Text>
              )}
              {event.capacity && event.capacity.goal > 0 && (
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Participants</Text>
                    <Text style={styles.progressValue}>{event.capacity.enrolled}/{event.capacity.goal}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min((event.capacity.enrolled / event.capacity.goal) * 100, 100)}%` }
                      ]}
                    />
                  </View>
                  {isEventFull && (
                    <Text style={styles.eventFullText}>This event is full</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Rewards */}
          {event.rewards && (event.rewards.rezCoins > 0 || event.rewards.brandCoins > 0) && (
            <View style={styles.rewardsCard}>
              <View style={styles.rewardsHeader}>
                <Ionicons name="trophy" size={18} color={Colors.warning} />
                <Text style={styles.rewardsTitle}>Participation Rewards</Text>
              </View>
              {event.sponsor && (
                <Text style={styles.rewardsSubtitle}>
                  Double rewards: ${BRAND.COIN_NAME} + Brand Coins from CSR sponsor
                </Text>
              )}
              <View style={styles.rewardsGrid}>
                {event.rewards.rezCoins > 0 && (
                  <View style={styles.rewardItem}>
                    <View style={styles.rewardIconRow}>
                      <Ionicons name="wallet" size={18} color={COLORS.primary} />
                      <Text style={styles.rewardLabel}>{BRAND.COIN_NAME}</Text>
                    </View>
                    <Text style={styles.rewardValue}>+{event.rewards.rezCoins}</Text>
                  </View>
                )}
                {event.rewards.brandCoins > 0 && event.sponsor && (
                  <View style={[styles.rewardItem, styles.rewardItemPurple]}>
                    <View style={styles.rewardIconRow}>
                      <Ionicons name="sparkles" size={18} color={Colors.brand.purpleLight} />
                      <Text style={styles.rewardLabel}>Brand Coins</Text>
                    </View>
                    <Text style={[styles.rewardValue, { color: colors.brand.purpleLight }]}>+{event.rewards.brandCoins}</Text>
                    <Text style={styles.brandName}>{event.sponsor.brandCoinName}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Requirements */}
          {event.eventRequirements && event.eventRequirements.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="information-circle" size={18} color={Colors.info} />
                <Text style={styles.sectionTitle}>Requirements</Text>
              </View>
              {event.eventRequirements.map((req, idx) => (
                <View key={idx} style={styles.listItem}>
                  <Ionicons
                    name={req.isMandatory ? "alert-circle" : "checkmark-circle"}
                    size={16}
                    color={req.isMandatory ? colors.error : COLORS.primary}
                  />
                  <Text style={styles.listText}>
                    {req.text}
                    {req.isMandatory && <Text style={styles.mandatoryText}> (Required)</Text>}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Benefits */}
          {event.benefits && event.benefits.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="heart" size={18} color={Colors.error} />
                <Text style={styles.sectionTitle}>What You Get</Text>
              </View>
              {event.benefits.map((benefit, idx) => (
                <View key={idx} style={styles.listItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.listText}>{benefit}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Schedule */}
          {event.schedule && event.schedule.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Event Schedule</Text>
              {event.schedule.map((item, idx) => (
                <View key={idx} style={styles.scheduleItem}>
                  <Text style={styles.scheduleTime}>{item.time}</Text>
                  <Text style={styles.scheduleActivity}>{item.activity}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Contact */}
          {event.contact && (event.contact.phone || event.contact.email) && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Contact Organizer</Text>
              {event.contact.phone && (
                <Pressable style={styles.contactItem} onPress={callPhone}>
                  <Ionicons name="call" size={18} color={COLORS.primary} />
                  <Text style={styles.contactText}>{event.contact.phone}</Text>
                </Pressable>
              )}
              {event.contact.email && (
                <Pressable style={styles.contactItem} onPress={sendEmail}>
                  <Ionicons name="mail" size={18} color={Colors.error} />
                  <Text style={styles.contactText}>{event.contact.email}</Text>
                </Pressable>
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Fixed Action Button */}
        <View style={styles.fixedButtonContainer}>
          {event.eventStatus === 'completed' ? (
            <View style={styles.completedButtonContainer}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.textMuted} />
              <Text style={styles.completedButtonText}>Event Completed</Text>
            </View>
          ) : event.isEnrolled ? (
            event.enrollmentStatus === 'completed' ? (
              <View style={styles.completedButtonContainer}>
                <Ionicons name="trophy" size={20} color={Colors.warning} />
                <Text style={styles.completedButtonText}>You completed this event!</Text>
              </View>
            ) : event.enrollmentStatus === 'checked_in' ? (
              <View style={styles.checkedInButtonContainer}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.checkedInButtonText}>Checked In - Awaiting Completion</Text>
              </View>
            ) : (
              <View style={styles.enrolledButtonsRow}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={handleCancelRegistration}
                  disabled={actionLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.checkInActionButton}
                  onPress={openCheckInModal}
                >
                  <Ionicons name="qr-code" size={18} color={COLORS.white} />
                  <Text style={styles.checkInActionButtonText}>Check In</Text>
                </Pressable>
              </View>
            )
          ) : isEventFull ? (
            <View style={styles.eventFullContainer}>
              <Ionicons name="people" size={20} color={COLORS.textMuted} />
              <Text style={styles.eventFullButtonText}>Event is Full</Text>
            </View>
          ) : (
            <Pressable
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={actionLoading}
            >
              <LinearGradient
                colors={[COLORS.primary, '#e6b84e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Register Now</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Modal */}
        <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {modalState === 'loading' ? (
                <>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.modalTitle}>{modalMessage}</Text>
                </>
              ) : modalState === 'success' ? (
                <>
                  <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(255, 205, 87, 0.1)' }]}>
                    <Ionicons name="checkmark-circle" size={48} color={COLORS.primary} />
                  </View>
                  <Text style={styles.modalTitle}>{modalMessage}</Text>
                </>
              ) : (
                <>
                  <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <Ionicons name="close-circle" size={48} color={Colors.error} />
                  </View>
                  <Text style={styles.modalTitle}>{modalMessage}</Text>
                  <Pressable
                    style={styles.modalButton}
                    onPress={() => setShowModal(false)}
                  >
                    <Text style={styles.modalButtonText}>OK</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Modal>
        {/* Check-In Modal */}
        <Modal
          visible={showCheckInModal}
          transparent
          animationType="slide"
          onRequestClose={closeCheckInModal}
        >
          <View style={styles.checkInOverlay}>
            <View style={styles.checkInSheet}>
              {/* Header */}
              <View style={styles.checkInHeader}>
                <Text style={styles.checkInTitle}>Event Check-In</Text>
                <Pressable onPress={closeCheckInModal}>
                  <Ionicons name="close" size={24} color={COLORS.textMuted} />
                </Pressable>
              </View>

              {/* Tabs */}
              {(() => {
                const methods = getAvailableMethods();
                const TAB_CONFIG = {
                  qr: { label: 'QR Code', icon: 'qr-code' as const },
                  otp: { label: 'OTP', icon: 'key' as const },
                  geo: { label: 'Location', icon: 'location' as const },
                };
                return (
                  <>
                    {methods.length > 1 && (
                      <View style={styles.checkInTabRow}>
                        {methods.map((method) => (
                          <Pressable
                            key={method}
                            style={[
                              styles.checkInTab,
                              checkInTab === method && styles.checkInTabActive,
                            ]}
                            onPress={() => setCheckInTab(method)}
                          >
                            <Ionicons
                              name={TAB_CONFIG[method].icon}
                              size={16}
                              color={checkInTab === method ? COLORS.white : COLORS.textMuted}
                            />
                            <Text
                              style={[
                                styles.checkInTabText,
                                checkInTab === method && styles.checkInTabTextActive,
                              ]}
                            >
                              {TAB_CONFIG[method].label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </>
                );
              })()}

              {/* QR Tab */}
              {checkInTab === 'qr' && (
                <View style={styles.checkInBody}>
                  {checkInSuccess ? (
                    <View style={styles.qrContainer}>
                      <View style={styles.checkInSuccessIcon}>
                        <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
                      </View>
                      <Text style={styles.checkInSuccessTitle}>Check-in Successful!</Text>
                      <Text style={styles.checkInSuccessText}>
                        You have been checked in for this event. Enjoy the experience!
                      </Text>
                      <Pressable
                        style={[styles.checkInPrimaryButton, { backgroundColor: colors.successScale[400] }]}
                        onPress={closeCheckInModal}
                      >
                        <Ionicons name="checkmark" size={18} color={COLORS.white} />
                        <Text style={styles.checkInPrimaryButtonText}>Done</Text>
                      </Pressable>
                    </View>
                  ) : qrPayload ? (
                    <View style={styles.qrContainer}>
                      <View style={styles.qrCodeWrapper}>
                        <QRCode value={qrPayload} size={220} />
                      </View>
                      <Text style={styles.checkInInstructions}>
                        Show this QR code to the event organizer for check-in
                      </Text>
                      <View style={styles.qrWaitingBadge}>
                        <ActivityIndicator size="small" color={Colors.warning} />
                        <Text style={styles.qrWaitingText}>Waiting for scan...</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.qrContainer}>
                      <View style={styles.qrPlaceholder}>
                        <Ionicons name="qr-code-outline" size={64} color={Colors.border.default} />
                      </View>
                      <Text style={styles.checkInInstructions}>
                        Generate your unique QR code to show at the event venue
                      </Text>
                      <Pressable
                        style={styles.checkInPrimaryButton}
                        onPress={handleGenerateQR}
                        disabled={qrLoading}
                      >
                        {qrLoading ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <>
                            <Ionicons name="qr-code" size={18} color={COLORS.white} />
                            <Text style={styles.checkInPrimaryButtonText}>Generate QR Code</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {/* OTP Tab */}
              {checkInTab === 'otp' && (
                <View style={styles.checkInBody}>
                  <View style={styles.otpContainer}>
                    <Ionicons name="key-outline" size={48} color={Colors.brand.purpleLight} />
                    <Text style={styles.checkInInstructions}>
                      Enter the 6-digit code provided by the event organizer
                    </Text>
                    <TextInput
                      style={styles.otpInput}
                      value={otpInput}
                      onChangeText={(text) => setOtpInput(text.replace(/[^0-9]/g, ''))}
                      placeholder="000000"
                      placeholderTextColor={colors.neutral[300]}
                      keyboardType="number-pad"
                      maxLength={6}
                      textAlign="center"
                    />
                    <Pressable
                      style={[
                        styles.checkInPrimaryButton,
                        { backgroundColor: colors.brand.purpleLight },
                        otpInput.length !== 6 && { opacity: 0.5 },
                      ]}
                      onPress={handleVerifyOTP}
                      disabled={otpInput.length !== 6 || otpLoading}
                    >
                      {otpLoading ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                          <Text style={styles.checkInPrimaryButtonText}>Verify OTP</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Geo Tab */}
              {checkInTab === 'geo' && (
                <View style={styles.checkInBody}>
                  <View style={styles.geoContainer}>
                    <Ionicons name="location-outline" size={48} color={Colors.success} />
                    <Text style={styles.checkInInstructions}>
                      Verify your location to check in. You must be within{' '}
                      {event?.verificationConfig?.geoFenceRadiusMeters || 500}m of the event venue.
                    </Text>
                    <Pressable
                      style={[styles.checkInPrimaryButton, { backgroundColor: colors.successScale[400] }]}
                      onPress={handleGeoCheckIn}
                      disabled={geoLoading}
                    >
                      {geoLoading ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <Ionicons name="navigate" size={18} color={COLORS.white} />
                          <Text style={styles.checkInPrimaryButtonText}>Check In with Location</Text>
                        </>
                      )}
                    </Pressable>
                    {geoLoading && (
                      <Text style={styles.geoLoadingText}>Getting your location...</Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    flex: 1,
  },
  csrBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  csrBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.info,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  sponsorText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.brand.purpleLight,
  },
  shareButton: {
    padding: 8,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  heroSection: {
    height: 140,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
    position: 'relative',
  },
  heroEmoji: {
    fontSize: 72,
  },
  enrolledBadgeHero: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  enrolledBadgeHeroText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  quickInfoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickInfoCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  quickInfoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  quickInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  locationContent: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  // Hosted By styles
  hostedByCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  hostedByHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  hostedByTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  hostedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  hostedByAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostedByAvatarText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.success,
  },
  hostedByInfo: {
    flex: 1,
  },
  hostedByName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  hostedByMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hostedByMetaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  storeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    borderRadius: 8,
    marginBottom: 8,
  },
  storeInfoText: {
    flex: 1,
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.brand.purpleLight,
  },
  storeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  storeRatingText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.warning,
  },
  hostedByContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  hostedByContactText: {
    ...Typography.bodySmall,
    color: Colors.info,
  },
  mapsButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  mapsButtonText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.info,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  impactCard: {
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  impactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  impactText: {
    fontSize: 13,
    color: COLORS.primaryDark,
    marginBottom: 12,
  },
  progressSection: {},
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  eventFullText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: 8,
    fontWeight: '500',
  },
  rewardsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 205, 87, 0.3)',
  },
  rewardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rewardsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  rewardsSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  rewardsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  rewardItemPurple: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  rewardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  rewardLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  rewardValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  brandName: {
    ...Typography.overline,
    color: Colors.brand.purpleLight,
    marginTop: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.error,
    marginTop: 6,
  },
  listText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  mandatoryText: {
    color: Colors.error,
    fontWeight: '500',
  },
  scheduleItem: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  scheduleTime: {
    width: 70,
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.info,
  },
  scheduleActivity: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  contactText: {
    ...Typography.bodySmall,
    color: Colors.info,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.base,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  registerButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  completedButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingVertical: 16,
    borderRadius: 14,
  },
  completedButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  checkedInButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.3)',
  },
  checkedInButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  enrolledButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cancelButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.error,
  },
  checkInActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    paddingVertical: 16,
    borderRadius: 14,
  },
  checkInActionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  eventFullContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingVertical: 16,
    borderRadius: 14,
  },
  eventFullButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    marginHorizontal: 32,
    minWidth: 200,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    textAlign: 'center',
    marginTop: 12,
  },
  modalButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Check-In Modal
  checkInOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  checkInSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  checkInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  checkInTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  checkInTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 20,
  },
  checkInTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
  },
  checkInTabActive: {
    backgroundColor: COLORS.textDark,
  },
  checkInTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  checkInTabTextActive: {
    color: COLORS.white,
  },
  checkInBody: {
    paddingHorizontal: 24,
  },
  qrContainer: {
    alignItems: 'center',
    gap: 20,
    paddingVertical: 12,
  },
  qrCodeWrapper: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.default,
    ...Shadows.medium,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
    borderWidth: 2,
    borderColor: Colors.border.default,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInInstructions: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  qrWaitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  qrWaitingText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.warning,
  },
  checkInSuccessIcon: {
    marginBottom: 8,
  },
  checkInSuccessTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.success,
    textAlign: 'center',
    marginBottom: 8,
  },
  checkInSuccessText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  checkInPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
  },
  checkInPrimaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  otpContainer: {
    alignItems: 'center',
    gap: 20,
    paddingVertical: 12,
  },
  otpInput: {
    width: '70%',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 12,
    color: COLORS.textDark,
    borderWidth: 2,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: Colors.background.secondary,
  },
  geoContainer: {
    alignItems: 'center',
    gap: 20,
    paddingVertical: 12,
  },
  geoLoadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});

export default withErrorBoundary(SocialImpactEventDetail, 'Social Impact');
