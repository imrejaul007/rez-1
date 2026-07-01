/**
 * /b/savings/goals — savings goals list screen.
 *
 * - Header: "Your goals".
 * - FAB (gold, bottom-right) opens an inline add-goal modal.
 * - `FlashList` of `SavingsGoalCard`s (with empty state).
 * - Add-goal modal: name, target (₹), deadline (text input for stub),
 *   category. Save calls `useSavingsGoals().create`.
 * - Wrapped in `withErrorBoundary`.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRTL } from '@/hooks/useRTL';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import SavingsGoalCard from '@/components/b/savings/SavingsGoalCard';
import { useSavingsGoals } from '@/hooks/b/savings/useSavingsGoals';
import logger from '@/utils/logger';
import type { SavingsGoal } from '@/types/savings.types';

interface DraftGoal {
  name: string;
  targetRupees: string; // string to allow free typing
  deadline: string; // YYYY-MM-DD stub
  category: string;
}

const EMPTY_DRAFT: DraftGoal = {
  name: '',
  targetRupees: '',
  deadline: '',
  category: '',
};

function SavingsGoalsScreen() {
  const router = useRouter();
  const { goals, isMutating, error, create, refresh } = useSavingsGoals();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [draft, setDraft] = useState<DraftGoal>(EMPTY_DRAFT);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      logger.info('screen_view', { screen: 'Savings Goals' }, 'B Features');
      refresh().catch(() => {
        /* errors surface via store */
      });
      return () => {
        /* no cleanup */
      };
    }, [refresh]),
  );

  const openModal = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setSubmitError(null);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const onSave = useCallback(async () => {
    const trimmedName = draft.name.trim();
    const rupees = Number(draft.targetRupees);
    if (!trimmedName) {
      setSubmitError('Name is required');
      return;
    }
    if (!Number.isFinite(rupees) || rupees <= 0) {
      setSubmitError('Target must be a positive number');
      return;
    }

    // Convert rupees to paise (integer).
    const targetPaise = Math.round(rupees * 100);

    // Deadline defaults to 1 year from now if blank.
    let deadlineIso: string;
    if (draft.deadline.trim()) {
      const parsed = new Date(draft.deadline.trim());
      if (Number.isNaN(parsed.getTime())) {
        setSubmitError('Deadline must be a valid date (YYYY-MM-DD)');
        return;
      }
      deadlineIso = parsed.toISOString();
    } else {
      const oneYearOut = new Date();
      oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
      deadlineIso = oneYearOut.toISOString();
    }

    setSubmitError(null);
    const category = draft.category.trim() || undefined;

    const result = await create({
      name: trimmedName,
      targetPaise,
      deadline: deadlineIso,
      category,
    });

    if (result === null) {
      setSubmitError('Could not create goal — please try again');
      return;
    }

    setModalVisible(false);
  }, [draft, create]);

  const onItemPress = useCallback(
    (goal: SavingsGoal) => {
      logger.info('savings_goal_item_pressed', { id: goal.id }, 'B Features');
      // Detail screen intentionally out of scope for the stub — keep tap
      // a no-op so users still get haptic feedback without a 404.
    },
    [],
  );

  const headerRight = useMemo(
    () => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add goal"
        onPress={openModal}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Text style={styles.fabIcon}>＋</Text>
      </Pressable>
    ),
    [openModal],
  );

  const emptyState = useMemo(
    () => (
      <View style={styles.emptyWrap} accessibilityLabel="No goals yet">
        <Text style={styles.emptyTitle}>No goals yet</Text>
        <Text style={styles.emptySub}>Tap ＋ to add one</Text>
      </View>
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.push('/b/savings' as const);
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Your goals</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      {error ? (
        <View style={styles.errorBanner} accessibilityLabel="Goals error">
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <SavingsGoalCard goal={item} onPress={() => onItemPress(item)} />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={emptyState}
        keyboardShouldPersistTaps="handled"
        getItemLayout={(_, index) => ({
          length: 120,
          offset: 120 * index,
          index,
        })}
      />

      {headerRight}

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={closeModal}
        accessibilityViewIsModal
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add a goal</Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              accessibilityLabel="Goal name"
              style={styles.input}
              placeholder="e.g. Goa Trip"
              placeholderTextColor={colors.text.tertiary}
              value={draft.name}
              onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
            />

            <Text style={styles.fieldLabel}>Target (₹)</Text>
            <TextInput
              accessibilityLabel="Target amount in rupees"
              style={styles.input}
              placeholder="e.g. 50000"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="numeric"
              value={draft.targetRupees}
              onChangeText={(v) => setDraft((d) => ({ ...d, targetRupees: v }))}
            />

            <Text style={styles.fieldLabel}>Deadline (YYYY-MM-DD)</Text>
            <TextInput
              accessibilityLabel="Deadline"
              style={styles.input}
              placeholder="2026-12-31"
              placeholderTextColor={colors.text.tertiary}
              value={draft.deadline}
              onChangeText={(v) => setDraft((d) => ({ ...d, deadline: v }))}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.fieldLabel}>Category (optional)</Text>
            <TextInput
              accessibilityLabel="Category"
              style={styles.input}
              placeholder="travel, electronics, ..."
              placeholderTextColor={colors.text.tertiary}
              value={draft.category}
              onChangeText={(v) => setDraft((d) => ({ ...d, category: v }))}
            />

            {submitError ? (
              <Text style={styles.submitError} accessibilityLabel={submitError}>
                {submitError}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={closeModal}
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save goal"
                onPress={onSave}
                disabled={isMutating}
                style={({ pressed }) => [
                  styles.saveBtn,
                  pressed && styles.btnPressed,
                  isMutating && styles.btnDisabled,
                ]}
              >
                <Text style={styles.saveText}>{isMutating ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backText: {
    ...typography.label,
    color: colors.nileBlue,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.nileBlue,
  },
  headerRightSpacer: {
    width: 64,
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    flexGrow: 1,
  },
  row: {
    marginBottom: spacing.sm,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
  },
  emptySub: {
    ...typography.body,
    color: colors.text.secondary,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.nileBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabPressed: {
    opacity: 0.85,
  },
  fabIcon: {
    color: colors.nileBlue,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
  },
  errorBanner: {
    margin: spacing.base,
    padding: spacing.sm,
    backgroundColor: colors.errorScale?.[50] ?? '#FEF2F2',
    borderRadius: borderRadius.md,
  },
  errorBannerText: {
    ...typography.body,
    color: colors.error,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 58, 82, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.nileBlue,
    marginBottom: spacing.base,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  submitError: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  saveBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gold,
  },
  btnPressed: {
    opacity: 0.8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  cancelText: {
    ...typography.label,
    color: colors.nileBlue,
  },
  saveText: {
    ...typography.label,
    color: colors.nileBlue,
  },
});

export default withErrorBoundary(SavingsGoalsScreen, 'Savings Goals');
