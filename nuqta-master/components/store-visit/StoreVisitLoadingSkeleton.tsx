import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SkeletonLoader from '@/components/common/SkeletonLoader';
import { colors } from '@/constants/theme';

interface StoreVisitLoadingSkeletonProps {
  onBackPress: () => void;
}

const StoreVisitLoadingSkeleton: React.FC<StoreVisitLoadingSkeletonProps> = ({ onBackPress }) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.brand.purpleLight, colors.brand.purple]}
        style={styles.header}
      >
        <Pressable onPress={onBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <View style={styles.headerContent}>
          <SkeletonLoader width={200} height={28} borderRadius={8} />
          <SkeletonLoader width={100} height={20} borderRadius={6} style={{ marginTop: 8 }} />
          <SkeletonLoader width={250} height={16} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Live Availability Card Skeleton */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SkeletonLoader width={40} height={40} borderRadius={20} />
            <View style={{ marginLeft: 12 }}>
              <SkeletonLoader width={140} height={20} borderRadius={6} />
              <SkeletonLoader width={80} height={12} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
          </View>
          <SkeletonLoader width="100%" height={60} borderRadius={12} style={{ marginTop: 16 }} />
        </View>

        {/* Store Hours Card Skeleton */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SkeletonLoader width={40} height={40} borderRadius={20} />
            <SkeletonLoader width={120} height={20} borderRadius={6} style={{ marginLeft: 12 }} />
          </View>
          <View style={styles.hoursRow}>
            <SkeletonLoader width={80} height={36} borderRadius={10} />
            <SkeletonLoader width={100} height={20} borderRadius={6} style={{ marginLeft: 12 }} />
          </View>
        </View>

        {/* Customer Details Skeleton */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SkeletonLoader width={40} height={40} borderRadius={20} />
            <SkeletonLoader width={140} height={20} borderRadius={6} style={{ marginLeft: 12 }} />
          </View>
          <View style={styles.inputGroup}>
            <SkeletonLoader width={60} height={16} borderRadius={4} />
            <SkeletonLoader width="100%" height={50} borderRadius={12} style={{ marginTop: 8 }} />
          </View>
          <View style={[styles.inputGroup, { marginTop: 16 }]}>
            <SkeletonLoader width={80} height={16} borderRadius={4} />
            <SkeletonLoader width="100%" height={50} borderRadius={12} style={{ marginTop: 8 }} />
          </View>
          <View style={[styles.inputGroup, { marginTop: 16 }]}>
            <SkeletonLoader width={100} height={16} borderRadius={4} />
            <SkeletonLoader width="100%" height={50} borderRadius={12} style={{ marginTop: 8 }} />
          </View>
        </View>

        {/* Plan Your Visit Skeleton */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SkeletonLoader width={40} height={40} borderRadius={20} />
            <SkeletonLoader width={140} height={20} borderRadius={6} style={{ marginLeft: 12 }} />
          </View>

          {/* Date Selection Skeleton */}
          <View style={{ marginTop: 16 }}>
            <SkeletonLoader width={100} height={16} borderRadius={4} />
            <View style={styles.dateRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonLoader key={i} width={70} height={90} borderRadius={14} />
              ))}
            </View>
          </View>

          {/* Time Selection Skeleton */}
          <View style={{ marginTop: 24 }}>
            <SkeletonLoader width={100} height={16} borderRadius={4} />
            <View style={styles.timeGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonLoader key={i} width="30%" height={48} borderRadius={12} />
              ))}
            </View>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Buttons Skeleton */}
      <View style={styles.bottomActions}>
        <View style={styles.buttonRow}>
          <SkeletonLoader width="48%" height={56} borderRadius={18} />
          <SkeletonLoader width="48%" height={56} borderRadius={18} />
        </View>
        <SkeletonLoader width="100%" height={56} borderRadius={18} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerContent: {
    paddingVertical: 8,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  inputGroup: {
    marginTop: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});

export default React.memo(StoreVisitLoadingSkeleton);
