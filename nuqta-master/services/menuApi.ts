// Menu API Service
import apiClient from './apiClient';
import { devLog } from '@/utils/devLogger';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T | null;
  message?: string;
  error?: string;
}

export interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  category: string;
  isAvailable: boolean;
  preparationTime?: string;
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  dietaryInfo?: {
    isVegetarian?: boolean;
    isVegan?: boolean;
    isGlutenFree?: boolean;
    isNutFree?: boolean;
  };
  spicyLevel?: number; // 0-5
  allergens?: string[];
  tags?: string[];
}

export interface MenuCategory {
  _id: string;
  name: string;
  description?: string;
  displayOrder: number;
  items: MenuItem[];
}

export interface StoreMenu {
  storeId: string;
  storeName: string;
  categories: MenuCategory[];
  isActive: boolean;
  lastUpdated: string;
}

export interface PreOrderRequest {
  storeId: string;
  items: {
    menuItemId: string;
    quantity: number;
    specialInstructions?: string;
  }[];
  scheduledTime?: string;
  deliveryType: 'pickup' | 'delivery' | 'dine_in';
  tableNumber?: string;
  deliveryAddress?: {
    address: string;
    city: string;
    postalCode: string;
    coordinates?: [number, number];
  };
  contactPhone: string;
  notes?: string;
}

export interface PreOrder {
  _id: string;
  orderNumber: string;
  storeId: string;
  userId: string;
  items: {
    menuItem: MenuItem;
    quantity: number;
    price: number;
    specialInstructions?: string;
  }[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  scheduledTime?: string;
  deliveryType: 'pickup' | 'delivery';
  deliveryAddress?: any;
  contactPhone: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

class MenuApi {
  private baseUrl = '/menu';

  /**
   * Get store menu by store ID
   */
  async getStoreMenu(storeId: string): Promise<ApiResponse<StoreMenu>> {
    try {
      devLog.log('🍽️ [MENU API] Fetching menu for store:', storeId);

      const response = await apiClient.get(`${this.baseUrl}/store/${storeId}`);

      if (response.success && response.data) {
        devLog.log('✅ [MENU API] Menu loaded:', response.data.categories?.length, 'categories');
        return response;
      }

      devLog.warn('⚠️ [MENU API] No menu data received');
      return {
        success: false,
        error: 'No menu data available',
        data: null,
      };
    } catch (error) {
      devLog.error('❌ [MENU API] Error fetching menu:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch menu',
        data: null,
      };
    }
  }

  /**
   * Get menu item by ID
   */
  async getMenuItem(menuItemId: string): Promise<ApiResponse<MenuItem>> {
    try {
      devLog.log('🍔 [MENU API] Fetching menu item:', menuItemId);

      const response = await apiClient.get(`${this.baseUrl}/items/${menuItemId}`);

      if (response.success && response.data) {
        devLog.log('✅ [MENU API] Menu item loaded:', response.data.name);
        return response;
      }

      return {
        success: false,
        error: 'Menu item not found',
        data: null,
      };
    } catch (error) {
      devLog.error('❌ [MENU API] Error fetching menu item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch menu item',
        data: null,
      };
    }
  }

  /**
   * Create a pre-order
   */
  async createPreOrder(preOrderData: PreOrderRequest): Promise<ApiResponse<PreOrder>> {
    try {
      devLog.log('🛒 [MENU API] Creating pre-order for store:', preOrderData.storeId);

      const response = await apiClient.post(`${this.baseUrl}/pre-orders`, preOrderData);

      if (response.success && response.data) {
        devLog.log('✅ [MENU API] Pre-order created:', response.data.orderNumber);
        return response;
      }

      return {
        success: false,
        error: 'Failed to create pre-order',
        data: null,
      };
    } catch (error) {
      devLog.error('❌ [MENU API] Error creating pre-order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create pre-order',
        data: null,
      };
    }
  }

  /**
   * Get user's pre-orders
   */
  async getUserPreOrders(): Promise<ApiResponse<PreOrder[]>> {
    try {
      devLog.log('📋 [MENU API] Fetching user pre-orders');

      const response = await apiClient.get(`${this.baseUrl}/pre-orders/user`);

      if (response.success && response.data) {
        devLog.log('✅ [MENU API] Loaded', response.data.length, 'pre-orders');
        return response;
      }

      return {
        success: true,
        data: [],
      };
    } catch (error) {
      devLog.error('❌ [MENU API] Error fetching pre-orders:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pre-orders',
        data: [],
      };
    }
  }

  /**
   * Get pre-order by ID
   */
  async getPreOrder(preOrderId: string): Promise<ApiResponse<PreOrder>> {
    try {
      devLog.log('🔍 [MENU API] Fetching pre-order:', preOrderId);

      const response = await apiClient.get(`${this.baseUrl}/pre-orders/${preOrderId}`);

      if (response.success && response.data) {
        devLog.log('✅ [MENU API] Pre-order loaded:', response.data.orderNumber);
        return response;
      }

      return {
        success: false,
        error: 'Pre-order not found',
        data: null,
      };
    } catch (error) {
      devLog.error('❌ [MENU API] Error fetching pre-order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pre-order',
        data: null,
      };
    }
  }

  /**
   * Cancel a pre-order
   */
  async cancelPreOrder(preOrderId: string): Promise<ApiResponse<PreOrder>> {
    try {
      devLog.log('❌ [MENU API] Cancelling pre-order:', preOrderId);

      const response = await apiClient.put(`${this.baseUrl}/pre-orders/${preOrderId}/cancel`);

      if (response.success && response.data) {
        devLog.log('✅ [MENU API] Pre-order cancelled successfully');
        return response;
      }

      return {
        success: false,
        error: 'Failed to cancel pre-order',
        data: null,
      };
    } catch (error) {
      devLog.error('❌ [MENU API] Error cancelling pre-order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel pre-order',
        data: null,
      };
    }
  }

  /**
   * Search menu items across stores
   */
  async searchMenuItems(query: string, storeId?: string): Promise<ApiResponse<MenuItem[]>> {
    try {
      devLog.log('🔍 [MENU API] Searching menu items:', query);

      const params: any = { query };
      if (storeId) params.storeId = storeId;

      const response = await apiClient.get(`${this.baseUrl}/search`, params);

      if (response.success && response.data) {
        devLog.log('✅ [MENU API] Found', response.data.length, 'menu items');
        return response;
      }

      return {
        success: true,
        data: [],
      };
    } catch (error) {
      devLog.error('❌ [MENU API] Error searching menu items:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search menu items',
        data: [],
      };
    }
  }
}

// Export singleton instance
const menuApi = new MenuApi();
export default menuApi;
