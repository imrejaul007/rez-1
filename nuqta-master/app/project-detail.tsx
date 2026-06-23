import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect,  useLayoutEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  TextInput
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import apiClient from '@/services/apiClient';
import { useAuthUser, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import { showAlert, alertOk } from '@/utils/alert';
import ProjectSubmissionForm from '@/components/projects/ProjectSubmissionForm';
import { DetailPageSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ProjectSubmission {
  _id: string;
  user: string | { _id: string };
  submittedAt: string;
  content: {
    type: 'text' | 'image' | 'video' | 'rating' | 'checkin' | 'receipt';
    data: string | string[];
    metadata?: any;
  };
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
  qualityScore?: number;
  paidAmount?: number;
  paidAt?: string;
  rejectionReason?: string;
}

interface Project {
  _id: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  type: 'video' | 'photo' | 'text' | 'visit' | 'checkin' | 'survey' | 'rating' | 'social' | 'referral';
  reward: {
    amount: number;
    currency: string;
    type: string;
    paymentMethod: string;
    paymentSchedule: string;
  };
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  status: string;
  isFeatured?: boolean;
  isSponsored?: boolean;
  tags?: string[];
  instructions?: string[];
  requirements?: {
    minWords?: number;
    minDuration?: number;
    maxDuration?: number;
    minPhotos?: number;
    location?: {
      required: boolean;
    };
  };
  analytics?: {
    totalViews: number;
    totalSubmissions: number;
    approvedSubmissions: number;
  };
  submissions?: ProjectSubmission[];
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

function ProjectDetailPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const projectId = params.projectId as string;
  const autoOpenForm = params.autoOpenForm === 'true';

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [userSubmission, setUserSubmission] = useState<ProjectSubmission | null>(null);

  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  // Hide the default navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false });
  }, [navigation]);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadProject();
  }, [projectId]);

  // Auto-open form if requested and project is loaded
  useEffect(() => {
    if (autoOpenForm && project && !loading && isAuthenticated) {
      // Auto-open form - allow editing if user has a pending or under_review submission
      // Don't auto-open if submission is approved (user can view it instead)
      if (!userSubmission || userSubmission.status === 'pending' || userSubmission.status === 'under_review' || userSubmission.status === 'rejected') {
        setShowSubmissionForm(true);
      }
    }
  }, [autoOpenForm, project, loading, isAuthenticated, userSubmission]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ project: Project; similarProjects?: Project[] }>(
        `/projects/${projectId}`
      );

      if (response.success && response.data) {
        const projectData = response.data.project || response.data as any;
        if (!isMounted()) return;
        setProject(projectData);
        
        // Check if user has a submission for this project
        if (isAuthenticated && user?.id && projectData.submissions) {
          const submission = projectData.submissions.find((sub: ProjectSubmission) => {
            const userId = typeof sub.user === 'string' ? sub.user : sub.user?._id;
            return userId === user?.id;
          });
          if (!isMounted()) return;
          setUserSubmission(submission || null);
        } else {
          if (!isMounted()) return;
          setUserSubmission(null);
        }
        
        fadeAnim.value = withTiming(1, { duration: 500 });
        slideAnim.value = withTiming(0, { duration: 500 });
      } else {
        throw new Error('Failed to load project');
      }
    } catch (error) {
      showAlert('Error', 'Failed to load project details');
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleSubmitProject = async (data: {
    content: string | string[];
    contentType: 'text' | 'image' | 'video' | 'rating' | 'checkin' | 'receipt';
    metadata?: any;
  }) => {
    if (!isAuthenticated) {
      showAlert('Authentication Required', 'Please login to submit a project');
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiClient.post(`/projects/submit`, {
        projectId,
        content: data.content,
        contentType: data.contentType,
        metadata: data.metadata });

      if (response.success) {
        // Check if this was an update or new submission
        const isUpdate = userSubmission !== null;
        const message = isUpdate 
          ? userSubmission?.status === 'rejected'
            ? 'Your submission has been updated and resubmitted! It is now under review.'
            : 'Your submission has been updated successfully!'
          : 'Your submission has been received and is under review!';
        
        alertOk('Success', message);
        setShowSubmissionForm(false);
        loadProject(); // Reload to show updated status
      } else {
        throw new Error('Failed to submit project');
      }
    } catch (error) {
      showAlert('Error', 'Failed to submit project. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return Colors.success;
      case 'rejected':
        return Colors.error;
      case 'under_review':
        return Colors.warning;
      case 'pending':
      default:
        return Colors.text.tertiary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'under_review':
        return 'Under Review';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return Colors.success;
      case 'medium':
        return Colors.warning;
      case 'hard':
        return Colors.error;
      default:
        return Colors.text.tertiary;
    }
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (!project) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <ThemedText style={styles.errorText}>Project not found</ThemedText>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View
          style={contentAnimStyle}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
             
              accessible={true}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              accessibilityHint="Navigate to previous screen"
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </Pressable>
            <ThemedText style={styles.headerTitle} accessible={true} accessibilityRole="header">Project Details</ThemedText>
            <View style={styles.headerRight} />
          </View>

          {/* Project Card */}
          <View style={styles.projectCard}>
            <LinearGradient
              colors={[colors.background.primary, colors.neutral[50]]}
              style={styles.cardGradient}
            >
              {/* Title */}
              <View style={styles.titleRow}>
                <ThemedText style={styles.projectTitle}>{project.title}</ThemedText>
                {project.isFeatured && (
                  <View style={styles.featuredBadge}>
                    <Ionicons name="star" size={14} color={Colors.warning} />
                    <ThemedText style={styles.featuredText}>Featured</ThemedText>
                  </View>
                )}
              </View>

              {/* Meta Info */}
              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.difficultyBadge,
                    { backgroundColor: `${getDifficultyColor(project.difficulty)}20` },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.difficultyText,
                      { color: getDifficultyColor(project.difficulty) },
                    ]}
                  >
                    {project.difficulty}
                  </ThemedText>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={Colors.text.tertiary} />
                  <ThemedText style={styles.metaText}>
                    {project.estimatedTime || 0} min
                  </ThemedText>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="cash" size={16} color={Colors.success} />
                  <ThemedText style={styles.rewardText}>
                    {currencySymbol}{project.reward?.amount || 0}
                  </ThemedText>
                </View>
              </View>

              {/* Description */}
              <ThemedText style={styles.description}>{project.description}</ThemedText>

              {/* Instructions */}
              {project.instructions && project.instructions.length > 0 && (
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Instructions</ThemedText>
                  {project.instructions.map((instruction, index) => (
                    <View key={index} style={styles.instructionItem}>
                      <View style={styles.instructionNumber}>
                        <ThemedText style={styles.instructionNumberText}>
                          {index + 1}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.instructionText}>{instruction}</ThemedText>
                    </View>
                  ))}
                </View>
              )}

              {/* Tags */}
              {project.tags && project.tags.length > 0 && (
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Tags</ThemedText>
                  <View style={styles.tagsContainer}>
                    {project.tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <ThemedText style={styles.tagText}>{tag}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Analytics */}
              {project.analytics && (
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Project Stats</ThemedText>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Ionicons name="eye-outline" size={20} color={Colors.text.tertiary} />
                      <ThemedText style={styles.statValue}>
                        {project.analytics.totalViews || 0}
                      </ThemedText>
                      <ThemedText style={styles.statLabel}>Views</ThemedText>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="document-text-outline" size={20} color={Colors.text.tertiary} />
                      <ThemedText style={styles.statValue}>
                        {project.analytics.totalSubmissions || 0}
                      </ThemedText>
                      <ThemedText style={styles.statLabel}>Submissions</ThemedText>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="checkmark-circle-outline" size={20} color={Colors.success} />
                      <ThemedText style={styles.statValue}>
                        {project.analytics.approvedSubmissions || 0}
                      </ThemedText>
                      <ThemedText style={styles.statLabel}>Approved</ThemedText>
                    </View>
                  </View>
                </View>
              )}

              {/* User Submission Status */}
              {userSubmission && (
                <View style={styles.submissionStatusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(userSubmission.status) }]}>
                    <Ionicons 
                      name={
                        userSubmission.status === 'approved' ? 'checkmark-circle' :
                        userSubmission.status === 'rejected' ? 'close-circle' :
                        userSubmission.status === 'under_review' ? 'time' :
                        'hourglass'
                      } 
                      size={16} 
                      color={Colors.text.inverse} 
                    />
                    <ThemedText style={styles.statusBadgeText}>
                      {getStatusLabel(userSubmission.status)}
                    </ThemedText>
                  </View>
                  {userSubmission.reviewComments && (
                    <View style={styles.reviewCommentsContainer}>
                      <ThemedText style={styles.reviewCommentsLabel}>Review Feedback:</ThemedText>
                      <ThemedText style={styles.reviewCommentsText}>
                        {userSubmission.reviewComments}
                      </ThemedText>
                    </View>
                  )}
                  {/* Only show quality score if submission has been reviewed (approved or rejected) and score is > 0 */}
                  {/* Do NOT show quality score for pending or under_review submissions */}
                  {(() => {
                    const shouldShow = (userSubmission.status === 'approved' || userSubmission.status === 'rejected') &&
                                      userSubmission.qualityScore !== undefined && 
                                      userSubmission.qualityScore !== null && 
                                      typeof userSubmission.qualityScore === 'number' &&
                                      userSubmission.qualityScore > 0;
                    return shouldShow ? (
                      <View style={styles.qualityScoreContainer}>
                        <ThemedText style={styles.qualityScoreLabel}>Quality Score:</ThemedText>
                        <ThemedText style={styles.qualityScoreText}>
                          {userSubmission.qualityScore}/10
                        </ThemedText>
                      </View>
                    ) : null;
                  })()}
                  {userSubmission.paidAmount && userSubmission.paidAmount > 0 && (
                    <View style={styles.paidAmountContainer}>
                      <Ionicons name="cash" size={16} color={Colors.success} />
                      <ThemedText style={styles.paidAmountText}>
                        Paid: {currencySymbol}{userSubmission.paidAmount}
                      </ThemedText>
                    </View>
                  )}
                </View>
              )}

              {/* Submission Form */}
              {showSubmissionForm ? (
                <ProjectSubmissionForm
                  project={project}
                  onSubmit={handleSubmitProject}
                  onCancel={() => {
                    setShowSubmissionForm(false);
                  }}
                  submitting={submitting}
                  existingSubmission={userSubmission ? {
                    content: userSubmission.content,
                    status: userSubmission.status } : undefined}
                />
              ) : (
                <View>
                  <Pressable
                    style={styles.submitButton}
                    onPress={() => {
                      if (!isAuthenticated) {
                        showAlert('Authentication Required', 'Please login to submit a project');
                        return;
                      }
                      // Allow opening form even if submission is pending (for editing)
                      // Only block if submission is approved
                      if (userSubmission && userSubmission.status === 'approved') {
                        showAlert('Submission Approved', 'Your submission has been approved. You cannot edit it.');
                        return;
                      }
                      setShowSubmissionForm(true);
                    }}
                    accessible={true}
                    accessibilityLabel={
                      userSubmission
                        ? userSubmission.status === 'approved' ? 'View Submission' :
                          userSubmission.status === 'rejected' ? 'Edit and Resubmit Project' :
                          'Edit Submission'
                        : 'Start Project'
                    }
                    accessibilityRole="button"
                    accessibilityHint={
                      userSubmission
                        ? userSubmission.status === 'approved' ? 'View your approved submission' :
                          userSubmission.status === 'rejected' ? 'Edit and resubmit your rejected submission' :
                          'Edit your pending submission'
                        : `Start working on ${project.title}`
                    }
                  >
                    <Ionicons 
                      name={
                        userSubmission 
                          ? userSubmission.status === 'approved' ? 'checkmark-circle' :
                            userSubmission.status === 'rejected' ? 'refresh' : 'time'
                          : 'send'
                      } 
                      size={20} 
                      color={Colors.text.inverse} 
                    />
                    <ThemedText style={styles.submitButtonText}>
                      {userSubmission 
                        ? userSubmission.status === 'approved' ? 'View Submission' :
                          userSubmission.status === 'rejected' ? 'Edit & Resubmit' :
                          userSubmission.status === 'under_review' ? 'Edit Submission' :
                          userSubmission.status === 'pending' ? 'Edit Submission' :
                          'Edit Submission'
                        : 'Start Project'
                      }
                    </ThemedText>
                  </Pressable>
                  {userSubmission && (
                    <Pressable
                      style={[styles.viewSubmissionButton, { marginTop: 12 }]}
                      onPress={() => {
                        router.push({
                          pathname: '/submission-detail',
                          params: {
                            submissionId: userSubmission._id,
                            projectId: projectId } } as any);
                      }}
                      accessible={true}
                      accessibilityLabel="View full submission details"
                      accessibilityRole="button"
                      accessibilityHint={`View complete details of your ${userSubmission.status} submission`}
                    >
                      <Ionicons name="eye-outline" size={18} color={Colors.brand.purple} />
                      <ThemedText style={styles.viewSubmissionButtonText}>
                        View Full Submission
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              )}
            </LinearGradient>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary },
  scrollView: {
    flex: 1 },
  scrollContent: {
    paddingBottom: 40 },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40 },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary },
  errorText: {
    marginTop: Spacing.base,
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.error },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5 },
  headerRight: {
    width: 40 },
  backButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.brand.purple,
    marginTop: Spacing.base },
  projectCard: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.strong },
  cardGradient: {
    padding: Spacing.lg },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base },
  projectTitle: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.text.primary,
    flex: 1,
    marginRight: Spacing.md },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md },
  featuredText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.warning,
    marginLeft: Spacing.xs },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    flexWrap: 'wrap' },
  difficultyBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md },
  difficultyText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    textTransform: 'capitalize' },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.base },
  metaText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginLeft: 6 },
  rewardText: {
    ...Typography.bodyLarge,
    fontWeight: '800',
    color: Colors.success,
    marginLeft: 6 },
  description: {
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
    lineHeight: 24,
    marginBottom: Spacing.xl },
  section: {
    marginBottom: Spacing.xl },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.md },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.brand.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md },
  instructionNumberText: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.text.inverse },
  instructionText: {
    flex: 1,
    ...Typography.body,
    fontSize: 15,
    color: Colors.text.secondary,
    lineHeight: 22 },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap' },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.indigoMist,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm },
  tagText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.brand.purple },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md },
  statItem: {
    alignItems: 'center' },
  statValue: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text.primary,
    marginTop: Spacing.sm },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs },
  submissionStatusContainer: {
    marginTop: Spacing.lg,
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    ...Shadows.medium },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    gap: 6,
    marginBottom: Spacing.md },
  statusBadgeText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse },
  reviewCommentsContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.sm },
  reviewCommentsLabel: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs },
  reviewCommentsText: {
    ...Typography.body,
    color: Colors.text.primary,
    lineHeight: 20 },
  qualityScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm },
  qualityScoreLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary },
  qualityScoreText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.brand.purple },
  paidAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.successScale[50],
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm },
  paidAmountText: {
    ...Typography.body,
    fontWeight: '700',
    color: colors.successScale[700] },
  submissionForm: {
    marginTop: Spacing.sm },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.brand.purple,
    gap: Spacing.sm },
  submitButtonDisabled: {
    opacity: 0.6 },
  submitButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse },
  viewSubmissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.indigoMist,
    gap: Spacing.sm },
  viewSubmissionButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.brand.purple } });


export default withErrorBoundary(ProjectDetailPage, 'ProjectDetail');
