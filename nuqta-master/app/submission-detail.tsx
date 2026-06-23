import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
  Linking
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/apiClient';
import { useAuthUser, useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { showAlert } from '@/utils/alert';
import { DetailPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { catchAndWarn } from '@/utils/catchAndReport';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  category: string;
  reward: {
    amount: number;
    currency: string;
  };
}

function SubmissionDetailPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const submissionId = params.submissionId as string;
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [submission, setSubmission] = useState<ProjectSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));
  const isMounted = useIsMounted();

  // Hide the default navigation header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadSubmission();
  }, [submissionId, projectId, isAuthenticated, authLoading]);

  // Deep-link parameter validation guard
  if (!submissionId || typeof submissionId !== 'string') {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
    return null;
  }

  const loadSubmission = async () => {
    try {
      setLoading(true);
      
      // Fetch project with submissions
      const response = await apiClient.get<{ project: Project & { submissions?: ProjectSubmission[] } }>(
        `/projects/${projectId}`
      );

      if (response.success && response.data) {
        const projectData = response.data.project || response.data as any;
        if (!isMounted()) return;
        setProject(projectData);

        // Find the specific submission
        if (projectData.submissions) {
          const foundSubmission = projectData.submissions.find(
            (sub: ProjectSubmission) => sub._id === submissionId
          );
          
          if (foundSubmission) {
            if (!isMounted()) return;
            setSubmission(foundSubmission);
            
            fadeAnim.value = withTiming(1, { duration: 500 });
            slideAnim.value = withTiming(0, { duration: 500 });
          } else {
            showAlert('Error', 'Submission not found');
            router.canGoBack() ? router.back() : router.replace('/(tabs)');
          }
        } else {
          showAlert('Error', 'Submission not found');
          router.canGoBack() ? router.back() : router.replace('/(tabs)');
        }
      } else {
        throw new Error('Failed to load submission');
      }
    } catch (error) {
      showAlert('Error', 'Failed to load submission details');
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return colors.successScale[400];
      case 'rejected':
        return colors.error;
      case 'under_review':
        return colors.warningScale[400];
      case 'pending':
      default:
        return colors.neutral[500];
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  };

  const renderContent = () => {
    if (!submission) return null;

    const { content } = submission;

    switch (content.type) {
      case 'text':
        return (
          <View style={styles.contentContainer}>
            <ThemedText style={styles.contentLabel}>Submission Content</ThemedText>
            <View style={styles.textContentContainer}>
              <ThemedText style={styles.textContent}>
                {typeof content.data === 'string' ? content.data : content.data.join('\n')}
              </ThemedText>
            </View>
            {content.metadata?.wordCount && (
              <ThemedText style={styles.metadataText}>
                Word count: {content.metadata.wordCount}
              </ThemedText>
            )}
          </View>
        );

      case 'image':
        const imageUrls = Array.isArray(content.data) ? content.data : [content.data];
        return (
          <View style={styles.contentContainer}>
            <ThemedText style={styles.contentLabel}>Submitted Photos ({imageUrls.length})</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
              {imageUrls.map((url, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <CachedImage source={url} style={styles.submissionImage} contentFit="cover" />
                </View>
              ))}
            </ScrollView>
            {content.metadata?.imageCount && (
              <ThemedText style={styles.metadataText}>
                {content.metadata.imageCount} photo(s) submitted
              </ThemedText>
            )}
          </View>
        );

      case 'video':
        const videoUrl = typeof content.data === 'string' ? content.data : content.data[0];
        return (
          <View style={styles.contentContainer}>
            <ThemedText style={styles.contentLabel}>Submitted Video</ThemedText>
            <View style={styles.videoContainer}>
              <CachedImage 
                source={content.metadata?.uploadedVideo?.thumbnailUrl || videoUrl} 
                style={styles.videoThumbnail} 
                contentFit="cover"
              />
              <Pressable
                style={styles.playButton}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.open(videoUrl, '_blank');
                  } else {
                    try { Linking.openURL(videoUrl); } catch (e) { catchAndWarn(e, 'SubmissionDetail/openURL'); }
                  }
                }}
              >
                <Ionicons name="play-circle" size={60} color={colors.background.primary} />
              </Pressable>
            </View>
            {content.metadata?.uploadedVideo?.duration && (
              <ThemedText style={styles.metadataText}>
                Duration: {content.metadata.uploadedVideo.duration}s
              </ThemedText>
            )}
          </View>
        );

      case 'rating':
        const rating = parseInt(typeof content.data === 'string' ? content.data : content.data[0] || '0');
        return (
          <View style={styles.contentContainer}>
            <ThemedText style={styles.contentLabel}>Rating</ThemedText>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? colors.warningScale[400] : colors.neutral[300]}
                />
              ))}
            </View>
            <ThemedText style={styles.ratingText}>{rating} out of 5 stars</ThemedText>
            {content.metadata?.rating && (
              <ThemedText style={styles.metadataText}>
                Additional comments available
              </ThemedText>
            )}
          </View>
        );

      case 'checkin':
        return (
          <View style={styles.contentContainer}>
            <ThemedText style={styles.contentLabel}>Check-In Details</ThemedText>
            {content.metadata?.location && (
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={20} color={colors.successScale[400]} />
                <ThemedText style={styles.locationText}>
                  {content.metadata.locationName || 
                   `${content.metadata.location[1].toFixed(4)}, ${content.metadata.location[0].toFixed(4)}`}
                </ThemedText>
              </View>
            )}
            {typeof content.data === 'string' && content.data.trim() && (
              <View style={styles.textContentContainer}>
                <ThemedText style={styles.textContent}>{content.data}</ThemedText>
              </View>
            )}
            {content.metadata?.uploadedImages && content.metadata.uploadedImages.length > 0 && (
              <View style={styles.checkinImagesContainer}>
                <ThemedText style={styles.contentLabel}>Check-In Photos</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
                  {content.metadata.uploadedImages.map((img: any, index: number) => (
                    <View key={index} style={styles.imageWrapper}>
                      <CachedImage source={img.url} style={styles.submissionImage} contentFit="cover" />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        );

      default:
        return (
          <View style={styles.contentContainer}>
            <ThemedText style={styles.contentLabel}>Submission Content</ThemedText>
            <ThemedText style={styles.textContent}>
              {typeof content.data === 'string' ? content.data : JSON.stringify(content.data)}
            </ThemedText>
          </View>
        );
    }
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (!submission || !project) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <ThemedText style={styles.errorText}>Submission not found</ThemedText>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <LinearGradient
            colors={[colors.brand.purpleLight, colors.brand.purple]}
            style={styles.backButtonGradient}
          >
            <Ionicons name="arrow-back" size={20} color={colors.background.primary} />
          </LinearGradient>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Submission Details</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            contentAnimStyle,
          ]}
        >
          {/* Status Badge */}
          <View style={styles.statusSection}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(submission.status) }]}>
              <Ionicons
                name={
                  submission.status === 'approved' ? 'checkmark-circle' :
                  submission.status === 'rejected' ? 'close-circle' :
                  submission.status === 'under_review' ? 'time' :
                  'hourglass'
                }
                size={20}
                color={colors.background.primary}
              />
              <ThemedText style={styles.statusBadgeText}>
                {getStatusLabel(submission.status)}
              </ThemedText>
            </View>
            <ThemedText style={styles.submittedDate}>
              Submitted {formatDate(submission.submittedAt)}
            </ThemedText>
          </View>

          {/* Project Info */}
          <View style={styles.projectInfoContainer}>
            <ThemedText style={styles.projectInfoLabel}>Project</ThemedText>
            <ThemedText style={styles.projectTitle}>{project.title}</ThemedText>
            <View style={styles.rewardContainer}>
              <Ionicons name="cash" size={16} color={colors.successScale[400]} />
              <ThemedText style={styles.rewardText}>
                Reward: {currencySymbol}{project.reward?.amount || 0}
              </ThemedText>
            </View>
          </View>

          {/* Submission Content */}
          {renderContent()}

          {/* Review Feedback */}
          {submission.reviewComments && (
            <View style={styles.reviewSection}>
              <ThemedText style={styles.sectionTitle}>Review Feedback</ThemedText>
              <View style={styles.reviewCommentsContainer}>
                <ThemedText style={styles.reviewCommentsText}>
                  {submission.reviewComments}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Quality Score */}
          {submission.qualityScore && (
            <View style={styles.qualitySection}>
              <ThemedText style={styles.sectionTitle}>Quality Score</ThemedText>
              <View style={styles.qualityScoreContainer}>
                <ThemedText style={styles.qualityScoreValue}>
                  {submission.qualityScore}/10
                </ThemedText>
                <View style={styles.qualityScoreBar}>
                  <View
                    style={[
                      styles.qualityScoreFill,
                      { width: `${(submission.qualityScore / 10) * 100}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Payment Info */}
          {submission.paidAmount && submission.paidAmount > 0 && (
            <View style={styles.paymentSection}>
              <ThemedText style={styles.sectionTitle}>Payment</ThemedText>
              <View style={styles.paymentContainer}>
                <Ionicons name="cash" size={24} color={colors.successScale[400]} />
                <View style={styles.paymentInfo}>
                  <ThemedText style={styles.paymentAmount}>
                    {currencySymbol}{submission.paidAmount}
                  </ThemedText>
                  {submission.paidAt && (
                    <ThemedText style={styles.paymentDate}>
                      Paid on {formatDate(submission.paidAt)}
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Rejection Reason */}
          {submission.status === 'rejected' && submission.rejectionReason && (
            <View style={styles.rejectionSection}>
              <ThemedText style={styles.sectionTitle}>Rejection Reason</ThemedText>
              <View style={styles.rejectionContainer}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <ThemedText style={styles.rejectionText}>
                  {submission.rejectionReason}
                </ThemedText>
              </View>
            </View>
          )}
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary },
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
    overflow: 'hidden' },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center' },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '800',
    color: Colors.text.primary },
  headerSpacer: {
    width: 40 },
  scrollView: {
    flex: 1 },
  scrollContent: {
    paddingBottom: 120 },
  content: {
    padding: Spacing.lg },
  statusSection: {
    marginBottom: Spacing.lg },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.sm },
  statusBadgeText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse },
  submittedDate: {
    ...Typography.body,
    color: Colors.text.tertiary },
  projectInfoContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.medium },
  projectInfoLabel: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5 },
  projectTitle: {
    ...Typography.h4,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.sm },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 },
  rewardText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.success },
  contentContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.medium },
  contentLabel: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5 },
  textContentContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.sm },
  textContent: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 24 },
  metadataText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm },
  imageScrollView: {
    marginVertical: Spacing.sm },
  imageWrapper: {
    marginRight: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden' },
  submissionImage: {
    width: SCREEN_WIDTH * 0.7,
    height: 300,
    backgroundColor: Colors.background.secondary },
  videoContainer: {
    position: 'relative',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm },
  videoThumbnail: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.background.secondary },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -30,
    marginLeft: -30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30 },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.base },
  ratingText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginTop: Spacing.sm },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.successScale[50],
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    marginBottom: Spacing.md },
  locationText: {
    ...Typography.body,
    color: colors.successScale[700],
    flex: 1 },
  checkinImagesContainer: {
    marginTop: Spacing.base },
  reviewSection: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.medium },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.md },
  reviewCommentsContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base },
  reviewCommentsText: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 24 },
  qualitySection: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.medium },
  qualityScoreContainer: {
    marginTop: Spacing.sm },
  qualityScoreValue: {
    ...Typography.display,
    color: Colors.brand.purple,
    marginBottom: Spacing.md },
  qualityScoreBar: {
    height: 8,
    backgroundColor: Colors.border.default,
    borderRadius: BorderRadius.xs,
    overflow: 'hidden' },
  qualityScoreFill: {
    height: '100%',
    backgroundColor: Colors.brand.purple,
    borderRadius: BorderRadius.xs },
  paymentSection: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.medium },
  paymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.successScale[50],
    borderRadius: BorderRadius.md,
    gap: Spacing.md },
  paymentInfo: {
    flex: 1 },
  paymentAmount: {
    ...Typography.h2,
    fontWeight: '800',
    color: colors.successScale[700],
    marginBottom: Spacing.xs },
  paymentDate: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary },
  rejectionSection: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.medium },
  rejectionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.base,
    backgroundColor: Colors.errorScale[50],
    borderRadius: BorderRadius.md,
    gap: Spacing.md },
  rejectionText: {
    flex: 1,
    ...Typography.body,
    fontSize: 15,
    color: '#991B1B',
    lineHeight: 22 },
  backButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.brand.purple,
    marginTop: Spacing.base } });



export default withErrorBoundary(SubmissionDetailPage, 'SubmissionDetail');
