# Frontend Connection Errors - Fixed

## Summary
This document outlines all the connection errors that were identified and fixed in the React Native/Expo frontend application.

## Issues Identified

### 1. Port Mismatch Issues
**Problem**: Multiple configuration files had inconsistent port numbers (5000 vs 5001), causing connection failures.

**Files Affected**:
- `config/env.ts` - Had fallback to port 5000
- `config/index.ts` - Had fallback to port 5000
- `scripts/test-api-services.js` - Hardcoded port 5000
- `scripts/test-backend-connectivity.js` - Hardcoded port 5000

**Fix**: Updated all files to use port 5001 consistently with the backend configuration.

### 2. WebSocket Configuration Issues
**Problem**: WebSocket services were pointing to wrong ports or URLs.

**Files Fixed**:
- `services/realTimeService.ts` - Updated from ws://localhost:3001 to ws://localhost:5001
- `contexts/SocketContext.tsx` - Enhanced to handle Android emulator localhost correctly

### 3. Connection Error Messages
**Problem**: Generic error messages made debugging difficult.

**Solution**: Created comprehensive connection utilities with:
- Better error parsing
- Helpful suggestions for each error type
- Platform-specific handling (Android emulator, iOS simulator, web)

## Files Modified

### Configuration Files
1. **config/env.ts**
   - Changed default API URL from `http://localhost:5000/api` to `http://localhost:5001/api`
   - Updated devUrl from port 5000 to 5001

2. **config/index.ts**
   - Updated API_BASE_URL fallback from port 5000 to 5001

### WebSocket Configuration
3. **services/realTimeService.ts**
   - Updated WebSocket URL from `ws://localhost:3001` to `ws://localhost:5001`

4. **contexts/SocketContext.tsx**
   - Enhanced Android emulator support
   - Added proper localhost to 10.0.2.2 conversion for Android
   - Improved error handling

### Test Scripts
5. **scripts/test-api-services.js**
   - Updated health check endpoint from port 5000 to 5001
   - Updated API info endpoint from port 5000 to 5001

6. **scripts/test-backend-connectivity.js**
   - Updated base URL from port 5000 to 5001
   - Updated curl test from port 5000 to 5001

### Error Handling
7. **utils/connectionUtils.ts** (NEW FILE)
   - Created comprehensive connection utilities
   - Better error parsing and categorization
   - Platform-specific URL handling
   - Helpful error messages with suggestions
   - Retry logic with exponential backoff

8. **services/apiClient.ts**
   - Integrated connection utilities
   - Enhanced error messages
   - Added connection error detection
   - Improved logging for debugging

## Error Types Now Handled

### 1. Connection Refused (ERR_CONNECTION_REFUSED)
**Cause**: Backend server not running
**Suggestions**:
- Make sure the backend server is running
- Check if backend is running on http://localhost:5001
- Run: cd user-backend && npm run dev
- Verify PORT in backend .env file

### 2. Network Timeout
**Cause**: Request taking too long
**Suggestions**:
- Backend server might be slow to respond
- Check your network connection
- Increase timeout in API configuration
- Verify backend server is not overloaded

### 3. Network Request Failed
**Cause**: Network connectivity issues
**Suggestions**:
- Check your internet connection
- Backend server might be offline
- For Android emulator, use 10.0.2.2 instead of localhost
- Check firewall settings

### 4. 404 Not Found
**Cause**: API endpoint doesn't exist
**Suggestions**:
- Verify the API endpoint URL is correct
- Backend route might not be registered
- Check backend route configuration

### 5. 500 Internal Server Error
**Cause**: Backend server error
**Suggestions**:
- Backend server encountered an error
- Check backend server logs for details
- Verify database connection
- Contact backend developer

## Platform-Specific Configuration

### Web Platform
- Uses configured URL as-is
- Localhost works normally

### Android Emulator
- Automatically converts `localhost` to `10.0.2.2`
- Handles both `localhost` and `127.0.0.1`

### iOS Simulator
- Localhost works normally
- No special handling needed

## Environment Variables

The application now correctly uses these environment variables in order of preference:

1. `EXPO_PUBLIC_API_BASE_URL` (primary)
2. `EXPO_PUBLIC_DEV_API_URL` (development fallback)
3. `http://localhost:5001/api` (final fallback)

## Testing

### Before Starting Frontend
1. Ensure backend is running:
   ```bash
   cd user-backend
   npm run dev
   ```

2. Verify backend is accessible:
   - Open http://localhost:5001/health in browser
   - Should return: `{"status":"ok","message":"Server is running"}`

### Test Connection
Run the connectivity test script:
```bash
cd frontend
node scripts/test-backend-connectivity.js
```

### Check Configuration
To verify your configuration:
```typescript
import { logConnectionInfo } from '@/utils/connectionUtils';

// In your code
logConnectionInfo();
```

## Common Issues and Solutions

### Issue: "Cannot connect to backend server"
**Solution**:
1. Check if backend is running: `cd user-backend && npm run dev`
2. Verify port is 5001 in backend .env file
3. Check firewall isn't blocking port 5001

### Issue: "Network request failed" on Android
**Solution**:
1. The app automatically converts localhost to 10.0.2.2
2. If still failing, check if backend is accessible from host machine
3. Try using your machine's IP address instead of localhost

### Issue: WebSocket connection failed
**Solution**:
1. Verify backend Socket.IO server is running
2. Check WebSocket URL is correct (ws://localhost:5001)
3. For Android, ensure using 10.0.2.2 instead of localhost

## API Client Features

### Automatic Token Refresh
The API client now automatically:
- Detects 401 errors
- Attempts to refresh authentication token
- Retries original request with new token

### Request Logging
All API requests now log:
- URL and method
- Headers (sanitized)
- Request body
- Response status and data
- Timing information

### Error Logging
All errors now log:
- Error type and message
- Connection error diagnostics
- Helpful suggestions for resolution
- Full error stack for debugging

## Best Practices

### 1. Always Use Environment Variables
```typescript
// ✅ Good
const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

// ❌ Bad
const apiUrl = 'http://localhost:5001/api';
```

### 2. Handle Connection Errors Gracefully
```typescript
import { parseConnectionError, formatConnectionError } from '@/utils/connectionUtils';

try {
  const response = await apiClient.get('/endpoint');
} catch (error) {
  const connectionError = parseConnectionError(error);
  console.error(formatConnectionError(connectionError));
  // Show user-friendly message
}
```

### 3. Use Retry Logic for Critical Operations
```typescript
import { retryConnection } from '@/utils/connectionUtils';

const result = await retryConnection(
  () => apiClient.post('/critical-endpoint', data),
  3, // max retries
  1000 // initial delay
);
```

### 4. Check Connectivity Before Critical Operations
```typescript
import { checkBackendConnectivity } from '@/utils/connectionUtils';

const status = await checkBackendConnectivity();
if (!status.isReachable) {
  // Show offline message
  return;
}

// Proceed with operation
```

## Next Steps

1. **Test on Physical Devices**: The configuration should work on physical devices, but test to ensure network connectivity

2. **Production Configuration**: Update `EXPO_PUBLIC_PROD_API_URL` in .env to your production API URL

3. **Error Monitoring**: Consider integrating error monitoring (Sentry, etc.) to track connection issues in production

4. **Network Status**: Consider adding a network status indicator in the UI to inform users of connectivity issues

## Verification Checklist

- [x] All configuration files use port 5001
- [x] WebSocket URLs point to correct port
- [x] Android emulator localhost handling implemented
- [x] Enhanced error messages with suggestions
- [x] Connection utilities created and integrated
- [x] API client enhanced with better error handling
- [x] Test scripts updated
- [x] Platform-specific handling implemented
- [x] Documentation created

## Support

If you encounter any connection issues:

1. Check backend is running: http://localhost:5001/health
2. Review console logs for detailed error messages
3. Run connectivity test: `node scripts/test-backend-connectivity.js`
4. Check this documentation for solutions
5. Review backend logs for server-side issues

## Files Summary

### Modified Files (8)
1. config/env.ts
2. config/index.ts
3. services/realTimeService.ts
4. contexts/SocketContext.tsx
5. scripts/test-api-services.js
6. scripts/test-backend-connectivity.js
7. services/apiClient.ts

### New Files (2)
1. utils/connectionUtils.ts
2. FRONTEND_ERRORS_FIXED.md (this file)

---

**Last Updated**: 2025-10-24
**Status**: ✅ All connection errors fixed and tested
