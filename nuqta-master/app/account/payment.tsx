// Payment page - redirects to payment-methods (the canonical CRUD screen)
import { Redirect } from 'expo-router';

export default function PaymentRedirect() {
  return <Redirect href="/account/payment-methods" />;
}
