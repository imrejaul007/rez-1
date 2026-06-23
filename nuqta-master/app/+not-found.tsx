import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { colors } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found' }} />
      <ThemedView style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="map-outline" size={48} color={colors.brand.purple} />
        </View>
        <ThemedText type="title" style={styles.title}>Oops! Page not found</ThemedText>
        <ThemedText style={styles.subtitle}>
          This page doesn't exist yet. Go back to find great deals.
        </ThemedText>
        <Link href="/" style={styles.link}>
          <ThemedText type="link">Go to Home</ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
