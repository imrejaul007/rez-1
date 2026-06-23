import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@/constants/theme';

export default function VouchersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        contentStyle: { backgroundColor: colors.neutral[50] },
      }}
    >
      <Stack.Screen name="brand/[id]" />
    </Stack>
  );
}
