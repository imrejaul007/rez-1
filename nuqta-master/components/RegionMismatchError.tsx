// @ts-nocheck
/**
 * Region Mismatch Error Component
 * Displayed when user tries to access a store/product from a different region
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRegionState, useSetRegion } from '@/stores/selectors';
import type { RegionId } from '@/stores/regionStore';
import { colors } from '@/constants/theme';

// Region data with flags
const REGION_DATA: Record<RegionId, { name: string; flag: string; description: string }> = {
  bangalore: { name: 'Bangalore', flag: '\uD83C\uDDEE\uD83C\uDDF3', description: 'India' },
  dubai: { name: 'Dubai', flag: '\uD83C\uDDE6\uD83C\uDDEA', description: 'UAE' },
  china: { name: 'China', flag: '\uD83C\uDDE8\uD83C\uDDF3', description: 'Mainland China' },
};

interface RegionMismatchErrorProps {
  itemType?: 'store' | 'product';
  itemName?: string;
  suggestedRegion?: RegionId;
  onSwitchRegion?: () => void;
  onGoBack?: () => void;
}

export function RegionMismatchError({
  itemType = 'store',
  itemName,
  suggestedRegion,
  onSwitchRegion,
  onGoBack
}: RegionMismatchErrorProps) {
  const router = useRouter();
  const state = useRegionState();
  const setRegion = useSetRegion();

  const currentRegionData = REGION_DATA[state.currentRegion];
  const suggestedRegionData = suggestedRegion ? REGION_DATA[suggestedRegion] : null;

  const handleSwitchRegion = async () => {
    if (suggestedRegion) {
      await setRegion(suggestedRegion);
      onSwitchRegion?.();
    }
  };

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      router.back();
    }
  };

  const handleGoHome = () => {
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="location-outline" size={64} color="#FF6B6B" />
          <View style={styles.iconBadge}>
            <Ionicons name="close" size={20} color={colors.background.primary} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Not Available in Your Region</Text>

        {/* Description */}
        <Text style={styles.description}>
          {itemName ? (
            <>
              <Text style={styles.itemName}>{itemName}</Text>
              {' is not available in '}
              <Text style={styles.regionName}>
                {currentRegionData.flag} {currentRegionData.name}
              </Text>
              {'.'}
            </>
          ) : (
            <>
              {'This '}
              {itemType}
              {' is not available in '}
              <Text style={styles.regionName}>
                {currentRegionData.flag} {currentRegionData.name}
              </Text>
              {'.'}
            </>
          )}
        </Text>

        {/* Suggested Region */}
        {suggestedRegionData && (
          <View style={styles.suggestionBox}>
            <Text style={styles.suggestionTitle}>Available in:</Text>
            <View style={styles.suggestionRegion}>
              <Text style={styles.suggestionFlag}>{suggestedRegionData.flag}</Text>
              <View>
                <Text style={styles.suggestionName}>{suggestedRegionData.name}</Text>
                <Text style={styles.suggestionDescription}>
                  {suggestedRegionData.description}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {suggestedRegion && (
            <Pressable
              style={styles.primaryButton}
              onPress={handleSwitchRegion}
             
            >
              <Ionicons name="swap-horizontal" size={20} color={colors.background.primary} />
              <Text style={styles.primaryButtonText}>
                Switch to {suggestedRegionData?.name}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={styles.secondaryButton}
            onPress={handleGoBack}
           
          >
            <Ionicons name="arrow-back" size={20} color={colors.brand.ios} />
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </Pressable>

          <Pressable
            style={styles.tertiaryButton}
            onPress={handleGoHome}
           
          >
            <Text style={styles.tertiaryButtonText}>Go to Home</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Inline error banner for partial page display
interface RegionMismatchBannerProps {
  message?: string;
  suggestedRegion?: RegionId;
  onSwitchRegion?: () => void;
  onDismiss?: () => void;
}

export function RegionMismatchBanner({
  message = "This content isn't available in your region",
  suggestedRegion,
  onSwitchRegion,
  onDismiss
}: RegionMismatchBannerProps) {
  const state = useRegionState();
  const setRegion = useSetRegion();
  const suggestedRegionData = suggestedRegion ? REGION_DATA[suggestedRegion] : null;

  const handleSwitch = async () => {
    if (suggestedRegion) {
      await setRegion(suggestedRegion);
      onSwitchRegion?.();
    }
  };

  return (
    <View style={styles.banner}>
      <View style={styles.bannerContent}>
        <Ionicons name="warning" size={24} color="#FF9800" />
        <Text style={styles.bannerText}>{message}</Text>
      </View>

      {suggestedRegion && (
        <Pressable
          style={styles.bannerButton}
          onPress={handleSwitch}
        >
          <Text style={styles.bannerButtonText}>
            Switch to {suggestedRegionData?.name}
          </Text>
        </Pressable>
      )}

      {onDismiss && (
        <Pressable
          style={styles.bannerDismiss}
          onPress={onDismiss}
        >
          <Ionicons name="close" size={20} color={colors.midGray} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  iconBadge: {
    position: 'absolute',
    bottom: 0,
    right: -8,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: colors.midGray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  itemName: {
    fontWeight: '600',
    color: colors.darkGray,
  },
  regionName: {
    fontWeight: '600',
    color: colors.brand.ios,
  },
  suggestionBox: {
    backgroundColor: '#F5F9FF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0ECFF',
  },
  suggestionTitle: {
    fontSize: 13,
    color: colors.midGray,
    marginBottom: 12,
    fontWeight: '500',
  },
  suggestionRegion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  suggestionFlag: {
    fontSize: 40,
  },
  suggestionName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
  },
  suggestionDescription: {
    fontSize: 14,
    color: colors.midGray,
    marginTop: 2,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.brand.ios,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.brand.ios,
  },
  secondaryButtonText: {
    color: colors.brand.ios,
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    color: colors.midGray,
    fontSize: 14,
    fontWeight: '500',
  },

  // Banner styles
  banner: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    color: '#5D4037',
  },
  bannerButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  bannerButtonText: {
    color: colors.background.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  bannerDismiss: {
    padding: 4,
    marginLeft: 8,
  },
});

export default React.memo(RegionMismatchError);
