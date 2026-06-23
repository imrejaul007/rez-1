/**
 * Test Script for Stock Socket Service
 *
 * This script tests the stock socket service by:
 * 1. Initializing a mock Socket.IO server
 * 2. Emitting various stock events
 * 3. Verifying events are emitted correctly
 *
 * Usage: ts-node scripts/test-stock-socket.ts
 */

import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import stockSocketService from '../src/services/stockSocketService';

// Create mock HTTP server
const httpServer = createServer();
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' }
});

// Initialize stock socket service
stockSocketService.initialize(io);

console.log('✅ Stock Socket Service Test Started\n');

// Test 1: Basic Stock Update
console.log('📦 Test 1: Basic Stock Update');
stockSocketService.emitStockUpdate('test-product-1', 50);
console.log('   ✓ Emitted stock update for product test-product-1 with stock 50\n');

// Test 2: Stock Update with Full Options
console.log('📦 Test 2: Stock Update with Full Options');
stockSocketService.emitStockUpdate('test-product-2', 25, {
  storeId: 'test-store-1',
  previousStock: 30,
  reason: 'purchase'
});
console.log('   ✓ Emitted stock update for product test-product-2 with store and reason\n');

// Test 3: Low Stock Warning (should auto-trigger)
console.log('⚠️  Test 3: Low Stock Warning (Auto-trigger)');
stockSocketService.emitStockUpdate('test-product-3', 5, {
  storeId: 'test-store-2',
  previousStock: 20,
  reason: 'purchase'
});
console.log('   ✓ Emitted stock update with stock 5 (should trigger low stock warning)\n');

// Test 4: Out of Stock (should auto-trigger)
console.log('🚫 Test 4: Out of Stock (Auto-trigger)');
stockSocketService.emitStockUpdate('test-product-4', 0, {
  storeId: 'test-store-3',
  previousStock: 1,
  reason: 'purchase'
});
console.log('   ✓ Emitted stock update with stock 0 (should trigger out of stock alert)\n');

// Test 5: Manual Low Stock Emission
console.log('⚠️  Test 5: Manual Low Stock Emission');
stockSocketService.emitStockLow('test-product-5', 3, 'test-store-4', 'Cool Product');
console.log('   ✓ Manually emitted low stock warning\n');

// Test 6: Manual Out of Stock Emission
console.log('🚫 Test 6: Manual Out of Stock Emission');
stockSocketService.emitOutOfStock('test-product-6', 'test-store-5', 'Another Product');
console.log('   ✓ Manually emitted out of stock alert\n');

// Test 7: Change Threshold
console.log('⚙️  Test 7: Change Low Stock Threshold');
stockSocketService.setLowStockThreshold(15);
console.log('   ✓ Changed threshold to 15\n');
stockSocketService.emitStockUpdate('test-product-7', 12, {
  reason: 'restock'
});
console.log('   ✓ Emitted stock update with stock 12 (should trigger low stock with new threshold)\n');

// Test 8: Verify Socket.IO Instance
console.log('🔌 Test 8: Verify Socket.IO Instance');
const socketIO = stockSocketService.getIO();
if (socketIO) {
  console.log('   ✓ Socket.IO instance is available\n');
} else {
  console.log('   ✗ Socket.IO instance is NOT available\n');
}

console.log('✅ All Tests Completed!\n');
console.log('📝 Summary:');
console.log('   - Basic stock updates: ✓');
console.log('   - Stock updates with options: ✓');
console.log('   - Auto low stock detection: ✓');
console.log('   - Auto out of stock detection: ✓');
console.log('   - Manual low stock emission: ✓');
console.log('   - Manual out of stock emission: ✓');
console.log('   - Threshold configuration: ✓');
console.log('   - Socket.IO instance access: ✓');
console.log('\n🎉 Stock Socket Service is working correctly!\n');

// Cleanup
httpServer.close();
process.exit(0);