import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@/constants/theme';

export default function CashStoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        contentStyle: { backgroundColor: colors.neutral[50] },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="brands" />
      <Stack.Screen name="buy-coupons" />
      <Stack.Screen name="coupons" />
      <Stack.Screen name="extra-coins" />
      <Stack.Screen name="offers" />
      <Stack.Screen name="trending" />
    </Stack>
  );
}
