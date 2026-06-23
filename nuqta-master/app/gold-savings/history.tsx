import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';

function GoldSavingsHistoryPage() {
  const { goBack } = useSafeNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable onPress={() => goBack('/gold-savings' as any)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Gold Transaction History</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.emptyContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="time-outline" size={56} color="#CBD5E1" />
        </View>
        <ThemedText style={styles.emptyTitle}>No transactions yet</ThemedText>
        <ThemedText style={styles.emptySubtitle}>
          Your gold savings transaction history will appear here once the service is available.
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    backgroundColor: Colors.background.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.nileBlue,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default withErrorBoundary(GoldSavingsHistoryPage, 'GoldSavingsHistory');
