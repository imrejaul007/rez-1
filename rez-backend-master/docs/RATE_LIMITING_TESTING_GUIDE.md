# Rate Limiting Testing Guide

## Quick Start Testing

### Prerequisites
1. Ensure backend is running: `npm run dev`
2. Have curl or Postman installed
3. Note: Rate limiting can be disabled for testing by setting `DISABLE_RATE_LIMIT=true` in `.env`

## Test Suite

### Test 1: Login Rate Limit (5 attempts per 15 minutes)

#### Setup
Create a test script: `test-login-rate-limit.sh`

```bash
#!/bin/bash

echo "=== Testing Login Rate Limit ==="
echo "Expected: First 5 attempts work, 6th should return 429"
echo ""

for i in {1..6}; do
  echo "Attempt $i:"
  response=$(curl -s -w "\nHTTP Status: %{http_code}\n" -X POST \
    http://localhost:5001/api/merchant/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}')

  echo "$response"
  echo "---"
  sleep 1
done

echo ""
echo "Test Complete. Check if attempt 6 returned 429 status."
```

#### Windows Version (test-login-rate-limit.bat)
```batch
@echo off
echo === Testing Login Rate Limit ===
echo Expected: First 5 attempts work, 6th should return 429
echo.

for /L %%i in (1,1,6) do (
  echo Attempt %%i:
  curl -X POST http://localhost:5001/api/merchant/auth/login ^
    -H "Content-Type: application/json" ^
    -d "{\"email\":\"test@example.com\",\"password\":\"wrongpassword\"}"
  echo ---
  timeout /t 1 /nobreak >nul
)

echo.
echo Test Complete. Check if attempt 6 returned 429 status.
pause
```

#### Expected Results
- Attempts 1-5: Return 401 (Invalid credentials) or appropriate auth error
- Attempt 6: Return 429 with message:
```json
{
  "success": false,
  "error": "Too many login attempts. Please try again after 15 minutes.",
  "retryAfter": 900
}
```

#### Verify Headers
```bash
curl -I -X POST http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'
```

Look for:
```
RateLimit-Limit: 5
RateLimit-Remaining: 4
RateLimit-Reset: [timestamp]
```

---

### Test 2: Registration Rate Limit (5 per hour)

#### Setup
Create: `test-registration-rate-limit.sh`

```bash
#!/bin/bash

echo "=== Testing Registration Rate Limit ==="
echo "Expected: First 5 succeed, 6th returns 429"
echo ""

for i in {1..6}; do
  echo "Registration Attempt $i:"

  # Generate unique email for each attempt
  email="test${i}@example.com"

  curl -s -w "\nHTTP Status: %{http_code}\n" -X POST \
    http://localhost:5001/api/merchant/auth/register \
    -H "Content-Type: application/json" \
    -d "{
      \"businessName\": \"Test Business $i\",
      \"ownerName\": \"Test Owner $i\",
      \"email\": \"$email\",
      \"password\": \"password123\",
      \"phone\": \"123456789$i\",
      \"businessAddress\": {
        \"street\": \"123 Test St\",
        \"city\": \"Test City\",
        \"state\": \"Test State\",
        \"zipCode\": \"12345\",
        \"country\": \"USA\"
      }
    }" | jq '.'

  echo "---"
  sleep 2
done
```

#### Windows Version
```batch
@echo off
echo === Testing Registration Rate Limit ===
echo Expected: First 5 succeed, 6th returns 429
echo.

for /L %%i in (1,1,6) do (
  echo Registration Attempt %%i:
  curl -X POST http://localhost:5001/api/merchant/auth/register ^
    -H "Content-Type: application/json" ^
    -d "{\"businessName\":\"Test Business %%i\",\"ownerName\":\"Test Owner\",\"email\":\"test%%i@example.com\",\"password\":\"password123\",\"phone\":\"123456789%%i\",\"businessAddress\":{\"street\":\"123 Test St\",\"city\":\"Test City\",\"state\":\"Test State\",\"zipCode\":\"12345\",\"country\":\"USA\"}}"
  echo ---
  timeout /t 2 /nobreak >nul
)

pause
```

#### Expected Results
- Attempts 1-5: Return 201 (Created) or 400 (Duplicate email after first)
- Attempt 6: Return 429 with message:
```json
{
  "success": false,
  "error": "Too many registration attempts. Please try again later.",
  "retryAfter": 3600
}
```

---

### Test 3: Password Reset Rate Limit (3 per hour)

#### Setup
Create: `test-password-reset-rate-limit.sh`

```bash
#!/bin/bash

echo "=== Testing Password Reset Rate Limit ==="
echo "Expected: First 3 succeed, 4th returns 429"
echo ""

for i in {1..4}; do
  echo "Password Reset Attempt $i:"

  curl -s -w "\nHTTP Status: %{http_code}\n" -X POST \
    http://localhost:5001/api/merchant/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' | jq '.'

  echo "---"
  sleep 1
done
```

#### Expected Results
- Attempts 1-3: Return 200 or appropriate response
- Attempt 4: Return 429 with message:
```json
{
  "success": false,
  "error": "Too many password reset attempts. Please try again after 1 hour.",
  "retryAfter": 3600
}
```

---

### Test 4: General API Rate Limit (100 per 15 minutes)

#### Setup
Create: `test-general-rate-limit.sh`

```bash
#!/bin/bash

echo "=== Testing General API Rate Limit ==="
echo "Expected: First 100 succeed, 101st returns 429"
echo "Testing with /api/merchant/auth/test endpoint"
echo ""

success_count=0
rate_limited=false

for i in {1..101}; do
  response=$(curl -s -w "\n%{http_code}" \
    http://localhost:5001/api/merchant/auth/test)

  http_code=$(echo "$response" | tail -n 1)

  if [ "$http_code" = "429" ]; then
    echo "Rate limit hit at request $i"
    rate_limited=true
    break
  else
    ((success_count++))
    if [ $((i % 10)) -eq 0 ]; then
      echo "Completed $i requests..."
    fi
  fi
done

echo ""
echo "Test Results:"
echo "- Successful requests: $success_count"
echo "- Rate limited: $rate_limited"
echo "- Expected: Rate limited after 100 requests"
```

#### Windows Version (Simplified)
```batch
@echo off
setlocal enabledelayedexpansion

echo === Testing General API Rate Limit ===
echo Testing first 10 and last 3 requests (10, 99, 100, 101)
echo.

REM Test first 10
for /L %%i in (1,1,10) do (
  curl -s http://localhost:5001/api/merchant/auth/test >nul
  if %%i==10 echo Completed 10 requests...
)

REM Fast forward to 98
for /L %%i in (11,1,98) do (
  curl -s http://localhost:5001/api/merchant/auth/test >nul
)

REM Test the critical ones
echo Testing request 99:
curl http://localhost:5001/api/merchant/auth/test
echo.

echo Testing request 100:
curl http://localhost:5001/api/merchant/auth/test
echo.

echo Testing request 101 (should be rate limited):
curl http://localhost:5001/api/merchant/auth/test
echo.

pause
```

---

### Test 5: IP Blocker Functionality

#### Manual Test via Code
Create: `test-ip-blocker.ts`

```typescript
import {
  blockIP,
  unblockIP,
  isIPBlocked,
  recordViolation,
  getViolations,
  clearViolations,
  getIPBlockerStats,
  getBlockedIPs
} from './src/middleware/ipBlocker';

console.log('=== IP Blocker Testing ===\n');

// Test 1: Block an IP
console.log('Test 1: Block IP');
blockIP('192.168.1.100', 'Manual test block');
console.log('Is 192.168.1.100 blocked?', isIPBlocked('192.168.1.100'));
console.log('');

// Test 2: Check blocked IPs list
console.log('Test 2: Blocked IPs List');
console.log(getBlockedIPs());
console.log('');

// Test 3: Record violations
console.log('Test 3: Record Violations');
for (let i = 1; i <= 12; i++) {
  recordViolation('192.168.1.200', `Test violation ${i}`);
  const violations = getViolations('192.168.1.200');
  console.log(`Violation ${i}:`, violations);
}
console.log('IP should be auto-blocked after 10 violations');
console.log('Is 192.168.1.200 blocked?', isIPBlocked('192.168.1.200'));
console.log('');

// Test 4: Statistics
console.log('Test 4: IP Blocker Statistics');
console.log(JSON.stringify(getIPBlockerStats(), null, 2));
console.log('');

// Test 5: Unblock IP
console.log('Test 5: Unblock IP');
unblockIP('192.168.1.100');
console.log('Is 192.168.1.100 blocked?', isIPBlocked('192.168.1.100'));
console.log('');

// Test 6: Clear violations
console.log('Test 6: Clear Violations');
clearViolations('192.168.1.200');
console.log('Violations for 192.168.1.200:', getViolations('192.168.1.200'));
console.log('');
```

Run with: `ts-node test-ip-blocker.ts`

---

### Test 6: Rate Limit Headers Validation

#### Test Script
Create: `test-rate-limit-headers.sh`

```bash
#!/bin/bash

echo "=== Testing Rate Limit Headers ==="
echo ""

echo "Making first request to check headers:"
curl -v -X POST http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' 2>&1 | grep -i ratelimit

echo ""
echo "Expected headers:"
echo "  RateLimit-Limit: 5"
echo "  RateLimit-Remaining: 4"
echo "  RateLimit-Reset: [timestamp]"
```

---

### Test 7: Concurrent Request Testing

#### Using Apache Bench (ab)
```bash
# Install ab (Apache Bench) if not available
# Ubuntu/Debian: sudo apt-get install apache2-utils
# macOS: brew install httpd

# Test login endpoint with 10 concurrent requests
ab -n 10 -c 10 -p login-data.json -T application/json \
  http://localhost:5001/api/merchant/auth/login

# Create login-data.json:
echo '{"email":"test@example.com","password":"test"}' > login-data.json
```

#### Expected Results
- Some requests should fail with 429 status
- Total 429 errors should be 5 or more (after first 5 succeed)

---

### Test 8: Rate Limit Reset Testing

#### Test Script
Create: `test-rate-limit-reset.sh`

```bash
#!/bin/bash

echo "=== Testing Rate Limit Reset ==="
echo ""

echo "Step 1: Hit rate limit (5 attempts)"
for i in {1..5}; do
  curl -s http://localhost:5001/api/merchant/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}' > /dev/null
  echo "Request $i sent"
done

echo ""
echo "Step 2: Verify rate limit hit"
response=$(curl -s -w "\n%{http_code}" -X POST \
  http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}')

echo "$response"

if echo "$response" | grep -q "429"; then
  echo "✅ Rate limit confirmed"
else
  echo "❌ Rate limit not hit as expected"
  exit 1
fi

echo ""
echo "Step 3: Wait for rate limit to reset (15 minutes for login)"
echo "Waiting 15 minutes and 5 seconds..."
sleep 905

echo ""
echo "Step 4: Test after reset"
response=$(curl -s -w "\n%{http_code}" -X POST \
  http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}')

if echo "$response" | grep -q "429"; then
  echo "❌ Rate limit should have reset but didn't"
else
  echo "✅ Rate limit successfully reset"
fi
```

---

## Automated Test Suite

### Complete Test Suite Script
Create: `run-all-rate-limit-tests.sh`

```bash
#!/bin/bash

echo "========================================="
echo "  RATE LIMITING COMPLETE TEST SUITE"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
failed=0

run_test() {
  test_name=$1
  test_command=$2

  echo ""
  echo "Running: $test_name"
  echo "---"

  if eval "$test_command"; then
    echo -e "${GREEN}✅ PASSED${NC}: $test_name"
    ((passed++))
  else
    echo -e "${RED}❌ FAILED${NC}: $test_name"
    ((failed++))
  fi
}

# Test 1: Login Rate Limit
run_test "Login Rate Limit" "./test-login-rate-limit.sh"

# Test 2: Registration Rate Limit
run_test "Registration Rate Limit" "./test-registration-rate-limit.sh"

# Test 3: Password Reset Rate Limit
run_test "Password Reset Rate Limit" "./test-password-reset-rate-limit.sh"

# Test 4: General API Rate Limit
run_test "General API Rate Limit" "./test-general-rate-limit.sh"

# Test 5: Rate Limit Headers
run_test "Rate Limit Headers" "./test-rate-limit-headers.sh"

echo ""
echo "========================================="
echo "  TEST SUMMARY"
echo "========================================="
echo -e "Passed: ${GREEN}$passed${NC}"
echo -e "Failed: ${RED}$failed${NC}"
echo "Total: $((passed + failed))"
echo ""

if [ $failed -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed${NC}"
  exit 1
fi
```

---

## Manual Testing Checklist

### Pre-Testing
- [ ] Backend is running (`npm run dev`)
- [ ] Database is connected
- [ ] `.env` file is configured
- [ ] Rate limiting is enabled (`DISABLE_RATE_LIMIT=false`)

### Test Execution
- [ ] Login rate limit (5 attempts in 15 min)
- [ ] Registration rate limit (5 attempts in 1 hour)
- [ ] Password reset rate limit (3 attempts in 1 hour)
- [ ] General API rate limit (100 requests in 15 min)
- [ ] Rate limit headers present in responses
- [ ] Error messages are clear and actionable
- [ ] `retryAfter` value is correct in responses
- [ ] IP blocker blocks requests from blocked IPs
- [ ] Violations are tracked correctly
- [ ] Auto-blocking works after 10 violations

### Post-Testing Verification
- [ ] Rate limits reset after time window expires
- [ ] No memory leaks from rate limiter
- [ ] Server logs show rate limit violations
- [ ] IP blocker statistics are accurate

---

## Troubleshooting

### Rate Limiting Not Working
1. Check if `DISABLE_RATE_LIMIT=true` in `.env`
2. Verify rate limiter is imported in routes
3. Check middleware order in `server.ts`
4. Clear browser/client cache
5. Ensure requests come from same IP

### Rate Limit Headers Missing
1. Check `standardHeaders: true` in rate limiter config
2. Verify client is reading headers correctly
3. Test with `curl -v` to see all headers

### IP Blocker Not Blocking
1. Verify `ipBlocker` middleware is applied
2. Check if IP is actually in blocklist with `getBlockedIPs()`
3. Ensure middleware is before route handlers
4. Check request IP matches blocked IP

### Tests Failing
1. Ensure no other processes are making requests
2. Wait for rate limits to reset between tests
3. Use different IPs or restart server between tests
4. Check server logs for detailed errors

---

## Performance Testing

### Load Testing with Artillery
Install Artillery: `npm install -g artillery`

Create `artillery-config.yml`:
```yaml
config:
  target: 'http://localhost:5001'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Sustained load"
scenarios:
  - name: "Login attempts"
    flow:
      - post:
          url: "/api/merchant/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
```

Run: `artillery run artillery-config.yml`

Expected: High percentage of 429 responses after initial requests

---

## Conclusion

This testing guide provides comprehensive coverage of all rate limiting functionality. Use these tests to verify implementation and monitor ongoing performance.

**Remember**: Always test in development environment before deploying to production!
