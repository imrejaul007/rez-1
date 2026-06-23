/**
 * StoreFollowButton Integration Examples
 *
 * This file contains practical integration examples for different use cases.
 * Copy and adapt these examples for your specific needs.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import StoreFollowButton from './StoreFollowButton';
import { colors } from '@/constants/theme';

// ============================================================================
// EXAMPLE 1: Integration in MainStorePage Header
// ============================================================================

export function MainStorePageHeaderExample() {
  const storeData = {
    id: 'store-123',
    name: 'Fashion Boutique',
    followerCount: 1234,
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <Text style={styles.storeName}>{storeData.name}</Text>
        <Text style={styles.storeSubtitle}>Premium Fashion Store</Text>
      </View>

      <View style={styles.headerRight}>
        <StoreFollowButton
          storeId={storeData.id}
          storeName={storeData.name}
          initialFollowerCount={storeData.followerCount}
          variant="default"
          showCount={true}
          onFollowChange={(isFollowing) => {
            // Optional: Update analytics, local state, etc.
          }}
        />
      </View>
    </View>
  );
}

// ============================================================================
// EXAMPLE 2: Integration in Store Card (Homepage/Search Results)
// ============================================================================

export function StoreCardExample({ store }: any) {
  return (
    <View style={styles.storeCard}>
      <Image
        source={{ uri: store.image }}
        style={styles.storeCardImage}
        contentFit="cover"
        transition={200}
      />

      <View style={styles.storeCardContent}>
        <Text style={styles.storeCardName}>{store.name}</Text>
        <Text style={styles.storeCardDescription} numberOfLines={2}>
          {store.description}
        </Text>

        <View style={styles.storeCardStats}>
          <Text style={styles.storeCardRating}>⭐ {store.rating}</Text>
          <Text style={styles.storeCardDistance}>📍 {store.distance}</Text>
        </View>
      </View>

      {/* Follow Button - Icon Only (Top Right) */}
      <View style={styles.storeCardFollowButton}>
        <StoreFollowButton
          storeId={store.id}
          storeName={store.name}
          variant="icon-only"
          showCount={false}
        />
      </View>
    </View>
  );
}

// ============================================================================
// EXAMPLE 3: Integration in Store List (Full Row)
// ============================================================================

export function StoreListItemExample({ store }: any) {
  return (
    <View style={styles.storeListItem}>
      <Image
        source={{ uri: store.logo }}
        style={styles.storeListLogo}
        contentFit="contain"
        transition={200}
      />

      <View style={styles.storeListContent}>
        <Text style={styles.storeListName}>{store.name}</Text>
        <Text style={styles.storeListCategory}>{store.category}</Text>
        <Text style={styles.storeListRating}>
          ⭐ {store.rating} ({store.ratingCount} reviews)
        </Text>
      </View>

      <StoreFollowButton
        storeId={store.id}
        storeName={store.name}
        initialFollowerCount={store.followerCount}
        variant="compact"
        showCount={false}
      />
    </View>
  );
}

// ============================================================================
// EXAMPLE 4: Integration with User Profile (Following Stores)
// ============================================================================

export function FollowingStoresExample({ stores }: any) {
  return (
    <ScrollView>
      <Text style={styles.sectionTitle}>Following Stores</Text>

      {stores.map((store: any) => (
        <View key={store.id} style={styles.followingStoreItem}>
          <Image
            source={{ uri: store.logo }}
            style={styles.followingStoreLogo}
            contentFit="contain"
            transition={200}
          />

          <View style={styles.followingStoreInfo}>
            <Text style={styles.followingStoreName}>{store.name}</Text>
            <Text style={styles.followingStoreFollowers}>
              {store.followerCount} followers
            </Text>
          </View>

          {/* Compact Follow Button (Already Following) */}
          <StoreFollowButton
            storeId={store.id}
            storeName={store.name}
            initialFollowing={true}
            initialFollowerCount={store.followerCount}
            variant="compact"
            showCount={false}
          />
        </View>
      ))}
    </ScrollView>
  );
}

// ============================================================================
// EXAMPLE 5: Integration in Store Details Modal
// ============================================================================

export function StoreDetailsModalExample({ store }: any) {
  return (
    <View style={styles.modalContainer}>
      {/* Store Header */}
      <View style={styles.modalHeader}>
        <Image
          source={{ uri: store.banner }}
          style={styles.modalBanner}
          contentFit="cover"
          transition={200}
        />

        <View style={styles.modalHeaderOverlay}>
          <View style={styles.modalHeaderContent}>
            <Image
              source={{ uri: store.logo }}
              style={styles.modalLogo}
              contentFit="contain"
              transition={200}
            />

            <View style={styles.modalHeaderText}>
              <Text style={styles.modalStoreName}>{store.name}</Text>
              <Text style={styles.modalStoreCategory}>{store.category}</Text>
            </View>
          </View>

          {/* Follow Button */}
          <View style={styles.modalFollowButton}>
            <StoreFollowButton
              storeId={store.id}
              storeName={store.name}
              initialFollowerCount={store.followerCount}
              variant="default"
              showCount={true}
            />
          </View>
        </View>
      </View>

      {/* Store Details */}
      <View style={styles.modalContent}>
        <Text style={styles.modalDescription}>{store.description}</Text>
        {/* More content... */}
      </View>
    </View>
  );
}

// ============================================================================
// EXAMPLE 6: Integration with Analytics Tracking
// ============================================================================

export function AnalyticsTrackingExample({ store }: any) {
  const handleFollowChange = (isFollowing: boolean) => {
    // Track with your analytics service
    const analyticsEvent = {
      event: 'store_follow_changed',
      properties: {
        storeId: store.id,
        storeName: store.name,
        action: isFollowing ? 'followed' : 'unfollowed',
        timestamp: new Date().toISOString(),
        userId: 'current-user-id', // Get from auth context
        source: 'main_store_page',
      },
    };

    // Send to analytics service: analytics.track(analyticsEvent);
  };

  return (
    <StoreFollowButton
      storeId={store.id}
      storeName={store.name}
      initialFollowerCount={store.followerCount}
      variant="default"
      onFollowChange={handleFollowChange}
    />
  );
}

// ============================================================================
// EXAMPLE 7: Integration in Recommendation Section
// ============================================================================

export function RecommendedStoresExample({ stores }: any) {
  return (
    <View style={styles.recommendedSection}>
      <Text style={styles.recommendedTitle}>Recommended Stores</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {stores.map((store: any) => (
          <View key={store.id} style={styles.recommendedCard}>
            <Image
              source={{ uri: store.image }}
              style={styles.recommendedCardImage}
              contentFit="cover"
              transition={200}
            />

            <View style={styles.recommendedCardContent}>
              <Text style={styles.recommendedCardName} numberOfLines={1}>
                {store.name}
              </Text>
              <Text style={styles.recommendedCardRating}>
                ⭐ {store.rating}
              </Text>
            </View>

            {/* Follow Button */}
            <StoreFollowButton
              storeId={store.id}
              storeName={store.name}
              variant="compact"
              showCount={false}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// EXAMPLE 8: Dynamic MainStorePage Integration
// ============================================================================

export function DynamicMainStorePageIntegration({ storeData }: any) {
  return (
    <View style={styles.dynamicContainer}>
      {/* Header with Follow Button */}
      <View style={styles.dynamicHeader}>
        <View style={styles.dynamicHeaderInfo}>
          <Text style={styles.dynamicStoreName}>{storeData?.name || 'Store'}</Text>
          <Text style={styles.dynamicStoreRating}>
            ⭐ {storeData?.rating || 0} ({storeData?.ratingCount || 0})
          </Text>
        </View>

        <StoreFollowButton
          storeId={storeData?.id || ''}
          storeName={storeData?.name}
          initialFollowerCount={storeData?.followerCount || 0}
          variant="compact"
          showCount={true}
          onFollowChange={(isFollowing) => {
            // Update parent state if needed
          }}
        />
      </View>

      {/* Store Details */}
      <View style={styles.dynamicContent}>
        <Text style={styles.dynamicDescription}>
          {storeData?.description || 'Welcome to our store!'}
        </Text>
        {/* More content... */}
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Example 1: MainStorePage Header
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#7C3AED',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: 16,
  },
  storeName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background.primary,
  },
  storeSubtitle: {
    fontSize: 14,
    color: '#E9D5FF',
    marginTop: 4,
  },

  // Example 2: Store Card
  storeCard: {
    width: 280,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  storeCardImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.neutral[100],
  },
  storeCardContent: {
    padding: 16,
  },
  storeCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  storeCardDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  storeCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storeCardRating: {
    fontSize: 14,
    color: colors.neutral[700],
  },
  storeCardDistance: {
    fontSize: 14,
    color: colors.neutral[700],
  },
  storeCardFollowButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },

  // Example 3: Store List Item
  storeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  storeListLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.neutral[100],
    marginRight: 12,
  },
  storeListContent: {
    flex: 1,
  },
  storeListName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  storeListCategory: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  storeListRating: {
    fontSize: 13,
    color: colors.neutral[400],
  },

  // Example 4: Following Stores
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[800],
    padding: 16,
  },
  followingStoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.primary,
    marginBottom: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  followingStoreLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.neutral[100],
    marginRight: 12,
  },
  followingStoreInfo: {
    flex: 1,
  },
  followingStoreName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  followingStoreFollowers: {
    fontSize: 13,
    color: colors.neutral[500],
  },

  // Example 5: Store Details Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    position: 'relative',
  },
  modalBanner: {
    width: '100%',
    height: 200,
    backgroundColor: colors.neutral[100],
  },
  modalHeaderOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background.primary,
    marginRight: 12,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalStoreName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 4,
  },
  modalStoreCategory: {
    fontSize: 14,
    color: colors.neutral[200],
  },
  modalFollowButton: {
    alignSelf: 'flex-start',
  },
  modalContent: {
    padding: 16,
  },
  modalDescription: {
    fontSize: 15,
    color: colors.neutral[700],
    lineHeight: 22,
  },

  // Example 7: Recommended Stores
  recommendedSection: {
    paddingVertical: 16,
  },
  recommendedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  recommendedCard: {
    width: 180,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  recommendedCardImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.neutral[100],
  },
  recommendedCardContent: {
    padding: 12,
  },
  recommendedCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  recommendedCardRating: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 8,
  },

  // Example 8: Dynamic MainStorePage
  dynamicContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  dynamicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  dynamicHeaderInfo: {
    flex: 1,
  },
  dynamicStoreName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  dynamicStoreRating: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  dynamicContent: {
    padding: 16,
  },
  dynamicDescription: {
    fontSize: 15,
    color: colors.neutral[700],
    lineHeight: 22,
  },
});

/**
 * USAGE INSTRUCTIONS:
 *
 * 1. Copy the example that matches your use case
 * 2. Adapt the styles to match your design
 * 3. Replace the mock data with your actual store data
 * 4. Add any additional logic or callbacks
 * 5. Test the integration thoroughly
 *
 * For more details, see STORE_FOLLOW_BUTTON_DOCUMENTATION.md
 */
