import React, { useEffect } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { Project } from '@/types/earnPage.types';
import { EARN_COLORS } from '@/constants/EarnPageColors';
import ProjectCard from './ProjectCard';
import { SkeletonProjectCard } from '@/components/common/SkeletonLoader';
import { colors } from '@/constants/theme';

interface RecentProjectsSectionProps {
  projects: Project[];
  onProjectPress: (project: Project) => void;
  onStartProject?: (project: Project) => void;
  onSeeAll: () => void;
  loading?: boolean;
}

function RecentProjectsSection({ 
  projects, 
  onProjectPress, 
  onStartProject,
  onSeeAll,
  loading = false
}: RecentProjectsSectionProps) {
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(20);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 500 });
    slideAnim.value = withTiming(0, { duration: 500 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleContainer}>
            <ThemedText style={styles.title}>
              Recent Projects
            </ThemedText>
            <View style={styles.titleUnderline} />
          </View>
        </View>
        
        <Pressable 
          style={styles.seeAllButton}
          onPress={onSeeAll}
         
        >
          <ThemedText style={styles.seeAllText}>See all</ThemedText>
          <Ionicons name="chevron-forward" size={16} color={EARN_COLORS.primary} />
        </Pressable>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((i) => (
            <SkeletonProjectCard key={i} />
          ))}
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <LinearGradient
            colors={[colors.indigoMist, colors.tint.purpleLight]}
            style={styles.emptyIconCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="briefcase-outline" size={28} color={colors.brand.purple} />
          </LinearGradient>
          <ThemedText style={styles.emptyTitle}>No projects available</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            New projects will appear here when they become available
          </ThemedText>
        </View>
      ) : (
        <ScrollView 
          style={styles.projectsList}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onPress={() => onProjectPress(project)}
              onStart={onStartProject ? () => onStartProject(project) : undefined}
            />
          ))}
          
          {projects.length >= 5 && (
            <Pressable 
              style={styles.loadMoreButton}
              onPress={onSeeAll}
             
            >
              <ThemedText style={styles.loadMoreText}>Load More Projects</ThemedText>
              <Ionicons name="chevron-down" size={20} color={EARN_COLORS.primary} />
            </Pressable>
          )}
        </ScrollView>
      )}
    </Animated.View>
);
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    marginHorizontal: 20,
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  titleContainer: {
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: EARN_COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  titleUnderline: {
    width: 46,
    height: 3,
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: EARN_COLORS.primary,
  },
  projectsList: {
    maxHeight: 600, // Limit height to prevent infinite scroll issues
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: EARN_COLORS.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: EARN_COLORS.textSecondary,
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  emptyDescription: {
    fontSize: 13,
    color: EARN_COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EARN_COLORS.backgroundCard,
    marginTop: 8,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: EARN_COLORS.primary,
    borderStyle: 'dashed',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: EARN_COLORS.primary,
  },
});

export default React.memo(RecentProjectsSection);
