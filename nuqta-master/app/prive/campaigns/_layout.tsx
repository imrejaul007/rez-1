/**
 * Prive Campaigns Layout
 * Stack navigator for campaign sub-pages with Prive dark theme
 */

import { Stack } from 'expo-router';
import { PRIVE_COLORS } from '@/components/prive/priveTheme';

export default function CampaignsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: PRIVE_COLORS.background.primary },
        headerTintColor: PRIVE_COLORS.gold.primary,
        headerTitleStyle: { color: PRIVE_COLORS.text.primary, fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: PRIVE_COLORS.background.primary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Social Campaigns' }} />
      <Stack.Screen name="[id]" options={{ title: 'Campaign Details' }} />
      <Stack.Screen name="submit" options={{ title: 'Submit Post' }} />
      <Stack.Screen name="status" options={{ title: 'Submission Status' }} />
    </Stack>
  );
}
