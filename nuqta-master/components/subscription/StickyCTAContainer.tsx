import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface StickyCTAContainerProps {
  children: React.ReactNode;
}

/**
 * Fixed-bottom container for subscription CTA buttons.
 * Renders a soft top shadow and sits above the tab bar.
 */
function StickyCTAContainer({ children }: StickyCTAContainerProps) {
  return (
    <View style={styles.wrapper}>
      {/* Top shadow fade */}
      <LinearGradient
        colors={['rgba(249,250,251,0)', 'rgba(249,250,251,1)']}
        style={styles.shadowGradient}
        pointerEvents="none"
      />
      <View style={styles.container}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  shadowGradient: {
    height: 20,
  },
  container: {
    backgroundColor: colors.neutral[50],
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -3px 12px rgba(0,0,0,0.08)',
      } as any,
    }),
  },
});

export default React.memo(StickyCTAContainer);
