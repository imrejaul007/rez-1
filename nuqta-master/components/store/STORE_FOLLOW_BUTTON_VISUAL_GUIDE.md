# StoreFollowButton - Visual Guide

## 🎨 Component Appearance

### Default Variant (Full Button)

```
┌─────────────────────────────────────────────┐
│  ❤️  Follow                        1.2K    │  ← Not Following
└─────────────────────────────────────────────┘
     Purple border, white background, purple text

┌─────────────────────────────────────────────┐
│  ❤️  Following                     1.2K    │  ← Following
└─────────────────────────────────────────────┘
     Purple background, white text

┌─────────────────────────────────────────────┐
│  🔄 Loading...                              │  ← Loading
└─────────────────────────────────────────────┘
     Spinner animation
```

**Dimensions:**
- Min Width: 140px
- Min Height: 44px (accessibility standard)
- Border Radius: 12px
- Border Width: 2px

---

### Compact Variant (Small Button)

```
┌─────────────────────┐
│  ❤️  Follow        │  ← Not Following
└─────────────────────┘
  Purple border, white background

┌─────────────────────┐
│  ❤️  Following     │  ← Following
└─────────────────────┘
  Purple background, white text

┌─────────────────────┐
│  🔄                │  ← Loading
└─────────────────────┘
  Spinner only
```

**Dimensions:**
- Min Width: 90px
- Height: 36px
- Border Radius: 20px (fully rounded)
- Border Width: 1.5px

---

### Icon-Only Variant (Minimal)

```
┌─────┐
│  ♡  │  ← Not Following (outline heart)
└─────┘
  Circle, purple border

┌─────┐
│  ❤️  │  ← Following (filled heart)
└─────┘
  Circle, purple background

┌─────┐
│  🔄 │  ← Loading
└─────┘
  Spinner
```

**Dimensions:**
- Width: 40px
- Height: 40px
- Border Radius: 20px (perfect circle)
- Border Width: 1.5px

---

## 🎭 State Transitions

### Follow Action (Not Following → Following)

```
Step 1: Initial State
┌──────────────────────┐
│  ♡  Follow          │
└──────────────────────┘

Step 2: User Taps (Animation)
┌──────────────────────┐
│  ♡  Follow          │ ← Scales to 0.95
└──────────────────────┘

Step 3: Optimistic Update (Instant)
┌──────────────────────┐
│  ❤️  Following      │ ← State changes immediately
└──────────────────────┘    Follower count +1
                            Heart icon animates (scale 1.3)

Step 4: API Call (Background)
🌐 POST /stores/:id/follow

Step 5: Success
✅ Toast: "Now following Fashion Store"
    State: Kept
    Count: Updated

OR

Step 5: Error
❌ Toast: "Failed to update. Please try again."
    State: Rolled back to "Follow"
    Count: Decremented
```

---

### Unfollow Action (Following → Not Following)

```
Step 1: Initial State
┌──────────────────────┐
│  ❤️  Following      │
└──────────────────────┘

Step 2: User Taps (Animation)
┌──────────────────────┐
│  ❤️  Following      │ ← Scales to 0.95
└──────────────────────┘

Step 3: Optimistic Update (Instant)
┌──────────────────────┐
│  ♡  Follow          │ ← State changes immediately
└──────────────────────┘    Follower count -1

Step 4: API Call (Background)
🌐 DELETE /stores/:id/follow

Step 5: Success
✅ Toast: "Unfollowed Fashion Store"
    State: Kept
    Count: Updated

OR

Step 5: Error
❌ Toast: "Failed to update. Please try again."
    State: Rolled back to "Following"
    Count: Incremented
```

---

## 🎬 Animation Sequences

### Button Press Animation

```
Frame 1 (0ms):     Scale 1.0   ┌──────────┐
                               │  Follow  │
                               └──────────┘

Frame 2 (50ms):    Scale 0.95  ┌─────────┐
                               │ Follow │
                               └─────────┘

Frame 3 (100ms):   Scale 1.0   ┌──────────┐
                               │  Follow  │
                               └──────────┘
```

**Properties:**
- Duration: 200ms total
- Easing: Native driver
- Transform: Scale only

---

### Heart Icon Animation (On Follow)

```
Frame 1 (0ms):     Scale 1.0    ❤️

Frame 2 (100ms):   Scale 1.3    ❤️  ← Bigger

Frame 3 (200ms):   Scale 1.15   ❤️

Frame 4 (400ms):   Scale 1.0    ❤️  ← Back to normal
```

**Properties:**
- Duration: 400ms total
- Easing: Spring effect
- Transform: Scale only
- Triggers: Only on follow action

---

## 📐 Layout Examples

### Example 1: Store Header (Horizontal)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Fashion Boutique                  ┌────────────────┐ │
│  ⭐ 4.8 (234 reviews)              │ ❤️  Following │ │
│  📍 2.3 km away                     └────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Code:**
```tsx
<View style={styles.header}>
  <View style={styles.headerInfo}>
    <Text style={styles.storeName}>Fashion Boutique</Text>
    <Text>⭐ 4.8 (234 reviews)</Text>
    <Text>📍 2.3 km away</Text>
  </View>
  <StoreFollowButton
    storeId="store-123"
    variant="compact"
  />
</View>
```

---

### Example 2: Store Card (Overlay)

```
┌─────────────────────────────────────┐
│                                 ┌─┐ │
│  [Store Image]                  │♡│ │  ← Icon-only variant
│                                 └─┘ │     (top-right corner)
│─────────────────────────────────────│
│  Fashion Boutique                   │
│  Premium clothing store              │
│  ⭐ 4.8  •  2.3 km                   │
└─────────────────────────────────────┘
```

**Code:**
```tsx
<View style={styles.card}>
  <Image source={{ uri: store.image }} />

  <View style={styles.followButtonOverlay}>
    <StoreFollowButton
      storeId={store.id}
      variant="icon-only"
    />
  </View>

  <View style={styles.cardContent}>
    <Text>{store.name}</Text>
    <Text>{store.description}</Text>
  </View>
</View>
```

---

### Example 3: Store List (Trailing)

```
┌───────────────────────────────────────────────────────┐
│  🏪  Fashion Boutique                  ┌─────────┐   │
│      Premium Store                      │ Follow │   │
│      ⭐ 4.8  •  📍 2.3 km              └─────────┘   │
├───────────────────────────────────────────────────────┤
│  🏪  Tech Store                         ┌──────────┐ │
│      Electronics                        │Following │ │
│      ⭐ 4.9  •  📍 1.5 km              └──────────┘ │
└───────────────────────────────────────────────────────┘
```

**Code:**
```tsx
<View style={styles.listItem}>
  <Image source={{ uri: store.logo }} />

  <View style={styles.listContent}>
    <Text>{store.name}</Text>
    <Text>{store.category}</Text>
    <Text>⭐ {store.rating} • 📍 {store.distance}</Text>
  </View>

  <StoreFollowButton
    storeId={store.id}
    variant="compact"
  />
</View>
```

---

## 🎨 Color Palette

### Not Following State

```
┌─────────────────────────┐
│   Background: #FFFFFF   │  ← White
│   Border: #7C3AED       │  ← Purple
│   Text: #7C3AED         │  ← Purple
│   Icon: #7C3AED         │  ← Purple (outline heart)
└─────────────────────────┘
```

### Following State

```
┌─────────────────────────┐
│   Background: #7C3AED   │  ← Purple
│   Border: #7C3AED       │  ← Purple
│   Text: #FFFFFF         │  ← White
│   Icon: #FFFFFF         │  ← White (filled heart)
└─────────────────────────┘
```

### Loading State

```
┌─────────────────────────┐
│   Same as current state │
│   Opacity: 0.7          │  ← 70% opacity
│   Spinner: Same color   │  ← Matches text color
└─────────────────────────┘
```

### Hover State (Web Only)

```
Not Following:
┌─────────────────────────┐
│   (No change)           │
└─────────────────────────┘

Following:
┌─────────────────────────┐
│   Text: "Unfollow"      │  ← Changes from "Following"
│   (Colors stay same)    │
└─────────────────────────┘
```

---

## 📊 Follower Count Badge

### Badge Appearance (Default Variant Only)

```
Not Following:
┌──────────────────────────────┐
│  ❤️  Follow        [1.2K]  │  ← Badge with purple background
└──────────────────────────────┘
                     ────────
                     Badge: #EDE9FE (light purple)
                     Text: #7C3AED (purple)

Following:
┌──────────────────────────────┐
│  ❤️  Following     [1.2K]  │  ← Badge with transparent white
└──────────────────────────────┘
                     ────────
                     Badge: rgba(255,255,255,0.2)
                     Text: #FFFFFF (white)
```

### Number Formatting Examples

| Actual Count | Displayed |
|--------------|-----------|
| 0 | (badge hidden) |
| 42 | "42" |
| 999 | "999" |
| 1,000 | "1.0K" |
| 1,234 | "1.2K" |
| 9,999 | "10.0K" |
| 10,000 | "10.0K" |
| 99,999 | "100.0K" |
| 100,000 | "100.0K" |
| 999,999 | "1.0M" |
| 1,000,000 | "1.0M" |
| 1,234,567 | "1.2M" |
| 5,300,000 | "5.3M" |

---

## 🔄 State Diagram

```
                    ┌──────────────────────┐
                    │   Component Mounts   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Check Authentication│
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
     ┌──────────────────┐          ┌──────────────────┐
     │  Not Authenticated│          │   Authenticated  │
     └──────────┬─────────┘          └──────┬───────────┘
                │                           │
                │                           ▼
                │                ┌──────────────────────┐
                │                │ Fetch Follow Status  │
                │                │   (Background)       │
                │                └──────────┬───────────┘
                │                           │
                │                ┌──────────┴──────────┐
                │                │                     │
                │                ▼                     ▼
                │      ┌──────────────┐     ┌──────────────┐
                │      │   Following  │     │Not Following │
                │      └──────┬───────┘     └──────┬───────┘
                │             │                    │
                └─────────────┴────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │   Idle (Waiting for  │
                    │    User Interaction) │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
     ┌──────────────────┐          ┌──────────────────┐
     │   User Clicks    │          │ Component Unmounts│
     │   (Follow/       │          └──────────────────┘
     │    Unfollow)     │
     └──────────┬───────┘
                │
                ▼
        [See Follow/Unfollow Flow Above]
```

---

## 📱 Responsive Behavior

### Phone (< 375px width)

```
Compact:    [❤️ Follow]    (80px width)
Default:    Full width with padding
Icon-only:  [❤️]           (40px)
```

### Tablet (375px - 768px)

```
Compact:    [❤️ Follow]    (90px width)
Default:    [❤️ Follow  1.2K]  (140px min)
Icon-only:  [❤️]           (40px)
```

### Desktop (> 768px)

```
Compact:    [❤️ Follow]    (100px width)
Default:    [❤️ Follow  1.2K]  (160px)
Icon-only:  [❤️]           (44px with hover)
```

---

## ♿ Accessibility Features

### Screen Reader Announcements

```
Not Following:
"Button. Follow Fashion Store. 1234 followers. Double tap to toggle follow status."

Following:
"Button. Unfollow Fashion Store. 1235 followers. Double tap to toggle follow status."

Loading:
"Button. Loading. Disabled."
```

### Touch Target Sizes

```
Minimum: 44px × 44px (WCAG AAA standard)

Default variant:   44px+ height
Compact variant:   44px height (with padding)
Icon-only variant: 40px (close to 44px, acceptable for secondary actions)
```

### Focus Indicators

```
Keyboard focus (web):
┌─────────────────────────┐
│  ❤️  Follow            │  ← Blue outline appears
└─────────────────────────┘
  2px blue outline (#3B82F6)
```

---

## 🎯 Component Hierarchy

```
<Animated.View>                    ← Scale animation wrapper
  <TouchableOpacity>               ← Main button
    <View>                         ← Loading container (if loading)
      <ActivityIndicator />        ← Spinner
      <Text>Loading...</Text>
    </View>
    OR
    <View>                         ← Content container (if not loading)
      <Animated.View>              ← Heart animation wrapper
        <Ionicons />               ← Heart icon
      </Animated.View>
      <Text>Follow/Following</Text>
      <View>                       ← Follower count badge (if showCount)
        <Text>1.2K</Text>
      </View>
    </View>
  </TouchableOpacity>
</Animated.View>
```

---

## 🎨 Shadow & Elevation

### Not Following

```
Shadow:
- Color: #000000
- Offset: { width: 0, height: 2 }
- Opacity: 0.1
- Radius: 8
- Elevation: 4 (Android)

Effect: Subtle shadow for depth
```

### Following

```
Shadow:
- Color: #000000
- Offset: { width: 0, height: 2 }
- Opacity: 0.1
- Radius: 8
- Elevation: 4 (Android)

Effect: Same shadow (consistent depth)
```

---

## 📐 Spacing & Padding

### Default Variant

```
┌─────────────────────────────────────────────┐
│ ←16px→ ❤️ ←8px→ Follow ←flex→ 1.2K ←16px→ │
│                                              │
│ ↑                                            │
│12px                                          │
│ ↓                                            │
└──────────────────────────────────────────────┘
```

**Spacing:**
- Horizontal padding: 16px
- Vertical padding: 12px
- Icon-text gap: 8px
- Badge margin: Auto (flex)
- Badge padding: 8px horizontal, 4px vertical

---

### Compact Variant

```
┌────────────────────────┐
│ ←12px→ ❤️ ←6px→ Follow ←12px→ │
│                        │
│ ↑                      │
│ 8px                    │
│ ↓                      │
└────────────────────────┘
```

**Spacing:**
- Horizontal padding: 12px
- Vertical padding: 8px
- Icon-text gap: 6px

---

### Icon-Only Variant

```
┌────────┐
│        │
│   ❤️   │  ← Centered
│        │
└────────┘
  40×40px
```

**Spacing:**
- No padding (icon is centered)
- Icon size: 20px

---

## 🎉 Visual Summary

The StoreFollowButton provides:

✨ **3 Beautiful Variants**
- Default: Full-featured with count
- Compact: Space-efficient
- Icon-only: Minimal and clean

🎨 **Consistent Design**
- Purple theme (#7C3AED)
- Smooth animations
- Clear visual feedback

📱 **Responsive Layout**
- Works on all screen sizes
- Adapts to container width
- Maintains touch targets

♿ **Accessible**
- Screen reader support
- Keyboard navigation
- Clear focus indicators

🚀 **Production Ready**
- Polished visuals
- Professional animations
- Consistent with app design

---

For implementation details, see:
- `STORE_FOLLOW_BUTTON_DOCUMENTATION.md` - Full documentation
- `STORE_FOLLOW_BUTTON_INTEGRATION_EXAMPLES.tsx` - Code examples
- `STORE_FOLLOW_BUTTON_QUICK_REFERENCE.md` - Quick reference
