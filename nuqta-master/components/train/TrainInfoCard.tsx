/**
 * Train Info Card - Displays route, times, and key train information
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface TrainDetails {
  route: {
    from: string;
    to: string;
    fromStation?: string;
    toStation?: string;
  };
  departureTime?: string;
  arrivalTime?: string;
  duration: number;
  trainType?: string;
  trainNumber?: string;
  rating: number;
}

interface TrainInfoCardProps {
  train: TrainDetails;
}

const TrainInfoCard: React.FC<TrainInfoCardProps> = ({ train }) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.success, colors.brand.greenDark]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* Route */}
        <View style={styles.routeContainer}>
          <View style={styles.routeItem}>
            <View style={styles.stationCode}>
              <Text style={styles.stationCodeText}>
                {train.route.from.substring(0, 3).toUpperCase()}
              </Text>
            </View>
            <View style={styles.stationInfo}>
              <Text style={styles.stationCity}>{train.route.from}</Text>
              <Text style={styles.time}>{train.departureTime || '08:00'}</Text>
            </View>
          </View>

          <View style={styles.trainPath}>
            <View style={styles.trainPathLine} />
            <Ionicons name="train" size={24} color={colors.background.primary} />
            <Text style={styles.duration}>{formatDuration(train.duration)}</Text>
          </View>

          <View style={styles.routeItem}>
            <View style={styles.stationCode}>
              <Text style={styles.stationCodeText}>
                {train.route.to.substring(0, 3).toUpperCase()}
              </Text>
            </View>
            <View style={styles.stationInfo}>
              <Text style={styles.stationCity}>{train.route.to}</Text>
              <Text style={styles.time}>{train.arrivalTime || '16:00'}</Text>
            </View>
          </View>
        </View>

        {/* Train Details */}
        <View style={styles.detailsRow}>
          {train.trainType && (
            <View style={styles.detailItem}>
              <Ionicons name="train-outline" size={16} color={colors.background.primary} />
              <Text style={styles.detailText}>{train.trainType}</Text>
            </View>
          )}
          {train.trainNumber && (
            <View style={styles.detailItem}>
              <Ionicons name="ticket-outline" size={16} color={colors.background.primary} />
              <Text style={styles.detailText}>{train.trainNumber}</Text>
            </View>
          )}
          {train.rating > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="star" size={16} color={colors.brand.goldBright} />
              <Text style={styles.detailText}>{train.rating.toFixed(1)}</Text>
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
  stationCode: {
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
  stationCodeText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 1,
  },
  stationInfo: {
    alignItems: 'center',
  },
  stationCity: {
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
  trainPath: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 16,
  },
  trainPathLine: {
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

export default React.memo(TrainInfoCard);
