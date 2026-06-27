// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Admin Dashboard - Social Media Posts Review
// Allows admins to approve, reject, and credit social media posts

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import apiClient from '@/services/apiClient';
import { useAuthUser, useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { catchAndWarn } from '@/utils/catchAndReport';
import { useIsMounted } from '@/hooks/useIsMounted';

interface SocialPost {
  _id: string;
  user: { _id: string; name: string; email: string };
  order?: { _id: string; orderNumber: string; totals: { total: number } };
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok';
  postUrl: string;
  status: 'pending' | 'approved' | 'rejected' | 'credited';
  cashbackAmount: number;
  submittedAt: string;
  reviewedAt?: string;
  creditedAt?: string;
  rejectionReason?: string;
  submissionIp?: string;
  deviceFingerprint?: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  credited: number;
}

function AdminSocialMediaPosts() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    credited: 0,
  });
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'credited'>('pending');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    loadPosts(1);
  }, [isAuthenticated, authLoading, selectedStatus]);

  const loadPosts = async (pageNum = 1) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const params: any = { limit: 20, page: pageNum };
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }

      const response = await apiClient.get('/social-media/posts', params);
      const postsData = (response.data as any)?.posts || [];
      const pagination = (response.data as any)?.pagination;

      // Use pagination metadata from backend for stats if on first page
      if (pageNum === 1 && (response.data as any)?.stats) {
        const s = (response.data as any).stats;
        if (!isMounted()) return;
        setStats({
          total: s.total || 0,
          pending: s.pending || 0,
          approved: s.approved || 0,
          rejected: s.rejected || 0,
          credited: s.credited || 0,
        });
      } else if (pageNum === 1) {
        // Fetch stats with a lightweight count-only request
        try {
          const statsResp = await apiClient.get('/social-media/posts', { limit: 1, page: 1 });
          const p = (statsResp.data as any)?.pagination;
          if (p?.totalItems) {
            // If backend provides status counts in pagination, use them
            // Otherwise leave stats from response.data.stats
          }
        } catch {}
      }

      if (pageNum === 1) {
        if (!isMounted()) return;
        setPosts(postsData);
      } else {
        if (!isMounted()) return;
        setPosts(prev => [...prev, ...postsData]);
      }

      if (!isMounted()) return;
      setPage(pageNum);
      if (!isMounted()) return;
      setHasMore(pagination?.hasNextPage ?? postsData.length >= 20);

    } catch (error: any) {
      platformAlertSimple('Error', 'Failed to load posts. ' + (error.response?.data?.message || error.message));
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadPosts(page + 1);
    }
  };

  const handleApprove = async (postId: string) => {
    setActionLoading(postId);
    try {

      await apiClient.patch(`/social-media/posts/${postId}/status`, {
        status: 'approved'
      });

      platformAlertConfirm('Success', 'Post approved successfully!', loadPosts, 'OK');
    } catch (error: any) {
      platformAlertSimple('Error', 'Failed to approve post. ' + (error.response?.data?.message || error.message));
    } finally {
      if (!isMounted()) return;
      setActionLoading(null);
    }
  };

  const handleReject = (post: SocialPost) => {
    setSelectedPost(post);
    setRejectionModalVisible(true);
  };

  const submitRejection = async () => {
    if (!selectedPost) return;

    if (!rejectionReason.trim()) {
      platformAlertSimple('Error', 'Please provide a rejection reason');
      return;
    }

    setActionLoading(selectedPost._id);
    try {

      await apiClient.patch(`/social-media/posts/${selectedPost._id}/status`, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim()
      });

      if (!isMounted()) return;
      setRejectionModalVisible(false);
      if (!isMounted()) return;
      setRejectionReason('');
      if (!isMounted()) return;
      setSelectedPost(null);

      platformAlertConfirm('Success', 'Post rejected successfully!', loadPosts, 'OK');
    } catch (error: any) {
      platformAlertSimple('Error', 'Failed to reject post. ' + (error.response?.data?.message || error.message));
    } finally {
      if (!isMounted()) return;
      setActionLoading(null);
    }
  };

  const handleCredit = async (postId: string, cashbackAmount: number) => {
    platformAlertConfirm(
      'Credit Cashback',
      `Credit ${currencySymbol}${cashbackAmount} cashback to user's wallet?`,
      async () => {
        setActionLoading(postId);
        try {

          await apiClient.patch(`/social-media/posts/${postId}/status`, {
            status: 'credited'
          });

          platformAlertConfirm('Success', `${currencySymbol}${cashbackAmount} credited successfully!`, loadPosts, 'OK');
        } catch (error: any) {
          platformAlertSimple('Error', 'Failed to credit cashback. ' + (error.response?.data?.message || error.message));
        } finally {
          if (!isMounted()) return;
          setActionLoading(null);
        }
      },
      'Credit'
    );
  };

  const getStatusColor = (status: SocialPost['status']) => {
    switch (status) {
      case 'approved': return Colors.success;
      case 'pending': return Colors.warning;
      case 'rejected': return Colors.error;
      case 'credited': return Colors.brand.purple;
      default: return Colors.text.tertiary;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return 'logo-instagram';
      case 'facebook': return 'logo-facebook';
      case 'twitter': return 'logo-twitter';
      case 'tiktok': return 'musical-notes';
      default: return 'link';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'instagram': return '#E4405F';
      case 'facebook': return '#1877F2';
      case 'twitter': return '#1DA1F2';
      case 'tiktok': return '#000000';
      default: return colors.neutral[500];
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.brand.purpleLight, Colors.brand.purple]}
        style={styles.header}
        accessibilityRole="header"
        accessibilityLabel="Admin Social Media Posts Dashboard"
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Returns to previous screen"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Social Media Posts</Text>
        <Pressable
          style={styles.refreshButton}
          onPress={loadPosts}
          accessibilityLabel="Refresh posts"
          accessibilityRole="button"
          accessibilityHint="Double tap to reload all social media posts"
        >
          <Ionicons name="refresh" size={24} color="white" />
        </Pressable>
      </LinearGradient>

      {/* Stats */}
      <View
        style={styles.statsContainer}
        accessibilityRole="summary"
        accessibilityLabel={`Post statistics: ${stats.total} total, ${stats.pending} pending, ${stats.approved} approved, ${stats.credited} credited, ${stats.rejected} rejected`}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityLabel="Filter posts by status"
        >
          <Pressable
            style={[styles.statCard, selectedStatus === 'all' && styles.statCardActive]}
            onPress={() => setSelectedStatus('all')}
            accessibilityRole="button"
            accessibilityLabel={`All posts: ${stats.total}`}
            accessibilityHint="Double tap to show all posts"
            accessibilityState={{ selected: selectedStatus === 'all' }}
          >
            <Text style={[styles.statValue, selectedStatus === 'all' && styles.statValueActive]}>
              {stats.total}
            </Text>
            <Text style={[styles.statLabel, selectedStatus === 'all' && styles.statLabelActive]}>
              Total
            </Text>
          </Pressable>

          <Pressable
            style={[styles.statCard, selectedStatus === 'pending' && styles.statCardActive]}
            onPress={() => setSelectedStatus('pending')}
            accessibilityRole="button"
            accessibilityLabel={`Pending posts: ${stats.pending}`}
            accessibilityHint="Double tap to show pending posts requiring review"
            accessibilityState={{ selected: selectedStatus === 'pending' }}
          >
            <Text style={[styles.statValue, selectedStatus === 'pending' && styles.statValueActive]}>
              {stats.pending}
            </Text>
            <Text style={[styles.statLabel, selectedStatus === 'pending' && styles.statLabelActive]}>
              Pending
            </Text>
          </Pressable>

          <Pressable
            style={[styles.statCard, selectedStatus === 'approved' && styles.statCardActive]}
            onPress={() => setSelectedStatus('approved')}
            accessibilityRole="button"
            accessibilityLabel={`Approved posts: ${stats.approved}`}
            accessibilityHint="Double tap to show approved posts awaiting credit"
            accessibilityState={{ selected: selectedStatus === 'approved' }}
          >
            <Text style={[styles.statValue, selectedStatus === 'approved' && styles.statValueActive]}>
              {stats.approved}
            </Text>
            <Text style={[styles.statLabel, selectedStatus === 'approved' && styles.statLabelActive]}>
              Approved
            </Text>
          </Pressable>

          <Pressable
            style={[styles.statCard, selectedStatus === 'credited' && styles.statCardActive]}
            onPress={() => setSelectedStatus('credited')}
            accessibilityRole="button"
            accessibilityLabel={`Credited posts: ${stats.credited}`}
            accessibilityHint="Double tap to show posts with credited cashback"
            accessibilityState={{ selected: selectedStatus === 'credited' }}
          >
            <Text style={[styles.statValue, selectedStatus === 'credited' && styles.statValueActive]}>
              {stats.credited}
            </Text>
            <Text style={[styles.statLabel, selectedStatus === 'credited' && styles.statLabelActive]}>
              Credited
            </Text>
          </Pressable>

          <Pressable
            style={[styles.statCard, selectedStatus === 'rejected' && styles.statCardActive]}
            onPress={() => setSelectedStatus('rejected')}
            accessibilityRole="button"
            accessibilityLabel={`Rejected posts: ${stats.rejected}`}
            accessibilityHint="Double tap to show rejected posts"
            accessibilityState={{ selected: selectedStatus === 'rejected' }}
          >
            <Text style={[styles.statValue, selectedStatus === 'rejected' && styles.statValueActive]}>
              {stats.rejected}
            </Text>
            <Text style={[styles.statLabel, selectedStatus === 'rejected' && styles.statLabelActive]}>
              Rejected
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Posts List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        accessibilityLabel={`${posts.length} ${selectedStatus} social media posts`}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 50) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {loading ? (
          <View
            style={styles.loadingContainer}
            accessibilityLabel="Loading posts"
            accessibilityRole="progressbar"
          >
            <ActivityIndicator size="large" color={Colors.brand.purple} />
            <Text style={styles.loadingText}>Loading posts...</Text>
          </View>
        ) : posts.length === 0 ? (
          <View
            style={styles.emptyContainer}
            accessibilityRole="text"
            accessibilityLabel={selectedStatus === 'all' ? 'No submissions yet' : `No ${selectedStatus} posts found`}
          >
            <Ionicons name="document-text-outline" size={64} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No Posts Found</Text>
            <Text style={styles.emptyText}>
              {selectedStatus === 'all' ? 'No submissions yet' : `No ${selectedStatus} posts`}
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <View
              key={post._id}
              style={styles.postCard}
              accessibilityRole="summary"
              accessibilityLabel={`${post.platform} post from ${post.user.name}, status: ${post.status}, cashback: ${post.cashbackAmount} rupees`}
            >
              {/* Post Header */}
              <View
                style={styles.postHeader}
                accessibilityRole="header"
              >
                <View
                  style={styles.postPlatform}
                  accessibilityLabel={`Platform: ${post.platform}`}
                >
                  <Ionicons
                    name={getPlatformIcon(post.platform) as any}
                    size={20}
                    color={getPlatformColor(post.platform)}
                  />
                  <Text style={styles.postPlatformName}>
                    {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.postStatus,
                    { backgroundColor: getStatusColor(post.status) + '20' }
                  ]}
                  accessibilityRole="text"
                  accessibilityLabel={`Status: ${post.status}`}
                >
                  <Text style={[styles.postStatusText, { color: getStatusColor(post.status) }]}>
                    {post.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* User Info */}
              <View
                style={styles.userInfo}
                accessibilityRole="text"
                accessibilityLabel={`User: ${post.user.name}, Email: ${post.user.email}`}
              >
                <Ionicons name="person-circle" size={20} color={Colors.text.tertiary} />
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{post.user.name}</Text>
                  <Text style={styles.userEmail}>{post.user.email}</Text>
                </View>
              </View>

              {/* Order Info */}
              {post.order && (
                <View
                  style={styles.orderInfo}
                  accessibilityRole="text"
                  accessibilityLabel={`Order number ${post.order.orderNumber}, total amount ${post.order.totals.total} rupees`}
                >
                  <Ionicons name="receipt" size={16} color={Colors.brand.purple} />
                  <Text style={styles.orderText}>
                    Order #{post.order.orderNumber} • {currencySymbol}{post.order.totals.total}
                  </Text>
                </View>
              )}

              {/* Post URL */}
              <Pressable
                style={styles.postUrlContainer}
                onPress={() => { try { Linking.openURL(post.postUrl); } catch (e) { catchAndWarn(e, 'SocialMediaPosts/openURL'); } }}
                accessibilityRole="link"
                accessibilityLabel={`Open post URL: ${post.postUrl}`}
                accessibilityHint="Double tap to open in browser"
              >
                <Ionicons name="link" size={16} color={Colors.text.tertiary} />
                <Text style={styles.postUrl} numberOfLines={1}>
                  {post.postUrl}
                </Text>
                <Ionicons name="open-outline" size={16} color={Colors.brand.purple} />
              </Pressable>

              {/* Metadata */}
              <View
                style={styles.metadata}
                accessibilityRole="summary"
                accessibilityLabel={`Submitted on ${formatDate(post.submittedAt)}, Cashback amount: ${post.cashbackAmount} rupees${post.submissionIp ? `, IP address: ${post.submissionIp}` : ''}`}
              >
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Submitted:</Text>
                  <Text style={styles.metaValue}>{formatDate(post.submittedAt)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Cashback:</Text>
                  <Text style={[styles.metaValue, { color: colors.successScale[400], fontWeight: '700' }]}>
                    {currencySymbol}{post.cashbackAmount}
                  </Text>
                </View>
                {post.submissionIp && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>IP:</Text>
                    <Text style={styles.metaValue}>{post.submissionIp}</Text>
                  </View>
                )}
              </View>

              {/* Rejection Reason */}
              {post.rejectionReason && (
                <View
                  style={styles.rejectionBox}
                  accessibilityRole="alert"
                  accessibilityLabel={`Rejection reason: ${post.rejectionReason}`}
                >
                  <Ionicons name="alert-circle" size={16} color={Colors.error} />
                  <Text style={styles.rejectionText}>{post.rejectionReason}</Text>
                </View>
              )}

              {/* Actions */}
              {post.status === 'pending' && (
                <View
                  style={styles.actions}
                  accessibilityRole="toolbar"
                  accessibilityLabel="Post review actions"
                >
                  <Pressable
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(post._id)}
                    disabled={actionLoading === post._id}
                    accessibilityRole="button"
                    accessibilityLabel={`Approve post from ${post.user.name}`}
                    accessibilityHint="Double tap to approve this social media post"
                    accessibilityState={{ disabled: actionLoading === post._id }}
                  >
                    {actionLoading === post._id ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="white" />
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(post)}
                    disabled={actionLoading === post._id}
                    accessibilityRole="button"
                    accessibilityLabel={`Reject post from ${post.user.name}`}
                    accessibilityHint="Double tap to reject this post with a reason"
                    accessibilityState={{ disabled: actionLoading === post._id }}
                  >
                    <Ionicons name="close-circle" size={18} color="white" />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </Pressable>
                </View>
              )}

              {post.status === 'approved' && (
                <View
                  style={styles.actions}
                  accessibilityRole="toolbar"
                  accessibilityLabel="Cashback credit action"
                >
                  <Pressable
                    style={[styles.actionButton, styles.creditButton]}
                    onPress={() => handleCredit(post._id, post.cashbackAmount)}
                    disabled={actionLoading === post._id}
                    accessibilityRole="button"
                    accessibilityLabel={`Credit ${post.cashbackAmount} rupees cashback to ${post.user.name}`}
                    accessibilityHint="Double tap to credit cashback to user's wallet. Requires confirmation"
                    accessibilityState={{ disabled: actionLoading === post._id }}
                  >
                    {actionLoading === post._id ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="cash" size={18} color="white" />
                        <Text style={styles.actionButtonText}>
                          Credit {currencySymbol}{post.cashbackAmount}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
        {loadingMore && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={Colors.brand.purple} />
          </View>
        )}
      </ScrollView>

      {/* Rejection Modal */}
      <Modal
        visible={rejectionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectionModalVisible(false)}
        accessibilityViewIsModal
        accessibilityLabel="Reject post modal"
      >
        <View
          style={styles.modalOverlay}
          accessibilityRole="none"
        >
          <View
            style={styles.modalContent}
            accessibilityRole="none"
            accessibilityLabel="Reject post form"
          >
            <View
              style={styles.modalHeader}
              accessibilityRole="header"
            >
              <Text style={styles.modalTitle}>Reject Post</Text>
              <Pressable
                onPress={() => setRejectionModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close rejection modal"
                accessibilityHint="Double tap to cancel and close this dialog"
              >
                <Ionicons name="close" size={24} color={Colors.text.tertiary} />
              </Pressable>
            </View>

            <Text
              style={styles.modalLabel}
              accessibilityRole="text"
            >
              Rejection Reason
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter reason for rejection..."
              placeholderTextColor={colors.neutral[400]}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Rejection reason input"
              accessibilityHint="Enter the reason why you are rejecting this post"
              accessibilityRole="none"
            />

            <Pressable
              style={[styles.modalButton, !rejectionReason.trim() && styles.modalButtonDisabled]}
              onPress={submitRejection}
              disabled={!rejectionReason.trim() || !!actionLoading}
              accessibilityRole="button"
              accessibilityLabel="Submit rejection"
              accessibilityHint="Double tap to reject the post with the provided reason"
              accessibilityState={{ disabled: !rejectionReason.trim() || !!actionLoading }}
            >
              {actionLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.modalButtonText}>Submit Rejection</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.text.inverse,
  },
  refreshButton: {
    padding: Spacing.sm,
  },
  statsContainer: {
    paddingVertical: Spacing.base,
    paddingLeft: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  statCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginRight: Spacing.md,
    minWidth: 80,
    alignItems: 'center',
  },
  statCardActive: {
    backgroundColor: Colors.brand.purple,
  },
  statValue: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  statValueActive: {
    color: Colors.text.inverse,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  statLabelActive: {
    color: Colors.text.inverse,
  },
  content: {
    flex: 1,
    padding: Spacing.base,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  postCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  postPlatform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  postPlatformName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  postStatus: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  postStatusText: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  userEmail: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tint.purpleLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  orderText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.brand.purple,
  },
  postUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  postUrl: {
    flex: 1,
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  metadata: {
    gap: 6,
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  metaValue: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  rejectionBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.errorScale[50],
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  rejectionText: {
    flex: 1,
    ...Typography.bodySmall,
    color: Colors.error,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  creditButton: {
    backgroundColor: Colors.brand.purple,
  },
  actionButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  modalLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  modalInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: Colors.text.primary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.lg,
  },
  modalButton: {
    backgroundColor: Colors.error,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(AdminSocialMediaPosts, 'AdminSocialMediaPosts');
