/**
 * Points Notification Manager
 * Manages queue and display of points notifications
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import PointsNotification, { PointsNotificationData } from './PointsNotification';

interface NotificationItem extends PointsNotificationData {
  id: string;
}

let notificationQueue: NotificationItem[] = [];
let showNotificationCallback: ((notification: NotificationItem) => void) | null = null;

// Global function to show notifications from anywhere
export function showPointsNotification(data: PointsNotificationData) {
  const notification: NotificationItem = {
    ...data,
    id: `${Date.now()}-${Math.random()}`,
  };

  if (showNotificationCallback) {
    showNotificationCallback(notification);
  } else {
    // Queue for later if manager not ready
    notificationQueue.push(notification);
  }
}

function PointsNotificationManager() {
  const [activeNotification, setActiveNotification] = useState<NotificationItem | null>(null);
  const [queue, setQueue] = useState<NotificationItem[]>([]);

  // Register callback for external calls
  useEffect(() => {
    showNotificationCallback = (notification: NotificationItem) => {
      setQueue((prev) => [...prev, notification]);
    };

    // Process any queued notifications
    if (notificationQueue.length > 0) {
      setQueue(notificationQueue);
      notificationQueue = [];
    }

    return () => {
      showNotificationCallback = null;
    };
  }, []);

  // Process queue
  useEffect(() => {
    if (!activeNotification && queue.length > 0) {
      const [nextNotification, ...remainingQueue] = queue;
      setActiveNotification(nextNotification);
      setQueue(remainingQueue);
    }
  }, [activeNotification, queue]);

  const handleDismiss = useCallback(() => {
    setActiveNotification(null);
  }, []);

  if (!activeNotification) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <PointsNotification data={activeNotification} onDismiss={handleDismiss} />
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
});

export default React.memo(PointsNotificationManager);
