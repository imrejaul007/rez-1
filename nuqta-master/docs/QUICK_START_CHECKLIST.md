# Quick Start Checklist

Your first day checklist - get up and running in hours, not days!

## Pre-Day 1: Before You Start

**Get from team lead** (1-2 days before):
- [ ] GitHub repository access
- [ ] Slack workspace invite
- [ ] Environment variables (.env keys)
- [ ] Figma design access (optional)
- [ ] Jira/Linear board access
- [ ] Team calendar access

---

## Day 1 Morning: Environment Setup (2-3 hours)

### Step 1: Install Prerequisites (30 mins)

- [ ] **Node.js 18+**
  ```bash
  node --version  # Should be v18.x or higher
  ```
  Download: https://nodejs.org/

- [ ] **Git**
  ```bash
  git --version
  ```

- [ ] **VS Code**
  Download: https://code.visualstudio.com/

- [ ] **Expo CLI**
  ```bash
  npm install -g expo-cli
  expo --version
  ```

### Step 2: Platform Setup (30-60 mins)

**Choose your platform:**

#### iOS (macOS only)
- [ ] Install Xcode from App Store
- [ ] Install Command Line Tools
  ```bash
  xcode-select --install
  ```
- [ ] Install CocoaPods
  ```bash
  brew install cocoapods
  ```

#### Android (All platforms)
- [ ] Install Android Studio
- [ ] Install Android SDK
- [ ] Set ANDROID_HOME environment variable
- [ ] Create AVD (Android Virtual Device)

### Step 3: Clone & Install (30 mins)

```bash
# 1. Clone repository
cd ~/projects
git clone https://github.com/imrejaul007/rez-app.git
cd rez-app/frontend

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Edit .env with your keys
# (Get keys from team lead)
nano .env
```

**Required in .env:**
- [ ] EXPO_PUBLIC_API_BASE_URL
- [ ] EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
- [ ] EXPO_PUBLIC_RAZORPAY_KEY_ID
- [ ] EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME

### Step 4: Verify Setup (15 mins)

```bash
# Test backend connection
npm run check:backend

# Run tests
npm test

# Lint code
npm run lint

# Start app
npm start
```

**Success criteria:**
- [ ] No errors during npm install
- [ ] Backend connection successful
- [ ] Tests pass
- [ ] No lint errors
- [ ] App starts without errors

---

## Day 1 Afternoon: First Run (2-3 hours)

### Step 5: Run the App (30 mins)

**Choose a method:**

#### Option A: Physical Device
- [ ] Install Expo Go app on phone
- [ ] Run `npm start`
- [ ] Scan QR code with Expo Go
- [ ] App loads on device

#### Option B: iOS Simulator (macOS)
- [ ] Run `npm run ios`
- [ ] Simulator opens
- [ ] App loads

#### Option C: Android Emulator
- [ ] Start AVD in Android Studio
- [ ] Run `npm run android`
- [ ] App loads in emulator

**Verify app works:**
- [ ] App launches successfully
- [ ] Can navigate between tabs
- [ ] Can view products
- [ ] No critical errors in console

### Step 6: Install VS Code Extensions (15 mins)

Required extensions:
- [ ] ESLint (dbaeumer.vscode-eslint)
- [ ] Prettier (esbenp.prettier-vscode)
- [ ] React Native Tools (msjsdiag.vscode-react-native)
- [ ] GitLens (eamodio.gitlens)

**Quick install:**
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension msjsdiag.vscode-react-native
code --install-extension eamodio.gitlens
```

### Step 7: Read Core Documentation (60 mins)

Read these in order:
- [ ] [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - 15 mins
- [ ] [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md) - 20 mins
- [ ] [CODE_STANDARDS.md](./CODE_STANDARDS.md) - 15 mins
- [ ] [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) - 10 mins

### Step 8: Explore Codebase (60 mins)

**Important files to review:**

- [ ] `app/_layout.tsx` - Root layout, all providers
- [ ] `app/(tabs)/index.tsx` - Homepage
- [ ] `app/(tabs)/_layout.tsx` - Tab navigation
- [ ] `contexts/AuthContext.tsx` - Authentication
- [ ] `services/apiClient.ts` - API configuration
- [ ] `config/env.ts` - Environment config

**Directory tour:**
- [ ] Browse `app/` - Screens
- [ ] Browse `components/` - UI components
- [ ] Browse `contexts/` - Global state
- [ ] Browse `services/` - API calls
- [ ] Browse `hooks/` - Custom hooks

---

## Day 1 Evening: First Change (1-2 hours)

### Step 9: Make Your First Change (30 mins)

**Exercise: Add a console log**

1. Open `app/(tabs)/index.tsx`
2. Add this inside the component:
   ```typescript
   useEffect(() => {
     console.log('👋 Hello from [YOUR_NAME]!');
   }, []);
   ```
3. Reload app (shake device → Reload)
4. Check console for your message

**Verify:**
- [ ] Console shows your message
- [ ] No errors
- [ ] App still works

### Step 10: Create Your First Branch (15 mins)

```bash
# Create feature branch
git checkout -b feature/onboarding-[your-name]

# Commit your change
git add .
git commit -m "feat: add developer greeting message"

# Push to remote
git push -u origin feature/onboarding-[your-name]
```

**Verify:**
- [ ] Branch created
- [ ] Commit successful
- [ ] Push successful
- [ ] Branch visible on GitHub

### Step 11: Team Integration (45 mins)

- [ ] Join team standup (if scheduled)
- [ ] Introduce yourself in Slack
- [ ] Add yourself to team roster
- [ ] Set up 1-on-1 with team lead
- [ ] Review current sprint board
- [ ] Ask questions!

---

## End of Day 1: Checklist

### Environment
- [ ] All tools installed
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Environment configured
- [ ] App running successfully

### Knowledge
- [ ] Understand project structure
- [ ] Read core documentation
- [ ] Know where to find things
- [ ] Understand architecture basics
- [ ] Know coding standards

### Access
- [ ] GitHub access working
- [ ] Slack access
- [ ] Sprint board access
- [ ] Environment variables
- [ ] Team calendar access

### First Contribution
- [ ] Made first code change
- [ ] Created first branch
- [ ] Made first commit
- [ ] Pushed to remote

### Team
- [ ] Introduced to team
- [ ] Know who to ask for help
- [ ] Attended standup (if scheduled)
- [ ] Have mentor/buddy assigned

---

## Day 2: Quick Tasks

### Morning (2-3 hours)

**Continue learning:**
- [ ] Read [COMMON_TASKS.md](./COMMON_TASKS.md)
- [ ] Practice common tasks
- [ ] Complete tutorial exercises
- [ ] Ask questions on anything unclear

**Try these exercises:**

1. **Create a simple component** (30 mins)
   - [ ] Create `components/ui/Greeting.tsx`
   - [ ] Add props interface
   - [ ] Use in a screen
   - [ ] Test it works

2. **Make an API call** (30 mins)
   - [ ] Use existing API service
   - [ ] Display data in component
   - [ ] Handle loading state
   - [ ] Handle errors

3. **Navigate between screens** (15 mins)
   - [ ] Use router.push()
   - [ ] Pass parameters
   - [ ] Retrieve parameters
   - [ ] Go back

### Afternoon (2-3 hours)

**Start real work:**
- [ ] Ask team lead for "good first issue"
- [ ] Create feature branch
- [ ] Implement solution
- [ ] Write tests
- [ ] Create PR

**Ideal first tasks:**
- Fix typo/copy
- Add console logs
- Improve error messages
- Update documentation
- Small UI improvement

---

## Quick Reference

### Common Commands

```bash
# Start development
npm start

# Run on platform
npm run android
npm run ios
npm run web

# Code quality
npm run lint
npm test

# Clear cache
npm start -- --clear
```

### Need Help?

| Problem | Solution |
|---------|----------|
| Environment setup | See [TOOLS_AND_SETUP.md](./TOOLS_AND_SETUP.md) |
| How to do X | See [COMMON_TASKS.md](./COMMON_TASKS.md) |
| Code standards | See [CODE_STANDARDS.md](./CODE_STANDARDS.md) |
| Git workflow | See [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) |
| Architecture question | See [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md) |
| General question | Ask in Slack #frontend |

### Key People

| Role | When to Contact |
|------|----------------|
| Team Lead | Architecture, priorities, access |
| Senior Dev | Technical questions, code review |
| DevOps | Environment, deployment, CI/CD |
| Design | UI/UX questions, designs |
| QA | Testing, bug reports |

---

## Troubleshooting

### App won't start

```bash
# Try these in order:
npm start -- --clear
rm -rf node_modules && npm install
npx expo start -c
```

### TypeScript errors

```bash
# Restart TS server in VS Code:
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Git issues

```bash
# Check status
git status

# Discard changes
git checkout .

# Start fresh from master
git checkout master
git pull origin master
git checkout -b new-branch
```

### Backend not connecting

- [ ] Check .env has correct API_BASE_URL
- [ ] Verify backend is running
- [ ] Check network (WiFi)
- [ ] Try `npm run check:backend`

---

## Success Metrics

### By End of Day 1
- ✅ Environment fully working
- ✅ Can run app on device/simulator
- ✅ Made first code change
- ✅ Created first branch
- ✅ Understand project basics

### By End of Week 1
- ✅ Completed 2-3 small tasks
- ✅ Created first PR
- ✅ Participated in code reviews
- ✅ Comfortable with codebase
- ✅ Know team processes

### By End of Month 1
- ✅ Completed medium-sized feature
- ✅ Contributing to code reviews
- ✅ Comfortable with architecture
- ✅ Know team well
- ✅ Productive team member

---

## Final Tips

### Do's
- ✅ Ask questions early and often
- ✅ Read documentation first
- ✅ Make small, focused commits
- ✅ Test your changes
- ✅ Participate in code reviews
- ✅ Take breaks
- ✅ Pair program when possible

### Don'ts
- ❌ Commit directly to master
- ❌ Skip testing
- ❌ Copy-paste without understanding
- ❌ Ignore lint/TS errors
- ❌ Work in isolation
- ❌ Be afraid to ask questions

---

## Congratulations!

You're now set up and ready to contribute. Welcome to the team! 🎉

**Next Steps:**
1. Complete Day 1 checklist
2. Attend team standup
3. Pick up first task
4. Have fun coding!

**Questions?** Ask in Slack #frontend or contact your team lead.

---

**Last Updated**: November 2024
**Maintained By**: Engineering Team
