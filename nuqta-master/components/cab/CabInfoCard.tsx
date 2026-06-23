/**
 * Cab Info Card - Displays pickup/dropoff locations and key cab information
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface CabDetails {
  name: string;
  route?: {
    from: string;
    to: string;
  };
  pickupTime?: string;
  dropoffTime?: string;
  duration: number;
  distance?: number;
  cabType?: string;
  rating: number;
}

interface CabInfoCardProps {
  cab: CabDetails;
}

const CabInfoCard: React.FC<CabInfoCardProps> = ({ cab }) => {
  const formatDuration = (minutes: number) => {
    // Validate input to prevent NaN
    const validMinutes = (typeof minutes === 'number' && !isNaN(minutes) && minutes > 0) 
      ? minutes 
      : 60; // Default to 60 minutes if invalid
    const hours = Math.floor(validMinutes / 60);
    const mins = validMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.brand.amber, '#CA8A04']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* Route */}
        <View style={styles.routeContainer}>
          <View style={styles.routeItem}>
            <View style={styles.locationCode}>
              <Ionicons name="location" size={20} color={colors.background.primary} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationCity} numberOfLines={1}>
                {cab.route?.from || 'Pickup Location'}
              </Text>
              <Text style={styles.time}>{cab.pickupTime || '09:00'}</Text>
            </View>
          </View>

          <View style={styles.cabPath}>
            <View style={styles.cabPathLine} />
            <Ionicons name="car" size={24} color={colors.background.primary} />
            <Text style={styles.duration}>{formatDuration(cab.duration)}</Text>
            {cab.distance && typeof cab.distance === 'number' && !isNaN(cab.distance) && cab.distance > 0 && (
              <Text style={styles.distance}>{Math.round(cab.distance)} km</Text>
            )}
          </View>

          <View style={styles.routeItem}>
            <View style={styles.locationCode}>
              <Ionicons name="flag" size={20} color={colors.background.primary} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Dropoff</Text>
              <Text style={styles.locationCity} numberOfLines={1}>
                {cab.route?.to || 'Dropoff Location'}
              </Text>
              <Text style={styles.time}>{cab.dropoffTime || '11:00'}</Text>
            </View>
          </View>
        </View>

        {/* Cab Details */}
        <View style={styles.detailsRow}>
          {cab.cabType && (
            <View style={styles.detailItem}>
              <Ionicons name="car-outline" size={16} color={colors.background.primary} />
              <Text style={styles.detailText}>{cab.cabType}</Text>
            </View>
          )}
          {cab.rating > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="star" size={16} color={colors.brand.goldBright} />
              <Text style={styles.detailText}>{cab.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 0,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  gradient: {
    padding: 28,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  routeItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  locationCode: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  locationInfo: {
    alignItems: 'flex-start',
  },
  locationLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  locationCity: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  time: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.5,
  },
  cabPath: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 16,
  },
  cabPathLine: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 10,
    borderRadius: 2,
  },
  duration: {
    fontSize: 13,
    color: colors.background.primary,
    marginTop: 6,
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distance: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: colors.background.primary,
    fontWeight: '500',
  },
});

export default React.memo(CabInfoCard);
