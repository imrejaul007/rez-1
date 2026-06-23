/**
 * Redemption Layout
 * Shared layout for all redemption sub-pages
 */

import { Stack } from 'expo-router';
import { PRIVE_COLORS } from '@/components/prive/priveTheme';

export default function RedeemLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: PRIVE_COLORS.background.primary },
        animation: 'slide_from_right',
      }}
    >
      {/* Index route is automatically handled by expo-router */}
      <Stack.Screen name="gift-cards" />
      <Stack.Screen name="bill-pay" />
      <Stack.Screen name="experiences" />
      <Stack.Screen name="charity" />
    </Stack>
  );
}
