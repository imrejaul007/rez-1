/**
 * Bus Info Card - Displays route, times, and key bus information
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface BusDetails {
  route: {
    from: string;
    to: string;
    fromTerminal?: string;
    toTerminal?: string;
  };
  departureTime?: string;
  arrivalTime?: string;
  duration: number;
  busType?: string;
  busNumber?: string;
  rating: number;
}

interface BusInfoCardProps {
  bus: BusDetails;
}

const BusInfoCard: React.FC<BusInfoCardProps> = ({ bus }) => {
  const formatDuration = (minutes: number) => {
    // Validate input to prevent NaN
    const validMinutes = (typeof minutes === 'number' && !isNaN(minutes) && minutes > 0) 
      ? minutes 
      : 480; // Default to 8 hours if invalid
    const hours = Math.floor(validMinutes / 60);
    const mins = validMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.brand.orange, colors.brand.orangeDark]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* Route */}
        <View style={styles.routeContainer}>
          <View style={styles.routeItem}>
            <View style={styles.terminalCode}>
              <Text style={styles.terminalCodeText}>
                {bus.route.from.substring(0, 3).toUpperCase()}
              </Text>
            </View>
            <View style={styles.terminalInfo}>
              <Text style={styles.terminalCity}>{bus.route.from}</Text>
              <Text style={styles.time}>{bus.departureTime || '08:00'}</Text>
            </View>
          </View>

          <View style={styles.busPath}>
            <View style={styles.busPathLine} />
            <Ionicons name="bus" size={24} color={colors.background.primary} />
            <Text style={styles.duration}>{formatDuration(bus.duration)}</Text>
          </View>

          <View style={styles.routeItem}>
            <View style={styles.terminalCode}>
              <Text style={styles.terminalCodeText}>
                {bus.route.to.substring(0, 3).toUpperCase()}
              </Text>
            </View>
            <View style={styles.terminalInfo}>
              <Text style={styles.terminalCity}>{bus.route.to}</Text>
              <Text style={styles.time}>{bus.arrivalTime || '16:00'}</Text>
            </View>
          </View>
        </View>

        {/* Bus Details */}
        <View style={styles.detailsRow}>
          {bus.busType && (
            <View style={styles.detailItem}>
              <Ionicons name="bus-outline" size={16} color={colors.background.primary} />
              <Text style={styles.detailText}>{bus.busType}</Text>
            </View>
          )}
          {bus.busNumber && (
            <View style={styles.detailItem}>
              <Ionicons name="ticket-outline" size={16} color={colors.background.primary} />
              <Text style={styles.detailText}>{bus.busNumber}</Text>
            </View>
          )}
          {bus.rating > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="star" size={16} color={colors.brand.goldBright} />
              <Text style={styles.detailText}>{bus.rating.toFixed(1)}</Text>
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
    alignItems: 'center',
  },
  terminalCode: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  terminalCodeText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 1,
  },
  terminalInfo: {
    alignItems: 'center',
  },
  terminalCity: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  time: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.5,
  },
  busPath: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 16,
  },
  busPathLine: {
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

export default React.memo(BusInfoCard);
