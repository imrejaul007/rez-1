/**
 * Flight Info Card - Displays route, times, and key flight information
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface FlightDetails {
  route: {
    from: string;
    to: string;
    fromCode: string;
    toCode: string;
  };
  departureTime?: string;
  arrivalTime?: string;
  duration: number;
  airline?: string;
  flightNumber?: string;
}

interface FlightInfoCardProps {
  flight: FlightDetails;
}

const FlightInfoCard: React.FC<FlightInfoCardProps> = ({ flight }) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.infoScale[400], colors.brand.blue]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* Route */}
        <View style={styles.routeContainer}>
          <View style={styles.routeItem}>
            <View style={styles.airportCode}>
              <Text style={styles.airportCodeText}>{flight.route.fromCode}</Text>
            </View>
            <View style={styles.airportInfo}>
              <Text style={styles.airportCity}>{flight.route.from}</Text>
              <Text style={styles.time}>{flight.departureTime || '09:00'}</Text>
            </View>
          </View>

          <View style={styles.flightPath}>
            <View style={styles.flightPathLine} />
            <Ionicons name="airplane" size={24} color={colors.background.primary} />
            <Text style={styles.duration}>{formatDuration(flight.duration)}</Text>
          </View>

          <View style={styles.routeItem}>
            <View style={styles.airportCode}>
              <Text style={styles.airportCodeText}>{flight.route.toCode}</Text>
            </View>
            <View style={styles.airportInfo}>
              <Text style={styles.airportCity}>{flight.route.to}</Text>
              <Text style={styles.time}>{flight.arrivalTime || '11:00'}</Text>
            </View>
          </View>
        </View>

        {/* Flight Details */}
        <View style={styles.detailsRow}>
          {flight.airline && (
            <View style={styles.detailItem}>
              <Ionicons name="airplane-outline" size={16} color={colors.background.primary} />
              <Text style={styles.detailText}>{flight.airline}</Text>
            </View>
          )}
          {flight.flightNumber && (
            <View style={styles.detailItem}>
              <Ionicons name="ticket-outline" size={16} color={colors.background.primary} />
              <Text style={styles.detailText}>{flight.flightNumber}</Text>
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
  airportCode: {
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
  airportCodeText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 1,
  },
  airportInfo: {
    alignItems: 'center',
  },
  airportCity: {
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
  flightPath: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 16,
  },
  flightPathLine: {
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

export default React.memo(FlightInfoCard);
