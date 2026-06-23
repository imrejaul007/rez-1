import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { ProjectStatus } from '@/types/earnPage.types';
import { EARN_COLORS } from '@/constants/EarnPageColors';
import ProjectStatusCard from './ProjectStatusCard';
import SkeletonLoader from '@/components/common/SkeletonLoader';
import { colors } from '@/constants/theme';

interface ProjectDashboardProps {
  projectStatus: ProjectStatus;
  onStatusPress: (status: string) => void;
  loading?: boolean;
}

function ProjectDashboard({ 
  projectStatus, 
  onStatusPress,
  loading = false
}: ProjectDashboardProps) {
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 600 });
    slideAnim.value = withTiming(0, { duration: 600 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { translateY: interpolate(fadeAnim.value, [0, 1], [10, 0]) },
    ],
  }));

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
    >
      {/* Header */}
      <Animated.View
        style={[styles.header, headerStyle]}
      >
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title}>
            Project completion
          </ThemedText>
          <View style={styles.titleUnderline} />
        </View>
      </Animated.View>
      
      {/* Status Cards */}
      {loading ? (
        <View style={styles.statusCards}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <SkeletonLoader width="100%" height={85} borderRadius={12} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.statusCards}>
          <ProjectStatusCard
            label="Complete now"
            count={projectStatus.completeNow}
            color={colors.brand.green}
            gradient={[colors.brand.green, '#00A85C', colors.brand.teal]}
            onPress={() => onStatusPress('complete-now')}
            delay={0}
          />
          
          <ProjectStatusCard
            label="In review"
            count={projectStatus.inReview}
            color={colors.warningScale[400]}
            gradient={[colors.warningScale[400], colors.warningScale[700], colors.brand.amberDeep]}
            onPress={() => onStatusPress('in-review')}
            delay={100}
          />
          
          <ProjectStatusCard
            label="Completed"
            count={projectStatus.completed}
            color={colors.successScale[400]}
            gradient={[colors.successScale[400], colors.successScale[700], '#047857']}
            onPress={() => onStatusPress('completed')}
            delay={200}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    marginLeft: 20,
    marginRight: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 22,
    paddingVertical: 20,
    paddingLeft: 16,
    paddingRight: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 200, 87, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.goldWarm,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 6px 16px rgba(255, 200, 87, 0.2)',
      },
    }),
  },
  header: {
    marginBottom: 16,
  },
  titleContainer: {
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.neutral[800],
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  titleUnderline: {
    width: 45,
    height: 4,
    backgroundColor: colors.brand.goldWarm,
    borderRadius: 2,
  },
  statusCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 6,
    width: '100%',
    paddingRight: 0,
  },
  skeletonCard: {
    flex: 1,
  },
});

export default React.memo(ProjectDashboard);
