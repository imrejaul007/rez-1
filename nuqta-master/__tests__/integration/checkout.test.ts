/**
 * Checkout Flow - Integration Tests
 *
 * End-to-end integration tests for the complete checkout process including:
 * - Cart validation
 * - Address selection
 * - Payment processing
 * - Order creation
 * - Confirmation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartApi } from '@/services/cartApi';
import orderApi from '@/services/ordersApi';
import { paymentService } from '@/services/paymentService';
import { addressApi } from '@/services/addressApi';
import apiClient from '@/services/apiClient';

// Mock dependencies
jest.mock('@/services/apiClient');
jest.mock('@react-native-async-storage/async-storage');

describe('Checkout Flow Integration Tests', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    phoneNumber: '+1234567890',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  const mockCartItems = [
    {
      id: 'cart_item_1',
      productId: 'prod_123',
      product: {
        id: 'prod_123',
        name: 'Test Product 1',
        price: 999,
        images: ['image1.jpg'],
      },
      quantity: 2,
      price: 999,
      subtotal: 1998,
    },
    {
      id: 'cart_item_2',
      productId: 'prod_456',
      product: {
        id: 'prod_456',
        name: 'Test Product 2',
        price: 499,
        images: ['image2.jpg'],
      },
      quantity: 1,
      price: 499,
      subtotal: 499,
    },
  ];

  const mockAddress = {
    id: 'addr_123',
    firstName: 'John',
    lastName: 'Doe',
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
    phoneNumber: '+1234567890',
    isDefault: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Complete Checkout Flow', () => {
    it('should complete full checkout process successfully', async () => {
      // Step 1: Get cart
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          items: mockCartItems,
          subtotal: 2497,
          tax: 249.7,
          shipping: 50,
          total: 2796.7,
        },
      });

      const cart = await cartApi.getCart();
      expect(cart.items).toHaveLength(2);
      expect(cart.total).toBe(2796.7);

      // Step 2: Get saved addresses
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [mockAddress],
      });

      const addresses = await addressApi.getAddresses();
      expect(addresses).toHaveLength(1);
      expect(addresses[0].isDefault).toBe(true);

      // Step 3: Create payment intent
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          clientSecret: 'pi_123_secret',
          paymentIntentId: 'pi_123',
          amount: 2796.7,
        },
      });

      const paymentIntent = await paymentService.createPaymentIntent({
        amount: cart.total,
        currency: 'usd',
      });

      expect(paymentIntent.clientSecret).toBeDefined();
      expect(paymentIntent.amount).toBe(2796.7);

      // Step 4: Create order
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'order_123',
          status: 'pending',
          items: mockCartItems,
          total: 2796.7,
          shippingAddress: mockAddress,
          paymentIntentId: 'pi_123',
        },
      });

      const order = await orderApi.createOrder({
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddressId: mockAddress.id,
        paymentIntentId: paymentIntent.paymentIntentId,
      });

      expect(order.id).toBe('order_123');
      expect(order.status).toBe('pending');

      // Step 5: Clear cart after successful order
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { message: 'Cart cleared' },
      });

      await cartApi.clearCart();

      expect(apiClient.post).toHaveBeenCalledWith('/cart/clear');
    });

    it('should handle out of stock items during checkout', async () => {
      // Get cart with item that becomes out of stock
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          items: mockCartItems,
          subtotal: 2497,
          total: 2796.7,
        },
      });

      const cart = await cartApi.getCart();

      // Attempt to create order
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: 'Some items are out of stock',
            outOfStockItems: ['prod_123'],
          },
        },
      });

      await expect(
        orderApi.createOrder({
          items: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
          shippingAddressId: 'addr_123',
        })
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: expect.objectContaining({
            error: expect.stringContaining('out of stock'),
          }),
        },
      });
    });

    it('should handle payment failure gracefully', async () => {
      // Get cart
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          items: mockCartItems,
          total: 2796.7,
        },
      });

      const cart = await cartApi.getCart();

      // Create payment intent succeeds
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          clientSecret: 'pi_123_secret',
          paymentIntentId: 'pi_123',
        },
      });

      const paymentIntent = await paymentService.createPaymentIntent({
        amount: cart.total,
      });

      // Payment fails
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 402,
          data: {
            error: 'Payment failed: Insufficient funds',
          },
        },
      });

      await expect(
        paymentService.confirmPayment({
          paymentIntentId: paymentIntent.paymentIntentId,
          paymentMethodId: 'pm_123',
        })
      ).rejects.toMatchObject({
        response: {
          status: 402,
        },
      });

      // Order should not be created
      expect(apiClient.post).not.toHaveBeenCalledWith(
        '/orders',
        expect.any(Object)
      );
    });
  });

  describe('Cart Validation', () => {
    it('should validate minimum order amount', async () => {
      const smallCart = {
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            quantity: 1,
            price: 5,
            subtotal: 5,
          },
        ],
        subtotal: 5,
        total: 5,
      };

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: smallCart,
      });

      const cart = await cartApi.getCart();

      // Minimum order is $10
      const minimumOrderAmount = 10;
      expect(cart.total).toBeLessThan(minimumOrderAmount);

      // Should reject order creation
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: `Minimum order amount is $${minimumOrderAmount}`,
          },
        },
      });

      await expect(
        orderApi.createOrder({
          items: cart.items,
          shippingAddressId: 'addr_123',
        })
      ).rejects.toBeDefined();
    });

    it('should validate item availability before checkout', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          items: mockCartItems,
          total: 2796.7,
        },
      });

      const cart = await cartApi.getCart();

      // Validate stock availability
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          available: true,
          items: mockCartItems.map((item) => ({
            productId: item.productId,
            available: true,
            stockQuantity: 10,
          })),
        },
      });

      const validation = await cartApi.validateCart();

      expect(validation.available).toBe(true);
      expect(validation.items.every((item) => item.available)).toBe(true);
    });
  });

  describe('Address Management', () => {
    it('should create new address during checkout', async () => {
      const newAddress = {
        firstName: 'Jane',
        lastName: 'Smith',
        street: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'US',
        phoneNumber: '+1987654321',
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'addr_456',
          ...newAddress,
          isDefault: false,
        },
      });

      const createdAddressResponse = await addressApi.createAddress(newAddress);
      const createdAddress = createdAddressResponse.data!;

      expect(createdAddress.id).toBe('addr_456');
      expect(createdAddress.street).toBe(newAddress.street);
    });

    it('should set default address for checkout', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [mockAddress],
      });

      const addresses = await addressApi.getAddresses();
      const defaultAddress = addresses.find((addr) => addr.isDefault);

      expect(defaultAddress).toBeDefined();
      expect(defaultAddress?.id).toBe('addr_123');
    });
  });

  describe('Payment Processing', () => {
    it('should process card payment successfully', async () => {
      (apiClient.post as jest.Mock)
        // Create payment intent
        .mockResolvedValueOnce({
          success: true,
          data: {
            clientSecret: 'pi_123_secret',
            paymentIntentId: 'pi_123',
          },
        })
        // Confirm payment
        .mockResolvedValueOnce({
          success: true,
          data: {
            status: 'succeeded',
            paymentIntentId: 'pi_123',
          },
        });

      const paymentIntent = await paymentService.createPaymentIntent({
        amount: 2796.7,
      });

      const payment = await paymentService.confirmPayment({
        paymentIntentId: paymentIntent.paymentIntentId,
        paymentMethodId: 'pm_card_123',
      });

      expect(payment.status).toBe('succeeded');
    });

    it('should handle 3D Secure authentication', async () => {
      (apiClient.post as jest.Mock)
        // Create payment intent
        .mockResolvedValueOnce({
          success: true,
          data: {
            clientSecret: 'pi_123_secret',
            paymentIntentId: 'pi_123',
          },
        })
        // Confirm payment requires action
        .mockResolvedValueOnce({
          success: true,
          data: {
            status: 'requires_action',
            paymentIntentId: 'pi_123',
            nextAction: {
              type: 'redirect_to_url',
              url: 'https://3ds.example.com',
            },
          },
        })
        // After 3DS, confirm again
        .mockResolvedValueOnce({
          success: true,
          data: {
            status: 'succeeded',
            paymentIntentId: 'pi_123',
          },
        });

      const paymentIntent = await paymentService.createPaymentIntent({
        amount: 2796.7,
      });

      const initialPayment = await paymentService.confirmPayment({
        paymentIntentId: paymentIntent.paymentIntentId,
        paymentMethodId: 'pm_card_3ds',
      });

      expect(initialPayment.status).toBe('requires_action');
      expect(initialPayment.nextAction).toBeDefined();

      // Simulate 3DS completion
      const finalPayment = await paymentService.confirmPayment({
        paymentIntentId: paymentIntent.paymentIntentId,
      });

      expect(finalPayment.status).toBe('succeeded');
    });

    it('should support wallet payments (Apple Pay, Google Pay)', async () => {
      (apiClient.post as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          data: {
            clientSecret: 'pi_123_secret',
            paymentIntentId: 'pi_123',
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            status: 'succeeded',
            paymentIntentId: 'pi_123',
            paymentMethod: 'apple_pay',
          },
        });

      const paymentIntent = await paymentService.createPaymentIntent({
        amount: 2796.7,
      });

      const payment = await paymentService.confirmPayment({
        paymentIntentId: paymentIntent.paymentIntentId,
        paymentMethodType: 'apple_pay',
        token: 'wallet_token_123',
      });

      expect(payment.status).toBe('succeeded');
      expect(payment.paymentMethod).toBe('apple_pay');
    });
  });

  describe('Order Creation', () => {
    it('should create order with all details', async () => {
      const orderData = {
        items: mockCartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddressId: 'addr_123',
        billingAddressId: 'addr_123',
        paymentIntentId: 'pi_123',
        couponCode: 'SAVE10',
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'order_123',
          orderNumber: 'ORD-2024-001',
          status: 'pending',
          items: mockCartItems,
          subtotal: 2497,
          discount: 249.7,
          tax: 224.73,
          shipping: 50,
          total: 2521.03,
          shippingAddress: mockAddress,
          paymentStatus: 'paid',
          createdAt: new Date().toISOString(),
        },
      });

      const order = await orderApi.createOrder(orderData);

      expect(order.id).toBe('order_123');
      expect(order.orderNumber).toBe('ORD-2024-001');
      expect(order.discount).toBeGreaterThan(0);
      expect(order.paymentStatus).toBe('paid');
    });

    it('should handle order creation failure and rollback', async () => {
      // Payment succeeds
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          status: 'succeeded',
          paymentIntentId: 'pi_123',
        },
      });

      const payment = await paymentService.confirmPayment({
        paymentIntentId: 'pi_123',
        paymentMethodId: 'pm_123',
      });

      expect(payment.status).toBe('succeeded');

      // Order creation fails
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            error: 'Order creation failed',
          },
        },
      });

      await expect(
        orderApi.createOrder({
          items: mockCartItems,
          shippingAddressId: 'addr_123',
          paymentIntentId: 'pi_123',
        })
      ).rejects.toBeDefined();

      // Should refund payment
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          status: 'refunded',
          paymentIntentId: 'pi_123',
        },
      });

      const refund = await paymentService.refundPayment('pi_123');
      expect(refund.status).toBe('refunded');
    });
  });

  describe('Discount and Coupon Application', () => {
    it('should apply coupon code to order', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          valid: true,
          code: 'SAVE10',
          discountType: 'percentage',
          discountValue: 10,
          discountAmount: 249.7,
        },
      });

      const coupon = await orderApi.validateCoupon('SAVE10', 2497);

      expect(coupon.valid).toBe(true);
      expect(coupon.discountAmount).toBe(249.7);
    });

    it('should reject invalid coupon codes', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Invalid coupon code',
      });

      await expect(orderApi.validateCoupon('INVALID', 2497)).rejects.toBeDefined();
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed API calls', async () => {
      let attemptCount = 0;

      (apiClient.get as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          success: true,
          data: { items: mockCartItems, total: 2796.7 },
        });
      });

      // Implement retry logic
      const getCartWithRetry = async (retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            return await cartApi.getCart();
          } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));
          }
        }
      };

      const cart = await getCartWithRetry();
      expect(cart.items).toHaveLength(2);
      expect(attemptCount).toBe(3);
    });
  });

  describe('Performance Tests', () => {
    it('should complete checkout within acceptable time', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: { items: mockCartItems, total: 2796.7 },
      });

      (apiClient.post as jest.Mock).mockResolvedValue({
        success: true,
        data: { id: 'order_123', status: 'pending' },
      });

      const startTime = Date.now();

      await cartApi.getCart();
      await paymentService.createPaymentIntent({ amount: 2796.7 });
      await orderApi.createOrder({
        items: mockCartItems,
        shippingAddressId: 'addr_123',
      });

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in under 2 seconds
    });
  });
});
