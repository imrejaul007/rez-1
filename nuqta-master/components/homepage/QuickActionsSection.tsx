import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { useUserIdentityStore, IdentitySegment } from '@/stores/userIdentityStore';

// Color themes for each action - Nuqta palette
const ACTION_THEMES: Record<string, { iconBg: string; iconColor: string; descBg: string; descColor: string }> = {
  voucher: {
    iconBg: colors.linen,      // Linen
    iconColor: colors.nileBlue,    // Nile Blue
    descBg: colors.linen,
    descColor: colors.nileBlue,
  },
  wallet: {
    iconBg: colors.lavenderMist,      // Lavender Mist
    iconColor: colors.nileBlue,    // Nile Blue
    descBg: colors.lavenderMist,
    descColor: colors.nileBlue,
  },
  offers: {
    iconBg: colors.lightPeach,      // Light Peach
    iconColor: colors.nileBlue,    // Nile Blue
    descBg: colors.lightPeach,
    descColor: colors.nileBlue,
  },
  store: {
    iconBg: colors.lightMustard,      // Light Mustard
    iconColor: colors.nileBlue,    // Nile blue
    descBg: colors.lightMustard,
    descColor: colors.nileBlue,
  },
  recharge: {
    iconBg: '#D1FAE5',     // Light green
    iconColor: '#10B981',  // Emerald
    descBg: '#D1FAE5',
    descColor: '#065F46',
  },
  bills: {
    iconBg: '#FEF3C7',     // Light amber
    iconColor: '#F59E0B',  // Amber
    descBg: '#FEF3C7',
    descColor: '#92400E',
  },
};

interface QuickActionsSectionProps {
  voucherCount?: number;
  walletBalance?: number;
  newOffersCount?: number;
}

interface QuickActionItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  description: string;
  badge?: string;
}

const SEGMENT_OFFERS_ACTION: Partial<Record<IdentitySegment, QuickActionItem>> = {
  verified_student: {
    id: 'offers',
    title: 'Student Deals',
    icon: 'school-outline',
    route: '/offers/student',
    description: 'Verified savings',
  },
  verified_employee: {
    id: 'offers',
    title: 'Work Perks',
    icon: 'briefcase-outline',
    route: '/offers/corporate',
    description: 'Corporate deals',
  },
  verified_healthcare: {
    id: 'offers',
    title: 'Health Offers',
    icon: 'medkit-outline',
    route: '/offers/zones/heroes',
    description: 'For you',
  },
  verified_defence: {
    id: 'offers',
    title: 'Defence Perks',
    icon: 'shield-outline',
    route: '/offers/zones/heroes',
    description: 'Exclusive deals',
  },
  verified_teacher: {
    id: 'offers',
    title: 'Teacher Deals',
    icon: 'book-outline',
    route: '/offers/zones/heroes',
    description: 'Educator savings',
  },
  verified_senior: {
    id: 'offers',
    title: 'Senior Perks',
    icon: 'heart-outline',
    route: '/offers/zones/senior',
    description: 'Special offers',
  },
  verified_government: {
    id: 'offers',
    title: 'Govt Perks',
    icon: 'ribbon-outline',
    route: '/offers/zones/heroes',
    description: 'Exclusive deals',
  },
};

const DEFAULT_OFFERS_ACTION: QuickActionItem = {
  id: 'offers',
  title: 'Offers',
  icon: 'pricetag-outline',
  route: '/offers',
  description: 'Extra savings',
};

function getQuickActions(segment: IdentitySegment): QuickActionItem[] {
  return [
    { id: 'voucher', title: 'Voucher', icon: 'ticket-outline', route: '/my-vouchers', description: 'Use & save' },
    { id: 'wallet', title: 'Wallet', icon: 'wallet-outline', route: '/wallet-screen', description: 'Your rewards' },
    SEGMENT_OFFERS_ACTION[segment] ?? DEFAULT_OFFERS_ACTION,
    { id: 'store', title: 'Store', icon: 'storefront-outline', route: '/Store', description: 'Nearby' },
    { id: 'recharge', title: 'Recharge', icon: 'phone-portrait-outline', route: '/bill-payment?type=mobile_prepaid', description: '+10 coins', badge: '+10 coins' },
    { id: 'bills', title: 'Pay Bills', icon: 'flash-outline', route: '/bill-payment', description: '+20 coins', badge: '+20 coins' },
  ];
}

function QuickActionsSection({
  voucherCount = 0,
  walletBalance = 0,
  newOffersCount = 0,
}: QuickActionsSectionProps) {
  const router = useRouter();
  const { segment } = useUserIdentityStore();
  const actions = useMemo(() => getQuickActions(segment), [segment]);

  const handlePress = useCallback((route: string) => {
    router.push(route as any);
  }, [router]);

  const renderValue = (actionId: string) => {
    const greyBg = colors.neutral[100];
    const greyText = colors.neutral[500];

    switch (actionId) {
      case 'voucher':
        return (
          <View style={[styles.valuePill, { backgroundColor: greyBg }]}>
            <Text style={[styles.valueNumber, { color: greyText }]}>{voucherCount}</Text>
            <Text style={[styles.valueLabel, { color: greyText }]}>New</Text>
          </View>
        );
      case 'wallet':
        if (walletBalance > 0) {
          return (
            <View style={[styles.valuePill, { backgroundColor: greyBg }]}>
              <Text style={[styles.valueNumber, { color: colors.primary[700] }]}>
                {Math.floor(walletBalance).toLocaleString('en-IN')}
              </Text>
              <Text style={[styles.valueLabel, { color: colors.primary[700] }]}>RC</Text>
            </View>
          );
        }
        return (
          <View style={[styles.valuePill, styles.walletPill, { backgroundColor: greyBg }]}>
            <Text style={[styles.valueText, { color: greyText }]}>Add</Text>
            <View style={[styles.plusButton, { backgroundColor: greyText }]}>
              <Ionicons name="add" size={10} color={colors.background.primary} />
            </View>
          </View>
        );
      case 'offers':
        return (
          <View style={[styles.valuePill, { backgroundColor: greyBg }]}>
            <Text style={[styles.valueNumber, { color: greyText }]}>{newOffersCount}</Text>
            <Text style={[styles.valueLabel, { color: greyText }]}>New</Text>
          </View>
        );
      case 'store':
        return (
          <View style={[styles.valuePill, { backgroundColor: greyBg }]}>
            <Text style={[styles.valueText, { color: greyText }]}>Explore</Text>
          </View>
        );
      case 'recharge':
      case 'bills':
        return (
          <View style={[styles.valuePill, { backgroundColor: greyBg }]}>
            <Text style={[styles.valueText, { color: colors.primary[700] }]}>
              {actionId === 'recharge' ? '+10' : '+20'}
            </Text>
            <Text style={[styles.valueLabel, { color: greyText }]}>coins</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        {actions.map((action) => {
          const theme = ACTION_THEMES[action.id] || ACTION_THEMES.store;
          return (
            <Pressable
              key={action.id}
              style={styles.actionItem}
              onPress={() => handlePress(action.route)}

            >
              <View style={[styles.iconContainer, { backgroundColor: theme.iconBg }]}>
                <Ionicons name={action.icon} size={22} color={theme.iconColor} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              {renderValue(action.id)}
              <View style={[styles.descriptionPill, { backgroundColor: theme.descBg }]}>
                <Text style={[styles.actionDescription, { color: theme.descColor }]}>
                  {action.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default memo(QuickActionsSection);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: colors.background.primary,
    marginTop: -4,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 8,
    rowGap: 12,
  },
  actionItem: {
    width: '22%',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
    textAlign: 'center',
    marginBottom: 4,
  },
  valuePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  valueNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  valueLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  valueText: {
    fontSize: 11,
    fontWeight: '600',
  },
  walletPill: {
    paddingRight: 4,
  },
  plusButton: {
    width: 16,
    height: 16,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  actionDescription: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
  },
});
