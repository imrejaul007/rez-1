// SECURITY: hard-coded MongoDB credentials replaced with env-var reference.
// Set MONGODB_URI in your environment before running this script.

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); };
const DATABASE_NAME = 'test';

// Reports directory
const REPORTS_DIR = path.join(__dirname, '..', 'database-audit-reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

class DatabaseAuditor {
  constructor() {
    this.client = null;
    this.db = null;
    this.collections = [];
    this.analysisResults = {
      collections: {},
      relationships: {},
      dataQuality: {},
      migrations: []
    };
  }

  async connect() {
    console.log('🔌 Connecting to MongoDB...');
    this.client = new MongoClient(MONGO_URI);
    await this.client.connect();
    this.db = this.client.db(DATABASE_NAME);
    console.log('✅ Connected to database:', DATABASE_NAME);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  async getAllCollections() {
    console.log('\n📋 Fetching all collections...');
    const collections = await this.db.listCollections().toArray();
    this.collections = collections.map(c => c.name);
    console.log(`✅ Found ${this.collections.length} collections`);
    return this.collections;
  }

  async analyzeCollection(collectionName) {
    console.log(`\n🔍 Analyzing collection: ${collectionName}`);
    const collection = this.db.collection(collectionName);

    try {
      // Get count
      const count = await collection.countDocuments();

      // Get sample documents
      const samples = await collection.find({}).limit(10).toArray();

      // Get indexes
      const indexes = await collection.indexes();

      // Analyze schema
      const schema = this.analyzeSchema(samples);

      // Analyze data quality
      const quality = this.analyzeDataQuality(samples);

      const result = {
        name: collectionName,
        count,
        samples: samples.map(s => this.sanitizeSample(s)),
        schema,
        indexes,
        quality
      };

      this.analysisResults.collections[collectionName] = result;

      console.log(`  📊 Count: ${count}`);
      console.log(`  📝 Sample size: ${samples.length}`);
      console.log(`  🔑 Indexes: ${indexes.length}`);

      return result;
    } catch (error) {
      console.error(`  ❌ Error analyzing ${collectionName}:`, error.message);
      return {
        name: collectionName,
        error: error.message
      };
    }
  }

  sanitizeSample(doc) {
    // Remove sensitive data and limit size
    const sanitized = JSON.parse(JSON.stringify(doc));
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.token) sanitized.token = '[REDACTED]';
    if (sanitized.apiKey) sanitized.apiKey = '[REDACTED]';
    return sanitized;
  }

  analyzeSchema(samples) {
    if (samples.length === 0) return {};

    const schema = {};
    const fieldStats = {};

    samples.forEach(doc => {
      this.extractFields(doc, '', fieldStats);
    });

    // Calculate field presence and types
    Object.keys(fieldStats).forEach(field => {
      schema[field] = {
        presence: (fieldStats[field].count / samples.length * 100).toFixed(1) + '%',
        types: [...new Set(fieldStats[field].types)],
        nullCount: fieldStats[field].nullCount,
        sampleValues: fieldStats[field].samples.slice(0, 3)
      };
    });

    return schema;
  }

  extractFields(obj, prefix, fieldStats) {
    Object.keys(obj).forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (!fieldStats[fullKey]) {
        fieldStats[fullKey] = {
          count: 0,
          types: [],
          nullCount: 0,
          samples: []
        };
      }

      fieldStats[fullKey].count++;

      if (value === null || value === undefined) {
        fieldStats[fullKey].nullCount++;
      } else {
        const type = Array.isArray(value) ? 'array' : typeof value;
        fieldStats[fullKey].types.push(type);

        if (fieldStats[fullKey].samples.length < 5) {
          fieldStats[fullKey].samples.push(value);
        }

        // Recurse for objects (but not arrays or dates)
        if (type === 'object' && !(value instanceof Date)) {
          this.extractFields(value, fullKey, fieldStats);
        }
      }
    });
  }

  analyzeDataQuality(samples) {
    const issues = [];
    const stats = {
      totalDocs: samples.length,
      issues: []
    };

    samples.forEach((doc, idx) => {
      // Check ID field
      if (!doc._id) {
        issues.push(`Document ${idx}: Missing _id field`);
      }

      // Check for mixed ID formats
      if (doc.id && doc._id) {
        issues.push(`Document ${idx}: Has both 'id' and '_id' fields`);
      }

      // Check for string booleans
      Object.keys(doc).forEach(key => {
        if (doc[key] === 'true' || doc[key] === 'false') {
          issues.push(`Document ${idx}: Field '${key}' is string boolean: "${doc[key]}"`);
        }
        if (doc[key] === 0 || doc[key] === 1) {
          // Could be boolean
          if (key.includes('is') || key.includes('has') || key.includes('active')) {
            issues.push(`Document ${idx}: Field '${key}' might be boolean stored as number: ${doc[key]}`);
          }
        }
      });

      // Check price formats
      if (doc.price || doc.pricing) {
        const priceField = doc.price || doc.pricing;
        if (typeof priceField === 'number') {
          issues.push(`Document ${idx}: Price is plain number, should be object`);
        } else if (priceField.current === undefined && priceField.selling === undefined) {
          issues.push(`Document ${idx}: Price object missing standard fields`);
        }
      }

      // Check rating formats
      if (doc.rating || doc.ratings) {
        const ratingField = doc.rating || doc.ratings;
        if (typeof ratingField === 'number') {
          issues.push(`Document ${idx}: Rating is plain number, should be object`);
        }
      }

      // Check image formats
      if (doc.image && !doc.images) {
        issues.push(`Document ${idx}: Using 'image' (singular) instead of 'images' (array)`);
      }
    });

    stats.issues = issues.slice(0, 50); // Limit to first 50 issues
    stats.totalIssues = issues.length;

    return stats;
  }

  async analyzeRelationships() {
    console.log('\n🔗 Analyzing relationships between collections...');

    const relationships = [];

    // Products → Stores
    await this.checkRelationship('products', 'storeId', 'stores', '_id', relationships);

    // Products → Categories
    await this.checkRelationship('products', 'categoryId', 'categories', '_id', relationships);
    await this.checkRelationship('products', 'category', 'categories', '_id', relationships);

    // Orders → Products
    await this.checkArrayRelationship('orders', 'items', 'productId', 'products', '_id', relationships);

    // Orders → Users
    await this.checkRelationship('orders', 'userId', 'users', '_id', relationships);

    // Reviews → Products
    await this.checkRelationship('reviews', 'productId', 'products', '_id', relationships);

    // Reviews → Stores
    await this.checkRelationship('reviews', 'storeId', 'stores', '_id', relationships);

    // Videos → Products
    await this.checkRelationship('videos', 'productId', 'products', '_id', relationships);

    // Videos → Stores
    await this.checkRelationship('videos', 'storeId', 'stores', '_id', relationships);

    // Projects → Stores
    await this.checkRelationship('projects', 'storeId', 'stores', '_id', relationships);

    // Offers → Stores
    await this.checkArrayRelationship('offers', 'applicableStores', null, 'stores', '_id', relationships);

    // Wishlists → Users
    await this.checkRelationship('wishlists', 'userId', 'users', '_id', relationships);

    // Wishlists → Products
    await this.checkArrayRelationship('wishlists', 'items', 'productId', 'products', '_id', relationships);

    // Carts → Users
    await this.checkRelationship('carts', 'userId', 'users', '_id', relationships);

    // Carts → Products
    await this.checkArrayRelationship('carts', 'items', 'productId', 'products', '_id', relationships);

    this.analysisResults.relationships = relationships;
    return relationships;
  }

  async checkRelationship(sourceCollection, sourceField, targetCollection, targetField, relationships) {
    if (!this.collections.includes(sourceCollection) || !this.collections.includes(targetCollection)) {
      return;
    }

    try {
      const source = this.db.collection(sourceCollection);
      const target = this.db.collection(targetCollection);

      const sourceDocs = await source.find({}).limit(100).toArray();
      const targetIds = await target.distinct(targetField);
      const targetIdSet = new Set(targetIds.map(id => id.toString()));

      let valid = 0;
      let invalid = 0;
      let missing = 0;
      const orphanedSamples = [];

      sourceDocs.forEach(doc => {
        const fieldValue = this.getNestedValue(doc, sourceField);

        if (!fieldValue) {
          missing++;
        } else {
          const fieldValueStr = fieldValue.toString();
          if (targetIdSet.has(fieldValueStr)) {
            valid++;
          } else {
            invalid++;
            if (orphanedSamples.length < 5) {
              orphanedSamples.push({
                sourceId: doc._id,
                [sourceField]: fieldValue
              });
            }
          }
        }
      });

      const relationship = {
        from: `${sourceCollection}.${sourceField}`,
        to: `${targetCollection}.${targetField}`,
        checked: sourceDocs.length,
        valid,
        invalid,
        missing,
        validPercent: sourceDocs.length > 0 ? (valid / sourceDocs.length * 100).toFixed(1) + '%' : '0%',
        orphanedSamples
      };

      relationships.push(relationship);

      console.log(`  ${sourceCollection}.${sourceField} → ${targetCollection}.${targetField}: ${relationship.validPercent} valid`);
      if (invalid > 0) {
        console.log(`    ⚠️  ${invalid} orphaned references found`);
      }

    } catch (error) {
      console.error(`  ❌ Error checking relationship:`, error.message);
    }
  }

  async checkArrayRelationship(sourceCollection, arrayField, itemField, targetCollection, targetField, relationships) {
    if (!this.collections.includes(sourceCollection) || !this.collections.includes(targetCollection)) {
      return;
    }

    try {
      const source = this.db.collection(sourceCollection);
      const target = this.db.collection(targetCollection);

      const sourceDocs = await source.find({}).limit(100).toArray();
      const targetIds = await target.distinct(targetField);
      const targetIdSet = new Set(targetIds.map(id => id.toString()));

      let valid = 0;
      let invalid = 0;
      let missing = 0;
      const orphanedSamples = [];

      sourceDocs.forEach(doc => {
        const arrayValue = this.getNestedValue(doc, arrayField);

        if (!Array.isArray(arrayValue)) {
          return;
        }

        arrayValue.forEach(item => {
          const fieldValue = itemField ? item[itemField] : item;

          if (!fieldValue) {
            missing++;
          } else {
            const fieldValueStr = fieldValue.toString();
            if (targetIdSet.has(fieldValueStr)) {
              valid++;
            } else {
              invalid++;
              if (orphanedSamples.length < 5) {
                orphanedSamples.push({
                  sourceId: doc._id,
                  value: fieldValue
                });
              }
            }
          }
        });
      });

      const relationship = {
        from: `${sourceCollection}.${arrayField}${itemField ? '.' + itemField : ''}`,
        to: `${targetCollection}.${targetField}`,
        checked: valid + invalid + missing,
        valid,
        invalid,
        missing,
        validPercent: (valid + invalid + missing) > 0 ? (valid / (valid + invalid + missing) * 100).toFixed(1) + '%' : '0%',
        orphanedSamples
      };

      relationships.push(relationship);

      console.log(`  ${sourceCollection}.${arrayField} → ${targetCollection}.${targetField}: ${relationship.validPercent} valid`);
      if (invalid > 0) {
        console.log(`    ⚠️  ${invalid} orphaned references found`);
      }

    } catch (error) {
      console.error(`  ❌ Error checking array relationship:`, error.message);
    }
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }

  async identifyMigrationNeeds() {
    console.log('\n🔄 Identifying migration needs...');

    const migrations = [];

    // Analyze each collection for migration needs
    for (const [collectionName, data] of Object.entries(this.analysisResults.collections)) {
      if (data.error) continue;

      const collectionMigrations = [];

      // Check for ID inconsistencies
      if (data.schema.id && data.schema._id) {
        collectionMigrations.push({
          type: 'ID_STANDARDIZATION',
          priority: 'HIGH',
          description: `Collection has both 'id' and '_id' fields`,
          script: `migrate-${collectionName}-id-standardization.js`
        });
      }

      // Check for price format issues
      if (data.schema.price || data.schema.pricing) {
        const priceIssues = data.quality.issues.filter(i => i.includes('Price'));
        if (priceIssues.length > 0) {
          collectionMigrations.push({
            type: 'PRICE_STRUCTURE',
            priority: 'MEDIUM',
            description: `Price format inconsistencies found`,
            affectedDocs: priceIssues.length,
            script: `migrate-${collectionName}-price-structure.js`
          });
        }
      }

      // Check for rating format issues
      if (data.schema.rating || data.schema.ratings) {
        const ratingIssues = data.quality.issues.filter(i => i.includes('Rating'));
        if (ratingIssues.length > 0) {
          collectionMigrations.push({
            type: 'RATING_STRUCTURE',
            priority: 'MEDIUM',
            description: `Rating format inconsistencies found`,
            affectedDocs: ratingIssues.length,
            script: `migrate-${collectionName}-rating-structure.js`
          });
        }
      }

      // Check for image format issues
      if (data.schema.image && !data.schema.images) {
        collectionMigrations.push({
          type: 'IMAGE_STRUCTURE',
          priority: 'LOW',
          description: `Using singular 'image' instead of 'images' array`,
          script: `migrate-${collectionName}-image-structure.js`
        });
      }

      // Check for string booleans
      const booleanIssues = data.quality.issues.filter(i => i.includes('boolean'));
      if (booleanIssues.length > 0) {
        collectionMigrations.push({
          type: 'BOOLEAN_NORMALIZATION',
          priority: 'LOW',
          description: `String or numeric booleans found`,
          affectedDocs: booleanIssues.length,
          script: `migrate-${collectionName}-boolean-normalization.js`
        });
      }

      if (collectionMigrations.length > 0) {
        migrations.push({
          collection: collectionName,
          migrations: collectionMigrations
        });
      }
    }

    this.analysisResults.migrations = migrations;
    return migrations;
  }

  generateReports() {
    console.log('\n📄 Generating reports...');

    // 1. Database Analysis Report
    this.generateDatabaseAnalysisReport();

    // 2. Relationship Analysis Report
    this.generateRelationshipAnalysisReport();

    // 3. Data Quality Report
    this.generateDataQualityReport();

    // 4. Migration Plan
    this.generateMigrationPlan();

    // 5. Summary Report
    this.generateSummaryReport();

    console.log('\n✅ All reports generated in:', REPORTS_DIR);
  }

  generateDatabaseAnalysisReport() {
    const report = [];
    report.push('# DATABASE ANALYSIS REPORT\n');
    report.push(`Generated: ${new Date().toISOString()}\n`);
    report.push(`Database: ${DATABASE_NAME}\n`);
    report.push(`Total Collections: ${Object.keys(this.analysisResults.collections).length}\n\n`);

    report.push('## Collections Overview\n\n');
    report.push('| Collection | Document Count | Indexes | Quality Issues |\n');
    report.push('|------------|---------------|---------|----------------|\n');

    for (const [name, data] of Object.entries(this.analysisResults.collections)) {
      if (data.error) {
        report.push(`| ${name} | ERROR | - | ${data.error} |\n`);
      } else {
        report.push(`| ${name} | ${data.count} | ${data.indexes?.length || 0} | ${data.quality?.totalIssues || 0} |\n`);
      }
    }

    report.push('\n## Detailed Collection Analysis\n\n');

    for (const [name, data] of Object.entries(this.analysisResults.collections)) {
      if (data.error) continue;

      report.push(`### ${name}\n\n`);
      report.push(`**Document Count:** ${data.count}\n\n`);

      report.push('**Schema:**\n\n');
      report.push('| Field | Presence | Types | Null Count | Sample Values |\n');
      report.push('|-------|----------|-------|------------|---------------|\n');

      for (const [field, info] of Object.entries(data.schema)) {
        const types = info.types.join(', ');
        const samples = JSON.stringify(info.sampleValues).substring(0, 50);
        report.push(`| ${field} | ${info.presence} | ${types} | ${info.nullCount} | ${samples}... |\n`);
      }

      report.push('\n**Indexes:**\n\n');
      report.push('```json\n');
      report.push(JSON.stringify(data.indexes, null, 2));
      report.push('\n```\n\n');

      if (data.samples.length > 0) {
        report.push('**Sample Document:**\n\n');
        report.push('```json\n');
        report.push(JSON.stringify(data.samples[0], null, 2));
        report.push('\n```\n\n');
      }

      report.push('---\n\n');
    }

    fs.writeFileSync(path.join(REPORTS_DIR, 'DATABASE_ANALYSIS_REPORT.md'), report.join(''));
    console.log('  ✅ DATABASE_ANALYSIS_REPORT.md');
  }

  generateRelationshipAnalysisReport() {
    const report = [];
    report.push('# RELATIONSHIP ANALYSIS REPORT\n\n');
    report.push(`Generated: ${new Date().toISOString()}\n\n`);

    report.push('## Relationship Summary\n\n');
    report.push('| From | To | Checked | Valid | Invalid | Missing | Valid % |\n');
    report.push('|------|-------|---------|-------|---------|---------|--------|\n');

    for (const rel of this.analysisResults.relationships) {
      report.push(`| ${rel.from} | ${rel.to} | ${rel.checked} | ${rel.valid} | ${rel.invalid} | ${rel.missing} | ${rel.validPercent} |\n`);
    }

    report.push('\n## Detailed Analysis\n\n');

    for (const rel of this.analysisResults.relationships) {
      report.push(`### ${rel.from} → ${rel.to}\n\n`);
      report.push(`- **Documents Checked:** ${rel.checked}\n`);
      report.push(`- **Valid References:** ${rel.valid} (${rel.validPercent})\n`);
      report.push(`- **Invalid References:** ${rel.invalid}\n`);
      report.push(`- **Missing References:** ${rel.missing}\n\n`);

      if (rel.orphanedSamples.length > 0) {
        report.push('**Orphaned Reference Samples:**\n\n');
        report.push('```json\n');
        report.push(JSON.stringify(rel.orphanedSamples, null, 2));
        report.push('\n```\n\n');
      }

      report.push('---\n\n');
    }

    fs.writeFileSync(path.join(REPORTS_DIR, 'RELATIONSHIP_ANALYSIS_REPORT.md'), report.join(''));
    console.log('  ✅ RELATIONSHIP_ANALYSIS_REPORT.md');
  }

  generateDataQualityReport() {
    const report = [];
    report.push('# DATA QUALITY REPORT\n\n');
    report.push(`Generated: ${new Date().toISOString()}\n\n`);

    report.push('## Quality Summary\n\n');
    report.push('| Collection | Total Docs Sampled | Total Issues |\n');
    report.push('|------------|-------------------|-------------|\n');

    for (const [name, data] of Object.entries(this.analysisResults.collections)) {
      if (data.error || !data.quality) continue;
      report.push(`| ${name} | ${data.quality.totalDocs} | ${data.quality.totalIssues} |\n`);
    }

    report.push('\n## Detailed Issues by Collection\n\n');

    for (const [name, data] of Object.entries(this.analysisResults.collections)) {
      if (data.error || !data.quality || data.quality.totalIssues === 0) continue;

      report.push(`### ${name}\n\n`);
      report.push(`**Total Issues:** ${data.quality.totalIssues}\n\n`);
      report.push('**Issues (showing first 50):**\n\n');

      data.quality.issues.forEach(issue => {
        report.push(`- ${issue}\n`);
      });

      report.push('\n---\n\n');
    }

    fs.writeFileSync(path.join(REPORTS_DIR, 'DATA_QUALITY_REPORT.md'), report.join(''));
    console.log('  ✅ DATA_QUALITY_REPORT.md');
  }

  generateMigrationPlan() {
    const report = [];
    report.push('# MIGRATION PLAN\n\n');
    report.push(`Generated: ${new Date().toISOString()}\n\n`);

    // Count migrations by priority
    const priorityCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    this.analysisResults.migrations.forEach(m => {
      m.migrations.forEach(mig => {
        priorityCounts[mig.priority]++;
      });
    });

    report.push('## Migration Summary\n\n');
    report.push(`- **HIGH Priority:** ${priorityCounts.HIGH}\n`);
    report.push(`- **MEDIUM Priority:** ${priorityCounts.MEDIUM}\n`);
    report.push(`- **LOW Priority:** ${priorityCounts.LOW}\n\n`);

    report.push('## Migrations by Collection\n\n');

    for (const collectionMigration of this.analysisResults.migrations) {
      report.push(`### ${collectionMigration.collection}\n\n`);

      for (const migration of collectionMigration.migrations) {
        report.push(`#### ${migration.type} (${migration.priority} Priority)\n\n`);
        report.push(`**Description:** ${migration.description}\n\n`);
        if (migration.affectedDocs) {
          report.push(`**Affected Documents:** ~${migration.affectedDocs}\n\n`);
        }
        report.push(`**Migration Script:** \`${migration.script}\`\n\n`);
        report.push('---\n\n');
      }
    }

    report.push('## Recommended Migration Order\n\n');
    report.push('1. **Phase 1 - HIGH Priority** (Critical for functionality)\n');
    report.push('   - ID Standardization migrations\n');
    report.push('   - Fix broken relationships\n\n');

    report.push('2. **Phase 2 - MEDIUM Priority** (Important for consistency)\n');
    report.push('   - Price structure migrations\n');
    report.push('   - Rating structure migrations\n\n');

    report.push('3. **Phase 3 - LOW Priority** (Nice to have)\n');
    report.push('   - Image structure migrations\n');
    report.push('   - Boolean normalization\n\n');

    fs.writeFileSync(path.join(REPORTS_DIR, 'MIGRATION_PLAN.md'), report.join(''));
    console.log('  ✅ MIGRATION_PLAN.md');
  }

  generateSummaryReport() {
    const report = [];
    report.push('# DATABASE AUDIT SUMMARY\n\n');
    report.push(`Generated: ${new Date().toISOString()}\n`);
    report.push(`Database: ${DATABASE_NAME}\n\n`);

    // Collections count
    const totalCollections = Object.keys(this.analysisResults.collections).length;
    const collectionsWithData = Object.values(this.analysisResults.collections).filter(c => !c.error && c.count > 0).length;
    const emptyCollections = Object.values(this.analysisResults.collections).filter(c => !c.error && c.count === 0).length;

    report.push('## Collections\n\n');
    report.push(`- **Total Collections:** ${totalCollections}\n`);
    report.push(`- **Collections with Data:** ${collectionsWithData}\n`);
    report.push(`- **Empty Collections:** ${emptyCollections}\n\n`);

    // Data quality
    const totalIssues = Object.values(this.analysisResults.collections)
      .filter(c => c.quality)
      .reduce((sum, c) => sum + (c.quality.totalIssues || 0), 0);

    report.push('## Data Quality\n\n');
    report.push(`- **Total Quality Issues:** ${totalIssues}\n\n`);

    // Relationships
    const totalRelationships = this.analysisResults.relationships.length;
    const brokenRelationships = this.analysisResults.relationships.filter(r => r.invalid > 0).length;

    report.push('## Relationships\n\n');
    report.push(`- **Total Relationships Checked:** ${totalRelationships}\n`);
    report.push(`- **Relationships with Issues:** ${brokenRelationships}\n\n`);

    // Migrations
    const totalMigrations = this.analysisResults.migrations.reduce((sum, m) => sum + m.migrations.length, 0);

    report.push('## Required Migrations\n\n');
    report.push(`- **Total Migrations Needed:** ${totalMigrations}\n`);
    report.push(`- **HIGH Priority:** ${this.analysisResults.migrations.reduce((sum, m) => sum + m.migrations.filter(mig => mig.priority === 'HIGH').length, 0)}\n`);
    report.push(`- **MEDIUM Priority:** ${this.analysisResults.migrations.reduce((sum, m) => sum + m.migrations.filter(mig => mig.priority === 'MEDIUM').length, 0)}\n`);
    report.push(`- **LOW Priority:** ${this.analysisResults.migrations.reduce((sum, m) => sum + m.migrations.filter(mig => mig.priority === 'LOW').length, 0)}\n\n`);

    // Critical issues
    report.push('## Critical Issues\n\n');

    const criticalIssues = [];

    // Find collections with broken relationships
    this.analysisResults.relationships.forEach(rel => {
      if (rel.invalid > 0) {
        criticalIssues.push(`⚠️  ${rel.from} → ${rel.to}: ${rel.invalid} broken references`);
      }
    });

    // Find collections with high data quality issues
    Object.entries(this.analysisResults.collections).forEach(([name, data]) => {
      if (data.quality && data.quality.totalIssues > 10) {
        criticalIssues.push(`⚠️  ${name}: ${data.quality.totalIssues} data quality issues`);
      }
    });

    if (criticalIssues.length === 0) {
      report.push('✅ No critical issues found!\n\n');
    } else {
      criticalIssues.forEach(issue => {
        report.push(`${issue}\n`);
      });
      report.push('\n');
    }

    // Recommendations
    report.push('## Recommendations\n\n');
    report.push('1. **Immediate Actions:**\n');
    report.push('   - Review and fix broken relationships\n');
    report.push('   - Execute HIGH priority migrations\n\n');

    report.push('2. **Short-term Actions:**\n');
    report.push('   - Execute MEDIUM priority migrations\n');
    report.push('   - Implement data validation on write operations\n\n');

    report.push('3. **Long-term Actions:**\n');
    report.push('   - Execute LOW priority migrations\n');
    report.push('   - Set up data quality monitoring\n');
    report.push('   - Implement schema validation\n\n');

    // Next steps
    report.push('## Next Steps\n\n');
    report.push('1. Review all generated reports in detail\n');
    report.push('2. Prioritize migrations based on business impact\n');
    report.push('3. Create backup of database before migrations\n');
    report.push('4. Execute migrations in test environment first\n');
    report.push('5. Monitor data quality after migrations\n\n');

    report.push('## Generated Reports\n\n');
    report.push('- `DATABASE_ANALYSIS_REPORT.md` - Detailed schema analysis\n');
    report.push('- `RELATIONSHIP_ANALYSIS_REPORT.md` - Relationship integrity analysis\n');
    report.push('- `DATA_QUALITY_REPORT.md` - Data quality issues\n');
    report.push('- `MIGRATION_PLAN.md` - Required migrations\n');
    report.push('- `SUMMARY.md` - This summary report\n\n');

    fs.writeFileSync(path.join(REPORTS_DIR, 'SUMMARY.md'), report.join(''));
    console.log('  ✅ SUMMARY.md');
  }

  async run() {
    try {
      await this.connect();

      // Phase 1: Get all collections
      await this.getAllCollections();

      // Phase 2: Analyze each collection
      console.log('\n=== PHASE 1: ANALYZING ALL COLLECTIONS ===');
      for (const collectionName of this.collections) {
        await this.analyzeCollection(collectionName);
      }

      // Phase 3: Analyze relationships
      console.log('\n=== PHASE 2: ANALYZING RELATIONSHIPS ===');
      await this.analyzeRelationships();

      // Phase 4: Identify migration needs
      console.log('\n=== PHASE 3: IDENTIFYING MIGRATION NEEDS ===');
      await this.identifyMigrationNeeds();

      // Phase 5: Generate reports
      console.log('\n=== PHASE 4: GENERATING REPORTS ===');
      this.generateReports();

      // Save raw data
      const rawDataPath = path.join(REPORTS_DIR, 'raw-analysis-data.json');
      fs.writeFileSync(rawDataPath, JSON.stringify(this.analysisResults, null, 2));
      console.log('  ✅ raw-analysis-data.json');

      console.log('\n✨ Database audit complete!\n');
      console.log('📁 Reports location:', REPORTS_DIR);
      console.log('\n📊 Quick Stats:');
      console.log(`   Collections: ${this.collections.length}`);
      console.log(`   Relationships: ${this.analysisResults.relationships.length}`);
      console.log(`   Migrations needed: ${this.analysisResults.migrations.reduce((sum, m) => sum + m.migrations.length, 0)}`);

    } catch (error) {
      console.error('\n❌ Error during audit:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Run the auditor
const auditor = new DatabaseAuditor();
auditor.run().catch(console.error);
