import React from 'react';
import {
  View,
  Text,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { NUQTA } from './searchTheme';

function SearchHintView() {
  return (
    <View
      style={styles.searchHintContainer}
      accessibilityLabel="Search hint"
      accessibilityRole="alert"
    >
      <View style={styles.searchHintIconContainer}>
        <Ionicons name="information-circle-outline" size={48} color={NUQTA.nileBlue} accessibilityLabel="Information icon" />
      </View>
      <Text style={styles.searchHintTitle}>Keep typing...</Text>
      <Text style={styles.searchHintText}>
        Enter at least 2 characters to start searching
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchHintContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius['2xl'],
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: NUQTA.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchHintIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: NUQTA.lavenderMist,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  searchHintTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: NUQTA.nileBlue,
    marginBottom: Spacing.sm,
  },
  searchHintText: {
    ...Typography.body,
    color: NUQTA.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default React.memo(SearchHintView);
