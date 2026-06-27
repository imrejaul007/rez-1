// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Offer Comments Page
// Comment on offers to earn coins

import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import offerCommentApi, { CommentableOffer, MyCommentItem } from '@/services/offerCommentApi';
import { platformAlert } from '@/utils/platformAlert';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import CachedImage from '@/components/ui/CachedImage';
import { BRAND } from '@/constants/brand';

type TabType = 'offers' | 'my-comments';

function OfferCommentsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('offers');
  const [offers, setOffers] = useState<CommentableOffer[]>([]);
  const [myComments, setMyComments] = useState<MyCommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<CommentableOffer | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await offerCommentApi.getCommentableOffers(1, 50);
      if (result.success && result.data) {
        setOffers(result.data.offers);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, []);

  const fetchMyComments = useCallback(async () => {
    try {
      const result = await offerCommentApi.getMyComments(1, 50);
      if (result.success && result.data) {
        setMyComments(result.data.comments);
      }
    } catch (error) {
      // silently handle
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOffers();
    }, [fetchOffers])
  );

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'my-comments') {
      fetchMyComments();
    }
  };

  const handleSubmitComment = async () => {
    if (!selectedOffer) return;

    if (commentText.trim().length < 20) {
      platformAlert('Too Short', 'Your comment must be at least 20 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await offerCommentApi.createComment(selectedOffer.id, commentText.trim());
      if (result.success) {
        const coins = result.data?.coinReward?.coinsAwarded;
        const msg = coins
          ? `Your comment has been submitted for review. You'll earn ${coins} coins once approved!`
          : 'Your comment has been submitted for review.';
        platformAlert('Comment Submitted!', msg);
        setCommentText('');
        setSelectedOffer(null);
        // Refresh offers to update comment counts
        fetchOffers();
      } else {
        platformAlert('Failed', result.error || 'Could not submit your comment.');
      }
    } catch (error: any) {
      platformAlert('Error', 'Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  const getQualityIndicator = (length: number): { label: string; color: string } => {
    if (length >= 200) return { label: 'Excellent', color: Colors.success };
    if (length >= 100) return { label: 'Great (+5 bonus)', color: Colors.primary[600] };
    if (length >= 50) return { label: 'Good', color: Colors.info };
    if (length >= 20) return { label: 'Minimum met', color: Colors.text.tertiary };
    return { label: `${20 - length} more chars needed`, color: Colors.error };
  };

  const getModerationBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { icon: 'checkmark-circle' as const, color: Colors.success, label: 'Approved' };
      case 'rejected':
        return { icon: 'close-circle' as const, color: Colors.error, label: 'Rejected' };
      default:
        return { icon: 'time' as const, color: Colors.warning, label: 'Pending Review' };
    }
  };

  const renderOfferCard = useCallback(({ item }: { item: CommentableOffer }) => (
    <Pressable
      style={[styles.offerCard, selectedOffer?.id === item.id && styles.offerCardSelected]}
      onPress={() => setSelectedOffer(selectedOffer?.id === item.id ? null : item)}
     
    >
      <View style={styles.offerCardHeader}>
        <View style={styles.offerInfo}>
          <ThemedText style={styles.offerTitle} numberOfLines={2}>{item.title}</ThemedText>
          {item.store && (
            <ThemedText style={styles.offerStore}>{item.store.name}</ThemedText>
          )}
        </View>
        <View style={styles.commentCountBadge}>
          <Ionicons name="chatbubble-outline" size={14} color={Colors.primary[600]} />
          <ThemedText style={styles.commentCountText}>{item.commentCount}</ThemedText>
        </View>
      </View>
      {item.description && (
        <ThemedText style={styles.offerDescription} numberOfLines={2}>{item.description}</ThemedText>
      )}
      <View style={styles.offerFooter}>
        <View style={styles.coinPreview}>
          <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 14, height: 14 }} />
          <ThemedText style={styles.coinPreviewText}>15-20 coins</ThemedText>
        </View>
        {item.endDate && (
          <ThemedText style={styles.offerEndDate}>
            Ends {new Date(item.endDate).toLocaleDateString()}
          </ThemedText>
        )}
      </View>
    </Pressable>
  ), [selectedOffer]);

  const renderMyCommentItem = useCallback(({ item }: { item: MyCommentItem }) => {
    const badge = getModerationBadge(item.moderationStatus);
    return (
      <View style={styles.myCommentCard}>
        <View style={styles.myCommentHeader}>
          {item.offer && (
            <ThemedText style={styles.myCommentOffer} numberOfLines={1}>
              {item.offer.title}
            </ThemedText>
          )}
          <View style={[styles.statusBadge, { backgroundColor: badge.color + '15' }]}>
            <Ionicons name={badge.icon} size={12} color={badge.color} />
            <ThemedText style={[styles.statusText, { color: badge.color }]}>{badge.label}</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.myCommentText} numberOfLines={3}>{item.text}</ThemedText>
        <View style={styles.myCommentFooter}>
          {item.coinsAwarded > 0 && (
            <View style={styles.coinPreview}>
              <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 12, height: 12 }} />
              <ThemedText style={styles.coinPreviewText}>+{item.coinsAwarded}</ThemedText>
            </View>
          )}
          <ThemedText style={styles.myCommentDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Comment on Offers</ThemedText>
          <View style={styles.headerRight}>
            <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 18, height: 18 }} />
            <ThemedText style={styles.headerCoins}>15+</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['offers', 'my-comments'] as TabType[]).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabChange(tab)}
          >
            <ThemedText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'offers' ? 'Active Offers' : 'My Comments'}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <CardGridSkeleton />
      ) : activeTab === 'offers' ? (
        <View style={styles.offersContent}>
          <FlashList
            data={offers}
            renderItem={renderOfferCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={120}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="pricetags-outline" size={64} color={Colors.text.tertiary} />
                <ThemedText style={styles.emptyTitle}>No Active Offers</ThemedText>
                <ThemedText style={styles.emptyText}>
                  Check back later for offers you can comment on.
                </ThemedText>
              </View>
            }
          />

          {/* Comment Input - shown when an offer is selected */}
          {selectedOffer && (
            <View style={styles.commentInputContainer}>
              <View style={styles.commentInputHeader}>
                <ThemedText style={styles.commentingOn} numberOfLines={1}>
                  Commenting on: {selectedOffer.title}
                </ThemedText>
                <Pressable onPress={() => setSelectedOffer(null)}>
                  <Ionicons name="close" size={20} color={Colors.text.tertiary} />
                </Pressable>
              </View>
              <TextInput
                style={styles.commentInput}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Share your thoughts about this offer (min 20 chars)..."
                placeholderTextColor={Colors.text.tertiary}
                multiline
                maxLength={1000}
              />
              <View style={styles.commentInputFooter}>
                <View>
                  <ThemedText style={[
                    styles.qualityText,
                    { color: getQualityIndicator(commentText.trim().length).color },
                  ]}>
                    {getQualityIndicator(commentText.trim().length).label}
                  </ThemedText>
                  <ThemedText style={styles.charCount}>{commentText.length}/1000</ThemedText>
                </View>
                <Pressable
                  style={[
                    styles.submitButton,
                    commentText.trim().length < 20 && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmitComment}
                  disabled={commentText.trim().length < 20 || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={colors.background.primary} />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color={colors.background.primary} />
                      <ThemedText style={styles.submitButtonText}>Submit</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      ) : (
        <FlashList
          data={myComments}
          renderItem={renderMyCommentItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={80}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={Colors.text.tertiary} />
              <ThemedText style={styles.emptyTitle}>No Comments Yet</ThemedText>
              <ThemedText style={styles.emptyText}>
                Comment on active offers to see your history here.
              </ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    color: colors.background.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerCoins: {
    ...Typography.label,
    color: Colors.gold,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    ...Shadows.subtle,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary[600],
  },
  tabText: {
    ...Typography.label,
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: Colors.primary[600],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offersContent: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  offerCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    ...Shadows.subtle,
  },
  offerCardSelected: {
    borderColor: Colors.primary[600],
    borderWidth: 2,
  },
  offerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  offerInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  offerTitle: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  offerStore: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  commentCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  commentCountText: {
    ...Typography.caption,
    color: Colors.primary[600],
    fontWeight: '600',
  },
  offerDescription: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  coinPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinPreviewText: {
    ...Typography.caption,
    color: Colors.gold,
    fontWeight: '600',
  },
  offerEndDate: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  commentInputContainer: {
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    padding: Spacing.base,
    ...Shadows.medium,
  },
  commentInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  commentingOn: {
    ...Typography.caption,
    color: Colors.primary[600],
    flex: 1,
    marginRight: Spacing.sm,
  },
  commentInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text.primary,
    minHeight: 80,
    maxHeight: 150,
    textAlignVertical: 'top',
  },
  commentInputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.sm,
  },
  qualityText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  charCount: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...Typography.label,
    color: colors.background.primary,
  },
  myCommentCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  myCommentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  myCommentOffer: {
    ...Typography.caption,
    color: Colors.primary[600],
    flex: 1,
    marginRight: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  myCommentText: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  myCommentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  myCommentDate: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginTop: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});

export default withErrorBoundary(OfferCommentsPage, 'EarnOfferComments');
