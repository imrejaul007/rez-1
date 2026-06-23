import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Wallet Index Route
// This file provides the wallet route for expo-router

import WalletScreen from '../wallet-screen';

export default withErrorBoundary(WalletScreen, 'WalletIndex');
