import { withErrorBoundary } from '@/utils/withErrorBoundary';
// LocationSection.tsx - Location & Directions section
import React, {} from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Linking,
  Platform
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from "@expo/vector-icons";
import { triggerImpact } from "@/utils/haptics";
import { ThemedText } from "@/components/ThemedText";
import { colors } from '@/constants/theme';
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows } from "@/constants/DesignSystem";
import { catchAndWarn } from '@/utils/catchAndReport';

export interface LocationSectionProps {
  address?: string;
  distance?: string;
  latitude?: number;
  longitude?: number;
  mapImageUrl?: string;
}

function LocationSection({
  address = "MG Road, Bangalore",
  distance = "300m away",
  latitude,
  longitude,
  mapImageUrl }: LocationSectionProps) {
  const scaleAnim = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const animateScale = (toValue: number) => {
    scaleAnim.value = withSpring(toValue, { damping: 8, stiffness: 100 });
  };

  const handleGetDirections = () => {
    triggerImpact('Medium');

    // Open in maps app
    if (latitude && longitude) {
      const scheme = Platform.select({
        ios: `maps:0,0?q=${address}@${latitude},${longitude}`,
        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${address})` });

      if (scheme) {
        Linking.openURL(scheme).catch(() => {
          // Fallback to Google Maps web
          Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
          ).catch(() => {});
        });
      }
    } else {
      // Search by address
      const encodedAddress = encodeURIComponent(address);
      try { Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`); } catch (e) { catchAndWarn(e, 'LocationSection/openURL'); }
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <ThemedText style={styles.sectionTitle}>Location & Directions</ThemedText>

      {/* Map Preview */}
      <View style={styles.mapContainer}>
        {mapImageUrl ? (
          <CachedImage source={mapImageUrl} style={styles.mapImage} contentFit="cover" />
        ) : (
          <View style={styles.mapPlaceholder}>
            {/* Simulated map background */}
            <View style={styles.mapBackground}>
              {/* Green areas (parks) */}
              <View style={[styles.mapArea, styles.greenArea1]} />
              <View style={[styles.mapArea, styles.greenArea2]} />
              <View style={[styles.mapArea, styles.greenArea3]} />
              {/* Blue area (water) */}
              <View style={[styles.mapArea, styles.blueArea]} />
              {/* Roads */}
              <View style={styles.roadHorizontal} />
              <View style={styles.roadVertical} />
              <View style={styles.roadDiagonal} />
              {/* Buildings */}
              <View style={[styles.building, styles.building1]} />
              <View style={[styles.building, styles.building2]} />
              <View style={[styles.building, styles.building3]} />
            </View>

            {/* 3D Pin Marker */}
            <View style={styles.pinContainer}>
              {/* Pin shadow */}
              <View style={styles.pinShadow} />
              {/* Pin body */}
              <View style={styles.pinBody}>
                <View style={styles.pinInner} />
              </View>
              {/* Pin point */}
              <View style={styles.pinPoint} />
            </View>
          </View>
        )}
      </View>

      {/* Address */}
      <ThemedText style={styles.address}>
        {address} - {distance}
      </ThemedText>

      {/* Get Directions Button */}
      <Animated.View style={scaleStyle}>
        <Pressable
          style={styles.directionsButton}
         
          onPress={handleGetDirections}
          onPressIn={() => animateScale(0.97)}
          onPressOut={() => animateScale(1)}
          accessibilityRole="button"
          accessibilityLabel="Get Directions"
        >
          <Ionicons name="navigate" size={18} color={colors.background.primary} />
          <ThemedText style={styles.directionsText}>Get Directions</ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: Spacing.md },
  mapContainer: {
    width: "100%",
    height: 160,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    backgroundColor: Colors.gray[100],
    marginBottom: Spacing.sm },
  mapImage: {
    width: "100%",
    height: "100%" },
  mapPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#A8D5A2",
    overflow: "hidden" },
  mapBackground: {
    ...StyleSheet.absoluteFillObject },
  mapArea: {
    position: "absolute",
    borderRadius: 4 },
  greenArea1: {
    top: 10,
    left: 10,
    width: 80,
    height: 60,
    backgroundColor: "#7CB77A" },
  greenArea2: {
    bottom: 20,
    right: 20,
    width: 100,
    height: 70,
    backgroundColor: "#8BC78A" },
  greenArea3: {
    top: 40,
    right: 60,
    width: 50,
    height: 40,
    backgroundColor: "#6DAF6B" },
  blueArea: {
    bottom: 10,
    left: 20,
    width: 70,
    height: 50,
    backgroundColor: "#7CC8E8",
    borderRadius: 8 },
  roadHorizontal: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "#F5E6B3" },
  roadVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "40%",
    width: 6,
    backgroundColor: "#F5E6B3" },
  roadDiagonal: {
    position: "absolute",
    top: 20,
    right: 30,
    width: 60,
    height: 5,
    backgroundColor: "#F5E6B3",
    transform: [{ rotate: "45deg" }] },
  building: {
    position: "absolute",
    backgroundColor: "#E8E0D0",
    borderRadius: 2 },
  building1: {
    top: 80,
    left: 100,
    width: 30,
    height: 25 },
  building2: {
    top: 30,
    right: 100,
    width: 25,
    height: 35 },
  building3: {
    bottom: 60,
    left: 150,
    width: 35,
    height: 20 },
  pinContainer: {
    alignItems: "center",
    zIndex: 10 },
  pinShadow: {
    position: "absolute",
    bottom: -8,
    width: 20,
    height: 8,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 10,
    transform: [{ scaleX: 1.5 }] },
  pinBody: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EA4335",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#B31412",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5 },
  pinInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#1A1A1A" },
  pinPoint: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 16,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#EA4335",
    marginTop: -4 },
  address: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: Spacing.md },
  directionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lightMustard,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: 8,
    ...Shadows.subtle },
  directionsText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.background.primary } });

export default withErrorBoundary(LocationSection, 'MainStoreSectionLocationSection');
