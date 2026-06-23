import { colors } from '@/constants/theme';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Badge {
  icon: string;
  text: string;
}

const DEFAULT_BADGES: Badge[] = [
  { icon: '🔒', text: 'Secure Payments' },
  { icon: '🚚', text: 'Free Delivery' },
  { icon: '↩️', text: 'Easy Returns' },
  { icon: '✓', text: 'Verified Seller' },
];

interface TrustBadgesProps {
  badges?: Badge[];
}

function TrustBadges({ badges = DEFAULT_BADGES }: TrustBadgesProps) {
  return (
    <View style={styles.container}>
      {badges.map((badge, index) => (
        <View key={index} style={styles.badge}>
          <Text style={styles.icon}>{badge.icon}</Text>
          <Text style={styles.text}>{badge.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  icon: {
    fontSize: 16,
  },
  text: {
    fontSize: 13,
    color: colors.midGray,
    fontWeight: '500',
  },
});

export default React.memo(TrustBadges);
