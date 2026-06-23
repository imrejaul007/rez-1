import { logger } from '../config/logger';
/**
 * QR Code Service for Store Payment System
 *
 * Handles generation and management of store QR codes for the ReZ payment system.
 *
 * NOTE: Requires 'qrcode' package to be installed:
 * npm install qrcode @types/qrcode
 */

// Declare qrcode module if types are not available
declare module 'qrcode' {
  export function toDataURL(text: string, options?: any): Promise<string>;
  export function toFile(path: string, text: string, options?: any): Promise<void>;
  export function toString(text: string, options?: any): Promise<string>;
}

import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { Store } from '../models/Store';
import { CloudinaryService } from './CloudinaryService';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// QR Code data structure embedded in the QR
export interface QRCodeData {
  type: 'REZ_STORE_PAYMENT';
  version: string;
  storeId: string;
  storeName: string;
  merchantId?: string;
  code: string;              // Unique QR code identifier
  timestamp: number;
}

// Result of QR code generation
export interface QRGenerationResult {
  success: boolean;
  code: string;              // Unique QR code: REZ-STORE-{shortId}
  qrImageUrl: string;        // Cloudinary URL of the QR image
  qrDataUrl?: string;        // Base64 data URL (optional)
  generatedAt: Date;
}

// Store data returned from QR lookup
export interface QRLookupResult {
  success: boolean;
  store?: {
    _id: string;
    name: string;
    slug: string;
    logo?: string;
    category: any;
    location: any;
    paymentSettings: any;
    rewardRules: any;
    ratings: any;
    isActive: boolean;
  };
  error?: string;
}

export class QRCodeService {
  private static QR_VERSION = '1.0';
  private static QR_PREFIX = 'REZ-STORE-';

  /**
   * Generate a unique store QR code
   */
  static generateUniqueCode(storeId: string): string {
    // Create a short unique identifier
    const shortId = uuidv4().split('-')[0].toUpperCase();
    return `${this.QR_PREFIX}${shortId}`;
  }

  /**
   * Create QR code data payload
   */
  static createQRPayload(store: any): QRCodeData {
    return {
      type: 'REZ_STORE_PAYMENT',
      version: this.QR_VERSION,
      storeId: store._id.toString(),
      storeName: store.name,
      merchantId: store.merchantId?.toString(),
      code: store.storeQR?.code || this.generateUniqueCode(store._id.toString()),
      timestamp: Date.now(),
    };
  }

  /**
   * Generate QR code image and upload to Cloudinary
   */
  static async generateStoreQR(storeId: string): Promise<QRGenerationResult> {
    try {
      // Find the store
      const store = await Store.findById(storeId).lean();
      if (!store) {
        throw new Error('Store not found');
      }

      // Generate unique code if not exists
      const qrCode = store.storeQR?.code || this.generateUniqueCode(storeId);

      // Create QR payload - we encode the unique code
      // The app will use this code to lookup store details via API
      const qrPayload = JSON.stringify({
        type: 'REZ_STORE_PAYMENT',
        code: qrCode,
        v: this.QR_VERSION,
      });

      // Generate QR code as PNG buffer
      const qrBuffer = await QRCode.toBuffer(qrPayload, {
        type: 'png',
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H', // High error correction for better scanning
      });

      // Save to temp file for Cloudinary upload
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `qr-${qrCode}.png`);
      fs.writeFileSync(tempFilePath, qrBuffer);

      // Upload to Cloudinary
      let qrImageUrl: string;
      try {
        const uploadResult = await CloudinaryService.uploadFile(tempFilePath, {
          folder: `stores/${storeId}/qr`,
          quality: 'auto',
        });
        qrImageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        // If Cloudinary fails, generate a data URL as fallback
        logger.warn('Cloudinary upload failed, using data URL fallback:', uploadError);
        qrImageUrl = await QRCode.toDataURL(qrPayload, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: 'H',
        });
      }

      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      const generatedAt = new Date();

      // Update store with QR code info
      await Store.findByIdAndUpdate(storeId, {
        storeQR: {
          code: qrCode,
          qrImageUrl,
          generatedAt,
          isActive: true,
        },
      });

      logger.info(`✅ Generated QR code for store ${store.name}: ${qrCode}`);

      return {
        success: true,
        code: qrCode,
        qrImageUrl,
        generatedAt,
      };
    } catch (error: any) {
      logger.error('❌ QR code generation error:', error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Regenerate QR code for a store (invalidates old QR)
   */
  static async regenerateStoreQR(storeId: string): Promise<QRGenerationResult> {
    try {
      // Force new code generation by removing existing
      await Store.findByIdAndUpdate(storeId, {
        $unset: { 'storeQR.code': 1 },
      });

      return await this.generateStoreQR(storeId);
    } catch (error: any) {
      logger.error('❌ QR code regeneration error:', error);
      throw new Error(`Failed to regenerate QR code: ${error.message}`);
    }
  }

  /**
   * Lookup store by QR code
   */
  static async lookupStoreByQR(qrCode: string): Promise<QRLookupResult> {
    try {
      // Parse QR code if it's JSON (from scanned QR)
      let code = qrCode;
      try {
        const parsed = JSON.parse(qrCode);
        if (parsed.type === 'REZ_STORE_PAYMENT' && parsed.code) {
          code = parsed.code;
        }
      } catch {
        // Not JSON, use as-is (direct code input)
      }

      // Find store by QR code
      const store = await Store.findOne({
        'storeQR.code': code,
        'storeQR.isActive': true,
        isActive: true,
      })
        .select('name slug logo category location paymentSettings rewardRules ratings isActive merchantId')
        .populate('category', 'name slug icon').lean();

      if (!store) {
        return {
          success: false,
          error: 'Store not found or QR code is inactive',
        };
      }

      return {
        success: true,
        store: {
          _id: (store._id as any).toString(),
          name: store.name,
          slug: store.slug,
          logo: store.logo,
          category: store.category,
          location: store.location,
          paymentSettings: store.paymentSettings || {
            acceptUPI: true,
            acceptCards: true,
            acceptRezCoins: true,
            acceptPromoCoins: true,
            acceptPayBill: true,
            maxCoinRedemptionPercent: 100,
            allowHybridPayment: true,
            allowOffers: true,
            allowCashback: true,
          },
          rewardRules: store.rewardRules || {
            baseCashbackPercent: 5,
            reviewBonusCoins: 5,
            socialShareBonusCoins: 10,
            minimumAmountForReward: 100,
          },
          ratings: store.ratings,
          isActive: store.isActive,
        },
      };
    } catch (error: any) {
      logger.error('❌ QR lookup error:', error);
      return {
        success: false,
        error: `Failed to lookup store: ${error.message}`,
      };
    }
  }

  /**
   * Validate QR code format
   */
  static isValidQRCode(qrCode: string): boolean {
    // Check if it's a valid REZ QR code
    if (qrCode.startsWith(this.QR_PREFIX)) {
      return true;
    }

    // Check if it's JSON format
    try {
      const parsed = JSON.parse(qrCode);
      return parsed.type === 'REZ_STORE_PAYMENT' && !!parsed.code;
    } catch {
      return false;
    }
  }

  /**
   * Deactivate store QR code
   */
  static async deactivateQR(storeId: string): Promise<boolean> {
    try {
      await Store.findByIdAndUpdate(storeId, {
        'storeQR.isActive': false,
      });
      logger.info(`🔒 Deactivated QR code for store: ${storeId}`);
      return true;
    } catch (error: any) {
      logger.error('❌ QR deactivation error:', error);
      return false;
    }
  }

  /**
   * Activate store QR code
   */
  static async activateQR(storeId: string): Promise<boolean> {
    try {
      const store = await Store.findById(storeId).lean();

      // If no QR exists, generate one
      if (!store?.storeQR?.code) {
        await this.generateStoreQR(storeId);
      } else {
        await Store.findByIdAndUpdate(storeId, {
          'storeQR.isActive': true,
        });
      }

      logger.info(`✅ Activated QR code for store: ${storeId}`);
      return true;
    } catch (error: any) {
      logger.error('❌ QR activation error:', error);
      return false;
    }
  }

  /**
   * Get QR code details for a store
   */
  static async getStoreQRDetails(storeId: string): Promise<{
    hasQR: boolean;
    code?: string;
    qrImageUrl?: string;
    isActive?: boolean;
    generatedAt?: Date;
  }> {
    try {
      const store = await Store.findById(storeId).select('storeQR').lean();

      if (!store?.storeQR?.code) {
        return { hasQR: false };
      }

      return {
        hasQR: true,
        code: store.storeQR.code,
        qrImageUrl: store.storeQR.qrImageUrl,
        isActive: store.storeQR.isActive,
        generatedAt: store.storeQR.generatedAt,
      };
    } catch (error: any) {
      logger.error('❌ Error getting QR details:', error);
      return { hasQR: false };
    }
  }

  /**
   * Generate QR code as data URL (for immediate display without upload)
   */
  static async generateQRDataUrl(data: string): Promise<string> {
    return QRCode.toDataURL(data, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'H',
    });
  }

  /**
   * Generate QR code image as base64 data URL (branded colors)
   * Used for per-table QR codes
   */
  static async generateQRImage(data: string): Promise<string> {
    return QRCode.toDataURL(data, {
      width: 400,
      margin: 2,
      color: { dark: '#1a3a52', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });
  }
}

export default QRCodeService;
