// @ts-nocheck
/**
 * Points Slider Component
 * Allow users to select how many points to use for checkout
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@/components/common/CrossPlatformSlider';
import { ThemedText } from '@/components/ThemedText';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface PointsSliderProps {
  availablePoints: number;
  maxPointsForOrder: number;
  pointValue: number; // e.g., 1 point = ₹0.10
  onValueChange: (points: number, discount: number) => void;
}

function PointsSlider({
  availablePoints,
  maxPointsForOrder,
  pointValue,
  onValueChange,
}: PointsSliderProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const maxUsablePoints = Math.min(availablePoints, maxPointsForOrder);
  const [selectedPoints, setSelectedPoints] = useState(0);
  const discount = selectedPoints * pointValue;

  const handleValueChange = (value: number) => {
    const points = Math.round(value);
    setSelectedPoints(points);
    onValueChange(points, points * pointValue);
  };

  return (
    <View
      style={styles.container}
      accessible={false}
    >
      <View style={styles.header}>
        <ThemedText
          style={styles.title}
          accessible={true}
          accessibilityRole="header"
        >
          Use Points for Discount
        </ThemedText>
        <View
          style={styles.availablePoints}
          accessible={true}
          accessibilityLabel={`${availablePoints} points available`}
        >
          <Ionicons name="diamond" size={14} color={colors.warningScale[400]} />
          <ThemedText style={styles.availableText}>{availablePoints} available</ThemedText>
        </View>
      </View>

      <View
        style={styles.selectedContainer}
        accessible={true}
        accessibilityLabel={`${selectedPoints} points equals ${discount.toFixed(2)} rupees discount`}
        accessibilityRole="text"
      >
        <View style={styles.selectedPoints}>
          <Ionicons name="diamond" size={24} color={colors.brand.purpleLight} />
          <ThemedText style={styles.selectedValue}>{selectedPoints}</ThemedText>
          <ThemedText style={styles.selectedLabel}>points</ThemedText>
        </View>

        <View style={styles.equals}>
          <Ionicons name="arrow-forward" size={20} color={colors.neutral[500]} />
        </View>

        <View style={styles.selectedDiscount}>
          <ThemedText style={styles.discountValue}>{currencySymbol}{discount.toFixed(2)}</ThemedText>
          <ThemedText style={styles.discountLabel}>discount</ThemedText>
        </View>
      </View>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={maxUsablePoints}
          step={10}
          value={selectedPoints}
          onValueChange={handleValueChange}
          minimumTrackTintColor={colors.brand.purpleLight}
          maximumTrackTintColor={colors.neutral[200]}
          thumbTintColor={colors.brand.purpleLight}
          accessible={true}
          accessibilityLabel="Points slider"
          accessibilityHint={`Adjust to use between 0 and ${maxUsablePoints} points. Currently using ${selectedPoints} points for ${discount.toFixed(2)} rupees discount.`}
          accessibilityValue={{
            min: 0,
            max: maxUsablePoints,
            now: selectedPoints,
            text: `${selectedPoints} points, ${discount.toFixed(2)} rupees discount`
          }}
          accessibilityRole="adjustable"
        />
      </View>

      <View style={styles.marks} accessible={false}>
        <ThemedText style={styles.markText}>0</ThemedText>
        <ThemedText style={styles.markText}>{maxUsablePoints}</ThemedText>
      </View>

      {selectedPoints > 0 && (
        <View
          style={styles.info}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel="Information: Points will be deducted after order confirmation"
        >
          <Ionicons name="information-circle" size={16} color={colors.neutral[500]} />
          <ThemedText style={styles.infoText}>
            Points will be deducted after order confirmation
          </ThemedText>
        </View>
      )}
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  availablePoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  availableText: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 16,
  },
  selectedPoints: {
    alignItems: 'center',
    flex: 1,
  },
  selectedValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.brand.purpleLight,
    marginTop: 4,
  },
  selectedLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  equals: {
    width: 40,
    alignItems: 'center',
  },
  selectedDiscount: {
    alignItems: 'center',
    flex: 1,
  },
  discountValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.lightMustard,
  },
  discountLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  sliderContainer: {
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  marks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  markText: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.indigoMist,
    padding: 10,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.neutral[500],
  },
});

export default React.memo(PointsSlider);
