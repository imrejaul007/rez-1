# Security Testing Guide - Product Routes

## Prerequisites

- Backend running on `http://localhost:5001`
- Valid merchant authentication token
- curl or Postman installed
- Access to .env file

---

## Test 1: Rate Limiting (Production Mode)

### Setup
```bash
# Edit .env
DISABLE_RATE_LIMIT=false

# Restart backend
npm run dev
```

### Test GET Rate Limit (100/min)
```bash
# Should succeed for first 100 requests
for i in {1..100}; do
  echo "Request $i"
  curl -s http://localhost:5001/api/products \
    -H "Authorization: Bearer YOUR_TOKEN" | jq .success
done

# Requests 101-105 should return 429
for i in {101..105}; do
  echo "Request $i (should fail)"
  curl -s http://localhost:5001/api/products \
    -H "Authorization: Bearer YOUR_TOKEN" | jq .
done
```

**Expected:**
- First 100 requests: `"success": true`
- Requests 101+: Status 429, `"success": false`, `"retryAfter": 60`

### Test POST Rate Limit (30/min)
```bash
# Should succeed for first 30 requests
for i in {1..30}; do
  echo "Request $i"
  curl -s -X POST http://localhost:5001/api/products \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Product '$i'","price":100,"inventory":{"stock":10}}' \
    | jq .success
done

# Requests 31-35 should return 429
for i in {31..35}; do
  echo "Request $i (should fail)"
  curl -s -X POST http://localhost:5001/api/products \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Product '$i'","price":100,"inventory":{"stock":10}}' \
    | jq .
done
```

**Expected:**
- First 30 requests: Success (or validation errors if incomplete data)
- Requests 31+: Status 429, rate limit message

### Test DELETE Rate Limit (10/min)
```bash
# Create 15 test products first, then try to delete them
for i in {1..15}; do
  echo "Delete attempt $i"
  curl -s -X DELETE http://localhost:5001/api/products/PRODUCT_ID_$i \
    -H "Authorization: Bearer YOUR_TOKEN" | jq .
done
```

**Expected:**
- First 10 requests: Success or 404
- Requests 11+: Status 429

### Test BULK Rate Limit (5/min)
```bash
# Try 7 bulk operations
for i in {1..7}; do
  echo "Bulk operation $i"
  curl -s -X POST http://localhost:5001/api/products/bulk-action \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"action":"activate","productIds":["123","456"]}' \
    | jq .
done
```

**Expected:**
- First 5 requests: Success or validation error
- Requests 6+: Status 429

---

## Test 2: Input Sanitization

### Test XSS Protection - Script Tags
```bash
curl -X POST http://localhost:5001/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product <script>alert(\"XSS\")</script>Name",
    "description": "Description <script>alert(\"XSS\")</script>",
    "shortDescription": "Short <script>alert(\"XSS\")</script>",
    "price": 100,
    "inventory": {"stock": 10}
  }' | jq .
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "name": "Product Name",  // Script removed
    "description": "Description ",  // Script removed
    "shortDescription": "Short "  // Script removed
  }
}
```

### Test XSS Protection - Event Handlers
```bash
curl -X POST http://localhost:5001/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product <img src=x onerror=\"alert(1)\">",
    "description": "<div onclick=\"alert(1)\">Click me</div>",
    "price": 100,
    "inventory": {"stock": 10}
  }' | jq .
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "name": "Product ",  // Event handler removed
    "description": "<div>Click me</div>"  // onclick removed
  }
}
```

### Test XSS Protection - Iframe
```bash
curl -X POST http://localhost:5001/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "description": "Description <iframe src=\"http://evil.com\"></iframe>",
    "price": 100,
    "inventory": {"stock": 10}
  }' | jq .
```

**Expected Output:**
```json
{
  "data": {
    "description": "Description "  // Iframe removed
  }
}
```

### Test Length Limits
```bash
# Product name > 200 chars
curl -X POST http://localhost:5001/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "'"$(python3 -c "print('A' * 250)")"'",
    "price": 100,
    "inventory": {"stock": 10}
  }' | jq '.data.name | length'
```

**Expected Output:**
```
200  // Truncated to 200 chars
```

### Test Meta Title/Description Limits
```bash
curl -X POST http://localhost:5001/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "metaTitle": "'"$(python3 -c "print('A' * 100)")"'",
    "metaDescription": "'"$(python3 -c "print('B' * 200)")"'",
    "price": 100,
    "inventory": {"stock": 10}
  }' | jq '.data | {metaTitleLen: (.metaTitle | length), metaDescLen: (.metaDescription | length)}'
```

**Expected Output:**
```json
{
  "metaTitleLen": 60,     // Truncated
  "metaDescLen": 160      // Truncated
}
```

### Test Tag Sanitization
```bash
curl -X POST http://localhost:5001/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "tags": ["valid-tag", "", "  spaces  ", "<script>evil</script>", "'"$(python3 -c "print('A' * 60)")"'"],
    "price": 100,
    "inventory": {"stock": 10}
  }' | jq '.data.tags'
```

**Expected Output:**
```json
[
  "valid-tag",
  "spaces",      // Trimmed
  "",            // Script removed
  "AAAA..."      // Truncated to 50 chars
]
```

---

## Test 3: Development Mode

### Setup
```bash
# Edit .env
DISABLE_RATE_LIMIT=true

# Restart backend
npm run dev
```

### Test Unlimited Requests
```bash
# Should NOT rate limit even with 200 requests
for i in {1..200}; do
  echo "Request $i"
  curl -s http://localhost:5001/api/products \
    -H "Authorization: Bearer YOUR_TOKEN" | jq .success
done
```

**Expected:**
- All 200 requests should succeed (or fail with auth/validation errors, but NOT 429)

---

## Test 4: Rate Limit Headers

### Check Response Headers
```bash
curl -I http://localhost:5001/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Headers (when rate limiting enabled):**
```
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 1701234567
```

---

## Test 5: Logging

### Monitor Rate Limit Violations
```bash
# In one terminal, tail logs
tail -f logs/app.log | grep "RATE LIMIT"

# In another terminal, trigger rate limit
for i in {1..105}; do
  curl -s http://localhost:5001/api/products \
    -H "Authorization: Bearer YOUR_TOKEN" > /dev/null
done
```

**Expected Log Output:**
```
[RATE LIMIT] Product GET exceeded: IP ::ffff:127.0.0.1, Path: /api/products
[RATE LIMIT] Product GET exceeded: IP ::ffff:127.0.0.1, Path: /api/products
...
```

---

## Test 6: Combined Security Test

### Test All Security Features Together
```bash
curl -X POST http://localhost:5001/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert(1)</script>My Product<img src=x onerror=alert(2)>",
    "description": "Great product <iframe src=evil.com></iframe> with <script>bad stuff</script>",
    "shortDescription": "Short desc <div onclick=alert(3)>click</div>",
    "tags": ["tag1", "", "  tag2  ", "<script>evil</script>", "'"$(python3 -c "print('A' * 60)")"'"],
    "metaTitle": "'"$(python3 -c "print('A' * 100)")"'",
    "metaDescription": "'"$(python3 -c "print('B' * 200)")"'",
    "price": 100,
    "inventory": {"stock": 10}
  }' | jq .
```

**Expected:**
- Name: Scripts and event handlers removed
- Description: Dangerous HTML removed
- Tags: Empty removed, whitespace trimmed, long tag truncated
- MetaTitle: Truncated to 60 chars
- MetaDescription: Truncated to 160 chars

---

## Test 7: Update Route Sanitization

### Test PUT Request Sanitization
```bash
curl -X PUT http://localhost:5001/api/products/PRODUCT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated <script>alert(1)</script>Product",
    "description": "Updated <iframe src=evil.com></iframe> description"
  }' | jq .
```

**Expected:**
- Same sanitization as POST
- Scripts and dangerous HTML removed

---

## Test 8: Performance Test

### Measure Sanitization Overhead
```bash
# Without sanitization (comment out middleware)
time for i in {1..100}; do
  curl -s -X POST http://localhost:5001/api/products \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","price":100,"inventory":{"stock":10}}' > /dev/null
done

# With sanitization (uncomment middleware)
time for i in {1..100}; do
  curl -s -X POST http://localhost:5001/api/products \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","price":100,"inventory":{"stock":10}}' > /dev/null
done
```

**Expected:**
- Overhead should be < 10ms per request

---

## Checklist

### Rate Limiting Tests
- [ ] GET requests rate limited at 100/min
- [ ] POST/PUT requests rate limited at 30/min
- [ ] DELETE requests rate limited at 10/min
- [ ] BULK requests rate limited at 5/min
- [ ] Rate limit headers present in response
- [ ] Rate limit violations logged
- [ ] Development mode bypasses rate limiting

### Sanitization Tests
- [ ] Script tags removed
- [ ] Event handlers removed
- [ ] Iframe tags removed
- [ ] JavaScript protocols removed
- [ ] Product name truncated at 200 chars
- [ ] Meta title truncated at 60 chars
- [ ] Meta description truncated at 160 chars
- [ ] Tags truncated at 50 chars each
- [ ] Empty tags filtered out
- [ ] Whitespace trimmed from tags
- [ ] Null bytes removed

### Integration Tests
- [ ] Sanitization applied before validation
- [ ] Rate limiting applied before sanitization
- [ ] Authentication required for all routes
- [ ] No breaking changes to existing functionality

---

## Troubleshooting

### Issue: Rate limiting not working
**Solution:** Check `DISABLE_RATE_LIMIT` in .env is set to `false`

### Issue: All requests return 429
**Solution:** Wait 60 seconds for rate limit window to reset

### Issue: Sanitization not working
**Solution:** Verify middleware is imported and applied in correct order

### Issue: Headers not showing rate limit info
**Solution:** Ensure `DISABLE_RATE_LIMIT=false` in production

---

## Automated Test Script

Save as `test-security.sh`:
```bash
#!/bin/bash

TOKEN="YOUR_TOKEN_HERE"
BASE_URL="http://localhost:5001/api/products"

echo "=== Testing Rate Limiting ==="
echo "Testing GET rate limit (100/min)..."
for i in {1..105}; do
  response=$(curl -s -w "\n%{http_code}" $BASE_URL -H "Authorization: Bearer $TOKEN")
  status=$(echo "$response" | tail -n1)
  if [ $i -gt 100 ] && [ $status -eq 429 ]; then
    echo "✓ Rate limit working (request $i returned 429)"
    break
  fi
done

echo ""
echo "=== Testing Sanitization ==="
echo "Testing XSS protection..."
response=$(curl -s -X POST $BASE_URL \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test <script>alert(1)</script>","price":100,"inventory":{"stock":10}}')

if echo "$response" | grep -q "Test " && ! echo "$response" | grep -q "<script>"; then
  echo "✓ XSS protection working"
else
  echo "✗ XSS protection failed"
fi

echo ""
echo "All tests complete!"
```

Run with:
```bash
chmod +x test-security.sh
./test-security.sh
```
