# Tools and Environment Setup

Complete guide to setting up your development environment and tools.

## Table of Contents

- [System Requirements](#system-requirements)
- [Required Tools](#required-tools)
- [IDE Setup](#ide-setup)
- [Platform Setup](#platform-setup)
- [Environment Configuration](#environment-configuration)
- [Development Tools](#development-tools)
- [Debugging Tools](#debugging-tools)
- [Testing Tools](#testing-tools)
- [Troubleshooting](#troubleshooting)

---

## System Requirements

### Hardware Requirements

**Minimum**:
- CPU: Intel i5 or equivalent
- RAM: 8GB
- Storage: 20GB free space

**Recommended**:
- CPU: Intel i7/M1 or better
- RAM: 16GB+
- Storage: 50GB+ SSD

### Operating Systems

- **macOS**: 12.0 (Monterey) or later (required for iOS development)
- **Windows**: 10/11 (64-bit)
- **Linux**: Ubuntu 20.04+ or equivalent

---

## Required Tools

### 1. Node.js and npm

**Install Node.js 18+ (LTS)**:

```bash
# Check version
node --version  # Should be v18.x or higher
npm --version   # Should be 9.x or higher

# Install via official installer
# Download from: https://nodejs.org/

# Or use nvm (recommended)
# macOS/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Windows (use nvm-windows)
# Download from: https://github.com/coreybutler/nvm-windows/releases
nvm install 18
nvm use 18
```

### 2. Git

```bash
# Check version
git --version

# Install
# macOS: Install Xcode Command Line Tools
xcode-select --install

# Windows: Download from https://git-scm.com/
# Linux (Ubuntu/Debian)
sudo apt-get install git
```

**Configure Git**:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name
git config --global init.defaultBranch master

# Set default editor (optional)
git config --global core.editor "code --wait"
```

### 3. Expo CLI

```bash
# Install globally
npm install -g expo-cli

# Verify installation
expo --version
```

### 4. Watchman (macOS/Linux)

Improves file watching performance:

```bash
# macOS (Homebrew)
brew install watchman

# Linux (Ubuntu/Debian)
sudo apt-get install watchman
```

---

## IDE Setup

### Visual Studio Code (Recommended)

**Download**: https://code.visualstudio.com/

#### Required Extensions

Install these extensions:

```bash
# Install via command line
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension msjsdiag.vscode-react-native
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension eamodio.gitlens
code --install-extension formulahendry.auto-rename-tag
code --install-extension christian-kohler.path-intellisense
```

**Or install via UI**:

1. **ESLint** (dbaeumer.vscode-eslint)
   - JavaScript/TypeScript linting

2. **Prettier** (esbenp.prettier-vscode)
   - Code formatting

3. **React Native Tools** (msjsdiag.vscode-react-native)
   - React Native development support

4. **TypeScript Hero** (rbbit.typescript-hero)
   - Auto-import and organization

5. **GitLens** (eamodio.gitlens)
   - Enhanced Git integration

6. **Auto Rename Tag** (formulahendry.auto-rename-tag)
   - Rename paired JSX tags

7. **Path Intellisense** (christian-kohler.path-intellisense)
   - Auto-complete file paths

8. **Error Lens** (usernamehw.errorlens)
   - Inline error display

#### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

#### Keyboard Shortcuts

**Useful shortcuts**:

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Command Palette | Cmd+Shift+P | Ctrl+Shift+P |
| Quick Open File | Cmd+P | Ctrl+P |
| Search in Files | Cmd+Shift+F | Ctrl+Shift+F |
| Toggle Terminal | Ctrl+` | Ctrl+` |
| Format Document | Shift+Alt+F | Shift+Alt+F |
| Go to Definition | F12 | F12 |
| Find All References | Shift+F12 | Shift+F12 |

---

## Platform Setup

### iOS (macOS only)

#### 1. Install Xcode

```bash
# Install Xcode from App Store
# Or download from: https://developer.apple.com/xcode/

# Install Command Line Tools
xcode-select --install

# Accept license
sudo xcodebuild -license accept
```

#### 2. Install CocoaPods

```bash
# Using Homebrew (recommended)
brew install cocoapods

# Or using Ruby gem
sudo gem install cocoapods

# Verify
pod --version
```

#### 3. Install iOS Simulator

1. Open Xcode
2. Go to: Xcode → Preferences → Components
3. Download desired iOS Simulator versions

#### 4. Test iOS Setup

```bash
# Start iOS simulator
npm run ios

# Or specific simulator
npx expo start --ios
# Press 'i' to open iOS simulator
```

---

### Android

#### 1. Install Java Development Kit (JDK)

```bash
# macOS
brew install openjdk@11

# Windows: Download from Oracle or use OpenJDK
# https://adoptium.net/

# Linux
sudo apt-get install openjdk-11-jdk

# Verify
java -version
```

#### 2. Install Android Studio

**Download**: https://developer.android.com/studio

**Setup Steps**:

1. Run Android Studio installer
2. Follow setup wizard
3. Install these components:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)

#### 3. Configure Environment Variables

**macOS/Linux** - Add to `~/.bash_profile` or `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

**Windows** - Add to Environment Variables:

```
ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
Path=%Path%;%ANDROID_HOME%\platform-tools
Path=%Path%;%ANDROID_HOME%\emulator
```

#### 4. Create Android Virtual Device (AVD)

1. Open Android Studio
2. Go to: Tools → AVD Manager
3. Click "Create Virtual Device"
4. Select device (e.g., Pixel 5)
5. Select system image (e.g., Android 12)
6. Click "Finish"

#### 5. Test Android Setup

```bash
# Start Android emulator
npm run android

# Or
npx expo start --android
# Press 'a' to open Android emulator
```

---

## Environment Configuration

### 1. Clone Repository

```bash
cd ~/projects  # Or your preferred directory
git clone https://github.com/imrejaul007/rez-app.git
cd rez-app/frontend
```

### 2. Install Dependencies

```bash
npm install

# If you encounter issues
npm ci  # Clean install from lock file
```

### 3. Configure Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit .env with your values
nano .env  # or use your preferred editor
```

**Required Variables**:

```env
# Backend API
EXPO_PUBLIC_API_BASE_URL=http://localhost:5001/api

# Payments (Test Keys)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY

# Cloudinary
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
EXPO_PUBLIC_CLOUDINARY_UGC_PRESET=ugc_videos
EXPO_PUBLIC_CLOUDINARY_PROFILE_PRESET=profile_images
```

**Get Keys From**:
- Team lead or senior developer
- Team password manager (1Password/LastPass)
- `.env.vault` if using Dotenv Vault

### 4. Verify Setup

```bash
# Test backend connection
npm run check:backend

# Run tests
npm test

# Lint code
npm run lint
```

---

## Development Tools

### Expo Dev Tools

**Start development server**:

```bash
npm start

# With cache clearing
npm start -- --clear
```

**Dev Tools Interface**:
- Opens in browser at http://localhost:19002
- QR code for mobile testing
- Device logs
- Network inspector

### Expo Go App (Mobile Testing)

**Install on Device**:
- iOS: Download from App Store
- Android: Download from Google Play

**Usage**:
1. Open Expo Go app
2. Scan QR code from terminal
3. App loads on device

---

## Debugging Tools

### React Native Debugger

**Install**:

```bash
# macOS
brew install --cask react-native-debugger

# Windows/Linux
# Download from: https://github.com/jhen0409/react-native-debugger/releases
```

**Usage**:

1. Start React Native Debugger
2. In app: Shake device → "Debug"
3. Debugger connects automatically

**Features**:
- Redux DevTools
- Network inspector
- Element inspector
- Console logs

### Flipper (Facebook's Debugger)

**Install**: https://fbflipper.com/

**Features**:
- Layout inspector
- Network inspector
- Database viewer
- Crash reporter
- Performance monitor

### Chrome DevTools

**Enable**:

1. In app: Shake device
2. Select "Debug"
3. Opens Chrome debugger

**Features**:
- Console
- Sources (breakpoints)
- Network
- Performance

---

## Testing Tools

### Jest (Unit Testing)

Already configured in project:

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### React Native Testing Library

For component testing:

```typescript
import { render, fireEvent } from '@testing-library/react-native';

test('button click', () => {
  const onPress = jest.fn();
  const { getByText } = render(<Button onPress={onPress} title="Click" />);

  fireEvent.press(getByText('Click'));
  expect(onPress).toHaveBeenCalled();
});
```

### Detox (E2E Testing)

If configured:

```bash
# Build test app
npm run test:e2e:build:ios
npm run test:e2e:build:android

# Run E2E tests
npm run test:e2e
npm run test:e2e:android
```

---

## Useful Commands Cheat Sheet

```bash
# Development
npm start                    # Start development server
npm start -- --clear         # Start with cache clear
npm run android              # Run on Android
npm run ios                  # Run on iOS
npm run web                  # Run on web

# Code Quality
npm run lint                 # Run ESLint
npm run lint -- --fix        # Fix linting issues
npx tsc --noEmit            # Check TypeScript

# Testing
npm test                     # Run tests
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report

# Dependencies
npm install                  # Install dependencies
npm ci                       # Clean install
npm outdated                 # Check outdated packages
npm update                   # Update packages

# Expo
expo start                   # Start Expo
expo start -c                # Clear cache
expo doctor                  # Check setup
expo upgrade                 # Upgrade Expo

# Git
git status                   # Check status
git branch                   # List branches
git log --oneline           # View commits
git pull origin master      # Pull latest
```

---

## Troubleshooting

### Common Issues

#### Metro Bundler Won't Start

```bash
# Clear Metro cache
npx react-native start --reset-cache

# Or
npm start -- --clear

# Clear watchman
watchman watch-del-all
```

#### "Unable to resolve module"

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm start -- --clear
```

#### "Command not found: expo"

```bash
# Reinstall Expo CLI globally
npm install -g expo-cli

# Or use npx
npx expo start
```

#### iOS Build Fails

```bash
# Clean build
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..

# Or
npx expo run:ios --clean
```

#### Android Build Fails

```bash
# Clean Gradle cache
cd android
./gradlew clean
cd ..

# Or
npx expo run:android --clean
```

#### TypeScript Errors in IDE

```bash
# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or check tsconfig.json
npx tsc --noEmit
```

---

## Getting Help

### Official Documentation

- **React Native**: https://reactnative.dev/docs/getting-started
- **Expo**: https://docs.expo.dev/
- **Expo Router**: https://expo.github.io/router/docs/
- **TypeScript**: https://www.typescriptlang.org/docs/

### Community Resources

- **Stack Overflow**: Tag `react-native`, `expo`
- **GitHub Issues**: Project repository
- **Discord**: Expo and React Native servers
- **Reddit**: r/reactnative

### Team Resources

- **Slack**: #frontend channel
- **Wiki**: Internal documentation
- **Team Lead**: For access and keys
- **DevOps**: For environment issues

---

**Last Updated**: November 2024
**Questions?** Check [DEVELOPER_ONBOARDING.md](./DEVELOPER_ONBOARDING.md)
