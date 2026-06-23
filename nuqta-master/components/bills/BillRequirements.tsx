// Bill Requirements
// Shows upload guidelines and requirements

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

function BillRequirements() {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const requirements = [
    {
      icon: 'image-outline',
      title: 'Clear Image',
      description: 'Bill should be clear, well-lit, and all text should be readable',
      color: '#2196F3',
    },
    {
      icon: 'resize-outline',
      title: 'Full Bill',
      description: 'Capture the entire bill including merchant name, amount, and date',
      color: colors.brand.emerald,
    },
    {
      icon: 'calendar-outline',
      title: 'Recent Bills',
      description: 'Bills must be no older than 30 days from purchase date',
      color: '#FF9800',
    },
    {
      icon: 'cash-outline',
      title: 'Amount Range',
      description: `Minimum ${currencySymbol}50, Maximum ${currencySymbol}1,00,000 per bill`,
      color: '#9C27B0',
    },
    {
      icon: 'storefront-outline',
      title: 'Registered Merchants',
      description: 'Only bills from registered merchants are eligible',
      color: '#FF6B35',
    },
    {
      icon: 'document-outline',
      title: 'Original Bills',
      description: 'Photocopies, screenshots, or edited images are not accepted',
      color: '#F44336',
    },
  ];

  const tips = [
    'Place the bill on a flat, contrasting surface',
    'Ensure good lighting without shadows',
    'Keep the camera steady and parallel to the bill',
    'Avoid glare and reflections',
    'Capture all four corners of the bill',
    'Use higher resolution for better OCR accuracy',
  ];

  const dosDonts = {
    dos: [
      'Upload original bill photos',
      'Ensure all text is visible',
      'Check merchant name is clear',
      'Verify amount and date are readable',
    ],
    donts: [
      "Don't crop important details",
      "Don't upload blurry images",
      "Don't submit duplicate bills",
      "Don't edit or modify the image",
    ],
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="information-circle" size={32} color="#FF6B35" />
        <Text style={styles.headerTitle}>Bill Upload Guidelines</Text>
        <Text style={styles.headerSubtitle}>
          Follow these guidelines to ensure quick approval and cashback credit
        </Text>
      </View>

      {/* Requirements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Requirements</Text>
        {requirements.map((req, index) => (
          <View key={index} style={styles.requirementCard}>
            <View style={[styles.iconCircle, { backgroundColor: req.color + '20' }]}>
              <Ionicons name={req.icon as any} size={24} color={req.color} />
            </View>
            <View style={styles.requirementContent}>
              <Text style={styles.requirementTitle}>{req.title}</Text>
              <Text style={styles.requirementDescription}>{req.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Photography Tips */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="camera" size={20} color={colors.brand.emerald} />
          <Text style={styles.sectionTitle}>Photography Tips</Text>
        </View>
        {tips.map((tip, index) => (
          <View key={index} style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.brand.emerald} />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>

      {/* Do's and Don'ts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Do's and Don'ts</Text>

        <View style={styles.dosCard}>
          <View style={styles.dosHeader}>
            <Ionicons name="checkmark-circle" size={20} color={colors.brand.emerald} />
            <Text style={styles.dosTitle}>Do's</Text>
          </View>
          {dosDonts.dos.map((item, index) => (
            <View key={index} style={styles.doRow}>
              <View style={styles.doBullet} />
              <Text style={styles.doText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.dontsCard}>
          <View style={styles.dontsHeader}>
            <Ionicons name="close-circle" size={20} color="#F44336" />
            <Text style={styles.dontsTitle}>Don'ts</Text>
          </View>
          {dosDonts.donts.map((item, index) => (
            <View key={index} style={styles.dontRow}>
              <View style={styles.dontBullet} />
              <Text style={styles.dontText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Example Images */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="images" size={20} color="#2196F3" />
          <Text style={styles.sectionTitle}>Examples</Text>
        </View>

        <View style={styles.examplesRow}>
          <View style={styles.exampleCard}>
            <View style={[styles.exampleBadge, styles.goodBadge]}>
              <Ionicons name="checkmark" size={16} color={colors.background.primary} />
            </View>
            <View style={styles.examplePlaceholder}>
              <Ionicons name="document-text" size={40} color={colors.brand.emerald} />
            </View>
            <Text style={styles.exampleLabel}>Good Example</Text>
            <Text style={styles.exampleDescription}>Clear, well-lit, all details visible</Text>
          </View>

          <View style={styles.exampleCard}>
            <View style={[styles.exampleBadge, styles.badBadge]}>
              <Ionicons name="close" size={16} color={colors.background.primary} />
            </View>
            <View style={styles.examplePlaceholder}>
              <Ionicons name="document-text" size={40} color="#F44336" />
            </View>
            <Text style={styles.exampleLabel}>Bad Example</Text>
            <Text style={styles.exampleDescription}>Blurry, poor lighting, cropped</Text>
          </View>
        </View>
      </View>

      {/* Approval Time */}
      <View style={styles.approvalCard}>
        <Ionicons name="time" size={24} color="#2196F3" />
        <View style={styles.approvalContent}>
          <Text style={styles.approvalTitle}>Approval Time</Text>
          <Text style={styles.approvalText}>
            Most bills are verified automatically within minutes. Complex cases may take up to 24-48
            hours for manual review.
          </Text>
        </View>
      </View>

      {/* Help Banner */}
      <View style={styles.helpBanner}>
        <Ionicons name="help-circle" size={20} color="#FF6B35" />
        <Text style={styles.helpText}>
          Need help? Contact support for assistance with bill uploads
        </Text>
      </View>
    </ScrollView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  header: {
    backgroundColor: colors.background.primary,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.darkGray,
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.midGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 12,
  },
  requirementCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requirementContent: {
    flex: 1,
  },
  requirementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 4,
  },
  requirementDescription: {
    fontSize: 12,
    color: colors.midGray,
    lineHeight: 18,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.darkGray,
    lineHeight: 18,
  },
  dosCard: {
    backgroundColor: colors.greenMist,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.emerald,
  },
  doRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  doBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.emerald,
    marginTop: 6,
  },
  doText: {
    flex: 1,
    fontSize: 13,
    color: colors.darkGray,
  },
  dontsCard: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
  },
  dontsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dontsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
  },
  dontRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  dontBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F44336',
    marginTop: 6,
  },
  dontText: {
    flex: 1,
    fontSize: 13,
    color: colors.darkGray,
  },
  examplesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exampleCard: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
  },
  exampleBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  goodBadge: {
    backgroundColor: colors.brand.emerald,
  },
  badBadge: {
    backgroundColor: '#F44336',
  },
  examplePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: colors.tint.warmGray,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  exampleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 4,
  },
  exampleDescription: {
    fontSize: 11,
    color: colors.midGray,
    textAlign: 'center',
  },
  approvalCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  approvalContent: {
    flex: 1,
  },
  approvalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 4,
  },
  approvalText: {
    fontSize: 12,
    color: '#2196F3',
    lineHeight: 18,
  },
  helpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4ED',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: '#FF6B35',
    lineHeight: 18,
  },
});

export default React.memo(BillRequirements);
