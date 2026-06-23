/**
 * Cart Header
 *
 * Premium cart header with Nuqta design palette
 */

import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { CartHeaderProps } from '@/types/cart';
import { borderRadius, colors, spacing } from '@/constants/theme';
function CartHeader({ onBack, title = 'Cart' }: CartHeaderProps) {
  const { width, height } = Dimensions.get('window');
  const isSmallScreen = width < 360;
  const statusBarHeight =
    Platform.OS === 'ios'
      ? height > 800
        ? 44
        : 20
      : StatusBar.currentHeight || 24;

  return (
    <LinearGradient
      colors={[colors.nuqta.mustard, colors.nuqta.peach]}
      style={[styles.container, { paddingTop: statusBarHeight + 10 }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      {/* Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <View style={styles.content}>
        {/* Back Button */}
        <Pressable
          style={styles.backButton}
          onPress={onBack}
         
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={22} color={colors.nuqta.nileBlue} />
        </Pressable>

        {/* Title */}
        <View style={styles.titleContainer}>
          <ThemedText
            style={[
              styles.title,
              { fontSize: isSmallScreen ? 18 : 20 },
            ]}
          >
            {title}
          </ThemedText>
          <View style={styles.cartIconWrapper}>
            <Ionicons name="cart" size={16} color={colors.nuqta.mustard} />
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: colors.nuqta.mustard,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    top: -40,
    right: -20,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(26, 58, 82, 0.08)',
    bottom: -20,
    left: 40,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.1)',
    shadowColor: colors.nuqta.nileBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  title: {
    textAlign: 'center',
    fontWeight: '700',
    color: colors.nuqta.nileBlue,
    letterSpacing: 1,
  },
  cartIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.nuqta.nileBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    width: 46,
  },
});

export default React.memo(CartHeader);
