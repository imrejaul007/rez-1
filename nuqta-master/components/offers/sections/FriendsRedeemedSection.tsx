/**
 * FriendsRedeemedSection Component
 *
 * Social proof - offers friends have redeemed
 * ReZ brand styling
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { SectionHeader, HorizontalScrollSection } from '../common';
import { FriendRedeemedOffer } from '@/types/offers.types';
import { Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface FriendsRedeemedSectionProps {
  offers: FriendRedeemedOffer[];
  onViewAll?: () => void;
}

export const FriendsRedeemedSection: React.FC<FriendsRedeemedSectionProps> = ({
  offers,
  onViewAll,
}) => {
  const router = useRouter();
  const { theme, isDark } = useOffersTheme();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  if (offers.length === 0) return null;

  const handleOfferPress = (offer: FriendRedeemedOffer) => {
    router.push(`/offers/${offer.offer.id}`);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: Spacing.lg,
    },
    card: {
      width: 200,
      backgroundColor: isDark ? theme.colors.background.card : colors.background.primary,
      borderRadius: BorderRadius.lg,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(236, 72, 153, 0.3)' : '#FBCFE8',
      overflow: 'hidden',
      ...(isDark ? {} : Shadows.medium),
    },
    friendHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.sm,
      paddingVertical: Spacing.sm + 2,
      backgroundColor: isDark ? 'rgba(236, 72, 153, 0.1)' : '#FDF2F8',
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: Spacing.sm,
      borderWidth: 2,
      borderColor: colors.brand.pink,
    },
    friendInfo: {
      flex: 1,
    },
    friendName: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.text.primary,
      letterSpacing: -0.2,
    },
    timeAgo: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.colors.text.tertiary,
    },
    imageContainer: {
      height: 100,
      position: 'relative',
      backgroundColor: '#F7FAFC',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    content: {
      padding: Spacing.sm,
    },
    storeName: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.text.tertiary,
      marginBottom: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    title: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: Spacing.xs,
      letterSpacing: -0.2,
    },
    savingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    savingsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.linen,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 5,
    },
    savingsText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.nileBlue,
      marginLeft: 3,
    },
    cashbackBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(0, 192, 106, 0.1)' : '#E6F9F0',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 5,
    },
    cashbackText: {
      fontSize: 10,
      fontWeight: '700',
      color: Colors.primary[600],
      marginLeft: 3,
    },
  });

  return (
    <View style={styles.container}>
      <SectionHeader
        title="People saving near you"
        subtitle="What others near you redeemed"
        icon="people"
        iconColor={colors.brand.pink}
        showViewAll={offers.length > 2}
        onViewAll={onViewAll}
      />
      <HorizontalScrollSection>
        {offers.map((item) => (
          <Pressable
            key={item.id}
            style={styles.card}
            onPress={() => handleOfferPress(item)}
           
          >
            <View style={styles.friendHeader}>
              <CachedImage
                source={{ uri: item.friendAvatar }}
                style={styles.avatar}
                cachePolicy="memory-disk"
              />
              <View style={styles.friendInfo}>
                <Text style={styles.friendName} numberOfLines={1}>
                  {item.friendName}
                </Text>
                <Text style={styles.timeAgo}>
                  {formatTimeAgo(item.redeemedAt)}
                </Text>
              </View>
            </View>

            <View style={styles.imageContainer}>
              <CachedImage
                source={{ uri: item.offer.image }}
                style={styles.image}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            </View>

            <View style={styles.content}>
              <Text style={styles.storeName} numberOfLines={1}>
                {item.offer.store}
              </Text>
              <Text style={styles.title} numberOfLines={1}>
                {item.offer.title}
              </Text>
              <View style={styles.savingsRow}>
                <View style={styles.savingsBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.nileBlue} />
                  <Text style={styles.savingsText}>
                    {currencySymbol}{item.offer.savings.toFixed(0)} saved
                  </Text>
                </View>
                {item.offer.cashbackPercentage > 0 && (
                  <View style={styles.cashbackBadge}>
                    <Ionicons name="wallet-outline" size={10} color={Colors.primary[600]} />
                    <Text style={styles.cashbackText}>
                      +{item.offer.cashbackPercentage}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        ))}
      </HorizontalScrollSection>
    </View>
  );
};

export default React.memo(FriendsRedeemedSection);
