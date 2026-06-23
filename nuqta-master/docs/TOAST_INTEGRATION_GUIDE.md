# Toast Manager Integration Guide

## Overview
The ToastManager provides a global context for showing toast notifications with queue management, auto-dismiss, and multiple toast types.

## Files Created
1. `contexts/ToastContext.tsx` - Toast context provider with queue system
2. `hooks/useToast.ts` - Custom hook for accessing toast functionality

## Integration Steps

### 1. Wrap Your App with ToastProvider

Update your root layout file (e.g., `app/_layout.tsx`):

```tsx
import { ToastProvider } from '@/contexts/ToastContext';

export default function RootLayout() {
  return (
    <ToastProvider>
      {/* Your existing app structure */}
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Other screens */}
      </Stack>
    </ToastProvider>
  );
}
```

### 2. Use in Components

```tsx
import { useToast } from '@/hooks/useToast';

export default function MyComponent() {
  const { showSuccess, showError, showInfo, showWarning } = useToast();

  const handleSuccess = () => {
    showSuccess('Operation completed successfully!');
  };

  const handleError = () => {
    showError('Something went wrong!', 5000); // Custom duration
  };

  const handleInfo = () => {
    showInfo('Processing your request...');
  };

  const handleWarning = () => {
    showWarning('Please verify your input');
  };

  return (
    <View>
      <Button title="Show Success" onPress={handleSuccess} />
      <Button title="Show Error" onPress={handleError} />
      <Button title="Show Info" onPress={handleInfo} />
      <Button title="Show Warning" onPress={handleWarning} />
    </View>
  );
}
```

## API Reference

### useToast Hook

Returns an object with the following methods:

#### `showToast(message, type, duration?)`
- **message**: `string` - The message to display
- **type**: `'success' | 'error' | 'info' | 'warning'` - Toast type
- **duration**: `number` (optional, default: 3000ms) - Auto-dismiss duration

#### `showSuccess(message, duration?)`
Convenience method for success toasts
- **message**: `string` - Success message
- **duration**: `number` (optional, default: 3000ms)

#### `showError(message, duration?)`
Convenience method for error toasts
- **message**: `string` - Error message
- **duration**: `number` (optional, default: 3000ms)

#### `showInfo(message, duration?)`
Convenience method for info toasts
- **message**: `string` - Info message
- **duration**: `number` (optional, default: 3000ms)

#### `showWarning(message, duration?)`
Convenience method for warning toasts
- **message**: `string` - Warning message
- **duration**: `number` (optional, default: 3000ms)

#### `dismissAll()`
Dismisses all toasts (current and queued)

## Features

### Queue Management
- Only one toast is displayed at a time
- Additional toasts are queued (FIFO)
- Automatic processing of queue when current toast dismisses

### Auto-Dismiss
- Default: 3000ms (3 seconds)
- Customizable per toast
- Set to `0` for no auto-dismiss (requires manual dismiss)

### Toast Types
- **Success**: Green background with checkmark icon
- **Error**: Red background with close-circle icon
- **Info**: Blue background with information icon
- **Warning**: Orange background with warning icon

### Positioning
- Fixed at top of screen (60px from top)
- Full width with 16px horizontal margins
- Z-index: 10000 for visibility above all content

### Accessibility
- ARIA labels and roles
- Screen reader support
- Live region announcements

## Examples

### Form Submission
```tsx
const handleSubmit = async () => {
  const { showSuccess, showError } = useToast();

  try {
    await submitForm(data);
    showSuccess('Form submitted successfully!');
    navigation.navigate('Home');
  } catch (error) {
    showError('Failed to submit form. Please try again.');
  }
};
```

### Cart Operations
```tsx
const addToCart = (item) => {
  const { showSuccess } = useToast();

  dispatch(addItem(item));
  showSuccess(`${item.name} added to cart!`, 2000);
};
```

### Multiple Operations
```tsx
const performMultipleActions = async () => {
  const { showInfo, showSuccess, showError } = useToast();

  showInfo('Starting process...');

  try {
    await step1();
    showSuccess('Step 1 complete');

    await step2();
    showSuccess('Step 2 complete');

    await step3();
    showSuccess('All steps completed!');
  } catch (error) {
    showError('Process failed at step ' + error.step);
  }
};
```

### Dismiss All on Logout
```tsx
const handleLogout = () => {
  const { dismissAll } = useToast();

  dismissAll(); // Clear all pending notifications
  logout();
  navigation.navigate('Login');
};
```

## Notes

- Toasts are displayed in order of creation (FIFO queue)
- Each toast has a 300ms transition delay between dismissal and next toast
- The context uses `pointerEvents: 'box-none'` to allow touches to pass through except on the toast itself
- Toast component handles its own animations and dismissal logic
- Error-safe: throws error if used outside ToastProvider

## Troubleshooting

### Toast not showing
- Ensure `ToastProvider` wraps your app at the root level
- Check that you're calling toast methods inside a component
- Verify the component is mounted and not unmounted immediately

### Multiple toasts showing at once
- This shouldn't happen with the queue system
- If it does, check for multiple `ToastProvider` instances

### Toast position issues
- Toast uses absolute positioning with `zIndex: 10000`
- Ensure no parent elements have higher z-index
- Check for conflicting position styles

## Best Practices

1. **Keep messages concise**: Toast messages should be short and actionable
2. **Use appropriate types**: Match the toast type to the message context
3. **Set appropriate durations**:
   - Quick confirmations: 2000ms
   - Standard messages: 3000ms (default)
   - Important errors: 4000-5000ms
4. **Don't overuse**: Too many toasts can be annoying
5. **Clear on navigation**: Consider calling `dismissAll()` on major navigation events
6. **Provide context**: Include relevant information in the message
7. **Combine with actions**: For important operations, consider using Toast with action buttons

## Related Components
- `components/common/Toast.tsx` - Base toast component
- `components/common/ToastManager.tsx` - Alternative implementation (if exists)
