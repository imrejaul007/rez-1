// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Dimensions,
  TextInput,
  ActivityIndicator,
  ImageBackground} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  interpolate,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useOnlineVoucher } from '@/hooks/useOnlineVoucher';
import { Brand, Category } from '@/types/voucher.types';
import { useDebounce } from '@/hooks/useDebounce';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { DetailPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');
const CAROUSEL_HEIGHT = 200;
const CATEGORY_CARD_HEIGHT = 88;
const CARD_WIDTH = width - 56; // Card width - wider but with peek space
const CARD_SPACING = 12; // Space between cards
const SNAP_INTERVAL = CARD_WIDTH + CARD_SPACING;

// Premium ReZ Brand Colors (unique to this page)
const COLORS = {
  primary: colors.brand.green,
  primaryDark: colors.brand.teal,
  gold: Colors.gold,
  goldDark: Colors.warning,
  navy: colors.brand.navyDark,
  slate: '#1F2D3D',
  muted: Colors.text.tertiary,
  surface: Colors.background.secondary,
  white: Colors.text.inverse,
  glassWhite: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.4)',
  glassHighlight: 'rgba(255, 255, 255, 0.6)',
  primaryGlow: 'rgba(0, 192, 106, 0.3)',
  goldGlow: 'rgba(255, 200, 87, 0.35)',
};

// Glass Card Component
const GlassCard = ({ children, style, intensity = 60 }: any) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.glassCardWeb, style]}>
        {children}
      </View>
    );
  }
  return (
    <BlurView intensity={intensity} tint="light" style={[styles.glassCard, style]}>
      {children}
    </BlurView>
  );
};

function OnlineVoucherPage() {
  const router = useRouter();
  const { state, handlers, heroCarousel, actions } = useOnlineVoucher();
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const shimmerAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);
  const scrollX = useSharedValue(0);

  // Debounce search input to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchInput, 300);

  useEffect(() => {
    let isMounted = true;

    // Entrance animation
    fadeAnim.value = withTiming(1, { duration: 800 });
    slideAnim.value = withSpring(0, { tension: 50, friction: 7 });

    // Shimmer animation loop
    shimmerAnim.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1
    );

    // Pulse animation for coin badge
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1
    );

    return () => {
      isMounted = false;
    };
  }, [fadeAnim, slideAnim, shimmerAnim, pulseAnim]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery !== state.searchQuery) {
      handlers.handleSearch(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery]);

  const handleSearchChange = (text: string) => {
    setSearchInput(text);
    setShowSearchResults(text.length > 0);
  };

  const clearSearch = () => {
    setSearchInput('');
    handlers.handleSearch('');
    setShowSearchResults(false);
    searchInputRef.current?.blur();
  };

  const handleRetry = () => {
    if (state.error) {
      actions.refreshData();
    }
  };

  const renderHeader = () => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <View style={styles.header}>
        {/* Glass Header Background */}
        {Platform.OS === 'web' ? (
          <View style={styles.headerGlassWeb}>
            <LinearGradient
              colors={['rgba(0, 192, 106, 0.15)', 'rgba(0, 121, 107, 0.1)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </View>
        ) : (
          <BlurView intensity={80} tint="light" style={styles.headerGlass}>
            <LinearGradient
              colors={['rgba(0, 192, 106, 0.15)', 'rgba(0, 121, 107, 0.1)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </BlurView>
        )}

        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={handlers.handleBackNavigation}
           
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <View style={styles.glassButton}>
              <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
            </View>
          </Pressable>

          <View style={styles.coinsContainer}>
            <Animated.View style={[styles.coinsBadge, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={[COLORS.gold, COLORS.goldDark]}
                style={styles.coinsBadgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="star" size={16} color={COLORS.navy} />
                <ThemedText style={styles.coinsText}>{state.userCoins}</ThemedText>
              </LinearGradient>
            </Animated.View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.glassButton}
              onPress={() => handlers.handleShare()}
             
            >
              <Ionicons name="share-outline" size={20} color={COLORS.navy} />
            </Pressable>

            <Pressable
              style={styles.glassButton}
            >
              <Ionicons name="heart-outline" size={20} color={COLORS.primary} />
            </Pressable>
          </View>
        </View>

        {/* Premium Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBarGlass}>
            <View style={styles.searchIconContainer}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.searchIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="search" size={16} color={COLORS.white} />
              </LinearGradient>
            </View>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search vouchers & brands..."
              placeholderTextColor={COLORS.muted}
              value={searchInput}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {searchInput.length > 0 && (
              <Pressable onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={COLORS.muted} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );

  // Premium gradient presets for carousel cards
  const getCardGradient = (index: number, baseColor?: string) => {
    const gradientPresets = [
      ['#667eea', '#764ba2', '#f093fb'], // Purple Dream
      ['#11998e', '#38ef7d', '#00d9ff'], // Emerald Wave
      ['#fc466b', '#3f5efb', '#c471f5'], // Sunset Vibes
      ['#f857a6', '#ff5858', '#ffb199'], // Coral Glow
      ['#4facfe', '#00f2fe', '#43e97b'], // Ocean Breeze
      ['#fa709a', '#fee140', '#ffb347'], // Peach Sunrise
    ];
    if (baseColor) {
      return [baseColor, baseColor + 'DD', baseColor + 'AA'];
    }
    return gradientPresets[index % gradientPresets.length];
  };

  const renderHeroCarouselItem = useCallback(({ item, index }: { item: any; index: number }) => {
              const gradientColors = getCardGradient(index, item.backgroundColor);

              // Calculate scale and opacity based on scroll position
              const inputRange = [
                (index - 1) * SNAP_INTERVAL,
                index * SNAP_INTERVAL,
                (index + 1) * SNAP_INTERVAL,
              ];

              const scale = interpolate(scrollX.value, inputRange, [0.9, 1, 0.9], 'clamp');
              const opacity = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], 'clamp');

              return (
                <Animated.View
                  style={[
                    styles.hero3DWrapper,
                    {
                      transform: [{ scale }],
                      opacity: Animated.multiply(opacity, fadeAnim),
                    },
                  ]}
                >
                  {/* FLOOR SHADOW - Creates floating illusion */}
                  <View style={[
                    styles.heroFloorShadow,
                    Platform.OS === 'web' && {
                      boxShadow: '0px 0px 60px 20px rgba(0, 0, 0, 0.25)',
                    }
                  ]} />

                  <Pressable
                    style={styles.heroCard}
                   
                    onPress={() => {
                      if (item.brandId) {
                        handlers.handleBrandSelect({ id: item.brandId } as any);
                      }
                    }}
                  >
                    {/* OUTER GLOW - Creates the "pop out" effect */}
                    <View style={styles.heroOuterGlow}>
                      <LinearGradient
                        colors={[gradientColors[0] + '60', gradientColors[1] + '30', 'transparent']}
                        style={styles.heroGlowGradient}
                        start={{ x: 0.5, y: 0.5 }}
                        end={{ x: 0.5, y: 1 }}
                      />
                    </View>

                    {/* Main Floating Card */}
                    <View style={[
                      styles.heroFloatingCard,
                      Platform.OS === 'web' && {
                        boxShadow: '0px 20px 50px rgba(0, 0, 0, 0.35), 0px 8px 20px rgba(0, 0, 0, 0.25), 0px 0px 0px 5px rgba(255, 255, 255, 1)',
                      }
                    ]}>
                      {/* Premium Border Glow */}
                      <LinearGradient
                        colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.6)']}
                        style={styles.heroBorderGlow}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {/* Inner Card */}
                        <View style={styles.heroCardInner}>
                          {/* Multi-layer gradient background */}
                          <LinearGradient
                            colors={gradientColors as any}
                            style={styles.heroGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            {/* Decorative floating orbs */}
                            <View style={styles.heroOrbContainer}>
                              <View style={[styles.heroOrb, styles.heroOrbLarge]} />
                              <View style={[styles.heroOrb, styles.heroOrbMedium]} />
                              <View style={[styles.heroOrb, styles.heroOrbSmall]} />
                            </View>

                            {/* Top Light Reflection */}
                            <LinearGradient
                              colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.2)', 'transparent']}
                              style={styles.heroTopReflection}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 0, y: 1 }}
                            />

                            {/* Glass Content Layer */}
                            <View style={styles.heroGlassLayer}>
                              {/* Diagonal Shine Effect */}
                              <View style={styles.heroDiagonalShine} />

                              <View style={styles.heroContent}>
                                <View style={styles.heroText}>
                                  {/* Premium Floating Cashback Badge */}
                                  <View style={styles.heroCashbackBadge}>
                                    <LinearGradient
                                      colors={[COLORS.gold, COLORS.goldDark]}
                                      style={styles.heroCashbackGradient}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 1, y: 1 }}
                                    >
                                      <View style={styles.heroCashbackInnerShine} />
                                      <Ionicons name="gift" size={13} color={COLORS.navy} />
                                      <ThemedText style={styles.heroCashbackText}>
                                        {item.subtitle || 'Up to 15% Cashback'}
                                      </ThemedText>
                                    </LinearGradient>
                                  </View>

                                  {/* Brand Title with Strong Shadow */}
                                  <ThemedText style={styles.heroTitle}>
                                    {item.title}
                                  </ThemedText>

                                  {/* Location Badge */}
                                  {(item as any).store && (
                                    <View style={styles.heroLocationBadge}>
                                      <View style={styles.heroLocationDot} />
                                      <ThemedText style={styles.heroLocationText}>
                                        {(item as any).store.name}
                                      </ThemedText>
                                    </View>
                                  )}

                                  {/* Premium CTA Button */}
                                  <View style={styles.heroCtaButton}>
                                    <ThemedText style={styles.heroCtaText}>Shop Now</ThemedText>
                                    <View style={styles.heroCtaArrow}>
                                      <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
                                    </View>
                                  </View>
                                </View>

                                {/* Premium Floating Icon */}
                                <View style={styles.heroIconSection}>
                                  {/* Multi-ring glow effect */}
                                  <View style={styles.heroIconRing3} />
                                  <View style={styles.heroIconRing2} />
                                  <View style={styles.heroIconRing1} />

                                  {/* Icon Container */}
                                  <View style={styles.heroIconWrapper}>
                                    <LinearGradient
                                      colors={[colors.background.primary, colors.offWhite]}
                                      style={styles.heroIconInner}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 1, y: 1 }}
                                    >
                                      <View style={styles.heroIconTopShine} />
                                      <ThemedText style={styles.heroEmoji}>
                                        {item.image || (item as any).logo || '🎁'}
                                      </ThemedText>
                                    </LinearGradient>
                                  </View>

                                  {/* Sparkles */}
                                  <View style={[styles.heroSparkle, styles.heroSparkle1]} />
                                  <View style={[styles.heroSparkle, styles.heroSparkle2]} />
                                  <View style={[styles.heroSparkle, styles.heroSparkle3]} />
                                  <View style={[styles.heroSparkle, styles.heroSparkle4]} />
                                </View>
                              </View>
                            </View>

                            {/* Bottom Vignette */}
                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.2)']}
                              style={styles.heroBottomVignette}
                              start={{ x: 0.5, y: 0 }}
                              end={{ x: 0.5, y: 1 }}
                            />
                          </LinearGradient>
                        </View>
                      </LinearGradient>
                    </View>

                  </Pressable>
                </Animated.View>
              );
  }, [scrollX, fadeAnim]);

  const renderHeroCarousel = () => {
    const carouselData = heroCarousel;

    if (carouselData.length === 0) return null;

    return (
      <View style={styles.heroSection}>
        {/* Premium Floating Cards Container */}
        <View style={styles.hero3DContainer}>
          <Animated.FlatList
            data={carouselData}
            renderItem={renderHeroCarouselItem}
            keyExtractor={(item, index) => item.id || (item as any)._id || String(index)}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            bounces={false}
            contentContainerStyle={styles.heroCarouselContent}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              {
                useNativeDriver: true,
                listener: (event: any) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / SNAP_INTERVAL);
                  setCarouselIndex(index);
                }
              }
            )}
            scrollEventThrottle={16}
            getItemLayout={(data, index) => ({
              length: SNAP_INTERVAL,
              offset: SNAP_INTERVAL * index,
              index,
            })}
          />
        </View>

        {/* Premium Pill Indicators */}
        <View style={styles.carouselIndicators}>
          <View style={styles.indicatorTrack}>
            {carouselData.map((_, index) => (
              <Pressable
                key={index}
               
                style={styles.indicatorContainer}
              >
                {index === carouselIndex ? (
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={styles.activeIndicator}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View style={styles.indicatorShine} />
                  </LinearGradient>
                ) : (
                  <View style={styles.inactiveIndicator} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderCategories = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <ThemedText style={styles.sectionTitle}>Deal by category</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>Explore vouchers by type</ThemedText>
        </View>
      </View>
      <View style={styles.categoryGrid}>
        {state.categories.map((category, index) => (
          <Animated.View
            key={category.id}
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Pressable
              style={styles.categoryCardGlass}
              onPress={() => handlers.handleCategorySelect(category)}
             
            >
              {Platform.OS === 'web' ? (
                <View style={styles.categoryCardInnerWeb}>
                  <LinearGradient
                    colors={[category.color || COLORS.gold, (category.color || COLORS.goldDark) + 'CC']}
                    style={styles.categoryIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <ThemedText style={styles.categoryIcon}>{category.icon}</ThemedText>
                  </LinearGradient>
                  <View style={styles.categoryTextContainerVertical}>
                    <ThemedText
                      style={styles.categoryName}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {category.name}
                    </ThemedText>
                    {category.brandCount !== undefined && category.brandCount !== null && (
                      <ThemedText style={styles.categoryCount}>
                        {category.brandCount} {category.brandCount === 1 ? 'brand' : 'brands'}
                      </ThemedText>
                    )}
                  </View>
                </View>
              ) : (
                <BlurView intensity={50} tint="light" style={styles.categoryCardInner}>
                  <LinearGradient
                    colors={[category.color || COLORS.gold, (category.color || COLORS.goldDark) + 'CC']}
                    style={styles.categoryIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <ThemedText style={styles.categoryIcon}>{category.icon}</ThemedText>
                  </LinearGradient>
                  <View style={styles.categoryTextContainerVertical}>
                    <ThemedText
                      style={styles.categoryName}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {category.name}
                    </ThemedText>
                    {category.brandCount !== undefined && category.brandCount !== null && (
                      <ThemedText style={styles.categoryCount}>
                        {category.brandCount} {category.brandCount === 1 ? 'brand' : 'brands'}
                      </ThemedText>
                    )}
                  </View>
                </BlurView>
              )}
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );

  const renderBrandCard = (brand: Brand, index?: number) => (
    <Animated.View
      key={brand.id}
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Pressable
        style={styles.brandCardGlass}
        onPress={() => handlers.handleBrandSelect(brand)}
       
      >
        <View style={styles.brandCardContent}>
          <View style={styles.brandHeader}>
            <LinearGradient
              colors={[
                brand.backgroundColor || colors.neutral[100],
                (brand.backgroundColor || colors.neutral[100]) + 'CC',
              ]}
              style={styles.brandLogo}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ThemedText style={[styles.brandLogoText, { color: brand.logoColor || COLORS.navy }]}>
                {brand.logo}
              </ThemedText>
            </LinearGradient>
            <View style={styles.brandInfo}>
              <View style={styles.brandInfoRow}>
                <ThemedText style={styles.brandName} numberOfLines={1}>
                  {brand.name}
                </ThemedText>
                {brand.featured && (
                  <LinearGradient
                    colors={[COLORS.gold, COLORS.goldDark]}
                    style={styles.featuredBadge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <ThemedText style={styles.featuredText}>FEATURED</ThemedText>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.brandCashbackRow}>
                <View style={styles.cashbackIconContainer}>
                  <Ionicons name="gift" size={12} color={COLORS.primary} />
                </View>
                <ThemedText style={styles.brandCashback}>
                  Up to {brand.cashbackRate || 0}% cashback
                </ThemedText>
              </View>
            </View>
            {brand.rating && brand.rating > 0 && (
              <View style={styles.brandRating}>
                <Ionicons name="star" size={14} color={COLORS.gold} />
                <ThemedText style={styles.ratingText}>
                  {brand.rating.toFixed(1)}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );

  const renderNewBrandItem = useCallback(({ item }: { item: Brand }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Pressable
        style={styles.newBrandCardGlass}
        onPress={() => handlers.handleBrandSelect(item)}
      >
        <View style={styles.newBrandCardContent}>
          <LinearGradient
            colors={[
              item.backgroundColor || colors.neutral[100],
              (item.backgroundColor || colors.neutral[100]) + 'DD',
            ]}
            style={styles.newBrandLogo}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ThemedText style={styles.newBrandEmoji}>{item.logo}</ThemedText>
          </LinearGradient>
          <ThemedText style={styles.newBrandName} numberOfLines={1}>
            {item.name}
          </ThemedText>
          <View style={styles.newBrandCashbackBadge}>
            <Ionicons name="gift" size={10} color={COLORS.primary} />
            <ThemedText style={styles.newBrandCashback}>
              {item.cashbackRate || 0}% cashback
            </ThemedText>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  ), [fadeAnim, slideAnim, handlers.handleBrandSelect]);

  const renderNewlyAddedBrands = () => {
    const newlyAdded = state.brands.filter(brand => brand.newlyAdded);

    if (newlyAdded.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <ThemedText style={styles.sectionTitle}>Newly Added</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>Latest voucher brands</ThemedText>
          </View>
          <View style={styles.newBadge}>
            <ThemedText style={styles.newBadgeText}>NEW</ThemedText>
          </View>
        </View>
        <FlashList
          data={newlyAdded}
          renderItem={renderNewBrandItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.newBrandsContent}
          estimatedItemSize={150}
        />
      </View>
    );
  };

  const renderFeaturedBrands = () => {
    const featured = state.brands.filter(brand => brand.featured).length > 0
      ? state.brands.filter(brand => brand.featured)
      : state.brands;

    if (featured.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <ThemedText style={styles.sectionTitle}>All Brands</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>{featured.length} brands available</ThemedText>
          </View>
        </View>
        <View style={styles.brandsList}>
          {featured.map((brand, index) => renderBrandCard(brand, index))}
        </View>
      </View>
    );
  };

  const renderSearchResults = () => {
    if (!showSearchResults || !state.searchQuery) return null;

    return (
      <View style={styles.searchResults}>
        <ThemedText style={styles.searchResultsTitle}>
          Search Results for "{state.searchQuery}"
        </ThemedText>
        {state.loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.brandsList}>
            {state.brands.length > 0 ? (
              state.brands.map((brand) => renderBrandCard(brand))
            ) : (
              <View style={styles.noResults}>
                <View style={styles.noResultsIconContainer}>
                  <Ionicons name="search-outline" size={48} color={COLORS.muted} />
                </View>
                <ThemedText style={styles.noResultsText}>
                  No brands found for "{state.searchQuery}"
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderMainContent = () => {
    if (state.error && !state.loading) {
      return <ErrorState message={state.error} onRetry={handleRetry} />;
    }

    if (state.loading && state.brands.length === 0 && !showSearchResults) {
      return <DetailPageSkeleton />;
    }

    if (showSearchResults) {
      return renderSearchResults();
    }

    return (
      <>
        {renderHeroCarousel()}
        {renderCategories()}
        {renderNewlyAddedBrands()}
        {renderFeaturedBrands()}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Premium Animated Gradient Background */}
      <LinearGradient
        colors={[colors.greenMist, '#E0F2F1', '#F3E5F5', colors.greenMist]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Glass texture overlay */}
        <View style={styles.glassTextureOverlay} />

        {/* Decorative orbs for depth */}
        <View style={[styles.decorativeOrb, styles.orbPrimary]} />
        <View style={[styles.decorativeOrb, styles.orbGold]} />
        <View style={[styles.decorativeOrb, styles.orbTeal]} />
      </LinearGradient>

      {renderHeader()}

      <Animated.View
        style={[
          styles.animatedContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {renderMainContent()}

          <View style={styles.bottomSpace} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.successScale[50],
    overflow: 'hidden', // Prevent horizontal scroll
  },

  // Premium Background
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden', // Contain orbs
  },
  glassTextureOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  decorativeOrb: {
    position: 'absolute',
    borderRadius: BorderRadius.full,
    opacity: 0.4,
  },
  orbPrimary: {
    width: 250,
    height: 250,
    top: -80,
    right: -80,
    backgroundColor: COLORS.primary,
    opacity: 0.15,
  },
  orbGold: {
    width: 180,
    height: 180,
    top: height * 0.4,
    left: -60,
    backgroundColor: COLORS.gold,
    opacity: 0.12,
  },
  orbTeal: {
    width: 200,
    height: 200,
    bottom: 100,
    right: -50,
    backgroundColor: COLORS.primaryDark,
    opacity: 0.1,
  },

  animatedContent: {
    flex: 1,
  },

  // Glass Card Base
  glassCard: {
    overflow: 'hidden',
    borderRadius: BorderRadius.xl,
  },
  glassCardWeb: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },

  // Header Styles - Premium Glass
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    position: 'relative',
  },
  headerGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
    overflow: 'hidden',
  },
  headerGlassWeb: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
    zIndex: 1,
  },
  glassButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md + 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  backButton: {},
  coinsContainer: {
    flex: 1,
    alignItems: 'center',
  },
  coinsBadge: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  coinsBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  coinsText: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
    letterSpacing: 0.2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
  },

  // Search Bar - Premium Glass
  searchContainer: {
    zIndex: 1,
  },
  searchBarGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 192, 106, 0.15)',
  },
  searchIconContainer: {
    marginRight: Spacing.sm,
  },
  searchIconGradient: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    fontSize: 15,
    color: COLORS.navy,
    fontWeight: '500',
    paddingVertical: Spacing.sm,
  },
  clearButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.sm,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Hero Section - Premium POP OUT Carousel (District Style)
  heroSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  hero3DContainer: {
    // Container
  },
  hero3DWrapper: {
    position: 'relative',
    paddingBottom: 28,
    width: SNAP_INTERVAL,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: CARD_SPACING,
  },
  heroCarouselContent: {
    alignItems: 'center',
    paddingLeft: (width - CARD_WIDTH) / 2,
    paddingRight: (width - CARD_WIDTH) / 2 - CARD_SPACING,
  },
  // Floor shadow - ellipse underneath card
  heroFloorShadow: {
    position: 'absolute',
    bottom: 0,
    left: 30,
    right: 30,
    height: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 100,
    transform: [{ scaleY: 0.4 }],
    // Native shadow blur
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  heroCard: {
    width: CARD_WIDTH,
    height: 185,
    position: 'relative',
    zIndex: 2,
  },
  // OUTER GLOW - Creates the pop out effect
  heroOuterGlow: {
    position: 'absolute',
    top: -25,
    left: -25,
    right: -25,
    bottom: -25,
    borderRadius: 50,
    overflow: 'hidden',
  },
  heroGlowGradient: {
    flex: 1,
  },
  // Main floating card container with THICK WHITE BORDER
  heroFloatingCard: {
    flex: 1,
    borderRadius: BorderRadius['2xl'] - 2,
    backgroundColor: Colors.background.primary,
    padding: 5,
    // Strong native shadow for 3D pop
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 25,
    // Add a slight border for extra definition
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  // Premium border glow - inner gradient
  heroBorderGlow: {
    flex: 1,
    padding: 0,
    borderRadius: 18,
    overflow: 'hidden',
  },
  heroCardInner: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  heroGradient: {
    flex: 1,
    position: 'relative',
  },
  // Top light reflection for 3D pop
  heroTopReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  // Bottom vignette
  heroBottomVignette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  heroOrbContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  heroOrb: {
    position: 'absolute',
    borderRadius: BorderRadius.full,
  },
  heroOrbLarge: {
    width: 180,
    height: 180,
    top: -70,
    right: -50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroOrbMedium: {
    width: 120,
    height: 120,
    bottom: -50,
    left: -40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroOrbSmall: {
    width: 60,
    height: 60,
    top: 50,
    right: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroGlassLayer: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  // Diagonal shine streak
  heroDiagonalShine: {
    position: 'absolute',
    top: 15,
    left: 25,
    width: 80,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
    transform: [{ rotate: '-35deg' }],
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  heroText: {
    flex: 1,
    paddingRight: Spacing.sm + 2,
  },
  // Premium cashback badge
  heroCashbackBadge: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm + 2,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  heroCashbackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm,
    gap: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  heroCashbackInnerShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  heroCashbackText: {
    ...Typography.caption,
    fontWeight: '800',
    color: COLORS.navy,
    letterSpacing: 0.3,
  },
  heroTitle: {
    ...Typography.h1,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  heroLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  heroLocationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  heroLocationText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
  },
  heroCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.sm + 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroCtaText: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  heroCtaArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Premium icon section with rings
  heroIconSection: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
  },
  heroIconRing3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroIconRing2: {
    position: 'absolute',
    width: 85,
    height: 85,
    borderRadius: 43,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroIconRing1: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroIconWrapper: {
    width: 65,
    height: 65,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 12,
  },
  heroIconInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
  },
  heroIconTopShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
  },
  heroEmoji: {
    fontSize: 32,
    marginTop: 4,
  },
  // Sparkle particles
  heroSparkle: {
    position: 'absolute',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.primary,
    shadowColor: Colors.background.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  heroSparkle1: {
    width: 8,
    height: 8,
    top: 0,
    right: 10,
  },
  heroSparkle2: {
    width: 5,
    height: 5,
    bottom: 15,
    left: 5,
  },
  heroSparkle3: {
    width: 6,
    height: 6,
    top: 40,
    right: -5,
  },
  heroSparkle4: {
    width: 4,
    height: 4,
    bottom: 30,
    right: 5,
  },
  // Carousel indicators - Premium Glass Style
  carouselIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  indicatorTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  indicatorContainer: {
    padding: 2,
  },
  activeIndicator: {
    width: 28,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  indicatorShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  inactiveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 192, 106, 0.2)',
  },

  // Sections
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.h3,
    fontWeight: '800',
    color: COLORS.navy,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.muted,
  },
  newBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  newBadgeText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },

  // Category Grid - Premium Glass Cards
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  categoryCardGlass: {
    width: (width - 52) / 2,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 4,
  },
  categoryCardInner: {
    padding: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  categoryCardInnerWeb: {
    padding: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: BorderRadius.xl,
  },
  categoryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.md + 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryTextContainerVertical: {
    alignItems: 'center',
    width: '100%',
  },
  categoryName: {
    ...Typography.body,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 3,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  categoryCount: {
    ...Typography.caption,
    fontWeight: '500',
    color: COLORS.muted,
    textAlign: 'center',
  },

  // Brand Cards - Premium Glass
  brandCardGlass: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  brandCardContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: BorderRadius.xl,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  brandLogoText: {
    fontSize: 24,
  },
  brandInfo: {
    flex: 1,
  },
  brandInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: Spacing.sm,
  },
  brandName: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
    letterSpacing: -0.2,
    flex: 1,
  },
  featuredBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.navy,
    letterSpacing: 0.5,
  },
  brandCashbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cashbackIconContainer: {
    width: Spacing.lg,
    height: Spacing.lg,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandCashback: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  brandRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 200, 87, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 87, 0.3)',
  },
  ratingText: {
    ...Typography.caption,
    fontWeight: '700',
    color: COLORS.goldDark,
  },

  // Newly Added Brands - Premium Glass
  newBrandsContent: {
    paddingHorizontal: Spacing.lg,
    paddingRight: Spacing.sm,
  },
  newBrandCardGlass: {
    width: 130,
    marginRight: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  newBrandCardContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: Spacing.md + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: BorderRadius.xl,
  },
  newBrandLogo: {
    width: 58,
    height: 58,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  newBrandEmoji: {
    fontSize: 26,
  },
  newBrandName: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  newBrandCashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  newBrandCashback: {
    ...Typography.caption,
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Brands List
  brandsList: {
    paddingTop: 4,
  },

  // Search Results
  searchResults: {
    paddingTop: Spacing.lg,
  },
  searchResultsTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  noResults: {
    paddingVertical: 60,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  noResultsIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  noResultsText: {
    ...Typography.body,
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Bottom Space
  bottomSpace: {
    height: 60,
  },
});

export default withErrorBoundary(OnlineVoucherPage, 'OnlineVoucher');
