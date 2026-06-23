// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Share to Earn Page
// Earn coins by sharing content

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Share,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import shareApi, { ShareableItem } from '../../services/shareApi';
import { platformAlert } from '@/utils/platformAlert';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

interface ShareableContent {
  id: string;
  type: 'offer' | 'product' | 'store' | 'referral';
  title: string;
  description: string;
  coins: number;
  shares: number;
  image: string;
}

const SHARE_PLATFORMS = [
  { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
  { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
  { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
  { id: 'twitter', name: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
  { id: 'copy', name: 'Copy Link', icon: 'copy-outline', color: Colors.gray[600] },
  { id: 'more', name: 'More', icon: 'share-outline', color: Colors.gray[600] },
];

function ShareToEarnPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [selectedContent, setSelectedContent] = useState<ShareableContent | null>(null);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalShares, setTotalShares] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shareableContent, setShareableContent] = useState<ShareableContent[]>([]);

  // Fetch share stats and real shareable content from backend
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const fetchData = async () => {
      try {
        const [statsRes, contentRes] = await Promise.all([
          shareApi.getShareStats(),
          shareApi.getShareableContent()
        ]);

        if (statsRes.data) {
          if (!isMounted()) return;
          setTotalEarned(statsRes.data.totalCoinsEarned);
          if (!isMounted()) return;
          setTotalShares(statsRes.data.totalShares);
        }

        if (contentRes.data) {
          const items: ShareableContent[] = [];
          // Add referral
          if (contentRes.data.referral) {
            items.push({
              id: 'referral',
              type: 'referral',
              title: 'Invite Friends',
              description: contentRes.data.referral.message,
              coins: contentRes.data.referral.reward.baseCoins,
              shares: 0,
              image: '',
            });
          }
          // Add stores
          contentRes.data.stores?.forEach((s: ShareableItem) => {
            items.push({
              id: s.id,
              type: 'store',
              title: s.name || 'Store',
              description: 'Share this store with friends',
              coins: s.reward?.baseCoins || 10,
              shares: 0,
              image: s.image || '',
            });
          });
          // Add offers
          contentRes.data.offers?.forEach((o: ShareableItem) => {
            items.push({
              id: o.id,
              type: 'offer',
              title: o.title || 'Offer',
              description: o.description || 'Share this deal',
              coins: o.reward?.baseCoins || 5,
              shares: 0,
              image: o.image || '',
            });
          });
          // Add products
          contentRes.data.products?.forEach((p: ShareableItem) => {
            items.push({
              id: p.id,
              type: 'product',
              title: p.name || 'Product',
              description: 'Check out this product',
              coins: p.reward?.baseCoins || 5,
              shares: 0,
              image: p.image || '',
            });
          });
          if (!isMounted()) return;
          setShareableContent(items);
        }
      } catch (error) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };
    fetchData();
  }, [authLoading, isAuthenticated]);

  const handleShare = async (content: ShareableContent, platform: string) => {
    try {
      const message = `Check out ${content.title} on ${BRAND.APP_NAME}! ${content.description}`;

      // Track share with backend
      const platformMap: { [key: string]: 'whatsapp' | 'facebook' | 'twitter' | 'instagram' | 'copy_link' | 'other' } = {
        'whatsapp': 'whatsapp',
        'facebook': 'facebook',
        'twitter': 'twitter',
        'instagram': 'instagram',
        'copy': 'copy_link',
        'more': 'other'
      };

      const contentTypeMap: { [key: string]: 'product' | 'store' | 'offer' | 'referral' } = {
        'product': 'product',
        'store': 'store',
        'offer': 'offer',
        'referral': 'referral'
      };

      await shareApi.createShare(
        contentTypeMap[content.type] || 'product',
        content.id,
        platformMap[platform] || 'other'
      );

      if (platform === 'copy') {
        platformAlert('Link copied to clipboard!');
      } else {
        await Share.share({
          message,
          title: content.title,
        });
      }

      if (!isMounted()) return;
      setTotalEarned(prev => prev + content.coins);
      if (!isMounted()) return;
      setTotalShares(prev => prev + 1);
      if (!isMounted()) return;
      setSelectedContent(null);
    } catch (error) {
      // silently handle
    }
  };

  const renderContent = useCallback(({ item }: { item: ShareableContent }) => (
    <Pressable
      style={styles.contentCard}
      onPress={() => setSelectedContent(item)}
    >
      <View style={styles.contentImage}>
        {item.image ? (
          <CachedImage source={item.image} style={styles.contentImg} />
        ) : (
          <Ionicons
            name={item.type === 'referral' ? 'people' : item.type === 'store' ? 'storefront' : item.type === 'offer' ? 'pricetag' : 'cube'}
            size={28}
            color={Colors.gray[400]}
          />
        )}
      </View>
      <View style={styles.contentInfo}>
        <View style={styles.contentHeader}>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + '20' }]}>
            <ThemedText style={[styles.typeText, { color: getTypeColor(item.type) }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </ThemedText>
          </View>
          {item.shares > 0 && (
            <ThemedText style={styles.sharesText}>{item.shares} shares</ThemedText>
          )}
        </View>
        <ThemedText style={styles.contentTitle}>{item.title}</ThemedText>
        <ThemedText style={styles.contentDesc}>{item.description}</ThemedText>
        <View style={styles.coinsBadge}>
          <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 14, height: 14 }} />
          <ThemedText style={styles.coinsText}>Earn {item.coins} {BRAND.COIN_SHORT}</ThemedText>
        </View>
      </View>
      <Pressable style={styles.shareButton}>
        <Ionicons name="share-social" size={20} color={Colors.primary[600]} />
      </Pressable>
    </Pressable>
  ), []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'referral': return Colors.gold;
      case 'offer': return Colors.success;
      case 'product': return Colors.primary[600];
      case 'store': return Colors.info;
      default: return Colors.gray[500];
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Share & Earn</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{totalEarned} {BRAND.COIN_SHORT}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Earned</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{totalShares}</ThemedText>
            <ThemedText style={styles.statLabel}>Shares</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <CardGridSkeleton />
      ) : (
      <FlashList
        data={shareableContent}
        renderItem={renderContent}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.howItWorks}>
            <ThemedText style={styles.sectionTitle}>How it works</ThemedText>
            <View style={styles.stepsContainer}>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <ThemedText style={styles.stepNumberText}>1</ThemedText>
                </View>
                <ThemedText style={styles.stepText}>Choose content to share</ThemedText>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <ThemedText style={styles.stepNumberText}>2</ThemedText>
                </View>
                <ThemedText style={styles.stepText}>Share on social media</ThemedText>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <ThemedText style={styles.stepNumberText}>3</ThemedText>
                </View>
                <ThemedText style={styles.stepText}>{`Earn ${BRAND.COIN_NAME} instantly`}</ThemedText>
              </View>
            </View>
          </View>
        }
        estimatedItemSize={120}
      />
      )}

      {/* Share Modal */}
      {selectedContent && (
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSelectedContent(null)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Share & Earn {selectedContent.coins} {BRAND.COIN_SHORT}</ThemedText>
              <Pressable onPress={() => setSelectedContent(null)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </Pressable>
            </View>

            <View style={styles.sharePreview}>
              <View style={styles.previewImage}>
                {selectedContent.image ? (
                  <CachedImage source={selectedContent.image} style={styles.previewImg} />
                ) : (
                  <Ionicons
                    name={selectedContent.type === 'referral' ? 'people' : selectedContent.type === 'store' ? 'storefront' : selectedContent.type === 'offer' ? 'pricetag' : 'cube'}
                    size={32}
                    color={Colors.gray[400]}
                  />
                )}
              </View>
              <ThemedText style={styles.previewTitle}>{selectedContent.title}</ThemedText>
              <ThemedText style={styles.previewDesc}>{selectedContent.description}</ThemedText>
            </View>

            <View style={styles.platformsGrid}>
              {SHARE_PLATFORMS.map(platform => (
                <Pressable
                  key={platform.id}
                  style={styles.platformButton}
                  onPress={() => handleShare(selectedContent, platform.id)}
                >
                  <View style={[styles.platformIcon, { backgroundColor: platform.color + '20' }]}>
                    <Ionicons name={platform.icon as any} size={24} color={platform.color} />
                  </View>
                  <ThemedText style={styles.platformName}>{platform.name}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
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
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    color: colors.background.primary,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: Spacing.sm,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  howItWorks: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.subtle,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  step: {
    flex: 1,
    alignItems: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stepNumberText: {
    ...Typography.label,
    color: colors.background.primary,
  },
  stepText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  stepLine: {
    width: 20,
    height: 2,
    backgroundColor: Colors.primary[200],
    marginBottom: 20,
  },
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  contentImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentImg: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
  },
  contentInfo: {
    flex: 1,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  typeBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  typeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  sharesText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  contentTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  contentDesc: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  coinsText: {
    ...Typography.labelSmall,
    color: Colors.gold,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? Spacing['3xl'] : Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  sharePreview: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.gray[50],
    borderRadius: BorderRadius.lg,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  previewImg: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
  },
  previewTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  previewDesc: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  platformButton: {
    width: '30%',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  platformIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformName: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
});

export default withErrorBoundary(ShareToEarnPage, 'EarnShare');
