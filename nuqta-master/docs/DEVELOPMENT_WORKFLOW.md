# Development Workflow Guide

Complete guide to daily development workflow, Git practices, and team collaboration.

## Table of Contents

- [Daily Workflow](#daily-workflow)
- [Git Workflow](#git-workflow)
- [Creating Features](#creating-features)
- [Code Review Process](#code-review-process)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Daily Workflow

### Morning Routine (15-30 mins)

```bash
# 1. Pull latest changes
git checkout master
git pull origin master

# 2. Update dependencies (if package.json changed)
npm install

# 3. Start development server
npm start

# 4. Check team updates
# - Review Slack messages
# - Check PR reviews assigned to you
# - Look at sprint board
```

### During Development

1. **Pick a task** from sprint board
2. **Create a branch** following naming conventions
3. **Develop feature** following code standards
4. **Test locally** (manual + automated)
5. **Commit regularly** with good messages
6. **Push to remote** frequently
7. **Create PR** when feature is complete
8. **Address feedback** from code review
9. **Merge** when approved

### End of Day

```bash
# 1. Commit work in progress
git add .
git commit -m "wip: feature name - progress description"
git push origin your-branch

# 2. Update task status
# - Move tasks in sprint board
# - Add comments on blockers
# - Log time (if tracked)

# 3. Plan tomorrow
# - Review next tasks
# - Note any blockers
```

---

## Git Workflow

### Branch Strategy

We use **Git Flow** with the following branches:

```
master (main)       # Production-ready code
├── develop         # Integration branch (if used)
├── feature/*       # New features
├── bugfix/*        # Bug fixes
├── hotfix/*        # Urgent production fixes
└── release/*       # Release preparation
```

### Branch Naming Conventions

```bash
# Features
feature/user-authentication
feature/product-search
feature/add-to-cart

# Bug fixes
bugfix/cart-total-calculation
bugfix/image-upload-crash

# Hotfixes
hotfix/payment-gateway-error
hotfix/security-vulnerability

# Refactoring
refactor/context-optimization
refactor/api-service-cleanup

# Documentation
docs/api-documentation
docs/onboarding-guide

# Testing
test/cart-integration
test/payment-flow
```

### Creating a Branch

```bash
# 1. Start from latest master
git checkout master
git pull origin master

# 2. Create feature branch
git checkout -b feature/product-filters

# 3. Verify you're on the right branch
git branch
# * feature/product-filters
#   master
```

### Committing Changes

#### Commit Message Format

We follow **Conventional Commits**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code restructuring (no feature/fix)
- `perf`: Performance improvement
- `test`: Adding/updating tests
- `chore`: Build process, dependencies
- `ci`: CI/CD changes

**Examples:**

```bash
# Feature
git commit -m "feat(cart): add remove item functionality"

# Bug fix
git commit -m "fix(auth): resolve token refresh loop"

# Documentation
git commit -m "docs(readme): update installation steps"

# Multi-line commit
git commit -m "feat(search): add product search filters

- Added price range filter
- Added category filter
- Added sort by price/rating
- Updated UI with filter chips

Closes #123"
```

#### Good Commit Practices

```bash
# ✅ Good commits - Small, focused changes
git commit -m "feat(cart): add item to cart"
git commit -m "feat(cart): update cart total calculation"
git commit -m "test(cart): add cart integration tests"

# ❌ Bad commits - Too large or vague
git commit -m "fix stuff"
git commit -m "changes"
git commit -m "feat: add entire checkout flow with payment integration and order tracking"
```

### Pushing Changes

```bash
# Push new branch to remote
git push -u origin feature/product-filters

# Push subsequent commits
git push

# Force push (use with caution!)
git push --force-with-lease  # Safer than --force
```

### Keeping Branch Updated

```bash
# Option 1: Rebase (recommended - cleaner history)
git checkout master
git pull origin master
git checkout feature/product-filters
git rebase master

# Resolve conflicts if any
# Then:
git add .
git rebase --continue

# Push (requires force push after rebase)
git push --force-with-lease

# Option 2: Merge (simpler, creates merge commit)
git checkout feature/product-filters
git merge master

# Resolve conflicts if any
git add .
git commit -m "merge: resolve conflicts with master"
git push
```

---

## Creating Features

### 1. Plan the Feature

Before coding:

- [ ] Understand requirements
- [ ] Review designs (Figma)
- [ ] Identify affected components
- [ ] Plan API integration
- [ ] Estimate effort

### 2. Create Feature Branch

```bash
git checkout master
git pull origin master
git checkout -b feature/product-wishlist
```

### 3. Development Process

#### Step 1: Create Types

```typescript
// types/wishlist.types.ts
export interface WishlistItem {
  id: string;
  productId: string;
  userId: string;
  addedAt: string;
  product?: Product;
}

export interface WishlistContextType {
  items: WishlistItem[];
  addItem: (productId: string) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
}
```

#### Step 2: Create API Service

```typescript
// services/wishlistApi.ts
import apiClient from './apiClient';
import type { WishlistItem } from '@/types/wishlist.types';

export const wishlistApi = {
  getAll: async (): Promise<WishlistItem[]> => {
    const response = await apiClient.get('/wishlist');
    return response.data;
  },

  add: async (productId: string): Promise<WishlistItem> => {
    const response = await apiClient.post('/wishlist', { productId });
    return response.data;
  },

  remove: async (productId: string): Promise<void> => {
    await apiClient.delete(`/wishlist/${productId}`);
  },
};
```

#### Step 3: Create Context (if needed)

```typescript
// contexts/WishlistContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { wishlistApi } from '@/services/wishlistApi';
import type { WishlistItem, WishlistContextType } from '@/types/wishlist.types';

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const data = await wishlistApi.getAll();
      setItems(data);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (productId: string) => {
    const newItem = await wishlistApi.add(productId);
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = async (productId: string) => {
    await wishlistApi.remove(productId);
    setItems(prev => prev.filter(item => item.productId !== productId));
  };

  const isInWishlist = (productId: string) => {
    return items.some(item => item.productId === productId);
  };

  return (
    <WishlistContext.Provider value={{ items, addItem, removeItem, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
}
```

#### Step 4: Create Components

```typescript
// components/wishlist/WishlistButton.tsx
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWishlist } from '@/contexts/WishlistContext';

interface Props {
  productId: string;
}

export default function WishlistButton({ productId }: Props) {
  const { isInWishlist, addItem, removeItem } = useWishlist();
  const inWishlist = isInWishlist(productId);

  const handlePress = async () => {
    if (inWishlist) {
      await removeItem(productId);
    } else {
      await addItem(productId);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessible
      accessibilityLabel={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      accessibilityRole="button"
    >
      <Ionicons
        name={inWishlist ? 'heart' : 'heart-outline'}
        size={24}
        color={inWishlist ? '#FF0000' : '#000000'}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Styles if needed
});
```

#### Step 5: Create Screen (if needed)

```typescript
// app/wishlist.tsx
import { View, FlatList, StyleSheet } from 'react-native';
import { useWishlist } from '@/contexts/WishlistContext';
import { ProductCard } from '@/components/product/ProductCard';

export default function WishlistScreen() {
  const { items } = useWishlist();

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard product={item.product} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
```

#### Step 6: Add Tests

```typescript
// __tests__/wishlist.test.tsx
import { renderHook, act } from '@testing-library/react-native';
import { WishlistProvider, useWishlist } from '@/contexts/WishlistContext';

describe('Wishlist', () => {
  it('should add item to wishlist', async () => {
    const { result } = renderHook(() => useWishlist(), {
      wrapper: WishlistProvider,
    });

    await act(async () => {
      await result.current.addItem('product-123');
    });

    expect(result.current.isInWishlist('product-123')).toBe(true);
  });

  it('should remove item from wishlist', async () => {
    const { result } = renderHook(() => useWishlist(), {
      wrapper: WishlistProvider,
    });

    await act(async () => {
      await result.current.addItem('product-123');
      await result.current.removeItem('product-123');
    });

    expect(result.current.isInWishlist('product-123')).toBe(false);
  });
});
```

### 4. Test Locally

```bash
# Run app
npm start

# Manual testing
# - Test happy path
# - Test error cases
# - Test edge cases
# - Test on iOS and Android

# Run automated tests
npm test

# Run linter
npm run lint

# Check TypeScript
npx tsc --noEmit
```

### 5. Commit Changes

```bash
# Stage changes
git add .

# Commit with good message
git commit -m "feat(wishlist): add wishlist functionality

- Added WishlistContext for state management
- Created wishlistApi service
- Implemented WishlistButton component
- Added wishlist screen
- Included tests

Closes #456"
```

### 6. Push to Remote

```bash
git push -u origin feature/product-wishlist
```

---

## Code Review Process

### Creating a Pull Request

#### 1. Push Your Branch

```bash
git push origin feature/product-wishlist
```

#### 2. Create PR on GitHub

Go to repository → Pull Requests → New Pull Request

**PR Template:**

```markdown
## Description
Brief description of what this PR does.

## Changes
- Added wishlist functionality
- Created WishlistContext
- Implemented WishlistButton
- Added tests

## Related Issues
Closes #456

## Type of Change
- [ ] Bug fix
- [x] New feature
- [ ] Breaking change
- [ ] Documentation update

## Screenshots/Videos
[Add screenshots or screen recordings]

## Testing
- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Added unit tests
- [ ] Added integration tests
- [ ] All tests passing

## Checklist
- [x] Code follows style guidelines
- [x] Self-reviewed code
- [x] Commented hard-to-understand code
- [x] Updated documentation
- [x] No new warnings
- [x] Added tests
- [x] All tests pass
- [x] Works on both platforms
```

#### 3. Request Reviews

- Assign 1-2 reviewers
- Add labels (feature, frontend, etc.)
- Link related issues
- Add to project board

### Reviewing PRs

#### As a Reviewer

**Checklist:**

- [ ] Code quality and readability
- [ ] Follows coding standards
- [ ] Proper error handling
- [ ] TypeScript types correct
- [ ] Performance considerations
- [ ] Security concerns
- [ ] Accessibility features
- [ ] Tests included and passing
- [ ] No unnecessary dependencies
- [ ] Documentation updated

**Review Comments:**

```markdown
# ✅ Approve with comments
Looks good! Just a few minor suggestions:
- Consider extracting this logic into a hook
- Add error boundary around this component

# 💬 Request changes
Please address these issues before merging:
1. Missing error handling in API call
2. Component needs accessibility labels
3. TypeScript type is too broad - should be more specific

# ❓ Ask questions
Could you explain why you chose this approach over X?
Is this handling the offline case?
```

#### As PR Author

**Responding to Feedback:**

```bash
# Make requested changes
# ... edit files ...

# Commit changes
git add .
git commit -m "fix: address PR feedback

- Added error handling
- Improved accessibility
- Fixed TypeScript types"

# Push updates
git push

# Respond to comments
# - Acknowledge feedback
# - Explain decisions
# - Mark resolved comments
```

### Merging PRs

#### Merge Requirements

- [ ] 2 approvals (or team requirement)
- [ ] All tests passing
- [ ] No merge conflicts
- [ ] Branch up to date with master
- [ ] CI/CD checks passed

#### Merge Strategy

```bash
# Option 1: Squash and Merge (recommended)
# - Combines all commits into one
# - Clean history
# - Use for most features

# Option 2: Rebase and Merge
# - Keeps individual commits
# - Linear history
# - Use for clean, well-structured commits

# Option 3: Merge Commit
# - Preserves all commits
# - Creates merge commit
# - Use rarely
```

#### After Merging

```bash
# 1. Delete feature branch
git branch -d feature/product-wishlist
git push origin --delete feature/product-wishlist

# 2. Pull latest master
git checkout master
git pull origin master

# 3. Update task status
# - Move card to "Done"
# - Close related issues
# - Update documentation
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (during development)
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test -- ProductCard.test.tsx

# E2E tests (if configured)
npm run test:e2e
```

### Writing Tests

See examples in feature creation section above.

**Test Structure:**

```typescript
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProductCard from '@/components/product/ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    price: 99.99,
    image: 'test.jpg',
  };

  it('renders product name', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Test Product')).toBeTruthy();
  });

  it('handles add to cart', () => {
    const onAddToCart = jest.fn();
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);

    fireEvent.press(screen.getByText('Add to Cart'));
    expect(onAddToCart).toHaveBeenCalledWith(mockProduct);
  });
});
```

---

## Deployment

### Development

```bash
# Start development server
npm start

# Specific platform
npm run android
npm run ios
npm run web
```

### Staging/Production

```bash
# Build for production
expo build:android
expo build:ios

# Or using EAS Build
eas build --platform android
eas build --platform ios
```

**CI/CD Process:**

1. Push to master → Triggers CI
2. CI runs tests and linters
3. CI builds app
4. Deploy to staging
5. QA testing
6. Deploy to production

---

## Troubleshooting

### Common Issues

#### Metro Bundler Issues

```bash
# Clear Metro cache
npm start -- --clear

# or
npx react-native start --reset-cache
```

#### Node Modules Issues

```bash
# Clear and reinstall
rm -rf node_modules
npm install

# Clear package lock
rm -rf node_modules package-lock.json
npm install
```

#### Git Conflicts

```bash
# See conflicted files
git status

# For each file, resolve conflicts in editor
# Then:
git add <resolved-file>

# Continue rebase/merge
git rebase --continue
# or
git merge --continue

# Abort if needed
git rebase --abort
git merge --abort
```

#### Expo Issues

```bash
# Clear Expo cache
expo start -c

# Reset Expo
rm -rf .expo
expo start
```

---

## Quick Reference

### Daily Commands

```bash
# Start development
git pull origin master
npm install
npm start

# Create feature
git checkout -b feature/my-feature
# ... develop ...
git add .
git commit -m "feat: description"
git push -u origin feature/my-feature

# Update branch
git checkout master
git pull origin master
git checkout feature/my-feature
git rebase master

# Clean up
git branch -d old-feature
rm -rf node_modules && npm install
npm start -- --clear
```

### Git Aliases (Optional)

Add to `~/.gitconfig`:

```ini
[alias]
  co = checkout
  br = branch
  ci = commit
  st = status
  unstage = reset HEAD --
  last = log -1 HEAD
  visual = log --graph --oneline --all
```

---

**Last Updated**: November 2024
**Questions?** Check [DEVELOPER_ONBOARDING.md](./DEVELOPER_ONBOARDING.md) or ask in Slack
