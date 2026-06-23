// Web shim for @stripe/stripe-react-native
// Use @stripe/stripe-js and @stripe/react-stripe-js on web instead
export const StripeProvider = ({ children }) => children;
export const useStripe = () => ({
  confirmPayment: async () => ({ error: { message: 'Use web Stripe SDK' } }),
  createPaymentMethod: async () => ({ error: { message: 'Use web Stripe SDK' } }),
  handleNextAction: async () => ({ error: { message: 'Use web Stripe SDK' } }),
  initPaymentSheet: async () => ({ error: { message: 'Use web Stripe SDK' } }),
  presentPaymentSheet: async () => ({ error: { message: 'Use web Stripe SDK' } }),
});
export const useConfirmPayment = () => ({ confirmPayment: async () => ({ error: { message: 'Use web Stripe SDK' } }), loading: false });
export const useConfirmSetupIntent = () => ({ confirmSetupIntent: async () => ({ error: { message: 'Use web Stripe SDK' } }), loading: false });
export const CardField = () => null;
export const CardForm = () => null;
export const ApplePayButton = () => null;
export const GooglePayButton = () => null;
export const isPlatformPaySupported = async () => false;
export default { StripeProvider, useStripe, useConfirmPayment, CardField, CardForm };
