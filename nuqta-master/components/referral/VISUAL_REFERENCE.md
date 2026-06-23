# PrivacyNotice Component - Visual Reference

## Component Preview

### Collapsed State (Default)

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│  🛡️  Privacy & Data Protection                  ˅   │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Visual Characteristics:**
- Height: ~56px
- Background: Surface color (theme-aware)
- Border: 1px solid border color
- Border Radius: 12px
- Padding: 16px
- Icon: Shield checkmark (20px, purple)
- Text: 14px, semi-bold
- Chevron: Down arrow (20px, muted)

---

### Expanded State

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│  🛡️  Privacy & Data Protection                  ˄   │
│  ─────────────────────────────────────────────────    │
│                                                       │
│  Data Collection Notice                               │
│  ───────────────────────                              │
│  In accordance with GDPR Article 13, we inform you    │
│  about how we process your personal data when you     │
│  use our referral program.                            │
│                                                       │
│  Data We Collect:                                     │
│  ──────────────────                                   │
│  • Referrer information (name, email address,         │
│    user ID)                                           │
│  • Referred user information (email address, name     │
│    upon registration)                                 │
│  • Referral activity data (timestamps, status,        │
│    conversion events)                                 │
│  • Device and technical information (IP address,      │
│    device ID)                                         │
│                                                       │
│  How We Use Your Data:                                │
│  ────────────────────────                             │
│  • Processing and tracking referral rewards           │
│  • Fraud prevention and security monitoring           │
│  • Program analytics and improvement                  │
│  • Compliance with legal obligations                  │
│                                                       │
│  Legal Basis:                                         │
│  ───────────                                          │
│  Contract performance (GDPR Art. 6(1)(b)) and         │
│  legitimate interests (GDPR Art. 6(1)(f)) for         │
│  fraud prevention and program administration.         │
│                                                       │
│  Data Retention:                                      │
│  ──────────────                                       │
│  Referral data is retained for the duration of        │
│  your account plus 3 years for legal compliance,      │
│  or until you request deletion.                       │
│                                                       │
│  Your Rights (GDPR Articles 15-22):                   │
│  ──────────────────────────────────                   │
│  • Access: Request a copy of your data                │
│  • Rectification: Correct inaccurate data             │
│  • Deletion: Request data erasure ("right to be       │
│    forgotten")                                        │
│  • Portability: Receive your data in a structured     │
│    format                                             │
│  • Objection: Object to data processing               │
│  • Lodge Complaint: Contact your supervisory          │
│    authority                                          │
│                                                       │
│  Data Sharing:                                        │
│  ────────────                                         │
│  Your referral data may be shared with payment        │
│  processors, anti-fraud services, and analytics       │
│  providers. We do not sell your personal data to      │
│  third parties.                                       │
│                                                       │
│  Exercise Your Rights:                                │
│  ────────────────────                                 │
│  Contact our Data Protection Officer at               │
│  privacy@rezapp.com or through your account           │
│  settings.                                            │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Read Full Privacy Policy                   →  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  Last updated: January 2025                           │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Visual Characteristics:**
- Height: Dynamic (based on content)
- Top Border: 1px separator line
- Sections: Clearly separated with spacing
- Headings: 14-15px, bold
- Body Text: 13px, line height 20px
- Bullets: 4px purple dots
- Link Button: Purple background (10% opacity)
- Timestamp: 11px, italic, muted color

---

## Color Palette

### Light Mode
```
Background:     #F8FAFC (surface)
Text Primary:   #0F172A (text)
Text Secondary: #475569 (textSecondary)
Text Muted:     #64748B (textMuted)
Accent:         #8B5CF6 (secondary/purple)
Border:         #E2E8F0 (border)
```

### Dark Mode
```
Background:     #334155 (surfaceSecondary)
Text Primary:   #F8FAFC (text)
Text Secondary: #CBD5E1 (textSecondary)
Text Muted:     #94A3B8 (textMuted)
Accent:         #C4B5FD (secondary/light purple)
Border:         #475569 (border)
```

---

## Typography Scale

```
Header (Collapsed):  14px, Semi-Bold (600), Line Height: Normal
Section Title:       15px, Bold (700), Line Height: Normal
Sub-Section:         14px, Semi-Bold (600), Line Height: Normal
Body Text:           13px, Regular (400), Line Height: 20px
Bullet Text:         13px, Regular (400), Line Height: 20px
Link Text:           14px, Semi-Bold (600), Line Height: Normal
Timestamp:           11px, Italic, Regular (400), Line Height: Normal
```

---

## Spacing System

```
Container Padding:       16px
Section Margin Bottom:   16px
Bullet List Margin Top:  4px
Bullet Item Margin:      8px bottom
Bullet Dot Margin:       8px right
Icon Margin:             8px right
Content Top Padding:     16px
Link Button Margin:      8px top
Timestamp Margin:        12px top
```

---

## Icon System

### Shield Icon (Security Indicator)
```
Name:   shield-checkmark
Size:   20px
Color:  Secondary/Purple (#8B5CF6)
```

### Chevron Down (Collapsed)
```
Name:   chevron-down
Size:   20px
Color:  Text Muted (#64748B)
```

### Chevron Up (Expanded)
```
Name:   chevron-up
Size:   20px
Color:  Text Muted (#64748B)
```

### Arrow Forward (Link)
```
Name:   arrow-forward
Size:   16px
Color:  Secondary/Purple (#8B5CF6)
```

---

## Component States

### 1. Initial Load (Collapsed)
```
[Shield Icon] Privacy & Data Protection [Chevron Down]
```

### 2. User Taps Header
```
Animation: Smooth expansion (200ms)
Chevron rotates: Down → Up
Content fades in
```

### 3. Expanded View
```
[Shield Icon] Privacy & Data Protection [Chevron Up]
─────────────────────────────────────────────────────
[Full content visible with scrollable area if needed]
```

### 4. User Taps Header Again
```
Animation: Smooth collapse (200ms)
Chevron rotates: Up → Down
Content fades out
```

---

## Touch Targets

All interactive elements meet minimum size requirements:

```
Header Touch Area:       Full width × 56px height ✅
Privacy Link Button:     Full width × 48px height ✅
Icon Touch Area:         44px × 44px ✅
```

---

## Layout Structure

```
PrivacyNotice Container
├── Header Row
│   ├── Left Group
│   │   ├── Shield Icon (20px)
│   │   └── Header Text ("Privacy & Data Protection")
│   └── Chevron Icon (20px)
│
└── Content Area (Conditional - when expanded)
    ├── Separator Line
    ├── Data Collection Section
    ├── Data Categories Section
    ├── Data Usage Section
    ├── Legal Basis Section
    ├── Retention Section
    ├── User Rights Section
    ├── Data Sharing Section
    ├── Contact Section
    ├── Privacy Link Button
    └── Timestamp
```

---

## Responsive Behavior

### Small Screens (< 375px)
```
- Reduce horizontal padding: 12px
- Maintain font sizes (minimum 13px)
- Text wraps naturally
- Bullet points remain indented
```

### Medium Screens (375px - 768px)
```
- Standard padding: 16px
- Standard font sizes
- Optimal line length
```

### Large Screens (> 768px)
```
- Maximum width: 600px (optional)
- Center aligned (optional)
- Increased padding: 20px (optional)
```

---

## Animation Timings

```
Expand Transition:     200ms ease-in-out
Collapse Transition:   200ms ease-in-out
Chevron Rotation:      200ms ease-in-out
Content Fade In:       150ms ease-in
Content Fade Out:      150ms ease-out
Button Press:          100ms ease-in-out
```

---

## Accessibility Features

### Screen Reader Experience

```
1. Focus on component
   → "Privacy & Data Protection, button, collapsed"

2. Activate/tap
   → Content expands
   → Focus moves to first section

3. Navigate through content
   → Each section announced separately
   → Bullets read as list items

4. Privacy Policy Link
   → "Read Full Privacy Policy, link"
```

### Keyboard Navigation (Web)

```
Tab       → Focus header
Enter     → Toggle expand/collapse
Tab       → Focus privacy policy link (when expanded)
Enter     → Open privacy policy
```

---

## Integration Examples

### In Referral Form Context

```
┌─────────────────────────────────────────────────┐
│  Refer a Friend                                 │
│  ─────────────────                              │
│                                                 │
│  Your Friend's Email                            │
│  ┌───────────────────────────────────────────┐ │
│  │ friend@example.com                        │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Your Message (Optional)                        │
│  ┌───────────────────────────────────────────┐ │
│  │ Check out this awesome app!               │ │
│  │                                           │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  Send Referral                            │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 🛡️  Privacy & Data Protection         ˅  │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

### In Modal Context

```
┌─────────────────────────────────────────────────┐
│                    [✕ Close]                    │
│                                                 │
│  Privacy Notice                                 │
│  ═════════════════                              │
│                                                 │
│  Please review our privacy practices:           │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 🛡️  Privacy & Data Protection         ˄  │ │
│  ├───────────────────────────────────────────┤ │
│  │ [Scrollable expanded content...]          │ │
│  │                                           │ │
│  │                                           │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  I Understand                             │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Platform-Specific Rendering

### iOS

```
- Shadow: shadowOffset: { width: 0, height: 2 }
- Shadow: shadowOpacity: 0.1
- Shadow: shadowRadius: 4
- Border: Smooth, anti-aliased
- Touch: Haptic feedback (optional)
```

### Android

```
- Elevation: 4
- Ripple effect on touch
- Border: Standard rendering
- Touch: Material ripple
```

### Web

```
- Box-shadow: 0 2px 8px rgba(0,0,0,0.1)
- Cursor: pointer on header
- Hover: Background color change (subtle)
- Outline: Focus indicator for accessibility
```

---

## Component Variants

### Compact Mode (Future Enhancement)

```
┌─────────────────────────────────────┐
│ 🛡️ Privacy Notice           [i] ˅  │
└─────────────────────────────────────┘
```

### Highlighted Mode (Future Enhancement)

```
┌─────────────────────────────────────┐
│ ⚠️  IMPORTANT: Privacy Notice    ˅  │
│ Purple border (2px, accent color)   │
└─────────────────────────────────────┘
```

### Minimal Mode (Future Enhancement)

```
Privacy & Data Protection ˅
```

---

## Print Styling (Web)

When user prints the page:

```
- Always expanded
- Black text on white background
- No interactive elements (flat)
- Include all content
- Page break: avoid inside component
```

---

## Dark Mode Comparison

### Light Mode Visual
```
┌─────────────────────────────────────┐ White/Light Gray BG
│ 🛡️ Privacy & Data Protection    ˅  │ Dark Text
└─────────────────────────────────────┘ Gray Border
```

### Dark Mode Visual
```
┌─────────────────────────────────────┐ Dark Gray BG
│ 🛡️ Privacy & Data Protection    ˅  │ Light Text
└─────────────────────────────────────┘ Darker Border
```

---

## Error States (Future Enhancement)

### Privacy Policy Link Failed
```
┌─────────────────────────────────────┐
│ ⚠️ Unable to load privacy policy    │
│ Please try again later              │
└─────────────────────────────────────┘
```

### Content Load Error
```
┌─────────────────────────────────────┐
│ 🛡️ Privacy & Data Protection    ˅  │
├─────────────────────────────────────┤
│ ⚠️ Error loading privacy content    │
│ Contact privacy@rezapp.com          │
└─────────────────────────────────────┘
```

---

## Component Dimensions

### Collapsed
```
Width:  Parent container (100%)
Height: 56px (fixed)
```

### Expanded
```
Width:  Parent container (100%)
Height: ~800-1000px (dynamic, scrollable)
```

---

## Best Practices for Visual Consistency

✅ **DO:**
- Use app's existing color palette
- Maintain consistent spacing (16px base)
- Use purple accent sparingly
- Ensure touch targets are ≥44x44
- Test in both light and dark mode

❌ **DON'T:**
- Use custom colors outside theme
- Reduce font sizes below 13px
- Make touch targets smaller than 44px
- Forget to test accessibility
- Ignore platform-specific guidelines

---

**Document Version:** 1.0.0
**Last Updated:** January 2025
**Visual Design Status:** ✅ Complete
