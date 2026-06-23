import { logger } from '../config/logger';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { IOrder, Order } from '../models/Order';
import { Merchant } from '../models/Merchant';
import { Store } from '../models/Store';

export interface InvoiceData {
  order: IOrder;
  merchant: {
    businessName: string;
    email: string;
    phone: string;
    address?: string;
    gstin?: string;
    pan?: string;
  };
  store: {
    name: string;
    address?: string;
    phone?: string;
  };
}

export class InvoiceService {
  private static readonly UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'invoices');
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
   * Generate invoice PDF for an order
   */
  static async generateInvoice(order: IOrder, merchantId: string): Promise<string> {
    try {
      this.ensureUploadDir();

      // Fetch merchant and store details
      const merchant = await Merchant.findById(merchantId).lean();
      if (!merchant) {
        throw new Error('Merchant not found');
      }

      // Get the first store from order items
      const storeId = order.items[0]?.store;
      const store = storeId ? await Store.findById(storeId).lean() : null;

      // Format merchant address
      const merchantAddress = merchant.businessAddress
        ? `${merchant.businessAddress.street}, ${merchant.businessAddress.city}, ${merchant.businessAddress.state} ${merchant.businessAddress.zipCode}, ${merchant.businessAddress.country}`
        : '';

      const invoiceData: InvoiceData = {
        order,
        merchant: {
          businessName: merchant.businessName || 'Your Store',
          email: merchant.email,
          phone: merchant.phone || '',
          address: merchantAddress,
          gstin: (merchant as any).gstin,
          pan: (merchant as any).pan,
        },
        store: {
          name: store?.name || merchant.businessName || 'Store',
          address: store?.location?.address,
          phone: (store as any)?.contactInfo?.phone || merchant.phone,
        },
      };

      const filename = `invoice-${order.orderNumber}-${Date.now()}.pdf`;
      const filepath = path.join(this.UPLOAD_DIR, filename);

      await this.createInvoicePDF(invoiceData, filepath);

      // Return public URL
      return `${this.PUBLIC_URL_BASE}/uploads/invoices/${filename}`;
    } catch (error) {
      logger.error('Error generating invoice:', error);
      throw new Error(`Failed to generate invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate invoice PDF and stream directly to response
   */
  static async streamInvoicePDF(res: Response, order: IOrder, merchantId: string): Promise<void> {
    try {
      // Fetch merchant and store details
      const merchant = await Merchant.findById(merchantId).lean();
      if (!merchant) {
        throw new Error('Merchant not found');
      }

      // Get the first store from order items
      const storeId = order.items[0]?.store;
      const store = storeId ? await Store.findById(storeId).lean() : null;

      // Format merchant address
      const merchantAddress = merchant.businessAddress
        ? `${merchant.businessAddress.street}, ${merchant.businessAddress.city}, ${merchant.businessAddress.state} ${merchant.businessAddress.zipCode}, ${merchant.businessAddress.country}`
        : '';

      const invoiceData: InvoiceData = {
        order,
        merchant: {
          businessName: merchant.businessName || 'Your Store',
          email: merchant.email,
          phone: merchant.phone || '',
          address: merchantAddress,
          gstin: (merchant as any).gstin,
          pan: (merchant as any).pan,
        },
        store: {
          name: store?.name || merchant.businessName || 'Store',
          address: store?.location?.address,
          phone: (store as any)?.contactInfo?.phone || merchant.phone,
        },
      };

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);

      // Create PDF and stream to response
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({ margin: 50 });
          doc.pipe(res);

          // Header
          this.addHeader(doc, invoiceData);

          // Invoice details
          this.addInvoiceDetails(doc, invoiceData.order);

          // Billing and shipping addresses
          this.addAddresses(doc, invoiceData);

          // Items table
          this.addItemsTable(doc, invoiceData.order);

          // Totals
          this.addTotals(doc, invoiceData.order);

          // Payment info
          this.addPaymentInfo(doc, invoiceData.order);

          // Footer
          this.addFooter(doc, invoiceData);

          doc.end();

          doc.on('finish', () => resolve());
          doc.on('error', (err) => reject(err));
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      logger.error('Error streaming invoice PDF:', error);
      throw new Error(`Failed to stream invoice PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create invoice PDF document
   */
  private static async createInvoicePDF(data: InvoiceData, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        this.addHeader(doc, data);

        // Invoice details
        this.addInvoiceDetails(doc, data.order);

        // Billing and shipping addresses
        this.addAddresses(doc, data);

        // Items table
        this.addItemsTable(doc, data.order);

        // Totals
        this.addTotals(doc, data.order);

        // Payment info
        this.addPaymentInfo(doc, data.order);

        // Footer
        this.addFooter(doc, data);

        doc.end();

        stream.on('finish', resolve);
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add header to PDF
   */
  private static addHeader(doc: PDFKit.PDFDocument, data: InvoiceData): void {
    const currentY = doc.y;

    // Store/Merchant name
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(data.merchant.businessName, 50, currentY);

    // INVOICE title on the right
    doc
      .fontSize(20)
      .text('INVOICE', 400, currentY, { align: 'right' });

    doc.moveDown(0.5);

    // Merchant details
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(data.merchant.address || '', 50, doc.y)
      .text(`Email: ${data.merchant.email}`, 50, doc.y)
      .text(`Phone: ${data.merchant.phone}`, 50, doc.y);

    if (data.merchant.gstin) {
      doc.text(`GSTIN: ${data.merchant.gstin}`, 50, doc.y);
    }

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);
  }

  /**
   * Add invoice details
   */
  private static addInvoiceDetails(doc: PDFKit.PDFDocument, order: IOrder): void {
    const detailsY = doc.y;

    // Left column
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Invoice Number:', 50, detailsY)
      .font('Helvetica')
      .text(order.orderNumber, 150, detailsY);

    doc
      .font('Helvetica-Bold')
      .text('Invoice Date:', 50, doc.y)
      .font('Helvetica')
      .text(new Date(order.createdAt).toLocaleDateString('en-IN'), 150, doc.y);

    doc
      .font('Helvetica-Bold')
      .text('Order Status:', 50, doc.y)
      .font('Helvetica')
      .text(order.status.toUpperCase(), 150, doc.y);

    // Right column
    if (order.payment?.transactionId) {
      doc
        .font('Helvetica-Bold')
        .text('Payment ID:', 350, detailsY)
        .font('Helvetica')
        .text(order.payment.transactionId, 450, detailsY);
    }

    doc
      .font('Helvetica-Bold')
      .text('Payment Method:', 350, detailsY + 15)
      .font('Helvetica')
      .text(order.payment?.method?.toUpperCase() || 'N/A', 450, detailsY + 15);

    doc
      .font('Helvetica-Bold')
      .text('Payment Status:', 350, detailsY + 30)
      .font('Helvetica')
      .text(order.payment?.status?.toUpperCase() || 'PENDING', 450, detailsY + 30);

    doc.moveDown(2);
  }

  /**
   * Add billing and shipping addresses
   */
  private static addAddresses(doc: PDFKit.PDFDocument, data: InvoiceData): void {
    const addressY = doc.y;

    // Billing address (left)
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('BILL TO:', 50, addressY);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(data.order.delivery.address.name, 50, doc.y)
      .text(data.order.delivery.address.phone, 50, doc.y)
      .text(data.order.delivery.address.email || '', 50, doc.y);

    // Shipping address (right)
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('SHIP TO:', 320, addressY);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(data.order.delivery.address.name, 320, addressY + 15)
      .text(data.order.delivery.address.addressLine1, 320, doc.y);

    if (data.order.delivery.address.addressLine2) {
      doc.text(data.order.delivery.address.addressLine2, 320, doc.y);
    }

    doc.text(
      `${data.order.delivery.address.city}, ${data.order.delivery.address.state} ${data.order.delivery.address.pincode}`,
      320,
      doc.y
    );
    doc.text(data.order.delivery.address.country, 320, doc.y);
    doc.text(data.order.delivery.address.phone, 320, doc.y);

    doc.moveDown(2);
  }

  /**
   * Add items table
   */
  private static addItemsTable(doc: PDFKit.PDFDocument, order: IOrder): void {
    const tableTop = doc.y;
    const itemCodeX = 50;
    const descriptionX = 150;
    const quantityX = 350;
    const priceX = 420;
    const amountX = 490;

    // Table header
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('ITEM', itemCodeX, tableTop)
      .text('DESCRIPTION', descriptionX, tableTop)
      .text('QTY', quantityX, tableTop)
      .text('PRICE', priceX, tableTop)
      .text('AMOUNT', amountX, tableTop);

    // Header line
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let position = tableTop + 25;

    // Items
    doc.font('Helvetica').fontSize(9);

    order.items.forEach((item, index) => {
      const itemName = item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name;

      doc.text(`${index + 1}`, itemCodeX, position);
      doc.text(itemName, descriptionX, position);

      if (item.variant) {
        doc.fontSize(8).text(`(${item.variant.type}: ${item.variant.value})`, descriptionX, position + 10);
        doc.fontSize(9);
      }

      doc.text(item.quantity.toString(), quantityX, position);
      doc.text(`₹${item.price.toFixed(2)}`, priceX, position);
      doc.text(`₹${item.subtotal.toFixed(2)}`, amountX, position);

      position += item.variant ? 35 : 25;

      // Add new page if needed
      if (position > 700) {
        doc.addPage();
        position = 50;
      }
    });

    // Bottom line
    doc.moveTo(50, position).lineTo(550, position).stroke();
    doc.y = position + 10;
  }

  /**
   * Add totals section
   */
  private static addTotals(doc: PDFKit.PDFDocument, order: IOrder): void {
    const totalsX = 380;
    const amountX = 490;
    let currentY = doc.y + 10;

    doc.fontSize(10).font('Helvetica');

    // Subtotal
    doc.text('Subtotal:', totalsX, currentY);
    doc.text(`₹${order.totals.subtotal.toFixed(2)}`, amountX, currentY);
    currentY += 15;

    // Discount
    if (order.totals.discount > 0) {
      doc.text('Discount:', totalsX, currentY);
      doc.text(`-₹${order.totals.discount.toFixed(2)}`, amountX, currentY);
      currentY += 15;
    }

    // Tax
    if (order.totals.tax > 0) {
      doc.text('Tax (GST):', totalsX, currentY);
      doc.text(`₹${order.totals.tax.toFixed(2)}`, amountX, currentY);
      currentY += 15;
    }

    // Delivery
    if (order.totals.delivery > 0) {
      doc.text('Delivery Charges:', totalsX, currentY);
      doc.text(`₹${order.totals.delivery.toFixed(2)}`, amountX, currentY);
      currentY += 15;
    }

    // Cashback
    if (order.totals.cashback > 0) {
      doc.text('Cashback:', totalsX, currentY);
      doc.text(`-₹${order.totals.cashback.toFixed(2)}`, amountX, currentY);
      currentY += 15;
    }

    // Total line
    doc.moveTo(totalsX, currentY).lineTo(550, currentY).stroke();
    currentY += 10;

    // Grand Total
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TOTAL:', totalsX, currentY);
    doc.text(`₹${order.totals.total.toFixed(2)}`, amountX, currentY);

    doc.moveDown(2);
  }

  /**
   * Add payment information
   */
  private static addPaymentInfo(doc: PDFKit.PDFDocument, order: IOrder): void {
    const currentY = doc.y + 10;

    doc.fontSize(10).font('Helvetica-Bold').text('Payment Information:', 50, currentY);

    doc.font('Helvetica').fontSize(9);
    doc.text(`Method: ${order.payment?.method?.toUpperCase() || 'N/A'}`, 50, doc.y);
    doc.text(`Status: ${order.payment?.status?.toUpperCase() || 'PENDING'}`, 50, doc.y);

    if (order.payment?.paidAt) {
      doc.text(`Paid On: ${new Date(order.payment.paidAt).toLocaleDateString('en-IN')}`, 50, doc.y);
    }

    if (order.payment?.transactionId) {
      doc.text(`Transaction ID: ${order.payment.transactionId}`, 50, doc.y);
    }

    doc.moveDown(1);
  }

  /**
   * Add footer
   */
  private static addFooter(doc: PDFKit.PDFDocument, data: InvoiceData): void {
    const bottomY = 750;

    doc.fontSize(8).font('Helvetica');

    // Terms and conditions
    doc.text('Terms & Conditions:', 50, bottomY);
    doc.text('1. Goods once sold will not be taken back or exchanged.', 50, doc.y);
    doc.text('2. All disputes are subject to local jurisdiction only.', 50, doc.y);

    // Thank you note
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Thank you for your business!', 50, doc.y + 20, { align: 'center' });

    // Signature
    doc
      .fontSize(8)
      .font('Helvetica')
      .text('Authorized Signatory', 400, bottomY + 60);

    doc.moveTo(400, bottomY + 55).lineTo(550, bottomY + 55).stroke();
  }

  /**
   * Generate packing slip (similar to invoice but without prices)
   */
  static async generatePackingSlip(order: IOrder, merchantId: string): Promise<string> {
    try {
      this.ensureUploadDir();

      const merchant = await Merchant.findById(merchantId).lean();
      if (!merchant) {
        throw new Error('Merchant not found');
      }

      const storeId = order.items[0]?.store;
      const store = storeId ? await Store.findById(storeId).lean() : null;

      const filename = `packing-slip-${order.orderNumber}-${Date.now()}.pdf`;
      const filepath = path.join(process.cwd(), 'uploads', 'packing-slips', filename);

      // Ensure directory exists
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      await this.createPackingSlipPDF(order, merchant, store, filepath);

      return `${this.PUBLIC_URL_BASE}/uploads/packing-slips/${filename}`;
    } catch (error) {
      logger.error('Error generating packing slip:', error);
      throw new Error(`Failed to generate packing slip: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create packing slip PDF
   */
  private static async createPackingSlipPDF(
    order: IOrder,
    merchant: any,
    store: any,
    filepath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .text('PACKING SLIP', { align: 'center' });

        doc.moveDown(1);

        // Order info
        doc.fontSize(10).font('Helvetica');
        doc.text(`Order Number: ${order.orderNumber}`, 50, doc.y);
        doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 50, doc.y);
        doc.text(`Total Items: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}`, 50, doc.y);

        doc.moveDown(1);

        // Shipping address
        doc.fontSize(11).font('Helvetica-Bold').text('SHIP TO:', 50, doc.y);
        doc.fontSize(10).font('Helvetica');
        doc.text(order.delivery.address.name, 50, doc.y);
        doc.text(order.delivery.address.addressLine1, 50, doc.y);
        if (order.delivery.address.addressLine2) {
          doc.text(order.delivery.address.addressLine2, 50, doc.y);
        }
        doc.text(
          `${order.delivery.address.city}, ${order.delivery.address.state} ${order.delivery.address.pincode}`,
          50,
          doc.y
        );
        doc.text(order.delivery.address.phone, 50, doc.y);

        doc.moveDown(2);

        // Items table
        const tableTop = doc.y;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('ITEM', 50, tableTop)
          .text('DESCRIPTION', 150, tableTop)
          .text('QUANTITY', 450, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        let position = tableTop + 25;
        doc.font('Helvetica').fontSize(9);

        order.items.forEach((item, index) => {
          doc.text(`${index + 1}`, 50, position);
          doc.text(item.name, 150, position, { width: 280 });
          if (item.variant) {
            doc.fontSize(8).text(`(${item.variant.type}: ${item.variant.value})`, 150, position + 12);
            doc.fontSize(9);
          }
          doc.text(item.quantity.toString(), 450, position);

          position += item.variant ? 35 : 25;
        });

        doc.moveTo(50, position).lineTo(550, position).stroke();

        // Special instructions
        if (order.specialInstructions) {
          doc.moveDown(2);
          doc.fontSize(10).font('Helvetica-Bold').text('Special Instructions:', 50, doc.y);
          doc.fontSize(9).font('Helvetica').text(order.specialInstructions, 50, doc.y);
        }

        // Footer
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Checked by: _______________', 50, 720);

        doc.end();

        stream.on('finish', resolve);
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate a liability statement PDF for a merchant and cycle.
   * Returns the PDF as a Buffer.
   */
  static async generateLiabilityStatement(merchantId: string, cycleId: string): Promise<Buffer> {
    const { liabilityService } = await import('./liabilityService');
    const merchant = await Merchant.findById(merchantId).lean();
    if (!merchant) throw new Error('Merchant not found');

    const statement = await liabilityService.getStatement(merchantId, { cycleId, limit: 50 });

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('MERCHANT LIABILITY STATEMENT', { align: 'center' });
        doc.moveDown(0.5);

        doc.fontSize(10).font('Helvetica');
        doc.text(`Merchant: ${merchant.businessName || 'Unknown'}`);
        doc.text(`Merchant ID: ${merchantId}`);
        if ((merchant as any).gstin) doc.text(`GSTIN: ${(merchant as any).gstin}`);
        if ((merchant as any).pan) doc.text(`PAN: ${(merchant as any).pan}`);
        doc.text(`Cycle: ${cycleId}`);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`);
        doc.moveDown(1);

        // Totals summary
        doc.fontSize(12).font('Helvetica-Bold').text('Summary');
        doc.fontSize(10).font('Helvetica');
        doc.text(`Total Issued: ${statement.totals.totalIssued.toFixed(2)} NC`);
        doc.text(`Total Redeemed: ${statement.totals.totalRedeemed.toFixed(2)} NC`);
        doc.text(`Pending Settlement: ${statement.totals.totalPending.toFixed(2)} NC`);
        doc.text(`Settled: ${statement.totals.totalSettled.toFixed(2)} NC`);
        doc.moveDown(1);

        // Separator
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        // Table header
        const tableTop = doc.y;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Campaign Type', 50, tableTop, { width: 100 });
        doc.text('Issued', 160, tableTop, { width: 70 });
        doc.text('Redeemed', 230, tableTop, { width: 70 });
        doc.text('Pending', 310, tableTop, { width: 70 });
        doc.text('Settled', 390, tableTop, { width: 70 });
        doc.text('Status', 470, tableTop, { width: 80 });

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        let position = tableTop + 25;
        doc.font('Helvetica').fontSize(8);

        for (const record of statement.records) {
          if (position > 720) {
            doc.addPage();
            position = 50;
          }

          doc.text(record.campaignType, 50, position, { width: 100 });
          doc.text(record.rewardIssued.toFixed(2), 160, position, { width: 70 });
          doc.text(record.rewardRedeemed.toFixed(2), 230, position, { width: 70 });
          doc.text(record.pendingAmount.toFixed(2), 310, position, { width: 70 });
          doc.text(record.settledAmount.toFixed(2), 390, position, { width: 70 });
          doc.text(record.status.toUpperCase(), 470, position, { width: 80 });

          position += 20;
        }

        if (statement.records.length === 0) {
          doc.text('No liability records found for this cycle.', 50, position);
        }

        // Footer
        doc.moveDown(2);
        doc.fontSize(8).font('Helvetica').fillColor('#999999');
        doc.text('This is a computer-generated document and does not require a signature.', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate a payout statement PDF with GST split for a merchant and cycle.
   * Includes: gross sales, platform fees, GST breakdown (CGST/SGST), net payout, settlement status.
   */
  static async generatePayoutStatement(merchantId: string, cycleId: string): Promise<Buffer> {
    const { liabilityService } = await import('./liabilityService');
    const merchant = await Merchant.findById(merchantId).lean();
    if (!merchant) throw new Error('Merchant not found');

    const statement = await liabilityService.getStatement(merchantId, { cycleId, limit: 100 });

    // Determine date range from cycleId for order query
    const dateRange = this.parseCycleDateRange(cycleId);

    // Fetch merchant stores for order lookup
    const stores = await Store.find({ merchantId }).select('_id').lean();
    const storeIds = stores.map((s: any) => s._id);

    // Aggregate order financials for this cycle
    let grossSales = 0;
    let totalPlatformFees = 0;
    let totalRefunds = 0;
    let totalMerchantPayout = 0;
    let orderCount = 0;

    if (storeIds.length > 0 && dateRange) {
      const orderAgg = await Order.aggregate([
        {
          $match: {
            'items.store': { $in: storeIds },
            createdAt: { $gte: dateRange.start, $lte: dateRange.end },
            status: { $in: ['delivered', 'completed', 'confirmed'] },
          },
        },
        {
          $group: {
            _id: null,
            grossSales: { $sum: '$totals.subtotal' },
            platformFees: { $sum: '$totals.platformFee' },
            refunds: { $sum: { $cond: [{ $eq: ['$payment.status', 'refunded'] }, '$totals.subtotal', 0] } },
            merchantPayout: { $sum: '$totals.merchantPayout' },
            count: { $sum: 1 },
          },
        },
      ]);

      if (orderAgg.length > 0) {
        grossSales = orderAgg[0].grossSales || 0;
        totalPlatformFees = orderAgg[0].platformFees || 0;
        totalRefunds = orderAgg[0].refunds || 0;
        totalMerchantPayout = orderAgg[0].merchantPayout || 0;
        orderCount = orderAgg[0].count || 0;
      }
    }

    // GST calculation on platform fees (18% GST = 9% CGST + 9% SGST)
    const GST_RATE = 0.18;
    const gstOnFees = totalPlatformFees * GST_RATE;
    const cgst = gstOnFees / 2;
    const sgst = gstOnFees / 2;
    const netPayable = totalMerchantPayout - gstOnFees;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        // ── HEADER ──
        doc.fontSize(20).font('Helvetica-Bold').text('PAYOUT STATEMENT', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica').fillColor('#666666').text(`Settlement Period: ${cycleId}`, { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(1);

        // Merchant details
        doc.fontSize(11).font('Helvetica-Bold').text('Merchant Details');
        doc.fontSize(10).font('Helvetica');
        doc.text(`Business Name: ${merchant.businessName || 'N/A'}`);
        if ((merchant as any).gstin) doc.text(`GSTIN: ${(merchant as any).gstin}`);
        if ((merchant as any).pan) doc.text(`PAN: ${(merchant as any).pan}`);
        doc.text(`Settlement Cycle: ${cycleId}`);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`);
        doc.moveDown(1);

        // ── PAYOUT SUMMARY ──
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica-Bold').text('Payout Summary');
        doc.moveDown(0.3);

        const summaryData = [
          ['Gross Sales', `${grossSales.toFixed(2)}`],
          ['Total Orders', `${orderCount}`],
          ['Platform Commission (15%)', `(${totalPlatformFees.toFixed(2)})`],
          ['Refunds', `(${totalRefunds.toFixed(2)})`],
          ['Merchant Payout (before tax)', `${totalMerchantPayout.toFixed(2)}`],
        ];

        doc.fontSize(10).font('Helvetica');
        for (const [label, value] of summaryData) {
          doc.text(label, 50, doc.y, { continued: true, width: 300 });
          doc.text(value, { align: 'right' });
        }
        doc.moveDown(1);

        // ── GST BREAKDOWN ──
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica-Bold').text('GST Breakdown (on Platform Commission)');
        doc.moveDown(0.3);

        doc.fontSize(10).font('Helvetica');
        doc.text(`Taxable Amount (Commission)`, 50, doc.y, { continued: true, width: 300 });
        doc.text(`${totalPlatformFees.toFixed(2)}`, { align: 'right' });

        doc.text(`CGST @ 9%`, 50, doc.y, { continued: true, width: 300 });
        doc.text(`${cgst.toFixed(2)}`, { align: 'right' });

        doc.text(`SGST @ 9%`, 50, doc.y, { continued: true, width: 300 });
        doc.text(`${sgst.toFixed(2)}`, { align: 'right' });

        doc.font('Helvetica-Bold');
        doc.text(`Total GST`, 50, doc.y, { continued: true, width: 300 });
        doc.text(`${gstOnFees.toFixed(2)}`, { align: 'right' });
        doc.moveDown(0.5);

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.3);
        doc.fontSize(13).font('Helvetica-Bold');
        doc.text(`Net Payable`, 50, doc.y, { continued: true, width: 300 });
        doc.text(`${netPayable.toFixed(2)}`, { align: 'right' });
        doc.moveDown(1.5);

        // ── SETTLEMENT STATUS ──
        doc.fontSize(12).font('Helvetica-Bold').text('Settlement Records');
        doc.moveDown(0.3);

        doc.fontSize(10).font('Helvetica');
        doc.text(`Total Issued: ${statement.totals.totalIssued.toFixed(2)} NC`);
        doc.text(`Total Settled: ${statement.totals.totalSettled.toFixed(2)} NC`);
        doc.text(`Pending: ${statement.totals.totalPending.toFixed(2)} NC`);
        doc.moveDown(0.5);

        // Table
        if (statement.records.length > 0) {
          const tblTop = doc.y;
          doc.fontSize(8).font('Helvetica-Bold');
          doc.text('Type', 50, tblTop, { width: 90 });
          doc.text('Issued', 145, tblTop, { width: 60 });
          doc.text('Redeemed', 210, tblTop, { width: 60 });
          doc.text('Pending', 275, tblTop, { width: 60 });
          doc.text('Settled', 340, tblTop, { width: 60 });
          doc.text('Status', 405, tblTop, { width: 65 });
          doc.text('Settled On', 475, tblTop, { width: 75 });

          doc.moveTo(50, tblTop + 12).lineTo(550, tblTop + 12).stroke();
          let pos = tblTop + 18;
          doc.font('Helvetica').fontSize(7);

          for (const r of statement.records) {
            if (pos > 720) { doc.addPage(); pos = 50; }
            doc.text(r.campaignType, 50, pos, { width: 90 });
            doc.text(r.rewardIssued.toFixed(2), 145, pos, { width: 60 });
            doc.text(r.rewardRedeemed.toFixed(2), 210, pos, { width: 60 });
            doc.text(r.pendingAmount.toFixed(2), 275, pos, { width: 60 });
            doc.text(r.settledAmount.toFixed(2), 340, pos, { width: 60 });
            doc.text(r.status.toUpperCase(), 405, pos, { width: 65 });
            doc.text(r.settlementDate ? new Date(r.settlementDate).toLocaleDateString('en-IN') : '-', 475, pos, { width: 75 });
            pos += 16;
          }
        } else {
          doc.text('No settlement records for this cycle.', 50, doc.y);
        }

        // ── FOOTER ──
        doc.moveDown(2);
        doc.fontSize(8).font('Helvetica').fillColor('#999999');
        doc.text('This is a computer-generated document and does not require a signature.', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Parse a cycleId into a date range for querying orders.
   */
  private static parseCycleDateRange(cycleId: string): { start: Date; end: Date } | null {
    try {
      // Monthly: "2026-03"
      if (/^\d{4}-\d{2}$/.test(cycleId)) {
        const [year, month] = cycleId.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        return { start, end };
      }
      // Weekly: "2026-W11"
      if (/^\d{4}-W\d{2}$/.test(cycleId)) {
        const [yearStr, weekStr] = cycleId.split('-W');
        const year = parseInt(yearStr, 10);
        const week = parseInt(weekStr, 10);
        const jan1 = new Date(year, 0, 1);
        const dayOffset = (week - 1) * 7 - jan1.getDay() + 1;
        const start = new Date(year, 0, 1 + dayOffset);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      // Daily: "2026-03-16"
      if (/^\d{4}-\d{2}-\d{2}$/.test(cycleId)) {
        const start = new Date(cycleId + 'T00:00:00.000Z');
        const end = new Date(cycleId + 'T23:59:59.999Z');
        return { start, end };
      }
      return null;
    } catch {
      return null;
    }
  }
}

export default InvoiceService;
