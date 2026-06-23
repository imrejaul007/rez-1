/**
 * E2E Test Configuration
 *
 * Configuration settings for merchant backend E2E tests
 */

module.exports = {
  // API Configuration
  baseURL: process.env.TEST_API_URL || 'http://localhost:5001',
  timeout: 30000, // 30 seconds per request

  // Test Merchant Credentials
  testMerchant: {
    email: `test-merchant-${Date.now()}@example.com`,
    password: 'Test@123456',
    businessName: 'Test Merchant Store',
    ownerName: 'Test Owner',
    phone: '+919876543210',
    businessAddress: {
      street: '123 Test Street',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India'
    },
    role: 'merchant'
  },

  // Test Team Member
  testTeamMember: {
    name: 'Test Team Member',
    email: `team-member-${Date.now()}@example.com`,
    role: 'manager',
    permissions: ['view_orders', 'manage_products']
  },

  // Test Customer
  testCustomer: {
    _id: '507f1f77bcf86cd799439011', // Mock ID for testing
    name: 'Test Customer',
    email: 'customer@example.com'
  },

  // Test Product Data
  testProduct: {
    name: 'Test Product E2E',
    description: 'This is a test product for E2E testing purposes with complete description',
    price: 99.99,
    compareAtPrice: 129.99,
    costPrice: 50.00,  // Fixed: Changed from costPerItem to costPrice
    sku: `SKU-${Date.now()}`,
    barcode: `BAR-${Date.now()}`,
    category: '68ecdae37084846c4f4f71ba',  // Fixed: Changed to valid category ID
    tags: ['test', 'e2e', 'automated'],
    status: 'active',
    inventory: {  // Fixed: Wrapped in inventory object
      stock: 100,  // Fixed: Changed from quantity to stock
      trackInventory: true,  // Fixed: Changed from trackQuantity
      lowStockThreshold: 10
    },
    cashback: {  // Fixed: Added cashback object
      percentage: 5,
      isActive: true
    },
    images: [{  // Fixed: Changed from string array to object array
      url: 'https://via.placeholder.com/300',
      altText: 'Test product image',
      isMain: true
    }]
  },

  // Test Product Variant
  testVariant: {
    name: 'Small / Red',
    sku: `VAR-${Date.now()}`,
    price: 89.99,
    compareAtPrice: 119.99,
    quantity: 50,
    attributes: [
      { name: 'Size', value: 'Small' },
      { name: 'Color', value: 'Red' }
    ]
  },

  // Test Order Data
  testOrder: {
    orderNumber: `ORD-${Date.now()}`,
    status: 'placed',
    paymentStatus: 'paid',
    total: 199.98,
    subtotal: 199.98,
    tax: 0,
    shipping: 0,
    items: []
  },

  // Test Cashback Request
  testCashback: {
    amount: 10.00,
    reason: 'E2E test cashback request',
    paymentMethod: 'wallet'
  },

  // Test Onboarding Data
  testOnboarding: {
    step1: {
      companyName: 'E2E Test Business',  // Fixed: Changed from businessName to companyName
      businessType: 'retail',
      gstNumber: '29ABCDE1234F1Z5',
      panNumber: 'ABCDE1234F',
      businessAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Karnataka',
        zipCode: '560001',  // Fixed: Changed from pincode to zipCode
        country: 'India'
      }
    },
    step2: {
      storeName: 'E2E Test Store',
      storeDescription: 'A test store for E2E testing',
      category: 'fashion',  // Fixed: Changed from storeCategory to category
      address: {  // Fixed: Changed from storeAddress to address
        street: '456 Store Street',
        city: 'Store City',
        state: 'Karnataka',
        zipCode: '560002',  // Fixed: Changed from pincode to zipCode
        country: 'India'
      },
      gstNumber: 'TEST123456789',  // Added required field
      panNumber: 'ABCDE1234F'  // Added required field
    },
    step3: {
      accountHolderName: 'Test Merchant',
      accountNumber: '1234567890',
      ifscCode: 'SBIN0001234',
      bankName: 'State Bank of India',
      branchName: 'Test Branch'
    },
    step4: {
      skipProducts: true
    },
    step5: {
      documents: [  // Fixed: Added at least one document as required
        {
          type: 'gst_certificate',
          url: 'https://example.com/documents/gst-certificate.pdf'
        }
      ]
    }
  },

  // Analytics Configuration
  analyticsConfig: {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    endDate: new Date().toISOString(),
    interval: 'day'
  },

  // Bulk Import Test Data
  bulkImportProducts: [
    {
      name: 'Bulk Product 1',
      sku: `BULK-1-${Date.now()}`,
      price: 49.99,
      quantity: 100,
      category: 'Electronics'
    },
    {
      name: 'Bulk Product 2',
      sku: `BULK-2-${Date.now()}`,
      price: 59.99,
      quantity: 150,
      category: 'Electronics'
    }
  ],

  // Test Configuration Flags
  flags: {
    skipCleanup: process.env.SKIP_CLEANUP === 'true',
    verboseLogging: process.env.VERBOSE === 'true',
    stopOnError: process.env.STOP_ON_ERROR === 'true',
    onlyTests: process.env.ONLY_TESTS ? process.env.ONLY_TESTS.split(',') : [],
    skipTests: process.env.SKIP_TESTS ? process.env.SKIP_TESTS.split(',') : []
  },

  // Retry Configuration
  retry: {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    retryableStatuses: [500, 502, 503, 504, 408]
  },

  // Expected Response Times (in ms)
  performanceTargets: {
    fast: 200,      // < 200ms is considered fast
    acceptable: 500, // < 500ms is acceptable
    slow: 1000,     // < 1000ms is slow but tolerable
    critical: 2000  // > 2000ms is critical
  },

  // Test Results Configuration
  reporting: {
    generateJSON: true,
    jsonOutputPath: './tests/e2e/results/test-results.json',
    generateHTML: false,
    includeResponseBodies: false,
    includeTimestamps: true
  }
};
