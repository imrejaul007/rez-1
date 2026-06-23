// useCardOfferAutoApply.ts
// Hook to auto-apply card offers when card payment is selected

import { useState, useEffect, useCallback } from 'react';
import { useCartState, useCartActions } from '@/stores/selectors';
import discountsApi, { Discount } from '@/services/discountsApi';
import { showToast } from '@/components/common/ToastManager';
import analyticsService from '@/services/analyticsService';

interface UseCardOfferAutoApplyProps {
  storeId?: string;
  orderValue: number;
  cardNumber?: string; // Card number when entered
  enabled?: boolean; // Whether auto-apply is enabled
}

export function useCardOfferAutoApply({
  storeId,
  orderValue,
  cardNumber,
  enabled = true,
}: UseCardOfferAutoApplyProps) {
  const cartState = useCartState();
  const cartActions = useCartActions();
  const [appliedOffer, setAppliedOffer] = useState<Discount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndApplyBestOffer = useCallback(async (cardNum: string) => {
    if (!storeId || !cardNum || cardNum.length < 13) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Validate card for offers
      const response = await discountsApi.validateCardForOffers({
        cardNumber: cardNum,
        storeId,
        orderValue,
      });

      if (response.success && response.data?.eligible && response.data.bestOffer) {
        const bestOffer = response.data.bestOffer;

        // Check if offer meets minimum order value
        if (orderValue >= bestOffer.minOrderValue) {
          // Auto-apply the best offer
          await applyOffer(bestOffer);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to validate card offers');
    } finally {
      setLoading(false);
    }
  }, [storeId, orderValue]);

  const applyOffer = useCallback(async (offer: Discount) => {
    try {
      // Apply offer via cart context
      if (cartActions && typeof cartActions.applyCoupon === 'function' && offer.code) {
        await cartActions.applyCoupon(offer.code);
      } else if (cartActions && typeof (cartActions as any).setCardOffer === 'function') {
        await (cartActions as any).setCardOffer(offer);
      }

      setAppliedOffer(offer);

      const discountAmount = offer.type === 'percentage'
        ? `${offer.value}%`
        : `₹${offer.value}`;

      showToast({
        message: `Card offer applied! Save ${discountAmount} on this order.`,
        type: 'success',
        duration: 3000,
      });

      analyticsService.track('card_offer_auto_applied', {
        offerId: offer._id,
        offerName: offer.name,
        discountType: offer.type,
        discountValue: offer.value,
        storeId,
        orderValue,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to apply offer');
    }
  }, [cartActions, storeId, orderValue]);

  const removeOffer = useCallback(async () => {
    if (cartActions && typeof (cartActions as any).removeCardOffer === 'function') {
      await (cartActions as any).removeCardOffer();
    }
    setAppliedOffer(null);
  }, [cartActions]);

  // Auto-apply best offer when card number is entered
  useEffect(() => {
    if (!enabled || !storeId || !cardNumber || orderValue <= 0) {
      return;
    }

    // Only auto-apply if no offer is already applied
    if (appliedOffer || (cartState as any).appliedCardOffer) {
      return;
    }

    // Debounce card number validation
    const timeoutId = setTimeout(async () => {
      try {
        await validateAndApplyBestOffer(cardNumber);
      } catch (_e) {
        // silently handle
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [cardNumber, storeId, orderValue, enabled, appliedOffer, cartState, validateAndApplyBestOffer]);

  return {
    appliedOffer,
    loading,
    error,
    applyOffer,
    removeOffer,
    validateAndApplyBestOffer,
  };
}
