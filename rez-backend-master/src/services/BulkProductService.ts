import { logger } from '../config/logger';
import { Readable } from 'stream';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
// SECURITY: xlsx (sheetjs) has unpatched prototype-pollution + ReDoS CVEs.
// Use the exceljs-backed compat shim instead.
import { parseExcelAsync, writeExcelAsync } from '../utils/xlsxCompat';
import ExcelJS from 'exceljs';
import { MProduct } from '../models/MerchantProduct';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import mongoose from 'mongoose';

// Interfaces for bulk operations
export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: any;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ValidationError[];
  products?: any[];
}

export interface ProductRow {
  name: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  subcategory?: string;
  brand?: string;
  sku?: string;
  barcode?: string;
  stock: number;
  lowStockThreshold?: number;
  weight?: number;
  tags?: string;
  status?: string;
  visibility?: string;
  cashbackPercentage?: number;
  imageUrl?: string;
}

class BulkProductService {
  // Validate product data
  private validateProductRow(row: ProductRow, rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required fields validation
    if (!row.name || row.name.trim().length < 2) {
      errors.push({
        row: rowNumber,
        field: 'name',
        message: 'Name is required and must be at least 2 characters',
        value: row.name
      });
    }

    if (!row.description || row.description.trim().length < 10) {
      errors.push({
        row: rowNumber,
        field: 'description',
        message: 'Description is required and must be at least 10 characters',
        value: row.description
      });
    }

    if (!row.price || isNaN(Number(row.price)) || Number(row.price) < 0) {
      errors.push({
        row: rowNumber,
        field: 'price',
        message: 'Price is required and must be a positive number',
        value: row.price
      });
    }

    if (!row.category || row.category.trim().length === 0) {
      errors.push({
        row: rowNumber,
        field: 'category',
        message: 'Category is required',
        value: row.category
      });
    }

    if (row.stock === undefined || isNaN(Number(row.stock)) || Number(row.stock) < 0) {
      errors.push({
        row: rowNumber,
        field: 'stock',
        message: 'Stock is required and must be a non-negative number',
        value: row.stock
      });
    }

    // Optional field validation
    if (row.compareAtPrice && (isNaN(Number(row.compareAtPrice)) || Number(row.compareAtPrice) < 0)) {
      errors.push({
        row: rowNumber,
        field: 'compareAtPrice',
        message: 'Compare at price must be a positive number',
        value: row.compareAtPrice
      });
    }

    if (row.weight && (isNaN(Number(row.weight)) || Number(row.weight) < 0)) {
      errors.push({
        row: rowNumber,
        field: 'weight',
        message: 'Weight must be a positive number',
        value: row.weight
      });
    }

    if (row.lowStockThreshold && (isNaN(Number(row.lowStockThreshold)) || Number(row.lowStockThreshold) < 0)) {
      errors.push({
        row: rowNumber,
        field: 'lowStockThreshold',
        message: 'Low stock threshold must be a non-negative number',
        value: row.lowStockThreshold
      });
    }

    if (row.status && !['active', 'inactive', 'draft', 'archived'].includes(row.status)) {
      errors.push({
        row: rowNumber,
        field: 'status',
        message: 'Status must be one of: active, inactive, draft, archived',
        value: row.status
      });
    }

    if (row.visibility && !['public', 'hidden', 'featured'].includes(row.visibility)) {
      errors.push({
        row: rowNumber,
        field: 'visibility',
        message: 'Visibility must be one of: public, hidden, featured',
        value: row.visibility
      });
    }

    if (row.cashbackPercentage && (isNaN(Number(row.cashbackPercentage)) || Number(row.cashbackPercentage) < 0 || Number(row.cashbackPercentage) > 100)) {
      errors.push({
        row: rowNumber,
        field: 'cashbackPercentage',
        message: 'Cashback percentage must be between 0 and 100',
        value: row.cashbackPercentage
      });
    }

    return errors;
  }

  // Generate unique SKU
  private async generateSKU(merchantId: string, productName: string): Promise<string> {
    const prefix = productName.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    let sku = `${prefix}${timestamp}`;

    let counter = 1;
    while (await MProduct.findOne({ sku })) {
      sku = `${prefix}${timestamp}${counter}`;
      counter++;
    }

    return sku;
  }

  // Parse CSV file
  async parseCSV(fileBuffer: Buffer): Promise<ProductRow[]> {
    return new Promise((resolve, reject) => {
      const products: ProductRow[] = [];
      const stream = Readable.from(fileBuffer.toString());

      stream
        .pipe(csv())
        .on('data', (data: any) => {
          products.push(data);
        })
        .on('end', () => {
          resolve(products);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  // Parse Excel file from a buffer (e.g., multer memory storage).
  // SECURITY: exceljs-backed read replaces the deprecated xlsx package.
  // Accepts Buffer<ArrayBufferLike> from multer and coerces to Uint8Array.
  async parseExcel(fileBuffer: Buffer | Uint8Array): Promise<ProductRow[]> {
    try {
      // Magic-number check (exceljs would throw anyway, but reject early).
      const isZipXlsx = fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b;
      const isOle2Xls = fileBuffer[0] === 0xd0 && fileBuffer[1] === 0xcf &&
                         fileBuffer[2] === 0x11 && fileBuffer[3] === 0xe0;
      if (!isZipXlsx && !isOle2Xls) {
        throw new Error('File is not a valid XLSX/XLS (magic-number check failed)');
      }
      if (fileBuffer.length > 10 * 1024 * 1024) {
        throw new Error('Excel file exceeds 10MB limit');
      }

      const workbook = new ExcelJS.Workbook();
      // exceljs's load() expects Buffer<ArrayBuffer>; multer passes Buffer<ArrayBufferLike>.
      // Cast to any to bridge the TS strictness gap; runtime is fine.
      await workbook.xlsx.load(fileBuffer as any);
      const sheet = workbook.worksheets[0];
      if (!sheet) return [];
      const rows: ProductRow[] = [];
      let keys: string[] = [];
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const values: any[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => values.push(cell.value));
        if (rowNumber === 1) {
          keys = values.map((v) => String(v));
        } else {
          const obj: any = {};
          keys.forEach((k, i) => { obj[k] = values[i] !== undefined ? values[i] : ''; });
          rows.push(obj as ProductRow);
        }
      });
      if (rows.length > 100000) {
        throw new Error('Excel file has more than 100,000 rows');
      }
      return rows;
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Validate import data
  async validateImport(
    products: ProductRow[],
    merchantId: string
  ): Promise<{ isValid: boolean; errors: ValidationError[] }> {
    const errors: ValidationError[] = [];
    const skus = new Set<string>();

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const rowNumber = i + 2; // +2 because row 1 is header and array is 0-indexed

      // Validate product fields
      const validationErrors = this.validateProductRow(product, rowNumber);
      errors.push(...validationErrors);

      // Check for duplicate SKUs within the file
      if (product.sku) {
        if (skus.has(product.sku.toUpperCase())) {
          errors.push({
            row: rowNumber,
            field: 'sku',
            message: 'Duplicate SKU found in import file',
            value: product.sku
          });
        } else {
          skus.add(product.sku.toUpperCase());
        }

        // Check if SKU already exists in database
        const existingProduct = await MProduct.findOne({
          sku: product.sku.toUpperCase(),
          merchantId
        }).lean();

        if (existingProduct) {
          errors.push({
            row: rowNumber,
            field: 'sku',
            message: 'SKU already exists in your products',
            value: product.sku
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Import products from CSV/Excel
  async importProducts(
    products: ProductRow[],
    merchantId: string,
    validateOnly: boolean = false
  ): Promise<ImportResult> {
    const errors: ValidationError[] = [];
    let successCount = 0;
    let errorCount = 0;
    const createdProducts: any[] = [];

    // Validate all rows first
    const validation = await this.validateImport(products, merchantId);

    if (!validation.isValid) {
      return {
        success: false,
        totalRows: products.length,
        successCount: 0,
        errorCount: products.length,
        errors: validation.errors
      };
    }

    // If validation only, return success
    if (validateOnly) {
      return {
        success: true,
        totalRows: products.length,
        successCount: products.length,
        errorCount: 0,
        errors: []
      };
    }

    // Use MongoDB session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the store for this merchant
      const store = await Store.findOne({ merchantId }).session(session).lean();
      if (!store) {
        throw new Error('Store not found for merchant');
      }

      // Process products in batches for better performance
      const batchSize = 100;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);

        for (let j = 0; j < batch.length; j++) {
          const productRow = batch[j];
          const rowNumber = i + j + 2;

          try {
            // Generate SKU if not provided
            const sku = productRow.sku
              ? productRow.sku.toUpperCase()
              : await this.generateSKU(merchantId, productRow.name);

            // Parse tags
            const tags = productRow.tags
              ? productRow.tags.split(',').map(tag => tag.trim())
              : [];

            // Create product data
            const productData = {
              merchantId,
              name: productRow.name.trim(),
              description: productRow.description.trim(),
              shortDescription: productRow.shortDescription?.trim(),
              sku,
              barcode: productRow.barcode?.trim(),
              category: productRow.category.trim(),
              subcategory: productRow.subcategory?.trim(),
              brand: productRow.brand?.trim(),
              price: Number(productRow.price),
              compareAtPrice: productRow.compareAtPrice ? Number(productRow.compareAtPrice) : undefined,
              costPrice: productRow.compareAtPrice ? Number(productRow.compareAtPrice) * 0.7 : Number(productRow.price) * 0.7,
              currency: 'INR',
              inventory: {
                stock: Number(productRow.stock),
                lowStockThreshold: productRow.lowStockThreshold ? Number(productRow.lowStockThreshold) : 5,
                trackInventory: true,
                allowBackorders: false
              },
              images: productRow.imageUrl ? [{
                url: productRow.imageUrl,
                isMain: true,
                sortOrder: 0
              }] : [],
              weight: productRow.weight ? Number(productRow.weight) : undefined,
              tags,
              status: productRow.status || 'draft',
              visibility: productRow.visibility || 'public',
              cashback: {
                percentage: productRow.cashbackPercentage ? Number(productRow.cashbackPercentage) : 5,
                isActive: true
              }
            };

            // Create merchant product
            const merchantProduct = new MProduct(productData);
            await merchantProduct.save({ session });

            // Create user-side product
            await this.createUserSideProduct(merchantProduct, merchantId, store._id as any, session);

            createdProducts.push(merchantProduct);
            successCount++;

          } catch (error: any) {
            errorCount++;
            errors.push({
              row: rowNumber,
              field: 'general',
              message: error.message || 'Failed to create product',
              value: productRow.name
            });
          }
        }
      }

      // Commit transaction if no errors
      if (errorCount === 0) {
        await session.commitTransaction();
      } else {
        await session.abortTransaction();
        // If there were errors, return them but don't create any products
        successCount = 0;
        createdProducts.length = 0;
      }

      return {
        success: errorCount === 0,
        totalRows: products.length,
        successCount,
        errorCount,
        errors,
        products: createdProducts
      };

    } catch (error: any) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Create user-side product
  private async createUserSideProduct(
    merchantProduct: any,
    merchantId: string,
    storeId: mongoose.Types.ObjectId,
    session: mongoose.ClientSession
  ): Promise<void> {
    try {
      // Find or create category
      let category = await Category.findOne({ name: merchantProduct.category }).session(session).lean();
      if (!category) {
        const newCategory = await Category.create([{
          name: merchantProduct.category,
          slug: merchantProduct.category.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'),
          type: 'product',
          isActive: true
        }], { session });
        category = newCategory[0] as any;
      }

      // Create unique slug
      let productSlug = merchantProduct.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .trim();

      let counter = 1;
      while (await Product.findOne({ slug: productSlug }).session(session)) {
        productSlug = `${merchantProduct.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')}-${counter}`;
        counter++;
      }

      // Create user product
      const userProduct = new Product({
        name: merchantProduct.name,
        slug: productSlug,
        description: merchantProduct.description,
        shortDescription: merchantProduct.shortDescription,
        category: category!._id,
        store: storeId,
        brand: merchantProduct.brand,
        sku: merchantProduct.sku,
        barcode: merchantProduct.barcode,
        images: merchantProduct.images?.map((img: any) => img.url) || [],
        pricing: {
          original: merchantProduct.compareAtPrice || merchantProduct.price,
          selling: merchantProduct.price,
          currency: merchantProduct.currency || 'INR',
          discount: merchantProduct.compareAtPrice
            ? Math.round(((merchantProduct.compareAtPrice - merchantProduct.price) / merchantProduct.compareAtPrice) * 100)
            : 0
        },
        inventory: {
          stock: merchantProduct.inventory.stock,
          isAvailable: merchantProduct.inventory.stock > 0,
          lowStockThreshold: merchantProduct.inventory.lowStockThreshold || 5,
          unlimited: false
        },
        ratings: {
          average: 0,
          count: 0,
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        },
        specifications: [],
        tags: merchantProduct.tags || [],
        seo: {
          title: merchantProduct.name,
          description: merchantProduct.shortDescription || merchantProduct.description,
          keywords: []
        },
        analytics: {
          views: 0,
          purchases: 0,
          conversions: 0,
          wishlistAdds: 0,
          shareCount: 0,
          returnRate: 0,
          avgRating: 0
        },
        cashback: {
          percentage: merchantProduct.cashback?.percentage || 5,
          isActive: merchantProduct.cashback?.isActive || true
        },
        isActive: merchantProduct.status === 'active',
        isFeatured: merchantProduct.visibility === 'featured',
        isDigital: false,
        weight: merchantProduct.weight,
        productType: 'product'
      });

      await userProduct.save({ session });
    } catch (error) {
      logger.error('Error creating user-side product:', error);
      throw error;
    }
  }

  // Export products to CSV
  async exportToCSV(merchantId: string, filePath: string): Promise<void> {
    try {
      const products = await MProduct.find({ merchantId })
        .select('name description shortDescription price compareAtPrice category subcategory brand sku barcode inventory weight tags status visibility cashback')
        .lean();

      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'name', title: 'name' },
          { id: 'description', title: 'description' },
          { id: 'shortDescription', title: 'shortDescription' },
          { id: 'price', title: 'price' },
          { id: 'compareAtPrice', title: 'compareAtPrice' },
          { id: 'category', title: 'category' },
          { id: 'subcategory', title: 'subcategory' },
          { id: 'brand', title: 'brand' },
          { id: 'sku', title: 'sku' },
          { id: 'barcode', title: 'barcode' },
          { id: 'stock', title: 'stock' },
          { id: 'lowStockThreshold', title: 'lowStockThreshold' },
          { id: 'weight', title: 'weight' },
          { id: 'tags', title: 'tags' },
          { id: 'status', title: 'status' },
          { id: 'visibility', title: 'visibility' },
          { id: 'cashbackPercentage', title: 'cashbackPercentage' }
        ]
      });

      const records = products.map(product => ({
        name: product.name,
        description: product.description,
        shortDescription: product.shortDescription || '',
        price: product.price,
        compareAtPrice: product.compareAtPrice || '',
        category: product.category,
        subcategory: product.subcategory || '',
        brand: product.brand || '',
        sku: product.sku,
        barcode: product.barcode || '',
        stock: product.inventory?.stock || 0,
        lowStockThreshold: product.inventory?.lowStockThreshold || 5,
        weight: product.weight || '',
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
        status: product.status,
        visibility: product.visibility,
        cashbackPercentage: product.cashback?.percentage || 5
      }));

      await csvWriter.writeRecords(records);
    } catch (error) {
      throw new Error(`Failed to export CSV: ${error}`);
    }
  }

  // Export products to Excel
  async exportToExcel(merchantId: string, filePath: string): Promise<void> {
    try {
      const products = await MProduct.find({ merchantId })
        .select('name description shortDescription price compareAtPrice category subcategory brand sku barcode inventory weight tags status visibility cashback')
        .lean();

      const records = products.map(product => ({
        name: product.name,
        description: product.description,
        shortDescription: product.shortDescription || '',
        price: product.price,
        compareAtPrice: product.compareAtPrice || '',
        category: product.category,
        subcategory: product.subcategory || '',
        brand: product.brand || '',
        sku: product.sku,
        barcode: product.barcode || '',
        stock: product.inventory?.stock || 0,
        lowStockThreshold: product.inventory?.lowStockThreshold || 5,
        weight: product.weight || '',
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
        status: product.status,
        visibility: product.visibility,
        cashbackPercentage: product.cashback?.percentage || 5
      }));

      // SECURITY: exceljs-backed write replaces the deprecated xlsx package.
      await writeExcelAsync(filePath, 'Products', records);
    } catch (error) {
      throw new Error(`Failed to export Excel: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Get template data
  getTemplateHeaders(): string[] {
    return [
      'name',
      'description',
      'shortDescription',
      'price',
      'compareAtPrice',
      'category',
      'subcategory',
      'brand',
      'sku',
      'barcode',
      'stock',
      'lowStockThreshold',
      'weight',
      'tags',
      'status',
      'visibility',
      'cashbackPercentage',
      'imageUrl'
    ];
  }
}

export default new BulkProductService();
