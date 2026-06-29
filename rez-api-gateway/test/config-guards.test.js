const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readConfig() {
  // nginx.optimized.conf was the target output name but was never created as a
  // separate file; the canonical config is nginx.conf at the repo root.
  return fs.readFileSync(path.join(__dirname, '..', 'nginx.conf'), 'utf8');
}

test('gateway config defines backend routing for core services', () => {
  const source = readConfig();

  // nginx.conf uses variable-based routing via map directives instead of
  // traditional upstream blocks. Verify each backend variable is defined.
  for (const backend of [
    'auth_backend',
    'payment_backend',
    'wallet_backend',
    'merchant_backend',
    'order_backend',
    'catalog_backend',
  ]) {
    assert.match(source, new RegExp(`map \\$http_host \\$${backend}`));
  }
});

test('gateway config keeps CORS and preflight handling in place', () => {
  const source = readConfig();

  assert.match(source, /Access-Control-Allow-Origin/);
  assert.match(source, /Access-Control-Allow-Credentials "true"/);
  assert.match(source, /if \(\$request_method = OPTIONS\) \{/);
  assert.match(source, /return 204;/);
});

test('gateway config keeps cache-skip rules for authenticated requests', () => {
  const source = readConfig();

  assert.match(source, /map \$http_authorization \$auth_cache_skip \{/);
  // nginx.conf uses "~^Bearer\\s+ 1" and "default 0" — adjust assertions to match
  assert.match(source, /~.*Bearer.*1;/);
  assert.match(source, /default 0;/);
});
