# Cloudinary Integration - Quick Checklist ✅

## Pre-Flight Checks (Already Complete)

- [x] Cloudinary package installed (`cloudinary@^1.41.3`)
- [x] Multer package installed (`multer@^2.0.2`)
- [x] Environment variables configured in `.env`
- [x] CloudinaryService.ts created
- [x] Upload routes updated
- [x] TypeScript compilation successful
- [x] Routes registered in server.ts

## Your Action Items

### 1. Restart Backend Server
```bash
cd user-backend
npm run dev
```

**Expected**: Server starts without errors

### 2. Test Single Image Upload
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/product-image \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -F "image=@test-image.jpg" \
  -F "productId=test-123"
```

**Expected**: JSON response with Cloudinary URL

### 3. Verify in Cloudinary Dashboard
1. Go to: https://cloudinary.com/console
2. Login with account: dsuakj68p
3. Check Media Library
4. Verify uploaded image appears

**Expected**: Image visible in `merchants/{merchantId}/products/` folder

### 4. Test Multiple Images
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/product-images \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -F "images=@img1.jpg" \
  -F "images=@img2.jpg"
```

**Expected**: Array of uploaded images in response

### 5. Test Video Upload
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/video \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -F "video=@demo.mp4" \
  -F "type=product"
```

**Expected**: Video URL with duration in response

### 6. Verify Temp File Cleanup
```bash
ls -la user-backend/uploads/temp/
```

**Expected**: Directory empty (all temp files deleted after upload)

### 7. Test File Deletion
```bash
# Use publicId from previous upload
curl -X DELETE "http://localhost:5000/api/merchant/uploads/merchants/123/products/456/image?type=image" \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN"
```

**Expected**: Success message, file deleted from Cloudinary

## Quick Verification

### Server Logs
Look for these messages when uploading:
```
✅ Uploaded to Cloudinary: https://res.cloudinary.com/...
🗑️ Deleted from Cloudinary: merchants/...
```

### Error Messages (if any)
```
❌ Cloudinary upload error: [details]
❌ Video upload error: [details]
```

## Common Issues & Solutions

### Issue: Server won't start
**Check**: TypeScript compilation
```bash
cd user-backend
npm run build
```

### Issue: "Failed to upload to Cloudinary"
**Check**: Environment variables are loaded
```bash
# In server console, add this to test:
console.log('Cloudinary Config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET'
});
```

### Issue: "No file uploaded"
**Check**: Field name matches
- Single image: `image`
- Multiple: `images`
- Logo: `logo`
- Banner: `banner`
- Video: `video`

### Issue: Temp files not cleaned up
**Check**: File permissions on uploads/temp directory
```bash
ls -la user-backend/uploads/
```

## Documentation Reference

- **Full Guide**: `CLOUDINARY_INTEGRATION_COMPLETE.md`
- **Quick Reference**: `CLOUDINARY_QUICK_REFERENCE.md`
- **Testing Guide**: `CLOUDINARY_TESTING_GUIDE.md`
- **Visual Summary**: `CLOUDINARY_VISUAL_SUMMARY.md`
- **Implementation Summary**: `CLOUDINARY_IMPLEMENTATION_SUMMARY.md`

## Testing Checklist

- [ ] Backend server restarted
- [ ] Single image upload works
- [ ] Multiple images upload works
- [ ] Store logo upload works
- [ ] Store banner upload works
- [ ] Video upload works
- [ ] File deletion works
- [ ] Images appear in Cloudinary dashboard
- [ ] Images are optimized (check file size)
- [ ] Temp files are cleaned up
- [ ] Authentication is enforced
- [ ] Invalid file types are rejected
- [ ] File size limits are enforced

## Production Readiness

- [x] Code complete
- [x] TypeScript compiled
- [x] Documentation complete
- [ ] Testing complete (your action)
- [ ] Backend restarted (your action)
- [ ] Frontend integrated (if needed)

## Need Help?

1. Check server logs for detailed error messages
2. Verify Cloudinary credentials in `.env`
3. Test with simple curl commands first
4. Check Cloudinary dashboard for uploaded files
5. Review documentation files for examples

---

**Status**: Ready for Testing ✅
**Waiting for**: Backend restart + Testing
