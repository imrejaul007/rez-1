// @ts-nocheck
/**
 * Offer entity types
 * Includes IOffer with OfferType and DiscountType enums
 */
import { OfferType, DiscountType } from '../enums/index';
export interface IOfferConditions {
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  applicableCategories?: string[];
  applicableProducts?: string[];
  excludedProducts?: string[];
}
export interface IOffer {
  _id?: string;
  title: string;
  description?: string;
  type: OfferType;
  discountType: DiscountType;
  discountValue: number;
  conditions?: IOfferConditions;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  usageCount?: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
//# sourceMappingURL=offer.d.ts.map
