import { colors } from '@/constants/theme';
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { SectionHeaderProps, PLAY_PAGE_COLORS } from '@/types/playPage.types';

// ReZ Design System Colors
const COLORS = {
  primary: colors.brand.green,
  gold: colors.brand.goldWarm,
  text: colors.brand.navyDark,
};

function SectionHeader({
  title,
  showViewAll = true,
  onViewAllPress,
  style
}: SectionHeaderProps) {

  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleContainer}>
        <ThemedText style={styles.title}>
          {title}
        </ThemedText>
        <View style={styles.titleUnderline} />
      </View>

      {showViewAll && (
        <Pressable
          style={styles.viewAllButton}
          onPress={onViewAllPress}
         
        >
          <ThemedText style={styles.viewAllText}>View all</ThemedText>
          <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
        </Pressable>
      )}
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    marginBottom: 8,
  },
  titleContainer: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  titleUnderline: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gold,
    borderRadius: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 192, 106, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 200, 87, 0.25)',
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
});

export default React.memo(SectionHeader);
