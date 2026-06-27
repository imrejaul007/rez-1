// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  SafeAreaView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocationHistory } from '@/hooks/useLocation';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { LocationHistoryEntry } from '@/types/location.types';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function LocationHistoryScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { locationHistory, isLoading, error, loadHistory, clearHistory } = useLocationHistory();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadHistory();
    } finally {
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  };

  const handleClearHistory = () => {
    platformAlertDestructive(
      'Clear Location History',
      'Are you sure you want to clear all location history? This action cannot be undone.',
      'Clear',
      async () => {
        try {
          await clearHistory();
        } catch (error) {
          platformAlertSimple('Error', 'Failed to clear location history');
        }
      }
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'gps':
        return 'location';
      case 'manual':
        return 'hand-left';
      case 'ip':
        return 'globe';
      default:
        return 'location-outline';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'gps':
        return '#34C759';
      case 'manual':
        return colors.brand.ios;
      case 'ip':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const renderHistoryItem = useCallback(({ item }: { item: LocationHistoryEntry }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyContent}>
        <View style={styles.historyHeader}>
          <View style={styles.sourceContainer}>
            <Ionicons
              name={getSourceIcon(item.source) as any}
              size={16}
              color={getSourceColor(item.source)}
            />
            <Text style={[styles.sourceText, { color: getSourceColor(item.source) }]}>
              {item.source.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
        </View>

        <Text style={styles.addressText} numberOfLines={2}>
          {item.address}
        </Text>

        {item.city && (
          <Text style={styles.cityText}>{item.city}</Text>
        )}

        <View style={styles.coordinatesContainer}>
          <Text style={styles.coordinatesText}>
            {item.coordinates.latitude.toFixed(6)}, {item.coordinates.longitude.toFixed(6)}
          </Text>
        </View>

        <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
      </View>
    </View>
  ), []);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="location-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No location history</Text>
      <Text style={styles.emptySubtitle}>
        Your location history will appear here as you use the app
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
      <Text style={styles.errorTitle}>Unable to load history</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={loadHistory}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </Pressable>
        <Text style={styles.headerTitle}>Location History</Text>
        <Pressable
          style={styles.clearButton}
          onPress={handleClearHistory}
          disabled={locationHistory.length === 0}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={locationHistory.length === 0 ? '#C7C7CC' : '#FF3B30'}
          />
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.brand.ios} />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : error ? (
          renderErrorState()
        ) : (
          <FlashList
        contentContainerStyle={{ paddingBottom: 120 }}
            data={locationHistory}
            renderItem={renderHistoryItem}
            keyExtractor={(item, index) => `${item.timestamp.getTime()}-${index}`}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.brand.ios}
                colors={[colors.brand.ios]}
              />
            }
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={
              locationHistory.length === 0 ? styles.emptyContainer : styles.listContainer
            }
            estimatedItemSize={80}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  clearButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  listContainer: {
    padding: Spacing.base,
  },
  emptyContainer: {
    flex: 1,
  },
  historyItem: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyContent: {
    padding: Spacing.base,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  timeText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  addressText: {
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    fontWeight: '500',
    marginBottom: Spacing.xs,
    lineHeight: 22,
  },
  cityText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  coordinatesContainer: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.sm,
    borderRadius: 6,
    marginBottom: Spacing.sm,
  },
  coordinatesText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  dateText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    ...Typography.h3,
    fontWeight: '600',
    color: '#FF3B30',
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorSubtitle: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.brand.ios,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
});

export default withErrorBoundary(LocationHistoryScreen, 'LocationHistory');
