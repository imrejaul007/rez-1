// Retention Offer Card Component
// Display personalized offers to retain canceling users

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

export type RetentionOfferType = 'discount' | 'usage_tips' | 'benefits_reminder';

interface RetentionOffer {
  type: RetentionOfferType;
  title: string;
  description: string;
  ctaText: string;
  icon: string;
  value?: string;
}

interface RetentionOfferCardProps {
  offer: RetentionOffer;
  onAccept: () => void;
  onDecline: () => void;
}

function RetentionOfferCard({
  offer,
  onAccept,
  onDecline,
}: RetentionOfferCardProps) {
  const getGradient = () => {
    switch (offer.type) {
      case 'discount':
        return [colors.brand.purpleLight, colors.brand.purpleSoft];
      case 'usage_tips':
        return [colors.infoScale[400], colors.infoScale[400]];
      case 'benefits_reminder':
        return [colors.warningScale[400], colors.warningScale[400]];
      default:
        return [colors.brand.purpleLight, colors.brand.purpleSoft];
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={getGradient() as any} style={styles.header}>
        <Ionicons name={offer.icon as any} size={48} color={colors.background.primary} />
        <ThemedText style={styles.headerTitle}>{offer.title}</ThemedText>
      </LinearGradient>

      <View style={styles.body}>
        <ThemedText style={styles.description}>{offer.description}</ThemedText>

        {offer.value && (
          <View style={styles.valueContainer}>
            <ThemedText style={styles.valueText}>{offer.value}</ThemedText>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable style={styles.acceptButton} onPress={onAccept}>
            <ThemedText style={styles.acceptButtonText}>{offer.ctaText}</ThemedText>
          </Pressable>

          <Pressable style={styles.declineButton} onPress={onDecline}>
            <ThemedText style={styles.declineButtonText}>No, Continue to Cancel</ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    padding: 32,
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.background.primary,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  body: {
    padding: 24,
  },
  description: {
    fontSize: 16,
    color: colors.neutral[700],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  valueContainer: {
    backgroundColor: '#8B5CF610',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.brand.purpleLight,
  },
  actions: {
    gap: 12,
  },
  acceptButton: {
    backgroundColor: colors.brand.purpleLight,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  declineButton: {
    backgroundColor: colors.neutral[100],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineButtonText: {
    color: colors.neutral[500],
    fontSize: 14,
    fontWeight: '600',
  },
});

export default React.memo(RetentionOfferCard);
