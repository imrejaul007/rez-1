/**
 * Financial Service Share Modal
 * Share financial services with referral tracking
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { useComprehensiveAnalytics } from '@/hooks/useComprehensiveAnalytics';
import { ANALYTICS_EVENTS } from '@/services/analytics/events';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  white: colors.background.primary,
  navy: colors.brand.navyDark,
  gray100: colors.neutral[100],
  gray600: colors.neutral[500],
  purple500: colors.brand.purpleLight,
  green500: colors.success,
};

interface ShareOption {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  action: () => Promise<void>;
}

interface FinancialServiceShareModalProps {
  visible: boolean;
  onClose: () => void;
  serviceId: string;
  serviceName: string;
  serviceType: string;
  cashbackPercentage: number;
}

export const FinancialServiceShareModal: React.FC<FinancialServiceShareModalProps> = ({
  visible,
  onClose,
  serviceId,
  serviceName,
  serviceType,
  cashbackPercentage,
}) => {
  const { trackEvent } = useComprehensiveAnalytics();
  const [isCopied, setIsCopied] = useState(false);
  const isMounted = useIsMounted();

  const generateShareUrl = (): string => {
    const baseUrl = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/financial/service/${serviceId}`
      : `rez://financial/service/${serviceId}`;
    return baseUrl;
  };

  const generateShareMessage = (): string => {
    return `Check out ${serviceName} on REZ App!\n\nGet ${cashbackPercentage}% cashback on ${serviceType} services.\n\n${generateShareUrl()}`;
  };

  const handleNativeShare = async () => {
    try {
      const result = await Share.share({
        message: generateShareMessage(),
        title: serviceName,
        url: generateShareUrl(),
      });

      if (result.action === Share.sharedAction) {
        trackEvent(ANALYTICS_EVENTS.SERVICE_VIEWED, {
          service_id: serviceId,
          service_type: serviceType,
          action: 'shared',
          platform: result.activityType || 'native',
        });
        platformAlertSimple('Success', 'Service shared successfully!');
        onClose();
      }
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        platformAlertSimple('Error', 'Failed to share service. Please try again.');
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      if (!isMounted()) return;
      await Clipboard.setStringAsync(generateShareUrl());
      setIsCopied(true);
      trackEvent(ANALYTICS_EVENTS.SERVICE_VIEWED, {
        service_id: serviceId,
        service_type: serviceType,
        action: 'link_copied',
      });
      setTimeout(() => setIsCopied(false), 2000);
      platformAlertSimple('Success', 'Link copied to clipboard!');
    } catch (error) {
      platformAlertSimple('Error', 'Failed to copy link. Please try again.');
    }
  };

  const shareOptions: ShareOption[] = [
    {
      id: 'native',
      name: 'Share',
      icon: 'share-outline',
      color: COLORS.purple500,
      action: handleNativeShare,
    },
    {
      id: 'copy',
      name: 'Copy Link',
      icon: 'copy-outline',
      color: COLORS.green500,
      action: handleCopyLink,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[COLORS.purple500, COLORS.purple500 + 'DD']}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>Share Service</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.white} />
            </Pressable>
          </LinearGradient>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{serviceName}</Text>
              <Text style={styles.serviceType}>{serviceType}</Text>
              <View style={styles.cashbackBadge}>
                <Ionicons name="gift" size={16} color={COLORS.green500} />
                <Text style={styles.cashbackText}>{cashbackPercentage}% Cashback</Text>
              </View>
            </View>

            <View style={styles.optionsContainer}>
              {shareOptions.map((option) => (
                <Pressable
                  key={option.id}
                  style={styles.optionButton}
                  onPress={option.action}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                    <Ionicons name={option.icon} size={24} color={option.color} />
                  </View>
                  <Text style={styles.optionText}>{option.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  serviceInfo: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 8,
    textAlign: 'center',
  },
  serviceType: {
    fontSize: 14,
    color: COLORS.gray600,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green500 + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  cashbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.green500,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    gap: 16,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
  },
});

export default React.memo(FinancialServiceShareModal);
