# REZ Developer Workflow Guide

## PR-Based Development (Required)

Direct pushes to `main` are blocked on all repos. All code changes go through Pull Requests.

---

## Setup (One Time)

### 1. Install Pre-Push Hooks

If your repos are in a different location, edit the `BASE` path first:

```bash
# Clone or copy this script to your machine
# Edit BASE path in the script if needed, then run:
bash scripts/install-pre-push-hooks.sh
```

### 2. Verify Hook Is Working

```bash
cd rezadmin
git push origin main
# Should see: BLOCKED: Direct push to refs/heads/main
```

---

## Normal Feature/Bug Fix Workflow

```bash
# 1. Start from main (always)
git checkout main
git pull origin main

# 2. Create a feature branch
git checkout -b fix/my-bug-fix

# 3. Make your code changes
# ... edit files ...

# 4. Commit your changes
git add .
git commit -m "fix(orders): add idempotency key to refund"

# 5. Push to your feature branch
git push origin HEAD

# 6. Open PR on GitHub
gh pr create --title "fix: my bug fix" --body "Describe what was fixed"

# 7. Merge on GitHub web interface
# Or via CLI:
gh pr merge 123 --squash --delete-branch
```

---

## Emergency Hotfix (Bypass)

```bash
# ONLY if site is down or critical — creates PR AFTER
git push --no-verify origin HEAD
gh pr create --title "hotfix: critical fix"
# Fast-track review and merge
```

---

## Daily Workflow

```bash
# Every morning
git checkout main
git pull origin main
git checkout -b feature/my-work

# ... work all day ...

# End of day
git add .
git commit -m "wip: progress on feature"
git push origin HEAD
```

---

## Commit Message Format

```
type(scope): short description

Types:   fix | feat | refactor | chore | docs | test | style
Scope:   admin | merchant | auth | payment | orders | wallet | etc.
```

**Examples:**
```
fix(orders): add idempotency key to refund
feat(wallet): add coin balance display
refactor(auth): normalize phone format
chore: update dependencies
fix(payment): prevent double-credit on concurrent requests
```

---

## If Hook Blocks You

You tried:
```bash
git push origin main  # BLOCKED
```

Do this instead:
```bash
git checkout -b fix/my-fix     # Create branch
git push origin HEAD          # Push feature branch
# Open PR on GitHub → Merge
```

---

## Commit Message Format (Emoji Optional)

```
fix(scope): description
feat(scope): description
refactor(scope): description
chore(scope): description
```

Common scopes: `admin`, `merchant`, `auth`, `orders`, `payment`, `wallet`, `consumer`, `api`, `db`, `ci`

---

## Repo List (All 23 Repos)

```
rezadmin              — Admin dashboard
rezmerchant           — Merchant app
rez-backend           — Main backend
rez-app-consumer      — Consumer app
rez-order-service     — Order microservice
rez-payment-service   — Payment microservice
rez-catalog-service   — Catalog microservice
rez-ads-service      — Ads microservice
rez-api-gateway      — API gateway
rez-auth-service      — Auth microservice
rez-finance-service   — Finance microservice
rez-gamification-service — Gamification microservice
rez-marketing-service — Marketing microservice
rez-merchant-service  — Merchant microservice
rez-notification-events — Notification microservice
rez-order-service     — Order microservice
rez-search-service    — Search microservice
rez-shared           — Shared packages
rez-wallet-service   — Wallet microservice
rez-web-menu         — Web menu
rez-karma-service    — Karma microservice
rez-media-events     — Media events microservice
rez-now              — REZ Now platform
```

---

## Troubleshooting

**Hook not working?**
```bash
ls .git/hooks/pre-push
# If missing:
bash scripts/install-pre-push-hooks.sh
```

**Can't remember branch name?**
```bash
git branch -a | grep your-name
```

**Merge conflict with main?**
```bash
git fetch origin
git merge origin/main
# Resolve conflicts, then:
git add .
git commit
git push origin HEAD
```
