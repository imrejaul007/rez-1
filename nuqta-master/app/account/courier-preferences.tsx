import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FormPageSkeleton } from '@/components/skeletons';
import apiClient from '../../services/apiClient';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface CourierPreferences {
  preferredCourier: 'any' | 'delhivery' | 'bluedart' | 'ekart' | 'dtdc' | 'fedex';
  deliveryTimePreference: {
    weekdays: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[];
    preferredTimeSlot: {
      start: string;
      end: string;
    };
    avoidWeekends: boolean;
  };
  deliveryInstructions: {
    contactlessDelivery: boolean;
    leaveAtDoor: boolean;
    signatureRequired: boolean;
    callBeforeDelivery: boolean;
    specificInstructions?: string;
  };
  alternateContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  courierNotifications: {
    smsUpdates: boolean;
    emailUpdates: boolean;
    whatsappUpdates: boolean;
    callUpdates: boolean;
  };
}

const COURIERS = [
  { value: 'any', label: 'Any Courier' },
  { value: 'delhivery', label: 'Delhivery' },
  { value: 'bluedart', label: 'Blue Dart' },
  { value: 'ekart', label: 'Ekart' },
  { value: 'dtdc', label: 'DTDC' },
  { value: 'fedex', label: 'FedEx' },
];

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function CourierPreferencesScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<CourierPreferences | null>(null);
  const [showAlternateContact, setShowAlternateContact] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/user-settings/courier');

      if (response.success && response.data) {
        if (!isMounted()) return;
        setPreferences(response.data as CourierPreferences);
        if (!isMounted()) return;
        setShowAlternateContact(!!(response.data as CourierPreferences).alternateContact?.name);
      } else {
        // Set default preferences if none exist
        if (!isMounted()) return;
        setPreferences(getDefaultPreferences());
      }
    } catch (error) {
      // Set default preferences on error
      if (!isMounted()) return;
      setPreferences(getDefaultPreferences());
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const getDefaultPreferences = (): CourierPreferences => ({
    preferredCourier: 'any',
    deliveryTimePreference: {
      weekdays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      preferredTimeSlot: {
        start: '09:00',
        end: '18:00',
      },
      avoidWeekends: false,
    },
    deliveryInstructions: {
      contactlessDelivery: false,
      leaveAtDoor: false,
      signatureRequired: true,
      callBeforeDelivery: false,
      specificInstructions: '',
    },
    courierNotifications: {
      smsUpdates: true,
      emailUpdates: true,
      whatsappUpdates: false,
      callUpdates: false,
    },
  });

  const savePreferences = async (updates: Partial<CourierPreferences>) => {
    if (!preferences) return;

    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);

    try {
      setSaving(true);
      const response = await apiClient.put('/user-settings/courier', newPreferences);

      if (!response.success) {
        platformAlertSimple('Error', 'Failed to update courier preferences. Please try again.');
        // Revert to previous state
        if (!isMounted()) return;
        setPreferences(preferences);
      } else {
        // Show success message
        if (!isMounted()) return;
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 2000);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to update courier preferences. Please check your connection and try again.');
      // Revert to previous state
      if (!isMounted()) return;
      setPreferences(preferences);
    } finally {
      if (!isMounted()) return;
      setSaving(false);
    }
  };

  const toggleWeekday = (day: string) => {
    if (!preferences) return;

    const weekdays = [...preferences.deliveryTimePreference.weekdays];
    const index = weekdays.indexOf(day as any);

    if (index > -1) {
      weekdays.splice(index, 1);
    } else {
      weekdays.push(day as any);
    }

    savePreferences({
      deliveryTimePreference: {
        ...preferences.deliveryTimePreference,
        weekdays,
      },
    });
  };

  const handleAvoidWeekendsToggle = (value: boolean) => {
    if (!preferences) return;

    let weekdays = [...preferences.deliveryTimePreference.weekdays];
    
    if (value) {
      // Remove weekends when "Avoid Weekends" is enabled
      weekdays = weekdays.filter(day => day !== 'SAT' && day !== 'SUN');
    } else {
      // Add weekends back when "Avoid Weekends" is disabled
      if (!weekdays.includes('SAT')) weekdays.push('SAT');
      if (!weekdays.includes('SUN')) weekdays.push('SUN');
    }

    savePreferences({
      deliveryTimePreference: {
        ...preferences.deliveryTimePreference,
        weekdays,
        avoidWeekends: value,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <FormPageSkeleton />
      </View>
    );
  }

  if (!preferences) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load preferences</Text>
        <Pressable style={styles.retryButton} onPress={loadPreferences}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Double tap to return to previous screen"
        >
          <Ionicons name="arrow-back" size={24} color={colors.neutral[800]} />
        </Pressable>
        <Text style={styles.headerTitle}>Courier Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Preferred Courier */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Courier</Text>
          {COURIERS.map((courier) => (
            <Pressable
              key={courier.value}
              style={styles.radioItem}
              onPress={() =>
                savePreferences({ preferredCourier: courier.value as any })
              }
              accessibilityLabel={`${courier.label}${preferences.preferredCourier === courier.value ? ', selected' : ''}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: preferences.preferredCourier === courier.value }}
              accessibilityHint="Double tap to select this courier"
            >
              <View
                style={[
                  styles.radio,
                  preferences.preferredCourier === courier.value && styles.radioSelected,
                ]}
              >
                {preferences.preferredCourier === courier.value && (
                  <View style={styles.radioDot} />
                )}
              </View>
              <Text style={styles.radioLabel}>{courier.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Delivery Time Preference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Days</Text>
          <View style={styles.weekdaysContainer}>
            {WEEKDAYS.map((day) => {
              const isEnabled = preferences.deliveryTimePreference.weekdays.includes(day as any);
              return (
                <Pressable
                  key={day}
                  style={[
                    styles.weekdayButton,
                    isEnabled && styles.weekdayButtonSelected,
                  ]}
                  onPress={() => toggleWeekday(day)}
                  accessibilityLabel={`${day}${isEnabled ? ', enabled' : ', disabled'}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isEnabled }}
                  accessibilityHint={`Double tap to ${isEnabled ? 'disable' : 'enable'} delivery on ${day}`}
                >
                  <Text
                    style={[
                      styles.weekdayText,
                      isEnabled && styles.weekdayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Avoid Weekends</Text>
            <Switch
              value={preferences.deliveryTimePreference.avoidWeekends}
              onValueChange={handleAvoidWeekendsToggle}
              disabled={saving}
              trackColor={{ false: colors.neutral[300], true: colors.infoScale[400] }}
              thumbColor={preferences.deliveryTimePreference.avoidWeekends ? colors.background.primary : colors.neutral[100]}
              accessibilityLabel={`Avoid weekends${preferences.deliveryTimePreference.avoidWeekends ? ', enabled' : ', disabled'}`}
              accessibilityRole="switch"
              accessibilityState={{ checked: preferences.deliveryTimePreference.avoidWeekends, disabled: saving }}
              accessibilityHint={`Double tap to ${preferences.deliveryTimePreference.avoidWeekends ? 'disable' : 'enable'} avoid weekends`}
            />
          </View>
        </View>

        {/* Delivery Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Instructions</Text>

          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Contactless Delivery</Text>
            <Switch
              value={preferences.deliveryInstructions.contactlessDelivery}
              onValueChange={(value) =>
                savePreferences({
                  deliveryInstructions: {
                    ...preferences.deliveryInstructions,
                    contactlessDelivery: value,
                  },
                })
              }
              disabled={saving}
              trackColor={{ false: colors.neutral[300], true: colors.infoScale[400] }}
              accessibilityLabel={`Contactless delivery${preferences.deliveryInstructions.contactlessDelivery ? ', enabled' : ', disabled'}`}
              accessibilityRole="switch"
              accessibilityState={{ checked: preferences.deliveryInstructions.contactlessDelivery, disabled: saving }}
              accessibilityHint={`Double tap to ${preferences.deliveryInstructions.contactlessDelivery ? 'disable' : 'enable'} contactless delivery`}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Leave at Door</Text>
            <Switch
              value={preferences.deliveryInstructions.leaveAtDoor}
              onValueChange={(value) =>
                savePreferences({
                  deliveryInstructions: {
                    ...preferences.deliveryInstructions,
                    leaveAtDoor: value,
                  },
                })
              }
              disabled={saving}
              trackColor={{ false: colors.neutral[300], true: colors.infoScale[400] }}
              accessibilityLabel={`Leave at door${preferences.deliveryInstructions.leaveAtDoor ? ', enabled' : ', disabled'}`}
              accessibilityRole="switch"
              accessibilityState={{ checked: preferences.deliveryInstructions.leaveAtDoor, disabled: saving }}
              accessibilityHint={`Double tap to ${preferences.deliveryInstructions.leaveAtDoor ? 'disable' : 'enable'} leave at door`}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Signature Required</Text>
            <Switch
              value={preferences.deliveryInstructions.signatureRequired}
              onValueChange={(value) =>
                savePreferences({
                  deliveryInstructions: {
                    ...preferences.deliveryInstructions,
                    signatureRequired: value,
                  },
                })
              }
              disabled={saving}
              trackColor={{ false: colors.neutral[300], true: colors.infoScale[400] }}
              accessibilityLabel={`Signature required${preferences.deliveryInstructions.signatureRequired ? ', enabled' : ', disabled'}`}
              accessibilityRole="switch"
              accessibilityState={{ checked: preferences.deliveryInstructions.signatureRequired, disabled: saving }}
              accessibilityHint={`Double tap to ${preferences.deliveryInstructions.signatureRequired ? 'disable' : 'enable'} signature required`}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Call Before Delivery</Text>
            <Switch
              value={preferences.deliveryInstructions.callBeforeDelivery}
              onValueChange={(value) =>
                savePreferences({
                  deliveryInstructions: {
                    ...preferences.deliveryInstructions,
                    callBeforeDelivery: value,
                  },
                })
              }
              disabled={saving}
              trackColor={{ false: colors.neutral[300], true: colors.infoScale[400] }}
              accessibilityLabel={`Call before delivery${preferences.deliveryInstructions.callBeforeDelivery ? ', enabled' : ', disabled'}`}
              accessibilityRole="switch"
              accessibilityState={{ checked: preferences.deliveryInstructions.callBeforeDelivery, disabled: saving }}
              accessibilityHint={`Double tap to ${preferences.deliveryInstructions.callBeforeDelivery ? 'disable' : 'enable'} call before delivery`}
            />
          </View>

          <Text style={styles.inputLabel}>Special Instructions</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            value={preferences.deliveryInstructions.specificInstructions}
            onChangeText={(text) =>
              savePreferences({
                deliveryInstructions: {
                  ...preferences.deliveryInstructions,
                  specificInstructions: text,
                },
              })
            }
            placeholder="Add any special delivery instructions..."
            placeholderTextColor={colors.neutral[400]}
            accessibilityLabel="Special delivery instructions"
            accessibilityHint="Enter any special instructions for delivery"
          />
        </View>

        {/* Courier Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Notifications</Text>

          <View style={styles.settingItem}>
            <Text style={styles.settingText}>SMS Updates</Text>
            <Switch
              value={preferences.courierNotifications.smsUpdates}
              onValueChange={(value) =>
                savePreferences({
                  courierNotifications: {
                    ...preferences.courierNotifications,
                    smsUpdates: value,
                  },
                })
              }
              disabled={saving}
              trackColor={{ false: colors.neutral[300], true: colors.infoScale[400] }}
              accessibilityLabel={`SMS updates${preferences.courierNotifications.smsUpdates ? ', enabled' : ', disabled'}`}
              accessibilityRole="switch"
              accessibilityState={{ checked: preferences.courierNotifications.smsUpdates, disabled: saving }}
              accessibilityHint={`Double tap to ${preferences.courierNotifications.smsUpdates ? 'disable' : 'enable'} SMS updates`}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Email Updates</Text>
            <Switch
              value={preferences.courierNotifications.emailUpdates}
              onValueChange={(value) =>
                savePreferences({
                  courierNotifications: {
                    ...preferences.courierNotifications,
                    emailUpdates: value,
                  },
                })
              }
              disabled={saving}
              trackColor={{ false: colors.neutral[300], true: colors.infoScale[400] }}
              accessibilityLabel={`Email updates${preferences.courierNotifications.emailUpdates ? ', enabled' : ', disabled'}`}
              accessibilityRole="switch"
              accessibilityState={{ checked: preferences.courierNotifications.emailUpdates, disabled: saving }}
              accessibilityHint={`Double tap to ${preferences.courierNotifications.emailUpdates ? 'disable' : 'enable'} email updates`}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingText}>WhatsApp Updates</Text>
            <Switch
              value={preferences.courierNotifications.whatsappUpdates}
              onValueChange={(value) =>
                savePreferences({
                  courierNotifications: {
                    ...preferences.courierNotifications,
                    whatsappUpdates: value,
                  },
                })
              }
              disabled={saving}
              trackColor={{ false: colors.neutral[300], true: colors.infoScale[400] }}
              accessibilityLabel={`WhatsApp updates${preferences.courierNotifications.whatsappUpdates ? ', enabled' : ', disabled'}`}
              accessibilityRole="switch"
              accessibilityState={{ checked: preferences.courierNotifications.whatsappUpdates, disabled: saving }}
              accessibilityHint={`Double tap to ${preferences.courierNotifications.whatsappUpdates ? 'disable' : 'enable'} WhatsApp updates`}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Call Updates</Text>
            <Switch
              value={preferences.courierNotifications.callUpdates}
              onValueChange={(value) =>
                savePreferences({
                  courierNotifications: {
                    ...preferences.courierNotifications,
                    callUpdates: value,
                  },
                })
              }
              disabled={saving}
              trackColor={{ false: colors.neutral[300], true: colors.infoScale[400] }}
              accessibilityLabel={`Call updates${preferences.courierNotifications.callUpdates ? ', enabled' : ', disabled'}`}
              accessibilityRole="switch"
              accessibilityState={{ checked: preferences.courierNotifications.callUpdates, disabled: saving }}
              accessibilityHint={`Double tap to ${preferences.courierNotifications.callUpdates ? 'disable' : 'enable'} call updates`}
            />
          </View>
        </View>
      </ScrollView>

      {/* Saving Indicator */}
      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color={colors.background.primary} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <View style={styles.successIndicator}>
          <Ionicons name="checkmark-circle" size={20} color={colors.background.primary} />
          <Text style={styles.successText}>Preferences saved!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  section: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
    padding: Spacing.base,
    ...Shadows.medium,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  radioSelected: {
    borderColor: Colors.info,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.info,
  },
  radioLabel: {
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
  },
  weekdaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  weekdayButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.background.primary,
  },
  weekdayButtonSelected: {
    backgroundColor: Colors.info,
    borderColor: Colors.info,
  },
  weekdayText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  weekdayTextSelected: {
    color: Colors.text.inverse,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  settingText: {
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
  },
  inputLabel: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: Spacing['2xl'],
  },
  errorText: {
    ...Typography.h4,
    color: Colors.error,
    marginBottom: Spacing.base,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.info,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  savingIndicator: {
    position: 'absolute',
    bottom: Spacing.base,
    alignSelf: 'center',
    backgroundColor: Colors.info,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    ...Shadows.strong,
  },
  savingText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  successIndicator: {
    position: 'absolute',
    bottom: Spacing.base,
    alignSelf: 'center',
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    ...Shadows.strong,
  },
  successText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
});

export default withErrorBoundary(CourierPreferencesScreen, 'AccountCourierPreferences');
