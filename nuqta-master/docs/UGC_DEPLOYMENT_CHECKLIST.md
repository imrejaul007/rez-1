# UGC VIDEO SYSTEM - DEPLOYMENT CHECKLIST
## Complete Pre-Deployment Guide for UGC Features

**Last Updated:** November 8, 2025
**Version:** 1.0.0
**System:** UGC Video Browsing, Upload, Product Tagging, Shopping & Reporting

---

## EXECUTIVE SUMMARY

This checklist ensures the UGC Video System is production-ready. The system includes:
- **Video Browsing**: Infinite scroll feed with playback controls
- **Video Upload**: Cloudinary integration (camera, gallery, URL)
- **Product Tagging**: 5-10 products per video with search
- **Shopping Integration**: Add to cart directly from videos
- **Reporting System**: Auto-flag at 5 reports
- **Toast Notifications**: User feedback for all actions

**Estimated Deployment Time:** 2-3 days (assuming Cloudinary is already configured)

---

## TABLE OF CONTENTS

1. [Pre-Deployment Requirements](#1-pre-deployment-requirements)
2. [Environment Configuration](#2-environment-configuration)
3. [Third-Party Services Verification](#3-third-party-services-verification)
4. [Code Quality Checks](#4-code-quality-checks)
5. [Database Preparation](#5-database-preparation)
6. [Security Validation](#6-security-validation)
7. [Feature Testing](#7-feature-testing)
8. [Performance Validation](#8-performance-validation)
9. [Platform-Specific Checks](#9-platform-specific-checks)
10. [Documentation Review](#10-documentation-review)

---

## 1. PRE-DEPLOYMENT REQUIREMENTS

### 1.1 System Architecture Verification

#### Frontend Components
- [ ] **Video Feed Components** - Located in `/app/ugc/`
  - [ ] `[id].tsx` - Video detail page exists
  - [ ] Video playback working with Expo AV
  - [ ] Infinite scroll implemented
  - [ ] Loading states implemented

- [ ] **Upload Components** - Located in `/components/ugc/`
  - [ ] `SourcePicker.tsx` - Camera/gallery/URL selection
  - [ ] `UploadProgress.tsx` - Progress tracking
  - [ ] `ProductSelector.tsx` - Product search and selection
  - [ ] `ProductChip.tsx` - Selected product display
  - [ ] All components properly exported from `index.ts`

- [ ] **Shopping Components**
  - [ ] `ShoppableProductCard.tsx` - Product display in videos
  - [ ] `ProductCarousel.tsx` - Product carousel in videos
  - [ ] Add to cart integration working

- [ ] **Reporting Components**
  - [ ] `ReportModal.tsx` - Report form with reasons
  - [ ] Report submission working
  - [ ] Toast notifications for report success

#### Backend API Endpoints
- [ ] **Video APIs** - `/api/ugc/*`
  - [ ] `GET /ugc` - Get video feed
  - [ ] `GET /ugc/:id` - Get single video
  - [ ] `POST /ugc` - Upload new video
  - [ ] `PUT /ugc/:id` - Update video
  - [ ] `DELETE /ugc/:id` - Delete video
  - [ ] `POST /ugc/:id/report` - Report video
  - [ ] `POST /ugc/:id/like` - Like video
  - [ ] `POST /ugc/:id/share` - Share video
  - [ ] `GET /ugc/:id/comments` - Get comments
  - [ ] `POST /ugc/:id/comments` - Add comment

- [ ] **Product Linking APIs**
  - [ ] Product-video association endpoints
  - [ ] Product search in video context
  - [ ] Shopping cart integration

#### Services Verification
- [ ] **`ugcApi.ts`** - API client service exists
  - [ ] All methods implemented
  - [ ] Error handling in place
  - [ ] TypeScript types defined

- [ ] **Video Upload Service**
  - [ ] Cloudinary upload configured
  - [ ] File validation implemented
  - [ ] Progress tracking working

### 1.2 Dependencies Verification

#### Frontend Packages
```bash
cd frontend
npm list expo-av
npm list expo-image-picker
npm list expo-camera
npm list @react-native-async-storage/async-storage
```

- [ ] `expo-av` - Video playback (installed and version compatible)
- [ ] `expo-image-picker` - Gallery selection
- [ ] `expo-camera` - Camera access
- [ ] React Navigation - Video detail navigation

#### Backend Packages (if applicable)
- [ ] Cloudinary SDK installed
- [ ] Multer for file uploads
- [ ] Video validation middleware

### 1.3 Team Sign-Off

- [ ] **Frontend Engineer**: UGC components tested, UI/UX verified
- [ ] **Backend Engineer**: APIs tested, Cloudinary integration verified
- [ ] **QA Engineer**: All UGC features tested across platforms
- [ ] **Product Manager**: Feature acceptance criteria met
- [ ] **Security Team**: File upload security validated

---

## 2. ENVIRONMENT CONFIGURATION

### 2.1 Frontend Environment Variables

**File:** `frontend/.env` and `frontend/.env.production`

```env
# ================================================
# UGC VIDEO SYSTEM CONFIGURATION
# ================================================

# Cloudinary Configuration
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
EXPO_PUBLIC_CLOUDINARY_API_KEY=your-cloudinary-api-key
EXPO_PUBLIC_CLOUDINARY_UGC_PRESET=ugc_videos

# Feature Flags
EXPO_PUBLIC_ENABLE_VIDEO_UPLOAD=true
EXPO_PUBLIC_ENABLE_CAMERA_FEATURES=true

# API Configuration
EXPO_PUBLIC_API_BASE_URL=https://api.rezapp.com/api
EXPO_PUBLIC_VIDEOS_ENDPOINT=/ugc

# Upload Limits (match backend)
EXPO_PUBLIC_MAX_VIDEO_SIZE=52428800  # 50MB
EXPO_PUBLIC_ALLOWED_VIDEO_TYPES=mp4,mov,webm
EXPO_PUBLIC_MAX_PRODUCTS_PER_VIDEO=10
EXPO_PUBLIC_MIN_PRODUCTS_PER_VIDEO=5
```

#### Verification Checklist
- [ ] ✅ `CLOUDINARY_CLOUD_NAME` is set (not "your-cloudinary-cloud-name")
- [ ] ✅ `CLOUDINARY_UGC_PRESET` matches Cloudinary upload preset name
- [ ] ✅ `ENABLE_VIDEO_UPLOAD=true` for production
- [ ] ✅ `ENABLE_CAMERA_FEATURES=true` for camera access
- [ ] ✅ Video upload limits match backend configuration
- [ ] ✅ API endpoints use HTTPS in production

### 2.2 Backend Environment Variables

**File:** `user-backend/.env`

```env
# ================================================
# UGC VIDEO SYSTEM - BACKEND
# ================================================

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Upload Limits
MAX_VIDEO_SIZE=52428800  # 50MB in bytes
ALLOWED_VIDEO_FORMATS=mp4,mov,webm
MAX_PRODUCTS_PER_VIDEO=10
MIN_PRODUCTS_PER_VIDEO=5

# Video Processing
VIDEO_QUALITY=auto
VIDEO_MAX_DURATION=180  # 3 minutes in seconds

# Reporting System
AUTO_FLAG_THRESHOLD=5  # Auto-flag video after 5 reports
REPORT_COOLDOWN=86400  # 24 hours in seconds

# Feature Flags
ENABLE_VIDEO_MODERATION=true
ENABLE_AUTO_TAGGING=false  # AI tagging (future feature)
```

#### Verification Checklist
- [ ] ✅ Cloudinary credentials are production keys (not test)
- [ ] ✅ `CLOUDINARY_API_SECRET` is set (required for backend)
- [ ] ✅ Upload limits match frontend configuration
- [ ] ✅ `AUTO_FLAG_THRESHOLD=5` as specified
- [ ] ✅ Video duration limit is reasonable (180 seconds = 3 minutes)
- [ ] ✅ Report cooldown prevents spam (24 hours)

### 2.3 Environment Validation Script

Create and run validation script:

**File:** `frontend/scripts/validate-ugc-env.js`

```javascript
const requiredEnvVars = [
  'EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME',
  'EXPO_PUBLIC_CLOUDINARY_UGC_PRESET',
  'EXPO_PUBLIC_ENABLE_VIDEO_UPLOAD',
  'EXPO_PUBLIC_API_BASE_URL',
];

const missingVars = requiredEnvVars.filter(
  (varName) => !process.env[varName] || process.env[varName].includes('your-')
);

if (missingVars.length > 0) {
  console.error('❌ Missing or invalid environment variables:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  process.exit(1);
} else {
  console.log('✅ All UGC environment variables configured correctly');
}
```

**Run validation:**
```bash
cd frontend
node scripts/validate-ugc-env.js
```

- [ ] ✅ Validation script passes
- [ ] ✅ No placeholder values remain
- [ ] ✅ All URLs use HTTPS in production

---

## 3. THIRD-PARTY SERVICES VERIFICATION

### 3.1 Cloudinary Configuration

#### Account Setup
- [ ] **Cloudinary Account**
  - [ ] Account created at https://cloudinary.com
  - [ ] Plan selected (Free tier may have limits)
  - [ ] Billing configured (if using paid plan)
  - [ ] Usage quotas understood:
    - Free: 25GB storage, 25GB bandwidth/month
    - Paid: Check your plan limits

#### Upload Preset Configuration

🔴 **CRITICAL:** Upload preset MUST exist and be configured correctly

**Navigate to:** Cloudinary Dashboard → Settings → Upload → Upload Presets

- [ ] **Preset Name: `ugc_videos`**
  - [ ] Preset exists in Cloudinary dashboard
  - [ ] Signing Mode: **Unsigned** (frontend uploads)
  - [ ] Folder: `videos/ugc/` or similar
  - [ ] Upload constraints:
    - Max file size: 100MB (or your limit)
    - Allowed formats: mp4, mov, webm
    - Resource type: Video
  - [ ] Transformations (optional but recommended):
    - Video quality: auto
    - Format: mp4
    - Codec: h264

**Verification Steps:**
```bash
# Test upload preset exists (replace with your cloud name)
curl https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/upload \
  -X POST \
  -F "upload_preset=ugc_videos" \
  -F "file=https://www.w3schools.com/html/mov_bbb.mp4"
```

- [ ] ✅ Test upload succeeds
- [ ] ✅ Video appears in `videos/ugc/` folder in Cloudinary
- [ ] ✅ Returns secure_url in response

#### Security Configuration
- [ ] **API Keys**
  - [ ] API key obtained from dashboard
  - [ ] API secret stored securely (backend only)
  - [ ] Frontend NEVER has API secret
  - [ ] Keys are production keys (not test environment)

- [ ] **Access Control**
  - [ ] Unsigned upload enabled for `ugc_videos` preset
  - [ ] Folder restrictions in place
  - [ ] File type restrictions enforced

#### CDN & Delivery
- [ ] **CDN Configuration**
  - [ ] CNAME configured (optional but recommended)
  - [ ] SSL enabled for all URLs
  - [ ] Auto-format enabled (delivers WebM to supported browsers)
  - [ ] Lazy loading support enabled

- [ ] **Test Video Delivery**
  ```bash
  # Test video URL accessibility
  curl -I https://res.cloudinary.com/YOUR_CLOUD_NAME/video/upload/v1234567/videos/ugc/test.mp4
  ```
  - [ ] ✅ Returns 200 OK
  - [ ] ✅ HTTPS enabled
  - [ ] ✅ Loads in <2 seconds

#### Monitoring & Limits
- [ ] **Usage Dashboard Reviewed**
  - [ ] Current usage: _____GB / _____GB
  - [ ] Bandwidth usage: _____GB / _____GB
  - [ ] Transformations: _____ / _____
  - [ ] Storage quota sufficient for launch
  - [ ] Auto-upgrade enabled OR manual monitoring in place

- [ ] **Alerts Configured**
  - [ ] Email alert at 80% quota
  - [ ] Email alert at 95% quota
  - [ ] Plan upgrade path identified

### 3.2 Backend API Connectivity

#### Video API Health Check

**Create test script:** `frontend/scripts/test-ugc-api.js`

```javascript
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

async function testUGCAPIs() {
  const tests = [
    { name: 'Get Video Feed', endpoint: `${API_BASE}/ugc`, method: 'GET' },
    { name: 'Get Video by ID', endpoint: `${API_BASE}/ugc/test123`, method: 'GET', expectFail: true },
  ];

  for (const test of tests) {
    try {
      const response = await fetch(test.endpoint, { method: test.method });
      const status = response.status;
      console.log(`${test.name}: ${status === 200 || test.expectFail ? '✅' : '❌'} (Status: ${status})`);
    } catch (error) {
      console.error(`${test.name}: ❌ Error: ${error.message}`);
    }
  }
}

testUGCAPIs();
```

**Run connectivity test:**
```bash
cd frontend
node scripts/test-ugc-api.js
```

- [ ] ✅ All API endpoints accessible
- [ ] ✅ CORS configured correctly (no CORS errors)
- [ ] ✅ Authentication working (protected endpoints require token)

---

## 4. CODE QUALITY CHECKS

### 4.1 TypeScript Compilation

```bash
cd frontend
npx tsc --noEmit
```

- [ ] ✅ No TypeScript errors in UGC components
- [ ] ✅ All types properly defined
- [ ] ✅ No `any` types in critical paths

### 4.2 ESLint & Formatting

```bash
cd frontend
npx eslint app/ugc/**/*.tsx components/ugc/**/*.tsx services/ugcApi.ts
npx prettier --check app/ugc components/ugc services/ugcApi.ts
```

- [ ] ✅ No ESLint errors
- [ ] ✅ Code formatted consistently
- [ ] ✅ No unused imports

### 4.3 Remove Debug Code

**Search for and remove:**
```bash
cd frontend
grep -r "console.log" app/ugc components/ugc | grep -v "console.error"
grep -r "TODO" app/ugc components/ugc
grep -r "FIXME" app/ugc components/ugc
grep -r "debugger" app/ugc components/ugc
```

- [ ] ✅ All `console.log` statements removed (except intentional errors)
- [ ] ✅ All `TODO` comments resolved or documented
- [ ] ✅ No `debugger` statements
- [ ] ✅ No test/mock data in production code

### 4.4 Security Audit

#### File Upload Security
- [ ] **Frontend Validation**
  - [ ] File size checked before upload (50MB limit)
  - [ ] File type validated (mp4, mov, webm only)
  - [ ] Video duration checked (if possible)
  - [ ] User feedback for invalid files

- [ ] **Backend Validation** (if applicable)
  - [ ] File size enforced server-side
  - [ ] File type/MIME type verified
  - [ ] Malicious file detection
  - [ ] Rate limiting on upload endpoint (10 uploads/min)

#### API Security
- [ ] **Authentication**
  - [ ] Upload requires authentication
  - [ ] Token validation on all protected endpoints
  - [ ] User can only delete their own videos

- [ ] **Input Validation**
  - [ ] Report reasons validated against enum
  - [ ] Product IDs validated
  - [ ] Caption length limited (500 chars)

#### Sensitive Data
- [ ] ✅ No API secrets in frontend code
- [ ] ✅ No hardcoded credentials
- [ ] ✅ No user data logged

### 4.5 Dependency Audit

```bash
cd frontend
npm audit --production
```

- [ ] ✅ No critical vulnerabilities
- [ ] ✅ No high vulnerabilities (or documented & accepted)
- [ ] ✅ All dependencies up to date

---

## 5. DATABASE PREPARATION

### 5.1 MongoDB Schema Validation

#### UGC Videos Collection

**Expected schema:**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  type: 'video',
  url: String,  // Cloudinary URL
  thumbnail: String,  // Cloudinary thumbnail
  caption: String,
  tags: [String],
  taggedProducts: [{
    productId: ObjectId,
    position: { x: Number, y: Number }  // Optional
  }],
  views: Number,
  likes: Number,
  shares: Number,
  reports: [{
    userId: ObjectId,
    reason: String,
    description: String,
    createdAt: Date
  }],
  isFlagged: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

- [ ] **Collection Exists**: `ugc` or `videos` collection created
- [ ] **Indexes Created**:
  ```javascript
  db.ugc.createIndex({ userId: 1, createdAt: -1 })
  db.ugc.createIndex({ isFlagged: 1, createdAt: -1 })
  db.ugc.createIndex({ "taggedProducts.productId": 1 })
  db.ugc.createIndex({ createdAt: -1 })
  ```

### 5.2 Auto-Flagging Logic

**Backend logic to verify:**

- [ ] **Report Threshold**
  - [ ] Video auto-flags when reports.length >= 5
  - [ ] Flagged videos hidden from feed
  - [ ] Admin notification sent (if implemented)

- [ ] **Report Cooldown**
  - [ ] User can't report same video twice
  - [ ] Cooldown period enforced (24 hours)

### 5.3 Database Backup

- [ ] **Backup Strategy**
  - [ ] Automated backups enabled (MongoDB Atlas)
  - [ ] Point-in-time recovery available
  - [ ] Backup tested (restore procedure verified)

---

## 6. SECURITY VALIDATION

### 6.1 File Upload Security

🔴 **CRITICAL SECURITY CHECKS**

- [ ] **Frontend Validation**
  ```typescript
  // Verify this logic exists in upload component
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

  if (file.size > MAX_SIZE) {
    // Reject with error message
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    // Reject with error message
  }
  ```

- [ ] **Cloudinary Upload Constraints**
  - [ ] Max file size: 100MB (Cloudinary preset)
  - [ ] Allowed formats: mp4, mov, webm
  - [ ] Resource type locked to 'video'

- [ ] **No Direct User Input to Cloudinary**
  - [ ] ✅ All uploads go through backend OR
  - [ ] ✅ Unsigned preset used (no signature manipulation)

### 6.2 XSS Prevention

- [ ] **Caption & Description Sanitization**
  - [ ] HTML tags stripped from user input
  - [ ] Script tags rejected
  - [ ] Dangerous characters escaped

- [ ] **Product Name Display**
  - [ ] Product names from database (trusted source)
  - [ ] No user-provided product names accepted

### 6.3 Authorization

- [ ] **Video Ownership**
  - [ ] User can only delete their own videos
  - [ ] User can only edit their own videos
  - [ ] Token validation on all modification endpoints

- [ ] **Reporting**
  - [ ] Authenticated users only can report
  - [ ] Users can't report their own videos
  - [ ] Multiple reports from same user blocked

### 6.4 Rate Limiting

- [ ] **Upload Rate Limit**
  - [ ] 10 uploads per minute per user
  - [ ] 429 status returned when exceeded
  - [ ] Retry-After header included

- [ ] **Report Rate Limit**
  - [ ] 5 reports per minute per user
  - [ ] Prevents report spam

---

## 7. FEATURE TESTING

### 7.1 Video Browsing

#### Feed Display
- [ ] **Video Feed Loads**
  - [ ] Feed displays on app load
  - [ ] Videos sorted by creation date (newest first)
  - [ ] Loading indicator shows while fetching
  - [ ] Empty state shown when no videos

- [ ] **Infinite Scroll**
  - [ ] Load more videos on scroll to bottom
  - [ ] Loading spinner during fetch
  - [ ] No duplicate videos
  - [ ] Handles end of feed gracefully

- [ ] **Video Playback**
  - [ ] Tap to play/pause works
  - [ ] Video controls visible
  - [ ] Full-screen mode works
  - [ ] Video loops (if configured)
  - [ ] Mute/unmute works

#### Video Detail Page
- [ ] **Navigation**
  - [ ] Tap video navigates to detail page
  - [ ] Back button returns to feed
  - [ ] Deep linking works (share URL opens detail)

- [ ] **Content Display**
  - [ ] Video plays automatically
  - [ ] Caption displayed
  - [ ] User info shown (avatar, name)
  - [ ] View count displayed
  - [ ] Like count displayed

- [ ] **Interactions**
  - [ ] Like button works (heart icon)
  - [ ] Share button opens share modal
  - [ ] Comment section loads
  - [ ] Report button opens report modal

### 7.2 Video Upload

#### Source Selection
- [ ] **Camera Option**
  - [ ] Camera permission requested
  - [ ] Camera opens successfully
  - [ ] Record video works
  - [ ] Preview shown after recording
  - [ ] Accept/retake options work

- [ ] **Gallery Option**
  - [ ] Gallery permission requested
  - [ ] Gallery opens successfully
  - [ ] Can select video from gallery
  - [ ] Video preview shown
  - [ ] Video info displayed (size, duration)

- [ ] **URL Option**
  - [ ] URL input field shown
  - [ ] Paste video URL works
  - [ ] URL validation works
  - [ ] Invalid URL shows error
  - [ ] Loading indicator while fetching

#### Product Tagging
- [ ] **Product Search**
  - [ ] Search input shown
  - [ ] Type to search works
  - [ ] Debounced search (not instant)
  - [ ] Search results displayed
  - [ ] Product images shown in results

- [ ] **Product Selection**
  - [ ] Tap product to select
  - [ ] Selected products show chips
  - [ ] Can select up to 10 products
  - [ ] Can select minimum 5 products
  - [ ] Remove product works (X button on chip)
  - [ ] Error shown if < 5 products on submit

- [ ] **Product Search Edge Cases**
  - [ ] Search with no results shows message
  - [ ] Search loading state shown
  - [ ] Search error handled gracefully
  - [ ] Can clear search and start over

#### Upload Process
- [ ] **Upload Progress**
  - [ ] Progress bar shown (0-100%)
  - [ ] Percentage text displayed
  - [ ] Estimated time shown (if available)
  - [ ] Can cancel upload
  - [ ] Upload runs in background

- [ ] **Upload Success**
  - [ ] Success toast notification shown
  - [ ] Redirect to video detail page OR feed
  - [ ] Video visible in feed immediately
  - [ ] All product tags saved correctly

- [ ] **Upload Errors**
  - [ ] File too large: Clear error message
  - [ ] Invalid file type: Clear error message
  - [ ] Network error: Retry option
  - [ ] Cloudinary error: User-friendly message
  - [ ] Generic error: Contact support message

#### Upload Validation
- [ ] **File Size**
  - [ ] 50MB video uploads successfully
  - [ ] 51MB video rejected with error
  - [ ] Error message: "Video must be under 50MB"

- [ ] **File Type**
  - [ ] MP4 file uploads
  - [ ] MOV file uploads
  - [ ] WebM file uploads
  - [ ] AVI file rejected (not in allowed list)
  - [ ] Error message: "Only MP4, MOV, WebM allowed"

- [ ] **Product Count**
  - [ ] Upload with 5 products succeeds
  - [ ] Upload with 10 products succeeds
  - [ ] Upload with 4 products blocked
  - [ ] Error message: "Select 5-10 products"
  - [ ] Upload with 11 products blocked
  - [ ] Error message: "Maximum 10 products"

### 7.3 Shopping Integration

#### Product Display in Videos
- [ ] **Product Carousel**
  - [ ] Tagged products shown below video
  - [ ] Carousel scrolls horizontally
  - [ ] Product images load
  - [ ] Product names displayed
  - [ ] Product prices shown (formatted)

- [ ] **Product Cards**
  - [ ] Tap product opens product detail OR
  - [ ] Tap product shows add-to-cart option
  - [ ] Product availability shown
  - [ ] Out-of-stock products grayed out

#### Add to Cart
- [ ] **From Video**
  - [ ] "Add to Cart" button visible
  - [ ] Tap adds to cart
  - [ ] Toast notification: "Added to cart"
  - [ ] Cart icon updates (quantity badge)

- [ ] **Cart Integration**
  - [ ] Cart count increases
  - [ ] Product appears in cart screen
  - [ ] Correct product details (name, price, image)
  - [ ] Quantity defaults to 1
  - [ ] Can update quantity in cart

### 7.4 Reporting System

#### Report Modal
- [ ] **Modal Display**
  - [ ] Tap "Report" opens modal
  - [ ] Modal slides up from bottom
  - [ ] Video title shown in modal
  - [ ] Drag indicator visible

- [ ] **Report Reasons**
  - [ ] All reasons listed:
    - [ ] Inappropriate content
    - [ ] Spam
    - [ ] Misleading information
    - [ ] Copyright violation
    - [ ] Harassment
    - [ ] Other
  - [ ] Can select one reason
  - [ ] Selected reason highlighted

- [ ] **Additional Details**
  - [ ] Optional text field shown
  - [ ] Character limit: 500 chars
  - [ ] Character counter updates
  - [ ] Multiline input works

- [ ] **Submit Report**
  - [ ] Submit disabled until reason selected
  - [ ] Tap submit sends report
  - [ ] Loading indicator during submission
  - [ ] Success message shown
  - [ ] Modal auto-closes after 2 seconds

#### Report Submission
- [ ] **Backend Processing**
  - [ ] Report saved to database
  - [ ] Report count increments
  - [ ] Auto-flag triggers at 5 reports
  - [ ] Flagged video hidden from feed

- [ ] **User Feedback**
  - [ ] Toast notification: "Report submitted"
  - [ ] Can't report same video twice
  - [ ] Error if already reported: "Already reported"

### 7.5 Toast Notifications

Verify toast notifications appear for:
- [ ] **Upload Success**: "Video uploaded successfully"
- [ ] **Upload Error**: "Upload failed. Please try again"
- [ ] **Add to Cart**: "Added to cart"
- [ ] **Like Video**: "Liked" (or heart animation)
- [ ] **Report Submitted**: "Report submitted. Thank you."
- [ ] **Report Error**: "Failed to submit report"
- [ ] **Already Reported**: "You've already reported this video"

**Toast Appearance:**
- [ ] Toasts appear at bottom of screen
- [ ] Auto-dismiss after 3 seconds
- [ ] Can manually dismiss (swipe or tap X)
- [ ] Multiple toasts queue properly
- [ ] Readable text (contrast)

---

## 8. PERFORMANCE VALIDATION

### 8.1 Video Loading Performance

#### Initial Load
- [ ] **Feed Load Time**
  - [ ] Feed loads within 2 seconds
  - [ ] Thumbnails lazy load
  - [ ] Videos don't auto-play (data saving)

#### Video Playback
- [ ] **Playback Performance**
  - [ ] Video starts playing within 1 second
  - [ ] No buffering on 4G/WiFi
  - [ ] Smooth playback (no stuttering)
  - [ ] Seeking works smoothly

### 8.2 Upload Performance

- [ ] **Upload Speed**
  - [ ] 10MB video uploads in < 30 seconds (on WiFi)
  - [ ] 50MB video uploads in < 2 minutes (on WiFi)
  - [ ] Progress updates every second

- [ ] **Background Upload**
  - [ ] Upload continues if app backgrounded
  - [ ] Progress restored if app reopened
  - [ ] Notification shown during upload (optional)

### 8.3 Memory & CPU

- [ ] **Memory Usage**
  - [ ] No memory leaks during video playback
  - [ ] App doesn't crash with 50+ videos in feed
  - [ ] Video resources released after navigation

- [ ] **CPU Usage**
  - [ ] CPU < 30% during normal browsing
  - [ ] CPU < 60% during video upload
  - [ ] Battery drain acceptable

### 8.4 Network Optimization

- [ ] **Data Usage**
  - [ ] Videos lazy load (not all at once)
  - [ ] Thumbnail quality optimized
  - [ ] Video quality adaptive (if Cloudinary configured)

- [ ] **Offline Handling**
  - [ ] Graceful error if no internet
  - [ ] Retry button shown
  - [ ] Cached videos still playable (if implemented)

---

## 9. PLATFORM-SPECIFIC CHECKS

### 9.1 iOS Testing

#### Device Testing
- [ ] **Tested on:**
  - [ ] iPhone 12 / iOS 15
  - [ ] iPhone 13 / iOS 16
  - [ ] iPhone 14 / iOS 17
  - [ ] iPad (if supported)

#### iOS-Specific Features
- [ ] **Camera Access**
  - [ ] Permission prompt appears
  - [ ] Permission denial handled
  - [ ] Settings link shown if denied

- [ ] **Gallery Access**
  - [ ] Photo library permission requested
  - [ ] Can select from Photos app
  - [ ] Video preview works

- [ ] **Video Playback**
  - [ ] Native video player works
  - [ ] Full-screen mode works
  - [ ] AirPlay works (if enabled)

- [ ] **Performance**
  - [ ] No frame drops
  - [ ] Smooth scrolling
  - [ ] No crashes

### 9.2 Android Testing

#### Device Testing
- [ ] **Tested on:**
  - [ ] Android 10 / Samsung Galaxy
  - [ ] Android 11 / OnePlus
  - [ ] Android 12 / Pixel
  - [ ] Android 13 / Any device

#### Android-Specific Features
- [ ] **Camera Access**
  - [ ] Permission prompt appears
  - [ ] Permission denial handled
  - [ ] Can open camera app

- [ ] **Gallery Access**
  - [ ] Storage permission requested
  - [ ] Can select from Gallery
  - [ ] Video preview works

- [ ] **Video Playback**
  - [ ] ExoPlayer works smoothly
  - [ ] Full-screen mode works
  - [ ] Hardware acceleration enabled

- [ ] **Performance**
  - [ ] No ANR (Application Not Responding)
  - [ ] Smooth scrolling
  - [ ] No crashes

### 9.3 Web Testing (if applicable)

- [ ] **Browser Support**
  - [ ] Chrome (latest)
  - [ ] Safari (latest)
  - [ ] Firefox (latest)
  - [ ] Edge (latest)

- [ ] **Web-Specific**
  - [ ] File upload from desktop works
  - [ ] Video playback in browser
  - [ ] Responsive design (mobile/tablet/desktop)

### 9.4 Network Conditions

Test on:
- [ ] **WiFi** (fast connection)
  - [ ] Upload works
  - [ ] Playback smooth
  - [ ] No errors

- [ ] **4G** (mobile data)
  - [ ] Upload works (slower)
  - [ ] Playback smooth
  - [ ] Data usage acceptable

- [ ] **3G** (slow connection)
  - [ ] Upload shows progress
  - [ ] Playback works (may buffer)
  - [ ] Timeout handled

- [ ] **Offline**
  - [ ] Clear error message
  - [ ] Retry option available
  - [ ] No crashes

---

## 10. DOCUMENTATION REVIEW

### 10.1 User-Facing Documentation

- [ ] **Help Center / FAQ**
  - [ ] How to upload a video
  - [ ] How to tag products
  - [ ] How to report inappropriate content
  - [ ] Upload limits (file size, duration, formats)
  - [ ] Troubleshooting upload errors

- [ ] **In-App Guidance**
  - [ ] First-time upload tutorial (optional)
  - [ ] Tooltips for product tagging
  - [ ] Report modal instructions

### 10.2 Developer Documentation

- [ ] **API Documentation**
  - [ ] UGC endpoints documented
  - [ ] Request/response examples
  - [ ] Error codes listed
  - [ ] Rate limits documented

- [ ] **Code Comments**
  - [ ] Complex logic explained
  - [ ] Component props documented
  - [ ] Service methods described

### 10.3 Operations Documentation

- [ ] **Monitoring**
  - [ ] Cloudinary usage dashboard
  - [ ] Video upload success rate
  - [ ] Report volume tracking

- [ ] **Troubleshooting**
  - [ ] Upload failure debugging
  - [ ] Cloudinary connection issues
  - [ ] Video playback problems

---

## FINAL SIGN-OFF

### Development Team
- [ ] **Frontend Engineer:** __________________ Date: ________
  - All UGC components tested
  - Upload flow verified
  - Shopping integration working

- [ ] **Backend Engineer:** __________________ Date: ________
  - All UGC APIs tested
  - Cloudinary integration verified
  - Auto-flagging logic working

- [ ] **QA Engineer:** ______________________ Date: ________
  - All test cases passed
  - Cross-platform testing complete
  - No critical bugs

### Management
- [ ] **Product Manager:** __________________ Date: ________
  - Feature acceptance criteria met
  - User flows validated

- [ ] **Technical Lead:** ___________________ Date: ________
  - Code review complete
  - Architecture approved

---

## NEXT STEPS

After completing this checklist:
1. ✅ Proceed to **LAUNCH_CHECKLIST.md** for launch day procedures
2. ✅ Review **ROLLBACK_PLAN.md** for emergency procedures
3. ✅ Set up monitoring per **MONITORING_GUIDE.md**

---

**Document Version:** 1.0.0
**Last Updated:** November 8, 2025
**Next Review:** Before production deployment
