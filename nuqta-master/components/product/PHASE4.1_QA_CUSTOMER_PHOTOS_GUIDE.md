# Phase 4.1: Q&A Section and Customer Photos Implementation Guide

## Overview

This guide covers the implementation of two major engagement features for the MainStorePage:
1. **Q&A Section** - Allows customers to ask and answer questions about products
2. **Customer Photos** - Enables customers to upload and view product photos

---

## 📦 Components Created

### 1. QASection Component
**File:** `components/product/QASection.tsx`

A simplified, self-contained Q&A component that provides:
- Question submission interface
- Answer submission with inline forms
- Helpful voting system
- Seller and verified purchase badges
- Empty states and loading states
- Collapsible question cards

### 2. CustomerPhotos Component
**File:** `components/product/CustomerPhotos.tsx`

A complete customer photo gallery with:
- Image upload using expo-image-picker
- Horizontal scrollable photo grid
- Full-screen photo modal
- Helpful voting for photos
- Verified purchase badges
- Permission handling
- Empty states

---

## 🚀 Quick Start

### Import Components

```typescript
import { QASection, CustomerPhotos } from '@/components/product';
```

### Basic Usage

```typescript
import React from 'react';
import { ScrollView } from 'react-native';
import { QASection, CustomerPhotos } from '@/components/product';

export default function ProductPage() {
  const productId = '123';

  return (
    <ScrollView>
      {/* Other product content */}

      <QASection
        productId={productId}
        questions={mockQuestions}
        onAskQuestion={handleAskQuestion}
        onAnswerQuestion={handleAnswerQuestion}
        onMarkHelpful={handleMarkHelpful}
      />

      <CustomerPhotos
        productId={productId}
        photos={mockPhotos}
        onUploadPhoto={handleUploadPhoto}
        onMarkHelpful={handlePhotoHelpful}
      />
    </ScrollView>
  );
}
```

---

## 📊 Data Structures

### Question Interface

```typescript
interface Question {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: Date;
  answers: Answer[];
  helpful: number;
}
```

### Answer Interface

```typescript
interface Answer {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: Date;
  helpful: number;
  isSeller?: boolean;           // Shows "Seller" badge
  isVerifiedPurchase?: boolean; // Shows "Verified" badge
}
```

### CustomerPhoto Interface

```typescript
interface CustomerPhoto {
  id: string;
  userId: string;
  userName: string;
  imageUrl: string;
  caption?: string;
  helpful: number;
  createdAt: Date;
  isVerifiedPurchase?: boolean;
}
```

---

## 💡 Mock Data Examples

### Mock Questions

```typescript
const mockQuestions: Question[] = [
  {
    id: 'q1',
    userId: 'user1',
    userName: 'John Doe',
    text: 'Is this product waterproof?',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    helpful: 5,
    answers: [
      {
        id: 'a1',
        userId: 'seller',
        userName: 'Store Owner',
        text: 'Yes, it is water-resistant up to 3 meters (IP68 rated).',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        helpful: 12,
        isSeller: true,
      },
      {
        id: 'a2',
        userId: 'user2',
        userName: 'Jane Smith',
        text: 'I can confirm it works great in the rain!',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        helpful: 8,
        isVerifiedPurchase: true,
      },
    ],
  },
  {
    id: 'q2',
    userId: 'user3',
    userName: 'Mike Wilson',
    text: 'What is the battery life?',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    helpful: 3,
    answers: [],
  },
];
```

### Mock Photos

```typescript
const mockPhotos: CustomerPhoto[] = [
  {
    id: 'p1',
    userId: 'user2',
    userName: 'Jane Smith',
    imageUrl: 'https://picsum.photos/400/300?random=1',
    caption: 'Absolutely love this product! Works as advertised.',
    helpful: 8,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    isVerifiedPurchase: true,
  },
  {
    id: 'p2',
    userId: 'user4',
    userName: 'Alex Johnson',
    imageUrl: 'https://picsum.photos/400/300?random=2',
    helpful: 15,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    isVerifiedPurchase: true,
  },
  {
    id: 'p3',
    userId: 'user5',
    userName: 'Sarah Lee',
    imageUrl: 'https://picsum.photos/400/300?random=3',
    caption: 'Great quality, highly recommend!',
    helpful: 6,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    isVerifiedPurchase: false,
  },
];
```

---

## 🔧 Implementation Examples

### Complete MainStorePage Integration

```typescript
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { QASection, CustomerPhotos } from '@/components/product';
import { uploadProductPhoto, submitQuestion, submitAnswer, markHelpful } from '@/services/productApi';

export default function MainStorePage({ route }) {
  const { productId } = route.params;
  const [questions, setQuestions] = useState(mockQuestions);
  const [photos, setPhotos] = useState(mockPhotos);

  /**
   * Handle ask question
   */
  const handleAskQuestion = async (questionText: string) => {
    try {
      const newQuestion = await submitQuestion(productId, questionText);
      setQuestions(prev => [newQuestion, ...prev]);
      Alert.alert('Success', 'Your question has been posted!');
    } catch (error) {
      console.error('Failed to submit question:', error);
      Alert.alert('Error', 'Failed to post question. Please try again.');
      throw error;
    }
  };

  /**
   * Handle answer question
   */
  const handleAnswerQuestion = async (questionId: string, answerText: string) => {
    try {
      const newAnswer = await submitAnswer(questionId, answerText);
      setQuestions(prev =>
        prev.map(q =>
          q.id === questionId
            ? { ...q, answers: [...q.answers, newAnswer] }
            : q
        )
      );
      Alert.alert('Success', 'Your answer has been posted!');
    } catch (error) {
      console.error('Failed to submit answer:', error);
      Alert.alert('Error', 'Failed to post answer. Please try again.');
      throw error;
    }
  };

  /**
   * Handle mark Q&A helpful
   */
  const handleMarkHelpful = (questionId: string, answerId?: string) => {
    try {
      if (answerId) {
        // Mark answer as helpful
        setQuestions(prev =>
          prev.map(q =>
            q.id === questionId
              ? {
                  ...q,
                  answers: q.answers.map(a =>
                    a.id === answerId ? { ...a, helpful: a.helpful + 1 } : a
                  ),
                }
              : q
          )
        );
      } else {
        // Mark question as helpful
        setQuestions(prev =>
          prev.map(q =>
            q.id === questionId ? { ...q, helpful: q.helpful + 1 } : q
          )
        );
      }
      markHelpful(questionId, answerId);
    } catch (error) {
      console.error('Failed to mark helpful:', error);
    }
  };

  /**
   * Handle photo upload
   */
  const handleUploadPhoto = async (photo: { uri: string; caption?: string }) => {
    try {
      const uploadedPhoto = await uploadProductPhoto(productId, photo);
      setPhotos(prev => [uploadedPhoto, ...prev]);
    } catch (error) {
      console.error('Failed to upload photo:', error);
      throw error;
    }
  };

  /**
   * Handle mark photo helpful
   */
  const handlePhotoHelpful = (photoId: string) => {
    try {
      setPhotos(prev =>
        prev.map(p =>
          p.id === photoId ? { ...p, helpful: p.helpful + 1 } : p
        )
      );
      markHelpful(photoId);
    } catch (error) {
      console.error('Failed to mark photo helpful:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Other product sections */}

      <QASection
        productId={productId}
        questions={questions}
        onAskQuestion={handleAskQuestion}
        onAnswerQuestion={handleAnswerQuestion}
        onMarkHelpful={handleMarkHelpful}
        maxQuestions={10}
      />

      <CustomerPhotos
        productId={productId}
        photos={photos}
        onUploadPhoto={handleUploadPhoto}
        onMarkHelpful={handlePhotoHelpful}
        maxPhotos={50}
        enableUpload={true}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

---

## 📱 Image Upload Flow

### 1. Permission Request
```typescript
const requestPermissions = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Please grant access to your photo library');
    return false;
  }
  return true;
};
```

### 2. Pick Image
```typescript
const pickImage = async () => {
  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    await handleUpload(result.assets[0].uri);
  }
};
```

### 3. Upload to Server
```typescript
const handleUpload = async (uri: string) => {
  setUploading(true);
  try {
    const formData = new FormData();
    formData.append('photo', {
      uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    const response = await fetch(`/api/products/${productId}/photos`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = await response.json();
    return data;
  } finally {
    setUploading(false);
  }
};
```

---

## 🎨 Component Features

### QASection Features
- ✅ Ask questions with character limit (500)
- ✅ Answer existing questions inline
- ✅ Collapsible question cards
- ✅ Seller badges (yellow)
- ✅ Verified purchase badges (green)
- ✅ Helpful voting for questions and answers
- ✅ Relative date formatting
- ✅ Empty state messaging
- ✅ Loading states during submission
- ✅ Maximum questions display limit
- ✅ User avatars with initials

### CustomerPhotos Features
- ✅ Horizontal scrollable photo grid
- ✅ Image upload with expo-image-picker
- ✅ Permission handling
- ✅ Full-screen photo modal
- ✅ Photo captions
- ✅ Helpful voting for photos
- ✅ Verified purchase badges
- ✅ Empty state with upload prompt
- ✅ Loading indicator during upload
- ✅ User info display in modal
- ✅ Responsive image sizing

---

## 🎯 Props Reference

### QASection Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `productId` | string | ✅ | - | Product identifier |
| `questions` | Question[] | ❌ | [] | Array of questions |
| `onAskQuestion` | (text: string) => Promise<void> | ❌ | - | Callback when question submitted |
| `onAnswerQuestion` | (qId: string, text: string) => Promise<void> | ❌ | - | Callback when answer submitted |
| `onMarkHelpful` | (qId: string, aId?: string) => void | ❌ | - | Callback when marked helpful |
| `maxQuestions` | number | ❌ | 10 | Maximum questions to display |

### CustomerPhotos Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `productId` | string | ✅ | - | Product identifier |
| `photos` | CustomerPhoto[] | ❌ | [] | Array of customer photos |
| `onUploadPhoto` | (photo: {uri: string, caption?: string}) => Promise<void> | ❌ | - | Callback when photo uploaded |
| `onMarkHelpful` | (photoId: string) => void | ❌ | - | Callback when photo marked helpful |
| `maxPhotos` | number | ❌ | 50 | Maximum photos to display |
| `enableUpload` | boolean | ❌ | true | Enable/disable upload button |

---

## 🔒 Permissions

### iOS (app.json / Info.plist)
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "We need access to your photo library to upload product images.",
        "NSPhotoLibraryAddUsageDescription": "We need access to save photos to your library."
      }
    }
  }
}
```

### Android (app.json / AndroidManifest.xml)
```json
{
  "expo": {
    "android": {
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

---

## ✅ Testing Checklist

### Q&A Section
- [ ] Question submission works
- [ ] Answer submission works
- [ ] Helpful voting increments correctly
- [ ] Seller badges display correctly
- [ ] Verified badges display correctly
- [ ] Empty state shows when no questions
- [ ] Character limit enforced (500)
- [ ] Loading states show during API calls
- [ ] Date formatting works correctly
- [ ] Cancel buttons work

### Customer Photos
- [ ] Photo picker opens correctly
- [ ] Permission request works
- [ ] Photo upload completes
- [ ] Photos display in grid
- [ ] Full-screen modal works
- [ ] Helpful voting works
- [ ] Verified badges show
- [ ] Empty state displays correctly
- [ ] Upload button disabled while uploading
- [ ] Close modal works

---

## 🐛 Common Issues

### Issue: Permission Denied
**Solution:** Ensure permissions are configured in app.json and user grants access

### Issue: Image Not Uploading
**Solution:** Check server endpoint, FormData format, and file size limits

### Issue: Photos Not Displaying
**Solution:** Verify image URLs are accessible and using HTTPS

### Issue: Helpful Count Not Updating
**Solution:** Ensure state updates and API calls are properly implemented

---

## 📈 Performance Tips

1. **Lazy Load Photos** - Only load visible photos in viewport
2. **Image Optimization** - Compress images before upload (quality: 0.8)
3. **Pagination** - Use maxQuestions and maxPhotos props
4. **Debounce Helpful** - Prevent rapid clicking on helpful buttons
5. **Cache Images** - Use React Native Fast Image for better caching

---

## 🚀 Future Enhancements

- [ ] Photo filters and editing before upload
- [ ] Video support alongside photos
- [ ] Question categories/tags
- [ ] Sort Q&A by helpful, recent, unanswered
- [ ] Report inappropriate content
- [ ] Share questions/photos
- [ ] Follow-up notifications
- [ ] Search within Q&A
- [ ] Multiple photo upload
- [ ] Photo zoom/pinch gestures

---

## 📝 Summary

### Components Created
1. **QASection.tsx** - Full Q&A functionality with inline answers
2. **CustomerPhotos.tsx** - Photo gallery with upload capability

### Key Features
- Complete Q&A system with seller/verified badges
- Image upload with expo-image-picker
- Helpful voting system
- Permission handling
- Empty and loading states
- Full-screen photo modal
- Responsive design with design tokens

### Integration Points
- MainStorePage
- ProductPage
- Any product detail view

---

**Status:** ✅ Implementation Complete
**Phase:** 4.1
**Agent:** Agent 1
**Date:** 2025-11-14
