import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface FlashSaleTimerProps {
  endTime: Date | string;
  onExpire?: () => void;
  compact?: boolean;
  showProgress?: boolean;
  soldQuantity?: number;
  maxQuantity?: number;
}

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const FlashSaleTimer: React.FC<FlashSaleTimerProps> = ({
  endTime,
  onExpire,
  compact = false,
  showProgress = false,
  soldQuantity = 0,
  maxQuantity = 100,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const end = new Date(endTime).getTime();
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, total: 0 });
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds, total: diff });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  const isExpiring = timeRemaining.total > 0 && timeRemaining.total <= 5 * 60 * 1000; // 5 minutes
  const isCritical = timeRemaining.total > 0 && timeRemaining.total <= 60 * 1000; // 1 minute

  const progress = maxQuantity > 0 ? (soldQuantity / maxQuantity) * 100 : 0;
  const remainingQuantity = maxQuantity - soldQuantity;

  if (timeRemaining.total <= 0) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <Text style={styles.expiredText}>Sale Ended</Text>
      </View>
    );
  }

  const formatNumber = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Timer Display */}
      <View style={styles.timerContainer}>
        <Text style={[styles.label, compact && styles.labelCompact]}>
          {isCritical ? 'ENDING NOW!' : isExpiring ? 'ENDING SOON!' : 'ENDS IN'}
        </Text>

        <View style={styles.timeDisplay}>
          <View style={[styles.timeBox, isCritical && styles.timeBoxCritical]}>
            <Text style={[styles.timeNumber, compact && styles.timeNumberCompact]}>
              {formatNumber(timeRemaining.hours)}
            </Text>
            {!compact && <Text style={styles.timeUnit}>HR</Text>}
          </View>

          <Text style={[styles.separator, compact && styles.separatorCompact]}>:</Text>

          <View style={[styles.timeBox, isCritical && styles.timeBoxCritical]}>
            <Text style={[styles.timeNumber, compact && styles.timeNumberCompact]}>
              {formatNumber(timeRemaining.minutes)}
            </Text>
            {!compact && <Text style={styles.timeUnit}>MIN</Text>}
          </View>

          <Text style={[styles.separator, compact && styles.separatorCompact]}>:</Text>

          <View style={[styles.timeBox, isCritical && styles.timeBoxCritical]}>
            <Text style={[styles.timeNumber, compact && styles.timeNumberCompact]}>
              {formatNumber(timeRemaining.seconds)}
            </Text>
            {!compact && <Text style={styles.timeUnit}>SEC</Text>}
          </View>
        </View>
      </View>

      {/* Progress Bar & Stock Info */}
      {showProgress && (
        <View style={styles.progressContainer}>
          {/* Stock Status */}
          <Text style={styles.stockText}>
            {remainingQuantity > 10
              ? `${remainingQuantity} items left`
              : remainingQuantity > 0
              ? `Hurry! Only ${remainingQuantity} left!`
              : 'Sold Out!'}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={progress >= 80 ? [colors.error, colors.error] : [colors.successScale[400], colors.successScale[700]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}% sold</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.tint.amberLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.warningScale[400],
  },
  containerCompact: {
    padding: 8,
    borderRadius: 8,
  },
  timerContainer: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.amberDeep,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  labelCompact: {
    fontSize: 10,
    marginBottom: 4,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBox: {
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 56,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warningScale[400],
  },
  timeBoxCritical: {
    backgroundColor: colors.errorScale[100],
    borderColor: colors.error,
  },
  timeNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral[800],
  },
  timeNumberCompact: {
    fontSize: 18,
  },
  timeUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.neutral[500],
    marginTop: 2,
  },
  separator: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.warningScale[400],
    marginHorizontal: 4,
  },
  separatorCompact: {
    fontSize: 18,
    marginHorizontal: 2,
  },
  expiredText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 12,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.amberDeep,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral[500],
    minWidth: 52,
    textAlign: 'right',
  },
});

export default React.memo(FlashSaleTimer);
