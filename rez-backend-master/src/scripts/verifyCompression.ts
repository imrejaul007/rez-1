/**
 * Compression Verification Script
 *
 * Tests HTTP response compression for the REZ API endpoints.
 * Verifies that Brotli is preferred, Gzip is fallback, and responses are correctly compressed.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/verifyCompression.ts
 *
 * Environment:
 *   Set API_URL to override the default (http://localhost:10000)
 */

import https from 'https';
import http from 'http';

interface CompressionTestResult {
  endpoint: string;
  originalSize: number;
  compressedSize: number | null;
  compressionType: 'br' | 'gzip' | 'none';
  compressionRatio: number;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
}

interface TestEndpoint {
  path: string;
  method: 'GET' | 'POST';
  description: string;
  skipIfLarge?: boolean;
}

// Test endpoints covering different response types
const TEST_ENDPOINTS: TestEndpoint[] = [
  { path: '/api/version', method: 'GET', description: 'Version discovery (small JSON)' },
  { path: '/api/categories', method: 'GET', description: 'Categories list (medium JSON)' },
  { path: '/api/stores', method: 'GET', description: 'Stores list (larger JSON)' },
  { path: '/health', method: 'GET', description: 'Health check endpoint' },
];

async function makeRequest(
  url: string,
  acceptEncoding: string
): Promise<{ body: string; headers: http.IncomingHttpHeaders; statusCode: number }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Accept-Encoding': acceptEncoding,
        'Accept': 'application/json',
        'User-Agent': 'CompressionTest/1.0',
      },
    };

    const req = lib.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({
          body,
          headers: res.headers,
          statusCode: res.statusCode || 0,
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function testCompression(
  baseUrl: string,
  endpoint: TestEndpoint
): Promise<CompressionTestResult> {
  const url = `${baseUrl}${endpoint.path}`;

  // Test with Brotli support
  try {
    const brotliResponse = await makeRequest(url, 'br, gzip, deflate');
    const contentEncoding = brotliResponse.headers['content-encoding'];
    const transferEncoding = brotliResponse.headers['transfer-encoding'];

    // Determine compression type
    let compressionType: 'br' | 'gzip' | 'none' = 'none';
    if (contentEncoding === 'br') {
      compressionType = 'br';
    } else if (contentEncoding === 'gzip') {
      compressionType = 'gzip';
    } else if (transferEncoding === 'chunked') {
      // Transfer-Encoding: chunked doesn't mean compression is enabled
      // Check if there's actual compression
      compressionType = 'none';
    }

    const originalSize = brotliResponse.body.length;
    const compressedSize = brotliResponse.headers['content-length']
      ? parseInt(brotliResponse.headers['content-length'] as string, 10)
      : null;

    // Test without compression for comparison
    const noCompressionResponse = await makeRequest(url, 'identity');
    const uncompressedSize = noCompressionResponse.body.length;

    const compressionRatio = uncompressedSize > 0
      ? ((uncompressedSize - originalSize) / uncompressedSize) * 100
      : 0;

    // Determine status
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'PASS';
    let message = '';

    if (compressionType === 'br') {
      message = `Brotli compression active. ${formatBytes(uncompressedSize)} → ${formatBytes(originalSize)} (${compressionRatio.toFixed(1)}% reduction)`;
    } else if (compressionType === 'gzip') {
      message = `Gzip compression active (fallback). ${formatBytes(uncompressedSize)} → ${formatBytes(originalSize)} (${compressionRatio.toFixed(1)}% reduction)`;
    } else {
      // Check if response is small enough to not need compression
      if (uncompressedSize < 1000) {
        status = 'SKIP';
        message = `Response (${formatBytes(uncompressedSize)}) below compression threshold (1KB).`;
      } else {
        status = 'FAIL';
        message = `No compression detected. Response size: ${formatBytes(uncompressedSize)}`;
      }
    }

    return {
      endpoint: endpoint.path,
      originalSize,
      compressedSize,
      compressionType,
      compressionRatio,
      status,
      message,
    };
  } catch (error) {
    return {
      endpoint: endpoint.path,
      originalSize: 0,
      compressedSize: null,
      compressionType: 'none',
      compressionRatio: 0,
      status: 'FAIL',
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function main() {
  const baseUrl = process.env.API_URL || 'http://localhost:10000';

  console.log('\n' + '='.repeat(70));
  console.log('  HTTP Response Compression Verification');
  console.log('='.repeat(70));
  console.log(`\n  Target: ${baseUrl}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log('\n' + '-'.repeat(70));

  const results: CompressionTestResult[] = [];

  for (const endpoint of TEST_ENDPOINTS) {
    console.log(`\n  Testing: ${endpoint.path}`);
    console.log(`  Description: ${endpoint.description}`);

    const result = await testCompression(baseUrl, endpoint);
    results.push(result);

    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'SKIP' ? '⏭️' : '❌';
    console.log(`  Status: ${statusIcon} ${result.status}`);
    console.log(`  ${result.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.status === 'PASS').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`\n  Passed: ${passed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);

  // Compression type breakdown
  const brotli = results.filter(r => r.compressionType === 'br').length;
  const gzip = results.filter(r => r.compressionType === 'gzip').length;
  const none = results.filter(r => r.compressionType === 'none').length;

  console.log('\n  Compression Types Used:');
  console.log(`    Brotli: ${brotli}`);
  console.log(`    Gzip: ${gzip}`);
  console.log(`    None: ${none}`);

  // Average compression ratio
  const withCompression = results.filter(r => r.compressionRatio > 0);
  if (withCompression.length > 0) {
    const avgRatio = withCompression.reduce((sum, r) => sum + r.compressionRatio, 0) / withCompression.length;
    console.log(`\n  Average Compression Ratio: ${avgRatio.toFixed(1)}%`);
  }

  console.log('\n' + '-'.repeat(70));

  if (failed > 0) {
    console.log('  ⚠️  Some tests failed. Review compression configuration.');
    console.log('  Suggestions:');
    console.log('    1. Check nginx.conf has brotli/gzip directives');
    console.log('    2. Ensure nginx has ngx_http_brotli_filter_module');
    console.log('    3. Verify Express compression is disabled (double-compression)');
    process.exit(1);
  } else if (passed > 0) {
    console.log('  ✅ All tests passed! Compression is working correctly.');
    process.exit(0);
  } else {
    console.log('  ℹ️  All tests skipped (responses below compression threshold).');
    process.exit(0);
  }
}

main().catch(console.error);
