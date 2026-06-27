import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Profile QR Code Page
// Display QR code for profile sharing and wallet payments

import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, StatusBar, Share, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useAuthUser, useGetCurrencySymbol, useIsAuthenticated, useAuthLoading, useRezBalance } from '@/stores/selectors';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { BRAND } from '@/constants/brand';

const QRCodePage = () => {
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const rezBalance = useRezBalance();
  const [activeTab, setActiveTab] = useState<'profile' | 'wallet'>('profile');
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Generate profile link
  const profileLink = `https://rezapp.com/user/${user?.id || 'user123'}`;
  const walletId = `REZW${user?.phoneNumber?.slice(-6) || '123456'}`;

  const handleCopyLink = useCallback(async () => {
    await Clipboard.setStringAsync(activeTab === 'profile' ? profileLink : walletId);
    platformAlertSimple('Copied!', `${activeTab === 'profile' ? 'Profile link' : 'Wallet ID'} copied to clipboard`);
  }, [activeTab, profileLink, walletId]);

  const handleShare = useCallback(async () => {
    try {
      const message =
        activeTab === 'profile'
          ? `Check out my profile on ${BRAND.APP_NAME}!\n${profileLink}`
          : `Send payment to my ${BRAND.APP_NAME} Wallet:\nID: ${walletId}`;

      await Share.share({
        message,
        title: activeTab === 'profile' ? 'My Profile' : 'My Wallet',
      });
    } catch (error) {
      // silently handle
    }
  }, [activeTab, profileLink, walletId]);

  const handleScan = useCallback(() => {
    router.push('/pay-in-store' as any);
  }, [router]);

  if (authLoading || !isAuthenticated) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.lightMustard} />

      {/* Header */}
      <LinearGradient colors={[Colors.gold, Colors.nileBlue]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable 
            style={styles.backButton} 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/profile');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>QR Code</ThemedText>
          <Pressable style={styles.scanButton} onPress={handleScan}>
            <Ionicons name="scan" size={24} color="white" />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Ionicons
              name="person"
              size={20}
              color={activeTab === 'profile' ? Colors.gold : 'rgba(255,255,255,0.7)'}
            />
            <ThemedText style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
              Profile
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'wallet' && styles.tabActive]}
            onPress={() => setActiveTab('wallet')}
          >
            <Ionicons
              name="wallet"
              size={20}
              color={activeTab === 'wallet' ? Colors.gold : 'rgba(255,255,255,0.7)'}
            />
            <ThemedText style={[styles.tabText, activeTab === 'wallet' && styles.tabTextActive]}>
              Wallet
            </ThemedText>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* QR Code Card */}
        <View style={styles.qrCard}>
          <View style={styles.qrContainer}>
            <QRCode
              value={activeTab === 'profile' ? profileLink : walletId}
              size={220}
              color={Colors.text.primary}
              backgroundColor="white"
            />
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            {activeTab === 'profile' ? (
              <>
                <View style={styles.infoRow}>
                  <View style={styles.avatarSmall}>
                    <ThemedText style={styles.avatarText}>
                      {user?.profile?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </ThemedText>
                  </View>
                  <View style={styles.infoText}>
                    <ThemedText style={styles.infoName}>
                      {user?.profile?.firstName && user?.profile?.lastName 
                        ? `${user.profile.firstName} ${user.profile.lastName}`
                        : user?.profile?.firstName || user?.email || 'User Name'}
                    </ThemedText>
                    <ThemedText style={styles.infoEmail}>{user?.email || 'user@email.com'}</ThemedText>
                  </View>
                </View>
                <View style={styles.linkBox}>
                  <ThemedText style={styles.linkLabel}>Profile Link</ThemedText>
                  <ThemedText style={styles.linkText} numberOfLines={1}>
                    {profileLink}
                  </ThemedText>
                </View>
              </>
            ) : (
              <>
                <View style={styles.walletInfo}>
                  <Ionicons name="wallet" size={32} color={Colors.gold} />
                  <ThemedText style={styles.walletId}>{walletId}</ThemedText>
                  <ThemedText style={styles.walletBalance}>
                    Balance: {currencySymbol}{rezBalance.toFixed(2)}
                  </ThemedText>
                </View>
                <View style={styles.instructionBox}>
                  <Ionicons name="information-circle" size={20} color={Colors.text.tertiary} />
                  <ThemedText style={styles.instructionText}>
                    Share this QR code to receive payments directly to your REZ wallet
                  </ThemedText>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable style={styles.actionButton} onPress={handleShare}>
            <LinearGradient colors={[Colors.gold, Colors.nileBlue]} style={styles.actionButtonGradient}>
              <Ionicons name="share-social" size={20} color="white" />
              <ThemedText style={styles.actionButtonText}>Share</ThemedText>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={handleCopyLink}>
            <View style={styles.actionButtonOutline}>
              <Ionicons name="copy" size={20} color={Colors.gold} />
              <ThemedText style={styles.actionButtonTextOutline}>Copy Link</ThemedText>
            </View>
          </Pressable>
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          <ThemedText style={styles.featuresTitle}>
            {activeTab === 'profile' ? 'Share Your Profile' : 'Receive Payments'}
          </ThemedText>

          {activeTab === 'profile' ? (
            <>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="people" size={20} color={Colors.gold} />
                </View>
                <ThemedText style={styles.featureText}>
                  Share your profile with friends and family
                </ThemedText>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="star" size={20} color={Colors.warning} />
                </View>
                <ThemedText style={styles.featureText}>
                  Show your reviews and ratings
                </ThemedText>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="gift" size={20} color={colors.brand.pink} />
                </View>
                <ThemedText style={styles.featureText}>
                  Earn referral bonus when they sign up
                </ThemedText>
              </View>
            </>
          ) : (
            <>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="flash" size={20} color={Colors.gold} />
                </View>
                <ThemedText style={styles.featureText}>
                  Instant payment to your wallet
                </ThemedText>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="shield-checkmark" size={20} color={Colors.info} />
                </View>
                <ThemedText style={styles.featureText}>
                  Secure and encrypted transactions
                </ThemedText>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="cash" size={20} color={Colors.warning} />
                </View>
                <ThemedText style={styles.featureText}>
                  No transaction fees for REZ users
                </ThemedText>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 0,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
  },
  scanButton: {
    padding: Spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingBottom: Spacing.base,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.background.primary,
  },
  tabText: {
    ...Typography.body,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tabTextActive: {
    color: Colors.gold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  qrCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    }),
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  infoSection: {
    gap: Spacing.base,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarSmall: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  infoText: {
    flex: 1,
  },
  infoName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  infoEmail: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  linkBox: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  linkLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  linkText: {
    ...Typography.bodySmall,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  walletInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.base,
  },
  walletId: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  walletBalance: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  instructionBox: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  instructionText: {
    flex: 1,
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  actionButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  actionButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.gold,
    gap: Spacing.sm,
  },
  actionButtonTextOutline: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.gold,
  },
  featuresSection: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    }),
  },
  featuresTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
});

export default withErrorBoundary(QRCodePage, 'ProfileQrCode');
