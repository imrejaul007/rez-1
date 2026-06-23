import { Stack } from 'expo-router';

export default function CategorySlugLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[subcategory]" />
      <Stack.Screen name="search" />
      <Stack.Screen name="top-rated" />
      <Stack.Screen name="loyalty" />
      <Stack.Screen name="offers" />
      <Stack.Screen name="stories" />
      <Stack.Screen name="experiences" />
    </Stack>
  );
}
