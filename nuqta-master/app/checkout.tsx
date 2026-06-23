import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Text,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCheckout } from '@/hooks/useCheckout';
import { useCheckoutUI } from '@/hooks/useCheckoutUI';
import { useCartValidation } from '@/hooks/useCartValidation';
import StockWarningBanner from '@/components/cart/StockWarningBanner';
import CartValidation from '@/components/cart/CartValidation';
import CardOffersSection from '@/components/cart/CardOffersSection';
import { useGetCurrencySymbol, useAuthUser } from '@/stores';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/DesignSystem';

import CheckoutHeader from '@/components/checkout/CheckoutHeader';
import OrderItemsPreview from '@/components/checkout/OrderItemsPreview';
import DeliveryAddressSection from '@/components/checkout/DeliveryAddressSection';
import FulfillmentTypeSelector from '@/components/checkout/FulfillmentTypeSelector';
import PromoCodeSection from '@/components/checkout/PromoCodeSection';
import CoinTogglesSection from '@/components/checkout/CoinTogglesSection';
import ServicesSummary from '@/components/checkout/ServicesSummary';
import BillSummarySection from '@/components/checkout/BillSummarySection';
import PaymentBottomSheet from '@/components/checkout/PaymentBottomSheet';
import PromoCodeModal from '@/components/checkout/PromoCodeModal';
import DealRedemptionModal from '@/components/checkout/DealRedemptionModal';
import OrderConfirmationModal from '@/components/checkout/OrderConfirmationModal';
import ProcessingOverlay from '@/components/checkout/ProcessingOverlay';
import AddressSelectionModal from '@/components/checkout/AddressSelectionModal';
import PaymentFailureModal from '@/components/checkout/PaymentFailureModal';
import { colors } from '@/constants/theme';
import { withErrorBoundary } from '@/utils/withErrorBoundary';

// G-03: Delivery time slot picker with scheduled delivery support
const DELIVERY_TIME_SLOTS = [
  { label: '8 AM - 10 AM', value: '08:00-10:00' },
  { label: '10 AM - 12 PM', value: '10:00-12:00' },
  { label: '12 PM - 2 PM', value: '12:00-14:00' },
  { label: '2 PM - 4 PM', value: '14:00-16:00' },
  { label: '4 PM - 6 PM', value: '16:00-18:00' },
  { label: '6 PM - 8 PM', value: '18:00-20:00' },
  { label: '8 PM - 10 PM', value: '20:00-22:00' },
];

function getNextDays(count: number) {
  const days: { label: string; value: string; isToday: boolean }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days.push({
      label: `${dayName}, ${dateStr}`,
      value: d.toISOString().split('T')[0],
      isToday: i === 0,
    });
  }
  return days;
}

function DeliverySlotPicker({
  selectedSlot,
  scheduledDate,
  isScheduled,
  onSelectSlot,
  onScheduleChange,
}: {
  selectedSlot?: string;
  scheduledDate?: string;
  isScheduled?: boolean;
  onSelectSlot: (s: string) => void;
  onScheduleChange: (details: { deliverySlot?: string; scheduledDate?: string; isScheduled?: boolean }) => void;
}) {
  const days = getNextDays(7);

  return (
    <View style={{ backgroundColor: colors.background.primary, borderRadius: 14, padding: 14, marginBottom: 12, shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: 10 }}>Delivery Schedule</Text>

      {/* Deliver Now vs Schedule toggle */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Pressable
          onPress={() => onScheduleChange({ isScheduled: false, scheduledDate: undefined, deliverySlot: undefined })}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: !isScheduled ? '#7C3AED' : '#F1F5F9', alignItems: 'center', borderWidth: 1, borderColor: !isScheduled ? '#7C3AED' : '#E2E8F0' }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: !isScheduled ? '#fff' : '#64748B' }}>Deliver Now</Text>
        </Pressable>
        <Pressable
          onPress={() => onScheduleChange({ isScheduled: true })}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: isScheduled ? '#7C3AED' : '#F1F5F9', alignItems: 'center', borderWidth: 1, borderColor: isScheduled ? '#7C3AED' : '#E2E8F0' }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: isScheduled ? '#fff' : '#64748B' }}>Schedule for Later</Text>
        </Pressable>
      </View>

      {isScheduled && (
        <>
          {/* Date Selection */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
            {days.map(day => (
              <Pressable
                key={day.value}
                onPress={() => onScheduleChange({ scheduledDate: day.value })}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: scheduledDate === day.value ? '#7C3AED' : '#F1F5F9', borderWidth: 1, borderColor: scheduledDate === day.value ? '#7C3AED' : '#E2E8F0' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: scheduledDate === day.value ? '#fff' : '#64748B' }}>{day.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Time Slot Selection */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>Select Time Slot</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DELIVERY_TIME_SLOTS.map(slot => (
              <Pressable
                key={slot.value}
                onPress={() => onSelectSlot(slot.value)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: selectedSlot === slot.value ? '#7C3AED' : '#F1F5F9', borderWidth: 1, borderColor: selectedSlot === slot.value ? '#7C3AED' : '#E2E8F0' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: selectedSlot === slot.value ? '#fff' : '#64748B' }}>{slot.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function CheckoutPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ offerRedemptionCode?: string; orderId?: string }>();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const authUser = useAuthUser();
  const userLoyaltyTier = (authUser as any)?.loyaltyTier || null;

  // Core checkout state & logic
  const { state, actions, handlers: checkoutHandlers } = useCheckout(params.orderId);

  // Derived values
  const serviceItems = useMemo(() => state.items?.filter((item: any) => item.itemType === 'service') || [], [state.items]);
  const hasServiceItems = serviceItems.length > 0;
  const productItems = state.items?.filter((item: any) => item.itemType !== 'service') || [];
  const totalWalletBalance = state.coinSystem.nuqtaCoin.available + state.coinSystem.promoCoin.available + (state.coinSystem.storePromoCoin?.available || 0);

  // UI state & handlers (reducer + all event handlers)
  const { uiState, dispatch, handlers: uiHandlers } = useCheckoutUI({
    checkoutState: state,
    checkoutHandlers,
    currencySymbol,
    hasServiceItems,
    totalWalletBalance,
    offerRedemptionCode: params.offerRedemptionCode,
    router,
  });

  // Cart validation
  const {
    validationState, canCheckout, errorCount, validateCart, removeInvalidItems,
  } = useCartValidation({
    autoValidate: true,
    validationInterval: 30000,
    showToastNotifications: true,
  });

  useEffect(() => { validateCart(); }, []);

  useEffect(() => {
    if (validationState.validationResult && errorCount > 0) {
      dispatch({ type: 'SET_FIELD', field: 'showValidationModal', value: true });
    }
  }, [errorCount, validationState.validationResult]);

  // Add slider thumb styling for web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'slider-thumb-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          input[type="range"] { cursor: pointer; touch-action: none; user-select: none; }
          input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%); cursor: grab; box-shadow: 0 3px 12px rgba(139, 92, 246, 0.4), 0 0 0 3px rgba(255, 255, 255, 0.5); transition: all 0.2s ease; border: 3px solid rgba(255, 255, 255, 0.95); position: relative; z-index: 10; }
          input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.15); box-shadow: 0 4px 16px rgba(139, 92, 246, 0.5), 0 0 0 4px rgba(255, 255, 255, 0.6); }
          input[type="range"]::-webkit-slider-thumb:active { transform: scale(1.05); box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5), 0 0 0 3px rgba(255, 255, 255, 0.7); cursor: grabbing; }
          input[type="range"]::-moz-range-thumb { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%); cursor: grab; border: 3px solid rgba(255, 255, 255, 0.95); box-shadow: 0 3px 12px rgba(139, 92, 246, 0.4), 0 0 0 3px rgba(255, 255, 255, 0.5); transition: all 0.2s ease; z-index: 10; }
          input[type="range"]::-moz-range-thumb:hover { transform: scale(1.15); box-shadow: 0 4px 16px rgba(139, 92, 246, 0.5), 0 0 0 4px rgba(255, 255, 255, 0.6); }
          input[type="range"]::-moz-range-thumb:active { transform: scale(1.05); box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5), 0 0 0 3px rgba(255, 255, 255, 0.7); cursor: grabbing; }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  const handleContinueToCheckout = useCallback(() => {
    dispatch({ type: 'SET_FIELD', field: 'showValidationModal', value: false });
  }, []);

  const handleRemoveInvalidItems = useCallback(async () => {
    await removeInvalidItems();
    dispatch({ type: 'SET_FIELD', field: 'showValidationModal', value: false });
  }, [removeInvalidItems]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <CheckoutHeader
          totalPayable={state.billSummary?.totalPayable || 0}
          redemptionBenefit={uiState.appliedRedemption?.benefit || 0}
          cashbackEarned={state.billSummary?.cashbackEarned || 0}
          totalWalletBalance={totalWalletBalance}
          currencySymbol={currencySymbol}
          onBack={checkoutHandlers.handleBackNavigation}
        />

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {uiState.showWarningBanner && validationState.validationResult && validationState.validationResult.issues.length > 0 && (
            <StockWarningBanner
              issues={validationState.validationResult.issues}
              onDismiss={() => dispatch({ type: 'SET_FIELD', field: 'showWarningBanner', value: false })}
              onViewDetails={() => dispatch({ type: 'SET_FIELD', field: 'showValidationModal', value: true })}
              autoHide={false}
            />
          )}

          {state.store?.distance && (
            <View style={styles.storeConfirmation}>
              <ThemedText style={styles.storeWarning}>
                The selected store is {state.store.distance} away from your delivery address. Please confirm.
              </ThemedText>
            </View>
          )}

          {state.billSummary?.totalPayable && state.billSummary.totalPayable > 0 && (
            <CardOffersSection
              storeId={state.store?.id}
              orderValue={state.billSummary.totalPayable}
              compact={true}
              onOfferApplied={(offer) => checkoutHandlers.applyCardOffer(offer)}
            />
          )}

          <OrderItemsPreview items={productItems} currencySymbol={currencySymbol} />

          <FulfillmentTypeSelector
            availableTypes={state.fulfillment.availableTypes}
            selectedType={state.fulfillment.selectedType}
            onSelect={actions.setFulfillmentType}
          />

          <DeliveryAddressSection
            fulfillmentType={state.fulfillment.selectedType}
            selectedAddress={state.selectedAddress}
            store={state.store}
            fulfillmentAvailableTypes={state.fulfillment.availableTypes}
            pickupInstructions={state.fulfillment.pickupInstructions}
            vehicleInfo={state.fulfillment.vehicleInfo}
            tableNumber={state.fulfillment.tableNumber}
            onOpenAddressModal={() => dispatch({ type: 'SET_FIELD', field: 'showAddressModal', value: true })}
            onSetFulfillmentDetails={actions.setFulfillmentDetails}
          />

          {/* G-03: Delivery time slot selector with scheduled delivery */}
          {state.fulfillment.selectedType === 'delivery' && (
            <DeliverySlotPicker
              selectedSlot={state.fulfillment.deliverySlot}
              scheduledDate={state.fulfillment.scheduledDate}
              isScheduled={state.fulfillment.isScheduled}
              onSelectSlot={(slot: string) => actions.setFulfillmentDetails({ deliverySlot: slot })}
              onScheduleChange={(details) => actions.setFulfillmentDetails(details)}
            />
          )}

          <PromoCodeSection
            appliedPromoCode={state.appliedPromoCode}
            promoDiscount={state.billSummary?.promoDiscount || 0}
            availablePromoCodes={state.availablePromoCodes}
            appliedRedemption={uiState.appliedRedemption}
            appliedOfferRedemption={uiState.appliedOfferRedemption}
            voucherCodeInput={uiState.voucherCodeInput}
            validatingRedemption={uiState.validatingRedemption}
            currencySymbol={currencySymbol}
            onOpenPromoModal={() => dispatch({ type: 'OPEN_PROMO_MODAL' })}
            onRemovePromoCode={() => checkoutHandlers.removePromoCode?.()}
            onOpenRedemptionModal={() => dispatch({ type: 'SET_FIELD', field: 'showRedemptionModal', value: true })}
            onRemoveRedemption={uiHandlers.handleRemoveRedemption}
            onClearOfferRedemption={() => dispatch({ type: 'CLEAR_OFFER_REDEMPTION' })}
            onVoucherCodeChange={(text) => dispatch({ type: 'SET_FIELD', field: 'voucherCodeInput', value: text })}
            onApplyVoucherCode={uiHandlers.validateAndApplyOfferRedemption}
          />

          <View style={styles.section}>
            <CoinTogglesSection
              coinSystem={state.coinSystem}
              totalWalletBalance={totalWalletBalance}
              coinSectionExpanded={uiState.coinSectionExpanded}
              totalPayable={state.billSummary?.totalPayable || 0}
              totalBeforeCoinDiscount={state.billSummary?.totalBeforeCoinDiscount}
              currencySymbol={currencySymbol}
              onToggleExpanded={() => dispatch({ type: 'SET_FIELD', field: 'coinSectionExpanded', value: !uiState.coinSectionExpanded })}
              onCoinToggle={checkoutHandlers.handleCoinToggle}
              onCustomCoinAmount={checkoutHandlers.handleCustomCoinAmount}
            />
          </View>

          <ServicesSummary serviceItems={serviceItems} currencySymbol={currencySymbol} />

          <BillSummarySection
            billSummary={state.billSummary}
            items={state.items}
            appliedRedemption={uiState.appliedRedemption}
            appliedOfferRedemption={uiState.appliedOfferRedemption}
            showPlatformFeeInfo={uiState.showPlatformFeeInfo}
            currencySymbol={currencySymbol}
            onTogglePlatformFeeInfo={() => dispatch({ type: 'SET_FIELD', field: 'showPlatformFeeInfo', value: !uiState.showPlatformFeeInfo })}
          />

          <View style={styles.bottomSpace} />
        </ScrollView>

        <PaymentBottomSheet
          totalPayable={state.billSummary?.totalPayable || 0}
          redemptionBenefit={uiState.appliedRedemption?.benefit || 0}
          totalWalletBalance={totalWalletBalance}
          hasServiceItems={hasServiceItems}
          canCheckout={canCheckout}
          loading={state.loading}
          paymentExpanded={uiState.paymentExpanded}
          currencySymbol={currencySymbol}
          onToggleExpanded={() => dispatch({ type: 'SET_FIELD', field: 'paymentExpanded', value: !uiState.paymentExpanded })}
          onPaymentSelect={uiHandlers.handlePaymentSelect}
        />

        {/* Modals */}
        <CartValidation
          visible={uiState.showValidationModal}
          validationResult={validationState.validationResult}
          loading={validationState.isValidating}
          onClose={() => dispatch({ type: 'SET_FIELD', field: 'showValidationModal', value: false })}
          onContinueToCheckout={handleContinueToCheckout}
          onRemoveInvalidItems={handleRemoveInvalidItems}
          onRefresh={async () => { await validateCart(); }}
        />

        <PromoCodeModal
          visible={uiState.showPromoModal}
          promoCode={uiState.promoCode}
          availablePromoCodes={state.availablePromoCodes}
          appliedPromoCode={state.appliedPromoCode}
          items={state.items}
          userLoyaltyTier={userLoyaltyTier}
          applyingPromo={uiState.applyingPromo}
          currencySymbol={currencySymbol}
          onClose={() => dispatch({ type: 'CLOSE_PROMO_MODAL' })}
          onPromoCodeChange={(text) => dispatch({ type: 'SET_FIELD', field: 'promoCode', value: text })}
          onApplyPromoCode={uiHandlers.handleApplyPromoCode}
          onQuickPromoSelect={uiHandlers.handleQuickPromoSelect}
        />

        <DealRedemptionModal
          visible={uiState.showRedemptionModal}
          redemptionCode={uiState.redemptionCode}
          validatingRedemption={uiState.validatingRedemption}
          onClose={() => dispatch({ type: 'SET_FIELD', field: 'showRedemptionModal', value: false })}
          onRedemptionCodeChange={(text) => dispatch({ type: 'SET_FIELD', field: 'redemptionCode', value: text })}
          onApplyRedemptionCode={uiHandlers.handleApplyRedemptionCode}
        />

        <OrderConfirmationModal
          visible={uiState.showConfirmModal}
          selectedPaymentMethod={uiState.selectedPaymentMethod}
          billSummary={state.billSummary}
          itemCount={state.items?.length || 0}
          appliedRedemption={uiState.appliedRedemption}
          processingPayment={uiState.processingPayment}
          currencySymbol={currencySymbol}
          onClose={() => dispatch({ type: 'SET_FIELD', field: 'showConfirmModal', value: false })}
          onConfirm={uiHandlers.handleConfirmOrder}
        />

        <AddressSelectionModal
          visible={uiState.showAddressModal}
          addresses={state.availableAddresses || []}
          selectedAddressId={state.selectedAddress?.id}
          onSelect={(address) => {
            checkoutHandlers.handleAddressSelect(address);
            dispatch({ type: 'SET_FIELD', field: 'showAddressModal', value: false });
          }}
          onClose={() => dispatch({ type: 'SET_FIELD', field: 'showAddressModal', value: false })}
          onAddNew={() => {
            dispatch({ type: 'SET_FIELD', field: 'showAddressModal', value: false });
            router.push('/account/addresses');
          }}
          loading={state.loading}
        />

        <ProcessingOverlay visible={uiState.processingPayment} message={uiState.processingMessage} />

        <PaymentFailureModal
          visible={uiState.showPaymentFailureModal}
          onClose={() => dispatch({ type: 'CLOSE_PAYMENT_FAILURE' })}
          onRetry={uiHandlers.handlePaymentFailureRetry}
          onSwitchMethod={uiHandlers.handlePaymentFailureSwitchMethod}
          failedMethod={uiState.paymentFailedMethod}
          errorMessage={uiState.paymentErrorMessage}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  section: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  storeConfirmation: {
    backgroundColor: '#FEF3E2',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  storeWarning: {
    fontSize: 13,
    color: colors.brand.amberDark,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomSpace: {
    height: 220,
  },
});

export default withErrorBoundary(CheckoutPage, 'Checkout');
