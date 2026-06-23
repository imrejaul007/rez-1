// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Lab Tests Page
 * Browse and book diagnostic lab tests
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '@/services/apiClient';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { useGetCurrencySymbol } from '@/stores/selectors';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
interface LabTest {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number;
  images: string[];
  tags: string[];
  serviceDetails: {
    preparationNeeded: boolean;
    fastingHours?: number;
    reportTime: string;
    testsIncluded?: number;
  };
  metadata: {
    testCategory: string;
  };
  cashbackPercentage: number;
  rating: {
    average: number;
    count: number;
  };
}

interface LabProvider {
  _id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  metadata: {
    testsCount: number;
    homeCollection: boolean;
    discount: number;
    nabl: boolean;
    reportTime: string;
  };
  rating: {
    average: number;
    count: number;
  };
}

// Test category icons
const testCategories = [
  { id: 'all', name: 'All Tests', icon: '🔬', color: Colors.brand.purple },
  { id: 'blood', name: 'Blood', icon: '🩸', color: Colors.error },
  { id: 'thyroid', name: 'Thyroid', icon: '🦋', color: Colors.info },
  { id: 'diabetes', name: 'Diabetes', icon: '💉', color: Colors.warning },
  { id: 'liver', name: 'Liver', icon: '🫀', color: colors.tealGreen },
  { id: 'kidney', name: 'Kidney', icon: '🫘', color: Colors.success },
  { id: 'package', name: 'Packages', icon: '📦', color: Colors.brand.purple },
];

const LabTestsPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [providers, setProviders] = useState<LabProvider[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<LabProvider | null>(null);
  const [bookingForm, setBookingForm] = useState({
    patientName: '',
    patientPhone: '',
    address: '',
    preferredDate: '',
    preferredTime: 'morning',
    homeCollection: true,
  });

  useEffect(() => {
    fetchLabData();
  }, [selectedCategory]);

  const fetchLabData = async () => {
    try {
      setLoading(true);

      // Fetch lab tests (products with type 'service' and lab-test tag)
      const testsResponse = await apiClient.get('/products', {
        params: {
          productType: 'service',
          tags: selectedCategory === 'all' ? 'lab-test' : `lab-test,${selectedCategory}`,
          limit: 50,
        }
      });

      // Fetch lab providers (stores with metadata.type = 'lab')
      const providersResponse = await apiClient.get('/stores', {
        params: {
          tags: 'lab',
          limit: 20,
        }
      });

      if (testsResponse.success && testsResponse.data) {
        if (!isMounted()) return;
        setTests(testsResponse.data.products || []);
      }

      if (providersResponse.success && providersResponse.data) {
        if (!isMounted()) return;
        setProviders(providersResponse.data.stores || []);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Filter tests by search query
    if (searchQuery.trim()) {
      const filtered = tests.filter(
        (test) =>
          test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          test.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setTests(filtered);
    } else {
      fetchLabData();
    }
  };

  const handleBookTest = (test: LabTest) => {
    setSelectedTest(test);
    setShowBookingModal(true);
  };

  const [isBooking, setIsBooking] = useState(false);

  const handleConfirmBooking = async () => {
    if (!bookingForm.patientName.trim()) {
      platformAlertSimple('Error', 'Please enter patient name');
      return;
    }
    if (!bookingForm.patientPhone.trim()) {
      platformAlertSimple('Error', 'Please enter phone number');
      return;
    }

    try {
      setIsBooking(true);
      const serviceAppointmentApi = (await import('@/services/serviceAppointmentApi')).default;
      const res = await serviceAppointmentApi.createServiceAppointment({
        storeId: selectedProvider?._id || selectedProvider?.slug,
        serviceType: 'lab-test',
        appointmentDate: bookingForm.preferredDate || new Date().toISOString().split('T')[0],
        appointmentTime: bookingForm.preferredTime === 'morning' ? '08:00' : bookingForm.preferredTime === 'afternoon' ? '11:00' : '15:00',
        duration: 30,
        customerName: bookingForm.patientName.trim(),
        customerPhone: bookingForm.patientPhone.trim(),
        specialInstructions: `${selectedTest?.name || 'Lab Test'}${bookingForm.homeCollection ? ' (Home Collection)' : ' (Lab Visit)'}${bookingForm.address ? `. Address: ${bookingForm.address}` : ''}`,
      });

      if (res.success) {
        setShowBookingModal(false);
        platformAlertSimple('Booked!', `Your ${selectedTest?.name || 'lab test'} has been booked. Appointment: ${(res as any).data?.appointmentNumber || 'Confirmed'}`);
      } else {
        platformAlertSimple('Booking Failed', (res as any).error || 'Could not book. Please try again.');
      }
    } catch (err: any) {
      platformAlertSimple('Error', err?.message || 'Something went wrong');
    } finally {
      setIsBooking(false);
    }
  };

  const renderCategoryFilters = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryScroll}
      contentContainerStyle={styles.categoryContainer}
    >
      {testCategories.map((category) => (
        <Pressable
          key={category.id}
          style={[
            styles.categoryChip,
            selectedCategory === category.id && { backgroundColor: category.color },
          ]}
          onPress={() => setSelectedCategory(category.id)}
        >
          <Text style={styles.categoryIcon}>{category.icon}</Text>
          <Text
            style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextActive,
            ]}
          >
            {category.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderPopularPackages = () => {
    const packages = tests.filter((t) => t.metadata?.testCategory === 'Package').slice(0, 4);
    if (packages.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Health Packages</Text>
          <Pressable onPress={() => setSelectedCategory('package')}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {packages.map((pkg) => (
            <Pressable
              key={pkg._id}
              style={styles.packageCard}
              onPress={() => handleBookTest(pkg)}
            >
              <LinearGradient
                colors={[Colors.brand.purple, Colors.brand.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.packageGradient}
              >
                <View style={styles.packageBadge}>
                  <Text style={styles.packageBadgeText}>
                    {pkg.serviceDetails?.testsIncluded || 0} Tests
                  </Text>
                </View>
                <Text style={styles.packageName}>{pkg.name}</Text>
                <Text style={styles.packageDescription} numberOfLines={2}>
                  {pkg.description}
                </Text>
                <View style={styles.packagePricing}>
                  <Text style={styles.packagePrice}>{currencySymbol}{pkg.price}</Text>
                  {pkg.originalPrice > pkg.price && (
                    <Text style={styles.packageOriginalPrice}>{currencySymbol}{pkg.originalPrice}</Text>
                  )}
                </View>
                <View style={styles.packageCashback}>
                  <Text style={styles.packageCashbackText}>
                    {pkg.cashbackPercentage}% Cashback
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderLabProviders = () => {
    if (providers.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trusted Lab Partners</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {providers.map((provider) => (
            <Pressable
              key={provider._id}
              style={styles.providerCard}
              onPress={() => setSelectedProvider(provider)}
            >
              <CachedImage source={provider.logo} style={styles.providerLogo} />
              <Text style={styles.providerName}>{provider.name}</Text>
              <View style={styles.providerMeta}>
                <View style={styles.providerRating}>
                  <Ionicons name="star" size={12} color={Colors.warning} />
                  <Text style={styles.providerRatingText}>
                    {provider.rating?.average?.toFixed(1) || '4.5'}
                  </Text>
                </View>
                {provider.metadata?.nabl && (
                  <View style={styles.nablBadge}>
                    <Text style={styles.nablText}>NABL</Text>
                  </View>
                )}
              </View>
              {provider.metadata?.homeCollection && (
                <Text style={styles.homeCollectionText}>🏠 Home Collection</Text>
              )}
              <Text style={styles.providerDiscount}>
                Up to {provider.metadata?.discount || 20}% Off
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTestCard = (test: LabTest) => {
    const category = test.metadata?.testCategory || 'Other';

    return (
      <Pressable
        key={test._id}
        style={styles.testCard}
        onPress={() => handleBookTest(test)}
      >
        <View style={styles.testCardContent}>
          <View style={styles.testInfo}>
            <View style={styles.testHeader}>
              <Text style={styles.testName}>{test.name}</Text>
              {test.cashbackPercentage > 0 && (
                <View style={styles.cashbackBadge}>
                  <Text style={styles.cashbackText}>{test.cashbackPercentage}%</Text>
                </View>
              )}
            </View>
            <Text style={styles.testCategory}>{category}</Text>
            <Text style={styles.testDescription} numberOfLines={2}>
              {test.description}
            </Text>
            <View style={styles.testMeta}>
              {test.serviceDetails?.preparationNeeded && (
                <View style={styles.metaTag}>
                  <Ionicons name="moon" size={12} color={Colors.warning} />
                  <Text style={styles.metaTagText}>
                    Fasting {test.serviceDetails.fastingHours || 8}hrs
                  </Text>
                </View>
              )}
              <View style={styles.metaTag}>
                <Ionicons name="time" size={12} color={Colors.info} />
                <Text style={styles.metaTagText}>
                  {test.serviceDetails?.reportTime || '24-48 hrs'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.testPricing}>
            <Text style={styles.testPrice}>{currencySymbol}{test.price}</Text>
            {test.originalPrice > test.price && (
              <Text style={styles.testOriginalPrice}>{currencySymbol}{test.originalPrice}</Text>
            )}
            <Pressable
              style={styles.bookButton}
              onPress={() => handleBookTest(test)}
            >
              <Text style={styles.bookButtonText}>Book</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderBookingModal = () => (
    <Modal visible={showBookingModal} animationType="slide" transparent onRequestClose={() => setShowBookingModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Book Test</Text>
            <Pressable onPress={() => setShowBookingModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text.tertiary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            {selectedTest && (
              <View style={styles.selectedTestInfo}>
                <Text style={styles.selectedTestName}>{selectedTest.name}</Text>
                <View style={styles.selectedTestPricing}>
                  <Text style={styles.selectedTestPrice}>{currencySymbol}{selectedTest.price}</Text>
                  {selectedTest.cashbackPercentage > 0 && (
                    <Text style={styles.selectedTestCashback}>
                      + {currencySymbol}{Math.round(selectedTest.price * selectedTest.cashbackPercentage / 100)} Cashback
                    </Text>
                  )}
                </View>
                {selectedTest.serviceDetails?.preparationNeeded && (
                  <View style={styles.prepWarning}>
                    <Ionicons name="warning" size={16} color={Colors.warning} />
                    <Text style={styles.prepWarningText}>
                      Requires {selectedTest.serviceDetails.fastingHours || 8} hours fasting
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Patient Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter patient name"
                value={bookingForm.patientName}
                onChangeText={(text) => setBookingForm({ ...bookingForm, patientName: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone Number *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                value={bookingForm.patientPhone}
                onChangeText={(text) => setBookingForm({ ...bookingForm, patientPhone: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Collection Address *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Enter complete address"
                multiline
                numberOfLines={3}
                value={bookingForm.address}
                onChangeText={(text) => setBookingForm({ ...bookingForm, address: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Preferred Time Slot</Text>
              <View style={styles.timeSlots}>
                {[
                  { id: 'morning', label: '6AM-10AM', icon: '🌅' },
                  { id: 'afternoon', label: '10AM-2PM', icon: '☀️' },
                  { id: 'evening', label: '2PM-6PM', icon: '🌆' },
                ].map((slot) => (
                  <Pressable
                    key={slot.id}
                    style={[
                      styles.timeSlot,
                      bookingForm.preferredTime === slot.id && styles.timeSlotActive,
                    ]}
                    onPress={() => setBookingForm({ ...bookingForm, preferredTime: slot.id })}
                  >
                    <Text style={styles.timeSlotIcon}>{slot.icon}</Text>
                    <Text
                      style={[
                        styles.timeSlotText,
                        bookingForm.preferredTime === slot.id && styles.timeSlotTextActive,
                      ]}
                    >
                      {slot.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.collectionToggle}>
              <Pressable
                style={[
                  styles.collectionOption,
                  bookingForm.homeCollection && styles.collectionOptionActive,
                ]}
                onPress={() => setBookingForm({ ...bookingForm, homeCollection: true })}
              >
                <Ionicons
                  name="home"
                  size={20}
                  color={bookingForm.homeCollection ? Colors.background.primary : Colors.text.tertiary}
                />
                <Text
                  style={[
                    styles.collectionOptionText,
                    bookingForm.homeCollection && styles.collectionOptionTextActive,
                  ]}
                >
                  Home Collection
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.collectionOption,
                  !bookingForm.homeCollection && styles.collectionOptionActive,
                ]}
                onPress={() => setBookingForm({ ...bookingForm, homeCollection: false })}
              >
                <Ionicons
                  name="business"
                  size={20}
                  color={!bookingForm.homeCollection ? Colors.background.primary : Colors.text.tertiary}
                />
                <Text
                  style={[
                    styles.collectionOptionText,
                    !bookingForm.homeCollection && styles.collectionOptionTextActive,
                  ]}
                >
                  Visit Lab
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>{currencySymbol}{selectedTest?.price || 0}</Text>
            </View>
            <Pressable style={[styles.confirmButton, isBooking && { opacity: 0.6 }]} onPress={handleConfirmBooking} disabled={isBooking}>
              <Text style={styles.confirmButtonText}>{isBooking ? 'Booking...' : 'Confirm Booking'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <CardGridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.brand.purple, Colors.brand.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Lab Tests</Text>
            <Text style={styles.headerSubtitle}>Book diagnostic tests with cashback</Text>
          </View>
          <Pressable style={styles.cartButton}>
            <Ionicons name="cart-outline" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tests, packages..."
            placeholderTextColor={Colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>
      </LinearGradient>

      {renderCategoryFilters()}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {selectedCategory === 'all' && (
          <>
            {renderPopularPackages()}
            {renderLabProviders()}
          </>
        )}

        <View style={styles.testsSection}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all' ? 'All Tests' : testCategories.find(c => c.id === selectedCategory)?.name || 'Tests'}
          </Text>
          {tests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔬</Text>
              <Text style={styles.emptyText}>No tests found</Text>
            </View>
          ) : (
            tests.map(renderTestCard)
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {renderBookingModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, fontSize: Typography.body.fontSize, color: Colors.text.tertiary },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: Spacing.base },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  backButton: { padding: Spacing.sm },
  headerTitleContainer: { flex: 1, marginLeft: Spacing.sm },
  headerTitle: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.text.inverse },
  headerSubtitle: { fontSize: Typography.bodySmall.fontSize, color: 'rgba(255,255,255,0.8)' },
  cartButton: { padding: Spacing.sm },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.primary, marginHorizontal: Spacing.base, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: Spacing.sm, fontSize: Typography.body.fontSize, color: Colors.nileBlue },

  categoryScroll: { backgroundColor: Colors.background.secondary },
  categoryContainer: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md},
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: Spacing.sm, marginRight: Spacing.sm, borderRadius: BorderRadius.xl, backgroundColor: Colors.background.primary, borderWidth: 1, borderColor: Colors.border.default },
  categoryIcon: { fontSize: Typography.bodyLarge.fontSize, marginRight: 6 },
  categoryText: { fontSize: Typography.bodySmall.fontSize, fontWeight: '500', color: Colors.text.tertiary },
  categoryTextActive: { color: Colors.text.inverse },

  section: { padding: Spacing.base },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.h4.fontSize, fontWeight: '700', color: Colors.nileBlue, marginBottom: Spacing.md },
  viewAllText: { fontSize: Typography.body.fontSize, fontWeight: '600', color: Colors.brand.purple },

  packageCard: { width: 220, marginRight: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  packageGradient: { padding: Spacing.base, minHeight: 160 },
  packageBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  packageBadgeText: { fontSize: Typography.caption.fontSize, fontWeight: '600', color: Colors.text.inverse },
  packageName: { fontSize: Typography.bodyLarge.fontSize, fontWeight: '700', color: Colors.text.inverse, marginBottom: Spacing.xs },
  packageDescription: { fontSize: Typography.bodySmall.fontSize, color: 'rgba(255,255,255,0.8)', marginBottom: Spacing.md },
  packagePricing: { flexDirection: 'row', alignItems: 'center' },
  packagePrice: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.text.inverse },
  packageOriginalPrice: { fontSize: Typography.body.fontSize, color: 'rgba(255,255,255,0.6)', marginLeft: Spacing.sm, textDecorationLine: 'line-through' },
  packageCashback: { marginTop: Spacing.sm },
  packageCashbackText: { fontSize: Typography.bodySmall.fontSize, fontWeight: '600', color: Colors.warning },

  providerCard: { width: 140, padding: Spacing.md, marginRight: Spacing.md, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border.default, alignItems: 'center' },
  providerLogo: { width: 60, height: 60, borderRadius: 30, marginBottom: Spacing.sm, backgroundColor: Colors.background.secondary },
  providerName: { fontSize: Typography.bodySmall.fontSize, fontWeight: '600', color: Colors.nileBlue, textAlign: 'center', marginBottom: Spacing.xs },
  providerMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  providerRating: { flexDirection: 'row', alignItems: 'center' },
  providerRatingText: { fontSize: Typography.bodySmall.fontSize, fontWeight: '500', color: Colors.text.tertiary, marginLeft: 2 },
  nablBadge: { backgroundColor: Colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 },
  nablText: { fontSize: 9, fontWeight: '700', color: Colors.text.inverse },
  homeCollectionText: { fontSize: Typography.overline.fontSize, color: Colors.text.tertiary, marginBottom: Spacing.xs },
  providerDiscount: { fontSize: Typography.caption.fontSize, fontWeight: '600', color: Colors.success },

  testsSection: { padding: Spacing.base },
  testCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border.default, overflow: 'hidden' },
  testCardContent: { flexDirection: 'row', padding: Spacing.md },
  testInfo: { flex: 1 },
  testHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  testName: { fontSize: Typography.body.fontSize, fontWeight: '600', color: Colors.nileBlue, flex: 1 },
  cashbackBadge: { backgroundColor: Colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: Spacing.sm },
  cashbackText: { fontSize: Typography.overline.fontSize, fontWeight: '700', color: Colors.text.inverse },
  testCategory: { fontSize: Typography.caption.fontSize, color: Colors.brand.purple, marginTop: 2 },
  testDescription: { fontSize: Typography.bodySmall.fontSize, color: Colors.text.tertiary, marginTop: Spacing.xs },
  testMeta: { flexDirection: 'row', marginTop: Spacing.sm, gap: Spacing.sm },
  metaTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.secondary, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  metaTagText: { fontSize: Typography.overline.fontSize, color: Colors.text.tertiary, marginLeft: Spacing.xs },
  testPricing: { alignItems: 'flex-end', justifyContent: 'space-between' },
  testPrice: { fontSize: Typography.h4.fontSize, fontWeight: '700', color: Colors.nileBlue },
  testOriginalPrice: { fontSize: Typography.bodySmall.fontSize, color: Colors.text.tertiary, textDecorationLine: 'line-through' },
  bookButton: { backgroundColor: Colors.brand.purple, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, marginTop: Spacing.sm },
  bookButtonText: { fontSize: Typography.bodySmall.fontSize, fontWeight: '600', color: Colors.text.inverse },

  emptyState: { alignItems: 'center', padding: Spacing['2xl'] },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { fontSize: Typography.body.fontSize, color: Colors.text.tertiary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border.default },
  modalTitle: { fontSize: Typography.h4.fontSize, fontWeight: '700', color: Colors.nileBlue },
  modalBody: { padding: Spacing.base },
  modalFooter: { padding: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border.default },

  selectedTestInfo: { backgroundColor: Colors.brand.purple + '10', padding: Spacing.base, borderRadius: BorderRadius.md, marginBottom: Spacing.base },
  selectedTestName: { fontSize: Typography.bodyLarge.fontSize, fontWeight: '600', color: Colors.nileBlue },
  selectedTestPricing: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs },
  selectedTestPrice: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.brand.purple },
  selectedTestCashback: { fontSize: Typography.bodySmall.fontSize, color: Colors.success, marginLeft: Spacing.sm },
  prepWarning: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, backgroundColor: Colors.warning + '20', padding: Spacing.sm, borderRadius: BorderRadius.sm },
  prepWarningText: { fontSize: Typography.bodySmall.fontSize, color: Colors.warning, marginLeft: 6 },

  formGroup: { marginBottom: Spacing.base },
  formLabel: { fontSize: Typography.bodySmall.fontSize, fontWeight: '600', color: Colors.nileBlue, marginBottom: Spacing.sm },
  formInput: { borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: Typography.body.fontSize, color: Colors.nileBlue },
  formTextArea: { height: 80, textAlignVertical: 'top' },

  timeSlots: { flexDirection: 'row', justifyContent: 'space-between' },
  timeSlot: { flex: 1, alignItems: 'center', padding: Spacing.md, marginHorizontal: Spacing.xs, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md },
  timeSlotActive: { backgroundColor: Colors.brand.purple },
  timeSlotIcon: { fontSize: Typography.h3.fontSize, marginBottom: Spacing.xs },
  timeSlotText: { fontSize: Typography.caption.fontSize, color: Colors.text.tertiary },
  timeSlotTextActive: { color: Colors.text.inverse },

  collectionToggle: { flexDirection: 'row', marginTop: Spacing.sm },
  collectionOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, backgroundColor: Colors.background.secondary, marginHorizontal: Spacing.xs, borderRadius: BorderRadius.md },
  collectionOptionActive: { backgroundColor: Colors.brand.purple },
  collectionOptionText: { fontSize: Typography.bodySmall.fontSize, color: Colors.text.tertiary, marginLeft: Spacing.sm },
  collectionOptionTextActive: { color: Colors.text.inverse },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base },
  totalLabel: { fontSize: Typography.body.fontSize, color: Colors.text.tertiary },
  totalValue: { fontSize: Typography.h2.fontSize, fontWeight: '700', color: Colors.nileBlue },
  confirmButton: { backgroundColor: Colors.brand.purple, padding: Spacing.base, borderRadius: BorderRadius.md, alignItems: 'center' },
  confirmButtonText: { fontSize: Typography.bodyLarge.fontSize, fontWeight: '700', color: Colors.text.inverse },
});

export default withErrorBoundary(LabTestsPage, 'HealthcareLab');
