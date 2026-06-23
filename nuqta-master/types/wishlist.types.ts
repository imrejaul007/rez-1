// Wishlist Types
// Type definitions for wishlist functionality

export interface WishlistItemData {
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

export interface WishlistItemProps {
  item: WishlistItemData;
  onRemove: (productId: string) => void;
  onPress: (productId: string) => void;
  onAddToCart: (item: WishlistItemData) => void;
}

export interface WishlistEmptyProps {
  onShopPress: () => void;
}

export interface WishlistStats {
  totalItems: number;
  totalValue: number;
  availableItems: number;
  outOfStockItems: number;
}