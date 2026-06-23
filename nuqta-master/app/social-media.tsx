import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Social Media Page
// Earn cashback by sharing purchases on social media platforms

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  Linking,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import * as socialMediaApi from '@/services/socialMediaApi';
import { useAuthLoading, useAuthUser, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import ordersApi, { Order } from '@/services/ordersApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { catchAndWarn } from '@/utils/catchAndReport';
import { useIsMounted } from '@/hooks/useIsMounted';

interface SocialPost {
  id: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok';
  url: string;
  status: 'pending' | 'approved' | 'rejected' | 'credited';
  submittedAt: Date;
  cashbackAmount: number;
  thumbnailUrl?: string;
  orderNumber?: string;
}

interface EarningsData {
  totalEarned: number;
  pendingAmount: number;
  creditedAmount: number;
  postsSubmitted: number;
  approvalRate: number;
}

function SocialMediaPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const user = useAuthUser();
  const authLoading = useAuthLoading();
  const isAuthenticated = useIsAuthenticated();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [activeTab, setActiveTab] = useState<'earn' | 'history'>('earn');
  const [selectedPlatform, setSelectedPlatform] = useState<'instagram' | 'facebook' | 'twitter' | 'tiktok'>('instagram');
  const [postUrl, setPostUrl] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(params.orderId);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarned: 0,
    pendingAmount: 0,
    creditedAmount: 0,
    postsSubmitted: 0,
    approvalRate: 0,
  });
  const isMounted = useIsMounted();

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {

      return;
    }

    // Let AuthContext handle unauthenticated redirect
    if (!isAuthenticated || !user) return;

    loadData();
    loadCompletedOrders();
  }, [isAuthenticated, user, authLoading]);

  const loadCompletedOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await ordersApi.getOrders({ status: 'delivered' });

      // Filter for delivered/completed orders only
      const delivered = (response.data?.orders || []).filter((order: Order) =>
        order.status === 'delivered' || order.status === 'cancelled'
      );
      if (!isMounted()) return;
      setCompletedOrders(delivered);

    } catch (error: any) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoadingOrders(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Verify token is set (AuthContext manages token via apiClient.setAuthToken)
      const currentToken = apiClient.getAuthToken();
      if (!currentToken) {
        throw new Error('No authentication token available');
      }

      // Fetch earnings and posts from API
      const [earningsData, postsData] = await Promise.all([
        socialMediaApi.getUserEarnings(),
        socialMediaApi.getUserPosts({ page: 1, limit: 50 })
      ]);

      // Set earnings data
      if (!isMounted()) return;
      setEarnings({
        totalEarned: earningsData.totalEarned || 0,
        pendingAmount: earningsData.pendingAmount || 0,
        creditedAmount: earningsData.creditedAmount || 0,
        postsSubmitted: earningsData.postsSubmitted || 0,
        approvalRate: earningsData.approvalRate || 0,
      });

      // Transform and set posts data
      const transformedPosts: SocialPost[] = postsData.posts.map(post => ({
        id: post._id,
        platform: post.platform,
        url: post.postUrl,
        status: post.status,
        submittedAt: new Date(post.submittedAt),
        cashbackAmount: post.cashbackAmount,
        thumbnailUrl: post.metadata?.thumbnailUrl,
        orderNumber: post.metadata?.orderNumber,
      }));

      if (!isMounted()) return;
      setPosts(transformedPosts);

    } catch (error: any) {

      // Auth errors (401) are handled by apiClient's refresh flow + AuthContext guard
      if (error.response?.status === 401 || error.message?.includes('Access token')) {
        return;
      }

      // Show error alert
      const errorMessage = error.response?.data?.message || 'Failed to load social media data';
      platformAlertSimple('Error', errorMessage);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleSubmitPost = async () => {
    if (!postUrl.trim()) {
      platformAlertSimple('Error', 'Please enter a valid post URL');
      return;
    }

    setSubmitting(true);
    try {

      // Submit post to API with optional orderId
      const response = await socialMediaApi.submitPost({
        platform: selectedPlatform,
        postUrl: postUrl.trim(),
        ...(selectedOrderId && { orderId: selectedOrderId })
      });

      // Calculate cashback message
      const selectedOrder = completedOrders.find(o => o._id === selectedOrderId);
      const cashbackAmount = selectedOrder ? Math.round((selectedOrder.totals?.total || 0) * 0.05) : 0;

      let successMessage = `Your post has been submitted and will be reviewed within 24-48 hours.`;
      if (cashbackAmount > 0) {
        successMessage += `\n\nYou'll earn ${currencySymbol}${cashbackAmount} (5% cashback) once approved!`;
      }

      platformAlertSimple('Submitted for Review', successMessage);

      // Clear form and reload data
      if (!isMounted()) return;
      setPostUrl('');
      if (!isMounted()) return;
      setSelectedOrderId(undefined);
      loadData();

    } catch (error: any) {

      platformAlertSimple('Error', 'Failed to submit post. Please try again.');
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  const platforms = [
    { id: 'instagram' as const, name: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
    { id: 'facebook' as const, name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
    { id: 'twitter' as const, name: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
    { id: 'tiktok' as const, name: 'TikTok', icon: 'musical-notes', color: '#000000' },
  ];

  const getStatusColor = (status: SocialPost['status']) => {
    switch (status) {
      case 'approved': return Colors.success;
      case 'pending': return Colors.warning;
      case 'rejected': return Colors.error;
      case 'credited': return colors.brand.green;
      default: return Colors.text.tertiary;
    }
  };

  const getStatusText = (status: SocialPost['status']) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Under Review';
      case 'rejected': return 'Rejected';
      case 'credited': return 'Credited';
      default: return 'Unknown';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.brand.green} />

        {/* Header */}
        <LinearGradient colors={[colors.brand.green, colors.brand.teal]} style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Returns to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>Social Media Earnings</Text>
          <Pressable
            style={styles.infoButton}
            accessibilityLabel="Information"
            accessibilityRole="button"
            accessibilityHint="View information about social media earnings"
          >
            <Ionicons name="information-circle-outline" size={24} color="white" />
          </Pressable>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'earn' && styles.activeTab]}
            onPress={() => setActiveTab('earn')}
            accessibilityLabel="Earn Cashback tab"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'earn' }}
            accessibilityHint="View how to earn cashback by sharing on social media"
          >
            <Text style={[styles.tabText, activeTab === 'earn' && styles.activeTabText]}>
              Earn Cashback
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
            accessibilityLabel="History tab"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'history' }}
            accessibilityHint="View your submission history and earnings"
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              History
            </Text>
          </Pressable>
        </View>

        <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
          {activeTab === 'earn' ? (
            <>
              {/* Earnings Summary */}
              <View style={styles.summaryCard}>
                <LinearGradient
                  colors={[colors.brand.green, colors.brand.teal]}
                  style={styles.summaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryTitle}>Total Earned</Text>
                    <View style={styles.badge}>
                      <Ionicons name="trending-up" size={16} color="white" />
                    </View>
                  </View>
                  <Text style={styles.summaryAmount}>{currencySymbol}{earnings.totalEarned}</Text>
                  <View style={styles.summaryStats}>
                    <View style={styles.stat}>
                      <Text style={styles.statLabel}>Pending</Text>
                      <Text style={styles.statValue}>{currencySymbol}{earnings.pendingAmount}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                      <Text style={styles.statLabel}>Credited</Text>
                      <Text style={styles.statValue}>{currencySymbol}{earnings.creditedAmount}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* How it Works */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>How It Works</Text>
                <View style={styles.stepsContainer}>
                  <View style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Make a Purchase</Text>
                      <Text style={styles.stepDescription}>
                        Buy any product from our stores
                      </Text>
                    </View>
                  </View>

                  <View style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Share on Social Media</Text>
                      <Text style={styles.stepDescription}>
                        Post about your purchase on Instagram, Facebook, or Twitter
                      </Text>
                    </View>
                  </View>

                  <View style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Submit Your Post</Text>
                      <Text style={styles.stepDescription}>
                        Copy and paste the post URL below
                      </Text>
                    </View>
                  </View>

                  <View style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>4</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Get Cashback</Text>
                      <Text style={styles.stepDescription}>
                        Earn 5% cashback credited to your wallet within 48 hours
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Order Selection (Optional) */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Link to Order (Optional)</Text>
                  {selectedOrderId && (
                    <Text style={styles.cashbackBadge}>+5% Cashback!</Text>
                  )}
                </View>
                <Text style={styles.sectionDescription}>
                  Select a completed order to earn 5% cashback when your post is approved
                </Text>

                {loadingOrders ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.brand.green} />
                    <Text style={styles.loadingText}>Loading orders...</Text>
                  </View>
                ) : completedOrders.length > 0 ? (
                  <View style={styles.orderDropdown}>
                    <Pressable
                      style={styles.orderSelectButton}
                      onPress={() => setSelectedOrderId(undefined)}
                    >
                      <View style={styles.orderOption}>
                        <Ionicons
                          name={selectedOrderId ? "radio-button-off" : "radio-button-on"}
                          size={20}
                          color={selectedOrderId ? colors.neutral[400] : colors.brand.green}
                        />
                        <Text style={[styles.orderText, !selectedOrderId && styles.orderTextActive]}>
                          No order ({currencySymbol}0 cashback)
                        </Text>
                      </View>
                    </Pressable>

                    {completedOrders.map((order) => (
                      <Pressable
                        key={order._id}
                        style={styles.orderSelectButton}
                        onPress={() => setSelectedOrderId(order._id)}
                      >
                        <View style={styles.orderOption}>
                          <Ionicons
                            name={selectedOrderId === order._id ? "radio-button-on" : "radio-button-off"}
                            size={20}
                            color={selectedOrderId === order._id ? colors.brand.green : colors.neutral[400]}
                          />
                          <View style={styles.orderInfo}>
                            <Text style={[styles.orderText, selectedOrderId === order._id && styles.orderTextActive]}>
                              Order #{order.orderNumber}
                            </Text>
                            <Text style={styles.orderAmount}>
                              {currencySymbol}{order.totals?.total || 0} • Earn {currencySymbol}{Math.round((order.totals?.total || 0) * 0.05)}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noOrdersContainer}>
                    <Ionicons name="receipt-outline" size={40} color={Colors.text.tertiary} />
                    <Text style={styles.noOrdersText}>No completed orders yet</Text>
                    <Text style={styles.noOrdersSubtext}>Complete an order first to earn cashback!</Text>
                  </View>
                )}
              </View>

              {/* Platform Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Platform</Text>
                <View style={styles.platformsContainer}>
                  {platforms.map((platform) => (
                    <Pressable
                      key={platform.id}
                      style={[
                        styles.platformButton,
                        selectedPlatform === platform.id && styles.platformButtonActive
                      ]}
                      onPress={() => setSelectedPlatform(platform.id)}
                      accessibilityLabel={`Select ${platform.name}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: selectedPlatform === platform.id }}
                      accessibilityHint={`Choose ${platform.name} as your social media platform`}
                    >
                      <Ionicons
                        name={platform.icon as any}
                        size={24}
                        color={selectedPlatform === platform.id ? platform.color : colors.neutral[500]}
                      />
                      <Text
                        style={[
                          styles.platformName,
                          selectedPlatform === platform.id && { color: platform.color }
                        ]}
                      >
                        {platform.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Submit Post */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Submit Your Post</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="link" size={20} color={Colors.text.tertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={`Paste your ${selectedPlatform} post URL here`}
                    placeholderTextColor={colors.neutral[400]}
                    value={postUrl}
                    onChangeText={setPostUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {postUrl.length > 0 && (
                    <Pressable
                      onPress={() => setPostUrl('')}
                      accessibilityLabel="Clear URL"
                      accessibilityRole="button"
                      accessibilityHint="Clears the entered post URL"
                    >
                      <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
                    </Pressable>
                  )}
                </View>

                <Pressable
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmitPost}
                  disabled={submitting}
                  accessibilityLabel={submitting ? "Submitting post" : "Submit post for verification"}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: submitting, busy: submitting }}
                  accessibilityHint="Submits your social media post URL for cashback approval"
                >
                  {submitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                      <Text style={styles.submitButtonText}>Submit for Verification</Text>
                    </>
                  )}
                </Pressable>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={16} color={colors.brand.green} />
                  <Text style={styles.infoText}>
                    Your post will be reviewed within 48 hours. Cashback will be credited upon approval.
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              {/* History Tab */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>{earnings.postsSubmitted}</Text>
                  <Text style={styles.statCardLabel}>Posts Submitted</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>{earnings.approvalRate}%</Text>
                  <Text style={styles.statCardLabel}>Approval Rate</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Submission History</Text>
                {loading ? (
                  <CardGridSkeleton />
                ) : posts.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={64} color={Colors.border.default} />
                    <Text style={styles.emptyTitle}>No Submissions Yet</Text>
                    <Text style={styles.emptyText}>
                      Start earning by sharing your purchases on social media!
                    </Text>
                    <Pressable
                      style={styles.emptyButton}
                      onPress={() => setActiveTab('earn')}
                      accessibilityLabel="Submit your first post"
                      accessibilityRole="button"
                      accessibilityHint="Opens the earn tab to submit your first social media post"
                    >
                      <Text style={styles.emptyButtonText}>Submit Your First Post</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.postsContainer}>
                    {posts.map((post) => (
                      <View key={post.id} style={styles.postCard}>
                        <View style={styles.postHeader}>
                          <View style={styles.postPlatform}>
                            <Ionicons
                              name={
                                post.platform === 'instagram' ? 'logo-instagram' :
                                post.platform === 'facebook' ? 'logo-facebook' :
                                post.platform === 'twitter' ? 'logo-twitter' :
                                'musical-notes'
                              }
                              size={20}
                              color={
                                post.platform === 'instagram' ? '#E4405F' :
                                post.platform === 'facebook' ? '#1877F2' :
                                post.platform === 'twitter' ? '#1DA1F2' :
                                '#000000'
                              }
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
                          >
                            <Text style={[styles.postStatusText, { color: getStatusColor(post.status) }]}>
                              {getStatusText(post.status)}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.postDate}>{formatDate(post.submittedAt)}</Text>
                        {post.orderNumber && (
                          <Text style={styles.postOrderNumber}>Order: {post.orderNumber}</Text>
                        )}

                        <View style={styles.postFooter}>
                          <View style={styles.postCashback}>
                            <Ionicons name="cash" size={16} color={Colors.success} />
                            <Text style={styles.postCashbackAmount}>{currencySymbol}{post.cashbackAmount}</Text>
                          </View>
                          <Pressable
                            onPress={() => { try { Linking.openURL(post.url); } catch (e) { catchAndWarn(e, 'SocialMedia/openURL'); } }}
                            style={styles.postLink}
                            accessibilityLabel={`View ${post.platform} post`}
                            accessibilityRole="link"
                            accessibilityHint="Opens your social media post in browser"
                          >
                            <Text style={styles.postLinkText}>View Post</Text>
                            <Ionicons name="open-outline" size={14} color={colors.brand.green} />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
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
    ...Platform.select({
      ios: {
        paddingTop: 50,
      },
      android: {
        paddingTop: StatusBar.currentHeight || 16,
      },
      web: {
        paddingTop: Spacing.base,
      },
    }),
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  infoButton: {
    padding: Spacing.sm,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.brand.green,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  activeTabText: {
    color: colors.brand.green,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    margin: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryGradient: {
    padding: Spacing.xl,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.md,
    padding: 6,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.lg,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.xs,
  },
  statValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  section: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cashbackBadge: {
    backgroundColor: Colors.success,
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '700',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  sectionDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.base,
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
  },
  loadingText: {
    marginLeft: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  orderDropdown: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
  orderSelectButton: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  orderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
  },
  orderInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  orderText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: Spacing.xs,
  },
  orderTextActive: {
    color: colors.brand.green,
  },
  orderAmount: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '600',
  },
  noOrdersContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
  },
  noOrdersText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: colors.neutral[700],
    marginTop: Spacing.md,
  },
  noOrdersSubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  stepsContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
  },
  step: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.brand.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  stepNumberText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  stepDescription: {
    fontSize: 13,
    color: Colors.text.tertiary,
    lineHeight: 18,
  },
  platformsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  platformButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border.default,
  },
  platformButtonActive: {
    borderColor: colors.brand.green,
    backgroundColor: '#E6F7F1',
  },
  platformName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.base,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: colors.brand.green,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E6F7F1',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.tertiary,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    marginTop: Spacing.base,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
  },
  statCardValue: {
    ...Typography.h2,
    fontWeight: '700',
    color: colors.brand.green,
    marginBottom: Spacing.xs,
  },
  statCardLabel: {
    fontSize: 13,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  historyLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    ...Typography.h4,
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
    paddingHorizontal: 40,
  },
  emptyButton: {
    backgroundColor: colors.brand.green,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  emptyButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  postsContainer: {
    gap: Spacing.md,
  },
  postCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  postPlatform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  postPlatformName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  postStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  postStatusText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  postDate: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  postOrderNumber: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.background.secondary,
  },
  postCashback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postCashbackAmount: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.success,
  },
  postLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.green,
  },
});

export default withErrorBoundary(SocialMediaPage, 'SocialMedia');
