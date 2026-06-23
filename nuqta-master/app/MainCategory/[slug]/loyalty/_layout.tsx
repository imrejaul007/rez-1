import { Stack } from 'expo-router';

export default function LoyaltyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="coins" />
      <Stack.Screen name="brands" />
      <Stack.Screen name="missions" />
    </Stack>
  );
}
