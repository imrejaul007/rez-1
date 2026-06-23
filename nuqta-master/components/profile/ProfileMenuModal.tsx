// ProfileMenuModal Component
// Premium dark navy drawer with gold accents

import React, { useEffect } from 'react';
import {
  View,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import CachedImage from '@/components/ui/CachedImage';
import {
  useAuthActions,
  useGetCurrencySymbol,
  useGetLocale,
  useRegionState,
} from '@/stores/selectors';
import { ProfileMenuModalProps, ProfileMenuItem } from '@/types/profile.types';
import type { RegionId } from '@/stores/regionStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 360);

// Dark Premium Colors
const COLORS = {
  // Dark backgrounds
  drawerBg: '#0D1F2D',
  headerGradientStart: '#1a3a52',
  headerGradientEnd: '#0D1F2D',

  // Gold accents
  gold: '#FFCD57',
  goldLight: 'rgba(255, 205, 87, 0.15)',
  goldGlow: 'rgba(255, 205, 87, 0.3)',
  goldBorder: 'rgba(255, 205, 87, 0.3)',

  // Text on dark
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.45)',

  // Surface
  surfaceLight: 'rgba(255, 255, 255, 0.07)',
  surfaceBorder: 'rgba(255, 255, 255, 0.1)',
  separatorColor: 'rgba(255, 255, 255, 0.06)',

  // Status
  success: '#10B981',
  error: '#EF4444',
  white: '#FFFFFF',
};

// Region data with flags - India first as default
const REGIONS_DATA: { id: RegionId; name: string; flag: string; currency: string; coords: { lat: number; lng: number }; country: string; comingSoon?: boolean }[] = [
  { id: 'bangalore', name: 'India', flag: '🇮🇳', currency: 'INR', coords: { lat: 12.9716, lng: 77.5946 }, country: 'India' },
  { id: 'dubai', name: 'Dubai', flag: '🇦🇪', currency: 'AED', coords: { lat: 25.2048, lng: 55.2708 }, country: 'United Arab Emirates', comingSoon: true },
];

function ProfileMenuModal({
  visible,
  onClose,
  user,
  menuSections,
  onMenuItemPress,
}: ProfileMenuModalProps) {
  const slideAnim = useSharedValue(MODAL_WIDTH);
  const fadeAnim = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const actions = useAuthActions();
  const regionState = useRegionState();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();

  const currentRegionData = REGIONS_DATA.find(r => r.id === regionState.currentRegion) || REGIONS_DATA[0];

  useEffect(() => {
    if (visible) {
      slideAnim.value = withSpring(0, { damping: 14, stiffness: 80 });
      fadeAnim.value = withTiming(1, { duration: 300 });
    } else {
      slideAnim.value = withTiming(MODAL_WIDTH, { duration: 250 });
      fadeAnim.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const mainBackdropStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const mainSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim.value }],
  }));

  const performLogout = async () => {
    try {
      onClose();
      // AuthContext navigation guard handles redirect after logout
      await actions.logout();
    } catch (error) {
      platformAlertSimple('Logout Error', 'There was an issue logging you out.');
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      performLogout();
      return;
    }
    platformAlertDestructive('Logout', 'Are you sure you want to logout?', performLogout, 'Logout');
  };

  // Derive partner tier from user data
  const creatorLevel = (user as any)?.creatorLevel ?? (user as any)?.partner?.level ?? null;
  const tierLabel = creatorLevel === 2 ? 'Influencer'
    : creatorLevel === 3 ? 'Ambassador'
    : 'Partner';
  const userTier = (user as any)?.subscriptionTier || (user as any)?.tier || null;

  const renderHeader = () => (
    <LinearGradient
      colors={[COLORS.headerGradientStart, COLORS.headerGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}
    >
      {/* Close Button */}
      <Pressable
        style={styles.closeButton}
        onPress={onClose}
      >
        <View style={styles.closeButtonInner}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
        </View>
      </Pressable>

      {/* Avatar + Name row */}
      <View style={styles.userSection}>
        {/* Avatar — tappable to edit */}
        <Pressable
          onPress={() => { onClose(); router.push('/account/profile' as any); }}
          style={styles.avatarWrapper}
        >
          <View style={styles.avatarRing}>
            {user?.avatar ? (
              <CachedImage source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <ThemedText style={styles.avatarText}>
                {user?.initials || '?'}
              </ThemedText>
            )}
          </View>
          {/* Edit camera icon overlay */}
          <View style={styles.cameraOverlay}>
            <Ionicons name="camera" size={10} color={COLORS.drawerBg} />
          </View>
        </Pressable>

        {/* Name + email + verified + tier */}
        <View style={styles.userInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ThemedText style={styles.userName}>
              {user?.name || 'Welcome'}
            </ThemedText>
            {user?.isVerified && (
              <Ionicons name="shield-checkmark" size={14} color={COLORS.gold} />
            )}
          </View>
          <ThemedText style={styles.userEmail}>
            {user?.email || user?.phone || ''}
          </ThemedText>
          {/* Tier badge */}
          {userTier && (
            <View style={styles.tierBadge}>
              <ThemedText style={styles.tierBadgeText}>
                {userTier}
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      {/* Stats strip — compact single row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Wallet', value: `${currencySymbol}${user?.wallet?.balance?.toLocaleString(locale) || '0'}` },
          { label: 'Earned', value: `${currencySymbol}${user?.wallet?.totalEarned?.toLocaleString(locale) || '0'}` },
          { label: 'Pending', value: `${currencySymbol}${user?.wallet?.pendingAmount?.toLocaleString(locale) || '0'}` },
        ].map((stat, i) => (
          <React.Fragment key={stat.label}>
            {i > 0 && <View style={styles.statDivider} />}
            <Pressable
              style={styles.statItem}
              onPress={() => { onClose(); router.push('/wallet-screen' as any); }}
            >
              <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
              <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
            </Pressable>
          </React.Fragment>
        ))}
      </View>

      {/* Region row — navigates away, no inline expansion */}
      <Pressable
        style={styles.regionRow}
        onPress={() => { onClose(); router.push('/location/settings' as any); }}
      >
        <ThemedText style={{ fontSize: 18, marginRight: 10 }}>
          {currentRegionData.flag || '\u{1F30D}'}
        </ThemedText>
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontSize: 13, fontWeight: '600', color: COLORS.white }}>
            {currentRegionData.name}
          </ThemedText>
          <ThemedText style={{ fontSize: 11, color: COLORS.textMuted }}>
            {currentRegionData.currency} · Tap to change region
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
      </Pressable>

      {/* Partner Program row */}
      <Pressable
        style={styles.partnerRow}
        onPress={() => { onClose(); router.push('/profile/partner' as any); }}
      >
        <View style={styles.partnerIconContainer}>
          <Ionicons name="star" size={20} color={COLORS.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontSize: 14, fontWeight: '700', color: COLORS.gold }}>
            Partner Program
          </ThemedText>
          <ThemedText style={{ fontSize: 11, color: COLORS.textMuted }}>
            {creatorLevel ? `${tierLabel} · Level ${creatorLevel}` : 'Join Partner Program'}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
      </Pressable>
    </LinearGradient>
  );

  const renderMenuItem = (item: ProfileMenuItem, index: number) => {
    const isGold = item.id === 'wallet' || item.id === 'subscription';
    const isNew = item.badge === 'NEW';

    return (
      <Pressable
        key={item.id}
        style={styles.menuItem}
        onPress={() => item.isEnabled && onMenuItemPress(item)}
        disabled={!item.isEnabled}
      >
        {/* Icon */}
        <View style={[
          styles.menuIconContainer,
          isGold && styles.menuIconGold,
        ]}>
          <Ionicons
            name={item.icon as any}
            size={20}
            color={isGold ? COLORS.gold : 'rgba(255,255,255,0.7)'}
          />
        </View>

        {/* Title */}
        <View style={styles.menuTextContainer}>
          <ThemedText style={[styles.menuTitle, isGold && styles.menuTitleGold]}>{item.title}</ThemedText>
          {item.description && (
            <ThemedText style={styles.menuDescription}>{item.description}</ThemedText>
          )}
        </View>

        {/* Badge & Arrow */}
        <View style={styles.menuRight}>
          {item.badge && (
            <View style={[
              styles.badge,
              isNew ? styles.badgeNew : styles.badgeNumeric,
            ]}>
              <ThemedText style={[
                styles.badgeText,
                isNew && styles.badgeTextNew,
              ]}>
                {item.badge}
              </ThemedText>
            </View>
          )}
          {item.showArrow && (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={COLORS.textMuted}
            />
          )}
        </View>
      </Pressable>
    );
  };

  const SECTION_LABELS: Record<string, string> = {
    main_menu: '',
    premium_section: 'PREMIUM',
    support_section: 'SUPPORT',
    legal_section: 'LEGAL',
  };

  const renderMenuSection = (section: any, sectionIndex: number) => (
    <View key={`section_${sectionIndex}`} style={styles.menuSection}>
      {SECTION_LABELS[section.id] ? (
        <ThemedText style={styles.sectionTitle}>{SECTION_LABELS[section.id]}</ThemedText>
      ) : null}
      {section.items.filter((item: ProfileMenuItem) => item.isEnabled !== false).map((item: ProfileMenuItem, index: number) =>
        renderMenuItem(item, index)
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />

      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, mainBackdropStyle]}>
          <Animated.View
            style={[
              styles.modalContainer,
              mainSlideStyle,
              {
                height: SCREEN_HEIGHT,
                paddingBottom: insets.bottom,
              },
            ]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {renderHeader()}

            <ScrollView
              style={styles.menuContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.menuContent}
              bounces={false}
            >
              {menuSections?.map(renderMenuSection)}

              {/* Logout Button at Bottom */}
              <Pressable
                style={styles.logoutButtonBottom}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                <ThemedText style={styles.logoutTextBottom}>Sign Out</ThemedText>
              </Pressable>

              <View style={styles.footerSpace} />
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  modalContainer: {
    width: MODAL_WIDTH,
    backgroundColor: COLORS.drawerBg,
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -8, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 48,
      },
      android: {
        elevation: 30,
      },
      web: {
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
      },
    }),
  },

  // Header
  headerContainer: {
    paddingBottom: 20,
    paddingHorizontal: 18,
    borderTopLeftRadius: 28,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // User Section
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatarRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2.5,
    borderColor: COLORS.gold,
    overflow: 'hidden',
    backgroundColor: COLORS.headerGradientStart,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 62,
    height: 62,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.gold,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.drawerBg,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    marginTop: 5,
    backgroundColor: 'rgba(255,205,87,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.gold,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 4,
  },

  // Region row (simple, navigates away)
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },

  // Partner row
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  partnerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.goldLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  // Logout Button
  logoutButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  logoutTextBottom: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },

  // Menu Container
  menuContainer: {
    flex: 1,
    backgroundColor: COLORS.drawerBg,
  },
  menuContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Section Title
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 4,
    marginTop: 20,
    marginBottom: 6,
  },

  // Menu Section
  menuSection: {
    marginBottom: 0,
  },

  // Menu Item — flat dark row with separator
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.separatorColor,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconGold: {
    backgroundColor: COLORS.goldLight,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  menuTitleGold: {
    color: COLORS.gold,
  },
  menuDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Badge
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  badgeNew: {
    backgroundColor: COLORS.gold,
  },
  badgeNumeric: {
    backgroundColor: COLORS.goldLight,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.drawerBg,
  },
  badgeTextNew: {
    color: COLORS.drawerBg,
    fontSize: 9,
    letterSpacing: 0.5,
  },

  footerSpace: {
    height: 40,
  },

});

export default React.memo(ProfileMenuModal);
