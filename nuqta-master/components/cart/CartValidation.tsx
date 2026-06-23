// @ts-nocheck
// components/cart/CartValidation.tsx
// Modal component for displaying cart validation issues

import React, { useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CartValidationModalProps,
  ValidationIssue,
  VALIDATION_ISSUE_ICONS,
  VALIDATION_ISSUE_COLORS,
} from '@/types/validation.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

function CartValidation({
  visible,
  validationResult,
  loading,
  onClose,
  onContinueToCheckout,
  onRemoveInvalidItems,
  onRefresh,
}: CartValidationModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [isRemoving, setIsRemoving] = useState(false);
  const isMounted = useIsMounted();

  const hasErrors = validationResult?.issues.some(issue => issue.severity === 'error') ?? false;
  const hasWarnings = validationResult?.issues.some(issue => issue.severity === 'warning') ?? false;
  const canCheckout = validationResult?.canCheckout ?? false;

  const errorIssues = validationResult?.issues.filter(issue => issue.severity === 'error') || [];
  const warningIssues = validationResult?.issues.filter(issue => issue.severity === 'warning') || [];
  const infoIssues = validationResult?.issues.filter(issue => issue.severity === 'info') || [];

  const handleRemoveInvalidItems = async () => {
    platformAlertSimple('Remove Invalid Items', `This will remove ${validationResult?.invalidItems.length || 0} item(s) from your cart. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsRemoving(true);
            try {
              await onRemoveInvalidItems();
              onClose();
            } catch (error) {
              // silently handle
            } finally {
              if (!isMounted()) return;
              setIsRemoving(false);
            }
          },
        },
      ]
    );
  };

  const renderIssueCard = (issue: ValidationIssue, index: number) => {
    const iconName = VALIDATION_ISSUE_ICONS[issue.type] as keyof typeof Ionicons.glyphMap;
    const colors = VALIDATION_ISSUE_COLORS[issue.type];

    const iconColor = issue.severity === 'error'
      ? (colors as any).error
      : issue.severity === 'warning'
      ? (colors as any).warning
      : (colors as any).info;

    return (
      <View key={`${issue.itemId}-${index}`} style={[styles.issueCard, { borderLeftColor: iconColor }]}>
        <View style={styles.issueHeader}>
          <View style={styles.issueIconContainer}>
            <View style={[styles.issueIcon, { backgroundColor: colors.bg }]}>
              <Ionicons name={iconName} size={20} color={iconColor} />
            </View>
            {issue.image && (
              <CachedImage source={issue.image} style={styles.issueImage} contentFit="cover" />
            )}
          </View>

          <View style={styles.issueInfo}>
            <ThemedText style={styles.issueProductName} numberOfLines={2}>
              {issue.productName}
            </ThemedText>
            <ThemedText style={[styles.issueMessage, { color: iconColor }]}>
              {issue.message}
            </ThemedText>

            {issue.type === 'low_stock' && issue.availableQuantity !== undefined && (
              <ThemedText style={styles.issueDetail}>
                Only {issue.availableQuantity} left
                {issue.requestedQuantity && ` (you wanted ${issue.requestedQuantity})`}
              </ThemedText>
            )}

            {issue.type === 'price_change' && issue.currentPrice && issue.previousPrice && (
              <View style={styles.priceChangeContainer}>
                <ThemedText style={styles.priceOld}>
                  {currencySymbol}{issue.previousPrice}
                </ThemedText>
                <Ionicons name="arrow-forward" size={14} color={colors.neutral[500]} />
                <ThemedText style={styles.priceNew}>
                  {currencySymbol}{issue.currentPrice}
                </ThemedText>
                <ThemedText style={[
                  styles.priceChangeBadge,
                  issue.currentPrice > issue.previousPrice ? styles.priceIncrease : styles.priceDecrease
                ]}>
                  {issue.currentPrice > issue.previousPrice ? '+' : ''}
                  {currencySymbol}{Math.abs(issue.currentPrice - issue.previousPrice)}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <LinearGradient
            colors={hasErrors ? [colors.error, colors.errorScale[700]] : [colors.brand.purpleLight, colors.brand.purple]}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconContainer}>
                  <Ionicons
                    name={hasErrors ? 'alert-circle' : 'checkmark-circle'}
                    size={28}
                    color="white"
                  />
                </View>
                <View>
                  <ThemedText style={styles.headerTitle}>
                    {hasErrors ? 'Cart Validation' : 'Cart Status'}
                  </ThemedText>
                  <ThemedText style={styles.headerSubtitle}>
                    {loading
                      ? 'Checking availability...'
                      : validationResult
                      ? `${validationResult.issues.length} issue(s) found`
                      : 'Validating cart...'}
                  </ThemedText>
                </View>
              </View>

              <Pressable style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="white" />
              </Pressable>
            </View>
          </LinearGradient>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.brand.purpleLight} />
                <ThemedText style={styles.loadingText}>Validating cart items...</ThemedText>
              </View>
            ) : validationResult ? (
              <>
                {/* Error Issues */}
                {errorIssues.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="close-circle" size={20} color={colors.error} />
                      <ThemedText style={[styles.sectionTitle, { color: colors.error }]}>
                        Items Unavailable ({errorIssues.length})
                      </ThemedText>
                    </View>
                    {errorIssues.map((issue, index) => renderIssueCard(issue, index))}
                  </View>
                )}

                {/* Warning Issues */}
                {warningIssues.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="alert-circle" size={20} color={colors.warningScale[700]} />
                      <ThemedText style={[styles.sectionTitle, { color: colors.warningScale[700] }]}>
                        Low Stock Warnings ({warningIssues.length})
                      </ThemedText>
                    </View>
                    {warningIssues.map((issue, index) => renderIssueCard(issue, index))}
                  </View>
                )}

                {/* Info Issues */}
                {infoIssues.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="information-circle" size={20} color={colors.brand.blue} />
                      <ThemedText style={[styles.sectionTitle, { color: colors.brand.blue }]}>
                        Price Changes ({infoIssues.length})
                      </ThemedText>
                    </View>
                    {infoIssues.map((issue, index) => renderIssueCard(issue, index))}
                  </View>
                )}

                {/* Valid Items Summary */}
                {validationResult.validItems.length > 0 && (
                  <View style={[styles.section, styles.validSection]}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      <ThemedText style={[styles.sectionTitle, { color: colors.success }]}>
                        Available Items ({validationResult.validItems.length})
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.validText}>
                      {validationResult.validItems.length} item(s) ready for checkout
                    </ThemedText>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="cart-outline" size={64} color={colors.neutral[400]} />
                <ThemedText style={styles.emptyText}>No validation data available</ThemedText>
              </View>
            )}

            <View style={styles.bottomSpace} />
          </ScrollView>

          {/* Footer Actions */}
          {!loading && validationResult && (
            <View style={styles.footer}>
              {hasErrors && (
                <Pressable
                  style={[styles.button, styles.buttonDanger]}
                  onPress={handleRemoveInvalidItems}
                 
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="trash" size={18} color="white" />
                      <ThemedText style={styles.buttonText}>
                        Remove Invalid Items ({validationResult.invalidItems.length})
                      </ThemedText>
                    </>
                  )}
                </Pressable>
              )}

              <Pressable
                style={[styles.button, styles.buttonSecondary]}
                onPress={onRefresh}
               
              >
                <Ionicons name="refresh" size={18} color={colors.brand.purpleLight} />
                <ThemedText style={[styles.buttonText, { color: colors.brand.purpleLight }]}>
                  Refresh
                </ThemedText>
              </Pressable>

              {canCheckout && validationResult.validItems.length > 0 && (
                <Pressable
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={onContinueToCheckout}
                 
                >
                  <ThemedText style={styles.buttonText}>
                    Continue to Checkout
                  </ThemedText>
                  <Ionicons name="arrow-forward" size={18} color="white" />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  issueCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  issueIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  issueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  issueImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
  },
  issueInfo: {
    flex: 1,
    marginLeft: 12,
  },
  issueProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  issueMessage: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  issueDetail: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  priceChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  priceOld: {
    fontSize: 13,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  priceNew: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  priceChangeBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priceIncrease: {
    backgroundColor: colors.errorScale[100],
    color: colors.error,
  },
  priceDecrease: {
    backgroundColor: colors.tint.green,
    color: colors.successScale[700],
  },
  validSection: {
    backgroundColor: colors.successScale[50],
  },
  validText: {
    fontSize: 14,
    color: colors.brand.greenDark,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: colors.neutral[500],
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: colors.neutral[500],
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: colors.brand.purpleLight,
  },
  buttonSecondary: {
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: colors.brand.purpleLight,
  },
  buttonDanger: {
    backgroundColor: colors.error,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  bottomSpace: {
    height: 20,
  },
});

export default React.memo(CartValidation);
