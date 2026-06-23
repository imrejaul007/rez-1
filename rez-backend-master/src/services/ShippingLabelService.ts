import { logger } from '../config/logger';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import bwipjs from 'bwip-js';
import { IOrder } from '../models/Order';
import { Merchant } from '../models/Merchant';
import { Store } from '../models/Store';

export class ShippingLabelService {
  private static readonly UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'labels');
  private static readonly PUBLIC_URL_BASE = process.env.PUBLIC_URL || 'http://localhost:5000';

  /**
   * Ensure upload directory exists
   */
  private static ensureUploadDir(): void {
    if (!fs.existsSync(this.UPLOAD_DIR)) {
      fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
    }
  }

  /**
   * Generate barcode as PNG buffer
   */
  private static async generateBarcode(text: string): Promise<Buffer> {
    try {
      const png = await bwipjs.toBuffer({
        bcid: 'code128',
        text: text,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      });
      return png;
    } catch (error) {
      logger.error('Error generating barcode:', error);
      // Return empty buffer if barcode generation fails
      return Buffer.from('');
    }
  }

  /**
   * Generate shipping label PDF
   */
  static async generateShippingLabel(order: IOrder, merchantId: string): Promise<string> {
    try {
      this.ensureUploadDir();

      // Fetch merchant and store details
      const merchant = await Merchant.findById(merchantId).lean();
      if (!merchant) {
        throw new Error('Merchant not found');
      }

      const storeId = order.items[0]?.store;
      const store = storeId ? await Store.findById(storeId).lean() : null;

      const filename = `shipping-label-${order.orderNumber}-${Date.now()}.pdf`;
      const filepath = path.join(this.UPLOAD_DIR, filename);

      await this.createShippingLabelPDF(order, merchant, store, filepath);

      return `${this.PUBLIC_URL_BASE}/uploads/labels/${filename}`;
    } catch (error) {
      logger.error('Error generating shipping label:', error);
      throw new Error(
        `Failed to generate shipping label: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create shipping label PDF
   */
  private static async createShippingLabelPDF(
    order: IOrder,
    merchant: any,
    store: any,
    filepath: string
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Generate barcode
        const barcodeBuffer = await this.generateBarcode(order.orderNumber);

        const doc = new PDFDocument({
          size: [4 * 72, 6 * 72], // 4x6 inches shipping label
          margin: 20,
        });

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header with merchant/store info
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('FROM:', 20, 20);

        doc.fontSize(10).font('Helvetica');
        doc.text(store?.name || merchant.businessName || 'Store', 20, doc.y);

        if (store?.location?.address || merchant.businessAddress) {
          const address = store?.location?.address || merchant.businessAddress;
          doc.text(address, 20, doc.y, { width: 240 });
        }

        if ((store as any)?.contactInfo?.phone || merchant.phone) {
          doc.text(`Phone: ${(store as any)?.contactInfo?.phone || merchant.phone}`, 20, doc.y);
        }

        // Divider
        doc.moveTo(20, doc.y + 10).lineTo(268, doc.y + 10).stroke();

        const dividerY = doc.y + 15;

        // Shipping address
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('TO:', 20, dividerY);

        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(order.delivery.address.name, 20, doc.y);

        doc.fontSize(10).font('Helvetica');
        doc.text(order.delivery.address.addressLine1, 20, doc.y, { width: 240 });

        if (order.delivery.address.addressLine2) {
          doc.text(order.delivery.address.addressLine2, 20, doc.y, { width: 240 });
        }

        if (order.delivery.address.landmark) {
          doc.text(`Landmark: ${order.delivery.address.landmark}`, 20, doc.y, { width: 240 });
        }

        doc.fontSize(11).font('Helvetica-Bold');
        doc.text(
          `${order.delivery.address.city}, ${order.delivery.address.state} - ${order.delivery.address.pincode}`,
          20,
          doc.y
        );

        doc.fontSize(10).font('Helvetica');
        doc.text(`Phone: ${order.delivery.address.phone}`, 20, doc.y);

        if (order.delivery.address.email) {
          doc.text(`Email: ${order.delivery.address.email}`, 20, doc.y);
        }

        // Divider
        const beforeBarcodeY = doc.y + 10;
        doc.moveTo(20, beforeBarcodeY).lineTo(268, beforeBarcodeY).stroke();

        // Order details
        const orderDetailsY = beforeBarcodeY + 15;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Order Number:', 20, orderDetailsY);
        doc.fontSize(12).font('Helvetica');
        doc.text(order.orderNumber, 20, doc.y);

        doc.fontSize(9).font('Helvetica');
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 20, doc.y);
        doc.text(
          `Items: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}`,
          20,
          doc.y
        );

        if (order.payment?.method === 'cod') {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('red')
            .text(`COD: ₹${order.totals.total.toFixed(2)}`, 20, doc.y);
          doc.fillColor('black');
        } else {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('PREPAID', 20, doc.y);
        }

        // Add barcode if generated successfully
        if (barcodeBuffer.length > 0) {
          const barcodeY = doc.y + 10;
          doc.image(barcodeBuffer, 50, barcodeY, {
            width: 180,
            align: 'center',
          });
        }

        // Delivery instructions if any
        if (order.delivery.instructions) {
          doc.moveDown(3);
          doc.fontSize(8).font('Helvetica-Bold');
          doc.text('Delivery Instructions:', 20, doc.y);
          doc.fontSize(8).font('Helvetica');
          doc.text(order.delivery.instructions, 20, doc.y, { width: 240 });
        }

        // Tracking ID if available
        if (order.delivery.trackingId) {
          doc.fontSize(8).font('Helvetica');
          doc.text(`Tracking: ${order.delivery.trackingId}`, 20, 410, { align: 'center' });
        }

        doc.end();

        stream.on('finish', resolve);
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate multiple shipping labels at once
   */
  static async generateBulkShippingLabels(
    orders: IOrder[],
    merchantId: string
  ): Promise<string[]> {
    const labels: string[] = [];

    for (const order of orders) {
      try {
        const labelUrl = await this.generateShippingLabel(order, merchantId);
        labels.push(labelUrl);
      } catch (error) {
        logger.error(`Failed to generate label for order ${order.orderNumber}:`, error);
        labels.push(''); // Add empty string for failed labels
      }
    }

    return labels;
  }

  /**
   * Generate combined shipping label PDF with multiple orders
   */
  static async generateCombinedShippingLabels(
    orders: IOrder[],
    merchantId: string
  ): Promise<string> {
    try {
      this.ensureUploadDir();

      const merchant = await Merchant.findById(merchantId).lean();
      if (!merchant) {
        throw new Error('Merchant not found');
      }

      const filename = `shipping-labels-batch-${Date.now()}.pdf`;
      const filepath = path.join(this.UPLOAD_DIR, filename);

      return new Promise(async (resolve, reject) => {
        try {
          const doc = new PDFDocument({
            size: [4 * 72, 6 * 72],
            margin: 20,
            autoFirstPage: false,
          });

          const stream = fs.createWriteStream(filepath);
          doc.pipe(stream);

          for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            const storeId = order.items[0]?.store;
            const store = storeId ? await Store.findById(storeId).lean() : null;

            // Add new page for each label
            doc.addPage();

            // Generate barcode
            const barcodeBuffer = await this.generateBarcode(order.orderNumber);

            // FROM section
            doc
              .fontSize(14)
              .font('Helvetica-Bold')
              .text('FROM:', 20, 20);

            doc.fontSize(10).font('Helvetica');
            doc.text(store?.name || merchant.businessName || 'Store', 20, doc.y);

            if (store?.location?.address || merchant.businessAddress) {
              const address = store?.location?.address ||
                (typeof merchant.businessAddress === 'string'
                  ? merchant.businessAddress
                  : `${merchant.businessAddress?.street || ''}, ${merchant.businessAddress?.city || ''}, ${merchant.businessAddress?.state || ''} ${merchant.businessAddress?.zipCode || ''}`);
              doc.text(address, 20, doc.y, {
                width: 240,
              });
            }

            if ((store as any)?.contactInfo?.phone || merchant.phone) {
              doc.text(`Phone: ${(store as any)?.contactInfo?.phone || merchant.phone}`, 20, doc.y);
            }

            doc.moveTo(20, doc.y + 10).lineTo(268, doc.y + 10).stroke();

            // TO section
            doc
              .fontSize(14)
              .font('Helvetica-Bold')
              .text('TO:', 20, doc.y + 15);

            doc.fontSize(12).font('Helvetica-Bold');
            doc.text(order.delivery.address.name, 20, doc.y);

            doc.fontSize(10).font('Helvetica');
            doc.text(order.delivery.address.addressLine1, 20, doc.y, { width: 240 });

            if (order.delivery.address.addressLine2) {
              doc.text(order.delivery.address.addressLine2, 20, doc.y, { width: 240 });
            }

            doc.fontSize(11).font('Helvetica-Bold');
            doc.text(
              `${order.delivery.address.city}, ${order.delivery.address.state} - ${order.delivery.address.pincode}`,
              20,
              doc.y
            );

            doc.fontSize(10).font('Helvetica');
            doc.text(`Phone: ${order.delivery.address.phone}`, 20, doc.y);

            const beforeBarcodeY = doc.y + 10;
            doc.moveTo(20, beforeBarcodeY).lineTo(268, beforeBarcodeY).stroke();

            // Order details
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Order Number:', 20, doc.y + 15);
            doc.fontSize(12).font('Helvetica');
            doc.text(order.orderNumber, 20, doc.y);

            if (order.payment?.method === 'cod') {
              doc
                .fontSize(11)
                .font('Helvetica-Bold')
                .fillColor('red')
                .text(`COD: ₹${order.totals.total.toFixed(2)}`, 20, doc.y + 5);
              doc.fillColor('black');
            }

            // Barcode
            if (barcodeBuffer.length > 0) {
              doc.image(barcodeBuffer, 50, doc.y + 10, {
                width: 180,
                align: 'center',
              });
            }
          }

          doc.end();

          stream.on('finish', () => {
            const publicUrl = `${this.PUBLIC_URL_BASE}/uploads/labels/${filename}`;
            resolve(publicUrl);
          });

          stream.on('error', reject);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      logger.error('Error generating combined shipping labels:', error);
      throw new Error(
        `Failed to generate combined shipping labels: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export default ShippingLabelService;
