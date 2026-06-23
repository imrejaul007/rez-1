// components/ProfileCompletionCard.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileCompletionCardProps } from '@/types/profile';
import { colors } from '@/constants/theme';

const ProfileCompletionCard: React.FC<ProfileCompletionCardProps> = ({
  name,
  completionPercentage,
  onCompleteProfile,
  onViewDetails,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="small" color="#7b42f6" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      <View style={styles.leftSection}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.progressText}>
          {completionPercentage} % of the profile is completed
        </Text>

        <Pressable style={styles.completeButton} onPress={onCompleteProfile}>
          <Text style={styles.completeButtonText}>Complete Profile</Text>
        </Pressable>

        <Pressable onPress={onViewDetails}>
          <Text style={styles.viewDetails}>View Details</Text>
        </Pressable>
      </View>

      <View style={styles.rightSection}>
        <View style={styles.iconContainer}>
          <Ionicons name="person" size={28} color="#7b42f6" />
        </View>
      </View>
    </View>
  );
};

export default React.memo(ProfileCompletionCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#f3edff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  leftSection: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3a2d6b',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#4b3f72',
    marginBottom: 10,
  },
  completeButton: {
    backgroundColor: '#7b42f6',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  completeButtonText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  viewDetails: {
    color: '#4b3f72',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  rightSection: {
    marginLeft: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  loadingText: {
    color: '#7b42f6',
    fontSize: 12,
    marginTop: 8,
  },
});
