import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="splash" />
      <Stack.Screen name="registration" />
      <Stack.Screen name="otp-verification" />
      <Stack.Screen name="location-permission" />
      <Stack.Screen name="loading" />
      <Stack.Screen name="category-selection" />
      <Stack.Screen name="rewards-intro" />
      <Stack.Screen name="transactions-preview" />
      <Stack.Screen name="notification-permission" />
      <Stack.Screen name="identity-select" options={{ headerShown: false }} />
      <Stack.Screen name="student-verify" options={{ headerShown: false }} />
      <Stack.Screen name="corporate-verify" options={{ headerShown: false }} />
      <Stack.Screen name="other-verify" options={{ headerShown: false }} />
      <Stack.Screen name="defence-verify" options={{ headerShown: false }} />
      <Stack.Screen name="healthcare-verify" options={{ headerShown: false }} />
      <Stack.Screen name="teacher-verify" options={{ headerShown: false }} />
      <Stack.Screen name="verification-success" options={{ headerShown: false }} />
      <Stack.Screen name="verification-pending" options={{ headerShown: false }} />
    </Stack>
  );
}
