// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Text,
  RefreshControl,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { showAlert } from '@/components/common/CrossPlatformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useEarnFromSocialMedia } from '@/hooks/useEarnFromSocialMedia';
import EarnSocialData from '@/data/earnSocialData';
import ordersService, { Order } from '@/services/ordersApi';
import storePaymentApi from '@/services/storePaymentApi';
import socialMediaApi, { SocialPost, EarningsData } from '@/services/socialMediaApi';
import CashbackInfoModal from '@/components/earnings/CashbackInfoModal';
import CompletedOrderCard, { ShareableOrder } from '@/components/earnings/CompletedOrderCard';
// ImagePicker.ImagePickerAsset used as type — keep type-only import for that
import type { ImagePickerAsset } from 'expo-image-picker';
import { getImagePicker } from '@/utils/lazyImports';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

// Type for tracking submission status per order
interface OrderSubmissionMap {
  [orderId: string]: {
    status: 'pending' | 'approved' | 'rejected' | 'credited';
    postId: string;
  };
}

const { width } = Dimensions.get('window');

type PlatformType = 'instagram' | 'facebook' | 'twitter' | 'tiktok';
type SubmissionMode = 'url' | 'media';
type PageStep = 'orders_list' | 'platform_select' | 'url_input' | 'media_upload' | 'uploading' | 'success' | 'error';

interface SelectedOrderInfo {
  orderId: string;
  orderNumber: string;
  productName: string;
  productImage?: string;
  storeName: string;
  totalAmount: number;
  cashbackAmount: number;
}

const PLATFORM_CONFIG: Record<PlatformType, { label: string; icon: string; color: string; placeholder: string }> = {
  instagram: {
    label: 'Instagram',
    icon: 'logo-instagram',
    color: '#E1306C',
    placeholder: 'Paste Instagram post URL here...\ne.g. https://instagram.com/p/ABC123',
  },
  facebook: {
    label: 'Facebook',
    icon: 'logo-facebook',
    color: '#1877F2',
    placeholder: 'Paste Facebook post URL here...\ne.g. https://facebook.com/user/posts/123',
  },
  twitter: {
    label: 'X (Twitter)',
    icon: 'logo-twitter',
    color: '#1DA1F2',
    placeholder: 'Paste X/Twitter post URL here...\ne.g. https://x.com/user/status/123',
  },
  tiktok: {
    label: 'TikTok',
    icon: 'logo-tiktok',
    color: '#000000',
    placeholder: 'Paste TikTok video URL here...\ne.g. https://tiktok.com/@user/video/123',
  },
};

function EarnFromSocialMediaPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // State
  const [currentStep, setCurrentStep] = useState<PageStep>('orders_list');
  const [shareableOrders, setShareableOrders] = useState<ShareableOrder[]>([]);
  const [orderSubmissions, setOrderSubmissions] = useState<OrderSubmissionMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SelectedOrderInfo | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Earnings + submissions state
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [pastSubmissions, setPastSubmissions] = useState<SocialPost[]>([]);

  // New state for multi-platform + media
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('instagram');
  const [submissionMode, setSubmissionMode] = useState<SubmissionMode>('url');
  const [selectedMedia, setSelectedMedia] = useState<ImagePickerAsset[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // Extract product context from params (for direct product links)
  const productContext = {
    productId: params.productId as string | undefined,
    productName: params.productName as string | undefined,
    productPrice: params.productPrice ? parseFloat(params.productPrice as string) : undefined,
    productImage: params.productImage as string | undefined,
    storeId: params.storeId as string | undefined,
    storeName: params.storeName as string | undefined,
  };

  const { handlers } = useEarnFromSocialMedia(productContext.productId);

  // Normalize Order to ShareableOrder
  const normalizeOrder = (order: Order): ShareableOrder => {
    const firstItem = order.items?.[0];
    const storeObj = order.store && typeof order.store === 'object' ? order.store : null;
    const totalAmount = order.totals?.total || 0;
    const fulfillmentType = (order as any)?.fulfillmentType as string | undefined;

    // Map fulfillment type to ShareableOrder type and labels
    let type: ShareableOrder['type'] = 'delivery';
    let typeLabel = 'Delivery';
    let statusLabel = 'Delivered';

    if (fulfillmentType === 'dine_in') {
      type = 'dine_in';
      typeLabel = 'Dine In';
      statusLabel = 'Dined In';
    } else if (fulfillmentType === 'pickup') {
      type = 'pickup';
      typeLabel = 'Pickup';
      statusLabel = 'Picked Up';
    } else if (fulfillmentType === 'drive_thru') {
      type = 'drive_thru';
      typeLabel = 'Drive Thru';
      statusLabel = 'Completed';
    }

    return {
      id: order._id || order.id,
      orderNumber: order.orderNumber,
      type,
      typeLabel,
      storeName: storeObj?.name || firstItem?.product?.store?.name || 'Store',
      storeLogo: storeObj?.logo || firstItem?.product?.store?.logo,
      storeId: storeObj?._id || firstItem?.product?.store?.id,
      productName: firstItem?.product?.name || storeObj?.name || 'Order',
      productImage: firstItem?.product?.images?.[0]?.url || storeObj?.logo,
      totalAmount,
      cashbackAmount: Math.round(totalAmount * 0.05),
      statusLabel,
      createdAt: order.createdAt,
    };
  };

  // Fetch completed orders + store payments, submissions, and earnings
  const fetchCompletedOrders = useCallback(async () => {
    try {
      const [ordersResponse, paymentsResponse, postsResponse, earningsData] = await Promise.all([
        ordersService.getOrders({ status: 'delivered' }),
        storePaymentApi.getHistory({ limit: 50 }),
        socialMediaApi.getUserPosts({ limit: 100 }),
        socialMediaApi.getUserEarnings(),
      ]);

      if (!isMountedRef.current) return;
      setEarnings(earningsData);

      const items: ShareableOrder[] = [];

      // Normalize delivered orders
      if (ordersResponse.success && ordersResponse.data?.orders) {
        const deliveredOrders = ordersResponse.data.orders.filter(
          (order) => order.status === 'delivered'
        );
        deliveredOrders.forEach((order) => items.push(normalizeOrder(order)));
      }

      // Normalize completed store payments
      if (paymentsResponse.transactions && paymentsResponse.transactions.length > 0) {
        paymentsResponse.transactions.forEach((txn) => {
          if (txn.status === 'completed') {
            items.push({
              id: txn.paymentId || txn.id,
              orderNumber: txn.paymentId || txn.id,
              type: 'store_payment',
              typeLabel: 'Pay in Store',
              storeName: txn.storeName || 'Store',
              storeLogo: txn.storeLogo,
              storeId: txn.storeId,
              productName: txn.storeName || 'Pay in Store',
              productImage: txn.storeLogo,
              totalAmount: txn.amount || 0,
              cashbackAmount: Math.round((txn.amount || 0) * 0.05),
              statusLabel: 'Paid',
              createdAt: txn.createdAt,
            });
          }
        });
      }

      // Sort by date (newest first)
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setShareableOrders(items);

      // Build submissions map from existing social media posts
      // Map by both order ID and storePaymentId so cards can find their submission
      const submissionsMap: OrderSubmissionMap = {};
      if (postsResponse.posts && postsResponse.posts.length > 0) {
        postsResponse.posts.forEach((post: SocialPost) => {
          const entry = { status: post.status, postId: post._id };
          // Map by MongoDB order ID
          if (post.order) {
            submissionsMap[post.order] = entry;
          }
          // Map by StorePayment ID from metadata
          const spId = (post.metadata as any)?.storePaymentId;
          if (spId) {
            submissionsMap[spId] = entry;
          }
          // Also map by orderNumber from metadata (fallback for older posts)
          const orderNum = post.metadata?.orderNumber;
          if (orderNum && !submissionsMap[orderNum]) {
            submissionsMap[orderNum] = entry;
          }
        });
        setPastSubmissions(postsResponse.posts);
      }
      setOrderSubmissions(submissionsMap);
    } catch (err) {
      setShareableOrders([]);
      setOrderSubmissions({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCompletedOrders();
  }, [fetchCompletedOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCompletedOrders();
  }, [fetchCompletedOrders]);

  // Handle "Earn" button press on order card
  const handleEarnPress = (order: ShareableOrder) => {
    setSelectedOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      productName: order.productName,
      productImage: order.productImage || order.storeLogo,
      storeName: order.storeName,
      totalAmount: order.totalAmount,
      cashbackAmount: order.cashbackAmount,
    });
    setModalVisible(true);
  };

  // Handle "Upload" button press in modal -> go to platform select
  const handleUploadPress = () => {
    setModalVisible(false);
    setCurrentStep('platform_select');
  };

  // Handle platform selection continue
  const handlePlatformContinue = () => {
    if (submissionMode === 'url') {
      setCurrentStep('url_input');
    } else {
      setCurrentStep('media_upload');
    }
  };

  // Handle media picker
  const handlePickMedia = async () => {
    try {
      const ImagePicker = await getImagePicker();
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Please grant access to your photo library to upload media.', undefined, 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        selectionLimit: 5 - selectedMedia.length,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const total = [...selectedMedia, ...result.assets].slice(0, 5);
        setSelectedMedia(total);
      }
    } catch (err) {
      showAlert('Error', 'Failed to open gallery. Please try again.', undefined, 'error');
    }
  };

  // Remove a selected media item
  const handleRemoveMedia = (index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  // Handle URL submission
  const handleSubmitUrl = async () => {
    if (!urlInput.trim()) {
      showAlert('Error', `Please enter a ${PLATFORM_CONFIG[selectedPlatform].label} post URL`, undefined, 'error');
      return;
    }

    if (!selectedOrder?.orderId) {
      showAlert('Error', 'Please select an order first', undefined, 'error');
      return;
    }

    try {
      const { validators } = await import('@/services/socialMediaApi');

      const validation = validators.validatePostUrl(selectedPlatform, urlInput.trim());
      if (!validation.isValid) {
        showAlert('Invalid URL', validation.error || `Please enter a valid ${PLATFORM_CONFIG[selectedPlatform].label} post URL`, undefined, 'error');
        return;
      }

      setSubmitting(true);
      setCurrentStep('uploading');
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const response = await socialMediaApi.submitPost({
        platform: selectedPlatform,
        postUrl: urlInput.trim(),
        orderId: selectedOrder.orderId,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const postId = response?.post?.id || (response as any)?.id || 'unknown';
      setOrderSubmissions(prev => ({
        ...prev,
        [selectedOrder.orderId]: { status: 'pending', postId }
      }));

      setCurrentStep('success');
    } catch (err: any) {
      clearInterval(progressInterval);
      // If 409 (already submitted), treat as success — post already exists
      const msg = err.message || '';
      if (msg.includes('already been submitted') || msg.includes('already submitted')) {
        setOrderSubmissions(prev => ({
          ...prev,
          [selectedOrder.orderId]: { status: 'pending', postId: 'existing' }
        }));
        setCurrentStep('success');
      } else {
        setError(msg || 'Failed to submit post. Please try again.');
        setCurrentStep('error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle media submission
  const handleSubmitMedia = async () => {
    if (selectedMedia.length === 0) {
      showAlert('Error', 'Please select at least one photo or video', undefined, 'error');
      return;
    }

    if (!selectedOrder?.orderId) {
      showAlert('Error', 'Please select an order first', undefined, 'error');
      return;
    }

    try {
      setSubmitting(true);
      setCurrentStep('uploading');
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + 5;
        });
      }, 500);

      const files = selectedMedia.map((asset, index) => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
        name: `proof_${index}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
      }));

      const response = await socialMediaApi.submitPostWithMedia({
        platform: selectedPlatform,
        orderId: selectedOrder.orderId,
        files,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const postId = response?.post?.id || (response as any)?.id || 'unknown';
      setOrderSubmissions(prev => ({
        ...prev,
        [selectedOrder.orderId]: { status: 'pending', postId }
      }));

      setCurrentStep('success');
    } catch (err: any) {
      clearInterval(progressInterval);
      const msg = err.message || '';
      if (msg.includes('already been submitted') || msg.includes('already submitted')) {
        setOrderSubmissions(prev => ({
          ...prev,
          [selectedOrder.orderId]: { status: 'pending', postId: 'existing' }
        }));
        setCurrentStep('success');
      } else {
        setError(msg || 'Failed to upload media. Please try again.');
        setCurrentStep('error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle retry
  const handleRetry = () => {
    setError(null);
    setUrlInput('');
    setSelectedMedia([]);
    setCurrentStep('platform_select');
  };

  // Handle go back
  const handleGoBack = () => {
    if (currentStep === 'orders_list') {
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    } else if (currentStep === 'url_input' || currentStep === 'media_upload') {
      setCurrentStep('platform_select');
    } else if (currentStep === 'platform_select') {
      setCurrentStep('orders_list');
      setSelectedOrder(null);
    } else {
      setCurrentStep('orders_list');
      setSelectedOrder(null);
      setUrlInput('');
      setSelectedMedia([]);
      setError(null);
    }
  };

  // Render orders list
  const renderOrdersList = () => (
    <ScrollView
      style={styles.ordersContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.nileBlue]} />
      }
    >
      {/* Earnings Summary Card — only show if user has any activity */}
      {earnings && earnings.postsSubmitted > 0 && (
        <View style={styles.earningsSummaryCard}>
          <ThemedText style={styles.earningsSummaryTitle}>Your Social Earnings</ThemedText>
          <View style={styles.earningsRow}>
            <View style={styles.earningsStat}>
              <ThemedText style={styles.earningsStatValue}>{earnings.totalEarned}</ThemedText>
              <ThemedText style={styles.earningsStatLabel}>Total Earned</ThemedText>
            </View>
            <View style={styles.earningsStatDivider} />
            <View style={styles.earningsStat}>
              <ThemedText style={[styles.earningsStatValue, { color: colors.brand.amberDeep }]}>{earnings.pendingAmount}</ThemedText>
              <ThemedText style={styles.earningsStatLabel}>Pending</ThemedText>
            </View>
            <View style={styles.earningsStatDivider} />
            <View style={styles.earningsStat}>
              <ThemedText style={[styles.earningsStatValue, { color: '#047857' }]}>{earnings.creditedAmount}</ThemedText>
              <ThemedText style={styles.earningsStatLabel}>Credited</ThemedText>
            </View>
          </View>
          <View style={styles.earningsPostsRow}>
            <Ionicons name="document-text-outline" size={14} color={Colors.text.tertiary} />
            <ThemedText style={styles.earningsPostsText}>
              {earnings.postsSubmitted} post{earnings.postsSubmitted !== 1 ? 's' : ''} submitted
              {earnings.postsApproved > 0 ? ` · ${earnings.postsApproved} approved` : ''}
            </ThemedText>
          </View>
        </View>
      )}

      {/* How It Works */}
      <View style={styles.howItWorksCard}>
        <ThemedText style={styles.howItWorksTitle}>How It Works</ThemedText>
        <View style={styles.stepsRow}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, { backgroundColor: colors.tint.purple }]}>
              <Ionicons name="bag-check-outline" size={20} color={colors.brand.purpleDeep} />
            </View>
            <ThemedText style={styles.stepLabel}>Buy</ThemedText>
            <ThemedText style={styles.stepDesc}>Make a purchase</ThemedText>
          </View>
          <Ionicons name="arrow-forward" size={16} color={colors.neutral[300]} style={{ marginTop: 16 }} />
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, { backgroundColor: colors.tint.blueLight }]}>
              <Ionicons name="share-social-outline" size={20} color="#1D4ED8" />
            </View>
            <ThemedText style={styles.stepLabel}>Share</ThemedText>
            <ThemedText style={styles.stepDesc}>Post on social media</ThemedText>
          </View>
          <Ionicons name="arrow-forward" size={16} color={colors.neutral[300]} style={{ marginTop: 16 }} />
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, { backgroundColor: colors.tint.green }]}>
              <Ionicons name="wallet-outline" size={20} color="#047857" />
            </View>
            <ThemedText style={styles.stepLabel}>Earn</ThemedText>
            <ThemedText style={styles.stepDesc}>Get 5% in coins</ThemedText>
          </View>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoIconContainer}>
          <Ionicons name="gift-outline" size={24} color={Colors.nileBlue} />
        </View>
        <View style={styles.infoContent}>
          <ThemedText style={styles.infoTitle}>Earn Coins</ThemedText>
          <ThemedText style={styles.infoDescription}>
            {`Share your purchases on social media and earn 5% back in ${BRAND.COIN_NAME}!`}
          </ThemedText>
        </View>
      </View>

      {loading ? (
        <CardGridSkeleton />
      ) : shareableOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bag-outline" size={64} color={colors.neutral[300]} />
          <ThemedText style={styles.emptyTitle}>No Completed Orders</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            Complete orders or pay in store to earn coins by sharing on social media!
          </ThemedText>
          <Pressable
            style={styles.shopNowButton}
            onPress={() => router.push('/')}
           
          >
            <ThemedText style={styles.shopNowText}>Shop Now</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.ordersList}>
          <ThemedText style={styles.ordersTitle}>
            Your Completed Orders ({shareableOrders.length})
          </ThemedText>
          {shareableOrders.map((order) => {
            const submission = orderSubmissions[order.id];
            return (
              <CompletedOrderCard
                key={order.id}
                order={order}
                onEarnPress={handleEarnPress}
                submissionStatus={submission?.status || null}
              />
            );
          })}
        </View>
      )}

      {/* Past Submissions */}
      {pastSubmissions.length > 0 && (
        <View style={styles.submissionsSection}>
          <ThemedText style={styles.ordersTitle}>
            Past Submissions ({pastSubmissions.length})
          </ThemedText>
          {pastSubmissions.slice(0, 5).map((post) => {
            const statusColors: Record<string, string> = {
              pending: colors.brand.amberDeep,
              approved: '#047857',
              rejected: Colors.error,
              credited: Colors.nileBlue,
            };
            const statusBgColors: Record<string, string> = {
              pending: colors.tint.amberLight,
              approved: colors.tint.green,
              rejected: colors.errorScale[100],
              credited: Colors.background.tertiary,
            };
            const statusIcons: Record<string, string> = {
              pending: 'time-outline',
              approved: 'checkmark-circle',
              rejected: 'close-circle',
              credited: 'wallet-outline',
            };
            const statusLabels: Record<string, string> = {
              pending: 'Under Review',
              approved: 'Approved',
              rejected: 'Rejected',
              credited: 'Coins Credited',
            };
            return (
              <View key={post._id} style={styles.submissionCard}>
                <View style={styles.submissionLeft}>
                  <View style={styles.submissionPlatform}>
                    <Ionicons
                      name={`logo-${post.platform}` as any}
                      size={18}
                      color={PLATFORM_CONFIG[post.platform as PlatformType]?.color || Colors.text.tertiary}
                    />
                  </View>
                  <View style={styles.submissionInfo}>
                    <ThemedText style={styles.submissionPlatformName}>
                      {PLATFORM_CONFIG[post.platform as PlatformType]?.label || post.platform}
                    </ThemedText>
                    <ThemedText style={styles.submissionDate}>
                      {new Date(post.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {post.metadata?.orderNumber ? ` · #${post.metadata.orderNumber}` : ''}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.submissionRight}>
                  <View style={[styles.submissionStatusBadge, { backgroundColor: statusBgColors[post.status] || Colors.background.secondary }]}>
                    <Ionicons
                      name={(statusIcons[post.status] || 'help-circle-outline') as any}
                      size={12}
                      color={statusColors[post.status] || Colors.text.tertiary}
                    />
                    <ThemedText style={[styles.submissionStatusText, { color: statusColors[post.status] || Colors.text.tertiary }]}>
                      {statusLabels[post.status] || post.status}
                    </ThemedText>
                  </View>
                  {post.cashbackAmount > 0 && (
                    <ThemedText style={styles.submissionCoins}>
                      {post.cashbackAmount} coins
                    </ThemedText>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Tips for Approval */}
      <View style={styles.tipsCard}>
        <ThemedText style={styles.tipsTitle}>Tips for Quick Approval</ThemedText>
        {[
          { icon: 'camera-outline', text: 'Include your purchase in the photo/video' },
          { icon: 'pricetag-outline', text: 'Tag the store in your post' },
          { icon: 'globe-outline', text: 'Keep your post public (not private)' },
          { icon: 'time-outline', text: 'Submit within 7 days of purchase' },
        ].map((tip, index) => (
          <View key={index} style={styles.tipRow}>
            <View style={styles.tipIconCircle}>
              <Ionicons name={tip.icon as any} size={16} color={Colors.nileBlue} />
            </View>
            <ThemedText style={styles.tipText}>{tip.text}</ThemedText>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  // Render platform select step
  const renderPlatformSelect = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Selected Order Context */}
      {selectedOrder && (
        <View style={styles.selectedOrderCard}>
          <View style={styles.selectedOrderHeader}>
            <Ionicons name="receipt-outline" size={20} color={Colors.nileBlue} />
            <ThemedText style={styles.selectedOrderTitle}>Earning for:</ThemedText>
          </View>
          <ThemedText style={styles.selectedOrderName}>{selectedOrder.productName}</ThemedText>
          <ThemedText style={styles.selectedStoreName}>
            Order #{selectedOrder.orderNumber} • {selectedOrder.storeName}
          </ThemedText>
        </View>
      )}

      {/* Platform Selection */}
      <View style={styles.sectionContainer}>
        <ThemedText style={styles.sectionTitle}>Choose Platform</ThemedText>
        <View style={styles.platformGrid}>
          {(Object.keys(PLATFORM_CONFIG) as PlatformType[]).map((platform) => {
            const config = PLATFORM_CONFIG[platform];
            const isSelected = selectedPlatform === platform;
            return (
              <Pressable
                key={platform}
                style={[styles.platformButton, isSelected && styles.platformButtonSelected]}
                onPress={() => setSelectedPlatform(platform)}
               
              >
                <Ionicons
                  name={config.icon as any}
                  size={28}
                  color={isSelected ? config.color : Colors.text.tertiary}
                />
                <ThemedText style={[styles.platformLabel, isSelected && { color: config.color }]}>
                  {config.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Submission Mode */}
      <View style={styles.sectionContainer}>
        <ThemedText style={styles.sectionTitle}>How do you want to submit?</ThemedText>
        <View style={styles.modeOptions}>
          <Pressable
            style={[styles.modeCard, submissionMode === 'url' && styles.modeCardSelected]}
            onPress={() => setSubmissionMode('url')}
           
          >
            <Ionicons
              name="link-outline"
              size={28}
              color={submissionMode === 'url' ? Colors.nileBlue : Colors.text.tertiary}
            />
            <ThemedText style={[styles.modeTitle, submissionMode === 'url' && styles.modeTitleSelected]}>
              Paste Post URL
            </ThemedText>
            <ThemedText style={styles.modeDescription}>
              Share the link to your social media post
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.modeCard, submissionMode === 'media' && styles.modeCardSelected]}
            onPress={() => setSubmissionMode('media')}
           
          >
            <Ionicons
              name="images-outline"
              size={28}
              color={submissionMode === 'media' ? Colors.nileBlue : Colors.text.tertiary}
            />
            <ThemedText style={[styles.modeTitle, submissionMode === 'media' && styles.modeTitleSelected]}>
              Upload Photo/Video
            </ThemedText>
            <ThemedText style={styles.modeDescription}>
              Upload screenshot or screen recording as proof
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Continue Button */}
      <Pressable
        style={styles.continueButton}
        onPress={handlePlatformContinue}
       
      >
        <LinearGradient
          colors={EarnSocialData.ui.gradients.primary as any}
          style={styles.continueButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </LinearGradient>
      </Pressable>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );

  // Render URL input step
  const renderUrlInputStep = () => {
    const platformConfig = PLATFORM_CONFIG[selectedPlatform];
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Platform Header */}
        <View style={styles.platformHeader}>
          <Ionicons name={platformConfig.icon as any} size={24} color={platformConfig.color} />
          <ThemedText style={styles.platformHeaderText}>{platformConfig.label} Post</ThemedText>
        </View>

        {/* Selected Order Context */}
        {selectedOrder && (
          <View style={styles.selectedOrderCard}>
            <View style={styles.selectedOrderHeader}>
              <Ionicons name="receipt-outline" size={20} color={Colors.nileBlue} />
              <ThemedText style={styles.selectedOrderTitle}>Earning for:</ThemedText>
            </View>
            <ThemedText style={styles.selectedOrderName}>{selectedOrder.productName}</ThemedText>
            <ThemedText style={styles.selectedStoreName}>
              Order #{selectedOrder.orderNumber} • {selectedOrder.storeName}
            </ThemedText>
            <ThemedText style={styles.selectedCashback}>
              5% cashback = {selectedOrder.cashbackAmount.toFixed(0)} coins
            </ThemedText>
          </View>
        )}

        {/* URL Input */}
        <View style={styles.stepsContainer}>
          <View style={styles.stepCard}>
            <ThemedText style={styles.stepSubtitle}>{platformConfig.label} Post URL</ThemedText>
            <View style={styles.urlInputContainer}>
              <TextInput
                style={styles.urlInput}
                placeholder={platformConfig.placeholder}
                value={urlInput}
                onChangeText={setUrlInput}
                multiline
                textAlignVertical="top"
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          style={styles.uploadButton}
          onPress={handleSubmitUrl}
         
          disabled={submitting}
        >
          <LinearGradient
            colors={EarnSocialData.ui.gradients.primary as any}
            style={[styles.uploadButtonGradient, { pointerEvents: 'none' } as any]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {submitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <ThemedText style={[styles.uploadButtonText, { pointerEvents: 'none' } as any]}>Submit</ThemedText>
            )}
          </LinearGradient>
        </Pressable>

        <View style={styles.bottomSpace} />
      </ScrollView>
    );
  };

  // Render media upload step
  const renderMediaUpload = () => {
    const platformConfig = PLATFORM_CONFIG[selectedPlatform];
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Platform Header */}
        <View style={styles.platformHeader}>
          <Ionicons name={platformConfig.icon as any} size={24} color={platformConfig.color} />
          <ThemedText style={styles.platformHeaderText}>{platformConfig.label} Proof</ThemedText>
        </View>

        {/* Selected Order Context */}
        {selectedOrder && (
          <View style={styles.selectedOrderCard}>
            <View style={styles.selectedOrderHeader}>
              <Ionicons name="receipt-outline" size={20} color={Colors.nileBlue} />
              <ThemedText style={styles.selectedOrderTitle}>Earning for:</ThemedText>
            </View>
            <ThemedText style={styles.selectedOrderName}>{selectedOrder.productName}</ThemedText>
            <ThemedText style={styles.selectedStoreName}>
              Order #{selectedOrder.orderNumber} • {selectedOrder.storeName}
            </ThemedText>
            <ThemedText style={styles.selectedCashback}>
              5% cashback = {selectedOrder.cashbackAmount.toFixed(0)} coins
            </ThemedText>
          </View>
        )}

        {/* Media Upload Area */}
        <View style={styles.sectionContainer}>
          <ThemedText style={styles.sectionTitle}>
            Upload Proof ({selectedMedia.length}/5)
          </ThemedText>
          <ThemedText style={styles.sectionSubtext}>
            Upload a screenshot or screen recording of your {platformConfig.label} post
          </ThemedText>

          {/* Pick Button */}
          {selectedMedia.length < 5 && (
            <Pressable
              style={styles.pickMediaButton}
              onPress={handlePickMedia}
             
            >
              <Ionicons name="add-circle-outline" size={32} color={Colors.nileBlue} />
              <ThemedText style={styles.pickMediaText}>Pick from Gallery</ThemedText>
            </Pressable>
          )}

          {/* Media Grid */}
          {selectedMedia.length > 0 && (
            <View style={styles.mediaGrid}>
              {selectedMedia.map((asset, index) => (
                <View key={index} style={styles.mediaItem}>
                  <CachedImage source={asset.uri} style={styles.mediaThumbnail} />
                  {asset.type === 'video' && (
                    <View style={styles.videoOverlay}>
                      <Ionicons name="play-circle" size={24} color="white" />
                    </View>
                  )}
                  <Pressable
                    style={styles.removeMediaButton}
                    onPress={() => handleRemoveMedia(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={22} color={Colors.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.uploadButton, selectedMedia.length === 0 && styles.buttonDisabled]}
          onPress={handleSubmitMedia}
         
          disabled={submitting || selectedMedia.length === 0}
        >
          <LinearGradient
            colors={selectedMedia.length > 0 ? EarnSocialData.ui.gradients.primary as any : [colors.neutral[300], colors.neutral[400]]}
            style={[styles.uploadButtonGradient, { pointerEvents: 'none' } as any]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {submitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <ThemedText style={[styles.uploadButtonText, { pointerEvents: 'none' } as any]}>Submit</ThemedText>
            )}
          </LinearGradient>
        </Pressable>

        <View style={styles.bottomSpace} />
      </ScrollView>
    );
  };

  // Render uploading step
  const renderUploadingStep = () => (
    <View style={styles.uploadingContainer}>
      <View style={styles.uploadProgressContainer}>
        <ActivityIndicator size="large" color={EarnSocialData.ui.colors.primary} />
        <ThemedText style={styles.uploadingText}>
          {submissionMode === 'media' ? 'Uploading your media...' : 'Submitting your post...'}
        </ThemedText>
        <ThemedText style={styles.progressText}>{uploadProgress}%</ThemedText>
      </View>
    </View>
  );

  // Render success step
  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={80} color={EarnSocialData.ui.colors.success} />
      </View>
      <ThemedText style={styles.successTitle}>Post Submitted Successfully!</ThemedText>
      <ThemedText style={styles.successDescription}>
        Your post is under review. The merchant will verify within 24 hours.{'\n'}
        You'll receive {selectedOrder?.cashbackAmount.toFixed(0) || '0'} {BRAND.COIN_NAME} once approved.
      </ThemedText>
      <Pressable
        style={styles.doneButton}
        onPress={() => {
          setCurrentStep('orders_list');
          setSelectedOrder(null);
          setUrlInput('');
          setSelectedMedia([]);
        }}
       
      >
        <ThemedText style={styles.doneButtonText}>Done</ThemedText>
      </Pressable>
    </View>
  );

  // Render error step
  const renderErrorStep = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIcon}>
        <Ionicons name="alert-circle" size={80} color={EarnSocialData.ui.colors.error} />
      </View>
      <ThemedText style={styles.errorTitle}>Upload Failed</ThemedText>
      <ThemedText style={styles.errorDescription}>{error}</ThemedText>
      <View style={styles.errorActions}>
        <Pressable
          style={styles.retryButton}
          onPress={handleRetry}
         
        >
          <Ionicons name="refresh-outline" size={20} color={Colors.text.inverse} />
          <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
        </Pressable>
        <Pressable
          style={styles.cancelButton}
          onPress={handleGoBack}
         
        >
          <ThemedText style={styles.cancelButtonText}>Go Back</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  // Render content based on current step
  const renderContent = () => {
    switch (currentStep) {
      case 'platform_select':
        return renderPlatformSelect();
      case 'url_input':
        return renderUrlInputStep();
      case 'media_upload':
        return renderMediaUpload();
      case 'uploading':
        return renderUploadingStep();
      case 'success':
        return renderSuccessStep();
      case 'error':
        return renderErrorStep();
      default:
        return renderOrdersList();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

      {/* Header */}
      <LinearGradient
        colors={EarnSocialData.ui.gradients.primary as any}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={handleGoBack}
           
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <ThemedText style={styles.headerTitle}>Earn from social media</ThemedText>

          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      {/* Main Content */}
      <View style={styles.mainContent}>{renderContent()}</View>

      {/* Cashback Info Modal */}
      <CashbackInfoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onUpload={handleUploadPress}
        orderInfo={selectedOrder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  // Header Styles
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
    marginLeft: -40,
  },
  headerRight: {
    width: 40,
  },

  // Main Content
  mainContent: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },

  // Orders Container
  ordersContainer: {
    flex: 1,
  },

  // Earnings Summary Card
  earningsSummaryCard: {
    backgroundColor: Colors.background.primary,
    margin: Spacing.lg,
    marginBottom: 0,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.subtle,
  },
  earningsSummaryTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  earningsStat: {
    alignItems: 'center',
    flex: 1,
  },
  earningsStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  earningsStatLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  earningsStatDivider: {
    width: 1,
    height: Spacing['2xl'],
    backgroundColor: Colors.border.default,
  },
  earningsPostsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.background.secondary,
  },
  earningsPostsText: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },

  // How It Works
  howItWorksCard: {
    backgroundColor: Colors.background.primary,
    margin: Spacing.lg,
    marginBottom: 0,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.subtle,
  },
  howItWorksTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  stepDesc: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },

  // Past Submissions
  submissionsSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  submissionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: 14,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  submissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  submissionPlatform: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submissionInfo: {
    flex: 1,
  },
  submissionPlatformName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  submissionDate: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  submissionRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  submissionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  submissionStatusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  submissionCoins: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.nileBlue,
  },

  // Tips Card
  tipsCard: {
    backgroundColor: Colors.background.primary,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.subtle,
  },
  tipsTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  tipIconCircle: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.tertiary,
    margin: Spacing.lg,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  infoDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  shopNowButton: {
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: 25,
  },
  shopNowText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },

  // Orders List
  ordersList: {
    paddingHorizontal: Spacing.lg,
  },
  ordersTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },

  // Platform Header
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  platformHeaderText: {
    ...Typography.h4,
    color: Colors.text.primary,
  },

  // Section Container
  sectionContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  sectionSubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.base,
  },

  // Platform Grid
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  platformButton: {
    width: (width - 64) / 2,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border.default,
  },
  platformButtonSelected: {
    borderColor: Colors.nileBlue,
    backgroundColor: Colors.background.tertiary,
  },
  platformLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },

  // Mode Options
  modeOptions: {
    gap: Spacing.md,
  },
  modeCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    borderWidth: 2,
    borderColor: Colors.border.default,
  },
  modeCardSelected: {
    borderColor: Colors.nileBlue,
    backgroundColor: Colors.background.tertiary,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  modeTitleSelected: {
    color: Colors.nileBlue,
  },
  modeDescription: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    position: 'absolute',
    bottom: Spacing.sm,
    left: 64,
    right: Spacing.base,
  },

  // Continue Button
  continueButton: {
    marginHorizontal: Spacing.lg,
    marginTop: 30,
    borderRadius: 25,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    paddingVertical: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  continueButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },

  // Selected Order Card
  selectedOrderCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.nileBlue,
  },
  selectedOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  selectedOrderTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.nileBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedOrderName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  selectedStoreName: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  selectedCashback: {
    ...Typography.body,
    fontWeight: '500',
    color: colors.brand.amberDeep,
  },

  // Steps Container
  stepsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },

  // Step Card
  stepCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  stepSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
  },

  // URL Input
  urlInputContainer: {
    marginTop: Spacing.sm,
  },
  urlInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border.default,
    textAlignVertical: 'top',
  },

  // Pick Media Button
  pickMediaButton: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border.default,
    borderStyle: 'dashed',
    marginBottom: Spacing.base,
  },
  pickMediaText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.nileBlue,
  },

  // Media Grid
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  mediaItem: {
    width: (width - 64) / 3,
    height: (width - 64) / 3,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: Colors.background.primary,
    borderRadius: 11,
  },

  // Upload Button
  uploadButton: {
    marginHorizontal: Spacing.lg,
    marginTop: 30,
    borderRadius: 25,
    overflow: 'hidden',
  },
  uploadButtonGradient: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  uploadButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Uploading State
  uploadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  uploadProgressContainer: {
    alignItems: 'center',
    gap: Spacing.base,
  },
  uploadingText: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  progressText: {
    ...Typography.body,
    color: Colors.nileBlue,
    fontWeight: '600',
  },

  // Success State
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  successIcon: {
    marginBottom: Spacing.xl,
  },
  successTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  successDescription: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  doneButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  doneButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.nileBlue,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  errorIcon: {
    marginBottom: Spacing.xl,
  },
  errorTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  errorDescription: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  errorActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  retryButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  cancelButton: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  cancelButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },

  // Bottom Space
  bottomSpace: {
    height: 100,
  },
});

export default withErrorBoundary(EarnFromSocialMediaPage, 'EarnFromSocialMedia');
