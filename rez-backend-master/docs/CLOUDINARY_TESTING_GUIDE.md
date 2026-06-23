# Cloudinary Integration Testing Guide

## Prerequisites

✅ Cloudinary credentials configured in `.env`:
```env
CLOUDINARY_CLOUD_NAME=dsuakj68p
CLOUDINARY_API_KEY=427796722317472
CLOUDINARY_API_SECRET=m1Dduia2VZaO-6zusGzpW8Z6YE0
```

✅ Backend server running on `http://localhost:5000`

✅ Valid merchant JWT token for authentication

## Test Scenarios

### 1. Test Single Product Image Upload

**Endpoint**: `POST /api/merchant/uploads/product-image`

**Test Case 1.1: Valid Image Upload**
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/product-image \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -F "image=@test-image.jpg" \
  -F "productId=test-product-123"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/dsuakj68p/image/upload/v.../merchants/.../products/test-product-123/...",
    "publicId": "merchants/.../products/test-product-123/...",
    "width": 800,
    "height": 800,
    "format": "jpg"
  }
}
```

**Verification**:
- ✅ Image appears in Cloudinary dashboard
- ✅ Image dimensions are 800x800
- ✅ Image quality is optimized
- ✅ Temp file is deleted from `uploads/temp`

**Test Case 1.2: No File Provided**
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/product-image \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN"
```

**Expected Response**:
```json
{
  "success": false,
  "message": "No file uploaded"
}
```

**Test Case 1.3: Invalid File Type**
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/product-image \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -F "image=@document.pdf"
```

**Expected Response**:
```json
{
  "success": false,
  "message": "Only image and video files are allowed"
}
```

### 2. Test Multiple Product Images Upload

**Endpoint**: `POST /api/merchant/uploads/product-images`

**Test Case 2.1: Multiple Valid Images**
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/product-images \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -F "images=@image1.jpg" \
  -F "images=@image2.png" \
  -F "images=@image3.jpg" \
  -F "productId=multi-test-123"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "3 images uploaded successfully",
  "data": {
    "images": [
      {
        "url": "https://res.cloudinary.com/...",
        "publicId": "merchants/.../products/multi-test-123/...",
        "width": 800,
        "height": 800,
        "format": "jpg"
      },
      // ... 2 more images
    ]
  }
}
```

**Verification**:
- ✅ All images appear in Cloudinary
- ✅ All images are 800x800
- ✅ All temp files cleaned up

**Test Case 2.2: Exceed Maximum Files**
```bash
# Upload 11 files (limit is 10)
curl -X POST http://localhost:5000/api/merchant/uploads/product-images \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -F "images=@img1.jpg" \
  -F "images=@img2.jpg" \
  # ... repeat for 11 files
```

**Expected Response**:
```json
{
  "success": false,
  "message": "Too many files. Maximum is 10 files per request."
}
```

### 3. Test Store Logo Upload

**Endpoint**: `POST /api/merchant/uploads/store-logo`

**Test Case 3.1: Valid Logo**
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/store-logo \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -F "logo=@store-logo.png"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Store logo uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/dsuakj68p/image/upload/v.../merchants/.../store/logo/...",
    "publicId": "merchants/.../store/logo/..."
  }
}
```

**Verification**:
- ✅ Logo appears in Cloudinary under `merchants/{merchantId}/store/logo/`
- ✅ Logo dimensions are 200x200
- ✅ Temp file cleaned up

### 4. Test Store Banner Upload

**Endpoint**: `POST /api/merchant/uploads/store-banner`

**Test Case 4.1: Valid Banner**
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/store-banner \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -F "banner=@store-banner.jpg"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Store banner uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/dsuakj68p/image/upload/v.../merchants/.../store/banner/...",
    "publicId": "merchants/.../store/banner/..."
  }
}
```

**Verification**:
- ✅ Banner appears in Cloudinary under `merchants/{merchantId}/store/banner/`
- ✅ Banner dimensions are 1920x400
- ✅ Temp file cleaned up

### 5. Test Video Upload

**Endpoint**: `POST /api/merchant/uploads/video`

**Test Case 5.1: Product Video**
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/video \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -F "video=@product-demo.mp4" \
  -F "type=product"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/dsuakj68p/video/upload/v.../merchants/.../product/videos/...",
    "publicId": "merchants/.../product/videos/...",
    "duration": 30.5,
    "format": "mp4"
  }
}
```

**Test Case 5.2: Store Video**
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/video \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -F "video=@store-intro.mp4" \
  -F "type=store"
```

**Verification**:
- ✅ Video appears in Cloudinary
- ✅ Video is playable
- ✅ Duration is correct
- ✅ Temp file cleaned up

### 6. Test File Deletion

**Endpoint**: `DELETE /api/merchant/uploads/:publicId`

**Test Case 6.1: Delete Image**
```bash
# First, note the publicId from an upload response
# Example: "merchants/123/products/456/abc123"

curl -X DELETE "http://localhost:5000/api/merchant/uploads/merchants/123/products/456/abc123?type=image" \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Verification**:
- ✅ File removed from Cloudinary
- ✅ File no longer accessible via URL

**Test Case 6.2: Delete Video**
```bash
curl -X DELETE "http://localhost:5000/api/merchant/uploads/merchants/123/product/videos/video123?type=video" \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN"
```

### 7. Test Authentication

**Test Case 7.1: No Token**
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/product-image \
  -F "image=@test.jpg"
```

**Expected Response**: 401 Unauthorized

**Test Case 7.2: Invalid Token**
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/product-image \
  -H "Authorization: Bearer invalid-token" \
  -F "image=@test.jpg"
```

**Expected Response**: 401 Unauthorized

### 8. Test File Size Limits

**Test Case 8.1: File Exceeds 50MB**
```bash
# Create a 60MB file for testing
curl -X POST http://localhost:5000/api/merchant/uploads/product-image \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -F "image=@large-file-60mb.jpg"
```

**Expected Response**:
```json
{
  "success": false,
  "message": "File too large. Maximum size is 50MB."
}
```

## Automated Test Script

Create a file `test-cloudinary-uploads.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:5000/api/merchant/uploads"
TOKEN="YOUR_MERCHANT_TOKEN_HERE"

echo "🧪 Testing Cloudinary Integration..."

# Test 1: Product Image Upload
echo "📸 Test 1: Upload product image"
response=$(curl -s -X POST "$BASE_URL/product-image" \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@test-image.jpg" \
  -F "productId=test-123")
echo "$response" | jq '.'

# Test 2: Multiple Images Upload
echo "📸 Test 2: Upload multiple images"
response=$(curl -s -X POST "$BASE_URL/product-images" \
  -H "Authorization: Bearer $TOKEN" \
  -F "images=@img1.jpg" \
  -F "images=@img2.jpg")
echo "$response" | jq '.'

# Test 3: Store Logo
echo "🏪 Test 3: Upload store logo"
response=$(curl -s -X POST "$BASE_URL/store-logo" \
  -H "Authorization: Bearer $TOKEN" \
  -F "logo=@logo.png")
echo "$response" | jq '.'

# Test 4: Store Banner
echo "🎨 Test 4: Upload store banner"
response=$(curl -s -X POST "$BASE_URL/store-banner" \
  -H "Authorization: Bearer $TOKEN" \
  -F "banner=@banner.jpg")
echo "$response" | jq '.'

# Test 5: Video Upload
echo "🎥 Test 5: Upload video"
response=$(curl -s -X POST "$BASE_URL/video" \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@demo.mp4" \
  -F "type=product")
echo "$response" | jq '.'

echo "✅ All tests completed!"
```

## Manual Testing Checklist

### Pre-Testing
- [ ] Backend server is running
- [ ] Cloudinary credentials are configured
- [ ] You have a valid merchant JWT token
- [ ] Test files prepared (images, videos)

### Image Upload Tests
- [ ] Single product image uploads successfully
- [ ] Multiple product images upload successfully
- [ ] Store logo uploads and resizes to 200x200
- [ ] Store banner uploads and resizes to 1920x400
- [ ] Invalid file types are rejected
- [ ] Files over 50MB are rejected
- [ ] More than 10 files in batch are rejected

### Video Upload Tests
- [ ] Product video uploads successfully
- [ ] Store video uploads successfully
- [ ] Video duration is captured
- [ ] Video format is correct

### Delete Tests
- [ ] Image deletion works
- [ ] Video deletion works
- [ ] Non-existent files return appropriate error

### Authentication Tests
- [ ] Requests without token are rejected
- [ ] Requests with invalid token are rejected
- [ ] Valid token allows upload

### Cloudinary Dashboard Verification
- [ ] Files appear in correct folders
- [ ] Image dimensions match specifications
- [ ] Videos are playable
- [ ] Files are deleted when API is called

### Cleanup Tests
- [ ] Temp files are deleted after successful upload
- [ ] Temp files are deleted even on error
- [ ] No orphaned files in uploads/temp

## Performance Testing

### Load Test: Multiple Concurrent Uploads
```bash
# Use Apache Bench or similar tool
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
  -p image.jpg \
  http://localhost:5000/api/merchant/uploads/product-image
```

**Expected**:
- ✅ All requests complete successfully
- ✅ No file conflicts
- ✅ All temp files cleaned up

## Troubleshooting

### Issue: "Failed to upload to Cloudinary"
**Check**:
1. Cloudinary credentials are correct
2. Internet connection is stable
3. Cloudinary account is active
4. Check Cloudinary dashboard for errors

### Issue: "File not found" on upload
**Check**:
1. Temp directory exists (`uploads/temp`)
2. Directory permissions are correct
3. Disk space is available

### Issue: Images not optimized
**Check**:
1. Cloudinary transformation settings
2. Check actual image dimensions in Cloudinary
3. Verify transformation parameter in code

### Issue: Temp files not cleaned up
**Check**:
1. File paths are correct
2. No permission errors in logs
3. Error handling is catching exceptions

## Success Metrics

All tests pass when:
- ✅ Upload success rate > 99%
- ✅ All temp files cleaned up
- ✅ Images properly resized
- ✅ Videos playable
- ✅ Authentication enforced
- ✅ File size limits respected
- ✅ Delete operations work
- ✅ No errors in server logs
- ✅ Cloudinary dashboard shows all files

---

**Status**: Ready for Testing ✅
**Estimated Testing Time**: 30 minutes
**Difficulty**: Easy
