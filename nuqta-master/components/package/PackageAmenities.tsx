/**
 * Package Amenities - Displays package inclusions and amenities
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface PackageAmenitiesProps {
  amenities: string[];
  inclusions?: string[];
}

const amenityIcons: Record<string, string> = {
  'Hotel': 'bed',
  'Meals': 'restaurant',
  'Transport': 'car',
  'Sightseeing': 'camera',
  'Guide': 'person',
  'Wi-Fi': 'wifi',
  'AC': 'snow',
  'Breakfast': 'cafe',
  'Dinner': 'restaurant',
  'Lunch': 'fast-food',
  'Transfers': 'airplane',
  'Insurance': 'shield-checkmark',
  'Entry Tickets': 'ticket',
  'Parking': 'car-sport',
};

const PackageAmenities: React.FC<PackageAmenitiesProps> = ({ amenities, inclusions }) => {
  const getIcon = (amenity: string): string => {
    for (const [key, icon] of Object.entries(amenityIcons)) {
      if (amenity.toLowerCase().includes(key.toLowerCase())) {
        return icon;
      }
    }
    return 'checkmark-circle';
  };

  const allItems = [...(inclusions || []), ...amenities];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={24} color={colors.brand.purpleLight} />
        <Text style={styles.title}>Inclusions & Amenities</Text>
      </View>
      <View style={styles.amenitiesGrid}>
        {allItems.map((item, index) => (
          <View key={index} style={styles.amenityItem}>
            <View style={styles.iconContainer}>
              <Ionicons name={getIcon(item) as any} size={20} color={colors.brand.purpleLight} />
            </View>
            <Text style={styles.amenityText}>{item}</Text>
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
    backgroundColor: colors.tint.pink,
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

export default React.memo(PackageAmenities);
