/**
 * SpecialProfilesSection Component
 *
 * Special Profiles - Defence, Healthcare, Senior, Teachers
 * ReZ brand styling
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { SectionHeader, HorizontalScrollSection } from '../common';
import { SpecialProfile } from '@/types/offers.types';
import { Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface SpecialProfilesSectionProps {
  profiles: SpecialProfile[];
  onViewAll?: () => void;
}

export const SpecialProfilesSection: React.FC<SpecialProfilesSectionProps> = ({
  profiles,
  onViewAll,
}) => {
  const router = useRouter();
  const { theme, isDark } = useOffersTheme();

  if (profiles.length === 0) return null;

  const handleProfilePress = (profile: SpecialProfile) => {
    if (profile.isVerified) {
      router.push(`/offers/zones/${profile.slug}` as any);
    } else {
      router.push(`/offers/zones/${profile.slug}/verify` as any);
    }
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: Spacing.lg,
    },
    card: {
      width: 140,
      backgroundColor: isDark ? theme.colors.background.card : colors.background.primary,
      borderRadius: BorderRadius.lg,
      borderWidth: 1.5,
      overflow: 'hidden',
      ...(isDark ? {} : Shadows.medium),
    },
    cardContent: {
      padding: Spacing.md,
      alignItems: 'center',
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    profileName: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: 4,
    },
    offersCount: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    verifiedBadge: {
      backgroundColor: colors.tint.green,
    },
    unverifiedBadge: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : colors.tint.amberLight,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '700',
      marginLeft: 4,
    },
    verifiedText: {
      color: colors.successScale[700],
    },
    unverifiedText: {
      color: colors.warningScale[700],
    },
    verifyPrompt: {
      marginHorizontal: Spacing.base,
      marginTop: Spacing.md,
      backgroundColor: isDark ? 'rgba(0, 192, 106, 0.1)' : Colors.primary[50],
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(0, 192, 106, 0.3)' : Colors.primary[200],
    },
    verifyIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: Colors.primary[600],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    verifyText: {
      flex: 1,
    },
    verifyTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    verifySubtitle: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.colors.text.secondary,
    },
    verifyButton: {
      backgroundColor: Colors.primary[600],
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
    },
    verifyButtonText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.background.primary,
    },
  });

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Special Profiles"
        subtitle="Exclusive offers for verified members"
        icon="ribbon"
        iconColor={Colors.primary[600]}
        showViewAll={profiles.length > 4}
        onViewAll={onViewAll}
      />
      <HorizontalScrollSection>
        {profiles.map((profile) => (
          <Pressable
            key={profile.id}
            style={[
              styles.card,
              {
                borderColor: isDark
                  ? `${profile.iconColor}40`
                  : profile.backgroundColor,
              },
            ]}
            onPress={() => handleProfilePress(profile)}
           
          >
            <View style={styles.cardContent}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: profile.backgroundColor },
                ]}
              >
                <Ionicons
                  name={profile.icon as any}
                  size={28}
                  color={profile.iconColor}
                />
              </View>

              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.offersCount}>
                {profile.offersCount} offers
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  profile.isVerified
                    ? styles.verifiedBadge
                    : styles.unverifiedBadge,
                ]}
              >
                <Ionicons
                  name={profile.isVerified ? 'checkmark-circle' : 'lock-closed'}
                  size={12}
                  color={profile.isVerified ? colors.successScale[700] : colors.warningScale[700]}
                />
                <Text
                  style={[
                    styles.statusText,
                    profile.isVerified
                      ? styles.verifiedText
                      : styles.unverifiedText,
                  ]}
                >
                  {profile.isVerified ? 'Verified' : 'Verify'}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </HorizontalScrollSection>

      <Pressable
        style={styles.verifyPrompt}
        onPress={() => {
          const firstUnverified = profiles.find((p: any) => !p.isVerified);
          if (firstUnverified) {
            router.push(`/offers/zones/${firstUnverified.slug}/verify` as any);
          }
        }}
       
      >
        <View style={styles.verifyIcon}>
          <Ionicons name="shield-checkmark" size={20} color={colors.background.primary} />
        </View>
        <View style={styles.verifyText}>
          <Text style={styles.verifyTitle}>Don't see your deals?</Text>
          <Text style={styles.verifySubtitle}>
            Verify your profile to unlock exclusive offers
          </Text>
        </View>
        <View style={styles.verifyButton}>
          <Text style={styles.verifyButtonText}>Verify</Text>
        </View>
      </Pressable>
    </View>
  );
};

export default React.memo(SpecialProfilesSection);
