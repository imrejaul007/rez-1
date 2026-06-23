// Group Card Component
// Displays group information in a card format

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GroupBuyingGroup } from '@/types/groupBuying.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface GroupCardProps {
  group: GroupBuyingGroup;
  onPress: () => void;
  showJoinButton?: boolean;
}

function GroupCard({ group, onPress, showJoinButton = false }: GroupCardProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const spotsLeft = group.maxMembers - group.currentMemberCount;
  const progress = (group.currentMemberCount / group.maxMembers) * 100;
  const isAlmostFull = spotsLeft <= 2;
  const isMinimumMet = group.currentMemberCount >= group.minMembers;

  const timeLeft = new Date(group.expiresAt).getTime() - Date.now();
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Product Image */}
      <CachedImage
        source={
          typeof group.product.image === 'string'
            ? { uri: group.product.image }
            : group.product.image
        }
        style={styles.image}
      />

      {/* Discount Badge */}
      <LinearGradient
        colors={[colors.successScale[400], colors.successScale[700]]}
        style={styles.discountBadge}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.discountText}>
          {group.currentTier.discountPercentage}% OFF
        </Text>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {/* Product Name */}
        <Text style={styles.productName} numberOfLines={2}>
          {group.product.name}
        </Text>

        {/* Store Name */}
        <View style={styles.storeRow}>
          <Ionicons name="storefront-outline" size={14} color={colors.neutral[500]} />
          <Text style={styles.storeName}>{group.product.storeName}</Text>
        </View>

        {/* Price Info */}
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.currentPrice}>
              {currencySymbol}{group.currentTier.pricePerUnit.toFixed(2)}
            </Text>
            <Text style={styles.originalPrice}>
              {currencySymbol}{group.product.basePrice.toFixed(2)}
            </Text>
          </View>
          <View style={styles.savingsContainer}>
            <Text style={styles.savingsLabel}>You Save</Text>
            <Text style={styles.savingsAmount}>
              {currencySymbol}{(group.product.basePrice - group.currentTier.pricePerUnit).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
                isAlmostFull && styles.progressFillAlmostFull,
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {group.currentMemberCount} / {group.maxMembers} members
          </Text>
        </View>

        {/* Status Row */}
        <View style={styles.statusRow}>
          {/* Spots Left */}
          <View style={styles.statusItem}>
            <Ionicons
              name="people"
              size={16}
              color={isAlmostFull ? colors.error : colors.brand.purpleLight}
            />
            <Text
              style={[
                styles.statusText,
                isAlmostFull && styles.statusTextUrgent,
              ]}
            >
              {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
            </Text>
          </View>

          {/* Time Left */}
          <View style={styles.statusItem}>
            <Ionicons name="time-outline" size={16} color={colors.warningScale[400]} />
            <Text style={styles.statusText}>
              {hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m`}
            </Text>
          </View>
        </View>

        {/* Minimum Status */}
        {isMinimumMet && (
          <View style={styles.minimumMetBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
            <Text style={styles.minimumMetText}>Minimum members reached!</Text>
          </View>
        )}

        {/* Join Button */}
        {showJoinButton && (
          <Pressable style={styles.joinButton} onPress={onPress}>
            <Text style={styles.joinButtonText}>Join Group</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </Pressable>
        )}
      </View>
    </Pressable>
);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  storeName: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.brand.purpleLight,
  },
  originalPrice: {
    fontSize: 14,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  savingsContainer: {
    alignItems: 'flex-end',
  },
  savingsLabel: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  savingsAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.successScale[400],
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 4,
  },
  progressFillAlmostFull: {
    backgroundColor: colors.error,
  },
  progressText: {
    fontSize: 12,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  statusTextUrgent: {
    color: colors.error,
  },
  minimumMetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tint.green,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  minimumMetText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.successScale[400],
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.purpleLight,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default React.memo(GroupCard);
