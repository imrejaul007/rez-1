// @ts-nocheck
import { create } from 'zustand';
import wishlistApi from '@/services/wishlistApi';

export interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  brand: string;
  category: string;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LIMITED';
  addedAt: string;
}

interface WishlistStoreState {
  wishlistItems: WishlistItem[];
  isLoading: boolean;
  error: string | null;

  isInWishlist: (productId: string) => boolean;
  addToWishlist: (item: Omit<WishlistItem, 'id' | 'addedAt'>) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  getWishlistCount: () => number;
  refreshWishlist: () => Promise<void>;
}

export const useWishlistStore = create<WishlistStoreState>((set, get) => ({
  wishlistItems: [],
  isLoading: false,
  error: null,

  isInWishlist: (productId: string): boolean => {
    return get().wishlistItems.some(item => item.productId === productId);
  },

  addToWishlist: async (item: Omit<WishlistItem, 'id' | 'addedAt'>): Promise<void> => {
    const state = get();
    if (state.wishlistItems.some(i => i.productId === item.productId)) {
      throw new Error('Item already in wishlist');
    }

    const optimisticItem: WishlistItem = {
      ...item,
      id: `temp-${Date.now()}`,
      addedAt: new Date().toISOString(),
    };

    // Optimistic update
    set(s => ({ wishlistItems: [...s.wishlistItems, optimisticItem], error: null }));

    try {
      const wishlistsResponse = await wishlistApi.getWishlists(1, 1);
      let wishlistId: string | undefined;

      if (wishlistsResponse.data?.wishlists?.length > 0) {
        wishlistId = wishlistsResponse.data.wishlists[0].id || (wishlistsResponse.data.wishlists[0] as any)._id;
      } else {
        const newWishlistResponse = await wishlistApi.createWishlist({
          name: 'My Wishlist',
          description: 'Default wishlist',
          isPublic: false,
        });
        wishlistId = newWishlistResponse.data?.id || (newWishlistResponse.data as any)?._id;
      }

      if (!wishlistId) throw new Error('Failed to get or create wishlist');

      const response = await wishlistApi.addToWishlist({
        itemType: 'product',
        itemId: item.productId,
        wishlistId,
        notes: `Added ${item.productName}`,
        priority: 'medium',
        tags: [item.category],
      });

      if (response.data) {
        set(s => ({
          wishlistItems: s.wishlistItems.map(i =>
            i.id === optimisticItem.id
              ? { ...i, id: response.data.id || (response.data as any)._id }
              : i
          ),
        }));
      } else {
        throw new Error('Failed to add item to wishlist');
      }
    } catch (apiError) {
      // Rollback
      set(s => ({ wishlistItems: s.wishlistItems.filter(i => i.id !== optimisticItem.id) }));
      const errorMessage = apiError instanceof Error ? apiError.message : 'Failed to add to wishlist';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  removeFromWishlist: async (productId: string): Promise<void> => {
    const itemToRemove = get().wishlistItems.find(item => item.productId === productId);
    if (!itemToRemove) throw new Error('Item not found in wishlist');

    // Optimistic update
    set(s => ({
      wishlistItems: s.wishlistItems.filter(item => item.productId !== productId),
      error: null,
    }));

    try {
      await wishlistApi.removeFromWishlist(itemToRemove.id);
    } catch (_apiError) {
      // Rollback
      set(s => ({ wishlistItems: [...s.wishlistItems, itemToRemove] }));
      set({ error: 'Failed to remove from wishlist' });
      throw new Error('Failed to remove from wishlist');
    }
  },

  clearWishlist: async (): Promise<void> => {
    try {
      set({ error: null });
      const response = await wishlistApi.getDefaultWishlist();
      if (response.data) {
        await wishlistApi.clearWishlist(response.data.id);
      }
      set({ wishlistItems: [] });
    } catch (_err) {
      set({ error: 'Failed to clear wishlist' });
      throw new Error('Failed to clear wishlist');
    }
  },

  getWishlistCount: (): number => {
    return get().wishlistItems.length;
  },

  refreshWishlist: async (): Promise<void> => {
    try {
      set({ isLoading: true, error: null });

      const response = await wishlistApi.getWishlists(1, 50);
      if (!response?.success) {
        set({ wishlistItems: [], isLoading: false });
        return;
      }

      if (!response.data?.wishlists?.length) {
        set({ wishlistItems: [], isLoading: false });
        return;
      }

      const defaultWishlist = response.data.wishlists[0];
      if (!defaultWishlist.items?.length) {
        set({ wishlistItems: [], isLoading: false });
        return;
      }

      const items: WishlistItem[] = defaultWishlist.items.map((backendItem: any) => {
        const item = backendItem.itemId || {};
        return {
          id: backendItem._id || backendItem.id || String(Math.random()),
          productId: typeof backendItem.itemId === 'string' ? backendItem.itemId : (item._id || item.id || ''),
          productName: item.name || 'Unknown Product',
          productImage: (item.images && item.images[0]) || item.image || 'https://via.placeholder.com/300',
          price: item.salePrice || item.basePrice || item.price || 0,
          originalPrice: item.basePrice || (item.salePrice ? item.salePrice * 1.2 : 0),
          discount: item.basePrice && item.salePrice
            ? Math.round(((item.basePrice - item.salePrice) / item.basePrice) * 100)
            : 0,
          rating: item.rating?.average || item.rating || 4.0,
          reviewCount: item.rating?.count || Math.floor(Math.random() * 1000) + 100,
          brand: item.brand || 'Brand',
          category: item.category?.name || backendItem.tags?.[0] || 'General',
          availability: item.inventory?.stock > 0 ? 'IN_STOCK' :
            item.inventory?.stock === 0 ? 'OUT_OF_STOCK' : 'LIMITED',
          addedAt: backendItem.addedAt || new Date().toISOString(),
        };
      });

      set({ wishlistItems: items, isLoading: false });
    } catch (_err) {
      set({ error: 'Failed to load wishlist', isLoading: false });
    }
  },
}));
