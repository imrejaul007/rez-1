import { useReducer, useCallback, useEffect, useRef } from 'react';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { showToast } from '@/components/common/ToastManager';
import { showAlert } from '@/components/common/CrossPlatformAlert';
import apiClient from '@/services/apiClient';

// --- Types ---

export type CheckoutUIState = {
  showPromoModal: boolean;
  promoCode: string;
  customCoinAmount: string;
  showRedemptionModal: boolean;
  redemptionCode: string;
  appliedRedemption: { code: string; benefit: number; storeName?: string; dealTitle?: string } | null;
  validatingRedemption: boolean;
  appliedOfferRedemption: { code: string; cashbackPercentage: number; offerTitle?: string; estimatedCashback?: number } | null;
  voucherCodeInput: string;
  showValidationModal: boolean;
  showWarningBanner: boolean;
  coinSectionExpanded: boolean;
  paymentExpanded: boolean;
  showConfirmModal: boolean;
  selectedPaymentMethod: 'cod' | 'wallet' | 'razorpay' | null;
  processingPayment: boolean;
  processingMessage: string;
  showAddressModal: boolean;
  showPlatformFeeInfo: boolean;
  applyingPromo: boolean;
  showPaymentFailureModal: boolean;
  paymentFailedMethod: 'cod' | 'wallet' | 'razorpay' | null;
  paymentErrorMessage: string | null;
};

type CheckoutUIAction =
  | { type: 'SET_FIELD'; field: keyof CheckoutUIState; value: any }
  | { type: 'OPEN_PROMO_MODAL' }
  | { type: 'CLOSE_PROMO_MODAL' }
  | { type: 'APPLY_REDEMPTION'; payload: CheckoutUIState['appliedRedemption'] }
  | { type: 'CLEAR_REDEMPTION' }
  | { type: 'APPLY_OFFER_REDEMPTION'; payload: CheckoutUIState['appliedOfferRedemption'] }
  | { type: 'CLEAR_OFFER_REDEMPTION' }
  | { type: 'START_PAYMENT'; method: CheckoutUIState['selectedPaymentMethod'] }
  | { type: 'RESET_PAYMENT' }
  | { type: 'CONFIRM_ORDER_START'; message: string }
  | { type: 'REDEMPTION_APPLIED_CLOSE'; payload: CheckoutUIState['appliedRedemption'] }
  | { type: 'SHOW_PAYMENT_FAILURE'; method: CheckoutUIState['paymentFailedMethod']; message: string | null }
  | { type: 'CLOSE_PAYMENT_FAILURE' };

// --- Reducer ---

const checkoutUIInitialState: CheckoutUIState = {
  showPromoModal: false,
  promoCode: '',
  customCoinAmount: '',
  showRedemptionModal: false,
  redemptionCode: '',
  appliedRedemption: null,
  validatingRedemption: false,
  appliedOfferRedemption: null,
  voucherCodeInput: '',
  showValidationModal: false,
  showWarningBanner: true,
  coinSectionExpanded: false,
  paymentExpanded: false,
  showConfirmModal: false,
  selectedPaymentMethod: null,
  processingPayment: false,
  processingMessage: '',
  showAddressModal: false,
  showPlatformFeeInfo: false,
  applyingPromo: false,
  showPaymentFailureModal: false,
  paymentFailedMethod: null,
  paymentErrorMessage: null,
};

function checkoutUIReducer(state: CheckoutUIState, action: CheckoutUIAction): CheckoutUIState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'OPEN_PROMO_MODAL':
      return { ...state, showPromoModal: true };
    case 'CLOSE_PROMO_MODAL':
      return { ...state, showPromoModal: false, promoCode: '' };
    case 'APPLY_REDEMPTION':
      return { ...state, appliedRedemption: action.payload };
    case 'CLEAR_REDEMPTION':
      return { ...state, appliedRedemption: null };
    case 'APPLY_OFFER_REDEMPTION':
      return { ...state, appliedOfferRedemption: action.payload };
    case 'CLEAR_OFFER_REDEMPTION':
      return { ...state, appliedOfferRedemption: null };
    case 'START_PAYMENT':
      return { ...state, selectedPaymentMethod: action.method, showConfirmModal: true, paymentExpanded: false };
    case 'RESET_PAYMENT':
      return { ...state, processingPayment: false, processingMessage: '' };
    case 'CONFIRM_ORDER_START':
      return { ...state, showConfirmModal: false, processingPayment: true, processingMessage: action.message };
    case 'REDEMPTION_APPLIED_CLOSE':
      return { ...state, appliedRedemption: action.payload, showRedemptionModal: false, redemptionCode: '' };
    case 'SHOW_PAYMENT_FAILURE':
      return { ...state, showPaymentFailureModal: true, paymentFailedMethod: action.method, paymentErrorMessage: action.message, processingPayment: false, processingMessage: '' };
    case 'CLOSE_PAYMENT_FAILURE':
      return { ...state, showPaymentFailureModal: false, paymentFailedMethod: null, paymentErrorMessage: null };
    default:
      return state;
  }
}

// --- Hook ---

interface UseCheckoutUIParams {
  checkoutState: any;
  checkoutHandlers: any;
  currencySymbol: string;
  hasServiceItems: boolean;
  totalWalletBalance: number;
  offerRedemptionCode?: string;
  router: any;
}

export function useCheckoutUI({
  checkoutState,
  checkoutHandlers,
  currencySymbol,
  hasServiceItems,
  totalWalletBalance,
  offerRedemptionCode,
  router,
}: UseCheckoutUIParams) {
  const [uiState, dispatch] = useReducer(checkoutUIReducer, checkoutUIInitialState);
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  // Track whether payment was actively processing to detect failure transitions
  const wasProcessingRef = useRef(false);
  useEffect(() => {
    wasProcessingRef.current = uiState.processingPayment;
  }, [uiState.processingPayment]);

  // Detect payment failure: state.error appears while (or right after) processing
  useEffect(() => {
    if (
      checkoutState.error &&
      wasProcessingRef.current &&
      /payment|fail|declined|rejected|timeout|razorpay|insufficient/i.test(checkoutState.error)
    ) {
      wasProcessingRef.current = false;
      dispatch({
        type: 'SHOW_PAYMENT_FAILURE',
        method: uiState.selectedPaymentMethod,
        message: checkoutState.error,
      });
    }
  }, [checkoutState.error]);

  // Initialize offer redemption from route params
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (offerRedemptionCode && !uiState.appliedOfferRedemption) {
      validateAndApplyOfferRedemption(offerRedemptionCode);
    }
  }, [offerRedemptionCode, authLoading, isAuthenticated]);

  // --- Offer Redemption Validation ---

  const validateAndApplyOfferRedemption = async (code: string) => {
    const trimmedCode = code?.trim()?.toUpperCase();
    if (!trimmedCode) {
      showToast({ message: 'Invalid voucher code', type: 'error', duration: 3000 });
      return;
    }
    const isValidFormat = /^RED-[A-Z0-9]+$/i.test(trimmedCode) || /^\d{6}$/.test(trimmedCode);
    if (!isValidFormat) {
      showToast({ message: 'Invalid voucher code format', type: 'error', duration: 3000 });
      return;
    }
    dispatch({ type: 'SET_FIELD', field: 'validatingRedemption', value: true });
    try {
      const response = await apiClient.post<any>('/offers/redemptions/validate', { code: trimmedCode });
      const respData = response.data;
      if (respData?.success !== false && (respData?.valid || respData?.data?.valid)) {
        const offer = respData?.offer || respData?.data?.offer;
        const cashbackPercentage = offer?.cashbackPercentage || 0;
        const cartTotal = checkoutState.billSummary?.itemTotal || 0;
        const maxDiscount = offer?.restrictions?.maxDiscountAmount;
        const minOrderValue = offer?.restrictions?.minOrderValue || 0;

        if (minOrderValue > 0 && cartTotal < minOrderValue) {
          showToast({ message: `Minimum order of ${currencySymbol}${minOrderValue} required for this voucher`, type: 'error', duration: 4000 });
          return;
        }
        let estimatedCashback = Math.round(cartTotal * (cashbackPercentage / 100));
        if (maxDiscount && estimatedCashback > maxDiscount) estimatedCashback = maxDiscount;
        dispatch({ type: 'APPLY_OFFER_REDEMPTION', payload: { code: trimmedCode, cashbackPercentage, offerTitle: offer?.title, estimatedCashback } });
        showToast({ message: `Cashback voucher applied! You'll get ${currencySymbol}${estimatedCashback} cashback`, type: 'success', duration: 4000 });
      } else {
        showToast({ message: response.data?.message || 'Invalid voucher code', type: 'error', duration: 3000 });
      }
    } catch (error: any) {
      showToast({ message: error?.response?.data?.message || 'Failed to validate voucher', type: 'error', duration: 3000 });
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'validatingRedemption', value: false });
    }
  };

  // --- Promo Code Handlers ---

  const handleApplyPromoCode = async () => {
    if (!uiState.promoCode.trim()) {
      showAlert('Error', 'Please enter a promo code', undefined, 'error');
      return;
    }
    const previousPromo = checkoutState.appliedPromoCode;
    const codeToApply = uiState.promoCode.trim().toUpperCase();
    dispatch({ type: 'SET_FIELD', field: 'applyingPromo', value: true });
    try {
      const result = await checkoutHandlers.handlePromoCodeApply(codeToApply);
      dispatch({ type: 'CLOSE_PROMO_MODAL' });
      if (result.success) {
        showToast({ message: previousPromo ? `${previousPromo.code} replaced with ${codeToApply}!` : result.message, type: 'success', duration: 3000 });
      } else {
        showToast({ message: result.message, type: 'error', duration: 4000 });
      }
    } catch {
      showToast({ message: 'Failed to apply promo code', type: 'error', duration: 4000 });
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'applyingPromo', value: false });
    }
  };

  const handleQuickPromoSelect = async (selectedPromoCode: string) => {
    const previousPromo = checkoutState.appliedPromoCode;
    dispatch({ type: 'SET_FIELD', field: 'applyingPromo', value: true });
    try {
      const result = await checkoutHandlers.handlePromoCodeApply(selectedPromoCode);
      dispatch({ type: 'SET_FIELD', field: 'showPromoModal', value: false });
      if (result.success) {
        showToast({ message: previousPromo ? `${previousPromo.code} replaced with ${selectedPromoCode}!` : result.message, type: 'success', duration: 3000 });
      } else {
        showToast({ message: result.message, type: 'error', duration: 4000 });
      }
    } catch {
      showToast({ message: 'Failed to apply promo code', type: 'error', duration: 4000 });
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'applyingPromo', value: false });
    }
  };

  // --- Deal Redemption Handlers ---

  const handleApplyRedemptionCode = async () => {
    if (!uiState.redemptionCode.trim()) {
      showAlert('Error', 'Please enter a redemption code', undefined, 'error');
      return;
    }
    dispatch({ type: 'SET_FIELD', field: 'validatingRedemption', value: true });
    try {
      const response = await apiClient.get<any>(`/campaigns/redemptions/${uiState.redemptionCode.trim().toUpperCase()}`);
      if (!response.success || !response.data) {
        showAlert('Invalid Code', 'This redemption code is invalid or has expired.', undefined, 'error');
        return;
      }
      const redemption = response.data;
      if (redemption.status === 'used') {
        showAlert('Deal Already Redeemed', 'This deal code has already been used. Each deal can only be redeemed once.', undefined, 'warning');
        return;
      }
      if (redemption.status !== 'active') {
        showAlert('Code Unavailable', `This redemption code is ${redemption.status}. Please check your deals in My Deals section.`, undefined, 'warning');
        return;
      }
      if (new Date(redemption.expiresAt) < new Date()) {
        showAlert('Code Expired', 'This redemption code has expired.', undefined, 'error');
        return;
      }
      const deal = redemption.dealSnapshot;
      const cartStoreId = checkoutState.store?.id || checkoutState.store?._id;
      const dealStoreId = deal?.storeId;
      if (dealStoreId && cartStoreId && dealStoreId !== cartStoreId) {
        showAlert('Wrong Store', `This deal code is for "${deal?.store || 'another store'}". You can only use it when ordering from that store.`,
          [{ text: 'OK', style: 'default' }, { text: 'View My Deals', onPress: () => router.push('/my-deals' as any) }], 'warning');
        return;
      }
      const cartSubtotal = checkoutState.billSummary?.itemTotal || 0;
      if (redemption.campaignSnapshot?.minOrderValue && cartSubtotal < redemption.campaignSnapshot.minOrderValue) {
        showAlert('Minimum Order Required', `This deal requires a minimum order of ${currencySymbol}${redemption.campaignSnapshot.minOrderValue}.`, undefined, 'warning');
        return;
      }
      let benefit = 0;
      if (deal?.cashback) {
        const match = deal.cashback.match(/(\d+)/);
        if (match) {
          const value = parseInt(match[1]);
          benefit = deal.cashback.includes('%') ? Math.round(cartSubtotal * (value / 100)) : value;
        }
      } else if (deal?.discount) {
        const match = deal.discount.match(/(\d+)/);
        if (match) {
          const value = parseInt(match[1]);
          benefit = deal.discount.includes('%') ? Math.round(cartSubtotal * (value / 100)) : value;
        }
      }
      if (redemption.campaignSnapshot?.maxBenefit && benefit > redemption.campaignSnapshot.maxBenefit) {
        benefit = redemption.campaignSnapshot.maxBenefit;
      }
      dispatch({ type: 'REDEMPTION_APPLIED_CLOSE', payload: {
        code: uiState.redemptionCode.trim().toUpperCase(), benefit, storeName: deal?.store, dealTitle: redemption.campaignSnapshot?.title,
      }});
      showToast({ message: `Deal applied! You save ${currencySymbol}${benefit}`, type: 'success', duration: 3000 });
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to validate redemption code', undefined, 'error');
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'validatingRedemption', value: false });
    }
  };

  const handleRemoveRedemption = () => {
    dispatch({ type: 'CLEAR_REDEMPTION' });
    showToast({ message: 'Deal removed', type: 'info', duration: 2000 });
  };

  // --- Payment Handlers ---

  const handlePaymentSelect = (method: 'cod' | 'wallet' | 'razorpay') => {
    if (!checkoutState.selectedAddress) {
      showAlert('Address Required', 'Please select a delivery address before proceeding with your order.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Select Address', onPress: () => dispatch({ type: 'SET_FIELD', field: 'showAddressModal', value: true }) }], 'warning');
      return;
    }
    const minimumOrder = checkoutState.store?.minimumOrder || 0;
    const itemTotal = checkoutState.billSummary?.itemTotal || 0;
    if (minimumOrder > 0 && itemTotal < minimumOrder) {
      showAlert('Minimum Order Required', `This store requires a minimum order of ${currencySymbol}${minimumOrder}. Your current order is ${currencySymbol}${itemTotal}. Please add more items to proceed.`, undefined, 'warning');
      return;
    }
    if (method === 'cod' && hasServiceItems) {
      showAlert('COD Not Available', 'Cash on Delivery is not available for service bookings.', undefined, 'error');
      return;
    }
    if (method === 'wallet' && totalWalletBalance < (checkoutState.billSummary?.totalPayable || 0)) {
      showAlert('Insufficient Balance', `Your wallet balance (${totalWalletBalance} RC) is less than the order total.`, undefined, 'error');
      return;
    }
    dispatch({ type: 'START_PAYMENT', method });
  };

  const handleConfirmOrder = async () => {
    if (!uiState.selectedPaymentMethod) return;
    const messages: Record<string, string> = {
      cod: 'Placing your order...', wallet: 'Deducting from wallet...', razorpay: 'Redirecting to payment...',
    };
    dispatch({ type: 'CONFIRM_ORDER_START', message: messages[uiState.selectedPaymentMethod] || 'Processing...' });
    const coinPayload = {
      rezCoins: checkoutState.coinSystem.nuqtaCoin.used || 0,
      promoCoins: checkoutState.coinSystem.promoCoin.used || 0,
      storePromoCoins: checkoutState.coinSystem.storePromoCoin.used || 0,
      redemptionCode: uiState.appliedRedemption?.code,
      offerRedemptionCode: uiState.appliedOfferRedemption?.code,
    };
    try {
      switch (uiState.selectedPaymentMethod) {
        case 'cod': await checkoutHandlers.handleCODPayment(coinPayload); break;
        case 'wallet': await checkoutHandlers.handleWalletPayment(coinPayload); break;
        case 'razorpay': await checkoutHandlers.handleRazorpayPayment(undefined, coinPayload); break;
      }
    } catch (error) {
      dispatch({ type: 'SHOW_PAYMENT_FAILURE', method: uiState.selectedPaymentMethod, message: error instanceof Error ? error.message : 'Payment failed' });
    }
  };

  const handlePaymentFailureRetry = useCallback(() => {
    dispatch({ type: 'CLOSE_PAYMENT_FAILURE' });
    if (uiState.paymentFailedMethod) dispatch({ type: 'START_PAYMENT', method: uiState.paymentFailedMethod });
  }, [uiState.paymentFailedMethod]);

  const handlePaymentFailureSwitchMethod = useCallback((method: 'cod' | 'wallet' | 'razorpay') => {
    dispatch({ type: 'CLOSE_PAYMENT_FAILURE' });
    dispatch({ type: 'START_PAYMENT', method });
  }, []);

  return {
    uiState,
    dispatch,
    handlers: {
      validateAndApplyOfferRedemption,
      handleApplyPromoCode,
      handleQuickPromoSelect,
      handleApplyRedemptionCode,
      handleRemoveRedemption,
      handlePaymentSelect,
      handleConfirmOrder,
      handlePaymentFailureRetry,
      handlePaymentFailureSwitchMethod,
    },
  };
}
