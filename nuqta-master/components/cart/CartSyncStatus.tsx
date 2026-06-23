import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartState, useCartActions } from '@/stores/selectors';
import useOfflineCart from '@/hooks/useOfflineCart';
import useNetworkStatus from '@/hooks/useNetworkStatus';
import { colors } from '@/constants/theme';

interface CartSyncStatusProps {
  showDetails?: boolean;
  compact?: boolean;
}

export function CartSyncStatus({ showDetails = false, compact = false }: CartSyncStatusProps) {
  const state = useCartState();
  const actions = useCartActions();
  const {
    isSyncing,
    syncError,
    pendingOperations,
    timeSinceSync,
    syncCart
  } = useOfflineCart();
  const { isOnline } = useNetworkStatus();

  // Don't show if online and no pending operations
  if (isOnline && !pendingOperations && !isSyncing && compact) {
    return null;
  }

  const getSyncIcon = () => {
    if (isSyncing) {
      return 'sync';
    }
    if (syncError) {
      return 'alert-circle';
    }
    if (!isOnline) {
      return 'cloud-offline';
    }
    if (pendingOperations > 0) {
      return 'cloud-upload';
    }
    return 'checkmark-circle';
  };

  const getSyncColor = () => {
    if (isSyncing) {
      return colors.brand.ios;
    }
    if (syncError) {
      return '#FF3B30';
    }
    if (!isOnline) {
      return '#FF9500';
    }
    if (pendingOperations > 0) {
      return '#FF9500';
    }
    return '#34C759';
  };

  const getSyncMessage = () => {
    if (isSyncing) {
      return 'Syncing...';
    }
    if (syncError) {
      return 'Sync failed';
    }
    if (!isOnline) {
      return 'Offline';
    }
    if (pendingOperations > 0) {
      return `${pendingOperations} pending change${pendingOperations > 1 ? 's' : ''}`;
    }
    if (timeSinceSync) {
      return `Synced ${timeSinceSync}`;
    }
    return 'In sync';
  };

  const handleSyncPress = async () => {
    if (!isOnline) {
      return;
    }
    if (isSyncing) {
      return;
    }
    await syncCart();
  };

  if (compact) {
    return (
      <Pressable
        style={styles.compactContainer}
        onPress={handleSyncPress}
        disabled={!isOnline || isSyncing}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={getSyncColor()} />
        ) : (
          <Ionicons
            name={getSyncIcon()}
            size={20}
            color={getSyncColor()}
          />
        )}
        <Text style={[styles.compactText, { color: getSyncColor() }]}>
          {getSyncMessage()}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={styles.iconContainer}>
          {isSyncing ? (
            <ActivityIndicator size="small" color={getSyncColor()} />
          ) : (
            <Ionicons
              name={getSyncIcon()}
              size={24}
              color={getSyncColor()}
            />
          )}
        </View>

        <View style={styles.messageContainer}>
          <Text style={[styles.statusText, { color: getSyncColor() }]}>
            {getSyncMessage()}
          </Text>

          {showDetails && (
            <>
              {!isOnline && (
                <Text style={styles.detailText}>
                  Changes will sync when you're back online
                </Text>
              )}

              {syncError && (
                <Text style={styles.errorText}>
                  {syncError}
                </Text>
              )}

              {pendingOperations > 0 && isOnline && (
                <Text style={styles.detailText}>
                  Tap to sync now
                </Text>
              )}
            </>
          )}
        </View>

        {isOnline && pendingOperations > 0 && !isSyncing && (
          <Pressable
            style={styles.syncButton}
            onPress={handleSyncPress}
          >
            <Ionicons name="sync" size={20} color={colors.brand.ios} />
          </Pressable>
        )}
      </View>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F8F8F8',
    borderRadius: 6,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    flex: 1,
    gap: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailText: {
    fontSize: 12,
    color: colors.midGray,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
  },
  syncButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brand.ios,
  },
});

export default React.memo(CartSyncStatus);
