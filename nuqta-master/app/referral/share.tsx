// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Share as RNShare,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { ThemedText } from '@/components/ThemedText';
import referralTierApi from '@/services/referralTierApi';
import { useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import { REFERRAL_TIERS, SHARE_TEMPLATES, type ShareTemplate } from '@/types/referral.types';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { safeOpenURL } from '@/utils/linking';

function ReferralSharePage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [currentTier, setCurrentTier] = useState('STARTER');
  const isMounted = useIsMounted();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadData();
  }, [isAuthenticated, authLoading]);

  const loadData = async () => {
    try {
      setLoading(true);
      const qrData = await referralTierApi.generateQR();
      if (qrData) {
        setReferralCode(qrData.referralCode || '');
        setReferralLink(qrData.referralLink || '');
        setQrCode(qrData.qrCode || qrData.referralLink || '');
      }

      try {
        const tierData = await referralTierApi.getTier();
        if (tierData?.currentTier) {
          setCurrentTier(tierData.currentTier);
        }
      } catch {
        // Non-critical, keep default tier
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to load referral data');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    if (!isMounted()) return;
    setIsCopied(true);
    platformAlertSimple('Copied!', 'Referral code copied to clipboard');
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleCopyLink = async () => {
    if (!referralLink) return;
    await Clipboard.setStringAsync(referralLink);
    platformAlertSimple('Copied!', 'Referral link copied to clipboard');
  };

  const handleShare = async (template: ShareTemplate) => {
    try {
      const message = template.message
        .replace(/{CODE}/g, referralCode)
        .replace(/{LINK}/g, referralLink);

      switch (template.type) {
        case 'whatsapp': {
          const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await safeOpenURL(url);
          } else {
            await RNShare.share({ message, title: `Join ${BRAND.APP_NAME}` });
          }
          break;
        }
        case 'telegram': {
          const url = `tg://msg?text=${encodeURIComponent(message)}`;
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await safeOpenURL(url);
          } else {
            await RNShare.share({ message, title: `Join ${BRAND.APP_NAME}` });
          }
          break;
        }
        case 'email': {
          const url = `mailto:?subject=${encodeURIComponent(template.subject || '')}&body=${encodeURIComponent(message)}`;
          await safeOpenURL(url);
          break;
        }
        case 'sms': {
          const url = `sms:?body=${encodeURIComponent(message)}`;
          await safeOpenURL(url);
          break;
        }
        default:
          await RNShare.share({ message, title: `Join ${BRAND.APP_NAME}` });
      }
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        platformAlertSimple('Error', 'Could not open share dialog');
      }
    }
  };

  const tierData = REFERRAL_TIERS[currentTier];
  const perReferral = tierData?.rewards?.perReferral || 50;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <CardGridSkeleton />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <LinearGradient colors={[Colors.brand.purple, Colors.brand.purpleLight || '#a78bfa']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <Text style={styles.headerTitle}>Share & Earn</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>
          Earn {currencySymbol}{perReferral} for every friend who joins!
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* QR Code Section */}
        {referralLink ? (
          <View style={styles.qrSection}>
            <ThemedText style={styles.sectionTitle}>Scan to Join</ThemedText>
            <View style={styles.qrContainer}>
              <QRCode value={referralLink} size={180} />
            </View>
            <Text style={styles.qrSubtext}>Friends can scan this QR code to sign up</Text>
          </View>
        ) : null}

        {/* Referral Code */}
        <View style={styles.codeSection}>
          <ThemedText style={styles.sectionTitle}>Your Referral Code</ThemedText>
          <Pressable style={styles.codeContainer} onPress={handleCopyCode}>
            <Text style={styles.codeText}>{referralCode}</Text>
            <View style={styles.copyBadge}>
              <Ionicons name={isCopied ? 'checkmark' : 'copy'} size={18} color={Colors.brand.purple} />
              <Text style={styles.copyText}>{isCopied ? 'Copied!' : 'Copy'}</Text>
            </View>
          </Pressable>
        </View>

        {/* Referral Link */}
        <View style={styles.linkSection}>
          <ThemedText style={styles.sectionTitle}>Referral Link</ThemedText>
          <Pressable style={styles.linkContainer} onPress={handleCopyLink}>
            <Text style={styles.linkText} numberOfLines={1}>{referralLink}</Text>
            <Ionicons name="copy-outline" size={18} color={Colors.text.tertiary} />
          </Pressable>
        </View>

        {/* Share Platforms */}
        <View style={styles.platformsSection}>
          <ThemedText style={styles.sectionTitle}>Share Via</ThemedText>
          <View style={styles.platformsGrid}>
            {SHARE_TEMPLATES.map((template) => (
              <Pressable
                key={template.type}
                style={styles.platformButton}
                onPress={() => handleShare(template)}
                accessibilityLabel={`Share via ${template.type}`}
                accessibilityRole="button"
              >
                <View style={[styles.platformIcon, { backgroundColor: template.color }]}>
                  <Ionicons name={template.icon as any} size={24} color={Colors.text.inverse} />
                </View>
                <Text style={styles.platformText}>
                  {template.type.charAt(0).toUpperCase() + template.type.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Native Share */}
        <Pressable
          style={styles.nativeShareButton}
          onPress={() =>
            RNShare.share({
              message: `Join me on ${BRAND.APP_NAME} and get ${currencySymbol}30 off! Use code: ${referralCode}\n${referralLink}`,
              title: `Join ${BRAND.APP_NAME}`,
            }).catch(() => {})
          }
          accessibilityLabel="Share with more apps"
          accessibilityRole="button"
        >
          <LinearGradient colors={[Colors.brand.purple, Colors.brand.purpleLight || '#a78bfa']} style={styles.nativeShareGradient}>
            <Ionicons name="share-social" size={22} color={Colors.text.inverse} />
            <Text style={styles.nativeShareText}>More Sharing Options</Text>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: { marginTop: Spacing.md, ...Typography.body, color: Colors.text.tertiary },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...Typography.h3, fontWeight: '700', color: Colors.text.inverse },
  headerSubtitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  content: { flex: 1, paddingHorizontal: Spacing.base },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: Spacing.md,
  },
  qrSection: {
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginTop: Spacing.base,
    ...Shadows.medium,
  },
  qrContainer: {
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: colors.slateLight,
    marginBottom: Spacing.md,
  },
  qrSubtext: { ...Typography.bodySmall, color: '#94a3b8', textAlign: 'center' },
  codeSection: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.base,
    ...Shadows.medium,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: colors.slateLight,
    borderStyle: 'dashed',
  },
  codeText: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.brand.purple,
    letterSpacing: 3,
  },
  copyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.purpleScale?.[50] || '#ede9fe',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  copyText: { ...Typography.bodySmall, fontWeight: '600', color: Colors.brand.purple },
  linkSection: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.base,
    ...Shadows.medium,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: BorderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slateLight,
  },
  linkText: { flex: 1, ...Typography.bodySmall, color: Colors.text.tertiary, marginRight: Spacing.sm },
  platformsSection: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.base,
    ...Shadows.medium,
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.base,
    justifyContent: 'center',
  },
  platformButton: { alignItems: 'center', width: 72 },
  platformIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...Shadows.medium,
  },
  platformText: { ...Typography.caption, color: '#475569', textAlign: 'center' },
  nativeShareButton: {
    marginTop: Spacing.lg,
    borderRadius: 14,
    overflow: 'hidden',
  },
  nativeShareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  nativeShareText: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.inverse },
});

export default withErrorBoundary(ReferralSharePage, 'ReferralShare');
