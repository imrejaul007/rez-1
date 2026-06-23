import React, { useState, useEffect} from 'react';
import {
  View,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  ScrollView,
  TextInput} from 'react-native';
import Animated, { useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Deal } from '@/types/deals';
import { calculateDealDiscount } from '@/utils/deal-validation';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface DealComparisonModalProps {
  visible: boolean;
  onClose: () => void;
  deals: Deal[];
  onSelectDeal?: (dealId: string) => void;
}

interface ComparisonMetric {
  label: string;
  getValue: (deal: Deal, billAmount: number) => string | number;
  type: 'text' | 'number' | 'currency' | 'percentage' | 'boolean';
  icon: string;
  priority: number; // Lower number = higher priority
}

function DealComparisonModal({
  visible,
  onClose,
  deals,
  onSelectDeal,
}: DealComparisonModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [billAmount, setBillAmount] = useState(5000);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'discount',
    'minimumBill',
    'savings',
    'validity',
  ]);
  
  const slideAnim = useSharedValue(screenData.height);
  const fadeAnim = useSharedValue(0);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
      slideAnim.value = window.height;
    });

    return () => subscription?.remove();
  }, [slideAnim]);

  const styles = createStyles(screenData);

  useEffect(() => {
    let _anim: any;
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 200 });
      slideAnim.value = withSpring(0);
      
    } else {
      fadeAnim.value = withTiming(0, { duration: 150 });
      slideAnim.value = withTiming(screenData.height, { duration: 200 });
      
    }
  
    }, [visible, fadeAnim, slideAnim]);

  const handleBackdropPress = () => {
    onClose();
  };

  const handleModalPress = (event: any) => {
    event.stopPropagation();
  };

  // Comparison metrics
  const comparisonMetrics: Record<string, ComparisonMetric> = {
    discount: {
      label: 'Discount',
      getValue: (deal) => `${deal.discountValue}%`,
      type: 'percentage',
      icon: 'pricetag-outline',
      priority: 1,
    },
    savings: {
      label: 'Your Savings',
      getValue: (deal, billAmount) => {
        const result = calculateDealDiscount(deal, billAmount);
        return result.isValid ? `${currencySymbol}${result.discountAmount.toLocaleString()}` : 'N/A';
      },
      type: 'currency',
      icon: 'wallet-outline',
      priority: 2,
    },
    minimumBill: {
      label: 'Minimum Bill',
      getValue: (deal) => `${currencySymbol}${deal.minimumBill.toLocaleString()}`,
      type: 'currency',
      icon: 'cash-outline',
      priority: 3,
    },
    maxDiscount: {
      label: 'Max Discount',
      getValue: (deal) => deal.maxDiscount ? `${currencySymbol}${deal.maxDiscount.toLocaleString()}` : 'No limit',
      type: 'currency',
      icon: 'trending-up-outline',
      priority: 4,
    },
    validity: {
      label: 'Valid Until',
      getValue: (deal) => {
        const days = Math.ceil((deal.validUntil.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return days > 0 ? `${days} days` : 'Expired';
      },
      type: 'text',
      icon: 'time-outline',
      priority: 5,
    },
    usageLimit: {
      label: 'Usage Limit',
      getValue: (deal) => {
        if (!deal.usageLimit) return 'Unlimited';
        const remaining = deal.usageLimit - (deal.usageCount || 0);
        return `${remaining} left`;
      },
      type: 'text',
      icon: 'repeat-outline',
      priority: 6,
    },
    category: {
      label: 'Category',
      getValue: (deal) => getCategoryDisplayName(deal.category),
      type: 'text',
      icon: 'apps-outline',
      priority: 7,
    },
    availability: {
      label: 'Availability',
      getValue: (deal) => deal.isOfflineOnly ? 'In-store only' : 'Online & In-store',
      type: 'text',
      icon: 'location-outline',
      priority: 8,
    },
  };

  // Get best deal based on savings
  const getBestDeal = () => {
    const dealsWithSavings = deals.map(deal => {
      const result = calculateDealDiscount(deal, billAmount);
      return {
        deal,
        savings: result.isValid ? result.discountAmount : 0,
      };
    }).filter(item => item.savings > 0);

    if (dealsWithSavings.length === 0) return null;
    
    return dealsWithSavings.reduce((best, current) =>
      current.savings > best.savings ? current : best
    );
  };

  const bestDeal = getBestDeal();

  // Format metric value for display
  const formatMetricValue = (metric: ComparisonMetric, value: string | number, deal: Deal) => {
    if (metric.type === 'currency' && typeof value === 'string' && value.includes(currencySymbol)) {
      return value;
    }
    if (metric.type === 'percentage' && typeof value === 'string' && value.includes('%')) {
      return value;
    }
    return value.toString();
  };

  // Get metric value color
  const getMetricValueColor = (metric: ComparisonMetric, deal: Deal, isComparison: boolean = false) => {
    if (!isComparison) return colors.neutral[700];
    
    if (metric.label === 'Your Savings' && bestDeal?.deal.id === deal.id) {
      return colors.successScale[400]; // Green for best savings
    }
    if (metric.label === 'Discount' && deal.discountValue >= 25) {
      return colors.brand.purpleLight; // Purple for high discounts
    }
    if (metric.label === 'Valid Until') {
      const days = Math.ceil((deal.validUntil.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 3) return colors.error; // Red for expiring soon
      if (days <= 7) return colors.warningScale[400]; // Orange for expiring this week
    }
    return colors.neutral[700];
  };

  const toggleMetric = (metricKey: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricKey)
        ? prev.filter(k => k !== metricKey)
        : [...prev, metricKey]
    );
  };

  if (deals.length === 0) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
      accessibilityLabel="Compare deals dialog"
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          <Animated.View style={[styles.blurContainer, { opacity: fadeAnim }]}>
            <BlurView intensity={50} style={styles.blur} />
          </Animated.View>

          <TouchableWithoutFeedback onPress={handleModalPress}>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.modal}>
                {/* Header */}
                <View style={styles.header}>
                  <Pressable
                    style={styles.closeButton}
                    onPress={onClose}
                    accessibilityLabel="Close compare deals"
                    accessibilityRole="button"
                    accessibilityHint="Double tap to close this dialog"
                  >
                    <Ionicons name="close" size={20} color="#555" />
                  </Pressable>
                  
                  <ThemedText style={styles.title}>Compare Deals</ThemedText>
                  <ThemedText style={styles.subtitle}>Find the best deal for your needs</ThemedText>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                  {/* Bill Amount Input */}
                  <View style={styles.billAmountSection}>
                    <ThemedText style={styles.sectionTitle}>Your Bill Amount</ThemedText>
                    <View style={styles.billAmountContainer}>
                      <Ionicons name="wallet-outline" size={20} color={colors.brand.purpleLight} style={styles.billAmountIcon} />
                      <TextInput
                        style={styles.billAmountInput}
                        value={billAmount.toString()}
                        onChangeText={(text) => {
                          const amount = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                          setBillAmount(amount);
                        }}
                        placeholder="Enter bill amount"
                        keyboardType="numeric"
                      />
                      <ThemedText style={styles.currencySymbol}>{currencySymbol}</ThemedText>
                    </View>
                  </View>

                  {/* Best Deal Highlight */}
                  {bestDeal && (
                    <View style={styles.bestDealSection}>
                      <View style={styles.bestDealHeader}>
                        <Ionicons name="trophy" size={20} color={colors.warningScale[400]} />
                        <ThemedText style={styles.bestDealTitle}>Best Deal for You</ThemedText>
                      </View>
                      <View style={styles.bestDealCard}>
                        <ThemedText style={styles.bestDealName}>{bestDeal.deal.title}</ThemedText>
                        <ThemedText style={styles.bestDealSavings}>
                          Save {currencySymbol}{bestDeal.savings.toLocaleString()}
                        </ThemedText>
                        {onSelectDeal && (
                          <Pressable
                            style={styles.selectBestButton}
                            onPress={() => {
                              onSelectDeal(bestDeal.deal.id);
                              onClose();
                            }}
                            accessibilityLabel="Select best deal"
                            accessibilityRole="button"
                            accessibilityHint="Double tap to select this deal and close dialog"
                          >
                            <ThemedText style={styles.selectBestButtonText}>Select This Deal</ThemedText>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Metric Selection */}
                  <View style={styles.metricSelectionSection}>
                    <ThemedText style={styles.sectionTitle}>Compare By</ThemedText>
                    <View style={styles.metricTags}>
                      {Object.entries(comparisonMetrics).map(([key, metric]) => (
                        <Pressable
                          key={key}
                          style={[
                            styles.metricTag,
                            selectedMetrics.includes(key) && styles.metricTagSelected
                          ]}
                          onPress={() => toggleMetric(key)}
                          accessibilityLabel={`${selectedMetrics.includes(key) ? 'Remove' : 'Add'} ${metric.label} metric`}
                          accessibilityRole="button"
                          accessibilityHint={`Double tap to ${selectedMetrics.includes(key) ? 'remove' : 'add'} this comparison metric`}
                          accessibilityState={{ selected: selectedMetrics.includes(key) }}
                        >
                          <Ionicons
                            name={metric.icon as any}
                            size={14}
                            color={selectedMetrics.includes(key) ? colors.background.primary : colors.brand.purpleLight}
                          />
                          <ThemedText style={[
                            styles.metricTagText,
                            selectedMetrics.includes(key) && styles.metricTagTextSelected
                          ]}>
                            {metric.label}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Comparison Table */}
                  <View style={styles.comparisonSection}>
                    <ThemedText style={styles.sectionTitle}>Detailed Comparison</ThemedText>
                    
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                      <View style={styles.tableHeaderCell}>
                        <ThemedText style={styles.tableHeaderText}>Deal</ThemedText>
                      </View>
                      {deals.map((deal, index) => (
                        <View key={deal.id} style={styles.tableHeaderCell}>
                          <ThemedText style={styles.tableHeaderText} numberOfLines={2}>
                            {deal.title}
                          </ThemedText>
                        </View>
                      ))}
                    </View>

                    {/* Table Rows */}
                    {selectedMetrics.map(metricKey => {
                      const metric = comparisonMetrics[metricKey];
                      return (
                        <View key={metricKey} style={styles.tableRow}>
                          <View style={styles.tableCell}>
                            <View style={styles.metricLabelContainer}>
                              <Ionicons name={metric.icon as any} size={16} color={colors.brand.purpleLight} />
                              <ThemedText style={styles.metricLabel}>{metric.label}</ThemedText>
                            </View>
                          </View>
                          {deals.map(deal => {
                            const value = metric.getValue(deal, billAmount);
                            const color = getMetricValueColor(metric, deal, true);
                            return (
                              <View key={deal.id} style={styles.tableCell}>
                                <ThemedText style={[styles.metricValue, { color }]}>
                                  {formatMetricValue(metric, value, deal)}
                                </ThemedText>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>

                  {/* Deal Selection Buttons */}
                  {onSelectDeal && (
                    <View style={styles.selectionSection}>
                      <ThemedText style={styles.sectionTitle}>Select Deal</ThemedText>
                      {deals.map(deal => {
                        const result = calculateDealDiscount(deal, billAmount);
                        const isValid = result.isValid;
                        const isBest = bestDeal?.deal.id === deal.id;
                        
                        return (
                          <Pressable
                            key={deal.id}
                            style={[
                              styles.dealSelectionButton,
                              isBest && styles.dealSelectionButtonBest,
                              !isValid && styles.dealSelectionButtonDisabled,
                            ]}
                            onPress={() => {
                              if (isValid) {
                                onSelectDeal(deal.id);
                                onClose();
                              }
                            }}
                            disabled={!isValid}
                            accessibilityLabel={`Select ${deal.title}`}
                            accessibilityRole="button"
                            accessibilityHint={isValid
                              ? `Double tap to select this deal and close dialog. You will save ${result.discountAmount} rupees`
                              : `This deal requires a minimum bill of ${deal.minimumBill} rupees`
                            }
                            accessibilityState={{ disabled: !isValid }}
                          >
                            <View style={styles.dealSelectionContent}>
                              <View style={styles.dealSelectionHeader}>
                                <ThemedText style={[
                                  styles.dealSelectionTitle,
                                  isBest && styles.dealSelectionTitleBest,
                                  !isValid && styles.dealSelectionTitleDisabled,
                                ]}>
                                  {deal.title}
                                </ThemedText>
                                {isBest && (
                                  <View style={styles.bestBadge}>
                                    <Ionicons name="trophy" size={12} color={colors.warningScale[400]} />
                                    <ThemedText style={styles.bestBadgeText}>Best</ThemedText>
                                  </View>
                                )}
                              </View>
                              <ThemedText style={[
                                styles.dealSelectionSavings,
                                !isValid && styles.dealSelectionSavingsDisabled,
                              ]}>
                                {isValid
                                  ? `Save ${currencySymbol}${result.discountAmount.toLocaleString()}`
                                  : `Minimum bill: ${currencySymbol}${deal.minimumBill.toLocaleString()}`
                                }
                              </ThemedText>
                            </View>
                            <Ionicons 
                              name={isValid ? "chevron-forward" : "lock-closed"} 
                              size={20} 
                              color={isValid ? colors.brand.purpleLight : colors.neutral[400]} 
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Helper function
const getCategoryDisplayName = (category: string): string => {
  const names: Record<string, string> = {
    'instant-discount': 'Instant',
    'cashback': 'Cashback',
    'buy-one-get-one': 'BOGO',
    'seasonal': 'Seasonal',
    'first-time': 'New User',
    'loyalty': 'VIP',
    'clearance': 'Clearance',
  };
  return names[category] || category;
};

const createStyles = (screenData: { width: number; height: number }) => {
  const isTablet = screenData.width > 768;
  
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    blurContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    blur: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    modal: {
      backgroundColor: colors.background.primary,
      borderRadius: 20,
      width: '100%',
      maxHeight: '95%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 6,
    },
    header: {
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.tint.slate,
      position: 'relative',
    },
    closeButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: '#f2f2f2',
      borderRadius: 20,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.neutral[900],
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.neutral[500],
    },
    content: {
      flex: 1,
      padding: 20,
    },
    billAmountSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.neutral[700],
      marginBottom: 12,
    },
    billAmountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.neutral[50],
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    billAmountIcon: {
      marginRight: 12,
    },
    billAmountInput: {
      flex: 1,
      fontSize: 16,
      color: colors.neutral[700],
      textAlign: 'right',
    },
    currencySymbol: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.brand.purpleLight,
      marginLeft: 8,
    },
    bestDealSection: {
      marginBottom: 24,
    },
    bestDealHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    bestDealTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.warningScale[400],
      marginLeft: 8,
    },
    bestDealCard: {
      backgroundColor: colors.tint.amber,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.warningScale[200],
    },
    bestDealName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.brand.amberDark,
      marginBottom: 4,
    },
    bestDealSavings: {
      fontSize: 14,
      color: colors.warningScale[700],
      marginBottom: 12,
    },
    selectBestButton: {
      backgroundColor: colors.warningScale[400],
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    selectBestButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background.primary,
    },
    metricSelectionSection: {
      marginBottom: 24,
    },
    metricTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    metricTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.neutral[100],
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    metricTagSelected: {
      backgroundColor: colors.brand.purpleLight,
      borderColor: colors.brand.purpleLight,
    },
    metricTagText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.brand.purpleLight,
      marginLeft: 4,
    },
    metricTagTextSelected: {
      color: colors.background.primary,
    },
    comparisonSection: {
      marginBottom: 24,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: colors.tint.coolGray,
      borderRadius: 8,
      marginBottom: 2,
    },
    tableHeaderCell: {
      flex: 1,
      padding: 12,
      alignItems: 'center',
    },
    tableHeaderText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.neutral[700],
      textAlign: 'center',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.tint.slate,
      marginBottom: 2,
    },
    tableCell: {
      flex: 1,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metricLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.neutral[700],
      marginLeft: 6,
    },
    metricValue: {
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
    },
    selectionSection: {
      marginBottom: 20,
    },
    dealSelectionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.neutral[50],
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    dealSelectionButtonBest: {
      backgroundColor: colors.tint.amber,
      borderColor: colors.warningScale[200],
    },
    dealSelectionButtonDisabled: {
      backgroundColor: colors.neutral[100],
      borderColor: colors.neutral[200],
      opacity: 0.6,
    },
    dealSelectionContent: {
      flex: 1,
    },
    dealSelectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    dealSelectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.neutral[700],
      flex: 1,
    },
    dealSelectionTitleBest: {
      color: colors.brand.amberDark,
    },
    dealSelectionTitleDisabled: {
      color: colors.neutral[400],
    },
    bestBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.warningScale[200],
      borderRadius: 12,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    bestBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.brand.amberDark,
      marginLeft: 2,
    },
    dealSelectionSavings: {
      fontSize: 12,
      color: colors.successScale[400],
      fontWeight: '500',
    },
    dealSelectionSavingsDisabled: {
      color: colors.neutral[400],
    },
  });
};

export default React.memo(DealComparisonModal);