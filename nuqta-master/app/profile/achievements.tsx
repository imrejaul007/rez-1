// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Achievements Screen
// Displays user badges and achievements with progress tracking

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, StatusBar, Platform, RefreshControl, Modal, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useAchievements } from '@/hooks/useAchievements';
import { Achievement } from '@/services/achievementApi';
import { useAuthActions } from '@/stores/selectors';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { HeaderBackButton } from '@/components/navigation/SafeBackButton';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

type FilterType = 'all' | 'unlocked' | 'locked';

function AchievementsPage() {
  const router = useRouter();
  const { goBack } = useSafeNavigation();
  const authActions = useAuthActions();
  const {
    achievements,
    progress,
    isLoading,
    refetch,
    recalculateAchievements,
    error: achievementsError,
  } = useAchievements(true);

  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  // Handle authentication errors
  useEffect(() => {
    if (achievementsError && achievementsError.includes('User not found')) {
      setAuthError('Authentication issue detected. Please log out and log back in.');
    } else {
      setAuthError(null);
    }
  }, [achievementsError]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    const success = await recalculateAchievements();
    if (!isMounted()) return;
    setIsRecalculating(false);
    if (success) {

    }
  };

  const handleAuthRefresh = async () => {
    try {

      await authActions.checkAuthStatus();
      if (!isMounted()) return;
      setAuthError(null);
      // Retry achievements fetch after auth refresh
      await refetch();
    } catch (error) {
      platformAlertDestructive(
        'Authentication Error',
        'Please log out and log back in to continue.',
        'Logout',
        () => authActions.logout()
      );
    }
  };

  const filteredAchievements = achievements.filter(ach => {
    if (filter === 'unlocked') return ach.unlocked;
    if (filter === 'locked') return !ach.unlocked;
    return true;
  });

  const renderAchievementItem = useCallback(({ item }: { item: Achievement }) => renderAchievementCard(item), []);

  const renderAchievementCard = (achievement: Achievement) => {
    const isLocked = !achievement.unlocked;

    return (
      <Pressable
        key={achievement.id}
        style={[
          styles.achievementCard,
          isLocked && styles.achievementCardLocked,
        ]}
        onPress={() => setSelectedAchievement(achievement)}
       
        accessibilityLabel={`${achievement.title}. ${achievement.description}. Progress: ${achievement.progress}%${achievement.unlocked ? '. Unlocked' : '. Locked'}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: isLocked }}
        accessibilityHint={`Double tap to view ${achievement.unlocked ? 'details' : 'requirements'}`}
      >
        <View style={[
          styles.iconContainer,
          { backgroundColor: isLocked ? Colors.background.secondary : `${achievement.color}20` }
        ]}>
          <Ionicons
            name={achievement.icon as any}
            size={32}
            color={isLocked ? Colors.text.tertiary : achievement.color}
          />
        </View>

        <ThemedText style={[
          styles.achievementTitle,
          isLocked && styles.achievementTitleLocked
        ]} numberOfLines={2}>
          {achievement.title}
        </ThemedText>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${achievement.progress}%`,
                  backgroundColor: isLocked ? Colors.border.default : achievement.color,
                }
              ]}
            />
          </View>
          <ThemedText style={styles.progressText}>
            {achievement.progress}%
          </ThemedText>
        </View>

        {achievement.unlocked && achievement.unlockedDate && (
          <View style={styles.unlockedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.gold} />
            <ThemedText style={styles.unlockedText}>Unlocked</ThemedText>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gold} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.gold, Colors.nileBlue, '#00695C']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <HeaderBackButton
            fallbackRoute="/profile"
            light={true}
            iconSize={24}
          />

          <View style={styles.headerTextContainer}>
            <ThemedText style={styles.headerTitle}>Achievements</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {progress?.summary.unlocked || 0} of {progress?.summary.total || 0} unlocked
            </ThemedText>
          </View>

          <Pressable
            style={styles.recalculateButton}
            onPress={handleRecalculate}
            disabled={isRecalculating}
            accessibilityLabel={isRecalculating ? "Recalculating achievements" : "Recalculate achievements"}
            accessibilityRole="button"
            accessibilityState={{ disabled: isRecalculating, busy: isRecalculating }}
            accessibilityHint="Double tap to refresh achievement progress"
          >
            <Ionicons
              name="refresh"
              size={22}
              color="white"
              style={isRecalculating ? styles.rotating : undefined}
            />
          </Pressable>
        </View>

        {/* Progress Summary */}
        {progress && (
          <View
            style={styles.summaryCard}
            accessibilityLabel={`Achievement progress. ${progress.summary.completionPercentage.toFixed(0)}% complete. ${progress.summary.unlocked} unlocked. ${progress.summary.inProgress} in progress`}
            accessibilityRole="summary"
          >
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryNumber}>
                {progress.summary.completionPercentage.toFixed(0)}%
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Complete</ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryNumber}>
                {progress.summary.unlocked}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Unlocked</ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryNumber}>
                {progress.summary.inProgress}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>In Progress</ThemedText>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <Pressable
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
          accessibilityLabel={`Show all achievements. ${achievements.length} total`}
          accessibilityRole="button"
          accessibilityState={{ selected: filter === 'all' }}
          accessibilityHint="Double tap to show all achievements"
        >
          <ThemedText style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({achievements.length})
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.filterTab, filter === 'unlocked' && styles.filterTabActive]}
          onPress={() => setFilter('unlocked')}
          accessibilityLabel={`Show unlocked achievements. ${achievements.filter(a => a.unlocked).length} unlocked`}
          accessibilityRole="button"
          accessibilityState={{ selected: filter === 'unlocked' }}
          accessibilityHint="Double tap to show only unlocked achievements"
        >
          <ThemedText style={[styles.filterText, filter === 'unlocked' && styles.filterTextActive]}>
            Unlocked ({achievements.filter(a => a.unlocked).length})
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.filterTab, filter === 'locked' && styles.filterTabActive]}
          onPress={() => setFilter('locked')}
          accessibilityLabel={`Show locked achievements. ${achievements.filter(a => !a.unlocked).length} locked`}
          accessibilityRole="button"
          accessibilityState={{ selected: filter === 'locked' }}
          accessibilityHint="Double tap to show only locked achievements"
        >
          <ThemedText style={[styles.filterText, filter === 'locked' && styles.filterTextActive]}>
            Locked ({achievements.filter(a => !a.unlocked).length})
          </ThemedText>
        </Pressable>
      </View>

      {/* Authentication Error Banner */}
      {authError && (
        <View style={styles.errorBanner}>
          <View style={styles.errorContent}>
            <Ionicons name="warning" size={20} color={Colors.error} />
            <View style={styles.errorTextContainer}>
              <ThemedText style={styles.errorTitle}>Authentication Issue</ThemedText>
              <ThemedText style={styles.errorMessage}>{authError}</ThemedText>
            </View>
            <Pressable
              style={styles.errorButton}
              onPress={handleAuthRefresh}
            >
              <ThemedText style={styles.errorButtonText}>Fix</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Achievements Grid */}
      {authError ? (
        <View style={[styles.content, styles.errorContainer]}>
          <Ionicons name="lock-closed" size={64} color={Colors.error} />
          <ThemedText style={styles.errorTitle}>Authentication Required</ThemedText>
          <ThemedText style={styles.errorMessage}>
            There's an issue with your authentication. Please log out and log back in to continue.
          </ThemedText>
          <Pressable
            style={styles.primaryButton}
            onPress={() => authActions.logout()}
          >
            <ThemedText style={styles.primaryButtonText}>Logout & Login Again</ThemedText>
          </Pressable>
        </View>
      ) : isLoading && achievements.length === 0 ? (
        <View style={[styles.content, styles.loadingContainer]}>
          <ThemedText style={styles.loadingText}>Loading achievements...</ThemedText>
        </View>
      ) : (
        <FlashList
          data={filteredAchievements}
          keyExtractor={(item) => item._id}
          estimatedItemSize={150}
          renderItem={renderAchievementItem}
          numColumns={2}
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={64} color={Colors.border.default} />
              <ThemedText style={styles.emptyText}>
                {filter === 'unlocked'
                  ? 'No achievements unlocked yet'
                  : filter === 'locked'
                  ? 'All achievements unlocked!'
                  : 'No achievements found'}
              </ThemedText>
            </View>
          }
        />
      )}

      {/* Achievement Detail Modal */}
      <Modal
        visible={selectedAchievement !== null}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <Pressable
          style={styles.modalOverlay}
         
          onPress={() => setSelectedAchievement(null)}
        >
          <View style={styles.modalContent}>
            {selectedAchievement && (
              <>
                <View
                  style={[
                    styles.modalIconContainer,
                    { backgroundColor: `${selectedAchievement.color}20` }
                  ]}
                >
                  <Ionicons
                    name={selectedAchievement.icon as any}
                    size={48}
                    color={selectedAchievement.color}
                  />
                </View>

                <ThemedText style={styles.modalTitle}>
                  {selectedAchievement.title}
                </ThemedText>

                <ThemedText style={styles.modalDescription}>
                  {selectedAchievement.description}
                </ThemedText>

                {/* Progress Details */}
                <View style={styles.modalProgressContainer}>
                  <View style={styles.modalProgressBar}>
                    <View
                      style={[
                        styles.modalProgressFill,
                        {
                          width: `${selectedAchievement.progress}%`,
                          backgroundColor: selectedAchievement.color,
                        }
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.modalProgressText}>
                    {selectedAchievement.currentValue || 0} / {selectedAchievement.targetValue} ({selectedAchievement.progress}%)
                  </ThemedText>
                </View>

                {selectedAchievement.unlocked && selectedAchievement.unlockedDate && (
                  <View style={styles.modalUnlockedInfo}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
                    <ThemedText style={styles.modalUnlockedText}>
                      Unlocked on {new Date(selectedAchievement.unlockedDate).toLocaleDateString()}
                    </ThemedText>
                  </View>
                )}

                <Pressable
                  style={styles.modalCloseButton}
                  onPress={() => setSelectedAchievement(null)}
                >
                  <ThemedText style={styles.modalCloseText}>Close</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  recalculateButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotating: {
    // Animation would be added via Animated API
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.gold,
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border.default,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    gap: Spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: Colors.gold,
  },
  filterText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  filterTextActive: {
    color: Colors.text.inverse,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  achievementsGrid: {
    gap: Spacing.base,
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.medium,
  },
  achievementCardLocked: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    alignSelf: 'center',
  },
  achievementTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
    minHeight: 36,
  },
  achievementTitleLocked: {
    color: Colors.text.tertiary,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border.default,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'right',
    fontWeight: '600',
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  unlockedText: {
    ...Typography.caption,
    color: Colors.gold,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    marginTop: 16,
    textAlign: 'center',
  },

  // Error Styles
  errorBanner: {
    backgroundColor: Colors.errorScale[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.errorScale[200],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 2,
  },
  errorMessage: {
    ...Typography.bodySmall,
    color: Colors.errorScale[700],
    lineHeight: 16,
  },
  errorButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 6,
  },
  errorButtonText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  primaryButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  primaryButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalProgressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  modalProgressBar: {
    height: 8,
    backgroundColor: Colors.border.default,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  modalProgressText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalUnlockedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.linen,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  modalUnlockedText: {
    ...Typography.bodySmall,
    color: Colors.gold,
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    width: '100%',
  },
  modalCloseText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
    textAlign: 'center',
  },
});
export default withErrorBoundary(AchievementsPage, 'ProfileAchievements');
