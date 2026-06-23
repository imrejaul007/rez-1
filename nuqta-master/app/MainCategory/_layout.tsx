import { Stack } from 'expo-router';

export default function MainCategoryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[slug]" />
    </Stack>
  );
}
