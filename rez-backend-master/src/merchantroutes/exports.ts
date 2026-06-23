import * as crypto from 'crypto';
/**
 * Merchant Export Routes
 *
 * API endpoints for exporting merchant transaction data in various formats:
 * - Tally XML (for accounting software integration)
 * - CSV (for spreadsheet analysis)
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { Store } from '../models/Store';
import { Order } from '../models/Order';
import { logger } from '../config/logger';
import PDFDocument from 'pdfkit';

// ─── In-memory document cache (10-minute TTL, max 500 docs) ──────────────────
// Production replacement: swap this for S3 or MongoDB GridFS.
interface CachedDoc {
  buffer: Buffer;
  name: string;
  type: string;
  createdAt: number;
}
const _docCache = new Map<string, CachedDoc>();
const DOC_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHED_DOCS = 500;
setInterval(() => {
  const now = Date.now();
  for (const [id, doc] of _docCache) {
    if (now - doc.createdAt > DOC_TTL_MS) _docCache.delete(id);
  }
}, 60_000);

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Helper function to get store ID from merchant
 * Accepts optional storeId from query params for multi-store merchants
 */
async function getStoreId(req: Request, res: Response): Promise<string | null> {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return null;
    }

    // Check if storeId is provided in query params
    const requestedStoreId = req.query.storeId as string | undefined;

    if (requestedStoreId) {
      // Verify the merchant owns this store
      const store = await Store.findOne({
        _id: requestedStoreId,
        merchantId,
      }).lean();

      if (!store) {
        res.status(403).json({
          success: false,
          message: 'Store not found or you do not have access to this store',
        });
        return null;
      }

      return store._id.toString();
    }

    // Fall back to finding first store owned by this merchant
    const store = await Store.findOne({ merchantId }).lean();
    if (!store) {
      res.status(404).json({ success: false, message: 'Store not found for merchant' });
      return null;
    }

    return store._id.toString();
  } catch (error) {
    logger.error('Error getting store ID:', error);
    res.status(500).json({ success: false, message: 'Failed to get store information' });
    return null;
  }
}

/**
 * Parse month query parameter (YYYY-MM format)
 */
function parseMonth(monthStr?: string): { startDate: Date; endDate: Date } {
  let startDate: Date;
  let endDate: Date;

  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [year, month] = monthStr.split('-').map(Number);
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0, 23, 59, 59, 999);
  } else {
    // Default to current month
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { startDate, endDate };
}

/**
 * @route   GET /merchant/documents/export/tally
 * @desc    Export transactions in Tally XML format
 * @query   storeId - Optional store ID (required for multi-store merchants)
 * @query   month - Month in YYYY-MM format (default: current month)
 * @access  Merchant (authenticated)
 */
router.get('/tally', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { startDate, endDate } = parseMonth(req.query.month as string | undefined);

    // Import Order and Store models
    const { Order } = require('../models/Order');
    const StoreModel = await Store.findById(storeId).select('name').lean();

    if (!StoreModel) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    // Query orders for the month
    const orders = await Order.find({
      storeId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['completed', 'delivered'] },
    })
      .select('_id createdAt total paymentMethod')
      .limit(10000)
      .lean();

    // Generate Tally XML
    const dateStr = startDate.toISOString().split('T')[0].replace(/-/g, '');
    const monthStr = startDate.toISOString().substring(0, 7);

    let tallyXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
`;

    // Add voucher entry for each order
    for (const order of orders) {
      const voucherId = order._id.toString().substring(0, 16).toUpperCase();
      const voucherDate = new Date(order.createdAt).toISOString().substring(0, 10).replace(/-/g, '');
      const amount = Math.round(order.total * 100) / 100;

      tallyXml += `        <TALLYMESSAGE>
          <VOUCHER VCHTYPE="Sales">
            <DATE>${voucherDate}</DATE>
            <REFERENCEDATE>${voucherDate}</REFERENCEDATE>
            <VOUCHERID>${voucherId}</VOUCHERID>
            <AMOUNT>${amount}</AMOUNT>
            <NARRATION>${StoreModel.name} - POS Sale</NARRATION>
            <VOUCHERTYPE>Sales</VOUCHERTYPE>
            <PARTYLEDGERNAME>Cash</PARTYLEDGERNAME>
          </VOUCHER>
        </TALLYMESSAGE>
`;
    }

    tallyXml += `      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
`;

    // Set response headers for XML file download
    const filename = `tally-export-${monthStr}.xml`;
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(tallyXml);
  } catch (error) {
    logger.error('Error exporting Tally XML:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export Tally XML',
      ...(process.env.NODE_ENV === 'development' && {
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    });
  }
});

/**
 * @route   GET /merchant/documents/export/csv
 * @desc    Export transactions in CSV format
 * @query   storeId - Optional store ID (required for multi-store merchants)
 * @query   month - Month in YYYY-MM format (default: current month)
 * @access  Merchant (authenticated)
 */
/**
 * @route   GET /merchant/documents/export/csv
 * @desc    Export sales/orders in CSV format
 * @query   storeId - Optional store ID (required for multi-store merchants)
 * @query   startDate - Start date in YYYY-MM-DD format
 * @query   endDate - End date in YYYY-MM-DD format
 * @access  Merchant (authenticated)
 */
router.get('/csv', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const startDate = new Date((req.query.startDate as string) || '');
    const endDate = new Date((req.query.endDate as string) || '');

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    // Import Order model
    const { Order } = require('../models/Order');

    // Query orders for the date range
    const orders = await Order.find({
      storeId,
      createdAt: { $gte: startDate, $lte: new Date(endDate.getTime() + 86400000) },
      status: { $in: ['completed', 'delivered'] },
    })
      .select('_id createdAt total paymentMethod customerPhone orderType items subtotal taxes')
      .limit(10000)
      .lean();

    // Generate CSV
    const csvHeaders = ['OrderNumber', 'Date', 'Items', 'Subtotal', 'Taxes', 'Total', 'Status', 'Channel'];
    const csvLines: string[] = [csvHeaders.join(',')];

    for (const order of orders) {
      const date = new Date(order.createdAt).toISOString().substring(0, 10);
      const orderNumber = order._id.toString().substring(0, 8).toUpperCase();
      const itemCount = (order.items as any[])?.length || 0;
      const subtotal = Math.round(((order.subtotal as number) || 0) * 100) / 100;
      const taxes = Math.round(((order.taxes as number) || 0) * 100) / 100;
      const total = Math.round(((order.total as number) || 0) * 100) / 100;
      const status = 'completed';
      const channel = order.orderType || 'online';

      const csvLine = [orderNumber, date, itemCount, subtotal, taxes, total, status, channel]
        .map((field) => {
          const str = String(field || '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',');

      csvLines.push(csvLine);
    }

    const csvContent = csvLines.join('\n');

    // Set response headers for CSV file download
    const filename = `rez-sales-${new Date().toISOString().substring(0, 7)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    logger.error('Error exporting CSV:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export CSV',
      ...(process.env.NODE_ENV === 'development' && {
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    });
  }
});

/**
 * @route   GET /merchant/documents/export/gst
 * @desc    Export GST summary by category
 * @query   storeId - Optional store ID
 * @query   startDate - Start date in YYYY-MM-DD format
 * @query   endDate - End date in YYYY-MM-DD format
 * @access  Merchant (authenticated)
 */
router.get('/gst', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const startDate = new Date((req.query.startDate as string) || '');
    const endDate = new Date((req.query.endDate as string) || '');

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    // Import Order model
    const { Order } = require('../models/Order');

    // Query orders with tax information
    const orders = await Order.find({
      storeId,
      createdAt: { $gte: startDate, $lte: new Date(endDate.getTime() + 86400000) },
      status: { $in: ['completed', 'delivered'] },
    })
      .select('items subtotal taxes createdAt')
      .limit(10000)
      .lean();

    // Calculate GST by category
    const gstData: Record<string, { taxable: number; cgst: number; sgst: number; igst: number }> = {};

    for (const order of orders) {
      const taxableAmount = (order.subtotal as number) || 0;
      const totalTax = (order.taxes as number) || 0;

      // Default category
      const category = 'General';

      if (!gstData[category]) {
        gstData[category] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      }

      gstData[category].taxable += taxableAmount;
      // Assuming CGST and SGST are split equally (9% each for 18% GST)
      const halfTax = totalTax / 2;
      gstData[category].cgst += halfTax;
      gstData[category].sgst += halfTax;
    }

    // Generate CSV
    const csvHeaders = ['Category', 'TaxableAmount', 'CGST(9%)', 'SGST(9%)', 'IGST(0%)', 'TotalTax'];
    const csvLines: string[] = [csvHeaders.join(',')];

    for (const [category, data] of Object.entries(gstData)) {
      const taxable = Math.round(data.taxable * 100) / 100;
      const cgst = Math.round(data.cgst * 100) / 100;
      const sgst = Math.round(data.sgst * 100) / 100;
      const igst = Math.round(data.igst * 100) / 100;
      const total = cgst + sgst + igst;

      const csvLine = [category, taxable, cgst, sgst, igst, total].map((field) => String(field)).join(',');

      csvLines.push(csvLine);
    }

    const csvContent = csvLines.join('\n');

    // Set response headers
    const filename = `rez-gst-${new Date().toISOString().substring(0, 7)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    logger.error('Error exporting GST summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export GST summary',
      ...(process.env.NODE_ENV === 'development' && {
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    });
  }
});

/**
 * @route   GET /merchant/documents/export/payroll
 * @desc    Export staff payroll data
 * @query   storeId - Optional store ID
 * @query   startDate - Start date in YYYY-MM-DD format
 * @query   endDate - End date in YYYY-MM-DD format
 * @access  Merchant (authenticated)
 */
router.get('/payroll', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const startDate = new Date((req.query.startDate as string) || '');
    const endDate = new Date((req.query.endDate as string) || '');

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    // Import Staff model if available
    let staffData: any[] = [];
    try {
      const { Staff } = require('../models/Staff');
      staffData = await Staff.find({
        storeId,
        isActive: true,
      })
        .select('name role baseSalary createdAt')
        .lean();
    } catch (err) {
      logger.warn('Staff model not available for payroll export');
    }

    // Generate CSV
    const csvHeaders = ['StaffName', 'Role', 'BaseSalary', 'Hours', 'Amount', 'Period'];
    const csvLines: string[] = [csvHeaders.join(',')];

    if (staffData.length === 0) {
      // No staff data, return empty CSV
      const csvContent = csvLines.join('\n');
      const filename = `rez-payroll-${new Date().toISOString().substring(0, 7)}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvContent);
    }

    for (const staff of staffData) {
      const name = staff.name || 'Unknown';
      const role = staff.role || 'Staff';
      const salary = Math.round(((staff.baseSalary as number) || 0) * 100) / 100;
      const hours = '160'; // Standard month hours
      const amount = salary;
      const period = new Date().toISOString().substring(0, 7);

      const csvLine = [name, role, salary, hours, amount, period]
        .map((field) => {
          const str = String(field || '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',');

      csvLines.push(csvLine);
    }

    const csvContent = csvLines.join('\n');

    // Set response headers
    const filename = `rez-payroll-${new Date().toISOString().substring(0, 7)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    logger.error('Error exporting payroll:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export payroll data',
      ...(process.env.NODE_ENV === 'development' && {
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    });
  }
});

// ─── Document Management Stubs ───────────────────────────────────────────────
// TODO: Implement real document generation logic (PDF invoices, receipts, etc.)
// These are placeholder routes to prevent 404s from the merchant frontend.

/**
 * @route   GET /merchant/documents/analytics
 * @desc    Return document analytics summary
 * @access  Merchant (authenticated)
 */
router.get('/analytics', async (_req: Request, res: Response) => {
  // BR-H1: stub — not yet implemented
  return res.status(501).json({ success: false, message: 'Not implemented', code: 'NOT_IMPLEMENTED' });
});

/**
 * @route   GET /merchant/documents/settings
 * @desc    Return document generation settings
 * @access  Merchant (authenticated)
 */
router.get('/settings', async (_req: Request, res: Response) => {
  // BR-H1: stub — not yet implemented
  return res.status(501).json({ success: false, message: 'Not implemented', code: 'NOT_IMPLEMENTED' });
});

/**
 * @route   PUT /merchant/documents/settings
 * @desc    Update document generation settings
 * @access  Merchant (authenticated)
 */
router.put('/settings', async (_req: Request, res: Response) => {
  // BR-H1: stub — not yet implemented
  return res.status(501).json({ success: false, message: 'Not implemented', code: 'NOT_IMPLEMENTED' });
});

/**
 * @route   POST /merchant/documents/generate
 * @desc    Generate a single document (invoice, receipt, etc.)
 * @access  Merchant (authenticated)
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { type, orderId, referenceId } = req.body;
    const validTypes = ['invoice', 'packing_slip', 'shipping_label', 'receipt'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `type must be one of: ${validTypes.join(', ')}` });
    }
    const refId = orderId || referenceId;
    if (!refId) {
      return res.status(400).json({ success: false, message: 'orderId or referenceId is required' });
    }

    // Fetch the order/reference record
    const order = await Order.findById(refId)
      .populate('customer', 'name phone email')
      .populate('store', 'name address phone')
      .lean()
      .catch(() => null);

    // Build PDF in memory
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    await new Promise<void>((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);

      const title =
        type === 'invoice'
          ? 'INVOICE'
          : type === 'packing_slip'
            ? 'PACKING SLIP'
            : type === 'shipping_label'
              ? 'SHIPPING LABEL'
              : 'RECEIPT';

      doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
      doc.moveDown(0.5);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(`Reference: ${refId}`, { align: 'center' })
        .text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
      doc.fillColor('#111').moveDown(1);

      if (order) {
        const customer = (order as any).customer || {};
        const store = (order as any).store || {};
        doc.font('Helvetica-Bold').fontSize(11).text('Order Details');
        doc
          .font('Helvetica')
          .fontSize(9)
          .text(`Order ID: ${refId}`)
          .text(`Status: ${(order as any).status || '—'}`)
          .text(`Date: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : '—'}`);
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').fontSize(10).text('Customer');
        doc
          .font('Helvetica')
          .fontSize(9)
          .text(customer.name || 'Customer')
          .text(customer.phone || '—')
          .text(customer.email || '');
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').fontSize(10).text('Store');
        doc
          .font('Helvetica')
          .fontSize(9)
          .text(store.name || '—')
          .text(store.address || '—')
          .text(store.phone || '');
        doc.moveDown(1);

        const items = (order as any).items || [];
        if (items.length > 0 && type !== 'shipping_label') {
          doc.font('Helvetica-Bold').fontSize(10).text('Items');
          const headerY = doc.y + 4;
          doc.rect(40, headerY, 515, 16).fill('#f0f4ff').stroke();
          doc
            .fill('#111')
            .font('Helvetica-Bold')
            .fontSize(8)
            .text('Item', 45, headerY + 3)
            .text('Qty', 360, headerY + 3, { width: 40, align: 'right' })
            .text('Price', 410, headerY + 3, { width: 70, align: 'right' })
            .text('Total', 490, headerY + 3, { width: 60, align: 'right' });

          let rowY = headerY + 20;
          items.forEach((item: any) => {
            doc
              .font('Helvetica')
              .fontSize(8)
              .text(item.name || item.productId?.toString() || '—', 45, rowY, { width: 300 })
              .text(String(item.quantity || 1), 360, rowY, { width: 40, align: 'right' })
              .text(`₹${(item.unitPrice || 0).toFixed(2)}`, 410, rowY, { width: 70, align: 'right' })
              .text(`₹${(item.totalPrice || 0).toFixed(2)}`, 490, rowY, { width: 60, align: 'right' });
            rowY += 14;
          });

          doc.moveTo(40, rowY).lineTo(555, rowY).stroke();
          rowY += 4;
          const pricing = (order as any).pricing || {};
          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .text(`Total: ₹${(pricing.total || 0).toFixed(2)}`, 490, rowY, { width: 60, align: 'right' });
        }

        if (type === 'shipping_label') {
          const delivery = (order as any).delivery || {};
          doc.moveDown(1).font('Helvetica-Bold').fontSize(14).text('SHIP TO:', { underline: true });
          doc
            .font('Helvetica')
            .fontSize(11)
            .text(customer.name || 'Customer')
            .text(delivery.address || (order as any).deliveryAddress || 'Address not provided');
        }
      } else {
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#ef4444')
          .text('Order data not found. Please verify the reference ID.', { align: 'center' });
      }

      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor('#9ca3af').text('Generated by REZ Platform', { align: 'center' });
      doc.end();
    });

    const buffer = Buffer.concat(chunks);
    const documentId = `doc_${Date.now()}_${crypto.randomUUID().replace('-', '').substring(0, 5)}`;
    const fileName = `${type.replace('_', '-')}-${refId.toString().slice(-6)}.pdf`;

    // Evict oldest if cache is full
    if (_docCache.size >= MAX_CACHED_DOCS) {
      const oldest = [..._docCache.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      if (oldest) _docCache.delete(oldest[0]);
    }
    _docCache.set(documentId, { buffer, name: fileName, type, createdAt: Date.now() });

    return res.status(201).json({
      success: true,
      message: 'Document generated',
      data: { documentId, status: 'completed', fileName, type },
    });
  } catch (err: any) {
    logger.error('[documents] generate error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @route   POST /merchant/documents/bulk-generate
 * @desc    Bulk generate documents for multiple records
 * @access  Merchant (authenticated)
 */
router.post('/bulk-generate', async (_req: Request, res: Response) => {
  // BR-H1: stub — not yet implemented
  return res.status(501).json({ success: false, message: 'Not implemented', code: 'NOT_IMPLEMENTED' });
});

/**
 * @route   GET /merchant/documents/:documentId/status
 * @desc    Get the generation status of a document
 * @access  Merchant (authenticated)
 */
router.get('/:documentId/status', async (req: Request, res: Response) => {
  const { documentId } = req.params;
  const cached = _docCache.get(documentId);
  if (!cached) {
    return res.status(404).json({ success: false, message: 'Document not found or expired', documentId });
  }
  return res.json({
    success: true,
    data: {
      documentId,
      status: 'completed',
      fileName: cached.name,
      type: cached.type,
      createdAt: new Date(cached.createdAt).toISOString(),
      expiresAt: new Date(cached.createdAt + DOC_TTL_MS).toISOString(),
    },
  });
});

/**
 * @route   GET /merchant/documents/:documentId/download
 * @desc    Download a generated document
 * @access  Merchant (authenticated)
 */
router.get('/:documentId/download', async (req: Request, res: Response) => {
  const { documentId } = req.params;
  const cached = _docCache.get(documentId);
  if (!cached) {
    return res.status(404).json({ success: false, message: 'Document not found or expired (10-min TTL)', documentId });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${cached.name}"`);
  res.setHeader('Content-Length', cached.buffer.length);
  return res.end(cached.buffer);
});

/**
 * @route   POST /merchant/documents/:documentId/email
 * @desc    Email a generated document to a recipient
 * @access  Merchant (authenticated)
 */
router.post('/:documentId/email', async (_req: Request, res: Response) => {
  // BR-H1: stub — not yet implemented
  return res.status(501).json({ success: false, message: 'Not implemented', code: 'NOT_IMPLEMENTED' });
});

/**
 * @route   GET /merchant/documents/:documentId
 * @desc    Get a document record by ID
 * @access  Merchant (authenticated)
 */
router.get('/:documentId', async (req: Request, res: Response) => {
  const { documentId } = req.params;
  const cached = _docCache.get(documentId);
  if (!cached) {
    return res.status(404).json({ success: false, message: 'Document not found or expired', documentId });
  }
  return res.json({
    success: true,
    data: {
      documentId,
      status: 'completed',
      fileName: cached.name,
      type: cached.type,
      createdAt: new Date(cached.createdAt).toISOString(),
      downloadUrl: `/api/merchant/documents/${documentId}/download`,
    },
  });
});

/**
 * @route   DELETE /merchant/documents/:documentId
 * @desc    Delete a document record and its stored file
 * @access  Merchant (authenticated)
 */
router.delete('/:documentId', async (_req: Request, res: Response) => {
  // BR-H1: stub — not yet implemented
  return res.status(501).json({ success: false, message: 'Not implemented', code: 'NOT_IMPLEMENTED' });
});

export default router;
