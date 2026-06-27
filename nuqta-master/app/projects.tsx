// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue} from 'react-native-reanimated';
import { CardGridSkeleton } from '@/components/skeletons';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/apiClient';
import { useAuthUser, useGetCurrencySymbol } from '@/stores/selectors';
import { EARN_COLORS } from '@/constants/EarnPageColors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface Project {
  _id: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  type: string;
  reward: {
    amount: number;
    currency: string;
    type: string;
  };
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  status: string;
  isFeatured?: boolean;
  isSponsored?: boolean;
  tags?: string[];
  analytics?: {
    totalViews: number;
    totalSubmissions: number;
    approvedSubmissions: number;
  };
  createdBy?: {
    profile?: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };
  };
  sponsor?: {
    name?: string;
    logo?: string;
  };
  createdAt: string;
}

interface ProjectsResponse {
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function AllProjectsPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAuthUser();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const params = useLocalSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);

  // Hide the default navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false});
  }, [navigation]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(params.filterStatus as string || null);
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'trending'>('newest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const searchScaleAnim = useSharedValue(1);
  const cardAnims = useRef<{ [key: string]: { value: number } }>({}).current;
  const isMounted = useIsMounted();

  const categories = [
    { label: 'All', value: null, icon: 'grid', gradient: [colors.brand.purpleLight, colors.brand.purpleMedium] },
    { label: 'Review', value: 'review', icon: 'star', gradient: [colors.warningScale[400], colors.brand.orange] },
    { label: 'Social Share', value: 'social_share', icon: 'share-social', gradient: [colors.infoScale[400], colors.brand.indigo] },
    { label: 'UGC Content', value: 'ugc_content', icon: 'videocam', gradient: [colors.brand.pink, '#F472B6'] },
    { label: 'Store Visit', value: 'store_visit', icon: 'storefront', gradient: [Colors.gold, Colors.nileBlue] },
    { label: 'Survey', value: 'survey', icon: 'clipboard', gradient: [Colors.nileBlue, Colors.nileBlue] },
    { label: 'Photo', value: 'photo', icon: 'camera', gradient: [Colors.warning, colors.brand.orangeDark] },
    { label: 'Video', value: 'video', icon: 'film', gradient: [Colors.error, Colors.error] },
  ];

  const difficulties = [
    { label: 'All', value: null },
    { label: 'Easy', value: 'easy', color: Colors.gold },
    { label: 'Medium', value: 'medium', color: Colors.warning },
    { label: 'Hard', value: 'hard', color: Colors.error },
  ];

  const loadProjects = useCallback(async (pageNum = 1, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setError(null);
      }

      let response: any;
      let endpoint = '/projects';
      const params: any = {
        page: pageNum,
        limit: 20,
        sortBy};

      // Handle status filtering based on user submissions
      if (filterStatus === 'in-review' || filterStatus === 'completed') {
        // Use my-submissions endpoint for user's submissions
        endpoint = '/projects/my-submissions';
        if (filterStatus === 'in-review') {
          params.status = 'pending'; // Will match pending and under_review
        } else if (filterStatus === 'completed') {
          params.status = 'approved';
        }
      } else if (filterStatus === 'complete-now') {
        // Show active projects user hasn't started
        params.status = 'active';
        params.excludeUserSubmissions = true; // Custom param to exclude projects with user submissions
      } else {
        // Default: show all active projects
        params.status = 'active';
      }

      if (selectedCategory) {
        params.category = selectedCategory;
      }

      if (selectedDifficulty) {
        params.difficulty = selectedDifficulty;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      if (endpoint === '/projects/my-submissions') {
        // Handle my-submissions response format
        const submissionsResponse = await apiClient.get<{
          submissions: any[];
          pagination: any;
        }>('/projects/my-submissions', params);
        
        if (submissionsResponse.success && submissionsResponse.data) {
          // Transform submissions to projects format
          const transformedProjects = submissionsResponse.data.submissions.map((sub: any) => ({
            _id: sub.project._id,
            title: sub.project.title,
            description: sub.project.description,
            shortDescription: sub.project.shortDescription,
            category: sub.project.category,
            type: sub.project.type || 'text',
            reward: sub.project.reward || { amount: 0, currency: currencySymbol, type: 'fixed' },
            difficulty: sub.project.difficulty || 'easy',
            estimatedTime: sub.project.estimatedTime || 0,
            status: sub.project.status || 'active',
            tags: sub.project.tags || [],
            analytics: sub.project.analytics || {},
            createdAt: sub.project.createdAt || sub.submittedAt,
            submissionStatus: sub.status,
            submissionId: sub._id}));

          response = {
            success: true,
            data: {
              projects: transformedProjects,
              pagination: submissionsResponse.data.pagination
            }
          };
        } else {
          throw new Error('Failed to load submissions');
        }
      } else {
        // Regular projects endpoint
        response = await apiClient.get<ProjectsResponse>('/projects', params);
      }

      if (response.success && response.data) {
        const newProjects = response.data.projects || [];
        
        if (reset) {
          if (!isMounted()) return;
          setProjects(newProjects);
          // Animate cards in
          newProjects.forEach((project) => {
            if (!cardAnims[project._id]) {
              cardAnims[project._id] = { value: 0 };
            }
            cardAnims[project._id].value = 1;
          });
        } else {
          if (!isMounted()) return;
          setProjects(prev => [...prev, ...newProjects]);
        }

        if (!isMounted()) return;
        setHasMore(response.data.pagination?.hasNext || false);
        if (!isMounted()) return;
        setPage(pageNum);

        // Animate in
        if (reset) {
          fadeAnim.value = withTiming(1, { duration: 500 });
          slideAnim.value = withTiming(0, { duration: 500 });
        }
      } else {
        throw new Error('Failed to load projects');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [selectedCategory, selectedDifficulty, searchQuery, sortBy, filterStatus, user, fadeAnim, slideAnim, cardAnims]);

  useEffect(() => {
    loadProjects(1, true);
  }, [selectedCategory, selectedDifficulty, sortBy, filterStatus]);

  useEffect(() => {
    searchScaleAnim.value = withSpring(searchFocused ? 1.02 : 1, { damping: 10, stiffness: 300 });
  }, [searchFocused, searchScaleAnim]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProjects(1, true);
  }, [loadProjects]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadProjects(page + 1, false);
    }
  }, [loading, hasMore, page, loadProjects]);

  const handleSearch = useCallback(() => {
    loadProjects(1, true);
  }, [loadProjects]);

  const handleProjectPress = useCallback((project: Project) => {
    router.push({
      pathname: '/project-detail',
      params: { projectId: project._id }} as any);
  }, [router]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return Colors.gold;
      case 'medium':
        return Colors.warning;
      case 'hard':
        return Colors.error;
      default:
        return Colors.text.tertiary;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'review':
        return 'star';
      case 'social_share':
        return 'share-social';
      case 'ugc_content':
        return 'videocam';
      case 'store_visit':
        return 'storefront';
      case 'survey':
        return 'clipboard';
      case 'photo':
        return 'camera';
      case 'video':
        return 'film';
      default:
        return 'briefcase';
    }
  };

  const getCategoryGradient = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.gradient || [colors.brand.purpleLight, colors.brand.purpleMedium];
  };

  // Project Card Component
  const ProjectCard = React.memo(({ project, cardAnim, onPress, getCategoryGradient, getDifficultyColor, getCategoryIcon }: {
    project: Project;
    cardAnim: SharedValue<number>;
    onPress: () => void;
    getCategoryGradient: (category: string) => string[];
    getDifficultyColor: (difficulty: string) => string;
    getCategoryIcon: (category: string) => string;
  }) => {
    const pressAnim = useSharedValue(1);

    const handlePressIn = () => {
      pressAnim.value = withSpring(0.96, { damping: 10, stiffness: 300 });
    };

    const handlePressOut = () => {
      pressAnim.value = withSpring(1, { damping: 10, stiffness: 300 });
    };

    const cardStyle = useAnimatedStyle(() => ({
      opacity: cardAnim.value,
      transform: [
        { translateY: interpolate(cardAnim.value, [0, 1], [30, 0]) },
        { scale: pressAnim.value },
      ],
    }));

    const categoryGradient = getCategoryGradient(project.category);
    const difficultyColor = getDifficultyColor(project.difficulty);

    return (
      <Animated.View style={cardStyle}>
        <Pressable
          style={styles.projectCard}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
         
        >
          <LinearGradient
            colors={[colors.background.primary, '#FAFBFC']}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Decorative Background Elements */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />

            {/* Featured Badge */}
            {project.isFeatured && (
              <View style={styles.featuredBadgeContainer}>
                <LinearGradient
                  colors={[colors.warningScale[400], colors.warningScale[700]]}
                  style={styles.featuredBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="star" size={12} color={Colors.text.inverse} />
                  <ThemedText style={styles.featuredText}>Featured</ThemedText>
                </LinearGradient>
              </View>
            )}

            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <LinearGradient
                  colors={categoryGradient}
                  style={styles.categoryIconContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name={getCategoryIcon(project.category) as any}
                    size={22}
                    color={Colors.text.inverse}
                  />
                </LinearGradient>
                <View style={styles.cardTitleContainer}>
                  <ThemedText style={styles.cardTitle} numberOfLines={1}>
                    {project.title}
                  </ThemedText>
                </View>
              </View>
              <LinearGradient
                colors={[`${difficultyColor}20`, `${difficultyColor}10`]}
                style={styles.difficultyBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <ThemedText
                  style={[styles.difficultyText, { color: difficultyColor }]}
                >
                  {project.difficulty}
                </ThemedText>
              </LinearGradient>
            </View>

            {/* Card Description */}
            <ThemedText style={styles.cardDescription} numberOfLines={2}>
              {project.shortDescription || project.description}
            </ThemedText>

            {/* Card Footer */}
            <View style={styles.cardFooter}>
              <LinearGradient
                colors={[colors.lightMustard, colors.nileBlue]}
                style={styles.rewardContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="cash" size={18} color={Colors.text.inverse} />
                <ThemedText style={styles.rewardAmount}>
                  {currencySymbol}{project.reward?.amount || 0}
                </ThemedText>
              </LinearGradient>
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={16} color={Colors.text.tertiary} />
                <ThemedText style={styles.timeText}>
                  {project.estimatedTime || 0} min
                </ThemedText>
              </View>
              {project.analytics && (
                <View style={styles.statsContainer}>
                  <Ionicons name="eye-outline" size={16} color={Colors.text.tertiary} />
                  <ThemedText style={styles.statsText}>
                    {project.analytics.totalViews || 0}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {project.tags.slice(0, 3).map((tag, tagIndex) => (
                  <LinearGradient
                    key={tagIndex}
                    colors={[colors.indigoMist, '#E0E7FF']}
                    style={styles.tag}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <ThemedText style={styles.tagText}>{tag}</ThemedText>
                  </LinearGradient>
                ))}
              </View>
            )}

            {/* Arrow Indicator */}
            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]},
        ]}
      >
        {/* Modern Header with Gradient */}
        <LinearGradient
          colors={[colors.brand.purpleLight, colors.brand.purple, colors.brand.purpleDeep]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
           
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText style={styles.headerTitle}>All Projects</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {projects.length > 0 ? `${projects.length} projects available` : 'Discover opportunities'}
            </ThemedText>
          </View>
          <View style={styles.headerRight} />
        </LinearGradient>

        {/* Modern Search Bar with Glassmorphism */}
        <View style={styles.searchContainer}>
          <Animated.View
            style={[
              styles.searchBarWrapper,
              {
                transform: [{ scale: searchScaleAnim }]},
            ]}
          >
            <LinearGradient
              colors={[colors.background.primary, colors.neutral[50]]}
              style={styles.searchBar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.searchIconContainer}>
                <Ionicons name="search" size={22} color={Colors.nileBlue} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search projects..."
                placeholderTextColor={colors.neutral[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => {
                    setSearchQuery('');
                    handleSearch();
                  }}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={22} color={Colors.text.tertiary} />
                </Pressable>
              )}
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Modern Filter Chips */}
        <View style={styles.filtersSection}>
          {/* Category Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScrollView}
            contentContainerStyle={styles.filterContent}
          >
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.value;
              return (
                <Pressable
                  key={cat.value || 'all'}
                  onPress={() => setSelectedCategory(cat.value)}
                 
                >
                  {isActive ? (
                    <LinearGradient
                      colors={cat.gradient}
                      style={styles.filterChipActive}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name={cat.icon as any} size={16} color={Colors.text.inverse} />
                      <ThemedText style={styles.filterChipTextActive}>
                        {cat.label}
                      </ThemedText>
                    </LinearGradient>
                  ) : (
                    <View style={styles.filterChip}>
                      <Ionicons name={cat.icon as any} size={16} color={Colors.text.tertiary} />
                      <ThemedText style={styles.filterChipText}>
                        {cat.label}
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Difficulty & Sort Row */}
          <View style={styles.filterRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.difficultyScrollView}
              contentContainerStyle={styles.difficultyContent}
            >
              {difficulties.map((diff) => {
                const isActive = selectedDifficulty === diff.value;
                return (
                  <Pressable
                    key={diff.value || 'all'}
                    onPress={() => setSelectedDifficulty(diff.value)}
                   
                  >
                    {isActive && diff.value ? (
                      <LinearGradient
                        colors={[`${diff.color}20`, `${diff.color}10`]}
                        style={styles.difficultyChipActive}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <ThemedText
                          style={[styles.difficultyChipTextActive, { color: diff.color }]}
                        >
                          {diff.label}
                        </ThemedText>
                      </LinearGradient>
                    ) : (
                      <View style={styles.difficultyChip}>
                        <ThemedText style={styles.difficultyChipText}>
                          {diff.label}
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Sort Button */}
            <Pressable
              style={styles.sortButton}
              onPress={() => {
                const options = ['newest', 'popular', 'trending'];
                const currentIndex = options.indexOf(sortBy);
                const nextIndex = (currentIndex + 1) % options.length;
                setSortBy(options[nextIndex] as any);
              }}
             
            >
              <LinearGradient
                colors={[colors.neutral[100], colors.neutral[200]]}
                style={styles.sortButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="swap-vertical" size={18} color={Colors.nileBlue} />
                <ThemedText style={styles.sortText}>
                  {sortBy === 'newest' ? 'Newest' : sortBy === 'popular' ? 'Popular' : 'Trending'}
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* Projects List */}
        {loading && projects.length === 0 ? (
          <CardGridSkeleton />
        ) : error ? (
          <View style={styles.centerContainer}>
            <LinearGradient
              colors={[colors.errorScale[100], colors.errorScale[200]]}
              style={styles.errorIconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="alert-circle" size={48} color={Colors.error} />
            </LinearGradient>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable
              style={styles.retryButton}
              onPress={() => loadProjects(1, true)}
            >
              <LinearGradient
                colors={[colors.brand.purple, colors.brand.purpleDeep]}
                style={styles.retryButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.centerContainer}>
            <LinearGradient
              colors={[colors.indigoMist, '#E0E7FF']}
              style={styles.emptyIconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="briefcase-outline" size={64} color={Colors.nileBlue} />
            </LinearGradient>
            <ThemedText style={styles.emptyText}>No projects found</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Try adjusting your filters or search query
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            style={styles.projectsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand.purple} />
            }
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const paddingToBottom = 20;
              if (
                layoutMeasurement.height + contentOffset.y >=
                contentSize.height - paddingToBottom
              ) {
                handleLoadMore();
              }
            }}
            scrollEventThrottle={400}
            contentContainerStyle={styles.projectsListContent}
          >
            {projects.map((project) => {
              if (!cardAnims[project._id]) {
                cardAnims[project._id] = { value: 1 };
              }
              return (
                <ProjectCard
                  key={project._id}
                  project={project}
                  cardAnim={cardAnims[project._id]}
                  onPress={() => handleProjectPress(project)}
                  getCategoryGradient={getCategoryGradient}
                  getDifficultyColor={getDifficultyColor}
                  getCategoryIcon={getCategoryIcon}
                />
              );
            })}

            {hasMore && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={Colors.nileBlue} />
                <ThemedText style={styles.loadMoreText}>Loading more projects...</ThemedText>
              </View>
            )}
          </ScrollView>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary},
  content: {
    flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? Spacing.xl : Spacing.lg,
    ...Shadows.strong},
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'},
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.md},
  headerTitle: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.text.inverse,
    letterSpacing: -0.5,
    marginBottom: 2},
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.2},
  headerRight: {
    width: 44},
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default},
  searchBarWrapper: {
    ...Shadows.medium,
    borderRadius: BorderRadius.lg},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 56,
    borderWidth: 2,
    borderColor: Colors.border.default},
  searchIconContainer: {
    marginRight: Spacing.md},
  searchInput: {
    flex: 1,
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: Colors.text.primary,
    paddingVertical: 0},
  clearButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs},
  filtersSection: {
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    paddingVertical: Spacing.base},
  filterScrollView: {
    marginBottom: Spacing.md},
  filterContent: {
    paddingHorizontal: Spacing.lg,
    gap: 10},
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.secondary,
    marginRight: 10,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent'},
  filterChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius['2xl'],
    marginRight: 10,
    gap: Spacing.sm,
    ...Shadows.medium},
  filterChipText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.tertiary,
    letterSpacing: 0.2},
  filterChipTextActive: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
    letterSpacing: 0.2},
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md},
  difficultyScrollView: {
    flex: 1},
  difficultyContent: {
    gap: Spacing.sm},
  difficultyChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    marginRight: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent'},
  difficultyChipActive: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    marginRight: Spacing.sm,
    borderWidth: 1.5},
  difficultyChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.tertiary},
  difficultyChipTextActive: {
    fontSize: 13,
    fontWeight: '700'},
  sortButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.subtle},
  sortButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    gap: 6},
  sortText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.nileBlue,
    letterSpacing: 0.2},
  projectsList: {
    flex: 1},
  projectsListContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 100},
  projectCard: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.strong},
  cardGradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)'},
  decorativeCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    top: -40,
    right: -40},
  decorativeCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.03)',
    bottom: -20,
    left: -20},
  featuredBadgeContainer: {
    position: 'absolute',
    top: Spacing.base,
    right: Spacing.base,
    zIndex: 10,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.medium},
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    gap: 6},
  featuredText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.text.inverse,
    letterSpacing: 0.3},
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    zIndex: 5},
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md},
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    ...Shadows.medium},
  cardTitleContainer: {
    flex: 1},
  cardTitle: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5,
    lineHeight: 26},
  difficultyBadge: {
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5},
  difficultyText: {
    ...Typography.bodySmall,
    fontWeight: '800',
    textTransform: 'capitalize',
    letterSpacing: 0.3},
  cardDescription: {
    fontSize: 15,
    color: Colors.text.tertiary,
    lineHeight: 22,
    marginBottom: Spacing.base,
    zIndex: 5,
    fontWeight: '500'},
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    zIndex: 5,
    gap: Spacing.md},
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6},
  rewardAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text.inverse,
    letterSpacing: 0.2},
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    gap: 6},
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.tertiary},
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    gap: 6},
  statsText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.tertiary},
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
    gap: Spacing.sm,
    zIndex: 5},
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)'},
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.nileBlue,
    letterSpacing: 0.2},
  arrowContainer: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5},
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl']},
  loadingText: {
    marginTop: Spacing.lg,
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.tertiary},
  errorIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.medium},
  errorText: {
    marginTop: Spacing.base,
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.error,
    textAlign: 'center'},
  retryButton: {
    marginTop: 28,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: Colors.nileBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6},
  retryButtonGradient: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 14,
    borderRadius: BorderRadius.lg},
  retryButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '800',
    color: Colors.text.inverse,
    letterSpacing: 0.3},
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.strong},
  emptyText: {
    marginTop: Spacing.base,
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5},
  emptySubtext: {
    marginTop: Spacing.md,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22},
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md},
  loadMoreText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary}});

export default withErrorBoundary(AllProjectsPage, 'Projects');
