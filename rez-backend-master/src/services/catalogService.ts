import { CatalogItem } from '../models/CatalogItem';

export interface CatalogItemResponse {
  id: string;
  type: 'product' | 'service';
  name: string;
  description: string;
  basePrice: number;
  formattedPrice: string; // "₹499"
  currency: string;
  images: string[];
  tags: string[];
  isAvailable: boolean;
  // retail-specific
  variants?: any[];
  stock?: number;
  mrp?: number;
  formattedMrp?: string;
  savings?: number;
  bulkPricing?: any[];
  // service-specific
  durationMinutes?: number;
  staff?: any[];
  bookingRequiresDeposit?: boolean;
  depositAmount?: number;
}

export async function getCatalogItems(storeSlug: string): Promise<CatalogItemResponse[]> {
  const items = await CatalogItem.find({ storeSlug, isAvailable: true }).lean();
  return items.map((item) => {
    const base: CatalogItemResponse = {
      id: String(item._id),
      type: item.type,
      name: item.name,
      description: item.description || '',
      basePrice: item.basePrice,
      formattedPrice: `₹${(item.basePrice / 100).toFixed(0)}`,
      currency: item.currency,
      images: item.images,
      tags: item.tags,
      isAvailable: item.isAvailable,
    };

    if (item.type === 'product') {
      return {
        ...base,
        variants: item.variants,
        stock: item.stock,
        mrp: item.mrp,
        formattedMrp: item.mrp ? `₹${(item.mrp / 100).toFixed(0)}` : undefined,
        savings: item.mrp && item.mrp > item.basePrice ? item.mrp - item.basePrice : undefined,
        bulkPricing: item.bulkPricing,
      };
    }

    if (item.type === 'service') {
      return {
        ...base,
        durationMinutes: item.durationMinutes,
        staff: item.staff,
        bookingRequiresDeposit: item.bookingRequiresDeposit,
        depositAmount: item.depositAmount,
      };
    }

    return base;
  });
}
