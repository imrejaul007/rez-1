// @ts-nocheck
// ProductScreen.jsx (or .tsx if using TypeScript)
// Replace your current ProductScreen actionButtons section with this full component if desired.

import React, { useRef, useState, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing} from 'react-native-reanimated';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import PriceAndRewardsSection from "@/components/product/PriceAndRewardsSection";
import LockProductSection from "@/components/product/LockProductSection";
import { useLocation } from "@/contexts/LocationContext";
import { useCartActions } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Haversine formula for distance calculation between two coordinates
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Distance in km, rounded to 1 decimal
}

interface StoreLocation {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  coordinates?: [number, number]; // [longitude, latitude]
  deliveryRadius?: number;
}

interface ProductInfoProps {
  dynamicData?: {
    title?: string;
    description?: string;
    price?: number;
    merchant?: string;
    category?: string;
    section?: string;
    productType?: 'product' | 'service';
    store?: {
      _id?: string;
      id?: string;
      name?: string;
      logo?: string;
      location?: StoreLocation;
      operationalInfo?: {
        deliveryTime?: string;
      };
      ratings?: {
        average?: number;
        count?: number;
      };
    };
    [key: string]: any;
  } | null;
  cardType?: string;
  // Lock functionality props
  quantity?: number;
  isLocked?: boolean;
  onLockSuccess?: (details: any) => void;
}

export default memo(function ProductScreen({
  dynamicData,
  cardType,
  quantity = 1,
  isLocked = false,
  onLockSuccess}: ProductInfoProps) {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { state: locationState } = useLocation();
  const cartActions = useCartActions();
  const [active, setActive] = useState("visit"); // 'visit' | 'book'
  const translateX = useSharedValue(0);
  const containerWidthRef = useRef(0);
  const { width: screenW } = useWindowDimensions();

  // Handler to add product to cart without locking
  const handleAddToCartWithoutLock = async () => {
    if (!dynamicData) return;

    const productId = dynamicData.id || dynamicData._id;
    if (!productId) return;

    try {
      // Use dynamic data if available
      const rawPrice = dynamicData.price;
      const price = typeof rawPrice === 'number' && !isNaN(rawPrice) ? rawPrice : 0;

      await cartActions.addItem({
        id: productId,
        name: dynamicData.title || dynamicData.name || 'Product',
        price: price,
        originalPrice: dynamicData.originalPrice || price,
        discountedPrice: dynamicData.discountedPrice || price,
        image: dynamicData.images?.[0] || dynamicData.image || '',
        cashback: dynamicData.cashback?.percentage
          ? `${dynamicData.cashback.percentage}%`
          : '5%',
        category: dynamicData.productType === 'service' ? 'service' : 'products',
        quantity: quantity});

      // Navigate to cart after short delay for feedback
      setTimeout(() => {
        router.push('/cart');
      }, 800);
    } catch (error) {
      throw error; // Re-throw so LockProductSection can handle it
    }
  };

  // Calculate distance from user to store
  const getDistanceText = () => {
    const storeCoords = dynamicData?.store?.location?.coordinates;
    const userCoords = locationState.currentLocation?.coordinates;

    if (storeCoords && storeCoords.length === 2 && userCoords) {
      const distance = calculateDistance(
        userCoords.latitude,
        userCoords.longitude,
        storeCoords[1], // latitude (MongoDB stores as [lng, lat])
        storeCoords[0]  // longitude
      );
      return `${distance} km`;
    }
    return null;
  };

  const distanceText = getDistanceText();

  // Use dynamic data if available, show loading state if not
  const productTitle = dynamicData?.title || "Loading...";
  const productDescription = dynamicData?.description || "Loading product information...";

  // Safely handle price with proper type checking
  const rawPrice = dynamicData?.price;
  const productPrice = typeof rawPrice === 'number' && !isNaN(rawPrice) ? rawPrice : 0;

  // Safely handle rating with proper type checking
  const rawRating = dynamicData?.rating;
  const rating = typeof rawRating === 'number' && !isNaN(rawRating) ? rawRating : 0;

  const merchantName = dynamicData?.merchant || "Loading...";
  const category = dynamicData?.category || "Loading...";

  // Get product ID from dynamicData - this should be the real product ID from navigation
  const productId = dynamicData?.id || dynamicData?._id;

  const onContainerLayout = (e:any) => {
    const w = e.nativeEvent.layout.width;
    containerWidthRef.current = w;
    // ensure slider initial position matches active
    const half = w / 2;
    translateX.value = active === "visit" ? 0 : half;
  };

  const animateTo = (toValue: number) => {
    translateX.value = withTiming(toValue, { duration: 220, easing: Easing.out(Easing.cubic) });
  };

  const onStoreVisitPress = () => {
    if (active === "visit") return;
    setActive("visit");
    const half = containerWidthRef.current / 2;
    animateTo(0);
    
    // Navigate to MainStorePage with store data
    if (dynamicData?.store || dynamicData?.merchant) {
      const storeData = {
        id: dynamicData.store?._id || dynamicData.store?.id || dynamicData.storeId || '',
        name: dynamicData.store?.name || dynamicData.merchant || 'Store',
        title: dynamicData.store?.name || dynamicData.merchant || 'Store',
        description: dynamicData.store?.description || '',
        logo: dynamicData.store?.logo || '',
        banner: dynamicData.store?.banner || '',
        rating: dynamicData.store?.ratings?.average || 0,
        ratingCount: dynamicData.store?.ratings?.count || 0,
        category: dynamicData.category || '',
        location: dynamicData.store?.location || null,
        deliveryTime: dynamicData.store?.operationalInfo?.deliveryTime || '30-45 mins',
        minimumOrder: dynamicData.store?.operationalInfo?.minimumOrder || 0};

      // Navigate to MainStorePage with store data as query params
      router.push({
        pathname: '/MainStorePage',
        params: {
          storeId: storeData.id,
          storeData: JSON.stringify(storeData)
        }
      } as any);
    }
  };

  const onBookNowPress = () => {
    if (active === "book") return;
    setActive("book");
    const half = containerWidthRef.current / 2;
    animateTo(half);
    const storeId = dynamicData?.store?._id || dynamicData?.store?.id || dynamicData?.storeId;
    if (storeId) {
      router.push(`/booking?storeId=${storeId}` as any);
    }
  };

  // If no productId, show loading state instead of returning null (to maintain hooks order)
  if (!productId) {
    return (
      <View style={styles.container}>
        <View style={styles.infoContainer}>
          <Text style={styles.title}>Loading...</Text>
          <Text style={styles.description}>Loading product information...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 5 }}>
        {/* --- TOP PRODUCT IMAGE & INFO (kept simple) --- */}
      

        <View style={styles.infoContainer}>
          {/* Product Title */}
          <Text style={styles.title}>{productTitle}</Text>

          {/* Brand Name */}
          {(dynamicData?.brand || dynamicData?.store?.name || merchantName) && (
            <Text style={styles.brandName}>
              {dynamicData?.brand || dynamicData?.store?.name || merchantName}
            </Text>
          )}

          {/* Category Tag */}
          {(dynamicData?.category || category) && category !== "Loading..." && (
            <View style={styles.categoryTagContainer}>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>
                  {dynamicData?.category || category}
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          <Text style={styles.description}>
            {productDescription}
          </Text>

          {/* Location Row */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={colors.lightMustard} />
            {distanceText ? (
              <Text style={styles.distanceText}>{distanceText}</Text>
            ) : null}
            <Text style={styles.locationText} numberOfLines={1}>
              {(() => {
                // Get location text from store or product
                const storeLocation = dynamicData?.store?.location;
                if (storeLocation?.address) {
                  return storeLocation.city && storeLocation.address !== storeLocation.city
                    ? `${storeLocation.address}, ${storeLocation.city}`
                    : storeLocation.address;
                }
                if (storeLocation?.city) {
                  return storeLocation.city;
                }
                // Fallback to product location
                if (typeof dynamicData?.location === 'string') {
                  return dynamicData.location;
                }
                if (typeof dynamicData?.location === 'object' && dynamicData.location) {
                  return dynamicData.location.address || dynamicData.location.city || "Location not available";
                }
                return "Location not available";
              })()}
            </Text>
          </View>

          {/* Availability & Delivery Row */}
          <View style={styles.availabilityRow}>
            {dynamicData?.store ? (
              <View style={styles.openBadge}>
                <Text style={styles.openText}>
                  {dynamicData.availabilityStatus === 'in_stock' || dynamicData.availabilityStatus === 'low_stock' ? 'In Stock' : 'Available'}
                </Text>
              </View>
            ) : null}
            {(dynamicData?.computedDelivery || dynamicData?.store?.operationalInfo?.deliveryTime || dynamicData?.deliveryInfo?.estimatedDays) ? (
              <View style={styles.deliveryBadge}>
                <Ionicons name="time-outline" size={14} color={colors.neutral[500]} />
                <Text style={styles.deliveryText}>
                  {dynamicData?.computedDelivery || dynamicData?.store?.operationalInfo?.deliveryTime || dynamicData?.deliveryInfo?.estimatedDays}
                </Text>
              </View>
            ) : null}
          </View>

          {/* rating/review section */}
          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color={colors.warningScale[400]} />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.reviewCount}>
              {dynamicData?.ratings?.count || dynamicData?.originalRating?.count || 0} reviews
            </Text>
          </View>

          {((dynamicData?.analytics?.todayPurchases || dynamicData?.todayPurchases) > 0) && (
            <View style={styles.peopleBought}>
              <Text style={styles.peopleNumber}>{dynamicData?.analytics?.todayPurchases || dynamicData?.todayPurchases || 0}</Text>
              <View style={styles.avatarGroup}>
                {["#ff6b6b", "#4ecdc4", colors.infoScale[400], "#f9ca24"].map((color, i) => (
                  <LinearGradient
                    key={i}
                    colors={[color, color]}
                    style={[styles.avatar, { marginLeft: i === 0 ? 0 : -8 }]}
                  />
                ))}
              </View>
              <Text style={styles.peopleText}>People brought today</Text>
            </View>
          )}

          {/* ---------- Segmented Action Buttons (Only for Services) ---------- */}
          {dynamicData?.productType === 'service' && (
            <View onLayout={onContainerLayout} style={styles.segmentContainer}>
              {/* sliding indicator */}
              <Animated.View
                style={[
                  styles.slider,
                  {
                    transform: [{ translateX }],
                    pointerEvents: 'none'},
                ]}
              >
                <LinearGradient
                  colors={[colors.lightMustard, colors.nileBlue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sliderGradient}
                />
              </Animated.View>

              {/* left button */}
              <Pressable
               
                style={styles.segmentButton}
                onPress={onStoreVisitPress}
              >
                <View style={styles.segmentContent}>
                  <Ionicons name="storefront" size={16} color={active === "visit" ? colors.background.primary : colors.lightMustard} />
                  <Text style={[styles.segmentText, active === "visit" ? styles.segmentTextActive : styles.segmentTextInactive]}>
                    STORE VISIT
                  </Text>
                </View>
              </Pressable>

              {/* right button */}
              <Pressable
               
                style={styles.segmentButton}
                onPress={onBookNowPress}
              >
                <View style={styles.segmentContent}>
                  <Ionicons name="calendar-outline" size={16} color={active === "book" ? colors.background.primary : colors.lightMustard} />
                  <Text style={[styles.segmentText, active === "book" ? styles.segmentTextActive : styles.segmentTextInactive]}>
                    Book Now
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* small spacing */}
        </View>

        {/* Price & Rewards Section */}
        {productPrice > 0 && (() => {
          // Get original price from unified price object or raw pricing
          const originalPrice =
            dynamicData?.price?.original ||
            (typeof dynamicData?.originalPrice === 'number' ? dynamicData.originalPrice : null) ||
            dynamicData?.pricing?.original ||
            dynamicData?.pricing?.compare ||
            dynamicData?.pricing?.mrp;

          // Get cashback from backend computed value
          const cashbackAmount = dynamicData?.computedCashback?.amount
            || (dynamicData?.cashback?.percentage
                ? Math.floor(productPrice * dynamicData.cashback.percentage / 100)
                : Math.floor(productPrice * 0.05));

          // Get earnable coins (10% of price or from backend if available)
          const earnableCoins = Math.floor(productPrice * 0.1);

          return (
            <PriceAndRewardsSection
              price={productPrice}
              originalPrice={originalPrice}
              earnableCoins={earnableCoins}
              cashbackAmount={cashbackAmount}
              bonusCoins={50}
            />
          );
        })()}

        {/* Lock Product Section */}
        {dynamicData && (dynamicData.id || dynamicData._id) && !isLocked && (
          <LockProductSection
            productId={dynamicData.id || dynamicData._id || ''}
            productName={dynamicData.title || dynamicData.name || ''}
            productPrice={productPrice}
            quantity={quantity}
            variant={dynamicData.selectedVariant}
            onLockSuccess={onLockSuccess}
            onAddToCart={handleAddToCartWithoutLock}
          />
        )}
      </ScrollView>
    </View>
);
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  infoContainer: { padding: 16, paddingTop: 18 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  brandName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.neutral[500],
    marginBottom: 8},
  categoryTagContainer: {
    flexDirection: "row",
    marginBottom: 10},
  categoryTag: {
    backgroundColor: colors.indigoMist,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE"},
  categoryTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.brand.indigo},
  description: { fontSize: 14, color: "#555", marginBottom: 12 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10},
  locationText: {
    fontSize: 14,
    marginLeft: 6,
    color: colors.neutral[700],
    flex: 1},
  distanceText: {
    fontSize: 14,
    marginLeft: 6,
    color: colors.lightMustard,
    fontWeight: "700"},
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14},
  openBadge: {
    backgroundColor: colors.successScale[100],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.brand.greenDark},
  openText: {
    color: colors.brand.greenDark,
    fontSize: 13,
    fontWeight: "600"},
  deliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6},
  deliveryText: {
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: "500"},
  ratingRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14},
  ratingText: { marginLeft: 6, fontWeight: "700" },
  reviewCount: { marginLeft: 12, fontWeight: "600", color: colors.neutral[500], fontSize: 14 },

  peopleBought: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.tint.coolGray,
    padding: 14,
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.tint.slate},
  peopleNumber: { fontSize: 17, fontWeight: "800", color: colors.neutral[900] },
  avatarGroup: { flexDirection: "row", marginLeft: 10 },
  avatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.background.primary },
  peopleText: { marginLeft: 10, color: colors.neutral[500], fontSize: 14, fontWeight: "500" },

  /* Segmented control styles */
  segmentContainer: {
    height: 58,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "rgba(255, 205, 87, 0.2)",
    backgroundColor: colors.background.primary,
    overflow: "hidden",
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8},
  slider: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "50%", // slider occupies half
    borderRadius: 28},
  sliderGradient: {
    flex: 1,
  
    // small inset so it looks like half pill (optional)
    margin: 4,
    borderRadius: 24},
  segmentButton: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center"},
  segmentContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8},
  segmentText: {
    marginLeft: 8,
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3},
  segmentTextActive: {
    color: colors.background.primary},
  segmentTextInactive: {
    color: colors.lightMustard}});
