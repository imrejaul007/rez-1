/**
 * Privé Layout
 * Stack navigator with dark Privé theme header for all Privé sub-pages
 * Wrapped with PriveProvider for centralized state management
 */

import { Stack } from 'expo-router';
import { PRIVE_COLORS } from '@/components/prive/priveTheme';
import { PriveProvider } from '@/contexts/PriveContext';

export default function PriveLayout() {
  return (
    <PriveProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: PRIVE_COLORS.background.primary,
          },
          headerTintColor: PRIVE_COLORS.gold.primary,
          headerTitleStyle: {
            color: PRIVE_COLORS.text.primary,
            fontWeight: '600',
            fontSize: 17,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: PRIVE_COLORS.background.primary },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="pillars"
          options={{ title: 'Reputation Pillars' }}
        />
        <Stack.Screen
          name="tier-progress"
          options={{ title: 'Tier Progress' }}
        />
        <Stack.Screen
          name="activity-history"
          options={{ title: 'Activity History' }}
        />
        <Stack.Screen
          name="wallet"
          options={{ title: 'Privé Wallet' }}
        />
        <Stack.Screen
          name="eligibility"
          options={{ title: 'Eligibility' }}
        />
        <Stack.Screen
          name="earnings"
          options={{ title: 'Earnings' }}
        />
        <Stack.Screen
          name="vouchers"
          options={{ title: 'My Vouchers' }}
        />
        <Stack.Screen
          name="prive-offers"
          options={{ title: 'Privé Offers' }}
        />
        <Stack.Screen
          name="smart-spend"
          options={{ title: 'Smart Spend' }}
        />
        <Stack.Screen
          name="review-earn"
          options={{ title: 'Write & Earn' }}
        />
        <Stack.Screen
          name="redeem"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="invite-dashboard"
          options={{ title: 'Invite Friends' }}
        />
        {/* New Screens */}
        <Stack.Screen
          name="next-actions"
          options={{ title: 'Next Best Actions' }}
        />
        <Stack.Screen
          name="missions"
          options={{ title: 'Missions' }}
        />
        <Stack.Screen
          name="benefits"
          options={{ title: 'Benefits & Multipliers' }}
        />
        <Stack.Screen
          name="tier-comparison"
          options={{ title: 'Compare Tiers' }}
        />
        <Stack.Screen
          name="analytics"
          options={{ title: 'My Analytics' }}
        />
        <Stack.Screen
          name="concierge"
          options={{ title: 'Privé Concierge' }}
        />
        <Stack.Screen
          name="notifications"
          options={{ title: 'Alerts & Expiry' }}
        />
        <Stack.Screen
          name="campaigns"
          options={{ headerShown: false }}
        />
      </Stack>
    </PriveProvider>
  );
}
