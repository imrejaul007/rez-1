// Bill Payment API Service
// Handles pay-bill operations, receipt uploads, and cashback verification
// for the integration-test wallet flow.

import apiClient, { ApiResponse } from './apiClient';

export interface PayBillRequest {
  billId?: string;
  amount: number;
  paymentMethod?: string;
  category?: string;
  provider?: string;
  accountNumber?: string;
  operator?: string;
  phoneNumber?: string;
  [key: string]: any;
}

export interface PayBillResponse {
  transactionId: string;
  billId?: string;
  amount: number;
  cashbackEligible?: boolean;
  category?: string;
  provider?: string;
  operator?: string;
  cashbackPercentage?: number;
  rechargeSuccessful?: boolean;
  status?: string;
  [key: string]: any;
}

export interface UploadReceiptRequest {
  file: any;
  [key: string]: any;
}

export interface UploadReceiptResponse {
  receiptId: string;
  billId: string;
  status: string;
  [key: string]: any;
}

export interface ReceiptStatusResponse {
  receiptId: string;
  status: string;
  cashback?: number;
  credited?: boolean;
  [key: string]: any;
}

class PayBillApiService {
  /**
   * Pay a bill (electricity, mobile recharge, etc.).
   *
   * Returns the bill-payment payload directly (unwrapping the API
   * envelope) so callers (and integration tests) can access
   * `result.cashbackEligible`, `result.category`, etc. without going
   * through `.data`.
   */
  async payBill(data: PayBillRequest): Promise<PayBillResponse> {
    try {
      const response = await apiClient.post<PayBillResponse>('/bills/pay', data);
      if (response && response.success && response.data) {
        return response.data;
      }
      if (response && (response as any).transactionId) {
        return response as any;
      }
      return response as any;
    } catch (error: any) {
      // Re-throw to preserve error shape for callers / tests
      throw error;
    }
  }

  /**
   * Upload a bill receipt for cashback verification.
   *
   * Returns the receipt payload directly (unwrapping the API envelope).
   */
  async uploadReceipt(billId: string, data: UploadReceiptRequest): Promise<UploadReceiptResponse> {
    try {
      const response = await apiClient.post<UploadReceiptResponse>(`/bills/${billId}/receipts`, data);
      if (response && response.success && response.data) {
        return response.data;
      }
      if (response && (response as any).receiptId) {
        return response as any;
      }
      return response as any;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get the verification status (and cashback) for an uploaded receipt.
   *
   * Returns the receipt-status payload directly (unwrapping the API
   * envelope).
   */
  async getReceiptStatus(receiptId: string): Promise<ReceiptStatusResponse> {
    try {
      const response = await apiClient.get<ReceiptStatusResponse>(`/bills/receipts/${receiptId}`);
      if (response && response.success && response.data) {
        return response.data;
      }
      if (response && (response as any).receiptId) {
        return response as any;
      }
      return response as any;
    } catch (error: any) {
      throw error;
    }
  }
}

// Create singleton instance
const paybillApi = new PayBillApiService();

// Default + named exports for compatibility
export default paybillApi;
export { paybillApi };
export const payBillApi = paybillApi;
