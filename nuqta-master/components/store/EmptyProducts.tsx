import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

function EmptyProducts() {
  return (
    <View style={styles.container}>
      {/* Shopping Bag Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>🛍️</Text>
      </View>

      {/* Main Message */}
      <Text style={styles.title}>No Products Available</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        This store doesn't have any products listed yet.{'\n'}
        Check back soon for new items!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default React.memo(EmptyProducts);
