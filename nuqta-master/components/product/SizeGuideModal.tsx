// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

/**
 * SizeGuideModal Component
 *
 * Comprehensive size guide with charts, measurements, and recommendations
 * Features:
 * - Size chart tables with measurements
 * - Multiple tabs (Size Chart, How to Measure, Size Finder)
 * - Regional size conversions (US, UK, EU, etc.)
 * - Interactive size finder with user measurements
 * - Fit guide (Slim, Regular, Loose)
 * - Visual measurement instructions
 * - Category-specific guides (clothing, shoes, accessories)
 */

interface SizeData {
  size: string;
  measurements: {
    [key: string]: string; // e.g., "chest": "36-38", "waist": "30-32"
  };
  conversions?: {
    us?: string;
    uk?: string;
    eu?: string;
    jp?: string;
  };
}

interface SizeGuideModalProps {
  visible: boolean;
  onClose: () => void;
  category: 'clothing' | 'shoes' | 'accessories';
  sizeChart: SizeData[];
  productName?: string;
  fitType?: 'slim' | 'regular' | 'loose';
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({
  visible,
  onClose,
  category,
  sizeChart,
  productName,
  fitType = 'regular',
}) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'measure' | 'finder'>('chart');
  const [measurements, setMeasurements] = useState({
    chest: '',
    waist: '',
    hips: '',
    inseam: '',
  });
  const [recommendedSize, setRecommendedSize] = useState<string | null>(null);
  const [measurementUnit, setMeasurementUnit] = useState<'cm' | 'inch'>('cm');

  /**
   * Get measurement keys based on category
   */
  const getMeasurementKeys = (): string[] => {
    switch (category) {
      case 'clothing':
        return ['chest', 'waist', 'hips', 'length'];
      case 'shoes':
        return ['length', 'width'];
      case 'accessories':
        return ['circumference', 'width'];
      default:
        return ['chest', 'waist'];
    }
  };

  /**
   * Find recommended size based on user measurements
   */
  const findRecommendedSize = () => {
    if (!measurements.chest && !measurements.waist) {
      return;
    }

    // Simple algorithm - in production, use more sophisticated matching
    const chestValue = parseFloat(measurements.chest);
    const waistValue = parseFloat(measurements.waist);

    if (!chestValue && !waistValue) {
      return;
    }

    // Find matching size (this is simplified logic)
    const matchedSize = sizeChart.find(size => {
      const chestRange = size.measurements.chest?.split('-');
      const waistRange = size.measurements.waist?.split('-');

      if (chestRange && chestValue) {
        const min = parseFloat(chestRange[0]);
        const max = parseFloat(chestRange[1] || chestRange[0]);
        if (chestValue >= min && chestValue <= max) {
          return true;
        }
      }

      if (waistRange && waistValue) {
        const min = parseFloat(waistRange[0]);
        const max = parseFloat(waistRange[1] || waistRange[0]);
        if (waistValue >= min && waistValue <= max) {
          return true;
        }
      }

      return false;
    });

    setRecommendedSize(matchedSize?.size || null);
  };

  /**
   * Render size chart table
   */
  const renderSizeChart = () => {
    const keys = getMeasurementKeys();

    return (
      <View style={styles.tableContainer}>
        {/* Unit Toggle */}
        <View style={styles.unitToggle}>
          <Pressable
            style={[styles.unitButton, measurementUnit === 'cm' && styles.unitButtonActive]}
            onPress={() => setMeasurementUnit('cm')}
           
          >
            <ThemedText
              style={[styles.unitButtonText, measurementUnit === 'cm' && styles.unitButtonTextActive]}
            >
              CM
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.unitButton, measurementUnit === 'inch' && styles.unitButtonActive]}
            onPress={() => setMeasurementUnit('inch')}
           
          >
            <ThemedText
              style={[
                styles.unitButtonText,
                measurementUnit === 'inch' && styles.unitButtonTextActive,
              ]}
            >
              INCH
            </ThemedText>
          </Pressable>
        </View>

        {/* Table Header */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableHeaderCell, styles.sizeColumn]}>
                <ThemedText style={styles.tableHeaderText}>Size</ThemedText>
              </View>
              {keys.map(key => (
                <View key={key} style={styles.tableHeaderCell}>
                  <ThemedText style={styles.tableHeaderText}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </ThemedText>
                  <ThemedText style={styles.tableHeaderSubtext}>
                    ({measurementUnit})
                  </ThemedText>
                </View>
              ))}
            </View>

            {/* Table Rows */}
            {sizeChart.map((sizeData, index) => (
              <View
                key={index}
                style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
              >
                <View style={[styles.tableCell, styles.sizeColumn]}>
                  <ThemedText style={styles.tableCellTextBold}>{sizeData.size}</ThemedText>
                </View>
                {keys.map(key => (
                  <View key={key} style={styles.tableCell}>
                    <ThemedText style={styles.tableCellText}>
                      {sizeData.measurements[key] || '-'}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Size Conversions */}
        {sizeChart[0]?.conversions && (
          <View style={styles.conversionsSection}>
            <ThemedText style={styles.sectionTitle}>International Size Conversions</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.conversionTable}>
                {/* Header */}
                <View style={styles.conversionRow}>
                  <View style={styles.conversionHeaderCell}>
                    <ThemedText style={styles.conversionHeaderText}>US</ThemedText>
                  </View>
                  <View style={styles.conversionHeaderCell}>
                    <ThemedText style={styles.conversionHeaderText}>UK</ThemedText>
                  </View>
                  <View style={styles.conversionHeaderCell}>
                    <ThemedText style={styles.conversionHeaderText}>EU</ThemedText>
                  </View>
                  <View style={styles.conversionHeaderCell}>
                    <ThemedText style={styles.conversionHeaderText}>JP</ThemedText>
                  </View>
                </View>
                {/* Data Rows */}
                {sizeChart.map((sizeData, index) => (
                  <View key={index} style={styles.conversionRow}>
                    <View style={styles.conversionCell}>
                      <ThemedText style={styles.conversionCellText}>
                        {sizeData.conversions?.us || '-'}
                      </ThemedText>
                    </View>
                    <View style={styles.conversionCell}>
                      <ThemedText style={styles.conversionCellText}>
                        {sizeData.conversions?.uk || '-'}
                      </ThemedText>
                    </View>
                    <View style={styles.conversionCell}>
                      <ThemedText style={styles.conversionCellText}>
                        {sizeData.conversions?.eu || '-'}
                      </ThemedText>
                    </View>
                    <View style={styles.conversionCell}>
                      <ThemedText style={styles.conversionCellText}>
                        {sizeData.conversions?.jp || '-'}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Fit Guide */}
        <View style={styles.fitGuide}>
          <ThemedText style={styles.sectionTitle}>Fit Guide</ThemedText>
          <View style={styles.fitOptions}>
            {['slim', 'regular', 'loose'].map(fit => (
              <View
                key={fit}
                style={[styles.fitOption, fitType === fit && styles.fitOptionActive]}
              >
                <Ionicons
                  name={fitType === fit ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={fitType === fit ? colors.brand.purpleLight : colors.neutral[400]}
                />
                <ThemedText
                  style={[styles.fitOptionText, fitType === fit && styles.fitOptionTextActive]}
                >
                  {fit.charAt(0).toUpperCase() + fit.slice(1)} Fit
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  /**
   * Render how to measure instructions
   */
  const renderHowToMeasure = () => {
    const instructions = {
      clothing: [
        {
          title: 'Chest',
          description: 'Measure around the fullest part of your chest, keeping the tape horizontal.',
          icon: 'body' as const,
        },
        {
          title: 'Waist',
          description: 'Measure around your natural waistline, keeping the tape comfortably loose.',
          icon: 'fitness' as const,
        },
        {
          title: 'Hips',
          description: 'Measure around the fullest part of your hips, about 8" below your waist.',
          icon: 'body' as const,
        },
        {
          title: 'Inseam',
          description: 'Measure from the crotch to the bottom of the leg along the inside seam.',
          icon: 'resize' as const,
        },
      ],
      shoes: [
        {
          title: 'Foot Length',
          description: 'Measure from heel to longest toe. Stand with weight evenly distributed.',
          icon: 'footsteps' as const,
        },
        {
          title: 'Foot Width',
          description: 'Measure across the widest part of your foot.',
          icon: 'resize-outline' as const,
        },
      ],
      accessories: [
        {
          title: 'Circumference',
          description: 'Measure around the intended area (wrist, neck, etc.).',
          icon: 'refresh' as const,
        },
      ],
    };

    const categoryInstructions = instructions[category];

    return (
      <View style={styles.measureContainer}>
        <View style={styles.measureHeader}>
          <Ionicons name="information-circle" size={24} color={colors.brand.purpleLight} />
          <ThemedText style={styles.measureHeaderText}>
            Follow these steps for accurate measurements
          </ThemedText>
        </View>

        {categoryInstructions.map((instruction, index) => (
          <View key={index} style={styles.instructionCard}>
            <View style={styles.instructionIcon}>
              <Ionicons name={instruction.icon} size={32} color={colors.brand.purpleLight} />
            </View>
            <View style={styles.instructionContent}>
              <ThemedText style={styles.instructionTitle}>{instruction.title}</ThemedText>
              <ThemedText style={styles.instructionDescription}>
                {instruction.description}
              </ThemedText>
            </View>
          </View>
        ))}

        {/* Tips */}
        <View style={styles.tipsSection}>
          <ThemedText style={styles.tipsTitle}>💡 Pro Tips</ThemedText>
          <View style={styles.tipItem}>
            <View style={styles.tipBullet} />
            <ThemedText style={styles.tipText}>
              Use a flexible measuring tape for best results
            </ThemedText>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipBullet} />
            <ThemedText style={styles.tipText}>
              Take measurements over light clothing or undergarments
            </ThemedText>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipBullet} />
            <ThemedText style={styles.tipText}>
              Measure twice to ensure accuracy
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  /**
   * Render size finder tool
   */
  const renderSizeFinder = () => {
    return (
      <View style={styles.finderContainer}>
        <View style={styles.finderHeader}>
          <Ionicons name="calculator" size={24} color={colors.brand.purpleLight} />
          <ThemedText style={styles.finderHeaderText}>
            Enter your measurements to find your perfect size
          </ThemedText>
        </View>

        {/* Measurement Inputs */}
        <View style={styles.inputsContainer}>
          {category === 'clothing' && (
            <>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>
                  Chest ({measurementUnit})
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 38"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="numeric"
                  value={measurements.chest}
                  onChangeText={text => setMeasurements({ ...measurements, chest: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>
                  Waist ({measurementUnit})
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 32"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="numeric"
                  value={measurements.waist}
                  onChangeText={text => setMeasurements({ ...measurements, waist: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>
                  Hips ({measurementUnit})
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 40"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="numeric"
                  value={measurements.hips}
                  onChangeText={text => setMeasurements({ ...measurements, hips: text })}
                />
              </View>
            </>
          )}
        </View>

        {/* Find Size Button */}
        <Pressable
          style={styles.findButton}
          onPress={findRecommendedSize}
         
        >
          <Ionicons name="search" size={20} color={colors.background.primary} />
          <ThemedText style={styles.findButtonText}>Find My Size</ThemedText>
        </Pressable>

        {/* Recommended Size Result */}
        {recommendedSize && (
          <View style={styles.resultContainer}>
            <Ionicons name="checkmark-circle" size={32} color={colors.successScale[400]} />
            <ThemedText style={styles.resultTitle}>Your Recommended Size</ThemedText>
            <View style={styles.resultSizeBadge}>
              <ThemedText style={styles.resultSizeText}>{recommendedSize}</ThemedText>
            </View>
            <ThemedText style={styles.resultNote}>
              Based on your measurements, we recommend this size for the best fit.
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modalContent}>
          {/* Handle Bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="shirt" size={24} color={colors.brand.purpleLight} />
              <View style={styles.headerTextContainer}>
                <ThemedText style={styles.title}>Size Guide</ThemedText>
                {productName && (
                  <ThemedText style={styles.subtitle} numberOfLines={1}>
                    {productName}
                  </ThemedText>
                )}
              </View>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.neutral[500]} />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, activeTab === 'chart' && styles.tabActive]}
              onPress={() => setActiveTab('chart')}
             
            >
              <Ionicons
                name="list"
                size={18}
                color={activeTab === 'chart' ? colors.brand.purpleLight : colors.neutral[500]}
              />
              <ThemedText style={[styles.tabText, activeTab === 'chart' && styles.tabTextActive]}>
                Size Chart
              </ThemedText>
            </Pressable>

            <Pressable
              style={[styles.tab, activeTab === 'measure' && styles.tabActive]}
              onPress={() => setActiveTab('measure')}
             
            >
              <Ionicons
                name="ruler"
                size={18}
                color={activeTab === 'measure' ? colors.brand.purpleLight : colors.neutral[500]}
              />
              <ThemedText
                style={[styles.tabText, activeTab === 'measure' && styles.tabTextActive]}
              >
                How to Measure
              </ThemedText>
            </Pressable>

            <Pressable
              style={[styles.tab, activeTab === 'finder' && styles.tabActive]}
              onPress={() => setActiveTab('finder')}
             
            >
              <Ionicons
                name="calculator"
                size={18}
                color={activeTab === 'finder' ? colors.brand.purpleLight : colors.neutral[500]}
              />
              <ThemedText style={[styles.tabText, activeTab === 'finder' && styles.tabTextActive]}>
                Size Finder
              </ThemedText>
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'chart' && renderSizeChart()}
            {activeTab === 'measure' && renderHowToMeasure()}
            {activeTab === 'finder' && renderSizeFinder()}

            <View style={styles.bottomSpace} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
  },

  // Handle Bar
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.neutral[50],
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.tint.pink,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  tabTextActive: {
    color: colors.brand.purpleLight,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Unit Toggle
  unitToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
  },
  unitButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: colors.background.primary,
  },
  unitButtonActive: {
    backgroundColor: colors.brand.purpleLight,
  },
  unitButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  unitButtonTextActive: {
    color: colors.background.primary,
  },

  // Table
  tableContainer: {
    gap: 20,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  tableRowEven: {
    backgroundColor: colors.neutral[50],
  },
  tableHeaderCell: {
    width: 100,
    padding: 12,
    backgroundColor: colors.brand.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeColumn: {
    width: 80,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background.primary,
  },
  tableHeaderSubtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  tableCell: {
    width: 100,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCellText: {
    fontSize: 13,
    color: colors.neutral[700],
  },
  tableCellTextBold: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
  },

  // Conversions
  conversionsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  conversionTable: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 8,
    overflow: 'hidden',
  },
  conversionRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  conversionHeaderCell: {
    width: 80,
    padding: 10,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral[700],
  },
  conversionCell: {
    width: 80,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversionCellText: {
    fontSize: 13,
    color: colors.neutral[700],
  },

  // Fit Guide
  fitGuide: {
    gap: 12,
  },
  fitOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  fitOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.neutral[50],
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  fitOptionActive: {
    backgroundColor: colors.tint.pink,
    borderColor: colors.brand.purpleLight,
  },
  fitOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  fitOptionTextActive: {
    color: colors.brand.purpleLight,
  },

  // How to Measure
  measureContainer: {
    gap: 20,
  },
  measureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.pink,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  measureHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purple,
    lineHeight: 20,
  },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[50],
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  instructionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.tint.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionContent: {
    flex: 1,
    gap: 6,
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  instructionDescription: {
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 18,
  },

  // Tips
  tipsSection: {
    backgroundColor: colors.tint.amberLight,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.brand.amberDark,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.amberDark,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.brand.amberDark,
    lineHeight: 18,
  },

  // Size Finder
  finderContainer: {
    gap: 20,
  },
  finderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.pink,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  finderHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purple,
    lineHeight: 20,
  },
  inputsContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  input: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.neutral[900],
  },
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.purpleLight,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  findButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },

  // Result
  resultContainer: {
    alignItems: 'center',
    backgroundColor: colors.tint.green,
    padding: 24,
    borderRadius: 16,
    gap: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  resultSizeBadge: {
    backgroundColor: colors.successScale[400],
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 8,
  },
  resultSizeText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.background.primary,
  },
  resultNote: {
    fontSize: 13,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Bottom Space
  bottomSpace: {
    height: 40,
  },
});

export default React.memo(SizeGuideModal);
