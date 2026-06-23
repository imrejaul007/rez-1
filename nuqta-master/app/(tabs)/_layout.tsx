import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TabLayout() {
  // Safety net: If user reaches main app, mark onboarding as complete
  // This prevents redirect loops if user data is inconsistent
  useEffect(() => {
    AsyncStorage.setItem('onboarding_completed', 'true').catch(() => {});
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Hide default tab bar - using custom BottomNavigation component
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="play" options={{ title: 'Play' }} />
      <Tabs.Screen name="categories" options={{ title: 'Categories' }} />
      <Tabs.Screen name="earn" options={{ title: 'Earn' }} />
    </Tabs>
  );
}
