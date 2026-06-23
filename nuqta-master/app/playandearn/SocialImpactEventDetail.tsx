// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Linking,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import programApi from '../../services/programApi';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { catchAndWarn } from '@/utils/catchAndReport';
import { useIsMounted } from '@/hooks/useIsMounted';

const SocialImpactEventDetail = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = false; // Force white theme
  const params = useLocalSearchParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : params.id?.toString() || '1';
  const [isRegistered, setIsRegistered] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<any>(null);
  const isMounted = useIsMounted();

  // Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await programApi.getSocialImpactEventById(id);
        if (res.data) {
          setEventData(res.data);
        }
      } catch (error) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const handleRegister = async () => {
    try {
      await programApi.registerForSocialImpact(id);
      if (!isMounted()) return;
      setIsRegistered(true);
      if (!isMounted()) return;
      setShowConfirmation(true);
    } catch (error) {
      // silently handle
    }
  };

  const events: { [key: string]: any } = {
    '1': {
      type: 'blood-donation',
      title: 'Blood Donation Drive',
      icon: '🩸',
      iconBg: 'rgba(239, 68, 68, 0.2)',
      iconColor: Colors.error,
      organizer: 'Apollo Hospitals',
      logo: '🏥',
      date: 'Dec 28, 2024',
      time: '9:00 AM - 5:00 PM',
      location: 'Apollo Hospital, Sector 18',
      fullAddress: 'Apollo Hospitals, Sector 18, Noida, Uttar Pradesh 201301',
      distance: '2.3 km',
      rewards: { rezCoins: 200, brandedCoins: 150, brandName: 'Apollo' },
      enrolled: 234,
      goal: 500,
      impact: 'Save 3 lives per donation',
      status: 'upcoming',
      description: 'Join us for a life-saving blood donation drive. Every donation can save up to 3 lives. Registered donors will receive health checkup and refreshments.',
      requirements: [
        'Age between 18-65 years',
        'Weight above 50kg',
        'Valid ID proof required',
        'No recent illness or medication',
        'Fasting not required, eat normally'
      ],
      benefits: [
        'Free health checkup',
        'Refreshments provided',
        'Blood donor certificate',
        `${BRAND.COIN_NAME} + Apollo branded coins`,
        'Priority access to blood bank if needed'
      ],
      contact: {
        phone: '+91-9876543210',
        email: 'blooddrive@apollo.com'
      },
      schedule: [
        { time: '9:00 AM', activity: 'Registration & Check-in' },
        { time: '9:30 AM', activity: 'Health Screening' },
        { time: '10:00 AM', activity: 'Blood Donation' },
        { time: '4:30 PM', activity: 'Refreshments & Certificate' }
      ]
    },
    '2': {
      type: 'tree-plantation',
      title: 'Tree Plantation Drive',
      icon: '🌳',
      iconBg: 'rgba(34, 197, 94, 0.2)',
      iconColor: Colors.success,
      organizer: 'Green Earth Foundation',
      logo: '🌍',
      date: 'Dec 30, 2024',
      time: '7:00 AM - 11:00 AM',
      location: 'City Park, Botanical Gardens',
      fullAddress: 'Botanical Gardens, Sector 38, Noida, Uttar Pradesh 201303',
      distance: '4.1 km',
      rewards: { rezCoins: 150, brandedCoins: 100, brandName: 'Green Earth' },
      enrolled: 156,
      goal: 200,
      impact: 'Plant 1000+ saplings',
      status: 'upcoming',
      description: 'Help us make the city greener! Join our tree plantation drive and contribute to a sustainable future. Each participant will plant at least 5 saplings.',
      requirements: [
        'Comfortable outdoor clothing',
        'Closed-toe shoes required',
        'Bring your own water bottle',
        'Sun protection (hat, sunscreen)',
        'Minimum age 12 years (with guardian)'
      ],
      benefits: [
        'Contribute to environmental conservation',
        'Learn about native tree species',
        'Breakfast and refreshments',
        'Tree adoption certificate',
        `${BRAND.APP_NAME} + Branded coins`
      ],
      contact: {
        phone: '+91-9876543211',
        email: 'events@greenearth.org'
      },
      schedule: [
        { time: '7:00 AM', activity: 'Assembly & Breakfast' },
        { time: '7:30 AM', activity: 'Site allocation & Tools distribution' },
        { time: '8:00 AM', activity: 'Plantation begins' },
        { time: '10:30 AM', activity: 'Certificates & Photo session' }
      ]
    },
    '3': {
      type: 'cleanup',
      title: 'Beach Cleanup Drive',
      icon: '🏖️',
      iconBg: 'rgba(59, 130, 246, 0.2)',
      iconColor: Colors.info,
      organizer: 'Clean Beaches Initiative',
      logo: '🌊',
      date: 'Jan 2, 2025',
      time: '6:00 AM - 9:00 AM',
      location: 'Marina Beach',
      fullAddress: 'Marina Beach, Chennai, Tamil Nadu 600001',
      distance: '8.5 km',
      rewards: { rezCoins: 120, brandedCoins: 80, brandName: 'Clean Beaches' },
      enrolled: 89,
      goal: 150,
      impact: 'Clean 5 km of coastline',
      status: 'upcoming',
      description: 'Join us in keeping our beaches clean! Participate in this beach cleanup drive and help protect marine life. All equipment will be provided.',
      requirements: [
        'Comfortable clothes you can get dirty',
        'Closed-toe shoes (no flip-flops)',
        'Sun protection essential',
        'Bring reusable water bottle',
        'Gloves will be provided'
      ],
      benefits: [
        'Protect marine ecosystem',
        'Morning refreshments',
        'Cleanup completion certificate',
        `${BRAND.APP_NAME} + Branded coins`,
        'Photo with collected waste stats'
      ],
      contact: {
        phone: '+91-9876543212',
        email: 'cleanup@cleanbeaches.org'
      },
      schedule: [
        { time: '6:00 AM', activity: 'Registration & Equipment' },
        { time: '6:30 AM', activity: 'Beach Cleanup begins' },
        { time: '8:30 AM', activity: 'Waste sorting & counting' },
        { time: '9:00 AM', activity: 'Certificates & Group photo' }
      ]
    },
    '4': {
      type: 'ngo-volunteer',
      title: 'Community Kitchen Volunteering',
      icon: '🍲',
      iconBg: 'rgba(249, 115, 22, 0.2)',
      iconColor: colors.brand.orange,
      organizer: 'Feed the Need NGO',
      logo: '🤝',
      date: 'Every Sunday',
      time: '11:00 AM - 2:00 PM',
      location: 'Community Center, MG Road',
      fullAddress: 'Community Center, MG Road, Bangalore, Karnataka 560001',
      distance: '3.7 km',
      rewards: { rezCoins: 100, brandedCoins: 0 },
      enrolled: 45,
      goal: 100,
      impact: 'Feed 200+ people',
      status: 'ongoing',
      description: 'Help us serve nutritious meals to those in need. Volunteers assist in cooking, serving, and cleanup. A fulfilling way to give back to the community.',
      requirements: [
        'Available for 3 hours every Sunday',
        'Basic hygiene (hair tied, clean hands)',
        'Comfortable closed shoes',
        'Food handlers training provided',
        'Age 16+ (or with guardian)'
      ],
      benefits: [
        'Make real impact in community',
        'Free lunch provided',
        'Volunteer certificate (monthly)',
        `${BRAND.COIN_NAME} weekly`,
        'Meet like-minded people'
      ],
      contact: {
        phone: '+91-9876543213',
        email: 'volunteer@feedtheneed.org'
      },
      schedule: [
        { time: '11:00 AM', activity: 'Arrival & Briefing' },
        { time: '11:30 AM', activity: 'Food preparation begins' },
        { time: '12:30 PM', activity: 'Serving meals' },
        { time: '1:30 PM', activity: 'Cleanup & Debrief' }
      ]
    }
  };

  const event = events[id] || events['1'];

  const handleCall = () => {
    try { Linking.openURL(`tel:${event.contact.phone}`); } catch (e) { catchAndWarn(e, 'SocialImpactEventDetail/openURL'); }
  };

  const handleEmail = () => {
    try { Linking.openURL(`mailto:${event.contact.email}`); } catch (e) { catchAndWarn(e, 'SocialImpactEventDetail/openURL'); }
  };

  const handleMaps = () => {
    try { Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(event.fullAddress)}`); } catch (e) { catchAndWarn(e, 'SocialImpactEventDetail/openURL'); }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.text.primary : Colors.background.primary }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: isDark ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.95)' }]}>
          <View style={styles.headerContent}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? Colors.text.inverse : Colors.text.primary} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{event.title}</Text>
              <Text style={[styles.headerSubtitle, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{event.organizer}</Text>
            </View>
            <Pressable style={styles.shareButton}>
              <Ionicons name="share-social" size={24} color={isDark ? Colors.text.inverse : Colors.text.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          {/* Hero Image */}
          <View style={[styles.heroImage, { backgroundColor: event.iconBg }]}>
            <Text style={styles.heroIcon}>{event.icon}</Text>
          </View>

          {/* Quick Info */}
          <View style={styles.quickInfo}>
            <View style={[styles.infoCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
              <View style={styles.infoHeader}>
                <Ionicons name="calendar" size={16} color={Colors.info} />
                <Text style={[styles.infoLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Date</Text>
              </View>
              <Text style={[styles.infoValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{event.date}</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
              <View style={styles.infoHeader}>
                <Ionicons name="time" size={16} color={colors.brand.orange} />
                <Text style={[styles.infoLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Time</Text>
              </View>
              <Text style={[styles.infoValue, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{event.time}</Text>
            </View>
          </View>

          {/* Location */}
          <View style={[styles.sectionCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
            <View style={styles.locationHeader}>
              <Ionicons name="location" size={20} color={Colors.error} />
              <View style={styles.locationInfo}>
                <Text style={[styles.locationTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{event.location}</Text>
                <Text style={[styles.locationAddress, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{event.fullAddress}</Text>
                <Text style={[styles.locationDistance, { color: Colors.info }]}>{event.distance} away</Text>
              </View>
            </View>
            <Pressable onPress={handleMaps} style={[styles.mapsButton, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)' }]}>
              <Text style={[styles.mapsButtonText, { color: Colors.info }]}>Open in Maps</Text>
            </Pressable>
          </View>

          {/* Description */}
          <View style={[styles.sectionCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>About This Event</Text>
            <Text style={[styles.sectionText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{event.description}</Text>
          </View>

          {/* Impact & Progress */}
          <LinearGradient
            colors={isDark ? ['rgba(255, 205, 87, 0.1)', 'rgba(20, 184, 166, 0.1)'] : [colors.linen, '#F0FDFA']}
            style={[styles.impactCard, { borderColor: isDark ? 'rgba(255, 205, 87, 0.3)' : '#A7F3D0' }]}
          >
            <View style={styles.impactHeader}>
              <Ionicons name="trending-up" size={20} color={Colors.gold} />
              <Text style={[styles.impactTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Expected Impact</Text>
            </View>
            <Text style={[styles.impactText, { color: isDark ? '#6EE7B7' : '#047857' }]}>{event.impact}</Text>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Participants</Text>
              <Text style={[styles.progressValue, { color: Colors.gold }]}>
                {event.enrolled}/{event.goal}
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
              <LinearGradient
                colors={[Colors.gold, '#e6b84e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${(event.enrolled / event.goal) * 100}%` }]}
              />
            </View>
          </LinearGradient>

          {/* Rewards */}
          <View style={[styles.sectionCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="ribbon" size={20} color={Colors.warning} />
              <Text style={[styles.sectionTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Rewards</Text>
            </View>
            <View style={styles.rewardsList}>
              <View style={[styles.rewardCard, { backgroundColor: isDark ? 'rgba(255, 205, 87, 0.1)' : colors.linen }]}>
                <View style={styles.rewardHeader}>
                  <Text style={styles.rewardEmoji}>💰</Text>
                  <Text style={[styles.rewardLabel, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{BRAND.COIN_NAME}</Text>
                </View>
                <Text style={[styles.rewardAmount, { color: Colors.gold }]}>+{event.rewards.rezCoins}</Text>
              </View>
              {event.rewards.brandedCoins > 0 && (
                <View style={[styles.rewardCard, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.1)' : '#FAF5FF' }]}>
                  <View style={styles.rewardHeader}>
                    <Text style={styles.rewardEmoji}>🏪</Text>
                    <Text style={[styles.rewardLabel, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>{event.rewards.brandName} Coins</Text>
                  </View>
                  <Text style={[styles.rewardAmount, { color: colors.brand.purpleMedium }]}>+{event.rewards.brandedCoins}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Requirements */}
          <View style={[styles.sectionCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color={Colors.info} />
              <Text style={[styles.sectionTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Requirements</Text>
            </View>
            <View style={styles.list}>
              {event.requirements.map((req: string, idx: number) => (
                <View key={idx} style={styles.listItem}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.gold} />
                  <Text style={[styles.listText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{req}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Benefits */}
          <View style={[styles.sectionCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={20} color={Colors.error} />
              <Text style={[styles.sectionTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>What You Get</Text>
            </View>
            <View style={styles.list}>
              {event.benefits.map((benefit: string, idx: number) => (
                <View key={idx} style={styles.listItem}>
                  <View style={[styles.benefitDot, { backgroundColor: Colors.error }]} />
                  <Text style={[styles.listText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Schedule */}
          <View style={[styles.sectionCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Event Schedule</Text>
            <View style={styles.scheduleList}>
              {event.schedule.map((item: any, idx: number) => (
                <View key={idx} style={styles.scheduleItem}>
                  <Text style={[styles.scheduleTime, { color: Colors.info }]}>{item.time}</Text>
                  <Text style={[styles.scheduleActivity, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>{item.activity}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Contact */}
          <View style={[styles.sectionCard, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Contact Organizer</Text>
            <View style={styles.contactList}>
              <Pressable onPress={handleCall} style={styles.contactItem}>
                <Ionicons name="call" size={20} color={Colors.gold} />
                <Text style={[styles.contactText, { color: Colors.info }]}>{event.contact.phone}</Text>
              </Pressable>
              <Pressable onPress={handleEmail} style={styles.contactItem}>
                <Ionicons name="mail" size={20} color={Colors.error} />
                <Text style={[styles.contactText, { color: Colors.info }]}>{event.contact.email}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Registration Button */}
      <View style={[styles.footer, { backgroundColor: isDark ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.95)' }]}>
        <Pressable
          onPress={handleRegister}
          disabled={isRegistered || event.status === 'completed'}
          style={[
            styles.registerButton,
            isRegistered && { backgroundColor: Colors.gold },
            event.status === 'completed' && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border.default }
          ]}
        >
          {!isRegistered && event.status !== 'completed' ? (
            <LinearGradient colors={[Colors.gold, '#e6b84e']} style={styles.registerButtonGradient}>
              <Text style={styles.registerButtonText}>Register Now</Text>
            </LinearGradient>
          ) : (
            <Text style={[styles.registerButtonText, { color: isRegistered ? Colors.text.inverse : (isDark ? Colors.text.tertiary : Colors.text.tertiary) }]}>
              {isRegistered ? '✓ Registered Successfully' : 'Event Completed'}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmation} transparent animationType="fade" onRequestClose={() => setShowConfirmation(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.text.primary : Colors.background.primary }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(255, 205, 87, 0.2)' }]}>
              <Ionicons name="checkmark-circle" size={32} color={Colors.gold} />
            </View>
            <Text style={[styles.modalTitle, { color: isDark ? Colors.text.inverse : Colors.text.primary }]}>Processing...</Text>
            <Text style={[styles.modalText, { color: isDark ? Colors.text.tertiary : Colors.text.tertiary }]}>Confirming your registration</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 231, 235, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h4,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  shareButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  content: {
    padding: Spacing.base,
    gap: Spacing.xl,
  },
  heroImage: {
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    fontSize: 64,
  },
  quickInfo: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  infoCard: {
    flex: 1,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    ...Typography.bodySmall,
  },
  infoValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  sectionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  locationAddress: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
  locationDistance: {
    ...Typography.bodySmall,
  },
  mapsButton: {
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  mapsButtonText: {
    ...Typography.body,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  sectionText: {
    ...Typography.body,
  },
  impactCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  impactTitle: {
    ...Typography.h4,
  },
  impactText: {
    ...Typography.body,
    fontWeight: '500',
    marginBottom: Spacing.base,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    ...Typography.bodySmall,
  },
  progressValue: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
  },
  progressBar: {
    height: Spacing.sm,
    borderRadius: Spacing.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Spacing.xs,
  },
  rewardsList: {
    gap: Spacing.md,
  },
  rewardCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rewardEmoji: {
    ...Typography.h4,
  },
  rewardLabel: {
    ...Typography.body,
    fontWeight: '500',
  },
  rewardAmount: {
    ...Typography.h4,
  },
  list: {
    gap: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  listText: {
    ...Typography.body,
    flex: 1,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  scheduleList: {
    gap: Spacing.md,
  },
  scheduleItem: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  scheduleTime: {
    ...Typography.bodySmall,
    fontWeight: '600',
    width: 80,
  },
  scheduleActivity: {
    ...Typography.body,
    flex: 1,
  },
  contactList: {
    gap: Spacing.md,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  contactText: {
    ...Typography.body,
  },
  footer: {
    padding: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 231, 235, 0.1)',
  },
  registerButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  registerButtonGradient: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  registerButtonText: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.inverse,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    margin: Spacing.base,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  modalTitle: {
    ...Typography.h4,
    marginBottom: Spacing.sm,
  },
  modalText: {
    ...Typography.body,
  },
});

export default withErrorBoundary(SocialImpactEventDetail, 'PlayandearnSocialImpactEventDetail');

