// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Pressable,
  TextInput,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { Category } from '@/types/category.types';
import { useProfile, useProfileMenu } from '@/contexts/ProfileContext';
import { useAuthUser, useIsAuthenticated, useRezBalance } from '@/stores/selectors';
import ProfileMenuModal from '@/components/profile/ProfileMenuModal';
import { profileMenuSections } from '@/constants/profileMenu';
import { colors } from '@/constants/theme';

interface CategoryHeaderProps {
  category: Category;
  onSearch: (query: string) => void;
  onBack: () => void;
  searchQuery: string;
  onFilterPress?: () => void;
  showFilterBadge?: boolean;
  stats?: {
    productCount: number;
    storeCount: number;
    maxCashback?: number;
  };
}

function CategoryHeader({
  category,
  onSearch,
  onBack,
  searchQuery,
  onFilterPress,
  showFilterBadge = false,
  stats,
}: CategoryHeaderProps) {
  const router = useRouter();
  const { user: profileUser, isModalVisible, showModal, hideModal } = useProfile();
  const { handleMenuItemPress } = useProfileMenu();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const userPoints = useRezBalance();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { width, height } = Dimensions.get('window');

  const statusBarHeight = Platform.OS === 'ios'
    ? (height >= 812 ? 44 : 20)
    : StatusBar.currentHeight ?? 24;

  const handleClearSearch = () => {
    onSearch('');
  };

  const handleCartPress = () => {
    router.push('/cart');
  };

  const handleCoinPress = () => {
    router.push('/coins');
  };

  return (
    <LinearGradient
      colors={category.headerConfig.backgroundColor as any}
      style={[styles.container, { paddingTop: statusBarHeight + 8 }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      {/* Top Row - Navigation and Actions */}
      <View style={styles.topRow}>
        {/* Back Button */}
        <Pressable
          style={styles.iconButton}
          onPress={onBack}
         
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={category.headerConfig.textColor} />
        </Pressable>

        {/* Title */}
        <View style={styles.titleContainer}>
          <ThemedText
            style={[styles.title, { color: category.headerConfig.textColor }]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {category.headerConfig.title}
          </ThemedText>
        </View>

        {/* Right Actions */}
        <View style={styles.rightActions}>
          {/* Coin Balance */}
          {category.headerConfig.showCoinBalance && (
            <Pressable
              style={styles.coinContainer}
              onPress={handleCoinPress}
             
              accessibilityLabel={`Coin balance: ${userPoints} coins`}
              accessibilityRole="button"
              accessibilityHint="Double tap to view coin details"
            >
              <Ionicons name="star" size={16} color={colors.brand.goldBright} />
              <ThemedText style={[styles.coinText, { color: category.headerConfig.textColor }]}>
                {userPoints}
              </ThemedText>
            </Pressable>
          )}

          {/* Cart Button */}
          {category.headerConfig.showCart && (
            <Pressable
              style={styles.iconButton}
              onPress={handleCartPress}
             
              accessibilityLabel="Open cart"
              accessibilityRole="button"
            >
              <Ionicons name="bag-outline" size={20} color={category.headerConfig.textColor} />
            </Pressable>
          )}

          {/* Profile Avatar */}
          <Pressable
            style={styles.profileAvatar}
            onPress={() => {
              if (Platform.OS === 'ios') {
                setTimeout(() => showModal(), 50);
              } else {
                showModal();
              }
            }}
           
            delayPressIn={Platform.OS === 'ios' ? 50 : 0}
            accessibilityLabel="Open profile menu"
            accessibilityRole="button"
            accessibilityHint="Double tap to open profile and settings menu"
          >
            <ThemedText style={styles.profileText}>{user?.initials || 'R'}</ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      {category.headerConfig.showSearch && (
        <View style={styles.searchContainer}>
          <View style={[
            styles.searchInputContainer,
            isSearchFocused && styles.searchInputContainerFocused
          ]}>
            {/* Search Icon */}
            <Ionicons
              name="search"
              size={20}
              color={colors.neutral[500]}
              style={styles.searchIcon}
            />

            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={onSearch}
              placeholder={category.headerConfig.searchPlaceholder || 'Search...'}
              placeholderTextColor={colors.neutral[400]}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              maxLength={100}
              accessibilityLabel={`Search ${category.name.toLowerCase()}`}
              underlineColorAndroid="transparent"
            />

            {/* Clear Button */}
            {searchQuery.length > 0 && (
              <Pressable
                style={styles.clearButton}
                onPress={handleClearSearch}
               
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.neutral[400]}
                />
              </Pressable>
            )}

            {/* Filter Button */}
            {onFilterPress && (
              <Pressable
                style={[styles.filterButton, showFilterBadge && styles.filterButtonActive]}
                onPress={onFilterPress}
               
                accessibilityLabel="Open filters"
                accessibilityRole="button"
              >
                <Ionicons
                  name="filter"
                  size={18}
                  color={showFilterBadge ? colors.lightMustard : colors.neutral[500]}
                />
                {showFilterBadge && <View style={styles.filterBadge} />}
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Category Description (if no search) */}
      {!category.headerConfig.showSearch && category.shortDescription && (
        <View style={styles.descriptionContainer}>
          <ThemedText
            style={[styles.description, { color: category.headerConfig.textColor }]}
            numberOfLines={2}
          >
            {category.shortDescription}
          </ThemedText>
        </View>
      )}

      {/* Stats Row */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: category.headerConfig.textColor }]}>
              {stats.productCount}+
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: category.headerConfig.textColor }]}>
              Products
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: category.headerConfig.textColor, opacity: 0.3 }]} />
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: category.headerConfig.textColor }]}>
              {stats.maxCashback || 25}%
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: category.headerConfig.textColor }]}>
              Max Cashback
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: category.headerConfig.textColor, opacity: 0.3 }]} />
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: category.headerConfig.textColor }]}>
              {stats.storeCount}+
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: category.headerConfig.textColor }]}>
              Brands
            </ThemedText>
          </View>
        </View>
      )}

      {/* Profile Menu Modal */}
      {profileUser && (
        <ProfileMenuModal
          visible={isModalVisible}
          onClose={hideModal}
          user={profileUser}
          menuSections={profileMenuSections}
          onMenuItemPress={handleMenuItemPress}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
    minHeight: 44,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    minWidth: 100,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
    flexWrap: 'wrap',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    shadowColor: colors.brand.goldBright,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  coinText: {
    fontSize: 14,
    fontWeight: '600',
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.lightMustard,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand.goldBright,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  profileText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  searchContainer: {
    paddingHorizontal: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    minHeight: 50,
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)',
  },
  searchInputContainerFocused: {
    shadowOpacity: 0.3,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 205, 87, 0.4)',
    backgroundColor: colors.background.primary,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral[800],
    fontWeight: '400',
    paddingVertical: 0,
    outlineWidth: 0, // Web only
  } as any,
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  filterButton: {
    padding: 10,
    marginLeft: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(255, 205, 87, 0.15)',
    borderColor: 'rgba(255, 205, 87, 0.3)',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.lightMustard,
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  descriptionContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    opacity: 0.8,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
});

export default React.memo(CategoryHeader);
