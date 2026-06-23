/**
 * Prive Offers Layout
 */

import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function PriveOffersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
