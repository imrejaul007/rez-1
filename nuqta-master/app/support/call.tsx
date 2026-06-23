import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Call Support Page
// Phone support options with callback request — config-driven

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { DetailPageSkeleton } from '@/components/skeletons';
import supportService, {
  PublicSupportConfig,
  CallbackResponse,
  SupportCategory,
} from '@/services/supportApi';
import { useAuthUser } from '@/stores/selectors';
import analyticsService from '@/services/analyticsService';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography, Gradients } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

type PageState = 'loading' | 'error' | 'form' | 'submitting' | 'success';

function CallSupportPage() {
  const router = useRouter();
  const user = useAuthUser();

  // Page state
  const [pageState, setPageState] = useState<PageState>('loading');
  const [config, setConfig] = useState<PublicSupportConfig | null>(null);
  const [configError, setConfigError] = useState('');
  const [callbackResult, setCallbackResult] = useState<CallbackResponse | null>(null);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+971');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Touch tracking for inline validation
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const isMounted = useIsMounted();

  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  });

  // Load config on mount
  const loadConfig = useCallback(async () => {
    setPageState('loading');
    setConfigError('');
    try {
      const response = await supportService.getSupportConfig();
      if (response.success && response.data) {
        setConfig(response.data);
        setPageState('form');
      } else {
        if (!isMounted()) return;
        setConfigError('Unable to load support information');
        if (!isMounted()) return;
        setPageState('error');
      }
    } catch (error) {
      if (!isMounted()) return;
      setConfigError('Unable to connect. Please check your connection and try again.');
      if (!isMounted()) return;
      setPageState('error');
    }
  }, []);

  useEffect(() => {
    loadConfig();
    analyticsService.track('page_view', { page: 'call_support' });
  }, [loadConfig]);

  // Phone prefill from auth
  useEffect(() => {
    const userPhone = user?.phoneNumber;
    if (userPhone) {
      // Try to parse country code prefix
      const prefixes = ['+971', '+91', '+1', '+44', '+966', '+968', '+965', '+973', '+974'];
      const matched = prefixes.find(p => userPhone.startsWith(p));
      if (matched) {
        setCountryCode(matched);
        setPhoneNumber(userPhone.slice(matched.length));
      } else if (userPhone.startsWith('+')) {
        // Generic: take first 2-4 chars as code
        const codeMatch = userPhone.match(/^(\+\d{1,4})/);
        if (codeMatch) {
          setCountryCode(codeMatch[1]);
          setPhoneNumber(userPhone.slice(codeMatch[1].length));
        }
      } else {
        setPhoneNumber(userPhone);
      }
    }
  }, [user?.phoneNumber]);

  // Validation
  const phoneValid = /^\d{7,15}$/.test(phoneNumber);
  const formValid = !!selectedCategory && phoneValid;

  const getFieldError = (field: string): string | null => {
    if (!touchedFields[field]) return null;
    if (field === 'category' && !selectedCategory) return 'Please select a category';
    if (field === 'phone' && !phoneNumber) return 'Phone number is required';
    if (field === 'phone' && !phoneValid) return 'Enter a valid phone number (7-15 digits)';
    return null;
  };

  const markTouched = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  // Derive availability
  const isOpen = config?.isCurrentlyOpen ?? false;
  const isHighWait = config?.queueStatus?.severity === 'busy' || config?.queueStatus?.severity === 'critical';
  const queueOverride = config?.queueStatus?.override && config?.queueStatus?.message;

  // Format time for display (HH:mm -> h:mm AM/PM)
  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  // Group schedule for display
  const getScheduleDisplay = () => {
    if (!config) return [];
    const schedule = config.supportHours.schedule;
    const weekdays = schedule.filter(s => s.dayOfWeek >= 1 && s.dayOfWeek <= 5);
    const saturday = schedule.find(s => s.dayOfWeek === 6);
    const sunday = schedule.find(s => s.dayOfWeek === 0);

    const rows: { label: string; value: string }[] = [];

    // Check if all weekdays are the same
    const allWeekdaysSame = weekdays.length > 0 && weekdays.every(
      d => d.isOpen === weekdays[0].isOpen &&
           d.openTime === weekdays[0].openTime &&
           d.closeTime === weekdays[0].closeTime
    );

    if (allWeekdaysSame && weekdays[0]) {
      rows.push({
        label: 'Monday - Friday',
        value: weekdays[0].isOpen
          ? `${formatTime(weekdays[0].openTime)} - ${formatTime(weekdays[0].closeTime)}`
          : 'Closed',
      });
    } else {
      weekdays.forEach(d => {
        rows.push({
          label: d.dayName,
          value: d.isOpen ? `${formatTime(d.openTime)} - ${formatTime(d.closeTime)}` : 'Closed',
        });
      });
    }

    // Saturday + Sunday together if same
    if (saturday && sunday &&
        saturday.isOpen === sunday.isOpen &&
        saturday.openTime === sunday.openTime &&
        saturday.closeTime === sunday.closeTime) {
      rows.push({
        label: 'Saturday - Sunday',
        value: saturday.isOpen
          ? `${formatTime(saturday.openTime)} - ${formatTime(saturday.closeTime)}`
          : 'Closed',
      });
    } else {
      if (saturday) {
        rows.push({
          label: 'Saturday',
          value: saturday.isOpen ? `${formatTime(saturday.openTime)} - ${formatTime(saturday.closeTime)}` : 'Closed',
        });
      }
      if (sunday) {
        rows.push({
          label: 'Sunday',
          value: sunday.isOpen ? `${formatTime(sunday.openTime)} - ${formatTime(sunday.closeTime)}` : 'Closed',
        });
      }
    }

    return rows;
  };

  const primaryPhone = config?.phoneNumbers?.[0];

  const handleCallNow = async () => {
    if (!primaryPhone) return;

    const telUrl = `tel:${primaryPhone.number}`;
    analyticsService.track('call_initiated', { region: primaryPhone.region, number: primaryPhone.number });

    try {
      const canOpen = await Linking.canOpenURL(telUrl);
      if (canOpen) {
        await Linking.openURL(telUrl);
      } else {
        platformAlertSimple('Call Support', `Please dial ${primaryPhone.displayNumber} to reach our support team.`);
      }
    } catch {
      platformAlertSimple('Call Support', `Please dial ${primaryPhone.displayNumber} to reach our support team.`);
    }
  };

  const handleRequestCallback = async () => {
    // Mark all fields touched on submit attempt
    setTouchedFields({ category: true, phone: true });

    if (!formValid) return;

    setLoading(true);
    setPageState('submitting');
    analyticsService.track('callback_requested', { category: selectedCategory, countryCode });

    try {
      const response = await supportService.requestCallback({
        category: selectedCategory!,
        phoneNumber,
        countryCode,
        notes: notes || undefined,
        idempotencyKey,
      });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setCallbackResult(response.data);
        if (!isMounted()) return;
        setPageState('success');
        analyticsService.track('callback_success', {
          ticketNumber: response.data.ticketNumber,
          category: selectedCategory,
        });
      } else {
        platformAlertSimple('Error', 'Failed to request callback. Please try again.');
        if (!isMounted()) return;
        setPageState('form');
        analyticsService.track('callback_failure', { reason: 'api_error' });
      }
    } catch (error: any) {
      const msg = error?.message || 'Something went wrong. Please try again.';
      platformAlertSimple('Error', msg);
      if (!isMounted()) return;
      setPageState('form');
      analyticsService.track('callback_failure', { reason: 'exception' });
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  // ==================== RENDER HEADER ====================
  const renderHeader = () => (
    <LinearGradient colors={Gradients.nileBlue} style={styles.header}>
      <View style={styles.headerContent}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.white} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Call Support</ThemedText>
        <View style={styles.placeholder} />
      </View>
    </LinearGradient>
  );

  // ==================== LOADING STATE ====================
  if (pageState === 'loading') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" translucent />
        {renderHeader()}
        <DetailPageSkeleton />
      </View>
    );
  }

  // ==================== ERROR STATE ====================
  if (pageState === 'error') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" translucent />
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <ThemedText style={styles.errorTitle}>Something went wrong</ThemedText>
          <ThemedText style={styles.errorText}>{configError}</ThemedText>
          <Pressable
            style={styles.retryButton}
            onPress={loadConfig}
            accessibilityLabel="Retry loading"
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={20} color={Colors.text.white} />
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // ==================== SUCCESS STATE ====================
  if (pageState === 'success' && callbackResult) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" translucent />
        {renderHeader()}

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
          </View>
          <ThemedText style={styles.successTitle}>Callback Requested!</ThemedText>
          <ThemedText style={styles.successText}>
            Our support team will call you at{'\n'}{countryCode} {phoneNumber}{'\n'}within the next {callbackResult.estimatedWaitMinutes} minutes
          </ThemedText>
          <View style={styles.successCard}>
            <View style={styles.ticketNumberRow}>
              <ThemedText style={styles.successLabel}>Ticket</ThemedText>
              <ThemedText style={styles.ticketNumber}>{callbackResult.ticketNumber}</ThemedText>
            </View>
            <View style={styles.successRow}>
              <ThemedText style={styles.successLabel}>Category</ThemedText>
              <ThemedText style={styles.successValue}>{callbackResult.category}</ThemedText>
            </View>
            <View style={styles.successRow}>
              <ThemedText style={styles.successLabel}>Est. Wait</ThemedText>
              <ThemedText style={styles.successValue}>{callbackResult.estimatedWaitMinutes} min</ThemedText>
            </View>
            {notes ? (
              <View style={styles.successRow}>
                <ThemedText style={styles.successLabel}>Notes</ThemedText>
                <ThemedText style={styles.successValue}>{notes}</ThemedText>
              </View>
            ) : null}
          </View>
          <Pressable
            style={styles.viewTicketsButton}
            onPress={() => router.push('/support')}
            accessibilityLabel="View my tickets"
            accessibilityRole="button"
          >
            <Ionicons name="list-outline" size={20} color={Colors.primary[600]} />
            <ThemedText style={styles.viewTicketsText}>View My Tickets</ThemedText>
          </Pressable>
          <Pressable
            style={styles.doneButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            accessibilityLabel="Done"
            accessibilityRole="button"
          >
            <ThemedText style={styles.doneButtonText}>Done</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // ==================== FORM STATE ====================
  const categories: SupportCategory[] = config?.categories || [];
  const scheduleRows = getScheduleDisplay();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent />
      {renderHeader()}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Banner */}
          {queueOverride ? (
            <View style={[styles.statusBanner, styles.statusHighWait]}>
              <Ionicons name="warning-outline" size={18} color={Colors.warning} />
              <ThemedText style={styles.statusText}>{config!.queueStatus.message}</ThemedText>
            </View>
          ) : (
            <View style={[styles.statusBanner, isOpen ? styles.statusOpen : styles.statusClosed]}>
              <View style={[styles.statusDot, isOpen && styles.statusDotOpen]} />
              <ThemedText style={styles.statusText}>
                {isOpen
                  ? isHighWait
                    ? 'Support is available (high wait times)'
                    : 'Support is available now'
                  : 'Support is currently closed'}
              </ThemedText>
            </View>
          )}

          {/* Support Hours */}
          <View style={styles.hoursCard}>
            <ThemedText style={styles.hoursTitle}>Support Hours</ThemedText>
            {scheduleRows.map((row, idx) => (
              <View key={idx} style={styles.hoursRow}>
                <ThemedText style={styles.hoursLabel}>{row.label}</ThemedText>
                <ThemedText style={styles.hoursValue}>{row.value}</ThemedText>
              </View>
            ))}
          </View>

          {/* Call Now Option */}
          {isOpen && primaryPhone && (
            <Pressable
              style={styles.callNowCard}
              onPress={handleCallNow}
              accessibilityLabel={`Call support at ${primaryPhone.displayNumber}`}
              accessibilityRole="button"
            >
              <View style={styles.callNowIcon}>
                <Ionicons name="call" size={32} color={Colors.success} />
              </View>
              <View style={styles.callNowContent}>
                <ThemedText style={styles.callNowTitle}>Call Now</ThemedText>
                <ThemedText style={styles.callNowNumber}>{primaryPhone.displayNumber}</ThemedText>
                <ThemedText style={styles.callNowSubtext}>{primaryPhone.label}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.text.tertiary} />
            </Pressable>
          )}

          {/* High Wait Banner */}
          {isHighWait && !queueOverride && (
            <View style={styles.highWaitBanner}>
              <Ionicons name="time-outline" size={18} color={Colors.warning} />
              <ThemedText style={styles.highWaitText}>
                Wait times are higher than usual. We appreciate your patience.
              </ThemedText>
            </View>
          )}

          {/* Callback Request Section */}
          {config?.callbackEnabled !== false && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Request a Callback</ThemedText>
              <ThemedText style={styles.sectionSubtitle}>
                We'll call you back within {config?.estimatedWaitMinutes || 30} minutes
              </ThemedText>

              {/* Category Selection */}
              <ThemedText style={styles.inputLabel}>What do you need help with?</ThemedText>
              <View style={styles.categoriesGrid}>
                {categories.map(category => (
                  <Pressable
                    key={category.id}
                    style={[
                      styles.categoryCard,
                      selectedCategory === category.id && styles.categoryCardSelected,
                    ]}
                    onPress={() => {
                      setSelectedCategory(category.id);
                      markTouched('category');
                    }}
                    accessibilityLabel={category.name}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedCategory === category.id }}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={24}
                      color={selectedCategory === category.id ? Colors.primary[600] : Colors.text.tertiary}
                    />
                    <ThemedText style={[
                      styles.categoryLabel,
                      selectedCategory === category.id && styles.categoryLabelSelected,
                    ]}>
                      {category.name}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              {getFieldError('category') && (
                <ThemedText style={styles.fieldError}>{getFieldError('category')}</ThemedText>
              )}

              {/* Phone Number */}
              <ThemedText style={styles.inputLabel}>Your Phone Number</ThemedText>
              <View style={styles.phoneInput}>
                <TextInput
                  style={styles.countryCodeInput}
                  value={countryCode}
                  onChangeText={setCountryCode}
                  placeholder="+971"
                  placeholderTextColor={Colors.text.tertiary}
                  keyboardType="phone-pad"
                  maxLength={5}
                  accessibilityLabel="Country code"
                />
                <View style={styles.phoneDivider} />
                <TextInput
                  style={styles.phoneTextInput}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  onBlur={() => markTouched('phone')}
                  placeholder="Enter phone number"
                  placeholderTextColor={Colors.text.tertiary}
                  keyboardType="phone-pad"
                  maxLength={15}
                  accessibilityLabel="Phone number"
                />
              </View>
              {getFieldError('phone') && (
                <ThemedText style={styles.fieldError}>{getFieldError('phone')}</ThemedText>
              )}

              {/* Notes */}
              <View style={styles.notesHeader}>
                <ThemedText style={styles.inputLabel}>Additional Notes (Optional)</ThemedText>
                <ThemedText style={styles.charCount}>{notes.length}/500</ThemedText>
              </View>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Describe your issue briefly..."
                placeholderTextColor={Colors.text.tertiary}
                multiline
                maxLength={500}
                accessibilityLabel="Additional notes"
              />
            </View>
          )}

          {/* Request Button */}
          {config?.callbackEnabled !== false && (
            <Pressable
              style={[
                styles.requestButton,
                (!formValid || loading) && styles.requestButtonDisabled,
              ]}
              onPress={handleRequestCallback}
              disabled={loading}
              accessibilityLabel="Request callback"
              accessibilityRole="button"
              accessibilityState={{ disabled: !formValid || loading }}
              accessibilityHint="Submit your callback request"
            >
              {loading || pageState === 'submitting' ? (
                <ActivityIndicator color={Colors.text.white} />
              ) : (
                <>
                  <Ionicons name="call-outline" size={20} color={Colors.text.white} />
                  <ThemedText style={styles.requestButtonText}>Request Callback</ThemedText>
                </>
              )}
            </Pressable>
          )}

          {/* Info */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
            <ThemedText style={styles.infoText}>
              Callbacks are available during support hours. If you request outside hours,
              we'll call you when we open.
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: Colors.text.white,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  retryButtonText: {
    ...Typography.button,
    color: Colors.text.white,
  },
  // Status
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  statusOpen: {
    backgroundColor: Colors.success + '15',
  },
  statusClosed: {
    backgroundColor: Colors.gray[200],
  },
  statusHighWait: {
    backgroundColor: Colors.warning + '15',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gray[400],
  },
  statusDotOpen: {
    backgroundColor: Colors.success,
  },
  statusText: {
    ...Typography.label,
    color: Colors.text.primary,
    flex: 1,
  },
  // Hours
  hoursCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.subtle,
  },
  hoursTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  hoursLabel: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  hoursValue: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  // Call Now
  callNowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  callNowIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callNowContent: {
    flex: 1,
  },
  callNowTitle: {
    ...Typography.label,
    color: Colors.success,
  },
  callNowNumber: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  callNowSubtext: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  // High wait
  highWaitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  highWaitText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    flex: 1,
  },
  // Section
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.label,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  // Categories
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.subtle,
  },
  categoryCardSelected: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  categoryLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
  // Field error
  fieldError: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  // Phone input
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    ...Shadows.subtle,
    overflow: 'hidden',
  },
  countryCodeInput: {
    ...Typography.label,
    color: Colors.text.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.base,
    width: 72,
    textAlign: 'center',
    backgroundColor: Colors.gray[100],
  },
  phoneDivider: {
    width: 1,
    height: '60%',
    backgroundColor: Colors.gray[300],
  },
  phoneTextInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  // Notes
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  notesInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Typography.body,
    color: Colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
    ...Shadows.subtle,
  },
  // Request button
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  requestButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  requestButtonText: {
    ...Typography.button,
    color: Colors.text.white,
  },
  // Info
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.info + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  successText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  successCard: {
    width: '100%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    ...Shadows.subtle,
  },
  ticketNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    marginBottom: Spacing.xs,
  },
  ticketNumber: {
    ...Typography.label,
    color: Colors.primary[600],
    fontWeight: '700',
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  successLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  successValue: {
    ...Typography.label,
    color: Colors.text.primary,
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.md,
  },
  viewTicketsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  viewTicketsText: {
    ...Typography.label,
    color: Colors.primary[600],
  },
  doneButton: {
    width: '100%',
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  doneButtonText: {
    ...Typography.button,
    color: Colors.text.white,
  },
});

export default withErrorBoundary(CallSupportPage, 'SupportCall');
