require('dotenv').config();
const mongoose = require('mongoose');
const { Product } = require('../dist/models/Product');
const { Store } = require('../dist/models/Store');
const fs = require('fs');

async function exportProductsReport() {
  try {
    console.log('📊 Generating detailed products report...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); };

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // Fetch all products with store details
    const products = await Product.find()
      .populate('store', 'name')
      .lean()
      .sort({ 'store.name': 1 });

    // Group by store
    const storeGroups = {};
    products.forEach(product => {
      const storeName = product.store?.name || 'Unknown Store';
      if (!storeGroups[storeName]) {
        storeGroups[storeName] = [];
      }
      storeGroups[storeName].push(product);
    });

    // Generate detailed report
    let report = '# DETAILED PRODUCTS REPORT\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    report += `Total Products: ${products.length}\n`;
    report += `Total Stores: ${Object.keys(storeGroups).length}\n\n`;
    report += '---\n\n';

    // Sort stores alphabetically
    const sortedStores = Object.keys(storeGroups).sort();

    sortedStores.forEach((storeName, index) => {
      const storeProducts = storeGroups[storeName];

      report += `## ${index + 1}. ${storeName} (${storeProducts.length} products)\n\n`;

      storeProducts.forEach((product, pIndex) => {
        report += `### ${pIndex + 1}. ${product.name}\n\n`;
        report += `- **Product ID:** ${product._id}\n`;
        report += `- **SKU:** ${product.sku}\n`;
        report += `- **Brand:** ${product.brand || 'N/A'}\n`;
        report += `- **Price:** ₹${product.pricing?.selling || 0} (Original: ₹${product.pricing?.original || 0})\n`;
        report += `- **Discount:** ${product.pricing?.discount || 0}%\n`;
        report += `- **Stock:** ${product.inventory?.stock || 0}\n`;
        report += `- **Rating:** ${product.ratings?.average || 0}/5 (${product.ratings?.count || 0} reviews)\n`;
        report += `- **Tags:** ${product.tags?.join(', ') || 'None'}\n`;
        report += `- **Featured:** ${product.isFeatured ? 'Yes' : 'No'}\n`;
        report += `- **Active:** ${product.isActive ? 'Yes' : 'No'}\n`;
        report += `- **Created:** ${new Date(product.createdAt).toLocaleDateString()}\n`;
        report += '\n';
      });

      report += '---\n\n';
    });

    // Save to file
    const filename = 'DETAILED_PRODUCTS_REPORT.md';
    fs.writeFileSync(filename, report);
    console.log(`✅ Report saved to: ${filename}`);

    // Also create JSON export
    const jsonData = sortedStores.map(storeName => ({
      store: storeName,
      productCount: storeGroups[storeName].length,
      products: storeGroups[storeName].map(p => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        brand: p.brand,
        price: p.pricing?.selling,
        originalPrice: p.pricing?.original,
        discount: p.pricing?.discount,
        stock: p.inventory?.stock,
        rating: p.ratings?.average,
        reviews: p.ratings?.count,
        tags: p.tags,
        isFeatured: p.isFeatured,
        createdAt: p.createdAt
      }))
    }));

    const jsonFilename = 'products_export.json';
    fs.writeFileSync(jsonFilename, JSON.stringify(jsonData, null, 2));
    console.log(`✅ JSON export saved to: ${jsonFilename}`);

    // Summary statistics
    console.log('\n📊 SUMMARY STATISTICS:');
    console.log(`Total Products: ${products.length}`);
    console.log(`Total Stores with Products: ${sortedStores.length}`);
    console.log(`Average Products per Store: ${(products.length / sortedStores.length).toFixed(2)}`);

    const priceStats = products.reduce((acc, p) => {
      const price = p.pricing?.selling || 0;
      acc.total += price;
      acc.min = Math.min(acc.min, price);
      acc.max = Math.max(acc.max, price);
      return acc;
    }, { total: 0, min: Infinity, max: 0 });

    console.log(`\nPrice Range: ₹${priceStats.min} - ₹${priceStats.max}`);
    console.log(`Average Price: ₹${(priceStats.total / products.length).toFixed(2)}`);

    const totalStock = products.reduce((sum, p) => sum + (p.inventory?.stock || 0), 0);
    console.log(`\nTotal Stock: ${totalStock} units`);
    console.log(`Average Stock per Product: ${(totalStock / products.length).toFixed(2)} units`);

    const featuredCount = products.filter(p => p.isFeatured).length;
    console.log(`\nFeatured Products: ${featuredCount} (${((featuredCount / products.length) * 100).toFixed(1)}%)`);

    await mongoose.connection.close();
    console.log('\n✅ Export complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

exportProductsReport();
