import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Language Settings Page
// Comprehensive language and localization settings

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  RefreshControl,
  Text,
} from 'react-native';
import { FormPageSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useApp } from '@/contexts/AppContext';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type Language = 'en' | 'hi' | 'te' | 'ta' | 'bn' | 'es' | 'fr' | 'de' | 'zh' | 'ja';
type Region = 'IN' | 'US' | 'GB' | 'CA' | 'AU' | 'DE' | 'FR' | 'ES' | 'IT' | 'BR' | 'CN' | 'JP';

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  region: Region;
  isRTL: boolean;
}

interface RegionOption {
  code: Region;
  name: string;
  currency: string;
  timezone: string;
  dateFormat: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', region: 'US', isRTL: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'IN', isRTL: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', region: 'IN', isRTL: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', region: 'IN', isRTL: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', region: 'IN', isRTL: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'ES', isRTL: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'FR', isRTL: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'DE', isRTL: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', region: 'CN', isRTL: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', region: 'JP', isRTL: false },
];

const REGION_OPTIONS: RegionOption[] = [
  { code: 'IN', name: 'India', currency: 'INR', timezone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY' },
  { code: 'US', name: 'United States', currency: 'USD', timezone: 'America/New_York', dateFormat: 'MM/DD/YYYY' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London', dateFormat: 'DD/MM/YYYY' },
  { code: 'CA', name: 'Canada', currency: 'CAD', timezone: 'America/Toronto', dateFormat: 'DD/MM/YYYY' },
  { code: 'AU', name: 'Australia', currency: 'AUD', timezone: 'Australia/Sydney', dateFormat: 'DD/MM/YYYY' },
  { code: 'DE', name: 'Germany', currency: 'EUR', timezone: 'Europe/Berlin', dateFormat: 'DD.MM.YYYY' },
  { code: 'FR', name: 'France', currency: 'EUR', timezone: 'Europe/Paris', dateFormat: 'DD/MM/YYYY' },
  { code: 'ES', name: 'Spain', currency: 'EUR', timezone: 'Europe/Madrid', dateFormat: 'DD/MM/YYYY' },
  { code: 'IT', name: 'Italy', currency: 'EUR', timezone: 'Europe/Rome', dateFormat: 'DD/MM/YYYY' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', timezone: 'America/Sao_Paulo', dateFormat: 'DD/MM/YYYY' },
  { code: 'CN', name: 'China', currency: 'CNY', timezone: 'Asia/Shanghai', dateFormat: 'YYYY/MM/DD' },
  { code: 'JP', name: 'Japan', currency: 'JPY', timezone: 'Asia/Tokyo', dateFormat: 'YYYY/MM/DD' },
];

function LanguageSettingsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { settings, isLoading, updateGeneralSettings, refetch } = useUserSettings(true);
  const { actions: appActions } = useApp();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [selectedRegion, setSelectedRegion] = useState<Region>('IN');
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize with current settings
  useEffect(() => {
    if (settings?.general) {
      setSelectedLanguage(settings.general.language as Language || 'en');
      // Map currency to region
      const region = REGION_OPTIONS.find(r => r.currency === settings.general.currency);
      if (region) {
        setSelectedRegion(region.code);
      }
    }
  }, [settings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const handleLanguageChange = async (language: Language) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    setSelectedLanguage(language);

    try {
      // Update backend settings
      const success = await updateGeneralSettings({ language });
      
      if (success) {
        // Update app context — this persists the language preference
        await appActions.setLanguage(language);

        // Show success feedback
        platformAlertSimple(
          'Language Updated',
          `App language changed to ${LANGUAGE_OPTIONS.find(l => l.code === language)?.name}. Some changes may require an app restart.`,
        );
      } else {
        // Revert on failure
        if (!isMounted()) return;
        setSelectedLanguage(settings?.general.language as Language || 'en');
        platformAlertSimple('Error', 'Failed to update language. Please try again.');
      }
    } catch (error) {
      if (!isMounted()) return;
      setSelectedLanguage(settings?.general.language as Language || 'en');
      platformAlertSimple('Error', 'Failed to update language. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsUpdating(false);
    }
  };

  const handleRegionChange = async (region: Region) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    setSelectedRegion(region);

    const regionData = REGION_OPTIONS.find(r => r.code === region);
    if (!regionData) return;

    try {
      // Update backend settings
      const success = await updateGeneralSettings({
        currency: regionData.currency as 'INR' | 'USD' | 'GBP' | 'CAD' | 'AUD' | 'EUR' | 'BRL' | 'CNY' | 'JPY',
        timezone: regionData.timezone,
        dateFormat: regionData.dateFormat,
      });
      
      if (success) {
        platformAlertSimple(
          'Region Updated',
          `Region changed to ${regionData.name}`,
        );
      } else {
        // Revert on failure
        const currentRegion = REGION_OPTIONS.find(r => r.currency === settings?.general.currency);
        if (!isMounted()) return;
        setSelectedRegion(currentRegion?.code || 'IN');
        platformAlertSimple('Error', 'Failed to update region. Please try again.');
      }
    } catch (error) {
      const currentRegion = REGION_OPTIONS.find(r => r.currency === settings?.general.currency);
      if (!isMounted()) return;
      setSelectedRegion(currentRegion?.code || 'IN');
      platformAlertSimple('Error', 'Failed to update region. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsUpdating(false);
    }
  };

  const renderLanguageOption = (language: LanguageOption) => (
    <Pressable
      key={language.code}
      style={[
        styles.languageOption,
        selectedLanguage === language.code && styles.selectedLanguageOption,
        isUpdating && styles.disabledOption,
      ]}
      onPress={() => handleLanguageChange(language.code)}
      disabled={isUpdating}
     
      accessibilityLabel={`${language.name} - ${language.nativeName}${selectedLanguage === language.code ? ', selected' : ''}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selectedLanguage === language.code, disabled: isUpdating }}
      accessibilityHint="Double tap to select this language"
    >
      <View style={styles.languageContent}>
        <View style={styles.languageInfo}>
          <Text style={styles.flag}>{language.flag}</Text>
          <View style={styles.languageText}>
            <ThemedText style={[
              styles.languageName,
              selectedLanguage === language.code && styles.selectedLanguageName,
            ]}>
              {language.name}
            </ThemedText>
            <ThemedText style={[
              styles.languageNative,
              selectedLanguage === language.code && styles.selectedLanguageNative,
            ]}>
              {language.nativeName}
            </ThemedText>
          </View>
        </View>
        {selectedLanguage === language.code && (
          <Ionicons name="checkmark-circle" size={24} color={Colors.brand.purpleLight} />
        )}
      </View>
    </Pressable>
  );

  const renderRegionOption = (region: RegionOption) => (
    <Pressable
      key={region.code}
      style={[
        styles.regionOption,
        selectedRegion === region.code && styles.selectedRegionOption,
        isUpdating && styles.disabledOption,
      ]}
      onPress={() => handleRegionChange(region.code)}
      disabled={isUpdating}
     
      accessibilityLabel={`${region.name}, ${region.currency}, ${region.timezone}${selectedRegion === region.code ? ', selected' : ''}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selectedRegion === region.code, disabled: isUpdating }}
      accessibilityHint="Double tap to select this region"
    >
      <View style={styles.regionContent}>
        <View style={styles.regionInfo}>
          <ThemedText style={[
            styles.regionName,
            selectedRegion === region.code && styles.selectedRegionName,
          ]}>
            {region.name}
          </ThemedText>
          <ThemedText style={[
            styles.regionDetails,
            selectedRegion === region.code && styles.selectedRegionDetails,
          ]}>
            {region.currency} • {region.timezone}
          </ThemedText>
        </View>
        {selectedRegion === region.code && (
          <Ionicons name="checkmark-circle" size={24} color={Colors.brand.purpleLight} />
        )}
      </View>
    </Pressable>
  );

  if (isLoading && !settings) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purpleLight} />
        <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple]} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Language & Region</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <FormPageSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purpleLight} />

      {/* Header */}
      <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <ThemedText style={styles.headerTitle}>Language & Region</ThemedText>

          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Settings Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="globe-outline" size={24} color={Colors.brand.purpleLight} />
            <ThemedText style={styles.summaryTitle}>Current Settings</ThemedText>
          </View>
          <View style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryLabel}>Language</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {LANGUAGE_OPTIONS.find(l => l.code === selectedLanguage)?.name || 'English'}
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryLabel}>Region</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {REGION_OPTIONS.find(r => r.code === selectedRegion)?.name || 'India'}
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryLabel}>Currency</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {REGION_OPTIONS.find(r => r.code === selectedRegion)?.currency || 'INR'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Language Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="language-outline" size={24} color={Colors.brand.purpleLight} />
            <ThemedText style={styles.sectionTitle}>App Language</ThemedText>
          </View>
          <ThemedText style={styles.sectionDescription}>
            Choose your preferred language for the app interface
          </ThemedText>
          
          <View style={styles.optionsContainer}>
            {LANGUAGE_OPTIONS.map(renderLanguageOption)}
          </View>
        </View>

        {/* Region Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={24} color={Colors.brand.purpleLight} />
            <ThemedText style={styles.sectionTitle}>Region & Localization</ThemedText>
          </View>
          <ThemedText style={styles.sectionDescription}>
            Set your region for currency, timezone, and date format preferences
          </ThemedText>
          
          <View style={styles.optionsContainer}>
            {REGION_OPTIONS.map(renderRegionOption)}
          </View>
        </View>

        {/* Additional Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={24} color={Colors.brand.purpleLight} />
            <ThemedText style={styles.sectionTitle}>Additional Settings</ThemedText>
          </View>
          
          <View style={styles.additionalSettings}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Time Format</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Choose between 12-hour and 24-hour time format
                </ThemedText>
              </View>
              <View style={styles.toggleGroup}>
                <Pressable
                  style={[
                    styles.toggleButton,
                    settings?.general.timeFormat === '12h' && styles.toggleButtonActive,
                  ]}
                  onPress={() => updateGeneralSettings({ timeFormat: '12h' })}
                  accessibilityLabel={`12-hour format${settings?.general.timeFormat === '12h' ? ', selected' : ''}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: settings?.general.timeFormat === '12h' }}
                  accessibilityHint="Double tap to use 12-hour time format"
                >
                  <ThemedText
                    style={[
                      styles.toggleButtonText,
                      settings?.general.timeFormat === '12h' && styles.toggleButtonTextActive,
                    ]}
                  >
                    12h
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.toggleButton,
                    settings?.general.timeFormat === '24h' && styles.toggleButtonActive,
                  ]}
                  onPress={() => updateGeneralSettings({ timeFormat: '24h' })}
                  accessibilityLabel={`24-hour format${settings?.general.timeFormat === '24h' ? ', selected' : ''}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: settings?.general.timeFormat === '24h' }}
                  accessibilityHint="Double tap to use 24-hour time format"
                >
                  <ThemedText
                    style={[
                      styles.toggleButtonText,
                      settings?.general.timeFormat === '24h' && styles.toggleButtonTextActive,
                    ]}
                  >
                    24h
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.text.tertiary} />
          <View style={styles.infoContent}>
            <ThemedText style={styles.infoTitle}>Language & Region Info</ThemedText>
            <ThemedText style={styles.infoText}>
              Changes to language and region settings will affect the app interface, 
              currency display, date formats, and timezone preferences. Some changes 
              may require an app restart to take full effect.
            </ThemedText>
          </View>
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.inverse,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  summaryCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
    gap: Spacing.md,
  },
  summaryTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  summaryContent: {
    gap: Spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  summaryValue: {
    ...Typography.body,
    color: Colors.brand.purpleLight,
    fontWeight: '600',
  },
  section: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  sectionDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: Spacing.sm,
  },
  languageOption: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedLanguageOption: {
    backgroundColor: '#F0F4FF',
    borderColor: Colors.brand.purpleLight,
  },
  disabledOption: {
    opacity: 0.6,
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    ...Typography.h2,
    marginRight: Spacing.md,
  },
  languageText: {
    flex: 1,
  },
  languageName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  selectedLanguageName: {
    color: Colors.brand.purpleLight,
  },
  languageNative: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  selectedLanguageNative: {
    color: Colors.brand.purpleLight,
  },
  regionOption: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedRegionOption: {
    backgroundColor: '#F0F4FF',
    borderColor: Colors.brand.purpleLight,
  },
  regionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  regionInfo: {
    flex: 1,
  },
  regionName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  selectedRegionName: {
    color: Colors.brand.purpleLight,
  },
  regionDetails: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  selectedRegionDetails: {
    color: Colors.brand.purpleLight,
  },
  additionalSettings: {
    marginTop: Spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.base,
  },
  settingLabel: {
    ...Typography.body,
    color: Colors.text.secondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    lineHeight: 16,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toggleButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
  },
  toggleButtonActive: {
    backgroundColor: Colors.brand.purpleLight,
  },
  toggleButtonText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  toggleButtonTextActive: {
    color: Colors.text.inverse,
  },
  infoCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: colors.brand.skyDark,
    marginBottom: Spacing.xs,
  },
  infoText: {
    ...Typography.bodySmall,
    color: colors.brand.skyDark,
    lineHeight: 18,
  },
  footer: {
    height: 20,
  },
});

export default withErrorBoundary(LanguageSettingsPage, 'AccountLanguage');
