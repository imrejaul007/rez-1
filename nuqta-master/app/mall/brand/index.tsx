import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Mall Brand Index Page
 *
 * Redirects to the brands listing page.
 * Individual brand pages use /mall/brand/[id]
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/theme';

function MallBrandIndex() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to brands listing page
    router.replace('/mall/brands');
  }, [router]);

  // Show loading while redirecting
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.brand.sky} />
      <Text style={styles.text}>Loading brands...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral[500],
  },
});

export default withErrorBoundary(MallBrandIndex, 'MallBrandIndex');
