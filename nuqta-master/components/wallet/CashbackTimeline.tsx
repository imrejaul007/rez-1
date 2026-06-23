/**
 * CashbackTimeline — Visual status tracker for cashback transactions
 * Shows progression: Pending → Verified → Credited
 */
import React, { useEffect} from 'react';
import { View, Text, StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export interface TimelineStep {
  label: string;
  timestamp?: string; // ISO date string if complete
  isComplete: boolean;
  isCurrent: boolean;
  estimate?: string; // e.g. "~2 hours"
}

interface CashbackTimelineProps {
  steps: TimelineStep[];
}

function CashbackTimeline({ steps }: CashbackTimelineProps) {
  const pulseAnim = useSharedValue(0.4);
  const pulseAnimStyle = useAnimatedStyle(() => ({ opacity: pulseAnim.value }));

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1
    );
  }, [pulseAnim]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <View key={index} style={styles.stepRow}>
            {/* Dot + Line */}
            <View style={styles.dotColumn}>
              {step.isComplete ? (
                <View style={[styles.dot, styles.dotComplete]}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              ) : step.isCurrent ? (
                <Animated.View style={[styles.dot, styles.dotCurrent, pulseAnimStyle]}>
                  <View style={styles.dotInner} />
                </Animated.View>
              ) : (
                <View style={[styles.dot, styles.dotPending]} />
              )}
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    step.isComplete ? styles.lineComplete : styles.linePending,
                  ]}
                />
              )}
            </View>

            {/* Label + timestamp */}
            <View style={styles.content}>
              <Text
                style={[
                  styles.label,
                  step.isComplete && styles.labelComplete,
                  step.isCurrent && styles.labelCurrent,
                ]}
              >
                {step.label}
              </Text>
              {step.timestamp ? (
                <Text style={styles.timestamp}>{formatDate(step.timestamp)}</Text>
              ) : step.estimate ? (
                <Text style={styles.estimate}>{step.estimate}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 4 },
  stepRow: {
    flexDirection: 'row',
    minHeight: 48 },
  dotColumn: {
    width: 28,
    alignItems: 'center' },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center' },
  dotComplete: {
    backgroundColor: '#10B981' },
  dotCurrent: {
    backgroundColor: colors.brand.purple,
    width: 22,
    height: 22,
    borderRadius: 11 },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff' },
  dotPending: {
    backgroundColor: colors.neutral[300],
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 3 },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    minHeight: 16 },
  lineComplete: {
    backgroundColor: '#10B981' },
  linePending: {
    backgroundColor: colors.neutral[200] },
  content: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 12 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[400] },
  labelComplete: {
    color: '#111827',
    fontWeight: '600' },
  labelCurrent: {
    color: colors.brand.purple,
    fontWeight: '700' },
  timestamp: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 2 },
  estimate: {
    fontSize: 11,
    color: colors.brand.purple,
    fontWeight: '500',
    marginTop: 2 } });

export default React.memo(CashbackTimeline);
