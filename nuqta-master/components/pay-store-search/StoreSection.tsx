/**
 * StoreSection Component
 *
 * Reusable section component for displaying store lists with title and "See All" action.
 * Used for Nearby, Recent, and Popular store sections.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  StoreSectionProps,
  PaymentStoreInfo,
  PAYMENT_SEARCH_COLORS,
} from '@/types/paymentStoreSearch.types';
import { PaymentStoreCard } from './PaymentStoreCard';
import { PaymentStoreCardSkeleton } from './PaymentStoreCardSkeleton';

export const StoreSection: React.FC<StoreSectionProps> = ({
  title,
  icon,
  stores,
  isLoading,
  onSeeAll,
  onStorePress,
  horizontal = false,
  cardVariant = 'full',
}) => {
  if (isLoading) {
    return (
      <Animated.View
        entering={FadeInDown.springify()}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            {icon && (
              <Text style={styles.icon}>{icon}</Text>
            )}
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>
        <PaymentStoreCardSkeleton
          variant={horizontal ? 'compact' : 'full'}
          count={horizontal ? 4 : 2}
        />
      </Animated.View>
    );
  }

  if (!stores || stores.length === 0) {
    return null;
  }

  const renderHorizontalList = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalScrollContent}
      decelerationRate="fast"
    >
      {stores.map((store, index) => (
        <PaymentStoreCard
          key={store._id}
          store={store}
          onPress={onStorePress}
          index={index}
          variant="compact"
          showCTA={false}
        />
      ))}
    </ScrollView>
  );

  const renderVerticalList = () => (
    <View>
      {stores.map((store, index) => (
        <PaymentStoreCard
          key={store._id}
          store={store}
          onPress={onStorePress}
          index={index}
          variant="full"
          showCTA={true}
        />
      ))}
    </View>
  );

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {icon && (
            <Text style={styles.icon}>{icon}</Text>
          )}
          <Text style={styles.title}>{title}</Text>
        </View>

        {onSeeAll && stores.length > 3 && (
          <Pressable
            onPress={onSeeAll}
            style={styles.seeAllButton}
           
          >
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={PAYMENT_SEARCH_COLORS.primary}
            />
          </Pressable>
        )}
      </View>

      {horizontal ? renderHorizontalList() : renderVerticalList()}
    </Animated.View>
  );
};

// Pre-configured section components
export const NearbyStoresSection: React.FC<Omit<StoreSectionProps, 'title' | 'icon' | 'horizontal' | 'cardVariant'>> = (props) => (
  <StoreSection
    {...props}
    title="Near You"
    icon="📍"
    horizontal
    cardVariant="compact"
  />
);

export const RecentStoresSection: React.FC<Omit<StoreSectionProps, 'title' | 'icon' | 'horizontal' | 'cardVariant'>> = (props) => (
  <StoreSection
    {...props}
    title="Pay Again"
    icon="🕐"
    horizontal
    cardVariant="compact"
  />
);

export const PopularStoresSection: React.FC<Omit<StoreSectionProps, 'title' | 'icon' | 'horizontal' | 'cardVariant'>> = (props) => (
  <StoreSection
    {...props}
    title="Popular Stores"
    icon="🔥"
    horizontal={false}
    cardVariant="full"
  />
);

export const SearchResultsSection: React.FC<Omit<StoreSectionProps, 'title' | 'icon' | 'horizontal' | 'cardVariant'> & { query: string }> = ({ query, ...props }) => (
  <StoreSection
    {...props}
    title={`Results for "${query}"`}
    horizontal={false}
    cardVariant="full"
  />
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: PAYMENT_SEARCH_COLORS.textPrimary,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: PAYMENT_SEARCH_COLORS.primary,
    marginRight: 2,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
  },
});

export default React.memo(StoreSection);
