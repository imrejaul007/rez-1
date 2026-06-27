import csv from 'csv-parser';
// SECURITY: xlsx (sheetjs) has unpatched prototype-pollution + ReDoS CVEs.
// Use the exceljs-backed compat shim instead.
import { parseExcelAsync } from '../utils/xlsxCompat';
import fs from 'fs';
import { Readable } from 'stream';
import { Product, IProduct } from '../models/Product';
import { Category } from '../models/Category';
import { Store } from '../models/Store';
import { Types } from 'mongoose';

// Import job result interface
export interface ImportRow {
  rowNumber: number;
  status: 'success' | 'error' | 'warning';
  data: any;
  errors: string[];
  warnings: string[];
  productId?: string;
  action?: 'created' | 'updated' | 'skipped';
}

export interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  warnings: number;
  rows: ImportRow[];
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
}

// CSV Template columns
export interface ProductImportData {
  name: string;
  description?: string;
  shortDescription?: string;
  sku?: string;
  price: number;
  costPrice?: number;
  compareAtPrice?: number;
  category: string; // Category name or ID
  subcategory?: string; // Subcategory name or ID
  stock: number;
  lowStockThreshold?: number;
  brand?: string;
  tags?: string; // Comma-separated
  status?: 'active' | 'draft' | 'inactive';
  images?: string; // Comma-separated URLs
  barcode?: string;
  weight?: number;
  isFeatured?: boolean;
}

export class BulkImportService {
  private batchSize = 50; // Process 50 rows at a time

  /**
   * Parse CSV file
   */
  async parseCSV(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Parse Excel file.
   *
   * SECURITY: xlsx (sheetjs) has unpatched prototype-pollution and ReDoS CVEs.
   * The CVEs are triggered by *malformed* XLSX inputs — so we validate the
   * file's magic-number header before invoking the parser. XLSX files are
   * either zip archives (newer .xlsx) starting with `PK\x03\x04`, or OLE2
   * compound documents (.xls) starting with `D0\xCF\x11\xE0`. If the file
   * is neither, we refuse to parse it.
   */
  async parseExcel(filePath: string): Promise<any[]> {
    try {
      // Magic-number check: reject anything that isn't a real XLSX/XLS file.
      const fd = fs.openSync(filePath, 'r');
      const headerBuf = Buffer.alloc(8);
      try {
        fs.readSync(fd, headerBuf, 0, 8, 0);
      } finally {
        fs.closeSync(fd);
      }
      const isZipXlsx = headerBuf[0] === 0x50 && headerBuf[1] === 0x4b;
      const isOle2Xls = headerBuf[0] === 0xd0 && headerBuf[1] === 0xcf &&
                         headerBuf[2] === 0x11 && headerBuf[3] === 0xe0;
      if (!isZipXlsx && !isOle2Xls) {
        throw new Error('File is not a valid XLSX/XLS (magic-number check failed)');
      }

      // Cap the parsed sheet size to avoid ReDoS in the parser on huge inputs.
      const stat = fs.statSync(filePath);
      if (stat.size > 10 * 1024 * 1024) {
        throw new Error('Excel file exceeds 10MB limit');
      }

      // SECURITY: exceljs-backed read replaces the deprecated xlsx package.
      const data = await parseExcelAsync<any>(filePath, { defval: '' });

      // Sanity cap: refuse to return more than 100k rows (defense-in-depth).
      if (data.length > 100000) {
        throw new Error('Excel file has more than 100,000 rows');
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse file based on extension
   */
  async parseFile(filePath: string, fileType: string): Promise<any[]> {
    if (fileType === 'csv' || filePath.endsWith('.csv')) {
      return this.parseCSV(filePath);
    } else if (fileType === 'excel' || filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
      return this.parseExcel(filePath);
    } else {
      throw new Error('Unsupported file type. Only CSV and Excel files are supported.');
    }
  }

  /**
   * Validate single product row
   */
  async validateProductRow(
    row: any,
    rowNumber: number,
    storeId: string,
    merchantId: string
  ): Promise<ImportRow> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!row.name || row.name.trim() === '') {
      errors.push('Product name is required');
    }

    if (!row.description || row.description.trim() === '') {
      errors.push('Product description is required');
    }

    if (!row.category || row.category.trim() === '') {
      errors.push('Category is required');
    }

    // Price validation
    const price = parseFloat(row.price);
    if (isNaN(price) || price < 0) {
      errors.push('Invalid price. Must be a positive number');
    }

    // Stock validation
    const stock = parseInt(row.stock);
    if (isNaN(stock) || stock < 0) {
      errors.push('Invalid stock. Must be a non-negative integer');
    }

    // SKU validation (optional, auto-generate if not provided)
    if (!row.sku || row.sku.trim() === '') {
      warnings.push('SKU not provided. Will auto-generate');
    } else {
      // Check if SKU already exists
      const existingProduct = await Product.findOne({ sku: row.sku.toUpperCase() });
      if (existingProduct && existingProduct.store.toString() !== storeId) {
        errors.push(`SKU ${row.sku} already exists in another store`);
      }
    }

    // Category validation
    let categoryId: string | null = null;
    let subCategoryId: string | null = null;

    if (row.category) {
      // Check if it's an ObjectId or category name
      if (Types.ObjectId.isValid(row.category)) {
        const category = await Category.findById(row.category);
        if (!category) {
          errors.push(`Category with ID ${row.category} not found`);
        } else {
          categoryId = (category._id as Types.ObjectId).toString();
        }
      } else {
        // Search by name
        const category = await Category.findOne({
          name: new RegExp(`^${row.category}$`, 'i')
        });
        if (!category) {
          errors.push(`Category '${row.category}' not found`);
        } else {
          categoryId = (category._id as Types.ObjectId).toString();
        }
      }
    }

    // Subcategory validation
    if (row.subcategory && categoryId) {
      if (Types.ObjectId.isValid(row.subcategory)) {
        const subCategory = await Category.findById(row.subcategory);
        if (!subCategory) {
          warnings.push(`Subcategory with ID ${row.subcategory} not found. Will be ignored`);
        } else {
          subCategoryId = (subCategory._id as Types.ObjectId).toString();
        }
      } else {
        // Search by name
        const subCategory = await Category.findOne({
          name: new RegExp(`^${row.subcategory}$`, 'i'),
          parentCategory: categoryId
        });
        if (!subCategory) {
          warnings.push(`Subcategory '${row.subcategory}' not found. Will be ignored`);
        } else {
          subCategoryId = (subCategory._id as Types.ObjectId).toString();
        }
      }
    }

    // Image validation
    if (row.images) {
      const imageUrls = row.images.split(',').map((url: string) => url.trim());
      const validUrls = imageUrls.filter((url: string) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      });

      if (validUrls.length === 0) {
        warnings.push('No valid image URLs provided');
      }
    }

    return {
      rowNumber,
      status: errors.length > 0 ? 'error' : (warnings.length > 0 ? 'warning' : 'success'),
      data: {
        ...row,
        categoryId,
        subCategoryId,
        price: parseFloat(row.price) || 0,
        stock: parseInt(row.stock) || 0,
        costPrice: parseFloat(row.costPrice) || undefined,
        compareAtPrice: parseFloat(row.compareAtPrice) || undefined,
        lowStockThreshold: parseInt(row.lowStockThreshold) || 5,
        weight: parseFloat(row.weight) || undefined,
        isFeatured: row.isFeatured === 'true' || row.isFeatured === '1' || row.isFeatured === 'yes'
      },
      errors,
      warnings
    };
  }

  /**
   * Create or update product from validated row
   */
  async processProductRow(
    validatedRow: ImportRow,
    storeId: string,
    merchantId: string
  ): Promise<ImportRow> {
    try {
      const data = validatedRow.data;

      // Generate SKU if not provided
      const sku = data.sku?.toUpperCase() || this.generateSKU(data.name);

      // Check if product exists (update scenario)
      let existingProduct = await Product.findOne({ sku, store: storeId });

      // Parse images
      const images = data.images
        ? data.images.split(',').map((url: string) => url.trim()).filter((url: string) => {
            try {
              new URL(url);
              return true;
            } catch {
              return false;
            }
          })
        : [];

      // Parse tags
      const tags = data.tags
        ? data.tags.split(',').map((tag: string) => tag.trim().toLowerCase())
        : [];

      // Product data structure
      const productData: Partial<IProduct> = {
        name: data.name.trim(),
        description: data.description?.trim(),
        shortDescription: data.shortDescription?.trim(),
        sku,
        category: new Types.ObjectId(data.categoryId),
        subCategory: data.subCategoryId ? new Types.ObjectId(data.subCategoryId) : undefined,
        store: new Types.ObjectId(storeId),
        merchantId: new Types.ObjectId(merchantId),
        brand: data.brand?.trim(),
        barcode: data.barcode?.trim(),
        images: images.length > 0 ? images : ['https://via.placeholder.com/400'],
        pricing: {
          original: data.compareAtPrice || data.price,
          selling: data.price,
          discount: data.compareAtPrice
            ? Math.round(((data.compareAtPrice - data.price) / data.compareAtPrice) * 100)
            : 0,
          currency: 'INR'
        },
        inventory: {
          stock: data.stock,
          isAvailable: data.stock > 0,
          lowStockThreshold: data.lowStockThreshold || 5,
          unlimited: false
        },
        tags,
        weight: data.weight,
        isActive: data.status === 'active' || !data.status,
        isFeatured: data.isFeatured || false,
        isDigital: false,
        ratings: {
          average: 0,
          count: 0,
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        },
        analytics: {
          views: 0,
          purchases: 0,
          conversions: 0,
          wishlistAdds: 0,
          shareCount: 0,
          returnRate: 0,
          avgRating: 0,
          todayPurchases: 0,
          todayViews: 0,
          lastResetDate: new Date()
        },
        seo: {
          title: data.name,
          description: data.shortDescription || data.description,
          keywords: tags
        },
        specifications: []
      };

      let product;
      let action: 'created' | 'updated' = 'created';

      if (existingProduct) {
        // Update existing product
        Object.assign(existingProduct, productData);
        product = await existingProduct.save();
        action = 'updated';
      } else {
        // Create new product
        product = new Product(productData);
        await product.save();
      }

      return {
        ...validatedRow,
        status: 'success',
        productId: product._id.toString(),
        action
      };
    } catch (error) {
      return {
        ...validatedRow,
        status: 'error',
        errors: [...validatedRow.errors, `Failed to process: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Generate SKU from product name
   */
  private generateSKU(name: string): string {
    const timestamp = Date.now().toString().slice(-6);
    const namePrefix = name
      .substring(0, 4)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    return `${namePrefix || 'PROD'}-${timestamp}`;
  }

  /**
   * Prepare product data from validated row (shared between insertMany and bulkWrite)
   */
  private prepareProductData(data: any, storeId: string, merchantId: string): Partial<IProduct> {
    // Parse images
    const images = data.images
      ? data.images.split(',').map((url: string) => url.trim()).filter((url: string) => {
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        })
      : [];

    // Parse tags
    const tags = data.tags
      ? data.tags.split(',').map((tag: string) => tag.trim().toLowerCase())
      : [];

    // Generate SKU if not provided
    const sku = data.sku?.toUpperCase() || this.generateSKU(data.name);

    return {
      name: data.name.trim(),
      description: data.description?.trim(),
      shortDescription: data.shortDescription?.trim(),
      sku,
      category: new Types.ObjectId(data.categoryId),
      subCategory: data.subCategoryId ? new Types.ObjectId(data.subCategoryId) : undefined,
      store: new Types.ObjectId(storeId),
      merchantId: new Types.ObjectId(merchantId),
      brand: data.brand?.trim(),
      barcode: data.barcode?.trim(),
      images: images.length > 0 ? images : ['https://via.placeholder.com/400'],
      pricing: {
        original: data.compareAtPrice || data.price,
        selling: data.price,
        discount: data.compareAtPrice
          ? Math.round(((data.compareAtPrice - data.price) / data.compareAtPrice) * 100)
          : 0,
        currency: 'INR'
      },
      inventory: {
        stock: data.stock,
        isAvailable: data.stock > 0,
        lowStockThreshold: data.lowStockThreshold || 5,
        unlimited: false
      },
      tags,
      weight: data.weight,
      isActive: data.status === 'active' || !data.status,
      isFeatured: data.isFeatured || false,
      isDigital: false,
      ratings: {
        average: 0,
        count: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      },
      analytics: {
        views: 0,
        purchases: 0,
        conversions: 0,
        wishlistAdds: 0,
        shareCount: 0,
        returnRate: 0,
        avgRating: 0,
        todayPurchases: 0,
        todayViews: 0,
        lastResetDate: new Date()
      },
      seo: {
        title: data.name,
        description: data.shortDescription || data.description,
        keywords: tags
      },
      specifications: []
    };
  }

  /**
   * Process bulk import
   */
  async processBulkImport(
    filePath: string,
    fileType: string,
    storeId: string,
    merchantId: string
  ): Promise<ImportResult> {
    const startTime = new Date();

    try {
      // Parse file
      const rows = await this.parseFile(filePath, fileType);

      if (rows.length === 0) {
        throw new Error('File is empty or contains no valid data');
      }

      if (rows.length > 1000) {
        throw new Error('File contains too many rows. Maximum 1000 rows allowed per import');
      }

      const result: ImportResult = {
        total: rows.length,
        successful: 0,
        failed: 0,
        warnings: 0,
        rows: [],
        startTime
      };

      // Process in batches
      for (let i = 0; i < rows.length; i += this.batchSize) {
        const batch = rows.slice(i, i + this.batchSize);

        // Validate batch
        const validatedBatch = await Promise.all(
          batch.map((row, index) =>
            this.validateProductRow(row, i + index + 1, storeId, merchantId)
          )
        );

        // OPTIMIZATION: Use bulk writes instead of individual saves
        // Separate error rows from valid rows
        const errorRows = validatedBatch.filter(r => r.status === 'error');
        const validRows = validatedBatch.filter(r => r.status !== 'error');

        // Pre-check existing products for all valid rows (batch lookup)
        const skuList = validRows.map(r => r.data.sku?.toUpperCase() || this.generateSKU(r.data.name));
        const existingProducts = await Product.find({
          sku: { $in: skuList },
          store: storeId
        }).select('_id sku');

        const existingSkuMap = new Map(existingProducts.map(p => [p.sku, p._id]));

        // Separate new vs existing products
        const newRows: ImportRow[] = [];
        const updateRows: { row: ImportRow; existingId: Types.ObjectId }[] = [];

        for (const row of validRows) {
          const sku = row.data.sku?.toUpperCase() || this.generateSKU(row.data.name);
          const existingId = existingSkuMap.get(sku);

          if (existingId) {
            updateRows.push({ row, existingId: existingId as Types.ObjectId });
          } else {
            newRows.push(row);
          }
        }

        const processedBatch: ImportRow[] = [...errorRows];

        // Bulk insert new products using insertMany
        if (newRows.length > 0) {
          try {
            const newProductsData = newRows.map(r => this.prepareProductData(r.data, storeId, merchantId));
            const insertedProducts = await Product.insertMany(newProductsData, { ordered: false });

            // Map inserted products back to rows
            for (let idx = 0; idx < newRows.length; idx++) {
              const product = insertedProducts[idx];
              if (product) {
                processedBatch.push({
                  ...newRows[idx],
                  status: 'success',
                  productId: product._id.toString(),
                  action: 'created'
                });
              } else {
                processedBatch.push({
                  ...newRows[idx],
                  status: 'error',
                  errors: [...newRows[idx].errors, 'Failed to insert product']
                });
              }
            }
          } catch (error) {
            // Handle partial failure in insertMany
            // Add remaining rows as errors
            for (const row of newRows) {
              processedBatch.push({
                ...row,
                status: 'error',
                errors: [...row.errors, `Bulk insert failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
              });
            }
          }
        }

        // Bulk update existing products using bulkWrite
        if (updateRows.length > 0) {
          try {
            const bulkOps = updateRows.map(({ row, existingId }) => ({
              updateOne: {
                filter: { _id: existingId },
                update: { $set: this.prepareProductData(row.data, storeId, merchantId) }
              }
            }));

            await Product.bulkWrite(bulkOps, { ordered: false });

            // Mark all updates as successful
            for (const { row } of updateRows) {
              processedBatch.push({
                ...row,
                status: 'success',
                productId: row.productId || '',
                action: 'updated'
              });
            }
          } catch (error) {
            // Handle partial failure in bulkWrite
            // Check which operations failed and mark them as errors
            if (error instanceof Error && 'writeErrors' in error) {
              const writeErrors = (error as any).writeErrors || [];
              const failedIndices = new Set(writeErrors.map((e: any) => e.index));

              for (let idx = 0; idx < updateRows.length; idx++) {
                const { row } = updateRows[idx];
                if (failedIndices.has(idx)) {
                  processedBatch.push({
                    ...row,
                    status: 'error',
                    errors: [...row.errors, `Bulk update failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
                  });
                } else {
                  processedBatch.push({
                    ...row,
                    status: 'success',
                    productId: row.productId || '',
                    action: 'updated'
                  });
                }
              }
            } else {
              // Mark all as errors if we can't determine partial failures
              for (const { row } of updateRows) {
                processedBatch.push({
                  ...row,
                  status: 'error',
                  errors: [...row.errors, `Bulk update failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
                });
              }
            }
          }
        }

        // Update result
        processedBatch.forEach(row => {
          result.rows.push(row);

          if (row.status === 'success') {
            result.successful++;
          } else if (row.status === 'error') {
            result.failed++;
          } else if (row.status === 'warning') {
            result.warnings++;
          }
        });
      }

      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      return result;
    } catch (error) {
      throw new Error(`Bulk import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate CSV template
   */
  generateCSVTemplate(): string {
    const headers = [
      'name',
      'description',
      'shortDescription',
      'sku',
      'price',
      'costPrice',
      'compareAtPrice',
      'category',
      'subcategory',
      'stock',
      'lowStockThreshold',
      'brand',
      'tags',
      'status',
      'images',
      'barcode',
      'weight',
      'isFeatured'
    ];

    const sampleRow = [
      'Sample Product Name',
      'Detailed description of the product',
      'Short description',
      'PROD-001',
      '999',
      '800',
      '1299',
      'Electronics',
      'Mobile Phones',
      '100',
      '5',
      'Samsung',
      'smartphone,5g,android',
      'active',
      'https://example.com/image1.jpg,https://example.com/image2.jpg',
      '1234567890123',
      '200',
      'false'
    ];

    return headers.join(',') + '\n' + sampleRow.join(',');
  }

  /**
   * Get import instructions
   */
  getImportInstructions(): any {
    return {
      title: 'Product Import Instructions',
      fileFormats: ['CSV', 'Excel (.xlsx, .xls)'],
      maxRows: 1000,
      requiredColumns: [
        { name: 'name', description: 'Product name (required, max 200 characters)' },
        { name: 'description', description: 'Product description (required, max 2000 characters)' },
        { name: 'price', description: 'Selling price (required, must be positive number)' },
        { name: 'category', description: 'Category name or ID (required)' },
        { name: 'stock', description: 'Stock quantity (required, non-negative integer)' }
      ],
      optionalColumns: [
        { name: 'shortDescription', description: 'Short description (max 300 characters)' },
        { name: 'sku', description: 'Stock Keeping Unit (auto-generated if not provided)' },
        { name: 'costPrice', description: 'Cost price for profit calculation' },
        { name: 'compareAtPrice', description: 'Original price (for discount display)' },
        { name: 'subcategory', description: 'Subcategory name or ID' },
        { name: 'lowStockThreshold', description: 'Low stock alert threshold (default: 5)' },
        { name: 'brand', description: 'Product brand name' },
        { name: 'tags', description: 'Comma-separated tags (e.g., "tag1,tag2,tag3")' },
        { name: 'status', description: 'Product status: "active", "draft", or "inactive" (default: active)' },
        { name: 'images', description: 'Comma-separated image URLs' },
        { name: 'barcode', description: 'Product barcode' },
        { name: 'weight', description: 'Product weight in grams' },
        { name: 'isFeatured', description: 'Featured product flag: "true" or "false"' }
      ],
      notes: [
        'Maximum 1000 products per import',
        'SKU will be auto-generated if not provided',
        'Products with matching SKU will be updated',
        'Invalid rows will be reported with specific errors',
        'Category and subcategory can be name or ID',
        'All prices should be in INR',
        'Image URLs must be valid HTTP/HTTPS URLs'
      ]
    };
  }
}

export const bulkImportService = new BulkImportService();
