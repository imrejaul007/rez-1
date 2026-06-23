// @ts-nocheck
/**
 * Merchant entity types
 * Includes IMerchant and IMerchantProfile
 */
export interface IMerchantLocation {
  address: string;
  city: string;
  state: string;
  pincode: string;
  coordinates?: [number, number];
}
export interface IMerchantProfile {
  storeName: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  website?: string;
  category?: string;
  subcategory?: string;
  location: IMerchantLocation;
  operatingHours?: {
    open: string;
    close: string;
  };
  contactPerson?: string;
  phone: string;
  email: string;
}
export interface IMerchant {
  _id?: string;
  userId: string;
  profile: IMerchantProfile;
  isVerified: boolean;
  isActive: boolean;
  verificationDocuments?: {
    businessRegistration?: string;
    gst?: string;
    panCard?: string;
  };
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
  };
  rating?: number;
  totalOrders?: number;
  totalRevenue?: number;
  createdAt: Date;
  updatedAt: Date;
}
//# sourceMappingURL=merchant.d.ts.map
