# Verification Checklist for Bill Upload Performance Fixes

## Quick Verification Commands

### 1. Verify Image Compression Utility Exists
```bash
cat "C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\utils\imageCompression.ts" | head -20
```

### 2. Verify bill-upload.tsx Has Compression Imports
```bash
grep -n "compressImageIfNeeded\|useDebounce" "C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\app\bill-upload.tsx"
```

### 3. Verify Debounced Values Are Declared
```bash
grep -A2 "Debounced values for cashback preview" "C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\app\bill-upload.tsx"
```

### 4. Verify takePicture Uses Compression
```bash
grep -A5 "Compress image before quality check" "C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\app\bill-upload.tsx" | head -10
```

### 5. Verify Cashback Preview is Debounced
```bash
grep -B2 -A2 "debouncedAmount, debouncedMerchantId" "C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\app\bill-upload.tsx"
```

## Manual Testing Steps

### Test Image Compression
1. Open the app
2. Navigate to bill upload page
3. Take a photo or select from gallery
4. Watch for toast messages:
   - "Compressing image..."
   - "Checking image quality..."
   - "Bill photo captured (Quality: XX/100)"
5. Check console logs for compression stats

### Test Cashback Preview Debouncing
1. Open bill upload page
2. Select a merchant
3. Type amount slowly (pause between digits)
   - Should see cashback update after 500ms pause
4. Type amount quickly without pausing
   - Should only update once after you stop typing
5. Console should show fewer API calls

## Expected Results

✅ Image compression utility file exists at `utils/imageCompression.ts`
✅ bill-upload.tsx imports compression and debounce functions
✅ Debounced values are declared for amount and merchantId
✅ takePicture function compresses images before quality check
✅ pickImageFromGallery function compresses images before quality check
✅ Cashback preview uses debounced values instead of setTimeout

## Rollback Instructions (If Needed)

If any issues arise, you can rollback by:

1. Remove compression from takePicture:
   - Remove the compression step
   - Pass photo.uri directly to checkQuality

2. Remove compression from pickImageFromGallery:
   - Remove the compression step
   - Pass imageUri directly to checkQuality

3. Revert cashback debouncing:
   - Remove debounced value declarations
   - Restore the old useEffect with setTimeout

## Success Indicators

✅ All verification commands return expected results
✅ Toast messages show compression step
✅ Uploaded images are smaller in file size
✅ Cashback preview updates smoothly without jitter
✅ No console errors
✅ Image quality remains acceptable
