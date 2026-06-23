# CrossStoreProductsSection - Visual Guide

## 🎨 Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Recommended for You                      [View All >]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   📷     │  │   📷     │  │   📷     │  │   📷     │   │
│  │  Image   │  │  Image   │  │  Image   │  │  Image   │ → │
│  │          │  │          │  │          │  │          │   │
│  │ ❤️  💎   │  │ ❤️  💎   │  │ ❤️       │  │ ❤️  💎   │   │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤   │
│  │ Brand    │  │ Brand    │  │ Brand    │  │ Brand    │   │
│  │ Name     │  │ Name     │  │ Name     │  │ Name     │   │
│  │ ⭐⭐⭐⭐⭐ │  │ ⭐⭐⭐⭐   │  │ ⭐⭐⭐    │  │ ⭐⭐⭐⭐⭐ │   │
│  │ ₹999     │  │ ₹1,999   │  │ ₹599     │  │ ₹2,499   │   │
│  │ 🏪 Store │  │ 🏪 Store │  │ 🏪 Store │  │ 🏪 Store │   │
│  │ [+ Cart] │  │ [+ Cart] │  │ [+ Cart] │  │ [+ Cart] │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Component States

### 1. Loading State

```
┌─────────────────────────────────────────────┐
│ ✨ Recommended for You                      │
├─────────────────────────────────────────────┤
│                                              │
│              ⏳ Loading...                  │
│                                              │
│      Loading recommendations...             │
│                                              │
└─────────────────────────────────────────────┘
```

**Features:**
- Centered spinner
- "Loading recommendations..." text
- Purple loading indicator (#8B5CF6)

---

### 2. Success State (With Products)

```
┌──────────────────────────────────────────────────────┐
│ ✨ Recommended for You           [View All >]       │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │ NEW  33%   │  │     25%    │  │            │    │
│  │    OFF     │  │     OFF    │  │            │    │
│  │            │  │            │  │            │    │
│  │   Image    │  │   Image    │  │   Image    │  → │
│  │            │  │            │  │            │    │
│  │     ❤️     │  │     ❤️     │  │     💔     │    │
│  ├────────────┤  ├────────────┤  ├────────────┤    │
│  │ NIKE       │  │ ADIDAS     │  │ PUMA       │    │
│  │ Air Max    │  │ Ultra      │  │ Suede Pro  │    │
│  │ ⭐ 4.5 (120)│  │ ⭐ 4.0 (50) │  │ ⭐ 4.8 (200)│    │
│  │ ₹3,999     │  │ ₹5,249     │  │ ₹2,799     │    │
│  │ ~~₹5,999~~ │  │ ~~₹6,999~~ │  │ ~~₹3,999~~ │    │
│  │ Save ₹2k   │  │ Save ₹1.7k │  │ Save ₹1.2k │    │
│  │ 🏪 Store A │  │ 🏪 Store B │  │ 🏪 Store C │    │
│  │ [➕ Cart]  │  │ [➕ Cart]  │  │ [➕ Cart]  │    │
│  └────────────┘  └────────────┘  └────────────┘    │
│                                                       │
└──────────────────────────────────────────────────────┘
```

**Features:**
- Section title with sparkle icon (✨)
- "View All" button (top-right)
- Horizontal scrollable product cards
- Store badge on each product: "From [Store Name]"
- Add to Cart button
- Wishlist heart icon
- Rating stars
- Price with discount
- Savings amount

---

### 3. Error State

```
┌─────────────────────────────────────────────┐
│ ✨ Recommended for You                      │
├─────────────────────────────────────────────┤
│                                              │
│              ⚠️                             │
│                                              │
│    Failed to load recommendations           │
│                                              │
│       Network error occurred                │
│                                              │
│          [🔄 Retry]                         │
│                                              │
└─────────────────────────────────────────────┘
```

**Features:**
- Error icon (⚠️)
- Error message
- Retry button
- Purple retry button (#8B5CF6)

---

### 4. Empty State

```
┌─────────────────────────────────────────────┐
│ ✨ Recommended for You                      │
├─────────────────────────────────────────────┤
│                                              │
│              🛒                             │
│                                              │
│    No recommendations available             │
│                                              │
│  Check back later for personalized          │
│       product recommendations               │
│                                              │
└─────────────────────────────────────────────┘
```

**Features:**
- Basket icon (🛒)
- Empty message
- Helpful subtext
- Gray color scheme

---

## 🎯 Product Card Details

### Card Structure

```
┌─────────────────┐
│ NEW      33% OFF │ ← Badges (top-left)
│                  │
│                  │
│      Image       │
│                  │
│                  │
│         ❤️       │ ← Wishlist (top-right)
│       [Stock]    │ ← Stock badge (bottom-right)
├─────────────────┤
│ BRAND NAME       │ ← Brand (purple, uppercase)
│ Product Name     │ ← Product name (2 lines max)
│ ⭐⭐⭐⭐ (120)    │ ← Rating & count
│ ₹999  ~~₹1,499~~ │ ← Current & original price
│ You save ₹500    │ ← Savings (green)
│ 5% cashback      │ ← Cashback badge (purple)
│ 🏪 From Store A  │ ← Store badge (NEW!)
│ [➕ Add to Cart] │ ← Add to cart button
└─────────────────┘
```

### Store Badge (NEW Feature)

```
┌──────────────────────┐
│ 🏪 From Fashion Hub  │
└──────────────────────┘
```

**Styling:**
- Light purple background (#F5F3FF)
- Purple border (#E9D5FF)
- Purple text (#8B5CF6)
- Store icon (🏪)
- Positioned above "Add to Cart" button

---

## 📏 Responsive Design

### Mobile (< 768px)

```
Card Width: 180px
Visible: 2-3 cards
Scroll: Horizontal

┌──────────┐  ┌──────────┐  ┌──────────┐
│          │  │          │  │          │
│  Card 1  │  │  Card 2  │  │  Card 3  │ →
│          │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘
```

### Tablet (768px - 1023px)

```
Card Width: 200px
Visible: 3-4 cards
Scroll: Horizontal

┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│          │  │          │  │          │  │          │
│  Card 1  │  │  Card 2  │  │  Card 3  │  │  Card 4  │ →
│          │  │          │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### Desktop (>= 1024px)

```
Card Width: 220px
Visible: 4-5 cards
Scroll: Horizontal

┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│        │  │        │  │        │  │        │  │        │
│ Card 1 │  │ Card 2 │  │ Card 3 │  │ Card 4 │  │ Card 5 │ →
│        │  │        │  │        │  │        │  │        │
└────────┘  └────────┘  └────────┘  └────────┘  └────────┘
```

---

## 🎨 Color Palette

### Primary Colors

```
Purple:    #8B5CF6  ■ (buttons, icons, links)
Dark:      #111827  ■ (text, titles)
Gray:      #6B7280  ■ (subtitles, descriptions)
Red:       #EF4444  ■ (errors, discounts)
Green:     #059669  ■ (savings, success)
```

### Background Colors

```
White:     #FFFFFF  ■ (card background)
Light:     #F9FAFB  ■ (page background)
Purple Lt: #F5F3FF  ■ (badge background)
Purple Bg: #EEF2FF  ■ (cashback badge)
```

### Badge Colors

```
New Badge:      Green #10B981 ■
Discount Badge: Red #EF4444 ■
Stock Badge:    Yellow/Red (dynamic)
Store Badge:    Purple #F5F3FF ■
```

---

## 🔄 User Interactions

### 1. Product Card Click

```
User taps card
     ↓
Navigate to /product/[id]
     ↓
Show product detail page
```

### 2. Add to Cart Click

```
User taps [+ Cart]
     ↓
Add product to cart
     ↓
Show success toast
     ↓
Button changes to [- 1 +]
```

### 3. Wishlist Click

```
User taps ❤️
     ↓
Toggle wishlist
     ↓
Heart fills/unfills
     ↓
Show toast notification
```

### 4. View All Click

```
User taps [View All >]
     ↓
Navigate to /search
     ↓
Show all recommendations
```

### 5. Retry Click (Error State)

```
User taps [Retry]
     ↓
Re-fetch recommendations
     ↓
Show loading state
     ↓
Show products or error
```

---

## 📊 Spacing & Layout

### Section Spacing

```
Margin:  16px horizontal, 12px vertical
Padding: 16px vertical
Shadow:  Soft shadow (elevation: 3)
Radius:  12px
```

### Header Spacing

```
Padding:       16px horizontal
Margin Bottom: 12px
Height:        Auto (flexible)
```

### Product Cards

```
Card Width:    180px (mobile) / 200px (tablet) / 220px (desktop)
Card Height:   320px (fixed)
Card Gap:      12px
Card Radius:   12px
Card Shadow:   Subtle (elevation: 3)
```

### Store Badge

```
Position: Absolute (bottom: 48px)
Padding:  8px horizontal, 4px vertical
Radius:   6px
Border:   1px solid #E9D5FF
```

---

## ♿ Accessibility Features

### Screen Reader Support

```
Section:
  ↳ "Cross-store product recommendations section"

Product Card:
  ↳ "Product 1 of 10. Nike Air Max from Sports Store"

View All Button:
  ↳ "View all recommendations"
  ↳ Hint: "Double tap to see all recommended products"

Add to Cart:
  ↳ "Add Nike Air Max to cart"
  ↳ Hint: "Double tap to add to shopping cart"

Wishlist:
  ↳ "Add to wishlist" or "Remove from wishlist"
  ↳ Hint: "Double tap to toggle wishlist"
```

### Keyboard Navigation (Web)

```
Tab Order:
  1. View All button
  2. Product Card 1
  3. Wishlist button (Card 1)
  4. Add to Cart button (Card 1)
  5. Product Card 2
  6. ...
```

---

## 🎬 Animations

### Card Scroll

```
Smooth horizontal scroll
FlatList momentum scrolling
Snap to items (optional)
```

### Loading State

```
Spinner rotation animation
Fade in/out text
```

### Product Cards

```
Image fade-in on load
Button press animation (scale 0.95)
Wishlist heart animation (scale + color)
```

---

## 📐 Dimensions Reference

### Component

```
Width:  100% - 32px (margin)
Height: Auto (min 200px)
```

### Product Card

```
Width:  180px (mobile)
Height: 320px
Image:  100% × 120px
Content: Flexible
Bottom: 48px (fixed for button)
```

### Store Badge

```
Width:  Auto (max 100%)
Height: Auto
Font:   10px
Icon:   12px
```

---

## 🎯 Best Practices

### Do ✅

- Show 8-12 products max
- Include store badges
- Handle loading/error states
- Provide retry functionality
- Use responsive card widths
- Add accessibility labels
- Track analytics events

### Don't ❌

- Show more than 20 products
- Hide error messages
- Skip loading states
- Ignore accessibility
- Use fixed card widths
- Block user interactions
- Forget to filter current store

---

## 📱 Platform Differences

### iOS

```
Shadow: softer, more subtle
Scroll: momentum, bounce
Feedback: haptic on interactions
```

### Android

```
Shadow: elevation-based
Scroll: momentum, no bounce
Feedback: ripple effect
```

### Web

```
Shadow: box-shadow
Scroll: smooth, custom scrollbar
Feedback: hover states
```

---

**This visual guide should help you understand the component's appearance and behavior!** 🎨
