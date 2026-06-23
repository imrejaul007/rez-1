/**
 * PriveConciergeCard - 24/7 support CTA
 * Premium concierge assistance card
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from './priveTheme';

export const PriveConciergeCard: React.FC = () => {
  const router = useRouter();

  return (
    <Pressable
      style={styles.container}
      onPress={() => router.push('/prive/concierge' as any)}
     
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>◆</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Need Assistance?</Text>
        <Text style={styles.subtitle}>Your Privé Concierge is available 24/7</Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: PRIVE_SPACING.xl,
    marginTop: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.xxl,
    padding: PRIVE_SPACING.lg,
    backgroundColor: PRIVE_COLORS.background.secondary,
    borderRadius: PRIVE_RADIUS.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    gap: PRIVE_SPACING.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIVE_COLORS.transparent.gold10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
    color: PRIVE_COLORS.gold.primary,
  },
  content: {
    flex: 1,
    gap: PRIVE_SPACING.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  subtitle: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
  },
  arrow: {
    fontSize: 18,
    color: PRIVE_COLORS.gold.primary,
  },
});

export default React.memo(PriveConciergeCard);
