import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';

function NotificationsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Navigate to previous screen"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">Notification Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Push Notifications */}
        <Pressable
          style={styles.notificationSection}
          onPress={() => router.push('/account/push-notifications' as any)}
          accessibilityLabel="Push notifications settings"
          accessibilityRole="button"
          accessibilityHint="Navigate to manage push notification preferences"
        >
          <View style={styles.sectionIcon}>
            <Ionicons name="notifications" size={24} color={Colors.info} />
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.notificationSectionTitle}>Push Notifications</Text>
            <Text style={styles.sectionDescription}>Manage push notification preferences</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
        </Pressable>

        {/* Email Notifications */}
        <Pressable
          style={styles.notificationSection}
          onPress={() => router.push('/account/email-notifications' as any)}
          accessibilityLabel="Email notifications settings"
          accessibilityRole="button"
          accessibilityHint="Navigate to manage email notification settings"
        >
          <View style={styles.sectionIcon}>
            <Ionicons name="mail" size={24} color={Colors.info} />
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.notificationSectionTitle}>Email Notifications</Text>
            <Text style={styles.sectionDescription}>Manage email notification settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
        </Pressable>

        {/* SMS Notifications */}
        <Pressable
          style={styles.notificationSection}
          onPress={() => router.push('/account/sms-notifications' as any)}
          accessibilityLabel="SMS notifications settings"
          accessibilityRole="button"
          accessibilityHint="Navigate to manage SMS notification preferences"
        >
          <View style={styles.sectionIcon}>
            <Ionicons name="chatbox" size={24} color={Colors.info} />
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.notificationSectionTitle}>SMS Notifications</Text>
            <Text style={styles.sectionDescription}>Manage SMS notification preferences</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
        </Pressable>

        {/* Notification History */}
        <Pressable
          style={styles.notificationSection}
          onPress={() => router.push('/account/notification-history' as any)}
          accessibilityLabel="Notification history"
          accessibilityRole="button"
          accessibilityHint="Navigate to view all past notifications"
        >
          <View style={styles.sectionIcon}>
            <Ionicons name="time" size={24} color={Colors.info} />
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.notificationSectionTitle}>Notification History</Text>
            <Text style={styles.sectionDescription}>View all past notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
        </Pressable>
      </ScrollView>
    </View>
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
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  notificationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  sectionContent: {
    flex: 1,
  },
  notificationSectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(NotificationsScreen, 'AccountNotifications');
