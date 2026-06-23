import { Stack } from 'expo-router';

export default function SurveyIdLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="take" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
