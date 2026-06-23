# Component Patterns & Recipes

Common patterns, best practices, and copy-paste ready code snippets for building UI in Rez App.

## Table of Contents

- [Card Layouts](#card-layouts)
- [List Patterns](#list-patterns)
- [Form Patterns](#form-patterns)
- [Navigation Patterns](#navigation-patterns)
- [Modal Patterns](#modal-patterns)
- [Loading States](#loading-states)
- [Error States](#error-states)
- [Empty States](#empty-states)
- [Header Patterns](#header-patterns)
- [Button Patterns](#button-patterns)
- [Input Patterns](#input-patterns)
- [Image Patterns](#image-patterns)
- [Animation Patterns](#animation-patterns)
- [State Management Patterns](#state-management-patterns)

---

## Card Layouts

### Basic Card

```tsx
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

function BasicCard() {
  return (
    <ThemedView style={styles.card}>
      <ThemedText type="subtitle">Card Title</ThemedText>
      <ThemedText style={styles.description}>
        Card description goes here
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  description: {
    marginTop: 8,
    color: '#6B7280',
  },
});
```

### Card with Image

```tsx
function ImageCard({ image, title, description }) {
  return (
    <ThemedView style={styles.card}>
      <OptimizedImage
        source={image}
        style={styles.image}
        width={350}
        height={200}
      />
      <View style={styles.content}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText style={styles.description}>
          {description}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: 16,
  },
  description: {
    marginTop: 8,
    color: '#6B7280',
  },
});
```

### Card with Actions

```tsx
function ActionCard({ title, description, onEdit, onDelete }) {
  return (
    <ThemedView style={styles.card}>
      <View style={styles.content}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText style={styles.description}>
          {description}
        </ThemedText>
      </View>
      <View style={styles.actions}>
        <AccessibleButton
          label="Edit"
          onPress={onEdit}
          variant="outline"
          size="small"
        />
        <AccessibleButton
          label="Delete"
          onPress={onDelete}
          variant="danger"
          size="small"
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  content: {
    marginBottom: 16,
  },
  description: {
    marginTop: 8,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
});
```

### Horizontal Scrollable Cards

```tsx
function HorizontalCards({ items, onItemPress }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {items.map((item, index) => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          onPress={() => onItemPress(item)}
          activeOpacity={0.95}
        >
          <OptimizedImage
            source={item.image}
            style={styles.image}
            width={180}
            height={120}
          />
          <ThemedText style={styles.title} numberOfLines={2}>
            {item.title}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 180,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  image: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  title: {
    padding: 12,
    fontSize: 14,
    fontWeight: '600',
  },
});
```

---

## List Patterns

### Basic FlatList

```tsx
import { FlatList } from 'react-native';

function BasicList({ data }) {
  const renderItem = ({ item }) => (
    <ListItem item={item} />
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
});
```

### List with Separator

```tsx
function ListWithSeparator({ data }) {
  const ItemSeparator = () => <View style={styles.separator} />;

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={ItemSeparator}
    />
  );
}

const styles = StyleSheet.create({
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
});
```

### List with Empty State

```tsx
function ListWithEmpty({ data, onRetry }) {
  const EmptyComponent = () => (
    <View style={styles.empty}>
      <Ionicons name="basket-outline" size={64} color="#9CA3AF" />
      <ThemedText style={styles.emptyTitle}>No items found</ThemedText>
      <ThemedText style={styles.emptyDescription}>
        Try adjusting your filters
      </ThemedText>
      <AccessibleButton
        label="Retry"
        onPress={onRetry}
        variant="outline"
        style={styles.retryButton}
      />
    </View>
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={EmptyComponent}
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
  },
});
```

### Sectioned List

```tsx
import { SectionList } from 'react-native';

function SectionedList({ sections }) {
  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <ThemedText type="subtitle">{section.title}</ThemedText>
    </View>
  );

  return (
    <SectionList
      sections={sections}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={(item) => item.id}
    />
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
```

### Infinite Scroll List

```tsx
function InfiniteList({ data, hasMore, onLoadMore, loading }) {
  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <LoadingSpinner size="small" />
      </View>
    );
  };

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onEndReached={hasMore ? onLoadMore : null}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 20,
  },
});
```

---

## Form Patterns

### Basic Form

```tsx
function BasicForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = () => {
    // Validation
    const newErrors = {};
    if (!name) newErrors.name = 'Name is required';
    if (!email) newErrors.email = 'Email is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit form
  };

  return (
    <View style={styles.form}>
      <AccessibleInput
        label="Name"
        value={name}
        onChangeText={setName}
        error={errors.name}
        placeholder="Enter your name"
      />

      <AccessibleInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <AccessibleButton
        label="Submit"
        onPress={handleSubmit}
        variant="primary"
        fullWidth
        style={styles.submitButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: 16,
    gap: 16,
  },
  submitButton: {
    marginTop: 8,
  },
});
```

### Form with Validation

```tsx
function ValidatedForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (field, value) => {
    switch (field) {
      case 'email':
        return /\S+@\S+\.\S+/.test(value) ? '' : 'Invalid email';
      case 'phone':
        return /^\d{10}$/.test(value) ? '' : 'Invalid phone number';
      case 'name':
        return value.length >= 2 ? '' : 'Name too short';
      default:
        return '';
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  return (
    <View style={styles.form}>
      {Object.keys(formData).map(field => (
        <AccessibleInput
          key={field}
          label={field.charAt(0).toUpperCase() + field.slice(1)}
          value={formData[field]}
          onChangeText={(value) => handleChange(field, value)}
          onBlur={() => handleBlur(field)}
          error={touched[field] ? errors[field] : ''}
        />
      ))}
    </View>
  );
}
```

---

## Modal Patterns

### Basic Modal

```tsx
import { Modal, View, TouchableOpacity } from 'react-native';

function BasicModal({ visible, onClose, title, children }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <ThemedText type="subtitle">{title}</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  content: {
    padding: 16,
  },
});
```

### Bottom Sheet Modal

```tsx
function BottomSheet({ visible, onClose, children }) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 200,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
});
```

---

## Loading States

### Full Screen Loading

```tsx
function FullScreenLoading({ message }) {
  return (
    <View style={styles.container}>
      <LoadingSpinner size="large" />
      {message && (
        <ThemedText style={styles.message}>{message}</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
});
```

### Skeleton Loading

```tsx
function SkeletonCard() {
  return (
    <View style={styles.card}>
      <ShimmerEffect width="100%" height={200} borderRadius={12} />
      <View style={styles.content}>
        <ShimmerEffect width="60%" height={20} borderRadius={4} />
        <ShimmerEffect
          width="100%"
          height={16}
          borderRadius={4}
          style={{ marginTop: 8 }}
        />
        <ShimmerEffect
          width="80%"
          height={16}
          borderRadius={4}
          style={{ marginTop: 4 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  content: {
    padding: 16,
  },
});
```

---

## Error States

### Inline Error

```tsx
function InlineError({ message }) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={20} color="#EF4444" />
      <ThemedText style={styles.message}>{message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
  },
});
```

### Full Page Error

```tsx
function ErrorPage({ title, message, onRetry }) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={64} color="#EF4444" />
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText style={styles.message}>{message}</ThemedText>
      <AccessibleButton
        label="Try Again"
        onPress={onRetry}
        variant="primary"
        icon="refresh"
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginTop: 24,
    textAlign: 'center',
  },
  message: {
    marginTop: 12,
    textAlign: 'center',
    color: '#6B7280',
  },
  button: {
    marginTop: 24,
  },
});
```

---

## Empty States

### Basic Empty State

```tsx
function EmptyState({ icon, title, description, action, onAction }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color="#9CA3AF" />
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText style={styles.description}>{description}</ThemedText>
      {action && (
        <AccessibleButton
          label={action}
          onPress={onAction}
          variant="primary"
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  title: {
    marginTop: 24,
    textAlign: 'center',
  },
  description: {
    marginTop: 12,
    textAlign: 'center',
    color: '#6B7280',
  },
  button: {
    marginTop: 24,
  },
});
```

---

## Button Patterns

### Button Group

```tsx
function ButtonGroup({ buttons, selected, onSelect }) {
  return (
    <View style={styles.group}>
      {buttons.map((button, index) => (
        <TouchableOpacity
          key={button.value}
          style={[
            styles.button,
            selected === button.value && styles.buttonSelected,
          ]}
          onPress={() => onSelect(button.value)}
        >
          <ThemedText
            style={[
              styles.buttonText,
              selected === button.value && styles.buttonTextSelected,
            ]}
          >
            {button.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  buttonSelected: {
    backgroundColor: '#8B5CF6',
  },
  buttonText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#1F2937',
  },
  buttonTextSelected: {
    color: '#FFFFFF',
  },
});
```

### Floating Action Button

```tsx
function FloatingButton({ icon, onPress }) {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Ionicons name={icon} size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
```

---

## Animation Patterns

### Fade In Animation

```tsx
function FadeInView({ children, duration = 300 }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      {children}
    </Animated.View>
  );
}
```

### Slide In Animation

```tsx
function SlideInView({ children, from = 'bottom' }) {
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        transform: [
          from === 'bottom'
            ? { translateY: slideAnim }
            : { translateX: slideAnim }
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
```

---

## State Management Patterns

### Context Pattern

```tsx
// Create context
const MyContext = createContext();

// Provider component
function MyProvider({ children }) {
  const [state, setState] = useState(initialState);

  const value = {
    state,
    setState,
  };

  return (
    <MyContext.Provider value={value}>
      {children}
    </MyContext.Provider>
  );
}

// Custom hook
function useMyContext() {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
}
```

### Reducer Pattern

```tsx
const initialState = { count: 0 };

function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    default:
      return state;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <View>
      <ThemedText>Count: {state.count}</ThemedText>
      <AccessibleButton
        label="+"
        onPress={() => dispatch({ type: 'increment' })}
      />
      <AccessibleButton
        label="-"
        onPress={() => dispatch({ type: 'decrement' })}
      />
    </View>
  );
}
```

---

## Version History

- **v1.0.0** - Initial component patterns documentation (2025-11-11)
