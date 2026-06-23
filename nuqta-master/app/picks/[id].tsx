// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Creator Pick Detail Page
// Production-ready page showing a creator's product recommendation

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Platform,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import creatorsApi, { CreatorPick } from '@/services/creatorsApi';
import { VideoPlayer } from '@/components/product/VideoPlayer';
import { useAuthUser } from '@/stores/selectors';
import { platformAlert } from '@/utils/platformAlert';
import { DetailPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');
const NUQTA_COIN = BRAND.COIN_IMAGE;

// Time ago helper
const timeAgo = (dateStr?: string) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const fmt = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

const CreatorPickDetail = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthUser();
  const currentUserId = user?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<CreatorPick | null>(null);
  const [relatedPicks, setRelatedPicks] = useState<CreatorPick[]>([]);
  const [imageError, setImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Own-pick detection
  const isOwnPick = !!(currentUserId && pick?.creator?.id && currentUserId === pick.creator.id);
  const [deleting, setDeleting] = useState(false);

  const handleDeletePick = useCallback(() => {
    if (!id) return;
    const isApproved = pick?.status === 'approved' || pick?.isPublished;
    platformAlert(
      isApproved ? 'Archive Pick?' : 'Delete Pick?',
      isApproved
        ? 'This pick will be archived and hidden from public view.'
        : 'This pick will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isApproved ? 'Archive' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const response = await creatorsApi.deleteMyPick(id);
              if (response.success) {
                platformAlert('Success', response.data?.archived ? 'Pick archived' : 'Pick deleted', [
                  { text: 'OK', onPress: () => router.canGoBack() ? router.back() : router.replace('/(tabs)') },
                ]);
              } else {
                platformAlert('Error', response.error || 'Failed to delete pick');
              }
            } catch (err: any) {
              platformAlert('Error', err.message || 'Something went wrong');
            } finally {
              if (!isMounted()) return;
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [id, pick, router]);

  const fetchPickData = useCallback(async () => {
    if (!id) { setError('Pick not found'); setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const pickResponse = await creatorsApi.getPickById(id);
      if (pickResponse.success && pickResponse.data) {
        const foundPick = pickResponse.data;
        setPick(foundPick);
        setLikeCount(foundPick.likes || 0);
        creatorsApi.trackPickView(id);
        // Fetch related picks
        if (foundPick.creator?.id) {
          const resp = await creatorsApi.getCreatorPicks(foundPick.creator.id, 6);
          if (resp.success && resp.data?.picks) {
            setRelatedPicks(resp.data.picks.filter((p) => p.id !== id));
          }
        } else {
          const resp = await creatorsApi.getTrendingPicks(6);
          if (resp.success && resp.data?.picks) {
            setRelatedPicks(resp.data.picks.filter((p) => p.id !== id).slice(0, 5));
          }
        }
      } else {
        if (!isMounted()) return;
        setError(pickResponse.error || 'Pick not found');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError(err instanceof Error ? err.message : 'Failed to load pick details');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [id]);

  const isMounted = useIsMounted();
  useEffect(() => { fetchPickData(); }, [fetchPickData]);

  const estimatedCoins = pick
    ? pick.estimatedCoins || (pick.commissionRate
        ? Math.max(Math.round(pick.productPrice * pick.commissionRate / 100), 1)
        : Math.max(Math.round(pick.productPrice * 0.05), 1))
    : 0;
  const coinWord = estimatedCoins === 1 ? 'coin' : 'coins';

  const handleLike = async () => {
    if (!id) return;
    const prev = isLiked;
    setIsLiked(!prev);
    setLikeCount(c => prev ? c - 1 : c + 1);
    try { await creatorsApi.togglePickLike(id); }
    catch { setIsLiked(prev); setLikeCount(c => prev ? c + 1 : c - 1); }
  };

  const handleBookmark = async () => {
    if (!id) return;
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    try { await creatorsApi.togglePickBookmark(id); }
    catch { setIsBookmarked(prev); }
  };

  const handleShare = () => {
    if (!pick) return;
    Share.share({ message: `Check out "${pick.title}" picked by ${pick.creator?.name || 'a creator'}! Earn ${estimatedCoins} ${BRAND.APP_NAME} ${coinWord} when you buy.`, title: pick.title }).catch(() => {});
  };

  const handleBuy = () => {
    if (!id || !pick) return;
    creatorsApi.trackPickClick(id);
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('attribution_pick_id', id); } catch {}
    router.push({ pathname: '/product-page', params: { cardId: pick.productId || id, cardType: 'product', pickId: id } });
  };

  // ============================================
  // HEADER
  // ============================================

  const renderHeader = () => (
    <View style={s.headerRow}>
      <Pressable style={s.headerBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
        <Ionicons name="arrow-back" size={20} color={Colors.text.inverse} />
      </Pressable>
      <View style={s.flex1} />
      <Pressable style={s.headerBtn} onPress={handleShare}>
        <Ionicons name="share-social-outline" size={18} color={Colors.text.inverse} />
      </Pressable>
    </View>
  );

  // ============================================
  // LOADING / ERROR
  // ============================================

  if (loading) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
        <LinearGradient colors={[Colors.nileBlue, '#2d5a7b'] as const} style={s.header}>
          {renderHeader()}
        </LinearGradient>
        <DetailPageSkeleton />
      </View>
    );
  }

  if (error || !pick) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
        <LinearGradient colors={[Colors.nileBlue, '#2d5a7b'] as const} style={s.header}>
          {renderHeader()}
        </LinearGradient>
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={s.errorTitle}>Unable to Load</Text>
          <Text style={s.errorBody}>
            {error || 'Pick details are not available'}
          </Text>
          <Pressable style={s.retryBtn} onPress={fetchPickData}>
            <Text style={s.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ============================================
  // RELATED PICK CARD
  // ============================================

  const renderRelatedPick = useCallback(({ item }: { item: CreatorPick }) => {
    const coins = item.estimatedCoins || (item.commissionRate
      ? Math.max(Math.round(item.productPrice * item.commissionRate / 100), 1)
      : Math.max(Math.round(item.productPrice * 0.05), 1));
    return (
      <Pressable
        style={s.relCard}
        onPress={() => router.push({ pathname: '/picks/[id]', params: { id: item.id } })}
       
      >
        {item.productImage ? (
          <CachedImage source={item.productImage} style={s.relImg} contentFit="cover" />
        ) : (
          <View style={[s.relImg, s.centeredContent]}>
            <Ionicons name="image-outline" size={24} color={colors.neutral[300]} />
          </View>
        )}
        <View style={s.relCoinBadge}>
          <CachedImage source={NUQTA_COIN} style={s.coinIcon12} />
          <Text style={s.relCoinText}>{coins}</Text>
        </View>
        <View style={s.relCardContent}>
          <Text style={s.relCardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={s.relCardPrice}>{BRAND.CURRENCY_CODE} {item.productPrice}</Text>
        </View>
      </Pressable>
    );
  }, [router]);

  // ============================================
  // MAIN CONTENT
  // ============================================

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

      {/* Header */}
      <LinearGradient colors={[Colors.nileBlue, '#2d5a7b'] as const} style={s.header}>
        {renderHeader()}
      </LinearGradient>

      <ScrollView style={s.flex1} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContentPadding}>

        {/* ---- VIDEO (if exists) ---- */}
        {pick.videoUrl && (
          <View style={s.videoBg}>
            <VideoPlayer uri={pick.videoUrl} width={width} height={width * 0.56} autoPlay={false} loop={false} muted={true} style={s.videoNoBorderRadius} />
          </View>
        )}

        {/* ---- PRODUCT IMAGE ---- */}
        {pick.productImage && !imageError ? (
          <View style={s.productImageContainer}>
            <CachedImage
              source={pick.productImage}
              style={{ width, height: pick.videoUrl ? width * 0.5 : width * 0.8, backgroundColor: Colors.background.secondary }}
              contentFit="cover"
              onError={() => setImageError(true)}
            />
            {/* Tag badge */}
            {pick.tag && (
              <View style={s.imgTag}>
                <Text style={s.imgTagText}>{pick.tag}</Text>
              </View>
            )}
            {/* Coin overlay */}
            <View style={s.imgCoinOverlay}>
              <CachedImage source={NUQTA_COIN} style={s.coinIcon16} />
              <Text style={s.imgCoinText}>Earn {estimatedCoins} {coinWord}</Text>
            </View>
          </View>
        ) : !pick.videoUrl ? (
          <View style={[s.imageFallback, { width, height: width * 0.55 }]}>
            <Ionicons name="image-outline" size={56} color={colors.neutral[300]} />
          </View>
        ) : null}

        {/* ---- PRODUCT INFO ---- */}
        <View style={s.infoCard}>
          {/* Brand + Time */}
          <View style={s.brandTimeRow}>
            <Text style={s.brand}>{pick.productBrand}</Text>
            {pick.createdAt && <Text style={s.timeText}>{timeAgo(pick.createdAt)}</Text>}
          </View>

          <Text style={s.title}>{pick.title}</Text>

          {/* Price + Coin Row */}
          <View style={s.priceRow}>
            <Text style={s.price}>{BRAND.CURRENCY_CODE} {pick.productPrice}</Text>
            <View style={s.coinPill}>
              <CachedImage source={NUQTA_COIN} style={s.coinIcon18} />
              <Text style={s.coinPillNum}>{estimatedCoins}</Text>
              <Text style={s.coinPillLabel}>{coinWord} back</Text>
            </View>
          </View>

          {/* Action row */}
          <View style={s.actionRow}>
            <Pressable style={s.actionBtn} onPress={handleLike}>
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={18} color={isLiked ? Colors.error : Colors.text.tertiary} />
              <Text style={[s.actionLabel, isLiked && { color: Colors.error }]}>{likeCount > 0 ? fmt(likeCount) : 'Like'}</Text>
            </Pressable>
            <Pressable style={s.actionBtn} onPress={handleBookmark}>
              <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={18} color={isBookmarked ? Colors.warning : Colors.text.tertiary} />
              <Text style={[s.actionLabel, isBookmarked && { color: Colors.warning }]}>Save</Text>
            </Pressable>
            <Pressable style={s.actionBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={18} color={Colors.text.tertiary} />
              <Text style={s.actionLabel}>Share</Text>
            </Pressable>
          </View>
        </View>

        {/* ---- OWN PICK MANAGEMENT ---- */}
        {isOwnPick && (
          <View style={s.ownPickSection}>
            {/* Status Badge */}
            <View style={s.statusRow}>
              <Text style={s.statusLabel}>Status:</Text>
              <View style={[
                s.statusBadge,
                pick.status === 'approved' && { backgroundColor: colors.successScale[100] },
                pick.status === 'rejected' && { backgroundColor: colors.errorScale[100] },
                pick.status === 'pending_review' && { backgroundColor: colors.tint.amberLight },
                pick.status === 'pending_merchant' && { backgroundColor: colors.tint.blueLight },
                pick.status === 'draft' && { backgroundColor: Colors.background.secondary },
                pick.status === 'archived' && { backgroundColor: Colors.border.default },
              ]}>
                <Text style={[
                  s.statusText,
                  pick.status === 'approved' && { color: colors.brand.greenDark },
                  pick.status === 'rejected' && { color: Colors.error },
                  pick.status === 'pending_review' && { color: colors.warningScale[700] },
                  pick.status === 'pending_merchant' && { color: colors.brand.blue },
                  pick.status === 'draft' && { color: Colors.text.tertiary },
                  pick.status === 'archived' && { color: Colors.text.tertiary },
                ]}>
                  {pick.status === 'approved' ? 'Published' :
                   pick.status === 'rejected' ? 'Rejected' :
                   pick.status === 'pending_review' ? 'Under Review' :
                   pick.status === 'pending_merchant' ? 'Awaiting Merchant' :
                   pick.status === 'draft' ? 'Draft' :
                   pick.status === 'archived' ? 'Archived' :
                   pick.status || 'Unknown'}
                </Text>
              </View>
            </View>

            {/* Rejection reason */}
            {pick.status === 'rejected' && pick.merchantApproval?.rejectionReason && (
              <View style={s.rejectionBox}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.error} />
                <Text style={s.rejectionText}>{pick.merchantApproval.rejectionReason}</Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={s.ownPickActions}>
              {(pick.status === 'draft' || pick.status === 'rejected') && (
                <Pressable
                  style={s.editPickBtn}
                  onPress={() => router.push(`/picks/edit/${id}` as any)}
                 
                >
                  <Ionicons name="create-outline" size={16} color={Colors.nileBlue} />
                  <Text style={s.editPickText}>Edit Pick</Text>
                </Pressable>
              )}
              <Pressable
                style={s.deletePickBtn}
                onPress={handleDeletePick}
                disabled={deleting}
               
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={Colors.error} />
                ) : (
                  <>
                    <Ionicons
                      name={pick.status === 'approved' ? 'archive-outline' : 'trash-outline'}
                      size={16}
                      color={Colors.error}
                    />
                    <Text style={s.deletePickText}>
                      {pick.status === 'approved' ? 'Archive' : 'Delete'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* ---- CREATOR CARD ---- */}
        {pick.creator && (
          <Pressable
            style={s.creatorCard}
            onPress={() => router.push(`/creator/${pick.creator?.id}`)}
           
          >
            {/* Avatar */}
            {pick.creator.avatar ? (
              <CachedImage source={pick.creator.avatar} style={s.avatar} />
            ) : (
              <LinearGradient colors={[Colors.nileBlue, colors.brand.purpleMedium] as const} style={s.avatar}>
                <Text style={s.avatarInitial}>{pick.creator.name?.charAt(0)?.toUpperCase() || '?'}</Text>
              </LinearGradient>
            )}
            {/* Info */}
            <View style={s.flex1}>
              <View style={s.creatorNameRow}>
                <Text style={s.creatorName}>{pick.creator.name}</Text>
                {pick.creator.verified && <Ionicons name="checkmark-circle" size={14} color={colors.infoScale[400]} />}
              </View>
              <View style={s.creatorMetaRow}>
                {pick.creator.tier && (
                  <View style={s.tierBadge}>
                    <CachedImage source={NUQTA_COIN} style={s.coinIcon10} />
                    <Text style={s.tierText}>{pick.creator.tier}</Text>
                  </View>
                )}
                {pick.creator.category && (
                  <Text style={s.creatorMeta}>{pick.creator.category}</Text>
                )}
                {pick.creator.stats?.totalFollowers > 0 && (
                  <Text style={s.creatorMeta}>{fmt(pick.creator.stats.totalFollowers)} followers</Text>
                )}
              </View>
            </View>
            {/* Follow / Profile arrow */}
            <View style={s.profileBtn}>
              <Text style={s.profileBtnText}>View</Text>
              <Ionicons name="chevron-forward" size={13} color={Colors.nileBlue} />
            </View>
          </Pressable>
        )}

        {/* ---- CREATOR'S NOTE (description) ---- */}
        {pick.description ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Why I picked this</Text>
            <Text style={s.noteText}>{pick.description}</Text>
          </View>
        ) : null}

        {/* ---- STORE INFO ---- */}
        {pick.store && (
          <Pressable
            style={s.storeRow}
           
            onPress={() => router.push({ pathname: '/MainStorePage', params: { storeId: pick.store?.id } })}
          >
            {pick.store.logo ? (
              <CachedImage source={pick.store.logo} style={s.storeLogo} />
            ) : (
              <View style={[s.storeLogo, s.storeLogoPlaceholder]}>
                <Ionicons name="storefront" size={16} color={Colors.nileBlue} />
              </View>
            )}
            <View style={s.flex1}>
              <Text style={s.storeLabel}>Available at</Text>
              <Text style={s.storeName}>{pick.store.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
          </Pressable>
        )}

        {/* ---- HOW IT WORKS ---- */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>How you earn</Text>
          <View style={s.stepsRow}>
            <View style={s.stepItem}>
              <View style={[s.stepIcon, { backgroundColor: colors.tint.blue }]}>
                <Ionicons name="cart-outline" size={18} color={colors.infoScale[400]} />
              </View>
              <Text style={s.stepLabel}>Buy this{'\n'}product</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.neutral[300]} style={s.chevronMarginTop} />
            <View style={s.stepItem}>
              <View style={[s.stepIcon, { backgroundColor: colors.successScale[50] }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.brand.greenDark} />
              </View>
              <Text style={s.stepLabel}>Order{'\n'}delivered</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.neutral[300]} style={s.chevronMarginTop} />
            <View style={s.stepItem}>
              <View style={[s.stepIcon, { backgroundColor: colors.tint.amber }]}>
                <CachedImage source={NUQTA_COIN} style={s.coinIcon18} />
              </View>
              <Text style={s.stepLabel}>Earn {estimatedCoins}{'\n'}{coinWord}</Text>
            </View>
          </View>
        </View>

        {/* ---- TAGS ---- */}
        {pick.tags && pick.tags.length > 0 && (
          <View style={[s.section, { paddingBottom: 14 }]}>
            <View style={s.tagsWrap}>
              {pick.tags.map((tag, i) => (
                <View key={i} style={s.tagChip}>
                  <Text style={s.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ---- SOCIAL PROOF ---- */}
        {(pick.views > 0 || (pick.likes && pick.likes > 0) || (pick.shares && pick.shares > 0)) && (
          <View style={s.socialRow}>
            {pick.views > 0 && (
              <View style={s.socialItem}>
                <Ionicons name="eye-outline" size={14} color={Colors.text.tertiary} />
                <Text style={s.socialText}>{fmt(pick.views)} viewed</Text>
              </View>
            )}
            {pick.likes !== undefined && pick.likes > 0 && (
              <View style={s.socialItem}>
                <Ionicons name="heart-outline" size={14} color={Colors.text.tertiary} />
                <Text style={s.socialText}>{fmt(pick.likes)} liked</Text>
              </View>
            )}
            {pick.shares !== undefined && pick.shares > 0 && (
              <View style={s.socialItem}>
                <Ionicons name="share-social-outline" size={14} color={Colors.text.tertiary} />
                <Text style={s.socialText}>{fmt(pick.shares)} shared</Text>
              </View>
            )}
          </View>
        )}

        {/* ---- RELATED PICKS ---- */}
        {relatedPicks.length > 0 && (
          <View style={s.relatedSection}>
            <Text style={s.relatedSectionTitle}>
              {pick.creator ? `More from ${pick.creator.name}` : 'You might also like'}
            </Text>
            <FlashList
              horizontal
              data={relatedPicks}
              renderItem={renderRelatedPick}
              keyExtractor={(item) => item.id}
          estimatedItemSize={150}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: 10 }}
            />
          </View>
        )}

      </ScrollView>

      {/* ---- FIXED BOTTOM CTA ---- */}
      <View style={s.bottomBar}>
        <Pressable style={s.ctaPressable} onPress={handleBuy}>
          <LinearGradient colors={[colors.brand.greenDark, colors.successScale[700]] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaInner}>
            <View style={s.flex1}>
              <Text style={s.ctaTitle}>Buy & Earn</Text>
              <Text style={s.ctaSub}>Purchase to earn {estimatedCoins} {coinWord}</Text>
            </View>
            <View style={s.ctaCoinBadge}>
              <CachedImage source={NUQTA_COIN} style={s.coinIcon22} />
              <Text style={s.ctaCoinNum}>+{estimatedCoins}</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.tint.warmGray },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing['2xl'] },

  // Image overlays
  imgTag: {
    position: 'absolute', top: Spacing.md, left: Spacing.md,
    backgroundColor: 'rgba(26,58,82,0.85)', paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: BorderRadius.lg,
  },
  imgTagText: { ...Typography.caption, fontWeight: '600', color: Colors.text.inverse },
  imgCoinOverlay: {
    position: 'absolute', bottom: Spacing.md, right: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(22,163,74,0.92)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18,
  },
  imgCoinText: { ...Typography.bodySmall, fontWeight: '700', color: Colors.text.inverse },

  // Product info
  infoCard: {
    backgroundColor: Colors.background.primary, paddingHorizontal: Spacing.lg, paddingTop: Spacing.base, paddingBottom: 14,
  },
  brand: { ...Typography.caption, fontWeight: '600', color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
  timeText: { ...Typography.caption, color: Colors.text.tertiary },
  title: { ...Typography.h4, fontWeight: '700', color: Colors.text.primary, marginBottom: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { ...Typography.h2, fontWeight: '800', color: Colors.nileBlue },
  coinPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.successScale[50], paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: colors.successScale[200],
  },
  coinPillNum: { fontSize: 15, fontWeight: '800', color: colors.brand.greenDark },
  coinPillLabel: { ...Typography.caption, color: colors.brand.greenDark },

  // Actions
  actionRow: {
    flexDirection: 'row', marginTop: 14, paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.background.secondary, gap: 6,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary, borderWidth: 1, borderColor: Colors.background.secondary,
  },
  actionLabel: { fontSize: 13, fontWeight: '500', color: Colors.text.tertiary },

  // Creator card
  creatorCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background.primary, marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: 14, gap: Spacing.md,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...Typography.h4, fontWeight: '700', color: Colors.text.inverse },
  creatorName: { ...Typography.body, fontWeight: '700', color: Colors.text.primary },
  creatorMeta: { ...Typography.caption, color: Colors.text.tertiary },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.tint.purpleLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm,
  },
  tierText: { ...Typography.overline, fontWeight: '600', color: Colors.nileBlue, textTransform: 'capitalize', letterSpacing: 0 },
  profileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.tint.purpleLight, paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: 10,
  },
  profileBtnText: { ...Typography.bodySmall, fontWeight: '600', color: Colors.nileBlue },

  // Section (description, how it works, tags)
  section: {
    backgroundColor: Colors.background.primary, marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.base, paddingBottom: 18,
  },
  sectionTitle: { ...Typography.body, fontWeight: '700', color: Colors.text.primary, marginBottom: 10 },
  noteText: { ...Typography.body, color: Colors.text.tertiary, lineHeight: 21 },

  // Store
  storeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.background.primary, marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: 14,
  },
  storeLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background.secondary },
  storeLabel: { ...Typography.overline, color: Colors.text.tertiary, letterSpacing: 0.5 },
  storeName: { ...Typography.body, fontWeight: '600', color: Colors.text.primary, marginTop: 1 },

  // How it works steps
  stepsRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 10,
  },
  stepItem: { alignItems: 'center', width: 80 },
  stepIcon: {
    width: 40, height: 40, borderRadius: BorderRadius.xl,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  stepLabel: { ...Typography.caption, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 15 },

  // Tags
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tagChip: { backgroundColor: Colors.background.secondary, paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: 14 },
  tagText: { ...Typography.bodySmall, fontWeight: '500', color: Colors.text.tertiary },

  // Social proof
  socialRow: {
    flexDirection: 'row', backgroundColor: Colors.background.primary, marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.base,
  },
  socialItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  socialText: { ...Typography.bodySmall, color: Colors.text.tertiary },

  // Related picks
  relCard: {
    width: 140, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.background.secondary, overflow: 'hidden',
  },
  relImg: { width: 140, height: 100, backgroundColor: Colors.background.secondary },
  relCoinBadge: {
    position: 'absolute', top: 6, right: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3,
  },
  relCoinText: { ...Typography.overline, fontWeight: '700', color: Colors.text.inverse, textTransform: 'none', letterSpacing: 0 },

  // Own pick management
  ownPickSection: {
    backgroundColor: Colors.background.primary, marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 10,
  },
  statusLabel: { fontSize: 13, fontWeight: '600', color: Colors.text.tertiary },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md,
  },
  statusText: { ...Typography.bodySmall, fontWeight: '600' },
  rejectionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: colors.errorScale[50], padding: 10, borderRadius: BorderRadius.sm, marginBottom: 10,
  },
  rejectionText: { flex: 1, ...Typography.bodySmall, color: Colors.error, lineHeight: 17 },
  ownPickActions: {
    flexDirection: 'row', gap: 10,
  },
  editPickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.background.secondary, borderWidth: 1, borderColor: Colors.border.default,
  },
  editPickText: { fontSize: 13, fontWeight: '600', color: Colors.nileBlue },
  deletePickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
    backgroundColor: colors.errorScale[50], borderWidth: 1, borderColor: colors.errorScale[200],
  },
  deletePickText: { fontSize: 13, fontWeight: '600', color: Colors.error },

  // Bottom CTA
  bottomBar: {
    paddingHorizontal: Spacing.base, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1, borderTopColor: Colors.border.default,
    ...Shadows.subtle,
    shadowOffset: { width: 0, height: -3 }, shadowRadius: 8, elevation: 10,
  },
  ctaInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 18,
  },
  ctaTitle: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text.inverse },
  ctaSub: { ...Typography.caption, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  ctaCoinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.lg,
  },
  ctaCoinNum: { ...Typography.bodyLarge, fontWeight: '800', color: Colors.text.inverse },

  // Extracted inline styles
  flex1: { flex: 1 },
  centeredContent: { justifyContent: 'center', alignItems: 'center' },
  scrollContentPadding: { paddingBottom: 110 },
  errorTitle: { fontSize: 17, fontWeight: '700', color: Colors.text.primary, marginTop: 14 },
  errorBody: { ...Typography.body, color: Colors.text.tertiary, textAlign: 'center', marginTop: 6, marginBottom: Spacing.lg, lineHeight: 20 },
  retryBtn: { backgroundColor: Colors.nileBlue, borderRadius: BorderRadius.md, paddingHorizontal: 28, paddingVertical: Spacing.md },
  retryBtnText: { color: Colors.text.inverse, fontWeight: '600', fontSize: 15 },
  videoBg: { backgroundColor: colors.text.primary },
  videoNoBorderRadius: { borderRadius: 0 },
  productImageContainer: { position: 'relative', backgroundColor: Colors.background.primary },
  imageFallback: { backgroundColor: Colors.background.secondary, justifyContent: 'center', alignItems: 'center' },
  brandTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  creatorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creatorMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  storeLogoPlaceholder: { backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center' },
  relatedSection: { marginTop: Spacing.sm, paddingTop: 18, paddingBottom: Spacing.md, backgroundColor: Colors.background.primary },
  relatedSectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, paddingHorizontal: Spacing.lg, marginBottom: 14 },
  relCardContent: { padding: 10 },
  relCardTitle: { ...Typography.bodySmall, fontWeight: '600', color: Colors.text.primary },
  relCardPrice: { fontSize: 13, fontWeight: '700', color: Colors.nileBlue, marginTop: Spacing.xs },
  ctaPressable: { flex: 1, borderRadius: BorderRadius.md, overflow: 'hidden' },
  coinIcon10: { width: 10, height: 10, borderRadius: 5 },
  coinIcon12: { width: 12, height: 12, borderRadius: 6 },
  coinIcon16: { width: 16, height: 16, borderRadius: 8 },
  coinIcon18: { width: 18, height: 18, borderRadius: 9 },
  coinIcon22: { width: 22, height: 22, borderRadius: 11 },
  chevronMarginTop: { marginTop: 8 },
});

export default withErrorBoundary(CreatorPickDetail, 'PicksId');
