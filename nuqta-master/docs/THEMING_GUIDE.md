# Theming & Customization Guide

Complete guide to theming, dark mode, and customization in Rez App.

## Table of Contents

- [Overview](#overview)
- [Theme System](#theme-system)
- [Using Themed Components](#using-themed-components)
- [Dark Mode Support](#dark-mode-support)
- [Custom Themes](#custom-themes)
- [Dynamic Theming](#dynamic-theming)
- [Component Theming](#component-theming)
- [Best Practices](#best-practices)

---

## Overview

The Rez App uses a comprehensive theming system that supports:

- **Light and Dark modes** - Automatic detection and manual override
- **Semantic colors** - Consistent color naming across themes
- **Theme-aware components** - All components adapt to theme
- **Custom themes** - Create your own color schemes
- **Dynamic theming** - Runtime theme switching

### Architecture

```
Theme System
├── Colors.ts          # Color definitions
├── useColorScheme     # Detect system theme
├── useThemeColor      # Apply theme colors
├── ThemedView         # Themed container
└── ThemedText         # Themed text
```

---

## Theme System

### Color Definitions

Located in `constants/Colors.ts`:

```typescript
export const Colors = {
  light: {
    text: '#0f172a',
    background: '#ffffff',
    tint: '#6366f1',
    // ... more colors
  },
  dark: {
    text: '#f8fafc',
    background: '#0f172a',
    tint: '#a5b4fc',
    // ... more colors
  },
};
```

### Color Keys

Available color keys:

```typescript
type ColorKey =
  | 'text'
  | 'background'
  | 'tint'
  | 'icon'
  | 'tabIconDefault'
  | 'tabIconSelected'
  | 'surface'
  | 'surfaceSecondary'
  | 'border'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'textSecondary'
  | 'textMuted';
```

---

## Using Themed Components

### ThemedView

Container component with automatic theme support:

```tsx
import { ThemedView } from '@/components/ThemedView';

// Basic usage - uses theme background color
<ThemedView style={styles.container}>
  <Text>Content</Text>
</ThemedView>

// Custom light/dark colors
<ThemedView
  lightColor="#FFFFFF"
  darkColor="#1F2937"
  style={styles.section}
>
  <Text>Custom themed section</Text>
</ThemedView>

// Using with surface color
<ThemedView style={styles.card}>
  {/* Card content */}
</ThemedView>
```

**Props:**

```typescript
interface ThemedViewProps extends ViewProps {
  lightColor?: string;  // Override light theme color
  darkColor?: string;   // Override dark theme color
}
```

**Examples:**

```tsx
// Page container
<ThemedView style={styles.page}>
  <ScrollView>
    {/* Page content */}
  </ScrollView>
</ThemedView>

// Card with surface color
<ThemedView
  lightColor={Colors.light.surface}
  darkColor={Colors.dark.surface}
  style={styles.card}
>
  <Text>Card content</Text>
</ThemedView>

// Modal background
<ThemedView
  lightColor="rgba(0,0,0,0.5)"
  darkColor="rgba(0,0,0,0.7)"
  style={styles.modalOverlay}
>
  {/* Modal content */}
</ThemedView>
```

### ThemedText

Text component with typography variants and theme support:

```tsx
import { ThemedText } from '@/components/ThemedText';

// Default text
<ThemedText>Regular text</ThemedText>

// Typography variants
<ThemedText type="title">Page Title</ThemedText>
<ThemedText type="subtitle">Section Heading</ThemedText>
<ThemedText type="defaultSemiBold">Important text</ThemedText>
<ThemedText type="link">Click here</ThemedText>

// Custom colors
<ThemedText
  lightColor="#8B5CF6"
  darkColor="#A78BFA"
>
  Branded text
</ThemedText>

// Combining type and custom color
<ThemedText
  type="subtitle"
  lightColor="#059669"
  darkColor="#34D399"
>
  Success Heading
</ThemedText>
```

**Props:**

```typescript
interface ThemedTextProps extends TextProps {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
}
```

**Typography Variants:**

```typescript
// default - 16px, regular
{
  fontSize: 16,
  lineHeight: 24,
  fontWeight: '400',
}

// title - 32px, bold
{
  fontSize: 32,
  lineHeight: 32,
  fontWeight: '700',
}

// subtitle - 20px, bold
{
  fontSize: 20,
  lineHeight: 28,
  fontWeight: '600',
}

// defaultSemiBold - 16px, semi-bold
{
  fontSize: 16,
  lineHeight: 24,
  fontWeight: '600',
}

// link - 16px, colored
{
  fontSize: 16,
  lineHeight: 30,
  color: '#0a7ea4',
}
```

---

## Dark Mode Support

### Detecting Theme

Use the `useColorScheme` hook:

```tsx
import { useColorScheme } from '@/hooks/useColorScheme';

function MyComponent() {
  const colorScheme = useColorScheme(); // 'light' | 'dark'

  return (
    <View>
      <Text>Current theme: {colorScheme}</Text>
    </View>
  );
}
```

### Applying Theme Colors

Use the `useThemeColor` hook:

```tsx
import { useThemeColor } from '@/hooks/useThemeColor';

function MyComponent() {
  // Get theme color
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');

  return (
    <View style={{ backgroundColor }}>
      <Text style={{ color: textColor }}>Themed Text</Text>
    </View>
  );
}
```

### Custom Theme Colors

Override theme colors:

```tsx
function MyComponent() {
  // Custom colors for light/dark
  const customColor = useThemeColor(
    {
      light: '#FF5733',  // Custom light color
      dark: '#FF8C66',   // Custom dark color
    },
    'primary'            // Fallback to primary if not provided
  );

  return (
    <View style={{ backgroundColor: customColor }}>
      <Text>Custom themed content</Text>
    </View>
  );
}
```

### Conditional Styling

Apply different styles based on theme:

```tsx
function MyComponent() {
  const colorScheme = useColorScheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
      borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB',
      borderWidth: 1,
    },
  });

  return <View style={styles.container}>{/* Content */}</View>;
}
```

---

## Custom Themes

### Creating a Custom Theme

Extend the Colors object:

```typescript
// constants/CustomColors.ts
export const CustomColors = {
  light: {
    ...Colors.light,
    primary: '#FF5733',      // Custom primary
    secondary: '#33FF57',    // Custom secondary
    brandAccent: '#5733FF',  // New color
  },
  dark: {
    ...Colors.dark,
    primary: '#FF8C66',
    secondary: '#66FF8C',
    brandAccent: '#8C66FF',
  },
};
```

### Using Custom Theme

```tsx
import { CustomColors } from '@/constants/CustomColors';

function ThemedComponent() {
  const colorScheme = useColorScheme() ?? 'light';
  const primaryColor = CustomColors[colorScheme].primary;

  return (
    <View style={{ backgroundColor: primaryColor }}>
      <Text>Custom themed component</Text>
    </View>
  );
}
```

### Theme Provider Pattern

Create a context for theme management:

```tsx
// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState } from 'react';

type Theme = 'light' | 'dark' | 'custom';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colors: typeof Colors.light;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<Theme>('light');
  const systemTheme = useColorScheme() ?? 'light';

  const colors = theme === 'custom'
    ? CustomColors[systemTheme]
    : Colors[theme === 'light' ? 'light' : 'dark'];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

**Usage:**

```tsx
// App root
<ThemeProvider>
  <App />
</ThemeProvider>

// In components
function MyComponent() {
  const { theme, setTheme, colors } = useTheme();

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Button
        title="Toggle Theme"
        onPress={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      />
    </View>
  );
}
```

---

## Dynamic Theming

### Runtime Theme Switching

```tsx
import { useColorScheme } from 'react-native';

function ThemeToggle() {
  const [manualTheme, setManualTheme] = useState<'light' | 'dark' | null>(null);
  const systemTheme = useColorScheme();
  const currentTheme = manualTheme ?? systemTheme ?? 'light';

  const toggleTheme = () => {
    setManualTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <TouchableOpacity onPress={toggleTheme} style={styles.toggle}>
      <Ionicons
        name={currentTheme === 'dark' ? 'moon' : 'sunny'}
        size={24}
        color="#8B5CF6"
      />
    </TouchableOpacity>
  );
}
```

### Persisting Theme Preference

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@theme_preference';

function usePersistedTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    // Load saved theme
    AsyncStorage.getItem(THEME_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark') {
        setThemeState(saved);
      }
    });
  }, []);

  const setTheme = async (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    await AsyncStorage.setItem(THEME_KEY, newTheme);
  };

  return { theme, setTheme };
}
```

### Animated Theme Transitions

```tsx
function AnimatedThemeSwitch() {
  const colorAnim = useRef(new Animated.Value(0)).current;

  const switchTheme = () => {
    Animated.timing(colorAnim, {
      toValue: colorAnim._value === 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const backgroundColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', '#0F172A'],
  });

  return (
    <Animated.View style={{ backgroundColor, flex: 1 }}>
      <Button title="Switch Theme" onPress={switchTheme} />
    </Animated.View>
  );
}
```

---

## Component Theming

### Theming Custom Components

```tsx
// Define theme-aware component
interface CustomCardProps {
  title: string;
  description: string;
}

function CustomCard({ title, description }: CustomCardProps) {
  const backgroundColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor,
        },
      ]}
    >
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText style={{ color: textColor }}>
        {description}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
});
```

### Theming with StyleSheet

```tsx
function ThemedComponent() {
  const colorScheme = useColorScheme() ?? 'light';

  const styles = StyleSheet.create({
    container: {
      backgroundColor: Colors[colorScheme].background,
      borderColor: Colors[colorScheme].border,
      borderWidth: 1,
    },
    text: {
      color: Colors[colorScheme].text,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Themed Text</Text>
    </View>
  );
}
```

### Memoized Theme Styles

```tsx
function OptimizedThemedComponent() {
  const colorScheme = useColorScheme() ?? 'light';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: Colors[colorScheme].background,
        },
        text: {
          color: Colors[colorScheme].text,
        },
      }),
    [colorScheme]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Optimized Themed Text</Text>
    </View>
  );
}
```

---

## Best Practices

### Do's

1. **Always use themed components** - Use `ThemedView` and `ThemedText` instead of raw `View` and `Text`
2. **Use semantic color names** - Use `primary`, `success`, etc. instead of hex codes
3. **Test both themes** - Always test in light and dark mode
4. **Use useThemeColor hook** - For dynamic theme colors
5. **Provide sufficient contrast** - Ensure WCAG compliance
6. **Use surface colors for cards** - Follow elevation system
7. **Cache theme styles** - Use useMemo for expensive computations
8. **Support system theme** - Respect user's system preference
9. **Persist theme choice** - Save user's manual selection
10. **Animate transitions** - Smooth theme switching

### Don'ts

1. **Don't hardcode colors** - Always use theme system
2. **Don't use inline hex codes** - Use color constants
3. **Don't ignore dark mode** - Support is expected
4. **Don't use pure black/white** - Use theme colors
5. **Don't forget borders** - Theme border colors too
6. **Don't skip testing** - Test all theme variations
7. **Don't override unnecessarily** - Use default theme colors when possible
8. **Don't create too many themes** - Keep it simple
9. **Don't forget icons** - Theme icon colors
10. **Don't ignore accessibility** - Maintain contrast ratios

### Common Patterns

#### Pattern 1: Themed Screen

```tsx
function ThemedScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Screen Title</ThemedText>
      <ThemedText>Screen content</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
```

#### Pattern 2: Themed Card

```tsx
function ThemedCard() {
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: surfaceColor,
          borderColor,
        },
      ]}
    >
      <ThemedText type="subtitle">Card Title</ThemedText>
      <ThemedText>Card content</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
});
```

#### Pattern 3: Themed Button

```tsx
function ThemedButton({ onPress, title }) {
  const primaryColor = useThemeColor({}, 'primary');

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, { backgroundColor: primaryColor }]}
    >
      <ThemedText
        lightColor="#FFFFFF"
        darkColor="#FFFFFF"
        style={styles.buttonText}
      >
        {title}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '600',
  },
});
```

---

## Advanced Theming

### Multiple Theme Variants

```tsx
const themes = {
  default: Colors,
  ocean: {
    light: {
      ...Colors.light,
      primary: '#0EA5E9',
      secondary: '#06B6D4',
    },
    dark: {
      ...Colors.dark,
      primary: '#38BDF8',
      secondary: '#22D3EE',
    },
  },
  forest: {
    light: {
      ...Colors.light,
      primary: '#059669',
      secondary: '#10B981',
    },
    dark: {
      ...Colors.dark,
      primary: '#34D399',
      secondary: '#6EE7B7',
    },
  },
};
```

### Theme-based Component Variants

```tsx
function ThemedBadge({ variant, children }) {
  const colorScheme = useColorScheme() ?? 'light';

  const variantColors = {
    success: Colors[colorScheme].success,
    warning: Colors[colorScheme].warning,
    error: Colors[colorScheme].error,
    info: Colors[colorScheme].primary,
  };

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: variantColors[variant] },
      ]}
    >
      <ThemedText lightColor="#FFF" darkColor="#FFF">
        {children}
      </ThemedText>
    </View>
  );
}
```

---

## Troubleshooting

### Theme Not Updating

```tsx
// Problem: Component not re-rendering on theme change
function BrokenComponent() {
  const theme = useColorScheme();
  // Styles created once, never update
  const styles = StyleSheet.create({
    text: { color: Colors[theme].text }
  });
}

// Solution: Use useMemo or inline styles
function FixedComponent() {
  const textColor = useThemeColor({}, 'text');
  return <Text style={{ color: textColor }}>Text</Text>;
}
```

### Flashing on Theme Change

```tsx
// Use StatusBar to prevent flash
import { StatusBar } from 'expo-status-bar';

function App() {
  const colorScheme = useColorScheme();

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ThemedView style={{ flex: 1 }}>
        {/* App content */}
      </ThemedView>
    </>
  );
}
```

---

## Version History

- **v1.0.0** - Initial theming guide (2025-11-11)
