# Developer Onboarding Guide

Welcome to the **Rez App** team! This guide will help you get set up and productive within 1-2 days.

## Table of Contents

- [Welcome](#welcome)
- [Project Overview](#project-overview)
- [Day 1: Getting Started](#day-1-getting-started)
- [Day 2: Deep Dive](#day-2-deep-dive)
- [Essential Resources](#essential-resources)
- [Getting Help](#getting-help)

---

## Welcome

Rez App is a comprehensive React Native e-commerce and rewards platform built with Expo. Our mission is to provide users with seamless shopping experiences, gamification, social features, and cashback rewards.

### Team Structure

- **Frontend Team**: React Native (this repo)
- **Backend Team**: Node.js/Express (separate repo)
- **DevOps**: CI/CD, deployment, monitoring
- **QA**: Testing, quality assurance
- **Design**: UI/UX, product design

### Communication Channels

- **Slack**: Daily communication, quick questions
- **GitHub**: Code reviews, technical discussions
- **Jira/Linear**: Task tracking, sprint planning
- **Zoom/Meet**: Standups, sprint planning, 1-on-1s

---

## Project Overview

### What is Rez App?

Rez App is a mobile-first platform that combines:

- **E-commerce**: Browse products, stores, categories
- **Rewards**: Earn coins, cashback, referral bonuses
- **Social Features**: UGC videos, reviews, follow stores
- **Gamification**: Challenges, achievements, leaderboards
- **Services**: Bill payments, vouchers, subscriptions

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React Native 0.74.5 + Expo 51 |
| **Language** | TypeScript 5.3 |
| **Navigation** | Expo Router (file-based) |
| **State Management** | React Context API |
| **Styling** | StyleSheet + Themed Components |
| **API Communication** | Axios + REST |
| **Real-time** | Socket.io-client |
| **Payments** | Stripe, Razorpay |
| **Media** | Cloudinary (images/videos) |
| **Testing** | Jest + React Native Testing Library |
| **CI/CD** | GitHub Actions |

### Key Features

1. **Onboarding Flow**: Registration, OTP, location, preferences
2. **Homepage**: Dynamic sections, recommendations, deals
3. **Product Discovery**: Search, filters, categories
4. **Shopping**: Cart, checkout, order tracking
5. **Wallet**: Coins, cashback, transactions
6. **Social**: UGC videos, reviews, follow system
7. **Gamification**: Points, achievements, challenges
8. **Subscriptions**: Premium features, trial management
9. **Offline Support**: Queue system for offline actions

---

## Day 1: Getting Started

### Morning: Environment Setup (2-3 hours)

#### 1. Prerequisites

Install these before starting:

```bash
# Node.js 18+ (LTS recommended)
node --version  # Should be v18.x or higher

# npm 9+
npm --version  # Should be 9.x or higher

# Git
git --version

# Expo CLI (global)
npm install -g expo-cli

# iOS (Mac only)
xcode-select --install  # Install Xcode Command Line Tools
# Install Xcode from App Store

# Android
# Install Android Studio with Android SDK
# Set ANDROID_HOME environment variable
```

**For detailed setup instructions, see:** [TOOLS_AND_SETUP.md](./TOOLS_AND_SETUP.md)

#### 2. Clone Repository

```bash
cd ~/projects  # Or your preferred directory
git clone https://github.com/imrejaul007/rez-app.git
cd rez-app/frontend
```

#### 3. Install Dependencies

```bash
npm install

# If you encounter issues, try:
npm ci  # Clean install from package-lock.json
```

#### 4. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values
# IMPORTANT: Get API keys from team lead or .env vault
nano .env  # or use your preferred editor
```

**Required Environment Variables:**

```env
# Backend API
EXPO_PUBLIC_API_BASE_URL=http://localhost:5001/api

# Payment Keys (Test Mode)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...

# Cloudinary (Media Uploads)
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
EXPO_PUBLIC_CLOUDINARY_UGC_PRESET=ugc_videos
```

**Get keys from:**
- Team lead's 1Password/LastPass share
- `.env.vault` (if using Dotenv Vault)
- Team Slack channel pinned messages

#### 5. Start Development Server

```bash
npm start

# This will open Expo Dev Tools in your browser
# You can scan QR code with Expo Go app (iOS/Android)
# Or press 'i' for iOS simulator, 'a' for Android emulator
```

**Verify Setup:**

```bash
# Test backend connection
npm run check:backend

# Run tests
npm test

# Lint code
npm run lint
```

### Afternoon: Code Exploration (2-3 hours)

#### 1. Project Structure Tour

Read these files in order:

1. **README.md** - Project overview
2. **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Directory structure
3. **[ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md)** - Architecture patterns
4. **app/_layout.tsx** - Root layout, context providers

#### 2. Run the App

```bash
# Start Metro bundler
npm start

# Press 'i' for iOS simulator
# or
# Press 'a' for Android emulator
```

**First App Walkthrough:**

1. Open app in simulator
2. Go through onboarding flow
3. Explore main tabs: Home, Earn, Play, Wallet, Profile
4. Open DevTools (shake device → "Debug")

#### 3. Make Your First Change

**Exercise: Add a console log to the homepage**

```typescript
// File: app/(tabs)/index.tsx

import { useEffect } from 'react';

export default function HomeScreen() {
  useEffect(() => {
    console.log('👋 Hello from [YOUR_NAME]!');
  }, []);

  // ... rest of component
}
```

Reload app (shake device → "Reload") and check console output.

#### 4. Create Your First Branch

```bash
# Follow naming convention
git checkout -b feature/onboarding-[your-name]

# Example:
git checkout -b feature/onboarding-john-doe
```

### Evening: Team Integration (1-2 hours)

#### 1. Attend Team Standup

- Introduce yourself
- Share your progress
- Ask questions

#### 2. Set Up Development Tools

Install recommended VS Code extensions:

```bash
# Extensions listed in .vscode/extensions.json
- ESLint
- Prettier
- React Native Tools
- TypeScript Hero
- GitLens
```

See: [TOOLS_AND_SETUP.md](./TOOLS_AND_SETUP.md#vs-code-setup)

#### 3. Review Active Sprint

- Check Jira/Linear board
- Understand current sprint goals
- Identify onboarding tasks assigned to you

#### 4. End of Day 1 Checklist

- [ ] Environment fully set up
- [ ] App running on simulator/emulator
- [ ] Can make code changes and see results
- [ ] Understand project structure
- [ ] Have access to team communication channels
- [ ] Know who to ask for help

---

## Day 2: Deep Dive

### Morning: Architecture & Patterns (2-3 hours)

#### 1. Study Core Concepts

Read these guides:

1. **[ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md)** - Full architecture
2. **[CODE_STANDARDS.md](./CODE_STANDARDS.md)** - Coding guidelines

#### 2. Understand Navigation

```typescript
// Navigation is file-based using Expo Router
// Files in app/ automatically become routes

app/
├── (tabs)/          # Tab navigator
│   ├── index.tsx    # Home screen → /
│   ├── earn.tsx     # Earn screen → /earn
│   └── _layout.tsx  # Tab configuration
├── product/
│   └── [id].tsx     # Dynamic route → /product/123
└── _layout.tsx      # Root layout
```

**Try navigating programmatically:**

```typescript
import { router } from 'expo-router';

// Navigate to product
router.push('/product/123');

// Go back
router.back();
```

#### 3. Explore State Management

```typescript
// We use Context API for global state

// Example: Cart Context
import { useCart } from '@/contexts/CartContext';

function MyComponent() {
  const { items, addItem, removeItem } = useCart();

  // Use cart state and actions
}
```

**Key Contexts:**
- `AuthContext` - User authentication
- `CartContext` - Shopping cart
- `WishlistContext` - Wishlist
- `ProfileContext` - User profile
- `SocketContext` - Real-time updates

#### 4. API Integration Patterns

```typescript
// All API calls go through services/

import { productsApi } from '@/services/productsApi';

async function fetchProducts() {
  try {
    const products = await productsApi.getAll();
    return products;
  } catch (error) {
    console.error('Failed to fetch products:', error);
    // Error handling
  }
}
```

### Afternoon: Common Tasks Practice (2-3 hours)

Work through tutorials in **[COMMON_TASKS.md](./COMMON_TASKS.md)**:

#### Task 1: Add a New Screen

Follow the guide to create a new screen:
- Create route file
- Add navigation
- Implement UI
- Connect to API

#### Task 2: Create a Component

Build a reusable component:
- Component structure
- TypeScript props
- Styling
- Accessibility

#### Task 3: Add an API Service

Integrate a new API endpoint:
- Create service file
- Add TypeScript types
- Error handling
- Use in component

### Evening: First Real Task (2 hours)

#### 1. Pick a Starter Task

Ask your team lead for a "good first issue":
- Bug fix
- Small feature
- UI improvement
- Documentation update

#### 2. Development Workflow

Follow the process in **[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)**:

1. Create feature branch
2. Make changes
3. Write tests
4. Run lint/tests
5. Commit with good message
6. Push and create PR
7. Address code review feedback

#### 3. Create Your First PR

```bash
# Commit your changes
git add .
git commit -m "feat: add greeting message to homepage"

# Push to remote
git push origin feature/onboarding-john-doe

# Create PR via GitHub UI
# Add description, screenshots, testing notes
```

#### 4. End of Day 2 Checklist

- [ ] Understand architecture and patterns
- [ ] Can navigate codebase confidently
- [ ] Completed practice tasks
- [ ] Created first PR
- [ ] Participated in code review
- [ ] Feel comfortable asking questions

---

## Essential Resources

### Documentation

| Document | Purpose |
|----------|---------|
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | Directory structure, file organization |
| [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md) | Architecture, patterns, decisions |
| [CODE_STANDARDS.md](./CODE_STANDARDS.md) | Coding guidelines, best practices |
| [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) | Git workflow, PR process |
| [COMMON_TASKS.md](./COMMON_TASKS.md) | Step-by-step guides for common tasks |
| [TOOLS_AND_SETUP.md](./TOOLS_AND_SETUP.md) | Development tools, IDE setup |
| [QUICK_START_CHECKLIST.md](./QUICK_START_CHECKLIST.md) | First day quick reference |

### External Resources

- **React Native Docs**: https://reactnative.dev/docs/getting-started
- **Expo Docs**: https://docs.expo.dev/
- **Expo Router**: https://expo.github.io/router/docs/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **React Hooks**: https://react.dev/reference/react

### Team Resources

- **Backend API Docs**: [Link to backend documentation]
- **Design System**: [Link to Figma/design files]
- **Component Library**: Browse `components/` directory
- **API Endpoints**: See `ALL_API_ENDPOINTS_LIST.md`

---

## Getting Help

### When You're Stuck

1. **Check Documentation**: Search this guide and related docs
2. **Search Codebase**: Use VS Code search (Cmd/Ctrl + Shift + F)
3. **Check Existing Issues**: Look for similar GitHub issues
4. **Ask Team**: Post in Slack #frontend channel
5. **Pair Program**: Schedule time with senior developer

### Who to Ask

| Question Type | Contact |
|--------------|---------|
| Environment setup | DevOps lead |
| Architecture decisions | Tech lead |
| API integration | Backend team |
| UI/UX questions | Design team |
| Testing | QA lead |
| General coding | Any senior developer |

### Common Questions

**Q: The app won't start. What should I do?**

```bash
# Clear Metro cache
npm start -- --clear

# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Clear Expo cache
expo start -c
```

**Q: I'm getting TypeScript errors. How do I fix them?**

```bash
# Check tsconfig.json
# Run TypeScript compiler
npx tsc --noEmit

# Common fix: restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

**Q: How do I debug the app?**

See [TOOLS_AND_SETUP.md](./TOOLS_AND_SETUP.md#debugging)

**Q: Tests are failing. What should I check?**

```bash
# Run tests in watch mode
npm run test:watch

# Update snapshots
npm test -- -u

# Clear Jest cache
npm test -- --clearCache
```

### Debugging Tips

1. **Use React Native Debugger**: Better than Chrome DevTools
2. **Console.log Strategically**: Add context to logs
3. **Use Breakpoints**: In VS Code or debugger
4. **Check Network Tab**: For API issues
5. **Read Error Messages**: They're usually helpful!

---

## Next Steps

After completing Days 1-2:

### Week 1
- Complete 2-3 starter issues
- Participate in sprint planning
- Attend code reviews
- Learn team processes

### Month 1
- Take on medium-complexity tasks
- Contribute to code reviews
- Improve documentation
- Mentor next new developer

### Quarter 1
- Own a feature end-to-end
- Propose architecture improvements
- Lead a small project
- Present at team demo

---

## Feedback

This onboarding guide is a living document. Please help us improve it!

**After completing onboarding:**

1. Open an issue with suggestions
2. Submit a PR with improvements
3. Share feedback in retrospective

**Common feedback areas:**
- What was confusing?
- What's missing?
- What took too long?
- What was most helpful?

---

## Congratulations!

You're now part of the Rez App team. We're excited to have you here!

Remember:
- **Ask questions** - No question is too small
- **Take breaks** - Onboarding is intense
- **Be patient** - You'll be productive soon
- **Have fun** - We build cool stuff!

Welcome aboard! 🎉

---

**Last Updated**: November 2024
**Maintained By**: Engineering Team
**Questions?** Contact your team lead or post in #frontend
