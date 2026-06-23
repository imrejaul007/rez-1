import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Ring Sizer Tool Page
// Interactive tool to help users determine their ring size

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ringSizeApi from '@/services/ringSizeApi';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

interface RingSize {
  size: string;
  diameter: number;
  circumference: number;
  description: string;
}

const RING_SIZES: RingSize[] = [
  { size: '4', diameter: 14.9, circumference: 46.8, description: 'Very small' },
  { size: '4.5', diameter: 15.3, circumference: 48.0, description: 'Small' },
  { size: '5', diameter: 15.7, circumference: 49.3, description: 'Small' },
  { size: '5.5', diameter: 16.1, circumference: 50.6, description: 'Small-Medium' },
  { size: '6', diameter: 16.5, circumference: 51.9, description: 'Medium' },
  { size: '6.5', diameter: 16.9, circumference: 53.1, description: 'Medium' },
  { size: '7', diameter: 17.3, circumference: 54.4, description: 'Medium-Large' },
  { size: '7.5', diameter: 17.7, circumference: 55.7, description: 'Large' },
  { size: '8', diameter: 18.1, circumference: 56.9, description: 'Large' },
  { size: '8.5', diameter: 18.5, circumference: 58.2, description: 'Large' },
  { size: '9', diameter: 18.9, circumference: 59.5, description: 'Very Large' },
  { size: '9.5', diameter: 19.3, circumference: 60.7, description: 'Very Large' },
  { size: '10', diameter: 19.7, circumference: 62.0, description: 'Extra Large' },
];

function RingSizerPage() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<'measure' | 'compare' | 'guide'>('measure');
  const [fingerMeasurement, setFingerMeasurement] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<RingSize | null>(null);

  const handleBackPress = useCallback(() => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  }, [router]);

  const handleMethodSelect = useCallback((method: 'measure' | 'compare' | 'guide') => {
    setSelectedMethod(method);
    setSelectedSize(null);
    setFingerMeasurement('');
  }, []);

  const handleMeasurementChange = useCallback((value: string) => {
    setFingerMeasurement(value);
    const measurement = parseFloat(value);
    if (!isNaN(measurement)) {
      // Find closest ring size based on circumference
      const closestSize = RING_SIZES.reduce((prev, curr) => 
        Math.abs(curr.circumference - measurement) < Math.abs(prev.circumference - measurement) 
          ? curr : prev
      );
      setSelectedSize(closestSize);
    } else {
      setSelectedSize(null);
    }
  }, []);

  const [saving, setSaving] = useState(false);
  const [savedSize, setSavedSize] = useState<string | null>(null);
  const isMounted = useIsMounted();

  // Load saved ring size on mount
  useEffect(() => {
    loadSavedRingSize();
  }, []);

  const loadSavedRingSize = useCallback(async () => {
    try {
      const response = await ringSizeApi.getRingSize();
      if (response.success && response.data) {
        setSavedSize(response.data.size);
      }
    } catch (error) {
      // silently handle
    }
  }, []);

  const handleSaveRingSize = useCallback(async (size: RingSize) => {
    if (saving) return;

    try {
      setSaving(true);

      // Validate ring size before saving
      if (!size.size || size.size.trim() === '') {
        platformAlertSimple('Validation Error', 'Please select a valid ring size');
        return;
      }

      const response = await ringSizeApi.saveRingSize(size.size, selectedMethod);

      if (response.success) {
        if (!isMounted()) return;
        setSavedSize(size.size);
        platformAlertSimple(
          'Success',
          response.message || 'Ring size saved to your profile!'
        );
      } else {
        // Show error with retry option
        platformAlertConfirm(
          'Save Failed',
          response.error || 'Failed to save ring size',
          () => handleSaveRingSize(size),
          'Retry'
        );
      }
    } catch (error) {
      platformAlertConfirm(
        'Error',
        'An unexpected error occurred. Please try again.',
        () => handleSaveRingSize(size),
        'Retry'
      );
    } finally {
      if (!isMounted()) return;
      setSaving(false);
    }
  }, [saving, selectedMethod]);

  const handleSizeSelect = useCallback(async (size: RingSize) => {
    setSelectedSize(size);

    const isSaved = savedSize === size.size;

    platformAlertConfirm(
      'Ring Size Selected',
      `You selected ring size ${size.size} (${size.description})\n\nDiameter: ${size.diameter}mm\nCircumference: ${size.circumference}mm${isSaved ? '\n\nThis size is already saved to your profile.' : ''}`,
      () => handleSaveRingSize(size),
      isSaved ? 'Saved' : 'Save to Profile'
    );
  }, [savedSize, handleSaveRingSize]);

  const renderMeasurementMethod = () => (
    <View style={styles.methodContainer}>
      <ThemedText style={styles.methodTitle}>Measure Your Finger</ThemedText>
      <ThemedText style={styles.methodDescription}>
        Wrap a piece of string or paper around your finger, mark where it overlaps, 
        then measure the length with a ruler.
      </ThemedText>
      
      <View style={styles.measurementInput}>
        <ThemedText style={styles.inputLabel}>Finger Circumference (mm):</ThemedText>
        <View style={styles.inputContainer}>
          <ThemedText style={styles.inputPrefix}>mm</ThemedText>
          <View style={styles.inputWrapper}>
            <ThemedText style={styles.inputValue}>
              {fingerMeasurement || '0'}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.measurementButtons}>
        {[40, 45, 50, 55, 60, 65].map((value) => (
          <Pressable
            key={value}
            style={[
              styles.measurementButton,
              fingerMeasurement === value.toString() && styles.measurementButtonActive
            ]}
            onPress={() => handleMeasurementChange(value.toString())}
          >
            <ThemedText style={[
              styles.measurementButtonText,
              fingerMeasurement === value.toString() && styles.measurementButtonTextActive
            ]}>
              {value}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {selectedSize && (
        <View style={styles.resultContainer}>
          <ThemedText style={styles.resultTitle}>Recommended Size:</ThemedText>
          <Pressable
            style={styles.resultButton}
            onPress={() => handleSizeSelect(selectedSize)}
          >
            <ThemedText style={styles.resultSize}>Size {selectedSize.size}</ThemedText>
            <ThemedText style={styles.resultDescription}>{selectedSize.description}</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderCompareMethod = () => (
    <View style={styles.methodContainer}>
      <ThemedText style={styles.methodTitle}>Compare with Existing Ring</ThemedText>
      <ThemedText style={styles.methodDescription}>
        If you have a ring that fits well, place it on the chart below to find your size.
      </ThemedText>
      
      <View style={styles.sizeChart}>
        <ThemedText style={styles.chartTitle}>Ring Size Chart</ThemedText>
        <View style={styles.chartContainer}>
          {RING_SIZES.map((size) => (
            <Pressable
              key={size.size}
              style={[
                styles.sizeItem,
                selectedSize?.size === size.size && styles.sizeItemSelected
              ]}
              onPress={() => handleSizeSelect(size)}
            >
              <ThemedText style={[
                styles.sizeText,
                selectedSize?.size === size.size && styles.sizeTextSelected
              ]}>
                {size.size}
              </ThemedText>
              <ThemedText style={styles.sizeDescription}>
                {size.diameter}mm
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  const renderGuideMethod = () => (
    <View style={styles.methodContainer}>
      <ThemedText style={styles.methodTitle}>Ring Sizing Guide</ThemedText>
      
      <View style={styles.guideSection}>
        <ThemedText style={styles.guideSectionTitle}>📏 How to Measure</ThemedText>
        <ThemedText style={styles.guideText}>
          1. Use a piece of string or paper strip{'\n'}
          2. Wrap it around the base of your finger{'\n'}
          3. Mark where the string overlaps{'\n'}
          4. Measure the length with a ruler{'\n'}
          5. Use our measurement tool above
        </ThemedText>
      </View>

      <View style={styles.guideSection}>
        <ThemedText style={styles.guideSectionTitle}>💡 Tips</ThemedText>
        <ThemedText style={styles.guideText}>
          • Measure at the end of the day when fingers are largest{'\n'}
          • Measure the finger you plan to wear the ring on{'\n'}
          • If between sizes, choose the larger size{'\n'}
          • Consider the width of the ring band
        </ThemedText>
      </View>

      <View style={styles.guideSection}>
        <ThemedText style={styles.guideSectionTitle}>⚠️ Important Notes</ThemedText>
        <ThemedText style={styles.guideText}>
          • Ring sizes may vary between countries{'\n'}
          • Wide bands may require a larger size{'\n'}
          • This is a guide - professional sizing is recommended for expensive rings
        </ThemedText>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />

      {/* Header */}
      <LinearGradient colors={[Colors.brand.purple, Colors.brand.purpleLight]} style={styles.headerBg}>
        <View style={styles.headerContainer}>
          <Pressable
            style={styles.backButton}
            onPress={handleBackPress}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Ring Sizer</ThemedText>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Saved Ring Size Banner */}
        {savedSize && (
          <View style={styles.savedSizeBanner}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <ThemedText style={styles.savedSizeText}>
              Your saved ring size: {savedSize}
            </ThemedText>
          </View>
        )}

        {/* Method Selection */}
        <View
          style={styles.methodSelection}
          accessibilityLabel="Ring sizing methods"
          accessibilityRole="radiogroup"
        >
          <Pressable
            style={[
              styles.methodButton,
              selectedMethod === 'measure' && styles.methodButtonActive
            ]}
            onPress={() => handleMethodSelect('measure')}
            accessibilityLabel="Measure method"
            accessibilityRole="radio"
            accessibilityHint="Double tap to measure your finger circumference"
            accessibilityState={{ selected: selectedMethod === 'measure' }}
          >
            <Ionicons
              name="resize-outline"
              size={24}
              color={selectedMethod === 'measure' ? Colors.brand.purple : Colors.text.tertiary}
            />
            <ThemedText style={[
              styles.methodButtonText,
              selectedMethod === 'measure' && styles.methodButtonTextActive
            ]}>
              Measure
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.methodButton,
              selectedMethod === 'compare' && styles.methodButtonActive
            ]}
            onPress={() => handleMethodSelect('compare')}
            accessibilityLabel="Compare method"
            accessibilityRole="radio"
            accessibilityHint="Double tap to compare with an existing ring"
            accessibilityState={{ selected: selectedMethod === 'compare' }}
          >
            <Ionicons
              name="git-compare-outline"
              size={24}
              color={selectedMethod === 'compare' ? Colors.brand.purple : Colors.text.tertiary}
            />
            <ThemedText style={[
              styles.methodButtonText,
              selectedMethod === 'compare' && styles.methodButtonTextActive
            ]}>
              Compare
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.methodButton,
              selectedMethod === 'guide' && styles.methodButtonActive
            ]}
            onPress={() => handleMethodSelect('guide')}
            accessibilityLabel="Guide method"
            accessibilityRole="radio"
            accessibilityHint="Double tap to view ring sizing guide and tips"
            accessibilityState={{ selected: selectedMethod === 'guide' }}
          >
            <Ionicons
              name="help-circle-outline"
              size={24}
              color={selectedMethod === 'guide' ? Colors.brand.purple : Colors.text.tertiary}
            />
            <ThemedText style={[
              styles.methodButtonText,
              selectedMethod === 'guide' && styles.methodButtonTextActive
            ]}>
              Guide
            </ThemedText>
          </Pressable>
        </View>

        {/* Method Content */}
        {selectedMethod === 'measure' && renderMeasurementMethod()}
        {selectedMethod === 'compare' && renderCompareMethod()}
        {selectedMethod === 'guide' && renderGuideMethod()}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  headerBg: {
    paddingTop: StatusBar.currentHeight || 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: Colors.text.inverse,
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  savedSizeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successScale[50],
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  savedSizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    marginLeft: 8,
  },
  methodSelection: {
    flexDirection: 'row',
    marginVertical: 20,
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  methodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  methodButtonActive: {
    backgroundColor: colors.tint.pink,  // purple scale tint
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  methodButtonTextActive: {
    color: Colors.brand.purple,
  },
  methodContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  methodDescription: {
    fontSize: 14,
    color: Colors.text.tertiary,
    lineHeight: 20,
    marginBottom: 20,
  },
  measurementInput: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputPrefix: {
    fontSize: 16,
    color: Colors.text.tertiary,
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
  },
  inputValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  measurementButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  measurementButton: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  measurementButtonActive: {
    backgroundColor: Colors.brand.purple,
  },
  measurementButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  measurementButtonTextActive: {
    color: Colors.text.inverse,
  },
  resultContainer: {
    backgroundColor: colors.successScale[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.successScale[200],
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  resultButton: {
    alignItems: 'center',
  },
  resultSize: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#166534',
  },
  resultDescription: {
    fontSize: 14,
    color: '#166534',
  },
  sizeChart: {
    marginTop: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeItem: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  sizeItemSelected: {
    backgroundColor: Colors.brand.purple,
  },
  sizeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.secondary,
  },
  sizeTextSelected: {
    color: Colors.text.inverse,
  },
  sizeDescription: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  guideSection: {
    marginBottom: 20,
  },
  guideSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  guideText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
});

export default withErrorBoundary(RingSizerPage, 'RingSizer');
