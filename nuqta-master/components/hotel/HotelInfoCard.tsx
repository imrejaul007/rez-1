/**
 * Hotel Info Card - Displays key hotel information
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface HotelDetails {
  name: string;
  location: {
    city: string;
    address?: string;
  };
  starRating?: number;
  checkInTime: string;
  checkOutTime: string;
  rating: number;
}

interface HotelInfoCardProps {
  hotel: HotelDetails;
}

const HotelInfoCard: React.FC<HotelInfoCardProps> = ({ hotel }) => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.brand.pink, colors.deepPink]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* Hotel Name & Location */}
        <View style={styles.header}>
          <View style={styles.hotelIcon}>
            <Ionicons name="bed" size={28} color={colors.background.primary} />
          </View>
          <View style={styles.hotelInfo}>
            <Text style={styles.hotelName} numberOfLines={2}>{hotel.name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={colors.background.primary} />
              <Text style={styles.locationText}>{hotel.location.address || hotel.location.city}</Text>
            </View>
          </View>
        </View>

        {/* Check-in/Check-out Times */}
        <View style={styles.timesContainer}>
          <View style={styles.timeItem}>
            <View style={styles.timeIcon}>
              <Ionicons name="log-in" size={20} color={colors.background.primary} />
            </View>
            <View style={styles.timeInfo}>
              <Text style={styles.timeLabel}>Check-in</Text>
              <Text style={styles.timeValue}>{hotel.checkInTime}</Text>
            </View>
          </View>

          <View style={styles.timeDivider} />

          <View style={styles.timeItem}>
            <View style={styles.timeIcon}>
              <Ionicons name="log-out" size={20} color={colors.background.primary} />
            </View>
            <View style={styles.timeInfo}>
              <Text style={styles.timeLabel}>Check-out</Text>
              <Text style={styles.timeValue}>{hotel.checkOutTime}</Text>
            </View>
          </View>
        </View>

        {/* Rating & Stars */}
        <View style={styles.ratingRow}>
          {hotel.starRating && (
            <View style={styles.starRating}>
              {[...Array(5)].map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < hotel.starRating! ? 'star' : 'star-outline'}
                  size={16}
                  color={colors.brand.goldBright}
                />
              ))}
              <Text style={styles.starText}>{hotel.starRating} Star</Text>
            </View>
          )}
          {hotel.rating > 0 && (
            <View style={styles.userRating}>
              <Ionicons name="star" size={16} color={colors.background.primary} />
              <Text style={styles.ratingText}>{hotel.rating.toFixed(1)}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 16,
  },
  hotelIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  hotelInfo: {
    flex: 1,
  },
  hotelName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.background.primary,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  timesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  timeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeInfo: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.5,
  },
  timeDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  starRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starText: {
    fontSize: 14,
    color: colors.background.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  userRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
});

export default React.memo(HotelInfoCard);
