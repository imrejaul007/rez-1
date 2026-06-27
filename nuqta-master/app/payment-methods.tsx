// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useCheckout } from '@/hooks/useCheckout';
import { useCartState, useGetCurrencySymbol } from '@/stores/selectors';
import { useCardOfferAutoApply } from '@/hooks/useCardOfferAutoApply';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

function PaymentMethodsPage() {
  const router = useRouter();
  const { state, handlers } = useCheckout();
  const cartState = useCartState();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [showUPIInput, setShowUPIInput] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  // Get store ID from cart items
  const storeId = cartState.items[0]?.store?.id || state.store?.id;
  const orderValue = state.billSummary?.totalPayable || 0;

  // Auto-apply card offer when card number is entered
  const { appliedOffer, validateAndApplyBestOffer } = useCardOfferAutoApply({
    storeId,
    orderValue,
    cardNumber,
    enabled: true,
  });

  const recentMethods = [
    { id: 'paytm', name: 'Paytm', icon: currencySymbol },
    { id: 'phonepe', name: 'PhonePe', icon: '⚡' },
    { id: 'amazonpay', name: 'Amazon Pay', icon: 'A' },
    { id: 'mobikwik', name: 'MobiKwik', icon: 'M' },
  ];

  const payLaterOptions = [
    { id: 'tabby', name: 'Tabby', icon: '🟣' },
    { id: 'tamara', name: 'Tamara', icon: '🔵' },
    { id: 'simplepay', name: 'Simple pay', icon: '⭕' },
    { id: 'amazonpaylater', name: 'Amazon pay later', icon: 'A' },
  ];

  const emiOptions = [
    { id: 'debit_emi', name: 'Debit card EMIs', icon: 'DC' },
    { id: 'credit_emi', name: 'Credit card EMIs', icon: 'CC' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purpleLight} />
      
      {/* Header */}
      <LinearGradient 
        colors={[Colors.brand.purpleLight, Colors.brand.purple]} 
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Pressable 
            style={styles.backButton} 
            onPress={() => {

              handlers.handleBackNavigation();
            }}
           
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          
          <ThemedText style={styles.headerTitle}>Other Payment</ThemedText>
          
          <View style={styles.paymentAmount}>
            <ThemedText style={styles.amountLabel}>To Pay</ThemedText>
            <ThemedText style={styles.amountValue}>
              {currencySymbol}{(state.billSummary?.totalPayable || 0).toLocaleString()}
            </ThemedText>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Recent Methods */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Recent Methods</ThemedText>
          <View style={styles.recentMethodsGrid}>
            {recentMethods.map((method) => (
              <Pressable key={method.id} style={styles.recentMethodCard}>
                <View style={styles.recentMethodIcon}>
                  <ThemedText style={styles.recentMethodIconText}>{method.icon}</ThemedText>
                </View>
                <ThemedText style={styles.recentMethodName}>{method.name}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Quick Pay Button */}
        <Pressable 
          style={styles.quickPayButton}
          onPress={() => handlers.handleRazorpayPayment()}
         
        >
          <LinearGradient
            colors={[Colors.brand.purpleLight, Colors.brand.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.quickPayGradient}
          >
            <View style={styles.quickPayContent}>
              <View style={styles.quickPayLeft}>
                <Ionicons name="flash" size={24} color={colors.brand.goldBright} />
                <View>
                  <ThemedText style={styles.quickPayTitle}>Pay Instantly</ThemedText>
                  <ThemedText style={styles.quickPaySubtitle}>
                    UPI • Cards • Net Banking • Wallets
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.quickPayAmount}>
                {currencySymbol}{(state.billSummary?.totalPayable || 0).toLocaleString()}
              </ThemedText>
            </View>
          </LinearGradient>
        </Pressable>

        {/* UPI Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Supported Payment Methods</ThemedText>
          
          <View style={styles.paymentMethodsGrid}>
            <View style={styles.methodCard}>
              <Ionicons name="card-outline" size={24} color={Colors.brand.purpleLight} />
              <ThemedText style={styles.methodLabel}>UPI</ThemedText>
            </View>
            <View style={styles.methodCard}>
              <Ionicons name="card" size={24} color={Colors.success} />
              <ThemedText style={styles.methodLabel}>Cards</ThemedText>
            </View>
            <View style={styles.methodCard}>
              <Ionicons name="business" size={24} color={Colors.info} />
              <ThemedText style={styles.methodLabel}>Net Banking</ThemedText>
            </View>
            <View style={styles.methodCard}>
              <Ionicons name="wallet" size={24} color={Colors.warning} />
              <ThemedText style={styles.methodLabel}>Wallets</ThemedText>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
            <ThemedText style={styles.infoText}>
              Secure payments powered by Razorpay
            </ThemedText>
          </View>
        </View>

        {/* Credit & Debit Cards */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Credit & Debit cards</ThemedText>
          
          {/* Show applied card offer if available */}
          {appliedOffer && (
            <View style={styles.appliedOfferBanner}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <ThemedText style={styles.appliedOfferText}>
                Card offer applied! Save {appliedOffer.type === 'percentage' ? `${appliedOffer.value}%` : `${currencySymbol}${appliedOffer.value}`}
              </ThemedText>
            </View>
          )}
          
          <Pressable style={styles.cardOption}>
            <View style={styles.cardLeft}>
              <View style={styles.visaIcon}>
                <ThemedText style={styles.visaText}>VISA</ThemedText>
              </View>
              <View>
                <ThemedText style={styles.cardTitle}>SBI</ThemedText>
                <ThemedText style={styles.cardSubtitle}>••••••••• 4545</ThemedText>
              </View>
            </View>
          </Pressable>
          
          <Pressable 
            style={styles.paymentOption}
            onPress={() => {
              // When user adds/enters card, trigger validation
              // In real implementation, this would be triggered when card number is entered
              if (cardNumber && cardNumber.length >= 13) {
                validateAndApplyBestOffer(cardNumber);
              }
            }}
          >
            <View style={styles.paymentOptionLeft}>
              <View style={styles.addCardIcon}>
                <Ionicons name="add" size={20} color={Colors.brand.purpleLight} />
              </View>
              <ThemedText style={styles.paymentOptionTitle}>Add new card</ThemedText>
            </View>
            <ThemedText style={styles.cardSubtitle}>••••••••• 4545</ThemedText>
          </Pressable>
        </View>

        {/* Net Banking */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Net Banking</ThemedText>
          
          <Pressable style={styles.paymentOption}>
            <View style={styles.paymentOptionLeft}>
              <View style={styles.bankIcon}>
                <Ionicons name="business" size={16} color={Colors.brand.purpleLight} />
              </View>
              <ThemedText style={styles.paymentOptionTitle}>Select Net working</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
          </Pressable>
        </View>

        {/* Pay Later */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Pay later</ThemedText>
          
          {payLaterOptions.map((option) => (
            <Pressable key={option.id} style={styles.paymentOption}>
              <View style={styles.paymentOptionLeft}>
                <View style={styles.payLaterIcon}>
                  <ThemedText style={styles.payLaterIconText}>{option.icon}</ThemedText>
                </View>
                <ThemedText style={styles.paymentOptionTitle}>{option.name}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
            </Pressable>
          ))}
          
          <ThemedText style={styles.sectionSubtitle}>Pay later</ThemedText>
          
          {emiOptions.map((option) => (
            <Pressable key={option.id} style={styles.paymentOption}>
              <View style={styles.paymentOptionLeft}>
                <View style={styles.emiIcon}>
                  <ThemedText style={styles.emiIconText}>{option.icon}</ThemedText>
                </View>
                <ThemedText style={styles.paymentOptionTitle}>{option.name}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
            </Pressable>
          ))}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  
  // Header Styles
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
    padding: 0,
    position: 'relative',
    zIndex: 10,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
    marginLeft: -40,
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  amountValue: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  
  // Content
  content: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  
  // Sections
  section: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  sectionSubtitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.base,
  },

  // Quick Pay Button
  quickPayButton: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  quickPayGradient: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  quickPayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickPayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  quickPayTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  quickPaySubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  quickPayAmount: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },

  // Payment Methods Grid
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  methodCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  methodLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.secondary,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.green,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  infoText: {
    ...Typography.bodySmall,
    color: '#065F46',
    flex: 1,
  },
  
  // Recent Methods Grid
  recentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  recentMethodCard: {
    width: (width - 64) / 4,
    alignItems: 'center',
    paddingVertical: Spacing.base,
  },
  recentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  recentMethodIconText: {
    ...Typography.h3,
    fontWeight: '600',
  },
  recentMethodName: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  
  // Payment Options
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.base,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border.default,
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentOptionTitle: {
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    marginLeft: Spacing.md,
  },
  
  // UPI Styles
  upiIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upiIconText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  upiInputContainer: {
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border.default,
  },
  upiInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
  },
  
  // Card Styles
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.base,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border.default,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  visaIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#1A365D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  visaText: {
    ...Typography.overline,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  cardTitle: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  cardSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  addCardIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Bank Icon
  bankIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Pay Later Icons
  payLaterIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payLaterIconText: {
    ...Typography.bodyLarge,
  },
  
  // EMI Icons
  emiIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emiIconText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  
  // Bottom Space
  bottomSpace: {
    height: 40,
  },
});
export default withErrorBoundary(PaymentMethodsPage, 'PaymentMethods');
