/**
 * Comprehensive Financial Services Flow Verification
 * Verifies all components, routes, and integrations
 */

import mongoose from 'mongoose';
import { ServiceCategory } from '../models/ServiceCategory';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { connectDatabase } from '../config/database';
import fs from 'fs';
import path from 'path';

const FINANCIAL_CATEGORY_SLUGS = ['bills', 'ott', 'recharge', 'gold', 'insurance', 'offers'];

interface VerificationResult {
  test: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

function addResult(test: string, status: '✅' | '❌' | '⚠️', message: string, details?: any) {
  results.push({ test, status, message, details });
  console.log(`${status} ${test}: ${message}`);
}

async function verifyDatabase() {
  console.log('\n📊 DATABASE VERIFICATION\n');
  
  // Check categories
  const categories = await ServiceCategory.find({
    slug: { $in: FINANCIAL_CATEGORY_SLUGS },
    isActive: true
  }).lean();

  addResult(
    'Categories in Database',
    categories.length === 6 ? '✅' : '❌',
    `Found ${categories.length}/6 categories`,
    categories.map(c => ({ name: c.name, slug: c.slug, count: c.serviceCount }))
  );

  // Check services
  const categoryIds = categories.map(c => c._id);
  const services = await Product.find({
    productType: 'service',
    isActive: true,
    isDeleted: { $ne: true },
    serviceCategory: { $in: categoryIds }
  }).lean();

  addResult(
    'Services in Database',
    services.length > 0 ? '✅' : '❌',
    `Found ${services.length} services`,
    { byCategory: services.reduce((acc: any, s: any) => {
      const catId = s.serviceCategory?.toString();
      acc[catId] = (acc[catId] || 0) + 1;
      return acc;
    }, {}) }
  );

  // Check store
  const store = await Store.findOne({ slug: 'platform-financial-services' }).lean();
  addResult(
    'Platform Store',
    store ? '✅' : '❌',
    store ? `Store found: ${store.name}` : 'Store not found'
  );

  // Check service details
  if (services.length > 0) {
    const sampleService = services[0] as any;
    const hasRequiredFields = 
      sampleService.name &&
      sampleService.slug &&
      sampleService.serviceCategory &&
      sampleService.pricing &&
      sampleService.cashback;

    addResult(
      'Service Data Structure',
      hasRequiredFields ? '✅' : '❌',
      hasRequiredFields ? 'All required fields present' : 'Missing required fields',
      { sample: { name: sampleService.name, hasCategory: !!sampleService.serviceCategory } }
    );
  }

  return { categories, services, store };
}

async function verifyBackendCode() {
  console.log('\n🔧 BACKEND CODE VERIFICATION\n');

  const backendPath = path.join(__dirname, '..');
  
  // Check controller exists
  const controllerPath = path.join(backendPath, 'controllers', 'financialServicesController.ts');
  const controllerExists = fs.existsSync(controllerPath);
  addResult(
    'Controller File',
    controllerExists ? '✅' : '❌',
    controllerExists ? 'Controller file exists' : 'Controller file missing'
  );

  if (controllerExists) {
    const controllerContent = fs.readFileSync(controllerPath, 'utf-8');
    const hasAllMethods = 
      controllerContent.includes('getFinancialCategories') &&
      controllerContent.includes('getFeaturedFinancialServices') &&
      controllerContent.includes('getFinancialStats') &&
      controllerContent.includes('getFinancialServicesByCategory') &&
      controllerContent.includes('getFinancialServiceById') &&
      controllerContent.includes('searchFinancialServices');

    addResult(
      'Controller Methods',
      hasAllMethods ? '✅' : '❌',
      hasAllMethods ? 'All 6 methods implemented' : 'Some methods missing'
    );
  }

  // Check routes file
  const routesPath = path.join(backendPath, 'routes', 'financialServicesRoutes.ts');
  const routesExists = fs.existsSync(routesPath);
  addResult(
    'Routes File',
    routesExists ? '✅' : '❌',
    routesExists ? 'Routes file exists' : 'Routes file missing'
  );

  if (routesExists) {
    const routesContent = fs.readFileSync(routesPath, 'utf-8');
    const hasAllRoutes = 
      routesContent.includes('/categories') &&
      routesContent.includes('/featured') &&
      routesContent.includes('/stats') &&
      routesContent.includes('/category/:slug') &&
      routesContent.includes('/search') &&
      routesContent.includes('/:id');

    addResult(
      'Route Definitions',
      hasAllRoutes ? '✅' : '❌',
      hasAllRoutes ? 'All 6 routes defined' : 'Some routes missing'
    );
  }

  // Check server registration
  const serverPath = path.join(backendPath, 'server.ts');
  if (fs.existsSync(serverPath)) {
    const serverContent = fs.readFileSync(serverPath, 'utf-8');
    const isRegistered = 
      serverContent.includes('financialServicesRoutes') &&
      serverContent.includes('/financial-services');

    addResult(
      'Server Registration',
      isRegistered ? '✅' : '❌',
      isRegistered ? 'Routes registered in server.ts' : 'Routes not registered'
    );
  }

  // Check seed file
  const seedPath = path.join(backendPath, 'seeds', 'financialServicesSeeds.ts');
  const seedExists = fs.existsSync(seedPath);
  addResult(
    'Seed File',
    seedExists ? '✅' : '❌',
    seedExists ? 'Seed file exists' : 'Seed file missing'
  );
}

async function verifyFrontendCode() {
  console.log('\n💻 FRONTEND CODE VERIFICATION\n');

  const frontendPath = path.join(__dirname, '..', '..', '..', 'rez-frontend');
  
  // Check API service
  const apiServicePath = path.join(frontendPath, 'services', 'financialServicesApi.ts');
  const apiServiceExists = fs.existsSync(apiServicePath);
  addResult(
    'API Service File',
    apiServiceExists ? '✅' : '❌',
    apiServiceExists ? 'API service file exists' : 'API service file missing'
  );

  if (apiServiceExists) {
    const apiContent = fs.readFileSync(apiServicePath, 'utf-8');
    const hasAllMethods = 
      apiContent.includes('getCategories') &&
      apiContent.includes('getFeatured') &&
      apiContent.includes('getStats') &&
      apiContent.includes('getByCategory') &&
      apiContent.includes('getById') &&
      apiContent.includes('search');

    addResult(
      'API Service Methods',
      hasAllMethods ? '✅' : '❌',
      hasAllMethods ? 'All 6 methods implemented' : 'Some methods missing'
    );
  }

  // Check FinancialServicesSection
  const sectionPath = path.join(frontendPath, 'components', 'homepage', 'FinancialServicesSection.tsx');
  const sectionExists = fs.existsSync(sectionPath);
  addResult(
    'FinancialServicesSection',
    sectionExists ? '✅' : '❌',
    sectionExists ? 'Component exists' : 'Component missing'
  );

  if (sectionExists) {
    const sectionContent = fs.readFileSync(sectionPath, 'utf-8');
    const usesAPI = sectionContent.includes('financialServicesApi') || sectionContent.includes('financial-services');
    addResult(
      'Section Uses API',
      usesAPI ? '✅' : '❌',
      usesAPI ? 'Component fetches from API' : 'Component uses hardcoded data'
    );
  }

  // Check financial index page
  const indexPath = path.join(frontendPath, 'app', 'financial', 'index.tsx');
  const indexExists = fs.existsSync(indexPath);
  addResult(
    'Financial Index Page',
    indexExists ? '✅' : '❌',
    indexExists ? 'Index page exists' : 'Index page missing'
  );

  if (indexExists) {
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const usesAPI = indexContent.includes('financialServicesApi');
    addResult(
      'Index Page Uses API',
      usesAPI ? '✅' : '❌',
      usesAPI ? 'Page fetches from API' : 'Page uses hardcoded data'
    );
  }

  // Check category page
  const categoryPath = path.join(frontendPath, 'app', 'financial', '[category].tsx');
  const categoryExists = fs.existsSync(categoryPath);
  addResult(
    'Category Page',
    categoryExists ? '✅' : '❌',
    categoryExists ? 'Category page exists' : 'Category page missing'
  );

  if (categoryExists) {
    const categoryContent = fs.readFileSync(categoryPath, 'utf-8');
    const usesAPI = categoryContent.includes('financialServicesApi');
    const navigatesToProduct = categoryContent.includes('/product/');
    addResult(
      'Category Page Uses API',
      usesAPI ? '✅' : '❌',
      usesAPI ? 'Page fetches from API' : 'Page uses hardcoded data'
    );
    addResult(
      'Category Page Navigation',
      navigatesToProduct ? '✅' : '❌',
      navigatesToProduct ? 'Navigates to product page' : 'Navigation not implemented'
    );
  }
}

async function verifyIntegration() {
  console.log('\n🔗 INTEGRATION VERIFICATION\n');

  // Check cart integration (code-level)
  const frontendPath = path.join(__dirname, '..', '..', '..', 'rez-frontend');
  const cartApiPath = path.join(frontendPath, 'services', 'cartApi.ts');
  
  if (fs.existsSync(cartApiPath)) {
    const cartContent = fs.readFileSync(cartApiPath, 'utf-8');
    const supportsServices = cartContent.includes('itemType') && cartContent.includes('service');
    addResult(
      'Cart Service Support',
      supportsServices ? '✅' : '⚠️',
      supportsServices ? 'Cart supports services' : 'Cart service support unclear'
    );
  }

  // Check product page support
  const productPagePath = path.join(frontendPath, 'app', 'product', '[id].tsx');
  if (fs.existsSync(productPagePath)) {
    const productContent = fs.readFileSync(productPagePath, 'utf-8');
    const supportsServices = productContent.includes('productType') || productContent.includes('service');
    addResult(
      'Product Page Support',
      supportsServices ? '✅' : '⚠️',
      supportsServices ? 'Product page supports services' : 'Product page service support unclear'
    );
  }
}

async function generateReport() {
  console.log('\n📋 VERIFICATION REPORT\n');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === '✅').length;
  const failed = results.filter(r => r.status === '❌').length;
  const warnings = results.filter(r => r.status === '⚠️').length;
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('\nDETAILED RESULTS:\n');
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.status} ${result.test}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log('');
  });

  const successRate = ((passed / results.length) * 100).toFixed(1);
  console.log('='.repeat(60));
  console.log(`\nOverall Success Rate: ${successRate}%`);
  
  if (failed === 0 && warnings === 0) {
    console.log('\n🎉 ALL CHECKS PASSED! Financial Services is production-ready!');
  } else if (failed === 0) {
    console.log('\n✅ All critical checks passed! Some warnings to review.');
  } else {
    console.log('\n⚠️  Some checks failed. Please review and fix issues.');
  }
  
  return { passed, failed, warnings, successRate };
}

async function runVerification() {
  try {
    console.log('🔍 FINANCIAL SERVICES COMPREHENSIVE FLOW VERIFICATION');
    console.log('='.repeat(60));

    await verifyDatabase();
    await verifyBackendCode();
    await verifyFrontendCode();
    await verifyIntegration();
    
    const report = await generateReport();
    
    return report;
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

// Run verification
if (require.main === module) {
  connectDatabase()
    .then(() => runVerification())
    .then((report) => {
      console.log('\n✅ Verification complete. Disconnecting...');
      process.exit(report.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

export { runVerification };
