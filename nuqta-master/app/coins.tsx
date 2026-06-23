import { Redirect } from 'expo-router';

// /coins is deprecated — redirects to wallet-screen
export default function CoinsRedirect() {
  return <Redirect href="/wallet-screen" />;
}
