# UGC Upload System - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MainStorePage.tsx                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ State Management                                        │ │
│  │ • showUploadModal: boolean                             │ │
│  │ • isAuthenticated: boolean (from AuthContext)          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────┐         ┌────────────────────────┐ │
│  │ UGCUploadFAB       │         │  UGCUploadModal        │ │
│  │ (Floating Button)  │─click──▶│  (Multi-step Flow)     │ │
│  │                    │         │                        │ │
│  │ • Camera icon      │         │  Step 1: Media Select  │ │
│  │ • Purple (#7C3AED) │         │  Step 2: Preview       │ │
│  │ • Animated         │         │  Step 3: Details       │ │
│  │ • Haptic feedback  │         │  Step 4: Uploading     │ │
│  │                    │         │  Step 5: Success       │ │
│  └────────────────────┘         └──────────┬─────────────┘ │
│                                             │                │
└─────────────────────────────────────────────┼────────────────┘
                                              │
                                              ▼
                ┌─────────────────────────────────────────────┐
                │         ugcApi.ts / ugcUploadService.ts     │
                │  ┌───────────────────────────────────────┐  │
                │  │ create(data, formData)                │  │
                │  │ uploadContent(formData, onProgress)   │  │
                │  │ validateUploadFile(uri, type, size)   │  │
                │  └───────────────┬───────────────────────┘  │
                └──────────────────┼───────────────────────────┘
                                   │
                                   ▼
                ┌─────────────────────────────────────────────┐
                │         apiClient.ts (Base Client)          │
                │  ┌───────────────────────────────────────┐  │
                │  │ • Auth token management               │  │
                │  │ • Request/response handling           │  │
                │  │ • Error handling                      │  │
                │  │ • Token refresh logic                 │  │
                │  └───────────────┬───────────────────────┘  │
                └──────────────────┼───────────────────────────┘
                                   │
                                   ▼
                ┌─────────────────────────────────────────────┐
                │         Backend API (POST /api/ugc)         │
                │  ┌───────────────────────────────────────┐  │
                │  │ • Receives FormData                   │  │
                │  │ • Validates file                      │  │
                │  │ • Stores in cloud/database            │  │
                │  │ • Returns UGCMedia object             │  │
                │  └───────────────────────────────────────┘  │
                └─────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
MainStorePage
│
├── UGCSection
│   ├── UGCGrid (displays content)
│   └── View All Button
│
├── UGCUploadFAB ◄──────────────┐
│   └── Animated.View            │ Only visible if
│       └── TouchableOpacity     │ isAuthenticated === true
│           └── Ionicons (camera)│
│                                 │
└── UGCUploadModal ◄─────────────┘
    │
    ├── LinearGradient (header)
    │   └── HeaderControls
    │       ├── Back Button
    │       ├── Title
    │       └── Close Button
    │
    ├── Step 1: MediaSelection
    │   ├── Take Photo/Video Card
    │   │   └── LinearGradient
    │   │       ├── Camera Icon
    │   │       └── Text
    │   │
    │   └── Choose from Library Card
    │       └── LinearGradient
    │           ├── Images Icon
    │           └── Text
    │
    ├── Step 2: Preview
    │   ├── Media Preview
    │   │   ├── Image (if photo)
    │   │   └── Video (if video)
    │   │
    │   ├── Caption Input
    │   │   └── Character Counter
    │   │
    │   ├── Checkboxes
    │   │   ├── Tag Product
    │   │   └── Tag Location
    │   │
    │   ├── Privacy Selector
    │   │   ├── Public
    │   │   ├── Private
    │   │   └── Friends
    │   │
    │   └── Next Button
    │       └── LinearGradient
    │
    ├── Step 3: Details
    │   ├── Category Selector
    │   │   ├── Product Review
    │   │   ├── Tutorial
    │   │   ├── Unboxing
    │   │   └── Experience
    │   │
    │   ├── Hashtag Input
    │   │   ├── TextInput
    │   │   └── Add Button
    │   │
    │   ├── Hashtag Chips
    │   │   └── Chip (repeated)
    │   │       ├── #text
    │   │       └── Remove Button
    │   │
    │   └── Upload Button
    │       └── LinearGradient
    │
    ├── Step 4: Uploading
    │   ├── ActivityIndicator
    │   ├── Status Text
    │   ├── Progress Bar
    │   │   ├── Background
    │   │   └── Fill (animated width)
    │   ├── Percentage
    │   └── Cancel Button
    │
    └── Step 5: Success
        ├── Animated Checkmark
        │   └── Ionicons (checkmark-circle)
        ├── Success Title
        ├── Success Subtitle
        └── Action Buttons
            ├── View Post (outlined)
            └── Upload Another (gradient)
```

---

## Data Flow

### 1. Upload Initiation
```
User
  │
  ├─ Press FAB ──────────────────────────────┐
  │                                           │
  └─ onPress callback ────────────────▶ MainStorePage
                                             │
                                             ├─ setShowUploadModal(true)
                                             │
                                             └─ UGCUploadModal opens
```

### 2. Media Selection
```
UGCUploadModal (Step 1)
  │
  ├─ "Take Photo/Video" ───────────▶ expo-image-picker
  │                                   │
  │                                   ├─ Request camera permission
  │                                   ├─ Open camera
  │                                   └─ Return image/video URI
  │
  └─ "Choose from Library" ─────────▶ expo-image-picker
                                      │
                                      ├─ Request library permission
                                      ├─ Open photo picker
                                      └─ Return image/video URI

                                      │
                                      ▼
                                validateFile(uri, type, size)
                                      │
                                      ├─ Check size (10MB/50MB)
                                      ├─ Check format
                                      │
                                      ├─ If valid ──────▶ Step 2
                                      └─ If invalid ────▶ Show error
```

### 3. Form Data Collection
```
Step 2: Preview
  │
  ├─ Caption input ──────────────────▶ caption: string
  ├─ Tag Product checkbox ───────────▶ tagProduct: boolean
  ├─ Tag Location checkbox ──────────▶ tagLocation: boolean
  └─ Privacy selector ───────────────▶ privacy: 'public' | 'private' | 'friends'
                                      │
                                      └─ Next ────▶ Step 3

Step 3: Details
  │
  ├─ Category selector ──────────────▶ category: CategoryType
  └─ Hashtag input ──────────────────▶ hashtags: string[]
                                      │
                                      └─ Upload ───▶ Step 4
```

### 4. Upload Process
```
Step 4: Uploading
  │
  ├─ Create FormData
  │   ├─ file: File
  │   ├─ type: 'photo' | 'video'
  │   ├─ caption: string
  │   ├─ tags: string[]
  │   ├─ relatedStoreId?: string
  │   └─ relatedProductId?: string
  │
  ├─ Call ugcApi.create(data, formData)
  │   │
  │   └─ Uses XMLHttpRequest for progress
  │       │
  │       ├─ xhr.upload.addEventListener('progress')
  │       │   └─ Update progress bar: 0% → 100%
  │       │
  │       ├─ xhr.addEventListener('load')
  │       │   └─ Parse response
  │       │       ├─ Success ──────▶ Step 5
  │       │       └─ Error ────────▶ Show error
  │       │
  │       └─ xhr.addEventListener('error')
  │           └─ Show network error
  │
  └─ Or Cancel
      └─ Show confirmation
          └─ Abort upload
```

### 5. Success & Callback
```
Step 5: Success
  │
  ├─ Animate checkmark (spring scale)
  ├─ Show success message
  ├─ Show action buttons
  │
  ├─ Auto-close timer (3s)
  │   └─ Close modal
  │       └─ Call onUploadSuccess(contentId)
  │           │
  │           └─ MainStorePage receives callback
  │               │
  │               ├─ Log: 'Upload successful: {contentId}'
  │               ├─ Refresh UGC feed (optional)
  │               └─ Navigate to content (optional)
  │
  └─ Or User Action
      ├─ "View Post" ──────────▶ Navigate to /ugc/{contentId}
      └─ "Upload Another" ─────▶ Reset to Step 1
```

---

## State Machine

```
┌─────────────┐
│   CLOSED    │ ◄──────────────────────┐
│  (hidden)   │                        │
└──────┬──────┘                        │
       │                               │
       │ FAB press                     │ onClose()
       │                               │
       ▼                               │
┌─────────────┐                        │
│   MEDIA     │                        │
│ SELECTION   │ ◄───────┐              │
└──────┬──────┘         │              │
       │                │ Back         │
       │ Media selected │              │
       │                │              │
       ▼                │              │
┌─────────────┐         │              │
│   PREVIEW   │ ────────┘              │
│  & CAPTION  │                        │
└──────┬──────┘                        │
       │                               │
       │ Next                          │
       │                               │
       ▼                               │
┌─────────────┐                        │
│   DETAILS   │                        │
│    FORM     │                        │
└──────┬──────┘                        │
       │                               │
       │ Upload                        │
       │                               │
       ▼                               │
┌─────────────┐                        │
│  UPLOADING  │ ───error───────────────┤
│  (progress) │                        │
└──────┬──────┘                        │
       │                               │
       │ Success                       │
       │                               │
       ▼                               │
┌─────────────┐                        │
│   SUCCESS   │                        │
│(confirmation)│ ───auto-close─────────┘
└─────────────┘     (3 seconds)
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│                      App Launch                          │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
           ┌──────────────────────┐
           │   AuthContext Init   │
           └──────────┬───────────┘
                      │
                      ├─ Check stored token
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
   Token Valid              Token Invalid
         │                         │
         │                         ▼
         │                   isAuthenticated = false
         │                         │
         ▼                         │
   isAuthenticated = true          │
         │                         │
         └────────────┬────────────┘
                      │
                      ▼
           ┌──────────────────────┐
           │    MainStorePage     │
           └──────────┬───────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
   isAuthenticated            !isAuthenticated
         │                         │
         ▼                         │
   Show UGCUploadFAB              │
         │                         │
         │                    Hide UGCUploadFAB
         │                         │
         ▼                         ▼
   User can upload         User cannot upload
         │                         │
         │                    On FAB press (if shown):
         │                    Show "Sign In Required" alert
         │
         ▼
   UGCUploadModal opens
         │
         ├─ Auth token auto-added to upload
         │  (by apiClient.getAuthToken())
         │
         └─ Upload with authentication
```

---

## Error Handling Flow

```
                    Upload Process
                          │
                          ▼
              ┌───────────────────────┐
              │  Validation (Client)  │
              └───────┬───────────────┘
                      │
         ┌────────────┼────────────┐
         │ Valid      │ Invalid    │
         │            ▼            │
         │    ┌──────────────┐    │
         │    │ Show Error   │    │
         │    │ (red banner) │    │
         │    └──────────────┘    │
         │            │            │
         │            └─ Stay on current step
         │
         ▼
 ┌──────────────────┐
 │ Network Request  │
 └───────┬──────────┘
         │
    ┌────┴────┐
    │ Success │ Failure
    │         │
    ▼         ▼
┌────────┐ ┌────────────────────┐
│Step 5  │ │ Parse Error Type   │
│Success │ └─────────┬──────────┘
└────────┘           │
                ┌────┼────────┐
                │    │        │
         Network   Auth    Server
         Error     Error   Error
           │        │        │
           ▼        ▼        ▼
       ┌──────────────────────┐
       │   Show Error Banner  │
       │   • Network error    │
       │   • 401 Unauthorized │
       │   • 500 Server error │
       └──────────┬───────────┘
                  │
                  ├─ Stay on Step 4 (Uploading)
                  │
                  └─ User can:
                      • Retry (attempt again)
                      • Cancel (go back)
                      • Close modal
```

---

## Progress Tracking

```
XMLHttpRequest Upload
         │
         ├─ loadstart
         │   └─ setMediaLoading(true)
         │      setUploadProgress(0)
         │
         ├─ progress (fires multiple times)
         │   │
         │   └─ event.loaded / event.total
         │       │
         │       └─ Calculate percentage: (loaded/total) * 100
         │           │
         │           └─ onProgress(percentage)
         │               │
         │               └─ Update UI:
         │                   ├─ Progress bar width: {percentage}%
         │                   └─ Text: "{percentage}%"
         │
         ├─ load (complete)
         │   │
         │   ├─ setUploadProgress(100)
         │   ├─ Parse response
         │   └─ Navigate to Step 5 (Success)
         │
         ├─ error
         │   └─ Show error message
         │       Stay on Step 4
         │
         └─ abort
             └─ Show "Upload cancelled"
                 Navigate to Step 3 (Details)
```

---

## File Structure

```
frontend/
│
├── components/
│   └── ugc/
│       ├── UGCUploadFAB.tsx          142 lines
│       │   ├── Props interface
│       │   ├── Animation setup
│       │   ├── Press handler
│       │   └── Styled component
│       │
│       └── UGCUploadModal.tsx      1,013 lines
│           ├── Props interface
│           ├── State management (17 states)
│           ├── Validation functions
│           ├── Media handlers
│           ├── Upload logic
│           ├── Step renderers (5 functions)
│           └── Styles
│
├── services/
│   ├── ugcApi.ts                     598 lines (existing)
│   │   ├── UGCMedia interface
│   │   ├── CreateUGCRequest interface
│   │   ├── create() method
│   │   ├── update() method
│   │   ├── delete() method
│   │   └── ... (other methods)
│   │
│   ├── ugcUploadService.ts           123 lines (new)
│   │   ├── uploadUGCContent()
│   │   │   └── XMLHttpRequest with progress
│   │   │
│   │   └── validateUploadFile()
│   │       └── Size & format validation
│   │
│   └── apiClient.ts                  (existing)
│       ├── setAuthToken()
│       ├── getAuthToken()
│       ├── makeRequest()
│       └── uploadFile()
│
└── types/
    └── ugc-upload.types.ts           213 lines (existing)
        ├── UploadSource
        ├── UploadStatus
        ├── VideoMetadata
        ├── UploadProgress
        └── ... (other types)
```

---

## Dependencies Graph

```
UGCUploadModal
  │
  ├─ React (hooks)
  │   ├─ useState
  │   ├─ useCallback
  │   ├─ useRef
  │   └─ useEffect
  │
  ├─ React Native
  │   ├─ Modal
  │   ├─ View
  │   ├─ Text
  │   ├─ TextInput
  │   ├─ TouchableOpacity
  │   ├─ ScrollView
  │   ├─ Image
  │   ├─ ActivityIndicator
  │   ├─ Animated
  │   ├─ Alert
  │   └─ KeyboardAvoidingView
  │
  ├─ Expo
  │   ├─ expo-linear-gradient
  │   ├─ expo-image-picker
  │   ├─ expo-haptics
  │   ├─ expo-av (Video)
  │   └─ @expo/vector-icons
  │
  └─ Services
      ├─ ugcApi
      │   └─ create()
      │
      └── ugcUploadService
          ├─ uploadUGCContent()
          └─ validateUploadFile()
```

---

## Memory Management

### State Cleanup
```
Modal Close
  │
  └─ setTimeout(() => {
      resetState()
        │
        ├─ Clear media references
        ├─ Reset form values
        ├─ Clear errors
        └─ Reset animations
     }, 300)  // Wait for close animation
```

### Animation Cleanup
```
useEffect(() => {
  // Set up animations

  return () => {
    // Clean up animations
    fadeAnim.stopAnimation()
    scaleAnim.stopAnimation()
  }
}, [visible])
```

### XHR Cleanup
```
Upload Cancel
  │
  └─ xhr.abort()
      │
      └─ Fires 'abort' event
          │
          └─ Clear progress
              └─ Reset state
```

---

## Security Considerations

### File Validation (Client-Side)
```
validateUploadFile()
  │
  ├─ Check file size
  │   └─ Prevent large files (DoS)
  │
  ├─ Check file extension
  │   └─ Prevent executable files
  │
  └─ Check MIME type (future)
      └─ Verify actual file content
```

### API Security
```
Upload Request
  │
  ├─ Auth Token (Bearer)
  │   └─ Verifies user identity
  │
  ├─ HTTPS (production)
  │   └─ Encrypted transmission
  │
  └─ Server-side validation
      ├─ Re-validate file size
      ├─ Re-validate file type
      ├─ Scan for malware
      └─ Check user permissions
```

---

This architecture provides a **robust, scalable, and maintainable** UGC upload system! 🎉
