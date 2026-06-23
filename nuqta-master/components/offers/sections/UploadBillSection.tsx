// @ts-nocheck
/**
 * UploadBillSection Component
 *
 * Upload Bill, Earn Coins - Offline purchases rewards
 * ReZ brand styling
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { SectionHeader } from '../common';
import { UploadBillStore } from '@/types/offers.types';
import { Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface UploadBillSectionProps {
  stores: UploadBillStore[];
  onViewAll?: () => void;
}

export const UploadBillSection: React.FC<UploadBillSectionProps> = ({
  stores,
  onViewAll,
}) => {
  const router = useRouter();
  const { theme, isDark } = useOffersTheme();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  if (stores.length === 0) return null;

  const handleUploadPress = (store: UploadBillStore) => {
    router.push(`/upload-bill/${store.id}`);
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: Spacing.lg,
    },
    card: {
      marginHorizontal: Spacing.base,
      backgroundColor: isDark ? theme.colors.background.card : colors.background.primary,
      borderRadius: BorderRadius.lg,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(0, 192, 106, 0.3)' : '#A7F3D0',
      overflow: 'hidden',
      ...(isDark ? {} : Shadows.medium),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      backgroundColor: isDark ? 'rgba(0, 192, 106, 0.1)' : '#E6F9F0',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(0, 192, 106, 0.2)' : '#A7F3D0',
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: Colors.primary[600],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.text.secondary,
    },
    storesList: {
      padding: Spacing.sm,
    },
    storeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? theme.colors.border.light : '#F0F4F8',
    },
    storeItemLast: {
      borderBottomWidth: 0,
    },
    storeLogoContainer: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.background.primary,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.neutral[200],
      ...Shadows.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    storeLogo: {
      width: 36,
      height: 36,
    },
    storeLogoPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: Colors.primary[600],
      alignItems: 'center',
      justifyContent: 'center',
    },
    storeLogoText: {
      color: colors.background.primary,
      fontSize: 18,
      fontWeight: '700',
    },
    storeInfo: {
      flex: 1,
    },
    storeName: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    storeCategory: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.text.tertiary,
    },
    coinsInfo: {
      alignItems: 'flex-end',
      marginRight: Spacing.sm,
    },
    coinsRate: {
      fontSize: 14,
      fontWeight: '800',
      color: Colors.primary[600],
    },
    coinsLabel: {
      fontSize: 9,
      fontWeight: '500',
      color: theme.colors.text.tertiary,
    },
    uploadButton: {
      backgroundColor: Colors.primary[600],
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
    },
    uploadButtonText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.background.primary,
    },
  });

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Upload Bill, Earn Coins"
        subtitle={`Offline purchases = ${BRAND.APP_NAME} rewards`}
        icon="document-text"
        iconColor={Colors.primary[600]}
        showViewAll={false}
      />
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="receipt-outline" size={20} color={colors.background.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Shop offline, earn online</Text>
            <Text style={styles.headerSubtitle}>
              {`Upload your bill and get ${BRAND.COIN_NAME} instantly`}
            </Text>
          </View>
        </View>

        <View style={styles.storesList}>
          {stores.slice(0, 4).map((store, index) => (
            <View
              key={store.id}
              style={[
                styles.storeItem,
                index === Math.min(stores.length, 4) - 1 && styles.storeItemLast,
              ]}
            >
              <View style={styles.storeLogoContainer}>
                {store.logo ? (
                  <CachedImage
                    source={{ uri: store.logo }}
                    style={styles.storeLogo}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.storeLogoPlaceholder}>
                    <Text style={styles.storeLogoText}>
                      {store.name.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{store.name}</Text>
                <Text style={styles.storeCategory}>{store.category}</Text>
              </View>

              <View style={styles.coinsInfo}>
                <Text style={styles.coinsRate}>{store.coinsPerRupee}x</Text>
                <Text style={styles.coinsLabel}>{`coins/${currencySymbol}1`}</Text>
              </View>

              <Pressable
                style={styles.uploadButton}
                onPress={() => handleUploadPress(store)}
              >
                <Text style={styles.uploadButtonText}>Upload</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default React.memo(UploadBillSection);
