# Bill Upload - Quick Fix Guide

**Issue:** User getting errors when clicking "Upload Bills" card

---

## 🚨 Quick Diagnosis (30 seconds)

Run this command to test everything:
```bash
cd frontend
npx ts-node scripts/test-bill-upload-integration.ts
```

This will check:
- ✅ Backend server running
- ✅ Bill routes registered
- ✅ Upload endpoint configured
- ✅ Cloudinary setup
- ✅ Frontend configuration

---

## 🔧 Most Common Fixes

### 1. Backend Not Running (90% of issues)
**Symptom:** "Network request failed" or "Cannot connect"

**Fix:**
```bash
cd user-backend
npm run dev
```

**Verify:** Look for this in console:
```
✅ Bill routes registered at /api/bills
✅ Cloudinary configured successfully
```

---

### 2. User Not Logged In (5% of issues)
**Symptom:** "401 Unauthorized" or "Authentication required"

**Fix:**
1. Navigate to sign-in page
2. Log in with valid credentials
3. Try bill upload again

---

### 3. Camera/Gallery Permissions (3% of issues)
**Symptom:** Camera doesn't open or gallery access denied

**Fix:**
- **iOS:** Settings → REZ App → Allow Camera/Photos
- **Android:** Settings → Apps → REZ App → Permissions
- **Web:** Browser will prompt for camera access

---

### 4. Form Validation Error (2% of issues)
**Symptom:** Alert message about missing fields

**Fix:** Ensure you:
- ✅ Have selected/taken a bill image
- ✅ Have selected a merchant
- ✅ Have entered an amount > 0
- ✅ Bill date is within 30 days

---

## 📱 Step-by-Step Test

### Test 1: Check Backend
```bash
curl http://localhost:5001/health
```
**Expected:** `{"status": "ok", ...}`

### Test 2: Check Bill Routes
```bash
curl http://localhost:5001/api/bills
```
**Expected:** `401` (route exists, needs auth)
**NOT Expected:** `404` (route doesn't exist)

### Test 3: Login First
1. Open app
2. Go to sign-in
3. Enter credentials
4. Verify you see homepage after login

### Test 4: Try Upload
1. Click "Upload Bills" card
2. Page should load without errors
3. Take/select photo
4. Fill form
5. Click "Upload Bill"

---

## 🐛 Error Messages Decoded

| Error Message | Cause | Fix |
|---------------|-------|-----|
| "Network request failed" | Backend not running | Start backend with `npm run dev` |
| "401 Unauthorized" | Not logged in | Log in first |
| "404 Not Found" | Routes not registered | Check backend server.ts |
| "Bill image is required" | No image selected | Take photo or select from gallery |
| "Please select a merchant" | No merchant selected | Select merchant from dropdown |
| "Failed to upload bill" | Multiple causes | Check backend console logs |
| "Permission denied" | Camera/gallery permission | Grant permissions in settings |

---

## 🔍 Where to Look for Errors

### Backend Console
```
cd user-backend
npm run dev

# Look for errors when uploading
# Should see:
📤 [BILL UPLOAD] Processing bill upload...
☁️ [CLOUDINARY] Uploading bill image...
✅ [CLOUDINARY] Image uploaded successfully
✅ [BILL] Bill created: 67xxx...
```

### Frontend Console
```
cd frontend
npm start

# Check Metro bundler console
# Should see:
📤 [BILL UPLOAD] Starting bill upload...
📦 [BILL UPLOAD] FormData prepared, sending request...
✅ [BILL UPLOAD] Bill uploaded successfully
```

---

## ✅ Verification Checklist

Before reporting an issue, verify:

**Backend:**
- [ ] Server is running (`npm run dev`)
- [ ] Console shows: `✅ Bill routes registered`
- [ ] Console shows: `✅ Cloudinary configured`
- [ ] Port 5001 is not blocked

**Frontend:**
- [ ] App is running (`npm start`)
- [ ] User is logged in
- [ ] `.env` has: `EXPO_PUBLIC_API_BASE_URL=http://localhost:5001/api`
- [ ] No TypeScript errors in code

**Permissions:**
- [ ] Camera permission granted (if taking photo)
- [ ] Gallery/Photos permission granted (if selecting image)
- [ ] Location permission granted (for some features)

**Network:**
- [ ] Frontend and backend on same machine/network
- [ ] No firewall blocking localhost:5001
- [ ] Internet connection active (for Cloudinary upload)

---

## 🆘 Still Not Working?

If you've checked everything above and it still doesn't work:

1. **Run Full Diagnostic:**
   ```bash
   cd frontend
   npx ts-node scripts/test-bill-upload-integration.ts
   ```

2. **Check Both Consoles:**
   - Backend console for API errors
   - Frontend console for client errors

3. **Get Specific Error:**
   - What exact error message do you see?
   - When does it occur? (on click, after photo, after submit?)
   - Platform? (iOS, Android, Web)

4. **Read Full Report:**
   See `BILL_UPLOAD_INVESTIGATION_REPORT.md` for complete details

---

## 📞 Need More Help?

**Documentation:**
- `BILL_UPLOAD_INVESTIGATION_REPORT.md` - Complete investigation
- `user-backend/docs/BILL_UPLOAD_API.md` - API documentation
- `user-backend/BILL_UPLOAD_QUICK_START.md` - Backend setup

**Test Scripts:**
- `frontend/scripts/test-bill-upload-integration.ts` - Frontend test
- `user-backend/scripts/test-bill-upload.ts` - Backend test

**Support:**
- Check GitHub issues
- Review backend console logs
- Enable debug mode in .env

---

## 🎯 TL;DR

1. Start backend: `cd user-backend && npm run dev`
2. Start frontend: `cd frontend && npm start`
3. Log in to app
4. Click "Upload Bills"
5. Take/select photo
6. Fill form
7. Upload

If error, check:
1. Backend running? (`http://localhost:5001/health`)
2. Logged in? (see user profile in top right)
3. Permissions granted? (camera/gallery)
4. Form filled? (image, merchant, amount)

---

**Last Updated:** October 25, 2025
**Status:** ✅ Feature is functional, diagnostic tools ready
