// @ts-nocheck
/**
 * Fast Delivery Router
 * Renders the correct fast delivery page based on category slug.
 */
import { colors } from '@/constants/theme';
import React, { Suspense, lazy } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getCategoryTheme } from '@/config/categoryThemeConfig';

const FoodFastDelivery = lazy(() => import('./FastDeliveryFood'));
const GroceryFastDelivery = lazy(() => import('./FastDeliveryGrocery'));

export default function FastDelivery() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = getCategoryTheme(slug || 'food-dining');

  const Component = slug === 'grocery-essentials' ? GroceryFastDelivery : FoodFastDelivery;

  return (
    <Suspense fallback={
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.tint.warmGray }}>
        <ActivityIndicator size="large" color={theme.primaryColor} />
      </View>
    }>
      <Component />
    </Suspense>
  );
}
