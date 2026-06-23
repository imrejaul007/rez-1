import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Profile Visibility Settings Page
// Manages user's profile visibility preferences

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
} from 'react-native';
import { FormPageSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useSecurity } from '@/contexts/SecurityContext';
import { platformAlertSimple } from '@/utils/platformAlert';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
type VisibilityOption = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

interface VisibilityOptionData {
  value: VisibilityOption;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const VISIBILITY_OPTIONS: VisibilityOptionData[] = [
  {
    value: 'PUBLIC',
    title: 'Public',
    description: 'Anyone can see your profile and activity',
    icon: 'globe-outline',
    color: Colors.success,
  },
  {
    value: 'FRIENDS',
    title: 'Friends Only',
    description: 'Only your friends can see your profile',
    icon: 'people-outline',
    color: Colors.brand.purple,
  },
  {
    value: 'PRIVATE',
    title: 'Private',
    description: 'Only you can see your profile',
    icon: 'lock-closed-outline',
    color: Colors.error,
  },
];

function ProfileVisibilityPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { privacySettings, updatePrivacySettings, isLoading } = useSecurity();
  const [selectedVisibility, setSelectedVisibility] = useState<VisibilityOption>('FRIENDS');

  useEffect(() => {
    if (privacySettings) {
      setSelectedVisibility(privacySettings.profileVisibility);
    }
  }, [privacySettings]);

  const handleVisibilityChange = async (visibility: VisibilityOption) => {
    try {
      setSelectedVisibility(visibility);
      const success = await updatePrivacySettings({ profileVisibility: visibility });
      
      if (success) {
        platformAlertSimple(
          'Profile Visibility Updated',
          `Your profile is now ${visibility.toLowerCase()}.`
        );
      } else {
        platformAlertSimple('Error', 'Failed to update profile visibility. Please try again.');
        // Revert on failure
        if (privacySettings) {
          if (!isMounted()) return;
          setSelectedVisibility(privacySettings.profileVisibility);
        }
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to update profile visibility. Please try again.');
      // Revert on failure
      if (privacySettings) {
        if (!isMounted()) return;
        setSelectedVisibility(privacySettings.profileVisibility);
      }
    }
  };

  const renderVisibilityOption = (option: VisibilityOptionData) => (
    <Pressable
      key={option.value}
      style={[
        styles.optionCard,
        selectedVisibility === option.value && styles.selectedOption,
      ]}
      onPress={() => handleVisibilityChange(option.value)}
     
      accessibilityLabel={`${option.title}: ${option.description}${selectedVisibility === option.value ? ', selected' : ''}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selectedVisibility === option.value }}
      accessibilityHint="Double tap to select this visibility level"
    >
      <View style={styles.optionHeader}>
        <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
          <Ionicons name={option.icon as any} size={24} color={option.color} />
        </View>

        <View style={styles.optionInfo}>
          <ThemedText style={styles.optionTitle}>{option.title}</ThemedText>
          <ThemedText style={styles.optionDescription}>{option.description}</ThemedText>
        </View>

        {selectedVisibility === option.value && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.brand.purple} />
          </View>
        )}
      </View>
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />
        <LinearGradient colors={[Colors.brand.purple, Colors.brand.purple]} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Profile Visibility</ThemedText>
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
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />

      {/* Header */}
      <LinearGradient colors={[Colors.brand.purple, Colors.brand.purple]} style={styles.header}>
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

          <ThemedText style={styles.headerTitle}>Profile Visibility</ThemedText>

          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Current Setting */}
        <View style={styles.currentSection}>
          <ThemedText style={styles.sectionTitle}>Current Setting</ThemedText>
          <View style={styles.currentCard}>
            <ThemedText style={styles.currentLabel}>Profile Visibility</ThemedText>
            <ThemedText style={styles.currentValue}>
              {selectedVisibility === 'PUBLIC' ? 'Public' :
               selectedVisibility === 'FRIENDS' ? 'Friends Only' : 'Private'}
            </ThemedText>
          </View>
        </View>

        {/* Options */}
        <View style={styles.optionsSection}>
          <ThemedText style={styles.sectionTitle}>Choose Visibility Level</ThemedText>
          {VISIBILITY_OPTIONS.map(renderVisibilityOption)}
        </View>

        {/* Information */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color={Colors.brand.purple} />
              <ThemedText style={styles.infoTitle}>About Profile Visibility</ThemedText>
            </View>
            <ThemedText style={styles.infoText}>
              <ThemedText style={{ fontWeight: '600', color: Colors.text.primary }}>Public</ThemedText>
              {' — Anyone can view your profile, activity, and saved items.\n'}
              <ThemedText style={{ fontWeight: '600', color: Colors.text.primary }}>Friends Only</ThemedText>
              {' — Only users you follow back can see your profile.\n'}
              <ThemedText style={{ fontWeight: '600', color: Colors.text.primary }}>Private</ThemedText>
              {' — Your profile is hidden from everyone except you.'}
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
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  currentSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  currentCard: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    }),
  } as any,
  currentLabel: {
    fontSize: Typography.bodyLarge.fontSize,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  currentValue: {
    fontSize: Typography.bodyLarge.fontSize,
    color: Colors.brand.purple,
    fontWeight: '600',
  },
  optionsSection: {
    marginBottom: Spacing.xl,
  },
  optionCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    }),
  } as any,
  selectedOption: {
    borderWidth: 2,
    borderColor: Colors.brand.purple,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  optionDescription: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  selectedIndicator: {
    marginLeft: Spacing.md,
  },
  infoSection: {
    marginBottom: Spacing.xl,
  },
  infoCard: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    }),
  } as any,
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoTitle: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  infoText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  footer: {
    height: 20,
  },
});


export default withErrorBoundary(ProfileVisibilityPage, 'AccountProfileVisibility');
