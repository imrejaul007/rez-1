/**
 * Mall Module Layout
 *
 * Stack navigator for all mall routes with shared header configuration
 */

import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@/constants/theme';

export default function MallLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background.primary,
        },
        headerTintColor: colors.neutral[900],
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        contentStyle: {
          backgroundColor: colors.neutral[50],
        },
      }}
    >
      {/* Mall Index - Redirects to home with mall tab */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />

      {/* Brand Index - Redirects to brands listing */}
      <Stack.Screen
        name="brand/index"
        options={{
          headerShown: false,
        }}
      />

      {/* Brand Detail Page - Header hidden, custom header in page */}
      <Stack.Screen
        name="brand/[id]"
        options={{
          headerShown: false,
        }}
      />

      {/* Brands Listing */}
      <Stack.Screen
        name="brands/index"
        options={{
          headerTitle: 'All Brands',
        }}
      />

      {/* Category Brands */}
      <Stack.Screen
        name="category/[slug]"
        options={{
          headerTitle: 'Category',
        }}
      />

      {/* All Categories */}
      <Stack.Screen
        name="categories/index"
        options={{
          headerTitle: 'All Categories',
        }}
      />

      {/* Collection Brands */}
      <Stack.Screen
        name="collection/[slug]"
        options={{
          headerTitle: 'Collection',
        }}
      />

      {/* All Collections */}
      <Stack.Screen
        name="collections/index"
        options={{
          headerTitle: 'All Collections',
        }}
      />

      {/* All Offers */}
      <Stack.Screen
        name="offers/index"
        options={{
          headerTitle: 'Exclusive Offers',
        }}
      />

      {/* Alliance Store Page - Custom header */}
      <Stack.Screen
        name="alliance-store"
        options={{
          headerShown: false,
        }}
      />

      {/* Lowest Price Page - Custom header */}
      <Stack.Screen
        name="lowest-price"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
