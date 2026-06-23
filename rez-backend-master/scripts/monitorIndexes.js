/**
 * MongoDB Index Monitoring Script
 *
 * This script monitors index usage, performance, and provides optimization recommendations.
 *
 * Usage:
 *   mongosh "mongodb://localhost:27017/yourdb" scripts/monitorIndexes.js
 *
 * Features:
 * - Index size analysis
 * - Usage statistics
 * - Performance metrics
 * - Unused index detection
 * - Optimization recommendations
 */

// Helper function for logging
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  print(`[${timestamp}] [${type}] ${message}`);
}

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Helper function to format percentage
function formatPercent(value) {
  return (value * 100).toFixed(2) + '%';
}

// Get detailed index statistics
function getIndexStats(collectionName) {
  if (!db[collectionName]) return null;

  try {
    const stats = db[collectionName].stats();
    const indexes = db[collectionName].getIndexes();
    const indexStats = db[collectionName].aggregate([
      { $indexStats: {} }
    ]).toArray();

    return {
      collection: collectionName,
      totalIndexes: indexes.length,
      indexes: indexes,
      indexSizes: stats.indexSizes || {},
      totalIndexSize: stats.totalIndexSize || 0,
      storageSize: stats.storageSize || 0,
      count: stats.count || 0,
      avgObjSize: stats.avgObjSize || 0,
      indexStats: indexStats
    };
  } catch (error) {
    log(`Error getting stats for ${collectionName}: ${error.message}`, 'ERROR');
    return null;
  }
}

// Analyze index usage
function analyzeIndexUsage(collectionName, stats) {
  if (!stats || !stats.indexStats) return;

  log(`\n--- ${collectionName.toUpperCase()} Index Usage ---`);

  const unusedIndexes = [];
  const lowUsageIndexes = [];

  stats.indexStats.forEach(indexStat => {
    const indexName = indexStat.name;
    const accesses = indexStat.accesses ? indexStat.accesses.ops : 0;
    const since = indexStat.accesses ? indexStat.accesses.since : null;

    log(`\nIndex: ${indexName}`);
    log(`  Accesses: ${accesses}`);
    if (since) {
      log(`  Since: ${since}`);
    }

    // Detect unused indexes (skip _id)
    if (accesses === 0 && indexName !== '_id_') {
      unusedIndexes.push(indexName);
      log(`  ⚠ WARNING: Unused index detected!`, 'WARN');
    } else if (accesses > 0 && accesses < 10 && indexName !== '_id_') {
      lowUsageIndexes.push(indexName);
      log(`  ℹ INFO: Low usage index (${accesses} accesses)`, 'INFO');
    }
  });

  return { unusedIndexes, lowUsageIndexes };
}

// Analyze index size efficiency
function analyzeIndexSize(collectionName, stats) {
  if (!stats) return;

  log(`\n--- ${collectionName.toUpperCase()} Size Analysis ---`);

  const totalSize = stats.storageSize;
  const indexSize = stats.totalIndexSize;
  const ratio = totalSize > 0 ? indexSize / totalSize : 0;

  log(`Collection size: ${formatBytes(totalSize)}`);
  log(`Total index size: ${formatBytes(indexSize)}`);
  log(`Index to data ratio: ${formatPercent(ratio)}`);

  if (ratio > 0.5) {
    log(`⚠ WARNING: Index size is ${formatPercent(ratio)} of collection size!`, 'WARN');
    log(`  Consider reviewing if all indexes are necessary.`, 'WARN');
  } else if (ratio > 0.3) {
    log(`ℹ INFO: Index size is ${formatPercent(ratio)} of collection size.`, 'INFO');
  } else {
    log(`✓ Index size is healthy at ${formatPercent(ratio)} of collection size.`, 'SUCCESS');
  }

  // Individual index sizes
  log(`\nIndividual index sizes:`);
  const indexSizes = stats.indexSizes || {};
  Object.keys(indexSizes).sort((a, b) => indexSizes[b] - indexSizes[a]).forEach(indexName => {
    const size = indexSizes[indexName];
    const sizePercent = totalSize > 0 ? (size / totalSize) * 100 : 0;
    log(`  ${indexName}: ${formatBytes(size)} (${sizePercent.toFixed(2)}%)`);
  });
}

// Generate optimization recommendations
function generateRecommendations(collectionName, unusedIndexes, lowUsageIndexes, stats) {
  log(`\n--- ${collectionName.toUpperCase()} Recommendations ---`);

  const recommendations = [];

  // Unused index recommendations
  if (unusedIndexes.length > 0) {
    recommendations.push({
      type: 'UNUSED_INDEXES',
      severity: 'MEDIUM',
      message: `Found ${unusedIndexes.length} unused index(es)`,
      details: unusedIndexes,
      action: 'Consider dropping these indexes to save space and improve write performance'
    });
  }

  // Low usage index recommendations
  if (lowUsageIndexes.length > 0) {
    recommendations.push({
      type: 'LOW_USAGE_INDEXES',
      severity: 'LOW',
      message: `Found ${lowUsageIndexes.length} low-usage index(es)`,
      details: lowUsageIndexes,
      action: 'Monitor these indexes and consider dropping if usage remains low'
    });
  }

  // Size-based recommendations
  if (stats) {
    const ratio = stats.totalIndexSize / stats.storageSize;
    if (ratio > 0.5) {
      recommendations.push({
        type: 'HIGH_INDEX_RATIO',
        severity: 'HIGH',
        message: `Index to data ratio is ${formatPercent(ratio)}`,
        action: 'Review index strategy - this ratio is very high'
      });
    }

    // Check for duplicate or redundant indexes
    const indexes = stats.indexes || [];
    const indexKeys = indexes.map(idx => JSON.stringify(idx.key));
    const duplicates = indexKeys.filter((key, index) => indexKeys.indexOf(key) !== index);

    if (duplicates.length > 0) {
      recommendations.push({
        type: 'DUPLICATE_INDEXES',
        severity: 'HIGH',
        message: 'Duplicate indexes detected',
        action: 'Remove duplicate indexes immediately'
      });
    }
  }

  // Display recommendations
  if (recommendations.length === 0) {
    log('✓ No optimization recommendations at this time.', 'SUCCESS');
  } else {
    recommendations.forEach((rec, index) => {
      log(`\n${index + 1}. [${rec.severity}] ${rec.message}`);
      log(`   Action: ${rec.action}`);
      if (rec.details) {
        log(`   Details: ${JSON.stringify(rec.details)}`);
      }
    });
  }

  return recommendations;
}

// Get database-wide statistics
function getDatabaseStats() {
  const dbStats = db.stats();
  log('\n--- Database Overview ---');
  log(`Database: ${db.getName()}`);
  log(`Total size: ${formatBytes(dbStats.dataSize)}`);
  log(`Storage size: ${formatBytes(dbStats.storageSize)}`);
  log(`Index size: ${formatBytes(dbStats.indexSize)}`);
  log(`Collections: ${dbStats.collections}`);
  log(`Indexes: ${dbStats.indexes}`);
  log(`Average object size: ${formatBytes(dbStats.avgObjSize)}`);
}

// Main execution
log('='.repeat(80));
log('MongoDB Index Monitoring & Analysis');
log('='.repeat(80));

const startTime = new Date();

try {
  // Display database overview
  getDatabaseStats();

  // Collections to monitor
  const collections = ['products', 'stores', 'videos', 'events', 'offers', 'categories'];

  const overallStats = {
    totalIndexes: 0,
    totalIndexSize: 0,
    totalUnused: 0,
    totalLowUsage: 0,
    recommendations: []
  };

  // Analyze each collection
  collections.forEach(collectionName => {
    const stats = getIndexStats(collectionName);
    if (!stats) return;

    log('\n' + '='.repeat(80));
    log(`Collection: ${collectionName.toUpperCase()}`);
    log('='.repeat(80));

    // Basic statistics
    log(`\n--- Basic Statistics ---`);
    log(`Documents: ${stats.count.toLocaleString()}`);
    log(`Total indexes: ${stats.totalIndexes}`);
    log(`Storage size: ${formatBytes(stats.storageSize)}`);
    log(`Index size: ${formatBytes(stats.totalIndexSize)}`);
    log(`Average document size: ${formatBytes(stats.avgObjSize)}`);

    // Analyze index usage
    const usageAnalysis = analyzeIndexUsage(collectionName, stats);

    // Analyze index sizes
    analyzeIndexSize(collectionName, stats);

    // Generate recommendations
    const recommendations = generateRecommendations(
      collectionName,
      usageAnalysis?.unusedIndexes || [],
      usageAnalysis?.lowUsageIndexes || [],
      stats
    );

    // Update overall stats
    overallStats.totalIndexes += stats.totalIndexes;
    overallStats.totalIndexSize += stats.totalIndexSize;
    overallStats.totalUnused += (usageAnalysis?.unusedIndexes || []).length;
    overallStats.totalLowUsage += (usageAnalysis?.lowUsageIndexes || []).length;
    overallStats.recommendations.push(...recommendations);
  });

  // Overall summary
  log('\n' + '='.repeat(80));
  log('Overall Summary');
  log('='.repeat(80));
  log(`Total collections analyzed: ${collections.length}`);
  log(`Total indexes: ${overallStats.totalIndexes}`);
  log(`Total index size: ${formatBytes(overallStats.totalIndexSize)}`);
  log(`Unused indexes: ${overallStats.totalUnused}`);
  log(`Low usage indexes: ${overallStats.totalLowUsage}`);
  log(`Total recommendations: ${overallStats.recommendations.length}`);

  // Priority recommendations
  if (overallStats.recommendations.length > 0) {
    log('\n--- Priority Actions ---');
    const highPriority = overallStats.recommendations.filter(r => r.severity === 'HIGH');
    const mediumPriority = overallStats.recommendations.filter(r => r.severity === 'MEDIUM');

    if (highPriority.length > 0) {
      log(`\nHIGH Priority (${highPriority.length}):`);
      highPriority.forEach((rec, i) => {
        log(`${i + 1}. ${rec.message} - ${rec.action}`);
      });
    }

    if (mediumPriority.length > 0) {
      log(`\nMEDIUM Priority (${mediumPriority.length}):`);
      mediumPriority.forEach((rec, i) => {
        log(`${i + 1}. ${rec.message} - ${rec.action}`);
      });
    }
  }

  const endTime = new Date();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  log(`\nMonitoring completed in ${duration} seconds`);

  // Health score
  let healthScore = 100;
  healthScore -= overallStats.totalUnused * 5;
  healthScore -= overallStats.totalLowUsage * 2;
  healthScore -= highPriority.length * 10;
  healthScore = Math.max(0, Math.min(100, healthScore));

  log(`\n--- Index Health Score: ${healthScore}/100 ---`);
  if (healthScore >= 90) {
    log('✓ Excellent! Your indexes are well optimized.', 'SUCCESS');
  } else if (healthScore >= 70) {
    log('ℹ Good, but there is room for improvement.', 'INFO');
  } else if (healthScore >= 50) {
    log('⚠ Fair. Consider implementing recommendations.', 'WARN');
  } else {
    log('✗ Poor. Immediate optimization recommended.', 'ERROR');
  }

  log('\n' + '='.repeat(80));

} catch (error) {
  log(`\n✗ FATAL ERROR: ${error.message}`, 'ERROR');
  throw error;
}
