import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

interface TaskCardProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  reward: number;
  onPress?: () => void;
  isCompleted?: boolean;
  isPending?: boolean;
}

function TaskCard({ 
  title, 
  description, 
  icon, 
  iconColor, 
  reward, 
  onPress,
  isCompleted = false,
  isPending = false
}: TaskCardProps) {
  return (
    <Pressable 
      style={[
        styles.taskCard, 
        isCompleted && styles.completedCard,
        isPending && styles.pendingCard
      ]} 
      onPress={onPress}
      disabled={isCompleted || isPending}
    >
      <View style={styles.taskInfo}>
        <View style={[styles.iconContainer, isCompleted && styles.completedIcon]}>
          <Ionicons 
            name={isCompleted ? "checkmark-circle" : icon} 
            size={24} 
            color={isCompleted ? colors.successScale[400] : iconColor} 
          />
        </View>
        <View style={styles.taskDetails}>
          <ThemedText style={[styles.taskTitle, isCompleted && styles.completedText]}>
            {title}
          </ThemedText>
          <ThemedText style={[styles.taskDescription, isCompleted && styles.completedDescription]}>
            {description}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.taskReward}>
        {isCompleted ? (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark" size={16} color={colors.successScale[400]} />
            <ThemedText style={styles.completedText}>Done</ThemedText>
          </View>
        ) : isPending ? (
          <View style={styles.pendingBadge}>
            <Ionicons name="time" size={16} color={colors.warningScale[400]} />
            <ThemedText style={styles.pendingText}>Pending</ThemedText>
          </View>
        ) : (
          <View style={styles.rewardContainer}>
            <ThemedText style={styles.rewardAmount}>+{reward}</ThemedText>
            <Ionicons name="star" size={16} color={colors.brand.goldBright} />
          </View>
        )}
      </View>
    </Pressable>
);
}

const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  completedCard: {
    backgroundColor: colors.successScale[50],
    borderColor: colors.successScale[400],
    borderWidth: 1,
  },
  pendingCard: {
    backgroundColor: colors.tint.amber,
    borderColor: colors.warningScale[400],
    borderWidth: 1,
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  completedIcon: {
    transform: [{ scale: 1.1 }],
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 2,
  },
  taskDescription: {
    fontSize: 12,
    color: colors.midGray,
    lineHeight: 16,
  },
  completedText: {
    color: colors.successScale[400],
  },
  completedDescription: {
    color: colors.successScale[700],
  },
  taskReward: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardAmount: {
    fontSize: 14,
    color: colors.brand.purpleLight,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.tint.green,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.tint.amberLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingText: {
    fontSize: 11,
    color: colors.warningScale[700],
    fontWeight: '500',
  },
});

export default React.memo(TaskCard);
