// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Double Cashback Campaigns Page
// Shows active 2X/3X/5X cashback campaigns from admin

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  RefreshControl,
  Text,
  Share,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import cashStoreApi from '../../services/cashStoreApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────
interface Campaign {
  _id: string;
  title: string;
  subtitle: string;
  description?: string;
  multiplier: number;
  startTime: string;
  endTime: string;
  eligibleStores: string[];
  eligibleStoreNames?: string[];
  eligibleCategories?: string[];
  terms: string[];
  backgroundColor?: string;
  minOrderValue?: number;
  maxCashback?: number;
  isActive: boolean;
}

// ─── Helpers ────────────────────────────────────────────────
function getTimeLeft(endTime: string) {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const ms = end - now;
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
    expired: false,
  };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function getGradient(bg?: string): [string, string] {
  if (bg) {
    const num = parseInt(bg.replace('#', ''), 16);
    if (!isNaN(num)) {
      const r = Math.max(0, (num >> 16) - 30);
      const g = Math.max(0, ((num >> 8) & 0xff) - 30);
      const b = Math.max(0, (num & 0xff) - 30);
      return [bg, `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`];
    }
  }
  return [Colors.nileBlue, '#0f2536'];
}

const CATEGORY_ICONS: Record<string, string> = {
  'food': 'restaurant', 'food-dining': 'restaurant', 'dining': 'restaurant',
  'shopping': 'bag', 'fashion': 'shirt', 'electronics': 'phone-portrait',
  'travel': 'airplane', 'entertainment': 'film', 'health': 'fitness',
  'beauty': 'color-palette', 'groceries': 'cart', 'default': 'storefront',
};

function getCategoryIcon(cat: string): string {
  const key = cat.toLowerCase().replace(/\s+/g, '-');
  return CATEGORY_ICONS[key] || CATEGORY_ICONS['default'];
}

// ─── Component ──────────────────────────────────────────────
function DoubleCashbackPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Countdown timer — re-render every second
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      setError(null);
      const data = await cashStoreApi.getDoubleCampaigns();
      const arr = Array.isArray(data) ? data : [];
      const now = Date.now();
      const active = arr.filter((c: Campaign) => {
        const start = new Date(c.startTime).getTime();
        const end = new Date(c.endTime).getTime();
        return c.isActive && start <= now && end > now;
      });
      if (!isMounted()) return;
      setCampaigns(active);
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load campaigns');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, []);

  const handleRefresh = () => { setRefreshing(true); fetchCampaigns(); };

  const handleShare = async (campaign: Campaign) => {
    try {
      await Share.share({
        message: `${campaign.multiplier}X Cashback! ${campaign.title} - ${campaign.subtitle}. Shop now and earn extra cashback!`,
      });
    } catch {}
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  // ─── Loading State ──────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[colors.nileBlue, '#0f2536']} style={styles.loadingContainer}>
          <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
          </Pressable>
          <CardGridSkeleton />
        </LinearGradient>
      </View>
    );
  }

  // ─── Empty State ────────────────────────────────────────────
  if (campaigns.length === 0 && !loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[colors.nileBlue, '#0f2536']} style={styles.loadingContainer}>
          <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="flash-outline" size={40} color="rgba(255,255,255,0.4)" />
            </View>
            <Text style={styles.emptyTitle}>No Active Double Cashback</Text>
            <Text style={styles.emptySubtext}>Check back soon for exciting double cashback offers!</Text>
            <Pressable style={styles.refreshBtn} onPress={fetchCampaigns}>
              <Ionicons name="refresh" size={18} color={Colors.text.inverse} />
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ─── Main Render ────────────────────────────────────────────
  const heroCampaign = campaigns[0];
  const heroTime = getTimeLeft(heroCampaign.endTime);
  const heroGradient = getGradient(heroCampaign.backgroundColor);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.background.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Campaign */}
        <LinearGradient colors={heroGradient} style={styles.hero}>
          <View style={styles.heroHeader}>
            <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
            </Pressable>
            <Text style={styles.heroHeaderTitle}>Double Cashback</Text>
            <Pressable style={styles.backBtn} onPress={() => handleShare(heroCampaign)}>
              <Ionicons name="share-social" size={20} color={Colors.text.inverse} />
            </Pressable>
          </View>

          {/* Multiplier with glow */}
          <View style={styles.heroCenter}>
            <View style={styles.multiplierGlow}>
              <View style={styles.multiplierCircle}>
                <Text style={styles.multiplierValue}>{heroCampaign.multiplier}X</Text>
              </View>
            </View>
            <Text style={styles.heroLabel}>CASHBACK</Text>
            <Text style={styles.heroTitle}>{heroCampaign.title}</Text>
            <Text style={styles.heroSubtitle}>{heroCampaign.subtitle}</Text>
          </View>

          {/* Countdown */}
          {!heroTime.expired && (
            <View style={styles.timerWrap}>
              <Text style={styles.timerLabel}>Ends in</Text>
              <View style={styles.timerBoxes}>
                {heroTime.days > 0 && (
                  <>
                    <View style={styles.timerBox}>
                      <Text style={styles.timerValue}>{pad(heroTime.days)}</Text>
                      <Text style={styles.timerUnit}>days</Text>
                    </View>
                    <Text style={styles.timerSep}>:</Text>
                  </>
                )}
                <View style={styles.timerBox}>
                  <Text style={styles.timerValue}>{pad(heroTime.hours)}</Text>
                  <Text style={styles.timerUnit}>hrs</Text>
                </View>
                <Text style={styles.timerSep}>:</Text>
                <View style={styles.timerBox}>
                  <Text style={styles.timerValue}>{pad(heroTime.minutes)}</Text>
                  <Text style={styles.timerUnit}>min</Text>
                </View>
                <Text style={styles.timerSep}>:</Text>
                <View style={styles.timerBox}>
                  <Text style={styles.timerValue}>{pad(heroTime.seconds)}</Text>
                  <Text style={styles.timerUnit}>sec</Text>
                </View>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Campaign Details */}
        <View style={styles.content}>
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={18} color={Colors.info} />
            <Text style={styles.infoText}>
              {heroCampaign.description || `Get ${heroCampaign.multiplier}X cashback on all eligible purchases during this campaign.`}
            </Text>
          </View>

          {/* Campaign Stats */}
          <View style={styles.statsRow}>
            {heroCampaign.minOrderValue ? (
              <View style={styles.statCard}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="cart-outline" size={18} color={Colors.nileBlue} />
                </View>
                <Text style={styles.statValue}>Min. Order</Text>
                <Text style={styles.statLabel}>{currencySymbol}{heroCampaign.minOrderValue}</Text>
              </View>
            ) : null}
            {heroCampaign.maxCashback ? (
              <View style={styles.statCard}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="wallet-outline" size={18} color={Colors.nileBlue} />
                </View>
                <Text style={styles.statValue}>Max Cashback</Text>
                <Text style={styles.statLabel}>{currencySymbol}{heroCampaign.maxCashback}</Text>
              </View>
            ) : null}
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="calendar-outline" size={18} color={Colors.nileBlue} />
              </View>
              <Text style={styles.statValue}>Valid Till</Text>
              <Text style={styles.statLabel}>{formatDate(heroCampaign.endTime)}</Text>
            </View>
          </View>

          {/* Browse Stores CTA */}
          <Pressable onPress={() => router.push('/explore' as any)}>
            <LinearGradient
              colors={heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBanner}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Start Shopping Now</Text>
                <Text style={styles.ctaSubtitle}>Browse participating stores & earn {heroCampaign.multiplier}X cashback</Text>
              </View>
              <View style={styles.ctaArrow}>
                <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
              </View>
            </LinearGradient>
          </Pressable>

          {/* Eligible Categories */}
          {heroCampaign.eligibleCategories && heroCampaign.eligibleCategories.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="grid" size={18} color={Colors.brand.purpleLight} />
                <Text style={styles.sectionTitle}>Eligible Categories</Text>
              </View>
              <View style={styles.categoryGrid}>
                {heroCampaign.eligibleCategories.map((cat, idx) => (
                  <View key={idx} style={styles.categoryCard}>
                    <View style={styles.categoryIconWrap}>
                      <Ionicons name={getCategoryIcon(cat) as any} size={22} color={Colors.nileBlue} />
                    </View>
                    <Text style={styles.categoryName}>{cat}</Text>
                    <Text style={styles.categoryMultiplier}>{heroCampaign.multiplier}X</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Participating Stores */}
          {heroCampaign.eligibleStoreNames && heroCampaign.eligibleStoreNames.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="storefront" size={18} color={Colors.info} />
                <Text style={styles.sectionTitle}>Participating Stores</Text>
              </View>
              <View style={styles.storeGrid}>
                {heroCampaign.eligibleStoreNames.map((name, idx) => (
                  <View key={idx} style={styles.storeCard}>
                    <View style={styles.storeIconWrap}>
                      <Ionicons name="storefront-outline" size={20} color={Colors.info} />
                    </View>
                    <Text style={styles.storeName} numberOfLines={1}>{name}</Text>
                    <View style={styles.storeMultiplierBadge}>
                      <Text style={styles.storeMultiplierText}>{heroCampaign.multiplier}X</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* How It Works */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="help-circle" size={18} color={Colors.warning} />
              <Text style={styles.sectionTitle}>How It Works</Text>
            </View>
            <View style={styles.howItWorksCard}>
              {[
                { num: '1', icon: 'storefront', title: 'Shop at Participating Stores', desc: 'Browse eligible stores and shop normally' },
                { num: '2', icon: 'flash', title: `Get ${heroCampaign.multiplier}X Cashback`, desc: 'Cashback is automatically multiplied — no coupon needed' },
                { num: '3', icon: 'wallet', title: 'Coins Credited to Wallet', desc: 'Cashback coins are added to your wallet within 24 hours' },
              ].map((step, idx) => (
                <View key={idx} style={[styles.stepRow, idx < 2 && styles.stepBorder]}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{step.num}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Terms */}
          {heroCampaign.terms && heroCampaign.terms.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={18} color={Colors.text.tertiary} />
                <Text style={styles.sectionTitle}>Terms & Conditions</Text>
              </View>
              <View style={styles.termsCard}>
                {heroCampaign.terms.map((term, idx) => (
                  <View key={idx} style={styles.termRow}>
                    <Text style={styles.termBullet}>{idx + 1}.</Text>
                    <Text style={styles.termText}>{term}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Other Campaigns */}
          {campaigns.length > 1 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flash" size={18} color={colors.brand.orange} />
                <Text style={styles.sectionTitle}>More Double Cashback</Text>
              </View>
              {campaigns.slice(1).map((c) => {
                const tl = getTimeLeft(c.endTime);
                const grad = getGradient(c.backgroundColor);
                return (
                  <View key={c._id} style={styles.otherCard}>
                    <LinearGradient colors={grad} style={styles.otherGradient}>
                      <View style={styles.otherMultiplier}>
                        <Text style={styles.otherMultiplierText}>{c.multiplier}X</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.otherTitle}>{c.title}</Text>
                        <Text style={styles.otherSubtitle}>{c.subtitle}</Text>
                        {!tl.expired && (
                          <Text style={styles.otherTimer}>
                            {tl.days > 0 ? `${tl.days}d ` : ''}{tl.hours}h {tl.minutes}m left
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
                    </LinearGradient>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },

  // Loading / Empty
  loadingContainer: { flex: 1, paddingHorizontal: Spacing.lg },
  loadingText: { color: 'rgba(255,255,255,0.7)', ...Typography.body, textAlign: 'center', marginTop: Spacing.base },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.base },
  emptyTitle: { color: Colors.text.inverse, ...Typography.h4, fontWeight: '700', marginBottom: Spacing.sm },
  emptySubtext: { color: 'rgba(255,255,255,0.6)', ...Typography.body, textAlign: 'center', maxWidth: 260 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: BorderRadius.xl, marginTop: Spacing.xl },
  refreshBtnText: { color: Colors.text.inverse, fontWeight: '600', ...Typography.body },

  // Hero
  hero: { paddingBottom: 24 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  heroHeaderTitle: { color: Colors.text.inverse, fontSize: 17, fontWeight: '700' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  heroCenter: { alignItems: 'center', paddingVertical: Spacing.md },
  multiplierGlow: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  multiplierCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.background.primary, justifyContent: 'center', alignItems: 'center' },
  multiplierValue: { fontSize: 30, fontWeight: '900', color: Colors.nileBlue },
  heroLabel: { ...Typography.h4, fontWeight: '900', color: Colors.text.inverse, letterSpacing: 4, marginBottom: 6 },
  heroTitle: { ...Typography.h4, fontWeight: '700', color: Colors.text.inverse, textAlign: 'center', marginBottom: Spacing.xs },
  heroSubtitle: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)', textAlign: 'center', paddingHorizontal: Spacing.lg },

  // Timer
  timerWrap: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', marginHorizontal: Spacing.lg, borderRadius: 14, padding: 14 },
  timerLabel: { color: 'rgba(255,255,255,0.7)', ...Typography.bodySmall, fontWeight: '600', marginBottom: Spacing.sm },
  timerBoxes: { flexDirection: 'row', alignItems: 'center' },
  timerBox: { alignItems: 'center', backgroundColor: Colors.background.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, minWidth: 54 },
  timerValue: { ...Typography.h3, fontWeight: '800', color: Colors.nileBlue },
  timerUnit: { ...Typography.overline, color: Colors.text.tertiary, fontWeight: '600', marginTop: 1 },
  timerSep: { ...Typography.h3, fontWeight: '800', color: Colors.text.inverse, marginHorizontal: 6 },

  // Content
  content: { padding: Spacing.base },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.infoScale[50], borderRadius: BorderRadius.md, padding: 14, marginBottom: Spacing.base },
  infoText: { flex: 1, ...Typography.bodySmall, color: Colors.text.secondary, lineHeight: 20 },

  // CTA
  ctaBanner: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 14, marginBottom: Spacing.lg },
  ctaTitle: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text.inverse, marginBottom: 2 },
  ctaSubtitle: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)' },
  ctaArrow: { width: 40, height: 40, borderRadius: BorderRadius.xl, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.base },
  statCard: { flex: 1, backgroundColor: Colors.background.primary, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.background.secondary },
  statIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.infoScale[50], justifyContent: 'center', alignItems: 'center' },
  statValue: { ...Typography.caption, color: Colors.text.tertiary, fontWeight: '600' },
  statLabel: { ...Typography.body, color: Colors.nileBlue, fontWeight: '700' },

  // Sections
  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text.primary },

  // Category Grid
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: { width: (width - 32 - 20) / 3, backgroundColor: Colors.background.primary, borderRadius: 14, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.background.secondary },
  categoryIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.infoScale[50], justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  categoryName: { ...Typography.caption, fontWeight: '600', color: Colors.text.secondary, textAlign: 'center', marginBottom: Spacing.xs },
  categoryMultiplier: { ...Typography.body, fontWeight: '800', color: Colors.success },

  // Store Grid
  storeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  storeCard: { width: (width - 32 - 10) / 2, backgroundColor: Colors.background.primary, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.background.secondary },
  storeIconWrap: { width: 40, height: 40, borderRadius: BorderRadius.md, backgroundColor: Colors.infoScale[50], justifyContent: 'center', alignItems: 'center' },
  storeName: { flex: 1, ...Typography.bodySmall, fontWeight: '600', color: Colors.text.primary },
  storeMultiplierBadge: { backgroundColor: Colors.successScale[50], paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm },
  storeMultiplierText: { ...Typography.caption, fontWeight: '800', color: Colors.success },

  // How It Works
  howItWorksCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.background.secondary },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.md },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: Colors.background.secondary },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.nileBlue, justifyContent: 'center', alignItems: 'center' },
  stepNumText: { ...Typography.bodySmall, fontWeight: '700', color: Colors.text.inverse },
  stepTitle: { ...Typography.body, fontWeight: '600', color: Colors.text.primary, marginBottom: 2 },
  stepDesc: { ...Typography.bodySmall, color: Colors.text.tertiary, lineHeight: 18 },

  // Terms
  termsCard: { backgroundColor: Colors.background.primary, borderRadius: 14, padding: Spacing.base, borderWidth: 1, borderColor: Colors.background.secondary },
  termRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  termBullet: { ...Typography.bodySmall, color: Colors.text.tertiary, fontWeight: '600', width: 20 },
  termText: { flex: 1, ...Typography.bodySmall, color: Colors.text.tertiary, lineHeight: 19 },

  // Other Campaigns
  otherCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  otherGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  otherMultiplier: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  otherMultiplierText: { ...Typography.h4, fontWeight: '900', color: Colors.text.inverse },
  otherTitle: { ...Typography.body, fontWeight: '700', color: Colors.text.inverse },
  otherSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  otherTimer: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: '600' },
});

export default withErrorBoundary(DoubleCashbackPage, 'OffersDoubleCashback');
