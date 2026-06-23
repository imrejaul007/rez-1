# Cloudinary Integration - Quick Reference

## 🚀 Quick Start

### Upload Single Product Image
```typescript
POST /api/merchant/uploads/product-image
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

FormData:
  image: [file]
  productId: "optional-product-id"
```

### Upload Multiple Images
```typescript
POST /api/merchant/uploads/product-images
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

FormData:
  images: [file1, file2, ...]
  productId: "optional-product-id"
```

### Upload Store Logo
```typescript
POST /api/merchant/uploads/store-logo
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

FormData:
  logo: [file]
```

### Upload Store Banner
```typescript
POST /api/merchant/uploads/store-banner
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

FormData:
  banner: [file]
```

### Upload Video
```typescript
POST /api/merchant/uploads/video
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

FormData:
  video: [file]
  type: "product" | "store"
```

### Delete File
```typescript
DELETE /api/merchant/uploads/{publicId}?type=image|video
Authorization: Bearer YOUR_TOKEN
```

## 📁 Folder Structure

```
merchants/
  └── {merchantId}/
      ├── products/
      │   ├── {productId}/
      │   │   ├── image-1.jpg
      │   │   └── thumbnails/
      │   │       └── thumb-1.jpg
      │   └── videos/
      │       └── demo.mp4
      └── store/
          ├── logo/logo.png
          ├── banner/banner.jpg
          └── videos/intro.mp4
```

## 🎨 Image Optimizations

| Type | Dimensions | Quality | Crop |
|------|-----------|---------|------|
| Product Image | 800x800 | Auto | Fill |
| Thumbnail | 300x300 | 80% | Fill |
| Store Logo | 200x200 | Auto | Fill |
| Store Banner | 1920x400 | Auto | Fill |
| Video | Original | Auto | - |

## 📦 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/dsuakj68p/image/upload/v1234567890/merchants/123/products/456/image.jpg",
    "publicId": "merchants/123/products/456/image",
    "width": 800,
    "height": 800,
    "format": "jpg"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Failed to upload image",
  "error": "Error details here"
}
```

## 🔒 File Restrictions

- **Max File Size**: 50MB
- **Max Files per Request**: 10
- **Allowed Image Types**: JPEG, JPG, PNG, GIF, WebP
- **Allowed Video Types**: MP4, MOV, AVI, WMV, WebM

## 💻 Usage in Code

### Direct Service Usage
```typescript
import CloudinaryService from '../services/CloudinaryService';

// Upload product image
const result = await CloudinaryService.uploadProductImage(
  '/temp/image.jpg',
  'merchant123',
  'product456'
);
console.log('Image URL:', result.secure_url);

// Upload video
const videoResult = await CloudinaryService.uploadVideo(
  '/temp/video.mp4',
  'merchant123',
  'product'
);
console.log('Video URL:', videoResult.secure_url);

// Delete file
await CloudinaryService.deleteFile('merchants/123/products/456/image');

// Delete video
await CloudinaryService.deleteVideo('merchants/123/product/videos/demo');
```

### Get Public ID from URL
```typescript
const url = 'https://res.cloudinary.com/demo/image/upload/v123/merchants/123/products/image.jpg';
const publicId = CloudinaryService.getPublicIdFromUrl(url);
// Returns: "merchants/123/products/image"
```

### Check if Cloudinary is Configured
```typescript
if (CloudinaryService.isConfigured()) {
  // Use Cloudinary
} else {
  // Fallback to local storage
}
```

## 🧪 Testing with cURL

### Upload Image
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/product-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg" \
  -F "productId=123"
```

### Upload Multiple Images
```bash
curl -X POST http://localhost:5000/api/merchant/uploads/product-images \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@/path/to/img1.jpg" \
  -F "images=@/path/to/img2.jpg"
```

### Delete File
```bash
curl -X DELETE "http://localhost:5000/api/merchant/uploads/merchants/123/products/456/image?type=image" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 Environment Variables

```env
CLOUDINARY_CLOUD_NAME=dsuakj68p
CLOUDINARY_API_KEY=427796722317472
CLOUDINARY_API_SECRET=m1Dduia2VZaO-6zusGzpW8Z6YE0
```

## ⚡ Key Features

- ✅ Automatic image optimization
- ✅ WebP conversion for modern browsers
- ✅ Global CDN delivery
- ✅ Automatic file cleanup (temp files)
- ✅ Video transcoding
- ✅ Organized folder structure
- ✅ Secure upload and delete
- ✅ Detailed error handling

## 🐛 Common Issues

### Issue: "No file uploaded"
**Solution**: Ensure field name matches:
- Single image: `image`
- Multiple images: `images`
- Logo: `logo`
- Banner: `banner`
- Video: `video`

### Issue: "File too large"
**Solution**: Files must be under 50MB

### Issue: "Only image and video files are allowed"
**Solution**: Check file extension and MIME type

### Issue: "Unauthorized"
**Solution**: Include valid merchant JWT token in Authorization header

## 📊 Cloudinary Dashboard

Access: https://cloudinary.com/console

Monitor:
- Storage usage
- Bandwidth
- Transformations
- API calls

## 🎯 Pro Tips

1. **Always store publicId** with URLs in your database for easy deletion
2. **Use thumbnails** for list views to save bandwidth
3. **Enable lazy loading** for images on frontend
4. **Monitor your usage** to stay within free tier limits
5. **Use signed URLs** for private content
6. **Leverage transformations** for on-the-fly image manipulation

## 📚 Documentation Links

- Cloudinary Docs: https://cloudinary.com/documentation
- Upload API: https://cloudinary.com/documentation/image_upload_api_reference
- Transformation Guide: https://cloudinary.com/documentation/image_transformations

---

**Quick Help**: All uploads automatically:
- Optimize quality
- Convert to best format (WebP when supported)
- Resize to specified dimensions
- Delete temp files
- Return CDN URLs
