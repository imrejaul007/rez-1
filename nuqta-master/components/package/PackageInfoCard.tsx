/**
 * Package Info Card - Displays destination, duration, and key package information
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface PackageDetails {
  destination?: string;
  duration?: {
    nights: number;
    days: number;
  };
  packageType?: string;
  rating: number;
  inclusions?: string[];
}

interface PackageInfoCardProps {
  package: PackageDetails;
}

const PackageInfoCard: React.FC<PackageInfoCardProps> = ({ package: pkg }) => {
  const formatDuration = () => {
    if (pkg.duration) {
      return `${pkg.duration.nights}N/${pkg.duration.days}D`;
    }
    return 'Package';
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.brand.purpleLight, colors.brand.purple]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* Destination & Duration */}
        <View style={styles.headerContainer}>
          <View style={styles.destinationContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={24} color={colors.background.primary} />
            </View>
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationLabel}>Destination</Text>
              <Text style={styles.destinationName}>
                {pkg.destination || 'Travel Package'}
              </Text>
            </View>
          </View>

          <View style={styles.durationContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="calendar" size={24} color={colors.background.primary} />
            </View>
            <View style={styles.durationInfo}>
              <Text style={styles.durationLabel}>Duration</Text>
              <Text style={styles.durationValue}>{formatDuration()}</Text>
            </View>
          </View>
        </View>

        {/* Package Details */}
        <View style={styles.detailsRow}>
          {pkg.packageType && (
            <View style={styles.detailItem}>
              <Ionicons name="bag" size={16} color={colors.background.primary} />
              <Text style={styles.detailText}>{pkg.packageType}</Text>
            </View>
          )}
          {pkg.rating > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="star" size={16} color={colors.brand.goldBright} />
              <Text style={styles.detailText}>{pkg.rating.toFixed(1)}</Text>
            </View>
          )}
          {pkg.inclusions && pkg.inclusions.length > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.background.primary} />
              <Text style={styles.detailText}>{pkg.inclusions.length} Inclusions</Text>
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  destinationContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  durationContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'flex-end',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  destinationInfo: {
    flex: 1,
  },
  destinationLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  destinationName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: 0.3,
  },
  durationInfo: {
    alignItems: 'flex-end',
  },
  durationLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  durationValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.5,
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

export default React.memo(PackageInfoCard);
