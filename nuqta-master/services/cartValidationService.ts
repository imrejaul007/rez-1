// services/cartValidationService.ts
// Cart Validation Service - Handles stock validation API calls

import apiClient, { ApiResponse } from './apiClient';
import { ValidationResult, ValidationIssue } from '@/types/validation.types';

export interface ValidateCartResponse {
  valid: boolean;
  canCheckout: boolean;
  issues: ValidationIssue[];
  validItems: Array<{
    itemId: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  invalidItems: Array<{
    itemId: string;
    productId: string;
    productName: string;
    reason: string;
  }>;
  warnings: string[];
  timestamp: string;
}

export interface StockCheckRequest {
  productId: string;
  quantity: number;
  variant?: {
    type: string;
    value: string;
  };
}

export interface StockCheckResponse {
  productId: string;
  available: boolean;
  currentStock: number;
  requestedQuantity: number;
  canFulfill: boolean;
  priceChanged: boolean;
  currentPrice?: number;
  previousPrice?: number;
}

class CartValidationService {
  /**
   * Validate entire cart for stock availability and price changes
   * Calls backend /api/cart/validate endpoint
   */
  async validateCart(): Promise<ApiResponse<ValidateCartResponse>> {
    try {

      const response = await apiClient.get<ValidateCartResponse>('/cart/validate');

      if (response.success) {

      } else {
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check stock availability for a specific product
   * Useful for real-time validation before adding to cart
   */
  async checkProductStock(
    productId: string,
    quantity: number,
    variant?: { type: string; value: string }
  ): Promise<ApiResponse<StockCheckResponse>> {
    try {

      const response = await apiClient.post<StockCheckResponse>('/cart/check-stock', {
        productId,
        quantity,
        variant,
      });

      if (response.success) {

      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Batch check multiple products' stock
   * Useful for validating cart items in parallel
   */
  async checkMultipleProductsStock(
    requests: StockCheckRequest[]
  ): Promise<ApiResponse<StockCheckResponse[]>> {
    try {

      const response = await apiClient.post<StockCheckResponse[]>('/cart/check-stock/batch', {
        products: requests,
      });

      if (response.success) {

      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get validation summary for cart
   * Returns aggregated validation stats
   */
  async getValidationSummary(): Promise<ApiResponse<{
    totalIssues: number;
    outOfStockCount: number;
    lowStockCount: number;
    priceChangeCount: number;
    unavailableCount: number;
    totalAffectedItems: number;
  }>> {
    try {

      const response = await apiClient.get('/cart/validate/summary');

      if (response.success) {

      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Auto-fix cart by removing invalid items
   * Removes out-of-stock and unavailable items
   */
  async autoFixCart(): Promise<ApiResponse<{
    removed: string[];
    updated: Array<{
      productId: string;
      previousQuantity: number;
      newQuantity: number;
    }>;
    message: string;
  }>> {
    try {

      const response = await apiClient.post('/cart/validate/auto-fix');

      if (response.success) {

      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Subscribe to stock updates via WebSocket/Socket.IO
   * Note: Requires Socket.IO integration
   */
  subscribeToStockUpdates(callback: (update: {
    productId: string;
    previousStock: number;
    currentStock: number;
    timestamp: string;
  }) => void): () => void {

    // TODO: Implement Socket.IO integration
    // This is a placeholder for future real-time functionality

    // Return unsubscribe function
    return () => {

    };
  }

  /**
   * Transform backend validation response to frontend format
   * Handles data mapping and normalization
   */
  transformValidationResponse(backendResponse: any): ValidationResult {
    const issues: ValidationIssue[] = (backendResponse.issues || []).map((issue: any) => ({
      itemId: issue.itemId || issue._id,
      productId: issue.productId || issue.product?._id,
      productName: issue.productName || issue.product?.name || 'Unknown Product',
      type: issue.type || 'unavailable',
      message: issue.message || 'Item is unavailable',
      severity: this.getSeverityFromType(issue.type),
      currentPrice: issue.currentPrice,
      previousPrice: issue.previousPrice,
      availableQuantity: issue.availableQuantity,
      requestedQuantity: issue.requestedQuantity,
      image: issue.product?.images?.[0]?.url || issue.image,
    }));

    return {
      valid: backendResponse.valid ?? true,
      canCheckout: backendResponse.canCheckout ?? true,
      issues,
      validItems: backendResponse.validItems || [],
      invalidItems: backendResponse.invalidItems || [],
      warnings: backendResponse.warnings || [],
      timestamp: backendResponse.timestamp || new Date().toISOString(),
    };
  }

  /**
   * Get severity level from issue type
   */
  private getSeverityFromType(type: string): 'error' | 'warning' | 'info' {
    switch (type) {
      case 'out_of_stock':
      case 'unavailable':
        return 'error';
      case 'low_stock':
        return 'warning';
      case 'price_change':
        return 'info';
      default:
        return 'warning';
    }
  }
}

// Create singleton instance
const cartValidationService = new CartValidationService();

export default cartValidationService;
