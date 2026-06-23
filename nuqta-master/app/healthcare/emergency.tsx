import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Emergency 24x7 Page
 * Provides emergency contacts and ambulance booking functionality
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
  Linking,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import emergencyApi, { EmergencyContact, EmergencyBooking } from '@/services/emergencyApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLORS = {
  white: Colors.background.primary,
  navy: colors.brand.navyDark,
  gray50: Colors.background.secondary,
  gray100: Colors.background.secondary,
  gray200: Colors.border.default,
  gray600: Colors.text.tertiary,
  gray800: Colors.text.primary,
  red500: Colors.error,
  red600: Colors.errorScale[700],
  green500: Colors.success,
  blue500: Colors.info,
  amber500: Colors.warning,
  purple500: Colors.brand.purpleLight,
};

// Emergency contact type icons mapping
const typeIcons: Record<string, { icon: string; color: string; label: string }> = {
  ambulance: { icon: '🚑', color: colors.error, label: 'Ambulance' },
  hospital: { icon: '🏥', color: colors.infoScale[400], label: 'Hospital' },
  blood_bank: { icon: '🩸', color: colors.error, label: 'Blood Bank' },
  fire: { icon: '🚒', color: colors.brand.orange, label: 'Fire' },
  police: { icon: '👮', color: '#1D4ED8', label: 'Police' },
  poison_control: { icon: '☠️', color: colors.brand.purple, label: 'Poison Control' },
  mental_health: { icon: '🧠', color: colors.successScale[400], label: 'Mental Health' },
  women_helpline: { icon: '👩', color: colors.brand.pink, label: 'Women Helpline' },
  child_helpline: { icon: '👶', color: colors.warningScale[400], label: 'Child Helpline' },
  disaster: { icon: '🆘', color: colors.error, label: 'Disaster' },
  covid: { icon: '🦠', color: colors.success, label: 'COVID-19' },
  other: { icon: '📞', color: colors.neutral[500], label: 'Other' },
};

// Quick call numbers
const quickCallNumbers = [
  { number: '112', label: 'Emergency', icon: '🚨', color: colors.error },
  { number: '102', label: 'Ambulance', icon: '🚑', color: colors.error },
  { number: '100', label: 'Police', icon: '👮', color: '#1D4ED8' },
  { number: '101', label: 'Fire', icon: '🚒', color: colors.brand.orange },
];

const EmergencyPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [groupedContacts, setGroupedContacts] = useState<Record<string, EmergencyContact[]>>({});
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [activeBooking, setActiveBooking] = useState<EmergencyBooking | null>(null);
  const [bookingForm, setBookingForm] = useState({
    patientName: '',
    patientPhone: '',
    patientCondition: '',
    pickupAddress: '',
    emergencyType: 'other' as EmergencyBooking['emergencyType'],
  });
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    fetchEmergencyContacts();
    checkActiveBooking();
  }, []);

  const fetchEmergencyContacts = async () => {
    try {
      setLoading(true);
      const response = await emergencyApi.getContacts();
      if (response.success && response.data) {
        if (!isMounted()) return;
        setContacts(response.data.contacts);
        if (!isMounted()) return;
        setGroupedContacts(response.data.groupedContacts);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const checkActiveBooking = async () => {
    try {
      const response = await emergencyApi.getActiveBooking();
      if (response.success && response.data?.activeBooking) {
        if (!isMounted()) return;
        setActiveBooking(response.data.activeBooking);
      }
    } catch (error) {
      // silently handle
    }
  };

  const makePhoneCall = (number: string) => {
    const phoneNumber = `tel:${number}`;
    Linking.canOpenURL(phoneNumber)
      .then((supported) => {
        if (supported) {
          try { Linking.openURL(phoneNumber); } catch (_e) { /* silently handle */ }
        } else {
          platformAlertSimple('Error', 'Phone call is not supported on this device');
        }
      })
      .catch(() => { /* silently handle */ });
  };

  const handleBookAmbulance = async () => {
    if (!bookingForm.patientName || !bookingForm.patientPhone || !bookingForm.pickupAddress) {
      platformAlertSimple('Missing Information', 'Please fill in all required fields');
      return;
    }

    try {
      setBookingLoading(true);
      const response = await emergencyApi.bookEmergency({
        serviceType: 'ambulance',
        emergencyType: bookingForm.emergencyType,
        patientName: bookingForm.patientName,
        patientPhone: bookingForm.patientPhone,
        patientCondition: bookingForm.patientCondition,
        pickupAddress: {
          address: bookingForm.pickupAddress,
        },
      });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setActiveBooking(response.data);
        if (!isMounted()) return;
        setShowBookingModal(false);
        platformAlertSimple(
          'Ambulance Booked!',
          `Booking Number: ${response.data.bookingNumber}\n\nHelp is on the way. You will receive a call shortly.`
        );
      }
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'Failed to book ambulance. Please call 102 directly.');
    } finally {
      if (!isMounted()) return;
      setBookingLoading(false);
    }
  };

  const renderQuickCallSection = () => (
    <View style={styles.quickCallSection}>
      <Text style={styles.quickCallTitle}>Quick Emergency Call</Text>
      <View style={styles.quickCallGrid}>
        {quickCallNumbers.map((item) => (
          <Pressable
            key={item.number}
            style={[styles.quickCallCard, { borderColor: item.color }]}
            onPress={() => makePhoneCall(item.number)}
           
          >
            <Text style={styles.quickCallIcon}>{item.icon}</Text>
            <Text style={styles.quickCallNumber}>{item.number}</Text>
            <Text style={styles.quickCallLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderActiveBooking = () => {
    if (!activeBooking) return null;

    return (
      <View style={styles.activeBookingCard}>
        <LinearGradient
          colors={[colors.error, colors.error]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.activeBookingGradient}
        >
          <View style={styles.activeBookingHeader}>
            <Text style={styles.activeBookingIcon}>🚑</Text>
            <View style={styles.activeBookingInfo}>
              <Text style={styles.activeBookingTitle}>Ambulance En Route</Text>
              <Text style={styles.activeBookingNumber}>#{activeBooking.bookingNumber}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.statusText}>{activeBooking.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>
          {activeBooking.assignedUnit && (
            <View style={styles.assignedUnitInfo}>
              <Text style={styles.assignedUnitText}>
                Vehicle: {activeBooking.assignedUnit.vehicleNumber || 'Assigning...'}
              </Text>
              <Pressable
                style={styles.callDriverButton}
                onPress={() => makePhoneCall(activeBooking.assignedUnit?.phone || '102')}
              >
                <Ionicons name="call" size={16} color={COLORS.white} />
                <Text style={styles.callDriverText}>Call Driver</Text>
              </Pressable>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  const renderContactsByType = (type: string) => {
    const typeContacts = groupedContacts[type] || [];
    const typeInfo = typeIcons[type] || typeIcons.other;

    return (
      <View key={type} style={styles.contactTypeSection}>
        <Pressable
          style={styles.contactTypeHeader}
          onPress={() => setSelectedType(selectedType === type ? null : type)}
        >
          <View style={[styles.contactTypeIcon, { backgroundColor: `${typeInfo.color}20` }]}>
            <Text style={styles.contactTypeEmoji}>{typeInfo.icon}</Text>
          </View>
          <Text style={styles.contactTypeTitle}>{typeInfo.label}</Text>
          <Text style={styles.contactTypeCount}>{typeContacts.length}</Text>
          <Ionicons
            name={selectedType === type ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.gray600}
          />
        </Pressable>

        {selectedType === type && (
          <View style={styles.contactsList}>
            {typeContacts.map((contact) => (
              <Pressable
                key={contact._id}
                style={styles.contactCard}
                onPress={() => makePhoneCall(contact.phoneNumbers[0])}
              >
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  {contact.description && (
                    <Text style={styles.contactDescription} numberOfLines={1}>
                      {contact.description}
                    </Text>
                  )}
                  <View style={styles.contactMeta}>
                    <Ionicons name="time-outline" size={12} color={COLORS.gray600} />
                    <Text style={styles.contactHours}>{contact.operatingHours}</Text>
                    {contact.isNational && (
                      <View style={styles.nationalBadge}>
                        <Text style={styles.nationalText}>National</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.phoneButtons}>
                  {contact.phoneNumbers.slice(0, 2).map((phone, index) => (
                    <Pressable
                      key={index}
                      style={[styles.phoneButton, { backgroundColor: typeInfo.color }]}
                      onPress={() => makePhoneCall(phone)}
                    >
                      <Ionicons name="call" size={14} color={COLORS.white} />
                      <Text style={styles.phoneButtonText}>{phone}</Text>
                    </Pressable>
                  ))}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderBookingModal = () => (
    <Modal visible={showBookingModal} animationType="slide" transparent onRequestClose={() => setShowBookingModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Book Ambulance</Text>
            <Pressable onPress={() => setShowBookingModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.gray600} />
            </Pressable>
          </View>

          <ScrollView
        style={styles.modalBody}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
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
              <Text style={styles.formLabel}>Contact Number *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                value={bookingForm.patientPhone}
                onChangeText={(text) => setBookingForm({ ...bookingForm, patientPhone: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Pickup Address *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Enter complete address with landmark"
                multiline
                numberOfLines={3}
                value={bookingForm.pickupAddress}
                onChangeText={(text) => setBookingForm({ ...bookingForm, pickupAddress: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Emergency Type</Text>
              <View style={styles.emergencyTypeGrid}>
                {(['accident', 'cardiac', 'respiratory', 'pregnancy', 'injury', 'other'] as const).map((type) => (
                  <Pressable
                    key={type}
                    style={[
                      styles.emergencyTypeButton,
                      bookingForm.emergencyType === type && styles.emergencyTypeButtonActive,
                    ]}
                    onPress={() => setBookingForm({ ...bookingForm, emergencyType: type })}
                  >
                    <Text
                      style={[
                        styles.emergencyTypeText,
                        bookingForm.emergencyType === type && styles.emergencyTypeTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Patient Condition (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Describe the condition"
                multiline
                numberOfLines={2}
                value={bookingForm.patientCondition}
                onChangeText={(text) => setBookingForm({ ...bookingForm, patientCondition: text })}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable
              style={styles.bookButton}
              onPress={handleBookAmbulance}
              disabled={bookingLoading}
            >
              {bookingLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="medical" size={20} color={COLORS.white} />
                  <Text style={styles.bookButtonText}>Book Ambulance Now</Text>
                </>
              )}
            </Pressable>
            <Text style={styles.emergencyNote}>
              For immediate help, call 102 directly
            </Text>
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
        colors={[colors.error, colors.error]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Emergency 24x7</Text>
            <Text style={styles.headerSubtitle}>Help is just a tap away</Text>
          </View>
          <Pressable
            style={styles.sosButton}
            onPress={() => makePhoneCall('112')}
          >
            <Text style={styles.sosText}>SOS</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {renderActiveBooking()}
        {renderQuickCallSection()}

        <Pressable
          style={styles.bookAmbulanceButton}
          onPress={() => setShowBookingModal(true)}
        >
          <LinearGradient
            colors={[colors.infoScale[400], colors.brand.blue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookAmbulanceGradient}
          >
            <Text style={styles.bookAmbulanceIcon}>🚑</Text>
            <View style={styles.bookAmbulanceText}>
              <Text style={styles.bookAmbulanceTitle}>Book Ambulance</Text>
              <Text style={styles.bookAmbulanceSubtitle}>Request emergency medical transport</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
          </LinearGradient>
        </Pressable>

        <View style={styles.contactsSection}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          {Object.keys(groupedContacts).map((type) => renderContactsByType(type))}
        </View>

        <View style={styles.firstAidSection}>
          <Text style={styles.sectionTitle}>Quick First Aid Tips</Text>
          <View style={styles.tipsGrid}>
            <Pressable style={styles.tipCard}>
              <Text style={styles.tipIcon}>💓</Text>
              <Text style={styles.tipTitle}>CPR</Text>
            </Pressable>
            <Pressable style={styles.tipCard}>
              <Text style={styles.tipIcon}>🩹</Text>
              <Text style={styles.tipTitle}>Wounds</Text>
            </Pressable>
            <Pressable style={styles.tipCard}>
              <Text style={styles.tipIcon}>🔥</Text>
              <Text style={styles.tipTitle}>Burns</Text>
            </Pressable>
            <Pressable style={styles.tipCard}>
              <Text style={styles.tipIcon}>😵</Text>
              <Text style={styles.tipTitle}>Choking</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {renderBookingModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  loadingText: { marginTop: Spacing.md, ...Typography.body, color: COLORS.gray600 },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  backButton: { padding: 8 },
  headerTitleContainer: { flex: 1, marginLeft: 8 },
  headerTitle: { ...Typography.h3, fontWeight: '700', color: COLORS.white },
  headerSubtitle: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)' },
  sosButton: { backgroundColor: COLORS.white, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xl },
  sosText: { ...Typography.body, fontWeight: '800', color: COLORS.red500 },

  quickCallSection: { padding: Spacing.base },
  quickCallTitle: { ...Typography.bodyLarge, fontWeight: '700', color: COLORS.navy, marginBottom: Spacing.md },
  quickCallGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickCallCard: { width: (SCREEN_WIDTH - 48) / 4, alignItems: 'center', padding: Spacing.md, backgroundColor: COLORS.white, borderRadius: BorderRadius.md, borderWidth: 2 },
  quickCallIcon: { fontSize: 24, marginBottom: 4 },
  quickCallNumber: { ...Typography.bodyLarge, fontWeight: '800', color: COLORS.navy },
  quickCallLabel: { ...Typography.overline, color: COLORS.gray600, marginTop: 2 },

  activeBookingCard: { margin: Spacing.base, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  activeBookingGradient: { padding: Spacing.base },
  activeBookingHeader: { flexDirection: 'row', alignItems: 'center' },
  activeBookingIcon: { fontSize: 32 },
  activeBookingInfo: { flex: 1, marginLeft: 12 },
  activeBookingTitle: { ...Typography.bodyLarge, fontWeight: '700', color: COLORS.white },
  activeBookingNumber: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)' },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md },
  statusText: { ...Typography.overline, fontWeight: '700', color: COLORS.white },
  assignedUnitInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  assignedUnitText: { ...Typography.bodySmall, color: COLORS.white },
  callDriverButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.lg },
  callDriverText: { ...Typography.bodySmall, fontWeight: '600', color: COLORS.white, marginLeft: Spacing.xs },

  bookAmbulanceButton: { marginHorizontal: Spacing.base, marginBottom: Spacing.base, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  bookAmbulanceGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base },
  bookAmbulanceIcon: { fontSize: 32 },
  bookAmbulanceText: { flex: 1, marginLeft: Spacing.md },
  bookAmbulanceTitle: { ...Typography.bodyLarge, fontWeight: '700', color: COLORS.white },
  bookAmbulanceSubtitle: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)' },

  contactsSection: { padding: Spacing.base },
  sectionTitle: { ...Typography.h4, fontWeight: '700', color: COLORS.navy, marginBottom: Spacing.md },
  contactTypeSection: { marginBottom: Spacing.sm },
  contactTypeHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.gray50, padding: Spacing.md, borderRadius: BorderRadius.md },
  contactTypeIcon: { width: 40, height: 40, borderRadius: BorderRadius.xl, justifyContent: 'center', alignItems: 'center' },
  contactTypeEmoji: { fontSize: 20 },
  contactTypeTitle: { flex: 1, ...Typography.body, fontWeight: '600', color: COLORS.navy, marginLeft: Spacing.md },
  contactTypeCount: { ...Typography.bodySmall, color: COLORS.gray600, marginRight: Spacing.sm },
  contactsList: { marginTop: Spacing.sm },
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: COLORS.gray200 },
  contactInfo: { flex: 1 },
  contactName: { ...Typography.body, fontWeight: '600', color: COLORS.navy },
  contactDescription: { ...Typography.bodySmall, color: COLORS.gray600, marginTop: 2 },
  contactMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  contactHours: { ...Typography.caption, color: COLORS.gray600, marginLeft: Spacing.xs },
  nationalBadge: { backgroundColor: COLORS.green500, paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.xs, marginLeft: Spacing.sm },
  nationalText: { fontSize: 9, fontWeight: '600', color: COLORS.white },
  phoneButtons: { flexDirection: 'column', gap: Spacing.xs },
  phoneButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.lg },
  phoneButtonText: { ...Typography.caption, fontWeight: '600', color: COLORS.white, marginLeft: Spacing.xs },

  firstAidSection: { padding: Spacing.base },
  tipsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  tipCard: { width: (SCREEN_WIDTH - 48) / 4, alignItems: 'center', padding: Spacing.base, backgroundColor: COLORS.gray50, borderRadius: BorderRadius.md },
  tipIcon: { fontSize: 28, marginBottom: 8 },
  tipTitle: { ...Typography.bodySmall, fontWeight: '600', color: COLORS.navy },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: BorderRadius['2xl'], borderTopRightRadius: BorderRadius['2xl'], maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: COLORS.gray200 },
  modalTitle: { ...Typography.h4, fontWeight: '700', color: COLORS.navy },
  modalBody: { padding: Spacing.base },
  modalFooter: { padding: Spacing.base, borderTopWidth: 1, borderTopColor: COLORS.gray200 },
  formGroup: { marginBottom: Spacing.base },
  formLabel: { ...Typography.bodySmall, fontWeight: '600', color: COLORS.navy, marginBottom: Spacing.sm },
  formInput: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: BorderRadius.md, padding: Spacing.md, ...Typography.body, color: COLORS.navy },
  formTextArea: { height: 80, textAlignVertical: 'top' },
  emergencyTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  emergencyTypeButton: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xl, backgroundColor: COLORS.gray100 },
  emergencyTypeButtonActive: { backgroundColor: COLORS.red500 },
  emergencyTypeText: { ...Typography.bodySmall, fontWeight: '500', color: COLORS.gray600 },
  emergencyTypeTextActive: { color: COLORS.white },
  bookButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.red500, padding: Spacing.base, borderRadius: BorderRadius.md },
  bookButtonText: { ...Typography.bodyLarge, fontWeight: '700', color: COLORS.white, marginLeft: Spacing.sm },
  emergencyNote: { ...Typography.bodySmall, color: COLORS.gray600, textAlign: 'center', marginTop: Spacing.md },
});

export default withErrorBoundary(EmergencyPage, 'HealthcareEmergency');
