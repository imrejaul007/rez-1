// @ts-nocheck
// Public Wishlist View Component
// Displays a shared wishlist with social features

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import wishlistSharingService, {
  PublicWishlist,
  GiftReservation,
} from '@/services/wishlistSharingApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

interface PublicWishlistViewProps {
  shareCode: string;
  onBack?: () => void;
}

function PublicWishlistView({
  shareCode,
  onBack,
}: PublicWishlistViewProps) {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [wishlist, setWishlist] = useState<PublicWishlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [comment, setComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [reservations, setReservations] = useState<GiftReservation[]>([]);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadWishlist();
    loadReservations();
  }, [shareCode]);

  const loadWishlist = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await wishlistSharingService.getPublicWishlist(shareCode);

      if (!response.success || !response.data) {
        throw new Error('Wishlist not found');
      }

      if (!isMounted()) return;
      setWishlist(response.data);
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load wishlist');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [shareCode]);

  const loadReservations = useCallback(async () => {
    try {
      const response = await wishlistSharingService.getGiftReservations(shareCode);
      if (response.success && response.data) {
        if (!isMounted()) return;
        setReservations(response.data);
      }
    } catch (err) {
      // silently handle
    }
  }, [shareCode]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadWishlist();
    loadReservations();
  }, [loadWishlist, loadReservations]);

  const handleLike = useCallback(async () => {
    try {
      const response = isLiked
        ? await wishlistSharingService.unlikeWishlist(shareCode)
        : await wishlistSharingService.likeWishlist(shareCode);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setIsLiked(response.data.liked);
        if (wishlist) {
          if (!isMounted()) return;
          setWishlist({
            ...wishlist,
            likes: response.data.likes,
          });
        }
      }
    } catch (err) {
      platformAlertSimple('Error', 'Failed to like wishlist');
    }
  }, [shareCode, isLiked, wishlist]);

  const handleComment = useCallback(async () => {
    if (!comment.trim()) return;

    try {
      setIsPosting(true);
      const response = await wishlistSharingService.addComment(shareCode, comment);

      if (response.success && response.data) {
        if (wishlist) {
          if (!isMounted()) return;
          setWishlist({
            ...wishlist,
            comments: [...wishlist.comments, response.data],
          });
        }
        if (!isMounted()) return;
        setComment('');
        platformAlertSimple('Success', 'Comment posted!');
      }
    } catch (err) {
      platformAlertSimple('Error', 'Failed to post comment');
    } finally {
      if (!isMounted()) return;
      setIsPosting(false);
    }
  }, [shareCode, comment, wishlist]);

  const handleReserveGift = useCallback(
    async (itemId: string) => {
      try {
        const response = await wishlistSharingService.reserveGift(shareCode, itemId, {
          anonymous: false,
        });

        if (response.success && response.data) {
          if (!isMounted()) return;
          setReservations([...reservations, response.data]);
          platformAlertSimple('Success', 'Gift reserved! The owner will be notified.');
        }
      } catch (err) {
        platformAlertSimple('Error', 'Failed to reserve gift');
      }
    },
    [shareCode, reservations]
  );

  const handleAddToMyWishlist = useCallback(
    async (itemId: string) => {
      try {
        const response = await wishlistSharingService.addToMyWishlist(shareCode, itemId);

        if (response.success) {
          platformAlertSimple('Success', 'Item added to your wishlist!');
        }
      } catch (err) {
        platformAlertSimple('Error', 'Failed to add to your wishlist');
      }
    },
    [shareCode]
  );

  const isItemReserved = useCallback(
    (itemId: string) => {
      return reservations.some(
        (r) => r.itemId === itemId && r.status === 'reserved'
      );
    },
    [reservations]
  );

  const renderWishlistHeader = () => {
    if (!wishlist) return null;

    return (
      <LinearGradient
        colors={[colors.brand.purpleLight, colors.brand.purple]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {onBack && (
          <Pressable style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
        )}

        <View style={styles.ownerInfo}>
          {wishlist.owner.avatar ? (
            <CachedImage source={wishlist.owner.avatar} style={styles.ownerAvatar} />
          ) : (
            <View style={[styles.ownerAvatar, styles.ownerAvatarPlaceholder]}>
              <ThemedText style={styles.ownerInitial}>
                {wishlist.owner.name.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <View style={styles.ownerDetails}>
            <View style={styles.ownerNameRow}>
              <ThemedText style={styles.ownerName}>{wishlist.owner.name}</ThemedText>
              {wishlist.owner.verified && (
                <Ionicons name="checkmark-circle" size={16} color={colors.lightMustard} />
              )}
            </View>
            <ThemedText style={styles.wishlistName}>{wishlist.name}</ThemedText>
            {wishlist.description && (
              <ThemedText style={styles.wishlistDescription}>
                {wishlist.description}
              </ThemedText>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{wishlist.itemCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Items</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{wishlist.likes}</ThemedText>
            <ThemedText style={styles.statLabel}>Likes</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{wishlist.views}</ThemedText>
            <ThemedText style={styles.statLabel}>Views</ThemedText>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionButton, isLiked && styles.actionButtonLiked]}
            onPress={handleLike}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? colors.error : colors.background.primary}
            />
            <ThemedText style={[styles.actionButtonText, isLiked && styles.actionButtonTextLiked]}>
              {isLiked ? 'Liked' : 'Like'}
            </ThemedText>
          </Pressable>

          <Pressable style={styles.actionButton}>
            <Ionicons name="share-outline" size={20} color={colors.background.primary} />
            <ThemedText style={styles.actionButtonText}>Share</ThemedText>
          </Pressable>
        </View>
      </LinearGradient>
    );
  };

  const renderItem = ({ item }: { item: PublicWishlist['items'][0] }) => {
    const reserved = isItemReserved(item.id);

    return (
      <View style={styles.itemCard}>
        <CachedImage source={item.image} style={styles.itemImage} />

        {reserved && (
          <View style={styles.reservedBadge}>
            <Ionicons name="gift" size={16} color={colors.background.primary} />
            <ThemedText style={styles.reservedText}>Reserved</ThemedText>
          </View>
        )}

        <View style={styles.itemDetails}>
          <ThemedText style={styles.itemName} numberOfLines={2}>
            {item.name}
          </ThemedText>

          {wishlist?.isPublic && (
            <View style={styles.itemPriceRow}>
              <ThemedText style={styles.itemPrice}>
                {currencySymbol}{item.price.toLocaleString()}
              </ThemedText>
              {item.originalPrice && (
                <ThemedText style={styles.itemOriginalPrice}>
                  {currencySymbol}{item.originalPrice.toLocaleString()}
                </ThemedText>
              )}
              {item.discount && (
                <View style={styles.discountBadge}>
                  <ThemedText style={styles.discountText}>{item.discount}% OFF</ThemedText>
                </View>
              )}
            </View>
          )}

          <View style={styles.itemFooter}>
            <View
              style={[
                styles.stockBadge,
                { backgroundColor: item.inStock ? colors.lightMustard : colors.error },
              ]}
            >
              <ThemedText style={styles.stockText}>
                {item.inStock ? 'In Stock' : 'Out of Stock'}
              </ThemedText>
            </View>

            {item.rating && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color={colors.warningScale[400]} />
                <ThemedText style={styles.ratingText}>{item.rating.toFixed(1)}</ThemedText>
              </View>
            )}
          </View>

          <View style={styles.itemActions}>
            {!reserved && (
              <Pressable
                style={styles.itemActionButton}
                onPress={() => handleReserveGift(item.id)}
              >
                <Ionicons name="gift-outline" size={18} color={colors.brand.purpleLight} />
                <ThemedText style={styles.itemActionText}>Buy as Gift</ThemedText>
              </Pressable>
            )}

            <Pressable
              style={styles.itemActionButton}
              onPress={() => handleAddToMyWishlist(item.id)}
            >
              <Ionicons name="heart-outline" size={18} color={colors.brand.purpleLight} />
              <ThemedText style={styles.itemActionText}>Add to Mine</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderComments = () => {
    if (!wishlist?.comments || wishlist.comments.length === 0) return null;

    return (
      <View style={styles.commentsSection}>
        <ThemedText style={styles.commentsTitle}>Comments</ThemedText>
        {wishlist.comments.map((c) => (
          <View key={c.id} style={styles.commentCard}>
            <View style={styles.commentHeader}>
              {c.user.avatar ? (
                <CachedImage source={c.user.avatar} style={styles.commentAvatar} />
              ) : (
                <View style={[styles.commentAvatar, styles.commentAvatarPlaceholder]}>
                  <ThemedText style={styles.commentInitial}>
                    {c.user.name.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
              )}
              <View style={styles.commentInfo}>
                <ThemedText style={styles.commentAuthor}>{c.user.name}</ThemedText>
                <ThemedText style={styles.commentTime}>
                  {new Date(c.createdAt).toLocaleDateString()}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={styles.commentText}>{c.text}</ThemedText>
          </View>
        ))}
      </View>
    );
  };

  const renderCommentInput = () => {
    if (!wishlist?.isPublic) return null;

    return (
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor={colors.neutral[400]}
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <Pressable
          style={[styles.commentPostButton, !comment.trim() && styles.commentPostButtonDisabled]}
          onPress={handleComment}
          disabled={!comment.trim() || isPosting}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color={colors.background.primary} />
          ) : (
            <Ionicons name="send" size={20} color={colors.background.primary} />
          )}
        </Pressable>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.purpleLight} />
        <ThemedText style={styles.loadingText}>Loading wishlist...</ThemedText>
      </View>
    );
  }

  if (error || !wishlist) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <ThemedText style={styles.errorTitle}>Wishlist Not Found</ThemedText>
        <ThemedText style={styles.errorText}>
          {error || 'This wishlist might have been removed or is no longer available.'}
        </ThemedText>
        {onBack && (
          <Pressable style={styles.errorButton} onPress={onBack}>
            <ThemedText style={styles.errorButtonText}>Go Back</ThemedText>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderWishlistHeader()}

      <FlashList
        data={wishlist.items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.itemsList}
        estimatedItemSize={100}
        ListFooterComponent={
          <>
            {renderComments()}
            {renderCommentInput()}
            <View style={styles.bottomSpace} />
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand.purpleLight}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  ownerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: colors.background.primary,
  },
  ownerAvatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.background.primary,
  },
  ownerDetails: {
    flex: 1,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  wishlistName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.background.primary,
    marginBottom: 4,
  },
  wishlistDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.background.primary,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonLiked: {
    backgroundColor: colors.background.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
  actionButtonTextLiked: {
    color: colors.error,
  },
  itemsList: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  itemImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.neutral[200],
  },
  reservedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brand.purpleLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reservedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background.primary,
  },
  itemDetails: {
    padding: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 8,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.brand.purpleLight,
  },
  itemOriginalPrice: {
    fontSize: 14,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.background.primary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  itemActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.tint.pink,
    paddingVertical: 10,
    borderRadius: 8,
  },
  itemActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
  commentsSection: {
    marginTop: 24,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[800],
    marginBottom: 16,
  },
  commentCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentAvatarPlaceholder: {
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentInitial: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.neutral[500],
  },
  commentInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  commentTime: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  commentText: {
    fontSize: 14,
    color: colors.neutral[600],
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: colors.background.primary,
    borderRadius: 24,
    padding: 8,
    marginTop: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.neutral[800],
    maxHeight: 100,
  },
  commentPostButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentPostButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  loadingText: {
    fontSize: 16,
    color: colors.neutral[500],
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.neutral[50],
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.neutral[800],
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: colors.brand.purpleLight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
  bottomSpace: {
    height: 40,
  },
});

export default React.memo(PublicWishlistView);
