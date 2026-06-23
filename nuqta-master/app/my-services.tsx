// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// My Services Page
// Shows user's service bookings or video projects (as service-like feature)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import projectsService from '@/services/realProjectsApi';
import { useAuthLoading, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ServiceProject {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'pending' | 'cancelled';
  createdAt: string;
  reward: number;
  type: 'video' | 'content' | 'review';
}

const MyServicesPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [projects, setProjects] = useState<ServiceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBackPress = useCallback(() => {
    router.push('/profile' as any);
  }, [router]);

  const mapSubmissionStatus = (status: string): 'active' | 'completed' | 'pending' | 'cancelled' => {
    const statusMap: Record<string, 'active' | 'completed' | 'pending' | 'cancelled'> = {
      'approved': 'completed',
      'pending': 'pending',
      'under_review': 'active',
      'rejected': 'cancelled'
    };
    return statusMap[status] || 'pending';
  };

  const fetchProjects = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;

    try {
      setLoading(true);
      setErrorMessage(null);

      const response = await projectsService.getMySubmissions();

      if (response.success && response.data?.submissions) {
        const mappedProjects: ServiceProject[] = response.data.submissions.map((submission: any) => ({
          id: submission._id || submission.id,
          title: submission.project?.title || 'Untitled Project',
          description: submission.project?.description || 'No description available',
          status: mapSubmissionStatus(submission.status),
          createdAt: submission.submittedAt || submission.createdAt,
          reward: submission.paidAmount || submission.project?.reward?.amount || 0,
          type: (submission.content?.type === 'video' ? 'video' :
                 submission.content?.type === 'text' ? 'content' : 'review') as 'video' | 'content' | 'review'
        }));

        if (!isMounted()) return;
        setProjects(mappedProjects);
      } else {
        if (!isMounted()) return;
        setProjects([]);
      }
    } catch (error: any) {
      if (!isMounted()) return;
      setProjects([]);
      if (!isMounted()) return;
      setErrorMessage('Unable to load services. Pull to refresh.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchProjects();
    }
  }, [fetchProjects, authLoading, isAuthenticated]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProjects();
  }, [fetchProjects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return Colors.success;
      case 'active':
        return Colors.info;
      case 'pending':
        return Colors.warning;
      case 'cancelled':
        return Colors.error;
      default:
        return Colors.text.tertiary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'active':
        return 'Active';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return 'videocam';
      case 'content':
        return 'create';
      case 'review':
        return 'star';
      default:
        return 'document';
    }
  };

  const renderProject = useCallback(({ item }: { item: ServiceProject }) => (
    <Pressable
      style={styles.projectCard}
      onPress={() => {
        router.push(`/earning-projects/${item._id || item.id}` as any);
      }}
     
    >
      <View style={[styles.iconContainer, { backgroundColor: Colors.success + '20' }]}>
        <Ionicons name={getTypeIcon(item.type) as any} size={28} color={Colors.success} />
      </View>

      <View style={styles.projectInfo}>
        <Text style={styles.projectTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.projectDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.projectMeta}>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            />
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {getStatusText(item.status)}
            </Text>
          </View>

          <Text style={styles.rewardText}>{currencySymbol}{item.reward}</Text>
        </View>

        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
    </Pressable>
  ), [currencySymbol]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="construct-outline" size={36} color={Colors.success} />
      </View>
      <Text style={styles.emptyTitle}>No Services Yet</Text>
      <Text style={styles.emptyText}>
        Start creating content and earning rewards{'\n'}by taking on projects.
      </Text>
      <Pressable
        style={styles.createButton}
        onPress={() => router.push('/(tabs)/earn' as any)}
      >
        <Ionicons name="add" size={20} color={Colors.text.inverse} />
        <Text style={styles.createButtonText}>Explore Projects</Text>
      </Pressable>
    </View>
  );

  if (loading && !refreshing) {
    return <CardGridSkeleton />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.success} />

      {/* Header */}
      <LinearGradient colors={[Colors.success, colors.successScale[700]]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <Text style={styles.headerTitle}>My Services</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/(tabs)/earn' as any)}
          >
            <Ionicons name="add" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>

        <Text style={styles.headerSubtitle}>
          Video projects and content creation
        </Text>
      </LinearGradient>

      {/* Error Banner */}
      {errorMessage && (
        <View style={styles.infoBanner}>
          <Ionicons
            name="alert-circle"
            size={20}
            color={Colors.warning}
          />
          <Text style={styles.infoBannerText}>{errorMessage}</Text>
        </View>
      )}

      {/* Projects List */}
      <FlashList
        data={projects}
        renderItem={renderProject}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.success}
          />
        }
        ListEmptyComponent={renderEmptyState}
        estimatedItemSize={100}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerRight: {
    width: 40,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSubtitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  listContainer: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  projectCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  projectInfo: {
    flex: 1,
  },
  projectTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  projectDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  projectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  rewardText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.success,
  },
  dateText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  createButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    borderRadius: BorderRadius.sm,
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
  },
});

export default withErrorBoundary(MyServicesPage, 'MyServices');
