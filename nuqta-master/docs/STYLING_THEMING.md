# StoreActionButtons Styling & Theming Guide

## Overview

The StoreActionButtons component follows a comprehensive design system with gradient-based buttons, responsive layouts, and consistent theming that integrates seamlessly with the app's design language.

## Design System

### Color Palette

#### Button Colors
```typescript
const buttonColors = {
  buy: {
    gradient: ['#10B981', '#059669'], // Emerald green
    text: '#FFFFFF'
  },
  lock: {
    gradient: ['#F59E0B', '#D97706'], // Amber orange  
    text: '#FFFFFF'
  },
  booking: {
    gradient: ['#8B5CF6', '#7C3AED'], // Purple (matches app theme)
    text: '#FFFFFF'
  },
  disabled: {
    gradient: ['#9CA3AF', '#6B7280'], // Gray
    text: '#FFFFFF'
  }
};
```

#### State Colors
```typescript
const stateColors = {
  loading: {
    opacity: 0.8,
    spinnerColor: '#FFFFFF'
  },
  disabled: {
    opacity: 0.6,
    backgroundColor: 'gray'
  },
  pressed: {
    activeOpacity: 0.8
  }
};
```

### Typography

#### Button Text Styling
```typescript
const textStyles = {
  primary: {
    fontSize: 16,
    fontWeight: '700', // Bold
    letterSpacing: 0.3,
    textAlign: 'center',
    color: '#FFFFFF'
  },
  compact: {
    fontSize: 14,
    fontWeight: '600', // Semi-bold
    letterSpacing: 0.2
  }
};
```

### Iconography

#### Button Icons
- **Buy Button**: `card-outline` (Ionicons)
- **Lock Button**: `lock-closed-outline` (Ionicons)
- **Booking Button**: `calendar-outline` (Ionicons)
- **Loading State**: `ActivityIndicator` component

#### Icon Specifications
```typescript
const iconStyles = {
  size: 18, // px
  color: '#FFFFFF',
  marginRight: 8 // px spacing from text
};
```

## Layout System

### Responsive Breakpoints

```typescript
const breakpoints = {
  verySmall: 320, // px - phones in landscape
  small: 360,     // px - compact phones
  medium: 768,    // px - tablets
  large: 1024     // px - desktop/large tablets
};
```

### Button Layout Configurations

#### Single Button Layout
```typescript
{
  flexDirection: 'row',
  buttonWidth: '100%',
  containerPadding: 16,
  buttonGap: 0
}
```

#### Two Button Layout
```typescript
// Normal screens (≥360px)
{
  flexDirection: 'row',
  buttonWidth: '48%',
  containerPadding: 16,
  buttonGap: 12
}

// Very small screens (<320px)
{
  flexDirection: 'column',
  buttonWidth: '100%',
  containerPadding: 12,
  buttonGap: 8
}
```

#### Three Button Layout
```typescript
// Large screens (≥360px)
{
  flexDirection: 'row',
  buttonWidth: '32%',
  containerPadding: 12,
  buttonGap: 8
}

// Small screens (320-360px)
{
  flexDirection: 'column',
  buttonWidth: '100%',
  containerPadding: 12,
  buttonGap: 6
}

// Very small screens (<320px)
{
  flexDirection: 'column',
  buttonWidth: '100%',
  containerPadding: 12,
  buttonGap: 8
}
```

### Container Styling

#### Main Container
```typescript
const containerStyles = {
  paddingVertical: 16,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent' // Inherits from parent
};
```

#### Individual Button Container
```typescript
const buttonContainerStyles = {
  borderRadius: 16,
  overflow: 'hidden',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4 // Android shadow
};
```

#### Gradient Background
```typescript
const gradientStyles = {
  paddingVertical: 14,
  paddingHorizontal: 16,
  minHeight: 52,
  justifyContent: 'center',
  alignItems: 'center'
};
```

## Theme Integration

### Expo/React Native Integration

```typescript
// Using Expo's useThemeColor hook
import { useThemeColor } from '@/hooks/useThemeColor';

const backgroundColor = useThemeColor({}, 'background');
```

### Custom Theme Props

```typescript
interface ThemeOverrides {
  // Container customization
  containerStyle?: ViewStyle;
  
  // Individual button customization  
  buttonStyle?: ViewStyle;
  
  // Text customization
  textStyle?: TextStyle;
}
```

### Usage Examples

#### Basic Theme Integration
```typescript
<StoreActionButtons
  storeType="SERVICE"
  containerStyle={{
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA'
  }}
  buttonStyle={{
    borderRadius: 12,
    elevation: 2
  }}
  textStyle={{
    fontSize: 14,
    fontWeight: '600'
  }}
/>
```

#### Dark Mode Support
```typescript
const backgroundColor = useThemeColor(
  { light: '#FFFFFF', dark: '#1F2937' },
  'background'
);

<StoreActionButtons
  storeType="PRODUCT"
  containerStyle={{ backgroundColor }}
/>
```

## Animations & Interactions

### Touch Interactions
```typescript
const touchProps = {
  activeOpacity: 0.8,        // Touch feedback
  delayPressIn: 0,           // Immediate response
  delayPressOut: 100,        // Brief delay on release
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 } // Touch area expansion
};
```

### Loading Animations
```typescript
const loadingAnimation = {
  spinner: {
    size: 'small' as const,
    color: '#FFFFFF',
    duration: 'infinite'
  },
  opacity: {
    from: 1,
    to: 0.8,
    duration: 200 // ms
  }
};
```

### State Transitions
```typescript
const stateTransitions = {
  disabled: {
    opacity: 0.6,
    duration: 150 // ms
  },
  loading: {
    opacity: 0.8,
    duration: 200 // ms
  }
};
```

## Accessibility Styling

### Visual Accessibility
```typescript
const a11yStyles = {
  minimumTouchTarget: 44, // iOS HIG recommendation
  colorContrast: {
    normal: 4.5,   // WCAG AA
    large: 3.0     // WCAG AA for large text (≥18pt)
  },
  focusIndicator: {
    borderWidth: 2,
    borderColor: '#007AFF' // iOS system blue
  }
};
```

### High Contrast Mode
```typescript
const highContrastColors = {
  buy: {
    gradient: ['#00A86B', '#006B45'],    // Higher contrast green
    text: '#FFFFFF'
  },
  lock: {
    gradient: ['#FF8C00', '#CC7000'],    // Higher contrast orange
    text: '#000000'                       // Black text for better contrast
  },
  booking: {
    gradient: ['#6A0DAD', '#4B0082'],    // Higher contrast purple
    text: '#FFFFFF'
  }
};
```

## Platform-Specific Styling

### iOS Specific
```typescript
const iOSStyles = {
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  hapticFeedback: true, // Use haptic feedback on button press
  statusBarStyle: 'dark-content'
};
```

### Android Specific
```typescript
const androidStyles = {
  elevation: 4, // Material Design elevation
  rippleColor: 'rgba(255, 255, 255, 0.3)', // Touch ripple effect
  borderless: false,
  statusBarStyle: 'dark-content'
};
```

## Customization Examples

### Brand-Specific Theming
```typescript
// Custom brand colors
const brandTheme = {
  primary: '#6366F1',    // Indigo
  secondary: '#F59E0B',  // Amber
  accent: '#EF4444',     // Red
  neutral: '#6B7280'     // Gray
};

<StoreActionButtons
  storeType="SERVICE"
  buttonStyle={{
    // Override default gradients with brand colors
    backgroundColor: brandTheme.primary
  }}
/>
```

### Compact Layout Theme
```typescript
const compactTheme = {
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  button: {
    minHeight: 40,
    paddingVertical: 10,
    borderRadius: 12
  },
  text: {
    fontSize: 14,
    fontWeight: '600'
  }
};
```

### Minimal Theme
```typescript
const minimalTheme = {
  container: {
    paddingVertical: 12
  },
  button: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 0,
    shadowOpacity: 0
  },
  text: {
    color: '#374151',
    fontWeight: '500'
  }
};
```

## Design Tokens

### Spacing Scale
```typescript
const spacing = {
  xs: 4,   // 4px
  sm: 8,   // 8px  
  md: 12,  // 12px
  lg: 16,  // 16px
  xl: 20,  // 20px
  xxl: 24  // 24px
};
```

### Border Radius Scale
```typescript
const borderRadius = {
  sm: 8,   // 8px
  md: 12,  // 12px
  lg: 16,  // 16px
  xl: 20,  // 20px
  full: 9999 // Fully rounded
};
```

### Shadow Scale
```typescript
const shadows = {
  sm: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  md: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  lg: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8
  }
};
```

## Performance Considerations

### Style Optimizations
- Use StyleSheet.create() for static styles
- Memoize dynamic style calculations with useMemo
- Avoid inline style objects in render methods
- Use transform properties for animations (GPU accelerated)

### Memory Management
- Reuse style objects across components
- Avoid creating new style objects on each render
- Use style inheritance where possible
- Clean up animated values and listeners

This comprehensive styling guide ensures consistent, accessible, and performant UI across all platforms and use cases.