import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/merchantauth';
import BulkProductService from '../services/BulkProductService';
import { createObjectCsvWriter } from 'csv-writer';
// SECURITY: xlsx (sheetjs) has unpatched prototype-pollution + ReDoS CVEs.
// Use the exceljs-backed compat shim for write paths, and `parseExcelAsync`
// for read paths. The legacy xlsx package is no longer imported directly.
import xlsxCompat, { writeExcelAsync } from '../utils/xlsxCompat';
const XLSX = xlsxCompat.utils;
import { logger } from '../config/logger';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

// All routes require authentication
router.use(authMiddleware);

// @route   GET /api/merchant/bulk/products/template
// @desc    Download empty CSV/Excel template
// @access  Private
router.get('/products/template', async (req: Request, res: Response) => {
  try {
    const format = req.query.format as string || 'csv';
    const headers = BulkProductService.getTemplateHeaders();

    if (format === 'csv') {
      // Create CSV template
      const tempFilePath = path.join(__dirname, '../../templates', `product-template-${Date.now()}.csv`);

      // Ensure templates directory exists
      const templatesDir = path.join(__dirname, '../../templates');
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      const csvWriter = createObjectCsvWriter({
        path: tempFilePath,
        header: headers.map(h => ({ id: h, title: h }))
      });

      // Write example row
      const exampleRow: any = {
        name: 'Example Product',
        description: 'This is a detailed description of the product with at least 10 characters',
        shortDescription: 'Short product description',
        price: '99.99',
        compareAtPrice: '149.99',
        category: 'Electronics',
        subcategory: 'Smartphones',
        brand: 'Example Brand',
        sku: 'EXA123456',
        barcode: '1234567890123',
        stock: '100',
        lowStockThreshold: '10',
        weight: '500',
        tags: 'new, trending, popular',
        status: 'active',
        visibility: 'public',
        cashbackPercentage: '5',
        imageUrl: 'https://example.com/image.jpg'
      };

      await csvWriter.writeRecords([exampleRow]);

      res.download(tempFilePath, 'product-import-template.csv', (err) => {
        if (err) {
          logger.error('Download error:', err);
        }
        // Clean up temp file
        fs.unlinkSync(tempFilePath);
      });

    } else if (format === 'xlsx' || format === 'excel') {
      // Create Excel template
      const exampleData = [{
        name: 'Example Product',
        description: 'This is a detailed description of the product with at least 10 characters',
        shortDescription: 'Short product description',
        price: 99.99,
        compareAtPrice: 149.99,
        category: 'Electronics',
        subcategory: 'Smartphones',
        brand: 'Example Brand',
        sku: 'EXA123456',
        barcode: '1234567890123',
        stock: 100,
        lowStockThreshold: 10,
        weight: 500,
        tags: 'new, trending, popular',
        status: 'active',
        visibility: 'public',
        cashbackPercentage: 5,
        imageUrl: 'https://example.com/image.jpg'
      }];

      // SECURITY: use exceljs-backed async write instead of the deprecated
      // xlsx (sheetjs) package, which has unpatched CVEs.
      const tempFilePath = path.join(__dirname, '../../templates', `product-template-${Date.now()}.xlsx`);
      await writeExcelAsync(tempFilePath, 'Products', exampleData);

      res.download(tempFilePath, 'product-import-template.xlsx', (err) => {
        if (err) {
          logger.error('Download error:', err);
        }
        // Clean up temp file
        fs.unlinkSync(tempFilePath);
      });

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use "csv" or "xlsx"'
      });
    }

  } catch (error: any) {
    logger.error('Template download error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate template',
      error: error.message
    });
  }
});

// @route   POST /api/merchant/bulk/products/validate
// @desc    Validate CSV/Excel file without importing
// @access  Private
router.post('/products/validate', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const merchantId = req.merchantId!;
    const fileBuffer = req.file.buffer;
    const fileType = req.file.mimetype;

    let products;

    // Parse file based on type
    if (fileType === 'text/csv') {
      products = await BulkProductService.parseCSV(fileBuffer);
    } else if (
      fileType === 'application/vnd.ms-excel' ||
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      products = await BulkProductService.parseExcel(fileBuffer);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported file type'
      });
    }

    // Validate products
    const validation = await BulkProductService.validateImport(products, merchantId);

    return res.json({
      success: validation.isValid,
      message: validation.isValid
        ? 'Validation successful. Ready to import.'
        : 'Validation failed. Please fix errors before importing.',
      data: {
        totalRows: products.length,
        validRows: validation.isValid ? products.length : products.length - validation.errors.length,
        errorCount: validation.errors.length,
        errors: validation.errors
      }
    });

  } catch (error: any) {
    logger.error('Validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate file',
      error: error.message
    });
  }
});

// @route   POST /api/merchant/bulk/products/import
// @desc    Import products from CSV/Excel file
// @access  Private
router.post('/products/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const merchantId = req.merchantId!;
    const fileBuffer = req.file.buffer;
    const fileType = req.file.mimetype;

    let products;

    // Parse file based on type
    if (fileType === 'text/csv') {
      products = await BulkProductService.parseCSV(fileBuffer);
    } else if (
      fileType === 'application/vnd.ms-excel' ||
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      products = await BulkProductService.parseExcel(fileBuffer);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported file type'
      });
    }

    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No products found in file'
      });
    }

    if (products.length > 10000) {
      return res.status(400).json({
        success: false,
        message: 'File contains too many products. Maximum 10,000 products per import.'
      });
    }

    // Import products
    const result = await BulkProductService.importProducts(products, merchantId);

    // Send real-time notification
    if (global.io && result.success) {
      global.io.to(`merchant-${merchantId}`).emit('bulk_import_completed', {
        totalRows: result.totalRows,
        successCount: result.successCount,
        timestamp: new Date()
      });
    }

    return res.status(result.success ? 200 : 400).json({
      success: result.success,
      message: result.success
        ? `Successfully imported ${result.successCount} products`
        : `Import completed with errors. ${result.successCount} succeeded, ${result.errorCount} failed.`,
      data: {
        totalRows: result.totalRows,
        successCount: result.successCount,
        errorCount: result.errorCount,
        errors: result.errors.slice(0, 50) // Limit errors to first 50
      }
    });

  } catch (error: any) {
    logger.error('Import error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to import products',
      error: error.message
    });
  }
});

// @route   GET /api/merchant/bulk/products/export
// @desc    Export all products to CSV/Excel
// @access  Private
router.get('/products/export', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const format = req.query.format as string || 'csv';

    const timestamp = Date.now();
    const tempDir = path.join(__dirname, '../../templates');

    // Ensure templates directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    if (format === 'csv') {
      const tempFilePath = path.join(tempDir, `products-export-${timestamp}.csv`);

      await BulkProductService.exportToCSV(merchantId, tempFilePath);

      res.download(tempFilePath, `products-export-${timestamp}.csv`, (err) => {
        if (err) {
          logger.error('Download error:', err);
        }
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      });

    } else if (format === 'xlsx' || format === 'excel') {
      const tempFilePath = path.join(tempDir, `products-export-${timestamp}.xlsx`);

      await BulkProductService.exportToExcel(merchantId, tempFilePath);

      res.download(tempFilePath, `products-export-${timestamp}.xlsx`, (err) => {
        if (err) {
          logger.error('Download error:', err);
        }
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      });

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use "csv" or "xlsx"'
      });
    }

  } catch (error: any) {
    logger.error('Export error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export products',
      error: error.message
    });
  }
});

// @route   POST /api/merchant/bulk/products/export/advanced
// @desc    Export products with advanced filtering and field selection
// @access  Private
router.post('/products/export/advanced', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const { fields, filters, format = 'csv' } = req.body;

    // Validate input
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Fields array is required'
      });
    }

    // Build query from filters
    const query: any = { merchantId };

    if (filters) {
      if (filters.category) query.category = filters.category;
      if (filters.status) query.status = filters.status;
      if (filters.visibility) query.visibility = filters.visibility;

      if (filters.priceRange) {
        query.price = {
          $gte: filters.priceRange.min || 0,
          $lte: filters.priceRange.max || Number.MAX_VALUE
        };
      }

      if (filters.stockLevel) {
        switch (filters.stockLevel) {
          case 'in_stock':
            query['inventory.stock'] = { $gt: 0 };
            break;
          case 'low_stock':
            query.$expr = {
              $lte: ['$inventory.stock', '$inventory.lowStockThreshold']
            };
            break;
          case 'out_of_stock':
            query['inventory.stock'] = 0;
            break;
        }
      }

      if (filters.dateRange) {
        query.createdAt = {
          $gte: new Date(filters.dateRange.start),
          $lte: new Date(filters.dateRange.end)
        };
      }
    }

    // Fetch products with selected fields
    const { MProduct } = await import('../models/MerchantProduct');
    const products = await MProduct.find(query).lean();

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No products found matching the filters'
      });
    }

    // Map field names to actual property paths
    const fieldMapping: { [key: string]: string } = {
      'name': 'name',
      'sku': 'sku',
      'category': 'category',
      'subcategory': 'subcategory',
      'price': 'price',
      'costPrice': 'costPrice',
      'compareAtPrice': 'compareAtPrice',
      'stock': 'inventory.stock',
      'status': 'status',
      'visibility': 'visibility',
      'brand': 'brand',
      'barcode': 'barcode',
      'weight': 'weight',
      'tags': 'tags',
      'createdAt': 'createdAt',
      'updatedAt': 'updatedAt'
    };

    // Create job ID for async export (for large datasets)
    const jobId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // For now, process synchronously (in production, use Bull queue for large exports)
    const timestamp = Date.now();
    const tempDir = path.join(__dirname, '../../templates');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    if (format === 'csv') {
      const tempFilePath = path.join(tempDir, `products-advanced-export-${timestamp}.csv`);

      // Create CSV writer with selected fields
      const csvWriter = createObjectCsvWriter({
        path: tempFilePath,
        header: fields.map((field: string) => ({
          id: field,
          title: field.charAt(0).toUpperCase() + field.slice(1)
        }))
      });

      // Map products to selected fields
      const exportData = products.map((product: any) => {
        const row: any = {};
        fields.forEach((field: string) => {
          const path = fieldMapping[field] || field;
          const value = path.split('.').reduce((obj, key) => obj?.[key], product);
          row[field] = Array.isArray(value) ? value.join(', ') : value || '';
        });
        return row;
      });

      await csvWriter.writeRecords(exportData);

      res.download(tempFilePath, `products-advanced-export-${timestamp}.csv`, (err) => {
        if (err) {
          logger.error('Download error:', err);
        }
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      });

    } else if (format === 'xlsx' || format === 'excel') {
      const tempFilePath = path.join(tempDir, `products-advanced-export-${timestamp}.xlsx`);

      // Map products to selected fields
      const exportData = products.map((product: any) => {
        const row: any = {};
        fields.forEach((field: string) => {
          const path = fieldMapping[field] || field;
          const value = path.split('.').reduce((obj, key) => obj?.[key], product);
          row[field] = Array.isArray(value) ? value.join(', ') : value || '';
        });
        return row;
      });

      // SECURITY: use exceljs-backed async write instead of the deprecated
      // xlsx (sheetjs) package.
      await writeExcelAsync(tempFilePath, 'Products', exportData);

      res.download(tempFilePath, `products-advanced-export-${timestamp}.xlsx`, (err) => {
        if (err) {
          logger.error('Download error:', err);
        }
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      });

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use "csv" or "xlsx"'
      });
    }

  } catch (error: any) {
    logger.error('Advanced export error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export products',
      error: error.message
    });
  }
});

// @route   POST /api/merchant/bulk/products/bulk-update
// @desc    Bulk update multiple products at once
// @access  Private
router.post('/products/bulk-update', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const { productIds, updates } = req.body;

    // Validate input
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates object is required'
      });
    }

    // Validate updates
    const allowedFields = ['price', 'costPrice', 'compareAtPrice', 'category', 'subcategory', 'status', 'visibility', 'brand', 'tags'];
    const updateFields: any = {};

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) {
        return res.status(400).json({
          success: false,
          message: `Field '${key}' is not allowed for bulk update`
        });
      }
      updateFields[key] = value;
    }

    // Add timestamp
    updateFields.updatedAt = new Date();

    const { MProduct } = await import('../models/MerchantProduct');

    // Start MongoDB session for transaction
    const session = await MProduct.db.startSession();
    session.startTransaction();

    try {
      // Validate all products exist and belong to merchant
      const existingProducts = await MProduct.find({
        _id: { $in: productIds },
        merchantId
      }).session(session);

      if (existingProducts.length !== productIds.length) {
        throw new Error(`Only ${existingProducts.length} of ${productIds.length} products found`);
      }

      // Perform bulk update
      const result = await MProduct.updateMany(
        { _id: { $in: productIds }, merchantId },
        { $set: updateFields },
        { session }
      );

      await session.commitTransaction();

      // Send real-time notification
      if (global.io) {
        global.io.to(`merchant-${merchantId}`).emit('products_bulk_updated', {
          count: result.modifiedCount,
          timestamp: new Date()
        });
      }

      return res.json({
        success: true,
        message: `Successfully updated ${result.modifiedCount} products`,
        data: {
          totalRequested: productIds.length,
          updated: result.modifiedCount,
          failed: productIds.length - result.modifiedCount,
          updatedFields: Object.keys(updateFields).filter(k => k !== 'updatedAt')
        }
      });

    } catch (error: any) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error: any) {
    logger.error('Bulk update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to bulk update products',
      error: error.message
    });
  }
});

export default router;
