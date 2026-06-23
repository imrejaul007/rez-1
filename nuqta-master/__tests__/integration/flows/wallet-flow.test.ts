/**
 * Wallet Flow Integration Tests
 *
 * Complete user journey for wallet operations and bill payments
 */

import { walletApi } from '@/services/walletApi';
import { paybillApi } from '@/services/paybillApi';
import apiClient from '@/services/apiClient';
import {
  setupAuthenticatedUser,
  cleanupAfterTest,
  testDataFactory,
} from '../utils/testHelpers';
import { setupMockHandlers } from '../utils/mockApiHandlers';

jest.mock('@/services/apiClient');

describe('Wallet Flow Integration Tests', () => {
  beforeEach(async () => {
    await setupAuthenticatedUser();
    setupMockHandlers(apiClient);
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('Complete Wallet Journey', () => {
    it('should complete: Add Money → Pay Bill → Upload Receipt → Get Cashback', async () => {
      // Step 1: Check initial balance
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { balance: 1000, coins: 50 },
      });

      const initialWallet = await walletApi.getWallet();
      expect(initialWallet.balance).toBe(1000);

      // Step 2: Add money to wallet
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          transactionId: 'txn_add_123',
          amount: 5000,
          newBalance: 6000,
        },
      });

      const addMoneyResult = await walletApi.addMoney(5000);
      expect(addMoneyResult.newBalance).toBe(6000);

      // Step 3: Pay bill from wallet
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          transactionId: 'txn_pay_123',
          billId: 'bill_123',
          amount: 2500,
          cashbackEligible: true,
        },
      });

      const billPayment = await paybillApi.payBill({
        billId: 'bill_123',
        amount: 2500,
        paymentMethod: 'wallet',
      });
      expect(billPayment.cashbackEligible).toBe(true);

      // Step 4: Upload bill receipt
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          receiptId: 'receipt_123',
          billId: 'bill_123',
          status: 'pending_verification',
        },
      });

      const receiptUpload = await paybillApi.uploadReceipt('bill_123', {
        file: 'mock_receipt_image',
      });
      expect(receiptUpload.status).toBe('pending_verification');

      // Step 5: Get cashback after verification
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          receiptId: 'receipt_123',
          status: 'verified',
          cashback: 250,
          credited: true,
        },
      });

      const verification = await paybillApi.getReceiptStatus('receipt_123');
      expect(verification.cashback).toBe(250);

      // Step 6: Check updated balance
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          balance: 3750, // 6000 - 2500 + 250
          coins: 75, // 50 + bonus coins
        },
      });

      const updatedWallet = await walletApi.getWallet();
      expect(updatedWallet.balance).toBe(3750);
    });

    it('should handle wallet to wallet transfer', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          transactionId: 'txn_transfer_123',
          from: 'user_123',
          to: 'user_456',
          amount: 1000,
        },
      });

      const transfer = await walletApi.transferMoney({
        recipientId: 'user_456',
        amount: 1000,
        note: 'Test transfer',
      });
      expect(transfer.transactionId).toBeDefined();
    });
  });

  describe('Bill Payment Categories', () => {
    it('should pay electricity bill', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          transactionId: 'txn_elec_123',
          category: 'electricity',
          provider: 'Local Power Company',
          amount: 3000,
          cashbackPercentage: 5,
        },
      });

      const electricityBill = await paybillApi.payBill({
        category: 'electricity',
        provider: 'Local Power Company',
        accountNumber: '123456789',
        amount: 3000,
      });
      expect(electricityBill.category).toBe('electricity');
    });

    it('should pay mobile recharge', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          transactionId: 'txn_mobile_123',
          category: 'mobile',
          operator: 'Airtel',
          amount: 399,
          rechargeSuccessful: true,
        },
      });

      const mobileRecharge = await paybillApi.payBill({
        category: 'mobile',
        operator: 'Airtel',
        phoneNumber: '+1234567890',
        amount: 399,
      });
      expect(mobileRecharge.rechargeSuccessful).toBe(true);
    });
  });

  describe('Transaction History', () => {
    it('should retrieve transaction history with filters', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          transactions: [
            {
              id: 'txn_1',
              type: 'credit',
              amount: 500,
              description: 'Cashback',
              date: new Date().toISOString(),
            },
            {
              id: 'txn_2',
              type: 'debit',
              amount: 2500,
              description: 'Bill payment',
              date: new Date(Date.now() - 86400000).toISOString(),
            },
          ],
        },
      });

      const history = await walletApi.getTransactions({
        startDate: new Date(Date.now() - 7 * 86400000),
        endDate: new Date(),
      });
      expect(history.transactions.length).toBeGreaterThan(0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle insufficient balance', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: 'Insufficient balance' },
        },
      });

      await expect(
        walletApi.transferMoney({ recipientId: 'user_456', amount: 100000 })
      ).rejects.toMatchObject({
        response: { status: 400 },
      });
    });

    it('should handle failed bill payment', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: 'Payment gateway error' },
        },
      });

      await expect(
        paybillApi.payBill({ billId: 'bill_123', amount: 2500 })
      ).rejects.toBeDefined();
    });
  });
});
