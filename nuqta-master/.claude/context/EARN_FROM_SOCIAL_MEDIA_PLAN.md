# 📱 Earn From Social Media Page - Development Plan

## 🎯 **Project Overview**

**Task**: Create a modern "Earn from social media" page based on provided UI designs  
**Requirements**: Backend-ready, proper state management, modern UI, functional features  
**Integration**: Connect to StorePage navigation with `{ headerShown: false }`

## 📋 **UI Analysis from Screenshots**

### **Screenshot 1 - Step-by-step Process**:
- **Step 1**: "Share a post on Instagram" with phone illustration
- **Step 2**: "Submit your post" with Instagram Post URL input field
- **Purple Upload button**
- **"Get Cashback" text at bottom**

### **Screenshot 2 - Main Dashboard**:
- **Header**: Purple gradient with "Earn from social media" title and back button
- **Card 1**: "CASH BACK 5%" with coin icons and text "Buy anything and share it on Instagram. We'll give you 5% cash back in the form of coins."
- **Card 2**: "Share to get coins" with social media illustration and text "We'll credit your account within 48 hours. Use your coins to buy more things."
- **Purple Upload button**
- **"Get Cashback" text at bottom**

---

## 🗂️ **Phase-Based Development Plan**

### **Phase 1: Project Setup and Analysis** ⏳
- [x] **Analyze UI requirements** from both screenshots
- [ ] **Study StorePage connection patterns** and navigation structure  
- [ ] **Create file structure** and routing setup
- [ ] **Plan component architecture**

### **Phase 2: Core Page Structure** 🏗️
- [ ] **Create** `earn-from-social-media.tsx` page
- [ ] **Add** `{ headerShown: false }` configuration to routing
- [ ] **Implement responsive header** with purple gradient and back button
- [ ] **Setup** main container and scroll view structure

### **Phase 3: UI Components Implementation** 🎨
- [ ] **Build Step 1 section**: Instagram sharing with phone illustration
- [ ] **Build Step 2 section**: URL input form with validation
- [ ] **Create cashback information cards** with modern styling
- [ ] **Implement Upload button** with purple gradient
- [ ] **Add bottom "Get Cashback" section**

### **Phase 4: State Management & Backend Integration** ⚙️
- [ ] **Design custom hook** (`useEarnFromSocialMedia`) for state management
- [ ] **Create API service** for social media earnings endpoints
- [ ] **Implement form validation** for Instagram URL submission
- [ ] **Add loading states**, error handling, and success feedback

### **Phase 5: Navigation Integration** 🔗
- [ ] **Connect to StorePage** navigation system
- [ ] **Add route configuration** in app routing
- [ ] **Test navigation flow** from StorePage to earn page
- [ ] **Ensure proper state preservation** during navigation

### **Phase 6: Polish & Testing** ✨
- [ ] **Apply modern styling** with gradients, shadows, and animations
- [ ] **Add micro-interactions** and smooth transitions
- [ ] **Test on mobile and desktop** for responsive behavior
- [ ] **Final QA** and bug fixes

---

## 🏗️ **Technical Architecture**

### **File Structure**:
```
app/
├── earn-from-social-media.tsx          # Main page component
├── _layout.tsx                         # Add route with headerShown: false
components/
├── earn-social/
    ├── EarnSocialHeader.tsx            # Purple gradient header
    ├── StepCard.tsx                    # Step 1 & 2 components
    ├── CashbackInfoCard.tsx            # Info cards component
    ├── UploadButton.tsx                # Upload functionality
    └── InstagramUrlInput.tsx           # URL input with validation
hooks/
├── useEarnFromSocialMedia.ts           # State management hook
data/
├── earnSocialData.ts                   # Mock data and helpers
services/
├── earnSocialApi.ts                    # API endpoints
types/
├── earn-social.types.ts                # TypeScript interfaces
```

### **State Management Design**:
```typescript
interface EarnSocialState {
  currentStep: 'overview' | 'url_input' | 'uploading' | 'success';
  instagramUrl: string;
  isValidUrl: boolean;
  loading: boolean;
  error: string | null;
  earnings: {
    pendingAmount: number;
    totalEarned: number;
    cashbackRate: number;
  };
  uploadProgress: number;
}
```

### **Key Features**:
- ✅ **Modern purple gradient UI** matching screenshots
- ✅ **Step-by-step process** with clear instructions
- ✅ **Instagram URL validation** and submission
- ✅ **Real-time progress tracking**
- ✅ **Cashback calculation** and display
- ✅ **Mobile-optimized touch targets**
- ✅ **Smooth animations** and transitions
- ✅ **Error handling** and user feedback

---

## 🎯 **Success Criteria**

### **Functionality**:
- [x] Page loads without errors
- [ ] Navigation from StorePage works seamlessly
- [ ] Instagram URL validation works correctly
- [ ] Upload process provides clear feedback
- [ ] Cashback information displays accurately

### **UI/UX**:
- [ ] Matches provided screenshot designs
- [ ] Responsive on mobile and desktop
- [ ] Smooth animations and interactions
- [ ] Modern, professional appearance
- [ ] Easy-to-use interface

### **Backend Integration**:
- [ ] API calls structured for real backend
- [ ] Proper error handling for network issues
- [ ] Loading states during data fetching
- [ ] Form submission with validation

**Ready to begin Phase 1 implementation!** 🚀