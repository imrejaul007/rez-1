// @ts-nocheck
/**
 * HomeHeader Component
 *
 * Extracted from app/(tabs)/index.tsx (lines 348-557)
 * Displays the homepage header with location, user stats, and search
 *
 * @component
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import GreetingDisplay from '@/components/location/GreetingDisplay';
import LocationDisplay from '@/components/location/LocationDisplay';
import TierBadge from '@/components/subscription/TierBadge';
import NotificationBell from '@/components/common/NotificationBell';
import NuqtaCoin from './ReZCoin';
import { colors } from '@/constants/theme';

/**
 * HomeHeader Props Interface
 */
export interface HomeHeaderProps {
  /** User's loyalty points */
  userPoints: number;
  /** Current subscription tier */
  subscriptionTier?: 'free' | 'bronze' | 'silver' | 'gold' | 'platinum';
  /** Number of items in cart */
  cartItemCount: number;
  /** Whether detailed location is expanded */
  showDetailedLocation: boolean;
  /** Callback to toggle detailed location display */
  onToggleLocation: () => void;
  /** Animated height value for location expansion */
  animatedHeight: Animated.SharedValue<number>;
  /** Animated opacity value for location expansion */
  animatedOpacity: Animated.SharedValue<number>;
  /** Callback when search is pressed */
  onSearchPress: () => void;
  /** Callback when profile avatar is pressed */
  onProfilePress: () => void;
  /** User initials for avatar display */
  userInitials?: string;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Header styles (optional) */
  headerStyles?: any;
  /** Text styles (optional) */
  textStyles?: any;
}

/**
 * HomeHeader Component
 *
 * Renders the purple gradient header with:
 * - Location display with expand/collapse
 * - Subscription tier badge
 * - Loyalty points counter
 * - Notification bell
 * - Cart icon with badge
 * - Profile avatar
 * - Greeting message
 * - Search bar
 */
export const HomeHeader: React.FC<HomeHeaderProps> = ({
  userPoints,
  subscriptionTier = 'free',
  cartItemCount,
  showDetailedLocation,
  onToggleLocation,
  animatedHeight,
  animatedOpacity,
  onSearchPress,
  onProfilePress,
  userInitials = 'U',
  isAuthenticated,
  headerStyles,
  textStyles,
}) => {
  const router = useRouter();
  const cartBounceAnim = useSharedValue(1);

  const cartBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cartBounceAnim.value }],
  }));

  useEffect(() => {
    if (cartItemCount > 0) {
      cartBounceAnim.value = withSequence(
        withSpring(1.3, { stiffness: 200, damping: 5 }),
        withSpring(1, { stiffness: 200, damping: 10 }),
      );
    }
  }, [cartItemCount]);

  return (
    <LinearGradient
      colors={[colors.lightMustard, colors.brand.goldRich, colors.lightMustard]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={headerStyles.header}
    >
      {/* Header Top Section */}
      <View style={headerStyles.headerTop}>
        {/* Location Display with Expand/Collapse */}
        <Pressable
          style={headerStyles.locationContainer}
          onPress={onToggleLocation}
          accessibilityLabel="Current location"
          accessibilityHint={
            showDetailedLocation
              ? 'Double tap to collapse location details'
              : 'Double tap to expand location details'
          }
          accessibilityState={{ expanded: showDetailedLocation }}
        >
          <LocationDisplay
            compact={true}
            showCoordinates={false}
            showLastUpdated={false}
            showRefreshButton={false}
            style={headerStyles.locationDisplay}
            textStyle={textStyles.locationText}
          />
          <Ionicons
            name={showDetailedLocation ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="white"
            style={headerStyles.locationArrow}
          />
        </Pressable>

        {/* Right Side Icons */}
        <View style={headerStyles.headerRight}>
          {/* Subscription Tier Badge */}
          <Pressable
            onPress={() => {
              if (Platform.OS === 'ios') {
                setTimeout(() => router.push('/subscription/plans'), 50);
              } else {
                router.push('/subscription/plans');
              }
            }}
           
            style={{ marginRight: 12 }}
            accessibilityLabel={`Subscription tier: ${subscriptionTier}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to view subscription plans and upgrade options"
          >
            <TierBadge tier={subscriptionTier} size="small" />
          </Pressable>

          {/* Nuqta Coins - Branded coin display */}
          <NuqtaCoin
            balance={userPoints}
            size="small"
            onPress={() => {
              if (Platform.OS === 'ios') {
                setTimeout(() => router.push('/wallet-screen'), 50);
              } else {
                router.push('/wallet-screen');
              }
            }}
          />

          {/* Notification Bell */}
          <NotificationBell iconSize={24} iconColor="white" />

          {/* Cart Icon */}
          <Pressable
            onPress={() => {
              if (Platform.OS === 'ios') {
                setTimeout(() => router.push('/cart'), 50);
              } else {
                router.push('/cart');
              }
            }}
           
            delayPressIn={Platform.OS === 'ios' ? 50 : 0}
            accessibilityLabel={`Shopping cart: ${cartItemCount} items`}
            accessibilityRole="button"
            accessibilityHint="Double tap to view your shopping cart"
            style={{ position: 'relative' }}
          >
            <Ionicons name="cart-outline" size={24} color="white" />
            {cartItemCount > 0 && (
              <Animated.View
                style={[{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  backgroundColor: '#FF5252',
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                }, cartBadgeStyle]}
              >
                <Text
                  style={{
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                >
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </Text>
              </Animated.View>
            )}
          </Pressable>

          {/* Profile Avatar */}
          <Pressable
            style={headerStyles.profileAvatar}
            onPress={onProfilePress}
           
            accessibilityLabel="User profile menu"
            accessibilityRole="button"
            accessibilityHint="Double tap to open profile menu and account settings"
          >
            <ThemedText style={textStyles.profileText}>
              {userInitials}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Detailed Location Section - Animated */}
      <Animated.View
        style={[
          headerStyles.detailedLocationContainer,
          {
            height: interpolate(animatedHeight.value, [0, 1], [0, 120]),
            opacity: animatedOpacity,
            overflow: 'hidden',
          },
        ]}
      >
        <View style={headerStyles.detailedLocationContent}>
          {/* Full Address Section */}
          <View style={headerStyles.addressSection}>
            <View style={headerStyles.addressHeader}>
              <Ionicons name="location" size={16} color={colors.nileBlue} />
              <Text style={headerStyles.addressHeaderText}>Current Location</Text>
            </View>
            <LocationDisplay
              compact={false}
              showCoordinates={false}
              showLastUpdated={false}
              showRefreshButton={false}
              style={headerStyles.detailedLocationDisplay}
              textStyle={headerStyles.detailedLocationText}
            />
          </View>

          {/* Coordinates Section */}
          <View style={headerStyles.coordinatesSection}>
            <View style={headerStyles.coordinatesHeader}>
              <Ionicons name="navigate" size={14} color={colors.midGray} />
              <Text style={headerStyles.coordinatesHeaderText}>Coordinates</Text>
            </View>
            <LocationDisplay
              compact={true}
              showCoordinates={true}
              showLastUpdated={false}
              showRefreshButton={false}
              style={headerStyles.coordinatesDisplay}
              textStyle={headerStyles.coordinatesText}
            />
          </View>

          {/* Refresh Button */}
          <View style={headerStyles.refreshSection}>
            <LocationDisplay
              compact={true}
              showCoordinates={false}
              showLastUpdated={true}
              showRefreshButton={true}
              style={headerStyles.refreshDisplay}
              textStyle={headerStyles.refreshText}
            />
          </View>
        </View>
      </Animated.View>

      {/* Dynamic Greeting */}
      <View style={headerStyles.greetingContainer}>
        <GreetingDisplay
          showEmoji={true}
          showTime={false}
          showLocation={true}
          animationType="fade"
          maxLength={40}
          style={headerStyles.greetingCard}
          textStyle={textStyles.greeting}
        />
      </View>

      {/* Search Bar */}
      <Pressable
        style={headerStyles.searchContainer}
        onPress={onSearchPress}
       
        accessibilityLabel="Search bar"
        accessibilityRole="search"
        accessibilityHint="Double tap to search for stores, products, and services"
      >
        <Ionicons name="search" size={20} color={colors.midGray} style={headerStyles.searchIcon} />
        <Text style={textStyles.searchPlaceholder}>Search for the service</Text>
      </Pressable>
    </LinearGradient>
  );
};

export default React.memo(HomeHeader);
