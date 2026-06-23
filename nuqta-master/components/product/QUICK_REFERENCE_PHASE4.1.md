# Quick Reference - Phase 4.1 Components

## 🚀 Quick Import

```typescript
import { QASection, CustomerPhotos } from '@/components/product';
```

---

## 📋 QASection

### Basic Usage
```typescript
<QASection
  productId="123"
  questions={questions}
  onAskQuestion={handleAsk}
  onAnswerQuestion={handleAnswer}
  onMarkHelpful={handleHelpful}
/>
```

### Props
| Prop | Type | Required | Default |
|------|------|----------|---------|
| productId | string | ✅ | - |
| questions | Question[] | ❌ | [] |
| onAskQuestion | (text: string) => Promise<void> | ❌ | - |
| onAnswerQuestion | (qId: string, text: string) => Promise<void> | ❌ | - |
| onMarkHelpful | (qId: string, aId?: string) => void | ❌ | - |
| maxQuestions | number | ❌ | 10 |

### Data Structure
```typescript
interface Question {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Date;
  answers: Answer[];
  helpful: number;
}

interface Answer {
  id: string;
  userName: string;
  text: string;
  createdAt: Date;
  helpful: number;
  isSeller?: boolean;           // Yellow badge
  isVerifiedPurchase?: boolean; // Green badge
}
```

---

## 📸 CustomerPhotos

### Basic Usage
```typescript
<CustomerPhotos
  productId="123"
  photos={photos}
  onUploadPhoto={handleUpload}
  onMarkHelpful={handleHelpful}
/>
```

### Props
| Prop | Type | Required | Default |
|------|------|----------|---------|
| productId | string | ✅ | - |
| photos | CustomerPhoto[] | ❌ | [] |
| onUploadPhoto | (photo: {uri: string, caption?: string}) => Promise<void> | ❌ | - |
| onMarkHelpful | (photoId: string) => void | ❌ | - |
| maxPhotos | number | ❌ | 50 |
| enableUpload | boolean | ❌ | true |

### Data Structure
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

## 🎯 Mock Data

### Questions
```typescript
const mockQuestions = [
  {
    id: 'q1',
    userId: 'user1',
    userName: 'John Doe',
    text: 'Is this waterproof?',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    helpful: 5,
    answers: [
      {
        id: 'a1',
        userId: 'seller',
        userName: 'Store Owner',
        text: 'Yes, IP68 rated!',
        createdAt: new Date(),
        helpful: 12,
        isSeller: true,
      },
    ],
  },
];
```

### Photos
```typescript
const mockPhotos = [
  {
    id: 'p1',
    userId: 'user2',
    userName: 'Jane Smith',
    imageUrl: 'https://picsum.photos/400/300',
    caption: 'Love it!',
    helpful: 8,
    createdAt: new Date(),
    isVerifiedPurchase: true,
  },
];
```

---

## 🔧 Handler Examples

### Q&A Handlers
```typescript
const handleAskQuestion = async (text: string) => {
  const newQ = await api.submitQuestion(productId, text);
  setQuestions(prev => [newQ, ...prev]);
};

const handleAnswerQuestion = async (qId: string, text: string) => {
  const newA = await api.submitAnswer(qId, text);
  setQuestions(prev =>
    prev.map(q => q.id === qId ? {...q, answers: [...q.answers, newA]} : q)
  );
};

const handleMarkHelpful = (qId: string, aId?: string) => {
  if (aId) {
    setQuestions(prev =>
      prev.map(q => q.id === qId
        ? {...q, answers: q.answers.map(a =>
            a.id === aId ? {...a, helpful: a.helpful + 1} : a)}
        : q)
    );
  } else {
    setQuestions(prev =>
      prev.map(q => q.id === qId ? {...q, helpful: q.helpful + 1} : q)
    );
  }
};
```

### Photo Handlers
```typescript
const handleUploadPhoto = async (photo: {uri: string, caption?: string}) => {
  const uploaded = await api.uploadPhoto(productId, photo);
  setPhotos(prev => [uploaded, ...prev]);
};

const handlePhotoHelpful = (photoId: string) => {
  setPhotos(prev =>
    prev.map(p => p.id === photoId ? {...p, helpful: p.helpful + 1} : p)
  );
};
```

---

## 🎨 Features

### QASection Features
- ✅ Ask questions (500 char limit)
- ✅ Answer questions inline
- ✅ Seller badges (yellow)
- ✅ Verified badges (green)
- ✅ Helpful voting
- ✅ Relative dates
- ✅ User avatars
- ✅ Empty states
- ✅ Loading states
- ✅ Character counter

### CustomerPhotos Features
- ✅ Image upload (expo-image-picker)
- ✅ Permission handling
- ✅ Horizontal scroll grid
- ✅ Full-screen modal
- ✅ Photo captions
- ✅ Helpful voting
- ✅ Verified badges
- ✅ Empty states
- ✅ Upload loading
- ✅ User avatars

---

## 📱 Permissions

### app.json
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "Upload product photos"
      }
    },
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

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Permission denied | Check app.json and user settings |
| Photos not uploading | Verify FormData format and endpoint |
| Empty states not showing | Ensure empty arrays are passed |
| Helpful not incrementing | Check state update logic |

---

## ✅ Testing Checklist

- [ ] Question submission works
- [ ] Answer submission works
- [ ] Helpful voting works
- [ ] Photo picker opens
- [ ] Photo uploads
- [ ] Full-screen modal works
- [ ] Badges display correctly
- [ ] Empty states show
- [ ] Loading states show
- [ ] Permissions work

---

## 📚 Documentation Files

1. **PHASE4.1_QA_CUSTOMER_PHOTOS_GUIDE.md** - Full guide
2. **QA_PHOTOS_INTEGRATION_EXAMPLE.tsx** - Integration example
3. **PHASE4.1_DELIVERY_SUMMARY.md** - Delivery summary
4. **QUICK_REFERENCE_PHASE4.1.md** - This file

---

**Last Updated:** November 14, 2025
**Agent:** Agent 1
**Phase:** 4.1
