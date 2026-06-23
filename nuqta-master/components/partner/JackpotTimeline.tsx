import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { JackpotMilestone } from '@/types/partner.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface JackpotTimelineProps {
  milestones: JackpotMilestone[];
  currentSpent: number;
  onMilestonePress?: (milestone: JackpotMilestone) => void;
}

const { width } = Dimensions.get('window');

function JackpotTimeline({
  milestones,
  currentSpent = 0, // Fixed: Don't hardcode to 18500, use actual value from props
  onMilestonePress
}: JackpotTimelineProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  // Normalize milestone data (backend sends spendAmount, frontend expects amount)
  const normalizedMilestones = milestones.map(m => ({
    ...m,
    amount: m.amount || m.spendAmount || 0
  }));

  const sortedMilestones = normalizedMilestones.sort((a, b) => a.amount - b.amount);
  const maxAmount = Math.max(...normalizedMilestones.map(m => m.amount));
  const progressPercentage = (currentSpent / maxAmount) * 100;

  const renderMilestone = (milestone: JackpotMilestone, index: number) => {
    const isActive = currentSpent >= milestone.amount;
    const isNext = !isActive && currentSpent < milestone.amount;
    const position = (milestone.amount / maxAmount) * 100;

    return (
      <Pressable
        key={milestone.id}
        style={[
          styles.milestoneContainer,
          { left: `${position - 8}%` }
        ]}
        onPress={() => onMilestonePress?.(milestone)}
       
      >
        {/* Milestone Marker */}
        <View style={[
          styles.milestoneMarker,
          isActive && styles.activeMilestoneMarker,
          isNext && styles.nextMilestoneMarker
        ]}>
          {isActive ? (
            <Ionicons name="checkmark" size={16} color="white" />
          ) : (
            <View style={styles.milestoneInner} />
          )}
        </View>

        {/* Milestone Info */}
        <View style={[
          styles.milestoneInfo,
          index % 2 === 0 ? styles.milestoneInfoAbove : styles.milestoneInfoBelow
        ]}>
          <View style={[
            styles.milestoneCard,
            isActive && styles.activeMilestoneCard,
            isNext && styles.nextMilestoneCard
          ]}>
            <Text style={[
              styles.milestoneAmount,
              isActive && styles.activeMilestoneAmount,
              isNext && styles.nextMilestoneAmount
            ]}>
              {currencySymbol}{milestone.amount / 1000}K
            </Text>
            <Text style={[
              styles.milestoneTitle,
              isActive && styles.activeMilestoneTitle,
              isNext && styles.nextMilestoneTitle
            ]}>
              {milestone.reward.title}
            </Text>
            {milestone.reward.image && (
              <CachedImage
                source={milestone.reward.image}
                style={styles.rewardImage}
              />
            )}
            <Text style={[
              styles.rewardValue,
              isActive && styles.activeRewardValue,
              isNext && styles.nextRewardValue
            ]}>
              {milestone.reward.value}
            </Text>
          </View>
          
          {/* Arrow pointing to timeline */}
          <View style={[
            styles.arrow,
            index % 2 === 0 ? styles.arrowDown : styles.arrowUp,
            isActive && styles.activeArrow,
            isNext && styles.nextArrow
          ]} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.trophyContainer}>
          <LinearGradient
            colors={[colors.brand.goldWarm, colors.warning]}
            style={styles.trophyGradient}
          >
            <Ionicons name="trophy" size={24} color="white" />
          </LinearGradient>
        </View>
        <Text style={styles.headerTitle}>Your Jackpot Timeline</Text>
      </View>

      {/* Current Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Current Shopping: <Text style={styles.progressAmount}>{currencySymbol}{currentSpent.toLocaleString()}</Text>
        </Text>
        <Text style={styles.progressSubtext}>
          Shop for {currencySymbol}{((sortedMilestones.find(m => currentSpent < m.amount)?.amount || maxAmount) - currentSpent).toLocaleString()} & More to win our jackpot
        </Text>
      </View>

      {/* Timeline */}
      <View style={styles.timelineContainer}>
        {/* Progress Line */}
        <View style={styles.timelineLine}>
          <LinearGradient
            colors={[colors.lightMustard, colors.nileBlue]}
            style={[styles.timelineProgress, { width: `${Math.min(progressPercentage, 100)}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>

        {/* Start Point */}
        <View style={[styles.startPoint, styles.milestoneMarker, styles.activeMilestoneMarker]}>
          <Ionicons name="play" size={12} color="white" />
        </View>

        {/* Milestones */}
        {sortedMilestones.map(renderMilestone)}

        {/* End Point */}
        <View style={[styles.endPoint, styles.milestoneMarker]}>
          <Ionicons name="flag" size={14} color={colors.neutral[400]} />
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.activeMilestoneMarker]} />
          <Text style={styles.legendText}>Completed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.nextMilestoneMarker]} />
          <Text style={styles.legendText}>Next Goal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.milestoneMarker]} />
          <Text style={styles.legendText}>Locked</Text>
        </View>
      </View>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trophyContainer: {
    marginRight: 12,
  },
  trophyGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    color: colors.neutral[600],
    marginBottom: 4,
  },
  progressAmount: {
    fontWeight: '700',
    color: colors.lightMustard,
  },
  progressSubtext: {
    fontSize: 12,
    color: colors.neutral[500],
    lineHeight: 16,
  },
  timelineContainer: {
    height: 120,
    position: 'relative',
    marginBottom: 20,
  },
  timelineLine: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    height: 4,
    backgroundColor: colors.neutral[200],
    borderRadius: 2,
  },
  timelineProgress: {
    height: '100%',
    borderRadius: 2,
  },
  startPoint: {
    position: 'absolute',
    top: 52,
    left: 12,
  },
  endPoint: {
    position: 'absolute',
    top: 52,
    right: 12,
  },
  milestoneContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: 16,
  },
  milestoneMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    top: 48,
  },
  activeMilestoneMarker: {
    backgroundColor: colors.lightMustard,
  },
  nextMilestoneMarker: {
    backgroundColor: colors.lightMustard,
    borderColor: colors.lightMustard,
  },
  milestoneInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[400],
  },
  milestoneInfo: {
    position: 'absolute',
    alignItems: 'center',
    width: 100,
    left: -42,
  },
  milestoneInfoAbove: {
    top: -80,
  },
  milestoneInfoBelow: {
    top: 80,
  },
  milestoneCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    width: '100%',
  },
  activeMilestoneCard: {
    backgroundColor: colors.lightMustard,
    borderColor: colors.lightMustard,
  },
  nextMilestoneCard: {
    backgroundColor: colors.lightMustard,
    borderColor: colors.lightMustard,
  },
  milestoneAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 2,
  },
  activeMilestoneAmount: {
    color: 'white',
  },
  nextMilestoneAmount: {
    color: 'white',
  },
  milestoneTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: 6,
  },
  activeMilestoneTitle: {
    color: 'white',
  },
  nextMilestoneTitle: {
    color: 'white',
  },
  rewardImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginBottom: 4,
  },
  rewardValue: {
    fontSize: 9,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  activeRewardValue: {
    color: 'white',
  },
  nextRewardValue: {
    color: 'white',
  },
  arrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowDown: {
    borderTopWidth: 8,
    borderTopColor: colors.neutral[200],
    marginTop: 4,
  },
  arrowUp: {
    borderBottomWidth: 8,
    borderBottomColor: colors.neutral[200],
    marginBottom: 4,
  },
  activeArrow: {
    borderTopColor: colors.lightMustard,
    borderBottomColor: colors.lightMustard,
  },
  nextArrow: {
    borderTopColor: colors.lightMustard,
    borderBottomColor: colors.lightMustard,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: colors.neutral[500],
  },
});

export default React.memo(JackpotTimeline);
