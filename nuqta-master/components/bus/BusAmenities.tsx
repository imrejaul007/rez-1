/**
 * Bus Amenities - Displays bus amenities with icons
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface BusAmenitiesProps {
  amenities: string[];
}

const amenityIcons: Record<string, string> = {
  'AC': 'snow',
  'Wi-Fi': 'wifi',
  'Charging Point': 'battery-charging',
  'Reclining Seats': 'bed',
  'Reading Light': 'bulb',
  'Water': 'water',
  'Toilet': 'restroom',
  'Entertainment': 'musical-notes',
  'Blankets': 'bed',
  'Pillows': 'bed',
  'Meals': 'restaurant',
  'Snacks': 'fast-food',
  'Luggage Space': 'bag',
  'USB Charging': 'battery-charging',
};

const BusAmenities: React.FC<BusAmenitiesProps> = ({ amenities }) => {
  const getIcon = (amenity: string): string => {
    return amenityIcons[amenity] || 'checkmark-circle';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={24} color={colors.brand.orange} />
        <Text style={styles.title}>Amenities</Text>
      </View>
      <View style={styles.amenitiesGrid}>
        {amenities.map((amenity, index) => (
          <View key={index} style={styles.amenityItem}>
            <View style={styles.iconContainer}>
              <Ionicons name={getIcon(amenity) as any} size={20} color={colors.brand.orange} />
            </View>
            <Text style={styles.amenityText}>{amenity}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
    letterSpacing: -0.3,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '48%',
    padding: 12,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tint.amberLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amenityText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
  },
});

export default React.memo(BusAmenities);
