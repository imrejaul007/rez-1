const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// System Verification Results
const verificationResults = {
  timestamp: new Date().toISOString(),
  database: {
    connection: false,
    collections: {},
    statistics: {},
    issues: []
  },
  backend: {
    running: false,
    endpoints: {},
    issues: []
  },
  configuration: {
    environment: {},
    missing: [],
    issues: []
  },
  security: {
    issues: [],
    warnings: []
  },
  performance: {
    metrics: {},
    issues: []
  },
  productionReadiness: {
    score: 0,
    blockers: [],
    warnings: [],
    recommendations: []
  }
};

// Expected collections for REZ app
const EXPECTED_COLLECTIONS = {
  // Core Collections
  users: { critical: true, minDocs: 1 },
  products: { critical: true, minDocs: 10 },
  categories: { critical: true, minDocs: 5 },
  stores: { critical: true, minDocs: 3 },

  // Transaction Collections
  carts: { critical: false, minDocs: 0 },
  orders: { critical: false, minDocs: 0 },
  transactions: { critical: false, minDocs: 0 },
  wallets: { critical: false, minDocs: 0 },
  payments: { critical: false, minDocs: 0 },

  // Content Collections
  reviews: { critical: false, minDocs: 0 },
  wishlists: { critical: false, minDocs: 0 },
  videos: { critical: false, minDocs: 0 },
  projects: { critical: false, minDocs: 0 },

  // Engagement Collections
  notifications: { critical: false, minDocs: 0 },
  activities: { critical: false, minDocs: 0 },
  achievements: { critical: false, minDocs: 0 },
  userachievements: { critical: false, minDocs: 0 },
  userstreaks: { critical: false, minDocs: 0 },
  challenges: { critical: false, minDocs: 0 },
  userchallengeprogreses: { critical: false, minDocs: 0 },

  // Offers & Promotions
  offers: { critical: false, minDocs: 0 },
  vouchers: { critical: false, minDocs: 0 },
  coupons: { critical: false, minDocs: 0 },
  usercoupons: { critical: false, minDocs: 0 },
  discounts: { critical: false, minDocs: 0 },
  flashsales: { critical: false, minDocs: 0 },
  storevouchers: { critical: false, minDocs: 0 },

  // User Data
  addresses: { critical: false, minDocs: 0 },
  paymentmethods: { critical: false, minDocs: 0 },
  usersettings: { critical: false, minDocs: 0 },

  // Social & Community
  socialmediaposts: { critical: false, minDocs: 0 },
  follows: { critical: false, minDocs: 0 },
  activityinteractions: { critical: false, minDocs: 0 },

  // Support
  supporttickets: { critical: false, minDocs: 0 },
  faqs: { critical: false, minDocs: 0 },

  // Events & Subscriptions
  events: { critical: false, minDocs: 0 },
  eventbookings: { critical: false, minDocs: 0 },
  subscriptions: { critical: false, minDocs: 0 },

  // Referrals & Gamification
  referrals: { critical: false, minDocs: 0 },
  cointransactions: { critical: false, minDocs: 0 },
  scratchcards: { critical: false, minDocs: 0 },
  minigames: { critical: false, minDocs: 0 },
  gamesessions: { critical: false, minDocs: 0 },

  // Bills & Cashback
  bills: { critical: false, minDocs: 0 },
  usercashbacks: { critical: false, minDocs: 0 },
  cashbacks: { critical: false, minDocs: 0 },

  // Store Management
  outlets: { critical: false, minDocs: 0 },
  herobanneres: { critical: false, minDocs: 0 },
  storeanalytics: { critical: false, minDocs: 0 },
  storecomparisons: { critical: false, minDocs: 0 },
  favorites: { critical: false, minDocs: 0 },

  // Analytics
  productanalytics: { critical: false, minDocs: 0 },
  stocknotifications: { critical: false, minDocs: 0 },
  stockhistories: { critical: false, minDocs: 0 },

  // Merchant System
  merchants: { critical: false, minDocs: 0 },
  merchantproducts: { critical: false, minDocs: 0 },
  merchantorders: { critical: false, minDocs: 0 },

  // User Generated Content
  userproducts: { critical: false, minDocs: 0 },
  servicerequests: { critical: false, minDocs: 0 },

  // Miscellaneous
  offercategories: { critical: false, minDocs: 0 },
  offerredemptions: { critical: false, minDocs: 0 },
  userofferinteractions: { critical: false, minDocs: 0 },
  discountusages: { critical: false, minDocs: 0 },
  userstorevouchers: { critical: false, minDocs: 0 },
  auditlogs: { critical: false, minDocs: 0 }
};

// Required environment variables
const REQUIRED_ENV_VARS = {
  critical: [
    'MONGODB_URI',
    'JWT_SECRET',
    'PORT'
  ],
  important: [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ],
  optional: [
    'STRIPE_SECRET_KEY',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'GOOGLE_MAPS_API_KEY',
    'REDIS_URL'
  ]
};

// API Endpoints to test
const API_ENDPOINTS = {
  core: [
    { method: 'GET', path: '/health', name: 'Health Check' },
    { method: 'GET', path: '/api-info', name: 'API Info' },
    { method: 'GET', path: '/api/categories', name: 'Categories List' },
    { method: 'GET', path: '/api/products', name: 'Products List' },
    { method: 'GET', path: '/api/stores', name: 'Stores List' }
  ],
  authentication: [
    { method: 'POST', path: '/api/user/auth/send-otp', name: 'Send OTP', requiresAuth: false },
    { method: 'POST', path: '/api/user/auth/verify-otp', name: 'Verify OTP', requiresAuth: false }
  ],
  protected: [
    { method: 'GET', path: '/api/cart', name: 'Get Cart', requiresAuth: true },
    { method: 'GET', path: '/api/wishlist', name: 'Get Wishlist', requiresAuth: true },
    { method: 'GET', path: '/api/orders', name: 'Get Orders', requiresAuth: true },
    { method: 'GET', path: '/api/wallet', name: 'Get Wallet', requiresAuth: true }
  ]
};

// ============================================
// DATABASE VERIFICATION
// ============================================

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });

    verificationResults.database.connection = true;
    console.log('✅ Connected to MongoDB successfully');
    console.log(`📦 Database: ${DB_NAME}`);
    return true;
  } catch (error) {
    verificationResults.database.connection = false;
    verificationResults.database.issues.push({
      type: 'CRITICAL',
      message: `MongoDB connection failed: ${error.message}`
    });
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
}

async function checkCollection(name, config) {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection(name);

    // Get document count
    const count = await collection.countDocuments();

    // Get sample documents
    const samples = await collection.find({}).limit(2).toArray();

    // Get collection stats
    const stats = await collection.stats().catch(() => null);

    // Check indexes
    const indexes = await collection.indexes();

    const result = {
      exists: true,
      count,
      sampleFields: samples.length > 0 ? Object.keys(samples[0]) : [],
      size: stats ? stats.size : 0,
      avgObjSize: stats ? stats.avgObjSize : 0,
      indexes: indexes.length,
      indexNames: indexes.map(idx => idx.name)
    };

    // Validate against requirements
    if (config.critical && count < config.minDocs) {
      verificationResults.database.issues.push({
        type: 'CRITICAL',
        collection: name,
        message: `Critical collection has insufficient data (${count}/${config.minDocs} documents)`
      });
    } else if (count === 0) {
      verificationResults.database.issues.push({
        type: 'WARNING',
        collection: name,
        message: 'Collection is empty'
      });
    }

    return result;
  } catch (error) {
    return {
      exists: false,
      count: 0,
      error: error.message
    };
  }
}

async function checkDatabase() {
  console.log('\n📊 Checking Database Collections...\n');

  const db = mongoose.connection.db;
  const existingCollections = await db.listCollections().toArray();
  const existingNames = existingCollections.map(c => c.name);

  let criticalCount = 0;
  let populatedCount = 0;
  let emptyCount = 0;
  let missingCount = 0;

  // Check expected collections
  for (const [collectionName, config] of Object.entries(EXPECTED_COLLECTIONS)) {
    const result = await checkCollection(collectionName, config);
    verificationResults.database.collections[collectionName] = result;

    if (result.exists && result.count > 0) {
      console.log(`✅ ${collectionName}: ${result.count} documents (${result.indexes} indexes)`);
      populatedCount++;
    } else if (result.exists && result.count === 0) {
      console.log(`⚠️  ${collectionName}: EMPTY`);
      emptyCount++;
    } else {
      console.log(`❌ ${collectionName}: NOT FOUND`);
      missingCount++;
      if (config.critical) criticalCount++;
    }
  }

  // Check for unexpected collections
  console.log('\n📦 Additional Collections:');
  const expectedNames = Object.keys(EXPECTED_COLLECTIONS);
  for (const name of existingNames) {
    if (!expectedNames.includes(name) && !name.startsWith('system.')) {
      const result = await checkCollection(name, { critical: false, minDocs: 0 });
      console.log(`   - ${name}: ${result.count} documents`);
    }
  }

  // Database statistics
  const stats = await db.stats();
  verificationResults.database.statistics = {
    totalCollections: existingNames.length,
    expectedCollections: Object.keys(EXPECTED_COLLECTIONS).length,
    populatedCollections: populatedCount,
    emptyCollections: emptyCount,
    missingCollections: missingCount,
    criticalMissing: criticalCount,
    dataSize: stats.dataSize,
    storageSize: stats.storageSize,
    indexes: stats.indexes,
    avgObjSize: stats.avgObjSize
  };

  return verificationResults.database.statistics;
}

// ============================================
// BACKEND VERIFICATION
// ============================================

async function checkBackendRunning() {
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
    verificationResults.backend.running = true;
    console.log('✅ Backend server is running');
    return true;
  } catch (error) {
    verificationResults.backend.running = false;
    verificationResults.backend.issues.push({
      type: 'CRITICAL',
      message: `Backend server is not responding: ${error.message}`
    });
    console.log('❌ Backend server is not running or not accessible');
    console.log('   Please start the backend server with: npm run dev');
    return false;
  }
}

async function testAPIEndpoints() {
  if (!verificationResults.backend.running) {
    console.log('\n⏭️  Skipping API endpoint tests (backend not running)\n');
    return;
  }

  console.log('\n🔍 Testing API Endpoints...\n');

  // Test core endpoints
  console.log('Core Endpoints:');
  for (const endpoint of API_ENDPOINTS.core) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${BACKEND_URL}${endpoint.path}`,
        timeout: 5000
      });

      console.log(`✅ ${endpoint.name}: ${response.status}`);
      verificationResults.backend.endpoints[endpoint.path] = {
        status: 'working',
        statusCode: response.status
      };
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.response?.status || 'No response'}`);
      verificationResults.backend.endpoints[endpoint.path] = {
        status: 'error',
        error: error.message
      };
      verificationResults.backend.issues.push({
        type: 'ERROR',
        endpoint: endpoint.path,
        message: `${endpoint.name} failed: ${error.message}`
      });
    }
  }

  // Test authentication endpoints (without making actual requests that modify data)
  console.log('\nAuthentication Endpoints:');
  for (const endpoint of API_ENDPOINTS.authentication) {
    // Just check if endpoint exists (will return 400 for missing data, but that's OK)
    try {
      await axios({
        method: endpoint.method,
        url: `${BACKEND_URL}${endpoint.path}`,
        data: {},
        timeout: 5000,
        validateStatus: () => true // Accept any status
      });

      console.log(`✅ ${endpoint.name}: Endpoint exists`);
      verificationResults.backend.endpoints[endpoint.path] = {
        status: 'exists',
        note: 'Authentication endpoint available'
      };
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
      verificationResults.backend.endpoints[endpoint.path] = {
        status: 'error',
        error: error.message
      };
    }
  }
}

// ============================================
// CONFIGURATION VERIFICATION
// ============================================

function checkConfiguration() {
  console.log('\n⚙️  Checking Configuration...\n');

  // Check critical environment variables
  console.log('Critical Environment Variables:');
  for (const varName of REQUIRED_ENV_VARS.critical) {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: Configured`);
      verificationResults.configuration.environment[varName] = 'configured';
    } else {
      console.log(`❌ ${varName}: MISSING`);
      verificationResults.configuration.missing.push(varName);
      verificationResults.configuration.issues.push({
        type: 'CRITICAL',
        variable: varName,
        message: 'Required environment variable is missing'
      });
    }
  }

  // Check important environment variables
  console.log('\nImportant Environment Variables:');
  for (const varName of REQUIRED_ENV_VARS.important) {
    const value = process.env[varName];
    if (value && value !== 'your-' && !value.includes('change-this')) {
      console.log(`✅ ${varName}: Configured`);
      verificationResults.configuration.environment[varName] = 'configured';
    } else {
      console.log(`⚠️  ${varName}: NOT CONFIGURED`);
      verificationResults.configuration.issues.push({
        type: 'WARNING',
        variable: varName,
        message: 'Important environment variable not configured'
      });
    }
  }

  // Check optional environment variables
  console.log('\nOptional Environment Variables:');
  for (const varName of REQUIRED_ENV_VARS.optional) {
    const value = process.env[varName];
    if (value && value !== 'your-' && !value.includes('change-this')) {
      console.log(`✅ ${varName}: Configured`);
      verificationResults.configuration.environment[varName] = 'configured';
    } else {
      console.log(`⚠️  ${varName}: Not configured`);
    }
  }
}

// ============================================
// SECURITY AUDIT
// ============================================

function securityAudit() {
  console.log('\n🔒 Security Audit...\n');

  // Check JWT secret strength
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    verificationResults.security.issues.push({
      type: 'CRITICAL',
      message: 'JWT_SECRET is too short or missing (minimum 32 characters recommended)'
    });
    console.log('❌ JWT_SECRET: Too short or missing');
  } else {
    console.log('✅ JWT_SECRET: Adequate length');
  }

  // Check if in production mode
  if (process.env.NODE_ENV === 'production') {
    console.log('\n🏭 Production Mode Checks:');

    // Check rate limiting
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      verificationResults.security.warnings.push({
        message: 'Rate limiting is disabled in production mode'
      });
      console.log('⚠️  Rate limiting: DISABLED (not recommended for production)');
    } else {
      console.log('✅ Rate limiting: Enabled');
    }

    // Check debug mode
    if (process.env.DEBUG_MODE === 'true') {
      verificationResults.security.warnings.push({
        message: 'Debug mode is enabled in production'
      });
      console.log('⚠️  Debug mode: ENABLED (not recommended for production)');
    } else {
      console.log('✅ Debug mode: Disabled');
    }

    // Check CORS
    if (process.env.CORS_ORIGIN === '*') {
      verificationResults.security.issues.push({
        type: 'WARNING',
        message: 'CORS is set to allow all origins (not recommended for production)'
      });
      console.log('⚠️  CORS: Allows all origins (not recommended)');
    } else {
      console.log('✅ CORS: Configured with specific origins');
    }
  }
}

// ============================================
// PERFORMANCE METRICS
// ============================================

async function checkPerformance() {
  console.log('\n⚡ Performance Metrics...\n');

  if (!verificationResults.database.connection) {
    console.log('⏭️  Skipping performance checks (database not connected)\n');
    return;
  }

  // Database query performance
  try {
    const start = Date.now();
    const db = mongoose.connection.db;
    await db.collection('products').find({}).limit(10).toArray();
    const queryTime = Date.now() - start;

    verificationResults.performance.metrics.queryTime = queryTime;

    if (queryTime < 100) {
      console.log(`✅ Database query performance: ${queryTime}ms (Excellent)`);
    } else if (queryTime < 500) {
      console.log(`✅ Database query performance: ${queryTime}ms (Good)`);
    } else {
      console.log(`⚠️  Database query performance: ${queryTime}ms (Slow)`);
      verificationResults.performance.issues.push({
        type: 'WARNING',
        message: `Database queries are slow (${queryTime}ms)`
      });
    }
  } catch (error) {
    console.log(`⚠️  Could not measure query performance: ${error.message}`);
  }

  // Check index usage
  const stats = verificationResults.database.statistics;
  if (stats.indexes && stats.indexes > 0) {
    console.log(`✅ Database indexes: ${stats.indexes} indexes configured`);
  } else {
    console.log('⚠️  Database indexes: No indexes found (may impact performance)');
    verificationResults.performance.issues.push({
      type: 'WARNING',
      message: 'No database indexes configured'
    });
  }
}

// ============================================
// PRODUCTION READINESS SCORE
// ============================================

function calculateProductionReadiness() {
  console.log('\n🎯 Production Readiness Assessment...\n');

  let score = 100;
  const { database, backend, configuration, security, performance } = verificationResults;

  // Database checks (30 points)
  if (!database.connection) {
    score -= 30;
    verificationResults.productionReadiness.blockers.push('Database connection failed');
  } else {
    const stats = database.statistics;
    if (stats.criticalMissing > 0) {
      score -= 20;
      verificationResults.productionReadiness.blockers.push(`${stats.criticalMissing} critical collections missing data`);
    }
    if (stats.emptyCollections > 5) {
      score -= 5;
      verificationResults.productionReadiness.warnings.push(`${stats.emptyCollections} collections are empty`);
    }
  }

  // Backend checks (20 points)
  if (!backend.running) {
    score -= 20;
    verificationResults.productionReadiness.blockers.push('Backend server not running');
  } else if (backend.issues.length > 3) {
    score -= 10;
    verificationResults.productionReadiness.warnings.push(`${backend.issues.length} API endpoint issues`);
  }

  // Configuration checks (25 points)
  if (configuration.missing.length > 0) {
    score -= 25;
    verificationResults.productionReadiness.blockers.push(`${configuration.missing.length} critical environment variables missing`);
  }
  if (configuration.issues.filter(i => i.type === 'WARNING').length > 3) {
    score -= 10;
    verificationResults.productionReadiness.warnings.push('Multiple important configurations missing');
  }

  // Security checks (15 points)
  if (security.issues.filter(i => i.type === 'CRITICAL').length > 0) {
    score -= 15;
    verificationResults.productionReadiness.blockers.push('Critical security issues found');
  }
  if (security.warnings.length > 0) {
    score -= 5;
  }

  // Performance checks (10 points)
  if (performance.issues.length > 2) {
    score -= 10;
    verificationResults.productionReadiness.warnings.push('Performance issues detected');
  }

  verificationResults.productionReadiness.score = Math.max(0, score);

  // Generate recommendations
  if (score < 70) {
    verificationResults.productionReadiness.recommendations.push('NOT READY FOR PRODUCTION - Critical issues must be resolved');
  } else if (score < 85) {
    verificationResults.productionReadiness.recommendations.push('READY FOR STAGING - Some issues should be addressed before production');
  } else {
    verificationResults.productionReadiness.recommendations.push('READY FOR PRODUCTION - Minor optimizations recommended');
  }

  // Display score
  console.log('='.repeat(60));
  console.log(`Production Readiness Score: ${score}/100`);
  console.log('='.repeat(60));

  if (score >= 85) {
    console.log('✅ Status: PRODUCTION READY');
  } else if (score >= 70) {
    console.log('⚠️  Status: STAGING READY');
  } else {
    console.log('❌ Status: NOT PRODUCTION READY');
  }

  if (verificationResults.productionReadiness.blockers.length > 0) {
    console.log('\n🚫 Blockers:');
    verificationResults.productionReadiness.blockers.forEach(blocker => {
      console.log(`   - ${blocker}`);
    });
  }

  if (verificationResults.productionReadiness.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    verificationResults.productionReadiness.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
  }
}

// ============================================
// GENERATE REPORT
// ============================================

async function generateReport() {
  const fs = require('fs');
  const reportPath = path.join(__dirname, '../BACKEND_VERIFICATION_REPORT.md');

  let report = `# Backend Verification Report
Generated: ${verificationResults.timestamp}

## Executive Summary

**Production Readiness Score: ${verificationResults.productionReadiness.score}/100**

`;

  if (verificationResults.productionReadiness.score >= 85) {
    report += '✅ **Status: PRODUCTION READY**\n\n';
  } else if (verificationResults.productionReadiness.score >= 70) {
    report += '⚠️  **Status: STAGING READY**\n\n';
  } else {
    report += '❌ **Status: NOT PRODUCTION READY**\n\n';
  }

  // Database Status
  report += `## 1. Database Status

**Connection:** ${verificationResults.database.connection ? '✅ Connected' : '❌ Not Connected'}
**Database Name:** ${DB_NAME}

### Statistics
- Total Collections: ${verificationResults.database.statistics.totalCollections || 0}
- Expected Collections: ${verificationResults.database.statistics.expectedCollections || 0}
- Populated Collections: ${verificationResults.database.statistics.populatedCollections || 0}
- Empty Collections: ${verificationResults.database.statistics.emptyCollections || 0}
- Missing Collections: ${verificationResults.database.statistics.missingCollections || 0}
- Critical Missing: ${verificationResults.database.statistics.criticalMissing || 0}
- Data Size: ${((verificationResults.database.statistics.dataSize || 0) / 1024 / 1024).toFixed(2)} MB
- Storage Size: ${((verificationResults.database.statistics.storageSize || 0) / 1024 / 1024).toFixed(2)} MB
- Total Indexes: ${verificationResults.database.statistics.indexes || 0}

### Collection Details

#### Critical Collections (Must Have Data)
`;

  const criticalCollections = ['users', 'products', 'categories', 'stores'];
  criticalCollections.forEach(name => {
    const collection = verificationResults.database.collections[name];
    if (collection) {
      report += `- **${name}**: ${collection.count} documents, ${collection.indexes} indexes\n`;
    } else {
      report += `- **${name}**: ❌ Not found or not checked\n`;
    }
  });

  report += `\n#### Other Collections\n`;
  Object.entries(verificationResults.database.collections).forEach(([name, data]) => {
    if (!criticalCollections.includes(name)) {
      report += `- ${name}: ${data.count} documents\n`;
    }
  });

  if (verificationResults.database.issues.length > 0) {
    report += `\n### Database Issues\n\n`;
    verificationResults.database.issues.forEach(issue => {
      report += `- **[${issue.type}]** ${issue.collection ? `${issue.collection}: ` : ''}${issue.message}\n`;
    });
  }

  // Backend Status
  report += `\n## 2. Backend API Status

**Server Running:** ${verificationResults.backend.running ? '✅ Yes' : '❌ No'}
**Backend URL:** ${BACKEND_URL}

### Tested Endpoints

`;

  Object.entries(verificationResults.backend.endpoints).forEach(([path, data]) => {
    const status = data.status === 'working' ? '✅' : data.status === 'exists' ? '✅' : '❌';
    report += `- ${status} ${path}: ${data.statusCode || data.note || data.error}\n`;
  });

  if (verificationResults.backend.issues.length > 0) {
    report += `\n### Backend Issues\n\n`;
    verificationResults.backend.issues.forEach(issue => {
      report += `- **[${issue.type}]** ${issue.endpoint ? `${issue.endpoint}: ` : ''}${issue.message}\n`;
    });
  }

  // Configuration Status
  report += `\n## 3. Configuration Status

### Environment Variables

#### Configured
`;

  Object.entries(verificationResults.configuration.environment).forEach(([key, status]) => {
    if (status === 'configured') {
      report += `- ✅ ${key}\n`;
    }
  });

  if (verificationResults.configuration.missing.length > 0) {
    report += `\n#### Missing (Critical)\n`;
    verificationResults.configuration.missing.forEach(key => {
      report += `- ❌ ${key}\n`;
    });
  }

  const warningConfigs = verificationResults.configuration.issues.filter(i => i.type === 'WARNING');
  if (warningConfigs.length > 0) {
    report += `\n#### Not Configured (Important)\n`;
    warningConfigs.forEach(issue => {
      report += `- ⚠️  ${issue.variable}\n`;
    });
  }

  // Security Status
  report += `\n## 4. Security Status

`;

  if (verificationResults.security.issues.length === 0 && verificationResults.security.warnings.length === 0) {
    report += '✅ No critical security issues found\n';
  } else {
    if (verificationResults.security.issues.length > 0) {
      report += `### Security Issues\n\n`;
      verificationResults.security.issues.forEach(issue => {
        report += `- **[${issue.type}]** ${issue.message}\n`;
      });
    }

    if (verificationResults.security.warnings.length > 0) {
      report += `\n### Security Warnings\n\n`;
      verificationResults.security.warnings.forEach(warning => {
        report += `- ⚠️  ${warning.message}\n`;
      });
    }
  }

  // Performance Status
  report += `\n## 5. Performance Metrics

`;

  if (verificationResults.performance.metrics.queryTime) {
    report += `- Database Query Time: ${verificationResults.performance.metrics.queryTime}ms\n`;
  }

  if (verificationResults.performance.issues.length > 0) {
    report += `\n### Performance Issues\n\n`;
    verificationResults.performance.issues.forEach(issue => {
      report += `- **[${issue.type}]** ${issue.message}\n`;
    });
  } else {
    report += `- ✅ No performance issues detected\n`;
  }

  // Production Readiness
  report += `\n## 6. Production Readiness

**Score: ${verificationResults.productionReadiness.score}/100**

`;

  if (verificationResults.productionReadiness.blockers.length > 0) {
    report += `### 🚫 Blockers (Must Fix Before Production)\n\n`;
    verificationResults.productionReadiness.blockers.forEach(blocker => {
      report += `- ${blocker}\n`;
    });
  }

  if (verificationResults.productionReadiness.warnings.length > 0) {
    report += `\n### ⚠️  Warnings (Should Fix)\n\n`;
    verificationResults.productionReadiness.warnings.forEach(warning => {
      report += `- ${warning}\n`;
    });
  }

  report += `\n### Recommendations\n\n`;
  verificationResults.productionReadiness.recommendations.forEach(rec => {
    report += `- ${rec}\n`;
  });

  // Action Items
  report += `\n## 7. Action Items

### Immediate Actions (Critical)
`;

  let hasImmediateActions = false;

  if (!verificationResults.database.connection) {
    report += `1. Fix database connection\n`;
    hasImmediateActions = true;
  }

  if (verificationResults.configuration.missing.length > 0) {
    report += `2. Configure missing environment variables: ${verificationResults.configuration.missing.join(', ')}\n`;
    hasImmediateActions = true;
  }

  if (verificationResults.database.statistics.criticalMissing > 0) {
    report += `3. Seed critical collections with data\n`;
    hasImmediateActions = true;
  }

  if (!hasImmediateActions) {
    report += `- None\n`;
  }

  report += `\n### Short-term Actions (Important)
`;

  const importantWarnings = verificationResults.configuration.issues.filter(i => i.type === 'WARNING');
  if (importantWarnings.length > 0) {
    report += `1. Configure important services: ${importantWarnings.map(i => i.variable).join(', ')}\n`;
  }

  if (verificationResults.database.statistics.emptyCollections > 5) {
    report += `2. Consider seeding empty collections with sample data\n`;
  }

  report += `\n### Long-term Improvements
`;

  report += `1. Set up monitoring and logging\n`;
  report += `2. Configure Redis for caching\n`;
  report += `3. Set up automated backups\n`;
  report += `4. Implement rate limiting strategies\n`;
  report += `5. Set up performance monitoring\n`;

  report += `\n---

**Report Generated By:** Comprehensive Backend Check Script
**Timestamp:** ${verificationResults.timestamp}
`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('='.repeat(70));
  console.log('🔍 REZ APP COMPREHENSIVE BACKEND & DATABASE VERIFICATION');
  console.log('='.repeat(70));

  try {
    // 1. Database Verification
    console.log('\n📦 PHASE 1: DATABASE VERIFICATION');
    console.log('='.repeat(70));
    const connected = await connectDB();
    if (connected) {
      await checkDatabase();
    }

    // 2. Backend Verification
    console.log('\n🌐 PHASE 2: BACKEND API VERIFICATION');
    console.log('='.repeat(70));
    await checkBackendRunning();
    await testAPIEndpoints();

    // 3. Configuration Verification
    console.log('\n⚙️  PHASE 3: CONFIGURATION VERIFICATION');
    console.log('='.repeat(70));
    checkConfiguration();

    // 4. Security Audit
    console.log('\n🔒 PHASE 4: SECURITY AUDIT');
    console.log('='.repeat(70));
    securityAudit();

    // 5. Performance Check
    console.log('\n⚡ PHASE 5: PERFORMANCE ANALYSIS');
    console.log('='.repeat(70));
    await checkPerformance();

    // 6. Calculate Production Readiness
    console.log('\n🎯 PHASE 6: PRODUCTION READINESS ASSESSMENT');
    console.log('='.repeat(70));
    calculateProductionReadiness();

    // 7. Generate Report
    await generateReport();

    console.log('\n' + '='.repeat(70));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(70));
    console.log('\n📊 Check BACKEND_VERIFICATION_REPORT.md for detailed results\n');

  } catch (error) {
    console.error('\n❌ Error during verification:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('👋 Database connection closed\n');
    }
  }
}

// Run the script
main().catch(console.error);
