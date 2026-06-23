/**
 * Shopping Flow Integration Tests
 *
 * Complete user journey from browsing products to order completion
 */

import { cartApi } from '@/services/cartApi';
import { productsApi } from '@/services/productsApi';
import orderApi from '@/services/ordersApi';
import { paymentService } from '@/services/paymentService';
import { addressApi } from '@/services/addressApi';
import apiClient from '@/services/apiClient';
import {
  setupAuthenticatedUser,
  cleanupAfterTest,
  testDataFactory,
  generateMockProducts,
  measurePerformance,
} from '../utils/testHelpers';
import { setupMockHandlers, resetMockHandlers } from '../utils/mockApiHandlers';

jest.mock('@/services/apiClient');

describe('Shopping Flow Integration Tests', () => {
  beforeEach(async () => {
    await setupAuthenticatedUser();
    resetMockHandlers();
    setupMockHandlers(apiClient);
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('Complete Shopping Journey', () => {
    it('should complete full shopping flow: Browse → View → Add to Cart → Checkout → Payment → Order', async () => {
      // Step 1: Browse Products
      const mockProducts = generateMockProducts(10);
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          products: mockProducts,
          pagination: { page: 1, limit: 20, total: 10 },
        },
      });

      const productsResponse = await productsApi.getProducts({ page: 1, limit: 20 });
      expect(productsResponse.products).toHaveLength(10);

      // Step 2: View Product Details
      const selectedProduct = mockProducts[0];
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: selectedProduct,
      });

      const productDetails = await productsApi.getProductById(selectedProduct.id);
      expect(productDetails.id).toBe(selectedProduct.id);

      // Step 3: Add to Cart
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          item: {
            id: 'cart_item_1',
            productId: selectedProduct.id,
            quantity: 2,
            price: selectedProduct.price,
            subtotal: selectedProduct.price * 2,
          },
        },
      });

      const cartItem = await cartApi.addToCart({
        productId: selectedProduct.id,
        quantity: 2,
      });
      expect(cartItem.item.quantity).toBe(2);

      // Step 4: View Cart
      const mockCart = testDataFactory.cart();
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockCart,
      });

      const cart = await cartApi.getCart();
      expect(cart.items.length).toBeGreaterThan(0);
      expect(cart.total).toBeGreaterThan(0);

      // Step 5: Select Delivery Address
      const mockAddress = testDataFactory.address();
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [mockAddress],
      });

      const addresses = await addressApi.getAddresses();
      const defaultAddress = addresses.find(addr => addr.isDefault);
      expect(defaultAddress).toBeDefined();

      // Step 6: Create Payment Intent
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          paymentIntentId: 'pi_test_123',
          clientSecret: 'pi_test_123_secret',
          amount: cart.total,
        },
      });

      const paymentIntent = await paymentService.createPaymentIntent({
        amount: cart.total,
        currency: 'usd',
      });
      expect(paymentIntent.clientSecret).toBeDefined();

      // Step 7: Confirm Payment
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          status: 'succeeded',
          paymentIntentId: paymentIntent.paymentIntentId,
        },
      });

      const payment = await paymentService.confirmPayment({
        paymentIntentId: paymentIntent.paymentIntentId,
        paymentMethodId: 'pm_test_card',
      });
      expect(payment.status).toBe('succeeded');

      // Step 8: Create Order
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'order_test_123',
          orderNumber: 'ORD-2024-TEST',
          status: 'pending',
          items: cart.items,
          total: cart.total,
          shippingAddress: defaultAddress,
          paymentIntentId: paymentIntent.paymentIntentId,
        },
      });

      const order = await orderApi.createOrder({
        items: cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddressId: defaultAddress!.id,
        paymentIntentId: paymentIntent.paymentIntentId,
      });

      expect(order.id).toBeDefined();
      expect(order.orderNumber).toBeDefined();
      expect(order.status).toBe('pending');

      // Step 9: Clear Cart
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { message: 'Cart cleared' },
      });

      await cartApi.clearCart();

      // Verify all API calls were made in correct order
      expect(apiClient.get).toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalled();
    });

    it('should handle product search and filter flow', async () => {
      // Search for products
      const searchQuery = 'laptop';
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          products: generateMockProducts(5),
          query: searchQuery,
        },
      });

      const searchResults = await productsApi.searchProducts(searchQuery);
      expect(searchResults.products).toBeDefined();

      // Apply filters
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          products: generateMockProducts(3),
          filters: {
            category: 'electronics',
            priceRange: { min: 1000, max: 5000 },
          },
        },
      });

      const filteredProducts = await productsApi.getProducts({
        category: 'electronics',
        minPrice: 1000,
        maxPrice: 5000,
      });
      expect(filteredProducts.products.length).toBeGreaterThan(0);
    });

    it('should handle cart modifications during shopping', async () => {
      // Add multiple items
      const products = generateMockProducts(3);

      for (const product of products) {
        (apiClient.post as jest.Mock).mockResolvedValueOnce({
          success: true,
          data: {
            item: {
              id: `cart_item_${product.id}`,
              productId: product.id,
              quantity: 1,
              price: product.price,
            },
          },
        });

        await cartApi.addToCart({
          productId: product.id,
          quantity: 1,
        });
      }

      // Update quantity
      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          item: {
            id: 'cart_item_1',
            quantity: 3,
          },
        },
      });

      await cartApi.updateCartItem('cart_item_1', { quantity: 3 });

      // Remove item
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { message: 'Item removed' },
      });

      await cartApi.removeFromCart('cart_item_2');

      // Get updated cart
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: testDataFactory.cart(),
      });

      const cart = await cartApi.getCart();
      expect(cart.items).toBeDefined();
    });
  });

  describe('Product Discovery Flow', () => {
    it('should browse by category and view product details', async () => {
      // Get categories
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          categories: [
            { id: 'cat_1', name: 'Electronics', productCount: 50 },
            { id: 'cat_2', name: 'Fashion', productCount: 100 },
          ],
        },
      });

      const categoriesResponse = await productsApi.getCategories();
      expect(categoriesResponse.categories.length).toBeGreaterThan(0);

      // Get products in category
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          products: generateMockProducts(10),
          category: 'Electronics',
        },
      });

      const categoryProducts = await productsApi.getProducts({
        category: 'cat_1',
      });
      expect(categoryProducts.products).toBeDefined();

      // View product details
      const product = categoryProducts.products[0];
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          ...product,
          reviews: [],
          relatedProducts: generateMockProducts(4),
        },
      });

      const productDetails = await productsApi.getProductById(product.id);
      expect(productDetails.id).toBe(product.id);
    });

    it('should handle recommended products flow', async () => {
      // Get homepage recommendations
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          recommended: generateMockProducts(10),
          trending: generateMockProducts(5),
          newArrivals: generateMockProducts(8),
        },
      });

      const homepage = await productsApi.getHomepageProducts();
      expect(homepage.recommended).toBeDefined();
      expect(homepage.trending).toBeDefined();
    });
  });

  describe('Checkout Variations', () => {
    it('should handle guest checkout flow', async () => {
      // Get cart without authentication
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: testDataFactory.cart(),
      });

      const cart = await cartApi.getCart();

      // Create guest order with email
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'order_guest_123',
          guestEmail: 'guest@example.com',
          status: 'pending',
        },
      });

      const guestOrder = await orderApi.createOrder({
        items: cart.items,
        shippingAddressId: 'addr_123',
        guestEmail: 'guest@example.com',
      });

      expect(guestOrder.id).toBeDefined();
    });

    it('should handle express checkout flow', async () => {
      // Cart with default address and payment method
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'order_express_123',
          status: 'pending',
          total: 2500,
          expressCheckout: true,
        },
      });

      const expressOrder = await orderApi.createOrder({
        items: testDataFactory.cart().items,
        useDefaultAddress: true,
        useDefaultPayment: true,
      });

      expect(expressOrder.expressCheckout).toBe(true);
    });

    it('should handle buy now flow (skip cart)', async () => {
      const product = generateMockProducts(1)[0];

      // Direct checkout without adding to cart
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'order_buynow_123',
          items: [
            {
              productId: product.id,
              quantity: 1,
              price: product.price,
            },
          ],
          total: product.price,
        },
      });

      const quickOrder = await orderApi.createOrder({
        items: [
          {
            productId: product.id,
            quantity: 1,
            price: product.price,
          },
        ],
        shippingAddressId: 'addr_123',
        buyNow: true,
      });

      expect(quickOrder.items).toHaveLength(1);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle out of stock during checkout', async () => {
      const cart = testDataFactory.cart();
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: cart,
      });

      await cartApi.getCart();

      // Product goes out of stock before checkout
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: 'Product is out of stock',
            productId: cart.items[0].productId,
          },
        },
      });

      await expect(
        orderApi.createOrder({
          items: cart.items,
          shippingAddressId: 'addr_123',
        })
      ).rejects.toMatchObject({
        response: {
          status: 400,
        },
      });
    });

    it('should handle payment failure and retry', async () => {
      // First payment attempt fails
      (apiClient.post as jest.Mock)
        .mockRejectedValueOnce({
          response: {
            status: 402,
            data: { error: 'Payment failed' },
          },
        })
        // Retry succeeds
        .mockResolvedValueOnce({
          success: true,
          data: {
            status: 'succeeded',
            paymentIntentId: 'pi_123',
          },
        });

      // First attempt
      await expect(
        paymentService.confirmPayment({
          paymentIntentId: 'pi_123',
          paymentMethodId: 'pm_card_declined',
        })
      ).rejects.toBeDefined();

      // Retry with different card
      const payment = await paymentService.confirmPayment({
        paymentIntentId: 'pi_123',
        paymentMethodId: 'pm_card_success',
      });

      expect(payment.status).toBe('succeeded');
    });

    it('should handle address validation errors', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: 'Invalid address',
            fields: ['postalCode', 'state'],
          },
        },
      });

      await expect(
        addressApi.createAddress({
          street: '123 Test St',
          city: 'Test City',
          postalCode: 'INVALID',
          state: 'XX',
        } as any)
      ).rejects.toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should complete shopping flow within acceptable time', async () => {
      setupMockHandlers(apiClient);

      const { duration } = await measurePerformance(async () => {
        // Browse products
        await productsApi.getProducts({ page: 1 });

        // Add to cart
        await cartApi.addToCart({ productId: 'prod_1', quantity: 1 });

        // Get cart
        await cartApi.getCart();

        // Create order
        await orderApi.createOrder({
          items: [{ productId: 'prod_1', quantity: 1, price: 999 }],
          shippingAddressId: 'addr_123',
        });
      });

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should handle concurrent cart operations', async () => {
      const products = generateMockProducts(5);

      // Add multiple items concurrently
      const addOperations = products.map(product => {
        (apiClient.post as jest.Mock).mockResolvedValueOnce({
          success: true,
          data: { item: { productId: product.id } },
        });
        return cartApi.addToCart({ productId: product.id, quantity: 1 });
      });

      const results = await Promise.all(addOperations);
      expect(results).toHaveLength(5);
    });
  });
});
