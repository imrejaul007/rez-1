import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PartnerLevel, PartnerBenefit } from '@/types/partner.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface BenefitsTableProps {
  levels: PartnerLevel[];
  currentLevel: number;
  onUpgradePress?: (targetLevel: PartnerLevel) => void;
}

function BenefitsTable({
  levels,
  currentLevel = 1,
  onUpgradePress
}: BenefitsTableProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  // Define benefit types with clear, accurate names
  const allBenefitTypes = [
    { 
      key: 'cashback', 
      name: 'Cashback on All Orders', 
      icon: 'cash-outline',
      description: 'Earn cashback on every purchase'
    },
    { 
      key: 'birthday', 
      name: 'Birthday Month Discount', 
      icon: 'gift-outline',
      description: 'Special discount during your birthday month'
    },
    { 
      key: 'freeDelivery', 
      name: 'Free Delivery', 
      icon: 'bicycle-outline',
      description: 'No delivery charges'
    },
    { 
      key: 'transactionBonus', 
      name: 'Transaction Bonus', 
      icon: 'gift',
      description: 'Bonus every 11 orders'
    },
  ];

  const getBenefitValue = (level: PartnerLevel, benefitKey: string): string => {
    // Get actual benefits from level data (backend)
    const benefits = (level as any).benefits;
    
    if (!benefits) {
      return '-';
    }
    
    switch (benefitKey) {
      case 'cashback':
        return `${benefits.cashbackRate || 0}%`;
      case 'birthday':
        return `${benefits.birthdayDiscount || 0}%`;
      case 'freeDelivery':
        if (benefits.freeDeliveryThreshold === 0) {
          return 'Always Free';
        } else {
          return `Above ${currencySymbol}${benefits.freeDeliveryThreshold}`;
        }
      case 'transactionBonus':
        if (benefits.transactionBonus) {
          return `${currencySymbol}${benefits.transactionBonus.reward}`;
        }
        return '-';
      default:
        return '-';
    }
  };

  const isBenefitActive = (level: PartnerLevel, benefitKey: string): boolean => {
    const benefits = (level as any).benefits;
    if (!benefits) return false;
    
    switch (benefitKey) {
      case 'cashback':
        return benefits.cashbackRate > 0;
      case 'birthday':
        return benefits.birthdayDiscount > 0;
      case 'freeDelivery':
        return benefits.freeDeliveryThreshold !== undefined;
      case 'transactionBonus':
        return !!benefits.transactionBonus;
      default:
        return false;
    }
  };

  const getLevelColor = (level: number): string[] => {
    switch (level) {
      case 1:
        return [colors.lightMustard, colors.nileBlue];
      case 2:
        return [colors.lightMustard, '#ffe4a3'];
      case 3:
        return [colors.warningScale[400], colors.warningScale[400]];
      default:
        return [colors.neutral[500], colors.neutral[400]];
    }
  };

  const getLevelIcon = (level: number): string => {
    switch (level) {
      case 1:
        return 'star-outline';
      case 2:
        return 'trophy-outline';
      case 3:
        return 'medal-outline';
      default:
        return 'ribbon-outline';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <LinearGradient
            colors={[colors.lightMustard, colors.nileBlue]}
            style={styles.headerIconGradient}
          >
            <Ionicons name="grid" size={20} color="white" />
          </LinearGradient>
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Benefits</Text>
          <Text style={styles.headerSubtitle}>Compare all partner levels and their benefits</Text>
        </View>
      </View>

      {/* Current Level Indicator */}
      <View style={styles.currentLevelContainer}>
        <Text style={styles.currentLevelText}>
          Current: <Text style={styles.currentLevelName}>
            Level {currentLevel} - {levels.find(l => l.level === currentLevel)?.name}
          </Text>
        </Text>
      </View>

      {/* Benefits Table */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableContainer}>
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.benefitNameColumn}>
              <Text style={styles.tableHeaderText}>Benefits</Text>
            </View>
            {levels.map((level) => (
              <View key={level.id} style={styles.levelColumn}>
                <LinearGradient
                  colors={getLevelColor(level.level) as any}
                  style={[
                    styles.levelHeader,
                    level.level === currentLevel && styles.currentLevelHeader
                  ]}
                >
                  <View style={styles.levelIconContainer}>
                    <Ionicons 
                      name={getLevelIcon(level.level) as any} 
                      size={16} 
                      color="white" 
                    />
                  </View>
                  <Text style={styles.levelHeaderText}>Level {level.level}</Text>
                  <Text style={styles.levelHeaderName}>{level.name}</Text>
                  {level.level === currentLevel && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                </LinearGradient>
              </View>
            ))}
          </View>

          {/* Benefit Rows */}
          {allBenefitTypes.map((benefitType, index) => (
            <View key={benefitType.key} style={[
              styles.benefitRow,
              index % 2 === 1 && styles.alternateRow
            ]}>
              {/* Benefit Name */}
              <View style={styles.benefitNameCell}>
                <View style={styles.benefitIconContainer}>
                  <Ionicons name={benefitType.icon as any} size={16} color={colors.lightMustard} />
                </View>
                <Text style={styles.benefitNameText}>{benefitType.name}</Text>
              </View>

              {/* Benefit Values for each level */}
              {levels.map((level) => {
                const isActive = isBenefitActive(level, benefitType.key);
                const value = getBenefitValue(level, benefitType.key);
                const isCurrentLevel = level.level === currentLevel;

                return (
                  <View key={level.id} style={[
                    styles.benefitCell,
                    isCurrentLevel && styles.currentLevelCell
                  ]}>
                    <View style={[
                      styles.benefitValueContainer,
                      isActive && styles.activeBenefitContainer,
                      isCurrentLevel && isActive && styles.currentActiveBenefitContainer
                    ]}>
                      {isActive ? (
                        <>
                          <Ionicons 
                            name="checkmark-circle" 
                            size={16} 
                            color={isCurrentLevel ? colors.lightMustard : colors.lightMustard} 
                          />
                          <Text style={[
                            styles.benefitValue,
                            isCurrentLevel && styles.currentBenefitValue
                          ]}>
                            {value}
                          </Text>
                        </>
                      ) : (
                        <Ionicons name="close-circle" size={16} color={colors.neutral[400]} />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          {/* Action Row */}
          <View style={styles.actionRow}>
            <View style={styles.benefitNameCell}>
              <Text style={styles.actionRowLabel}>Actions</Text>
            </View>
            {levels.map((level) => (
              <View key={level.id} style={styles.actionCell}>
                {level.level === currentLevel ? (
                  <View style={styles.currentLevelAction}>
                    <Text style={styles.currentLevelActionText}>Active</Text>
                  </View>
                ) : level.level < currentLevel ? (
                  <View style={styles.completedLevelAction}>
                    <Ionicons name="checkmark" size={16} color={colors.lightMustard} />
                    <Text style={styles.completedLevelActionText}>Completed</Text>
                  </View>
                ) : (
                  <Pressable
                    style={styles.upgradeButton}
                    onPress={() => onUpgradePress?.(level)}
                  >
                    <LinearGradient
                      colors={getLevelColor(level.level) as any}
                      style={styles.upgradeButtonGradient}
                    >
                      <Text style={styles.upgradeButtonText}>Upgrade</Text>
                      <Ionicons name="arrow-forward" size={12} color="white" />
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Level Requirements */}
      <View style={styles.requirementsSection}>
        <Text style={styles.requirementsSectionTitle}>Level Requirements</Text>
        <View style={styles.requirementsGrid}>
          {levels.map((level) => (
            <View key={level.id} style={[
              styles.requirementCard,
              level.level === currentLevel && styles.currentRequirementCard
            ]}>
              <LinearGradient
                colors={(level.level === currentLevel ? getLevelColor(level.level) : [colors.neutral[50], colors.neutral[100]]) as any}
                style={styles.requirementCardGradient}
              >
                <View style={styles.requirementHeader}>
                  <Ionicons 
                    name={getLevelIcon(level.level) as any} 
                    size={16} 
                    color={level.level === currentLevel ? 'white' : colors.neutral[500]} 
                  />
                  <Text style={[
                    styles.requirementLevelText,
                    level.level === currentLevel && styles.currentRequirementLevelText
                  ]}>
                    {level.name}
                  </Text>
                </View>
                <Text style={[
                  styles.requirementText,
                  level.level === currentLevel && styles.currentRequirementText
                ]}>
                  {level.requirements.orders} orders in {level.requirements.timeframe} days
                </Text>
              </LinearGradient>
            </View>
          ))}
        </View>
      </View>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    marginRight: 12,
  },
  headerIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  currentLevelContainer: {
    backgroundColor: colors.linen,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.lightMustard,
  },
  currentLevelText: {
    fontSize: 14,
    color: colors.neutral[600],
  },
  currentLevelName: {
    fontWeight: '700',
    color: colors.nileBlue,
  },
  tableContainer: {
    marginBottom: 20,
  },
  table: {
    minWidth: 600,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  benefitNameColumn: {
    width: 180,
    padding: 12,
    justifyContent: 'center',
    backgroundColor: colors.neutral[50],
    borderTopLeftRadius: 8,
  },
  levelColumn: {
    width: 120,
  },
  levelHeader: {
    padding: 12,
    alignItems: 'center',
    borderTopRightRadius: 8,
  },
  currentLevelHeader: {
    borderWidth: 2,
    borderColor: colors.warningScale[400],
  },
  levelIconContainer: {
    marginBottom: 4,
  },
  levelHeaderText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  levelHeaderName: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },
  currentBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  currentBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  benefitRow: {
    flexDirection: 'row',
    marginBottom: 1,
  },
  alternateRow: {
    backgroundColor: colors.neutral[50],
  },
  benefitNameCell: {
    width: 180,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  benefitIconContainer: {
    marginRight: 8,
  },
  benefitNameText: {
    fontSize: 12,
    color: colors.neutral[800],
    fontWeight: '500',
    flex: 1,
  },
  benefitCell: {
    width: 120,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  currentLevelCell: {
    backgroundColor: colors.tint.amberLight,
  },
  benefitValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 6,
    minWidth: 60,
  },
  activeBenefitContainer: {
    backgroundColor: colors.linen,
  },
  currentActiveBenefitContainer: {
    backgroundColor: '#ffcd5720',
    borderWidth: 1,
    borderColor: colors.lightMustard,
  },
  benefitValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.nileBlue,
    marginLeft: 4,
  },
  currentBenefitValue: {
    color: colors.lightMustard,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: colors.neutral[200],
    paddingTop: 8,
  },
  actionRowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  actionCell: {
    width: 120,
    padding: 8,
    alignItems: 'center',
  },
  currentLevelAction: {
    backgroundColor: colors.linen,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  currentLevelActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  completedLevelAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  completedLevelActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.lightMustard,
    marginLeft: 4,
  },
  upgradeButton: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  requirementsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: 20,
  },
  requirementsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 12,
  },
  requirementsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  requirementCard: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  currentRequirementCard: {
    borderWidth: 2,
    borderColor: colors.lightMustard,
  },
  requirementCardGradient: {
    padding: 12,
    alignItems: 'center',
  },
  requirementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementLevelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
    marginLeft: 6,
  },
  currentRequirementLevelText: {
    color: 'white',
  },
  requirementText: {
    fontSize: 11,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  currentRequirementText: {
    color: 'white',
  },
});

export default React.memo(BenefitsTable);
