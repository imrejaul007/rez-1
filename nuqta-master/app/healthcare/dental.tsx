import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Modal,
  Linking,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiClient from '@/services/apiClient';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

// TypeScript Interfaces
interface DentistStore {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  address: {
    street?: string;
    city: string;
    state: string;
    pincode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  contact: {
    phone?: string;
    email?: string;
    whatsapp?: string;
  };
  ratings: {
    average: number;
    count: number;
  };
  isActive: boolean;
  metadata?: {
    specialization?: string;
    experience?: string;
    qualification?: string;
    consultationFee?: number;
    availableSlots?: string[];
    languages?: string[];
    services?: string[];
  };
}

interface DentalService {
  id: string;
  name: string;
  icon: string;
  description: string;
  priceRange: string;
}

interface BookingSlot {
  time: string;
  available: boolean;
}

// Dental services offered
const dentalServices: DentalService[] = [
  { id: 'cleaning', name: 'Teeth Cleaning', icon: 'sparkles', description: 'Professional dental cleaning and polishing', priceRange: '500 - 1,500' },
  { id: 'filling', name: 'Dental Filling', icon: 'ellipse', description: 'Cavity filling and restoration', priceRange: '800 - 3,000' },
  { id: 'root_canal', name: 'Root Canal', icon: 'medical', description: 'Root canal treatment (RCT)', priceRange: '3,000 - 8,000' },
  { id: 'extraction', name: 'Tooth Extraction', icon: 'remove-circle', description: 'Simple and surgical extractions', priceRange: '500 - 2,500' },
  { id: 'braces', name: 'Dental Braces', icon: 'git-compare', description: 'Orthodontic braces and aligners', priceRange: '25,000 - 80,000' },
  { id: 'whitening', name: 'Teeth Whitening', icon: 'sunny', description: 'Professional teeth whitening', priceRange: '3,000 - 15,000' },
  { id: 'implant', name: 'Dental Implants', icon: 'pin', description: 'Permanent tooth replacement', priceRange: '20,000 - 50,000' },
  { id: 'crown', name: 'Dental Crown', icon: 'shield', description: 'Caps and crown placement', priceRange: '3,000 - 15,000' },
];

// Time slots
const timeSlots: BookingSlot[] = [
  { time: '09:00 AM', available: true },
  { time: '09:30 AM', available: true },
  { time: '10:00 AM', available: false },
  { time: '10:30 AM', available: true },
  { time: '11:00 AM', available: true },
  { time: '11:30 AM', available: true },
  { time: '02:00 PM', available: true },
  { time: '02:30 PM', available: false },
  { time: '03:00 PM', available: true },
  { time: '03:30 PM', available: true },
  { time: '04:00 PM', available: true },
  { time: '04:30 PM', available: true },
  { time: '05:00 PM', available: true },
  { time: '05:30 PM', available: false },
  { time: '06:00 PM', available: true },
];

function DentalCarePage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [dentists, setDentists] = useState<DentistStore[]>([]);
  const [filteredDentists, setFilteredDentists] = useState<DentistStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Booking modal state
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedDentist, setSelectedDentist] = useState<DentistStore | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // Fetch dentists from API
  const fetchDentists = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ stores: DentistStore[] }>('/stores?category=healthcare&type=doctor&specialty=dentist');

      if (response.success && response.data?.stores) {
        if (!isMounted()) return;
        setDentists(response.data.stores);
        if (!isMounted()) return;
        setFilteredDentists(response.data.stores);
      } else {
        // Fallback: fetch all doctors and filter for dentists
        const fallbackResponse = await apiClient.get<{ stores: DentistStore[] }>('/stores?category=healthcare&type=doctor');
        if (fallbackResponse.success && fallbackResponse.data?.stores) {
          const dentistStores = fallbackResponse.data.stores.filter((store: DentistStore) =>
            store.metadata?.specialization?.toLowerCase().includes('dent') ||
            store.name.toLowerCase().includes('dental') ||
            store.name.toLowerCase().includes('dentist')
          );
          if (!isMounted()) return;
          setDentists(dentistStores);
          if (!isMounted()) return;
          setFilteredDentists(dentistStores);
        }
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to load dentists. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDentists();
  }, []);

  // Filter dentists based on search and selected service
  useEffect(() => {
    let filtered = dentists;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (dentist) =>
          dentist.name.toLowerCase().includes(query) ||
          dentist.address.city.toLowerCase().includes(query) ||
          dentist.metadata?.services?.some(s => s.toLowerCase().includes(query))
      );
    }

    if (selectedService) {
      filtered = filtered.filter((dentist) =>
        dentist.metadata?.services?.some(s =>
          s.toLowerCase().includes(selectedService.toLowerCase())
        )
      );
    }

    setFilteredDentists(filtered);
  }, [searchQuery, selectedService, dentists]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDentists();
    if (!isMounted()) return;
    setRefreshing(false);
  }, []);

  // Generate dates for the next 7 days
  const getAvailableDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: date.toLocaleString('default', { month: 'short' }),
    };
  };

  const openBookingModal = (dentist: DentistStore) => {
    setSelectedDentist(dentist);
    setSelectedDate(new Date());
    setSelectedSlot(null);
    setSelectedServiceType('');
    setBookingNotes('');
    setBookingModalVisible(true);
  };

  const handleBookAppointment = async () => {
    if (!selectedSlot) {
      platformAlertSimple('Select Time', 'Please select a time slot');
      return;
    }
    if (!selectedServiceType) {
      platformAlertSimple('Select Service', 'Please select the service you need');
      return;
    }

    try {
      setIsBooking(true);

      const bookingData = {
        storeId: selectedDentist?._id,
        serviceType: 'dental_consultation',
        appointmentDate: selectedDate.toISOString().split('T')[0],
        appointmentTime: selectedSlot,
        service: selectedServiceType,
        notes: bookingNotes,
      };

      const response = await apiClient.post('/consultations/book', bookingData);

      if (response.success) {
        platformAlertConfirm(
          'Appointment Booked!',
          `Your dental appointment with ${selectedDentist?.name} is confirmed for ${formatDate(selectedDate).day}, ${formatDate(selectedDate).date} ${formatDate(selectedDate).month} at ${selectedSlot}.`,
          () => setBookingModalVisible(false),
          'OK'
        );
      } else {
        throw new Error(response.message || 'Failed to book appointment');
      }
    } catch (error: any) {
      platformAlertSimple('Booking Failed', error.message || 'Could not book appointment. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsBooking(false);
    }
  };

  const callDentist = (phone?: string) => {
    if (phone) {
      try { Linking.openURL(`tel:${phone}`); } catch (_e) { /* silently handle */ }
    } else {
      platformAlertSimple('Not Available', 'Phone number not available for this dentist.');
    }
  };

  // Render service card
  const renderServiceCard = (service: DentalService) => {
    const isSelected = selectedService === service.id;
    return (
      <Pressable
        key={service.id}
        style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
        onPress={() => setSelectedService(isSelected ? null : service.id)}
      >
        <View style={[styles.serviceIcon, isSelected && styles.serviceIconSelected]}>
          <Ionicons
            name={service.icon as any}
            size={24}
            color={isSelected ? Colors.text.inverse : colors.brand.cyan}
          />
        </View>
        <Text style={[styles.serviceName, isSelected && styles.serviceNameSelected]}>
          {service.name}
        </Text>
        <Text style={styles.servicePrice}>{service.priceRange}</Text>
      </Pressable>
    );
  };

  // Render dentist card
  const renderDentistCard = (dentist: DentistStore) => (
    <Pressable
      key={dentist._id}
      style={styles.dentistCard}
      onPress={() => openBookingModal(dentist)}
    >
      <View style={styles.dentistHeader}>
        <View style={styles.dentistImageContainer}>
          {dentist.logo ? (
            <CachedImage source={dentist.logo} style={styles.dentistImage} />
          ) : (
            <View style={styles.dentistImagePlaceholder}>
              <Ionicons name="person" size={32} color={colors.brand.cyan} />
            </View>
          )}
        </View>
        <View style={styles.dentistInfo}>
          <Text style={styles.dentistName}>{dentist.name}</Text>
          <Text style={styles.dentistSpecialty}>
            {dentist.metadata?.qualification || 'BDS, MDS'}
          </Text>
          <Text style={styles.dentistExperience}>
            {dentist.metadata?.experience || '5+ years experience'}
          </Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color={Colors.warning} />
            <Text style={styles.ratingText}>
              {dentist.ratings.average.toFixed(1)} ({dentist.ratings.count} reviews)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.dentistDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={Colors.text.tertiary} />
          <Text style={styles.detailText}>
            {dentist.address.city}, {dentist.address.state}
          </Text>
        </View>
        {dentist.metadata?.consultationFee && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={Colors.text.tertiary} />
            <Text style={styles.detailText}>
              Consultation: Rs {dentist.metadata.consultationFee}
            </Text>
          </View>
        )}
        {dentist.metadata?.languages && dentist.metadata.languages.length > 0 && (
          <View style={styles.detailRow}>
            <Ionicons name="chatbubbles-outline" size={16} color={Colors.text.tertiary} />
            <Text style={styles.detailText}>
              {dentist.metadata.languages.join(', ')}
            </Text>
          </View>
        )}
      </View>

      {dentist.metadata?.services && dentist.metadata.services.length > 0 && (
        <View style={styles.servicesContainer}>
          {dentist.metadata.services.slice(0, 4).map((service, index) => (
            <View key={index} style={styles.serviceTag}>
              <Text style={styles.serviceTagText}>{service}</Text>
            </View>
          ))}
          {dentist.metadata.services.length > 4 && (
            <View style={styles.serviceTag}>
              <Text style={styles.serviceTagText}>+{dentist.metadata.services.length - 4}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.cardActions}>
        <Pressable
          style={styles.callButton}
          onPress={() => callDentist(dentist.contact.phone)}
        >
          <Ionicons name="call-outline" size={18} color={colors.brand.cyan} />
          <Text style={styles.callButtonText}>Call</Text>
        </Pressable>
        <Pressable
          style={styles.bookButton}
          onPress={() => openBookingModal(dentist)}
        >
          <Ionicons name="calendar-outline" size={18} color={Colors.text.inverse} />
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[colors.brand.cyan, colors.cyanDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Dental Care</Text>
            <Text style={styles.headerSubtitle}>Find dentists near you</Text>
          </View>
          <Pressable style={styles.filterButton}>
            <Ionicons name="options-outline" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dentists, services..."
            placeholderTextColor={Colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand.cyan]} />
        }
      >
        {/* Dental Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dental Services</Text>
          <Text style={styles.sectionSubtitle}>Select a service to filter dentists</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesScroll}
          >
            {dentalServices.map(renderServiceCard)}
          </ScrollView>
        </View>

        {/* Dentists List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Dentists</Text>
            <Text style={styles.resultCount}>{filteredDentists.length} found</Text>
          </View>

          {loading ? (
            <CardGridSkeleton />
          ) : filteredDentists.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="medical-outline" size={64} color={Colors.border.default} />
              <Text style={styles.emptyText}>No dentists found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery || selectedService
                  ? 'Try adjusting your search or filters'
                  : 'Check back later for available dentists'}
              </Text>
            </View>
          ) : (
            filteredDentists.map(renderDentistCard)
          )}
        </View>

        {/* Dental Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dental Health Tips</Text>
          <View style={styles.tipsCard}>
            <View style={styles.tipItem}>
              <View style={styles.tipIcon}>
                <Ionicons name="time-outline" size={20} color={colors.brand.cyan} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Brush Twice Daily</Text>
                <Text style={styles.tipText}>Brush for 2 minutes, morning and night</Text>
              </View>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipIcon}>
                <Ionicons name="water-outline" size={20} color={colors.brand.cyan} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Floss Daily</Text>
                <Text style={styles.tipText}>Clean between teeth to prevent decay</Text>
              </View>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipIcon}>
                <Ionicons name="calendar-outline" size={20} color={colors.brand.cyan} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Regular Checkups</Text>
                <Text style={styles.tipText}>Visit your dentist every 6 months</Text>
              </View>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipIcon}>
                <Ionicons name="nutrition-outline" size={20} color={colors.brand.cyan} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Limit Sugar</Text>
                <Text style={styles.tipText}>Reduce sugary foods and drinks</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Booking Modal */}
      <Modal
        visible={bookingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Appointment</Text>
              <Pressable onPress={() => setBookingModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.neutral[700]} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedDentist && (
                <View style={styles.selectedDentistInfo}>
                  <View style={styles.dentistImageSmall}>
                    {selectedDentist.logo ? (
                      <CachedImage source={selectedDentist.logo} style={styles.dentistImageSmallImg} />
                    ) : (
                      <Ionicons name="person" size={24} color={colors.brand.cyan} />
                    )}
                  </View>
                  <View>
                    <Text style={styles.selectedDentistName}>{selectedDentist.name}</Text>
                    <Text style={styles.selectedDentistSpec}>
                      {selectedDentist.metadata?.qualification || 'Dentist'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Service Selection */}
              <Text style={styles.modalSectionTitle}>Select Service</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {dentalServices.map((service) => (
                  <Pressable
                    key={service.id}
                    style={[
                      styles.serviceChip,
                      selectedServiceType === service.name && styles.serviceChipSelected,
                    ]}
                    onPress={() => setSelectedServiceType(service.name)}
                  >
                    <Text
                      style={[
                        styles.serviceChipText,
                        selectedServiceType === service.name && styles.serviceChipTextSelected,
                      ]}
                    >
                      {service.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Date Selection */}
              <Text style={styles.modalSectionTitle}>Select Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {getAvailableDates().map((date, index) => {
                  const formatted = formatDate(date);
                  const isSelected = date.toDateString() === selectedDate.toDateString();
                  return (
                    <Pressable
                      key={index}
                      style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text style={[styles.dateDay, isSelected && styles.dateTextSelected]}>
                        {formatted.day}
                      </Text>
                      <Text style={[styles.dateNumber, isSelected && styles.dateTextSelected]}>
                        {formatted.date}
                      </Text>
                      <Text style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>
                        {formatted.month}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Time Slots */}
              <Text style={styles.modalSectionTitle}>Select Time</Text>
              <View style={styles.slotsGrid}>
                {timeSlots.map((slot, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.slotButton,
                      !slot.available && styles.slotUnavailable,
                      selectedSlot === slot.time && styles.slotSelected,
                    ]}
                    disabled={!slot.available}
                    onPress={() => setSelectedSlot(slot.time)}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        !slot.available && styles.slotTextUnavailable,
                        selectedSlot === slot.time && styles.slotTextSelected,
                      ]}
                    >
                      {slot.time}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Notes */}
              <Text style={styles.modalSectionTitle}>Additional Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Describe your dental issue or concern..."
                placeholderTextColor={Colors.text.tertiary}
                multiline
                numberOfLines={3}
                value={bookingNotes}
                onChangeText={setBookingNotes}
              />

              {/* Consultation Fee */}
              {selectedDentist?.metadata?.consultationFee && (
                <View style={styles.feeContainer}>
                  <Text style={styles.feeLabel}>Consultation Fee</Text>
                  <Text style={styles.feeAmount}>Rs {selectedDentist.metadata.consultationFee}</Text>
                </View>
              )}

              {/* Book Button */}
              <Pressable
                style={[styles.confirmButton, isBooking && styles.confirmButtonDisabled]}
                onPress={handleBookAppointment}
                disabled={isBooking}
              >
                {isBooking ? (
                  <ActivityIndicator color={Colors.text.inverse} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.text.inverse} />
                    <Text style={styles.confirmButtonText}>Confirm Appointment</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginTop: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 15,
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingVertical: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    paddingHorizontal: Spacing.base,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.text.tertiary,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  resultCount: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  servicesScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  serviceCard: {
    width: 110,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  serviceCardSelected: {
    borderColor: colors.brand.cyan,
    backgroundColor: '#ECFEFF',
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  serviceIconSelected: {
    backgroundColor: colors.brand.cyan,
  },
  serviceName: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: colors.neutral[700],
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  serviceNameSelected: {
    color: colors.cyanDark,
  },
  servicePrice: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: Spacing['3xl'],
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    padding: Spacing['3xl'],
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: colors.neutral[700],
    marginTop: Spacing.base,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  dentistCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    padding: Spacing.base,
    ...Shadows.medium,
  },
  dentistHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  dentistImageContainer: {
    marginRight: Spacing.md,
  },
  dentistImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  dentistImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dentistInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  dentistName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  dentistSpecialty: {
    fontSize: 13,
    color: colors.brand.cyan,
    marginTop: 2,
  },
  dentistExperience: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  ratingText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginLeft: Spacing.xs,
  },
  dentistDetails: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.background.secondary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginLeft: Spacing.sm,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.md,
    gap: 6,
  },
  serviceTag: {
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  serviceTagText: {
    fontSize: 11,
    color: colors.cyanDark,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: colors.brand.cyan,
  },
  callButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: colors.brand.cyan,
    marginLeft: 6,
  },
  bookButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.brand.cyan,
  },
  bookButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
    marginLeft: 6,
  },
  tipsCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  tipTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  tipText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  bottomPadding: {
    height: 40,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '90%',
    paddingBottom: 120,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  selectedDentistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.background.secondary,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
  },
  dentistImageSmall: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  dentistImageSmallImg: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
  },
  selectedDentistName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  selectedDentistSpec: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[700],
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.base,
    marginBottom: Spacing.md,
  },
  serviceChip: {
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    marginLeft: Spacing.base,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  serviceChipSelected: {
    backgroundColor: '#ECFEFF',
    borderColor: colors.brand.cyan,
  },
  serviceChipText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  serviceChipTextSelected: {
    color: colors.cyanDark,
  },
  dateCard: {
    width: 60,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    marginLeft: Spacing.base,
  },
  dateCardSelected: {
    backgroundColor: colors.brand.cyan,
  },
  dateDay: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  dateNumber: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginVertical: 2,
  },
  dateMonth: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  dateTextSelected: {
    color: Colors.text.inverse,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  slotButton: {
    width: (width - 48 - 24) / 4,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  slotUnavailable: {
    backgroundColor: Colors.border.default,
  },
  slotSelected: {
    backgroundColor: colors.brand.cyan,
  },
  slotText: {
    ...Typography.bodySmall,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  slotTextUnavailable: {
    color: Colors.text.tertiary,
  },
  slotTextSelected: {
    color: Colors.text.inverse,
  },
  notesInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: 14,
    marginHorizontal: Spacing.base,
    ...Typography.body,
    color: Colors.text.primary,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: '#ECFEFF',
    borderRadius: BorderRadius.md,
  },
  feeLabel: {
    ...Typography.body,
    color: colors.neutral[700],
  },
  feeAmount: {
    ...Typography.h4,
    fontWeight: '700',
    color: colors.cyanDark,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.cyan,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.text.tertiary,
  },
  confirmButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
    marginLeft: Spacing.sm,
  },
});

export default withErrorBoundary(DentalCarePage, 'HealthcareDental');
