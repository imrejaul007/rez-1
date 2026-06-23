/**
 * Healthcare Section - Converted from V2
 * Consult Doctors, Online Pharmacy, Lab Tests, etc.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;

const COLORS = {
  white: colors.background.primary,
  navy: colors.nileBlue,
  gray600: colors.neutral[500],
  mustard: colors.lightMustard,
  nileBlue: colors.nileBlue,
  lavender: colors.lavenderMist,
};

const HealthcareSection: React.FC = () => {
  const router = useRouter();

  const handleViewAll = () => {
    router.push('/healthcare' as any);
  };

  const handlePress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🏥 Healthcare</Text>
          <Text style={styles.headerSubtitle}>Your health, our priority</Text>
        </View>
        <Pressable onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>

      {/* Main Cards Row */}
      <View style={styles.mainRow}>
        {/* Consult Doctors Card */}
        <Pressable
          style={styles.doctorsCard}
          onPress={() => handlePress('/healthcare/doctors')}
         
        >
          <LinearGradient
            colors={[colors.nileBlue, colors.brand.nileBlueLight, '#2d5c7e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.doctorsGradient}
          >
            <View style={styles.doctorIconBox}>
              <Text style={styles.doctorIcon}>👨‍⚕️</Text>
            </View>
            <Text style={styles.doctorsTitle}>Consult</Text>
            <Text style={styles.doctorsTitle}>Doctors</Text>
            <Text style={styles.doctorsSubtitle}>Book instant appointments</Text>
            <View style={styles.availableBadge}>
              <Text style={styles.availableText}>24/7 Available</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Online Pharmacy Card */}
        <Pressable
          style={styles.pharmacyCard}
          onPress={() => handlePress('/healthcare/pharmacy')}
         
        >
          <LinearGradient
            colors={[colors.lightMustard, '#e6b84e', '#d4a645']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pharmacyGradient}
          >
            <View style={styles.pharmacyIconBox}>
              <Text style={styles.pharmacyIcon}>💊</Text>
            </View>
            <Text style={styles.pharmacyTitle}>Online</Text>
            <Text style={styles.pharmacyTitle}>Pharmacy</Text>
            <Text style={styles.pharmacySubtitle}>Order medicines online</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>25% OFF</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Bottom Row - Quick Actions */}
      <View style={styles.bottomRow}>
        {/* Lab Tests */}
        <Pressable
          style={styles.bottomCard}
          onPress={() => handlePress('/healthcare/lab')}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <Text style={styles.bottomIcon}>🔬</Text>
          </View>
          <Text style={styles.bottomTitle}>Lab</Text>
          <Text style={styles.bottomTitle}>Tests</Text>
        </Pressable>

        {/* Dental Care */}
        <Pressable
          style={styles.bottomCard}
          onPress={() => handlePress('/healthcare/dental')}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
            <Text style={styles.bottomIcon}>🦷</Text>
          </View>
          <Text style={styles.bottomTitle}>Dental</Text>
          <Text style={styles.bottomTitle}>Care</Text>
        </Pressable>

        {/* Emergency 24x7 */}
        <Pressable
          style={styles.bottomCard}
          onPress={() => handlePress('/healthcare/emergency')}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Text style={styles.bottomIcon}>🚑</Text>
          </View>
          <Text style={styles.bottomTitle}>Emergency</Text>
          <Text style={styles.bottomTitle}>24x7</Text>
        </Pressable>

        {/* Health Records */}
        <Pressable
          style={styles.bottomCard}
          onPress={() => handlePress('/healthcare/records')}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(255, 205, 87, 0.1)' }]}>
            <Text style={styles.bottomIcon}>📋</Text>
          </View>
          <Text style={styles.bottomTitle}>Health</Text>
          <Text style={styles.bottomTitle}>Records</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.mustard,
  },

  // Main Row
  mainRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  // Doctors Card
  doctorsCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  doctorsGradient: {
    padding: 16,
    minHeight: 180,
  },
  doctorIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  doctorIcon: {
    fontSize: 28,
  },
  doctorsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    lineHeight: 22,
  },
  doctorsSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    marginBottom: 12,
  },
  availableBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  availableText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Pharmacy Card
  pharmacyCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  pharmacyGradient: {
    padding: 16,
    minHeight: 180,
  },
  pharmacyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pharmacyIcon: {
    fontSize: 28,
  },
  pharmacyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    lineHeight: 22,
  },
  pharmacySubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    marginBottom: 12,
  },
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Bottom Row
  bottomRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  bottomCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: 12,
    alignItems: 'center',
  },
  bottomIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bottomIcon: {
    fontSize: 20,
  },
  bottomTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
  },
});

export default React.memo(HealthcareSection);
