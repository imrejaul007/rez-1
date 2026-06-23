#!/bin/bash
# ============================================================
# PRE-PUSH HOOK SETUP — Run once on each developer machine
# ============================================================
# Usage: bash install-pre-push-hooks.sh
#
# Blocks: git push origin main/master/production
# Allows: git push origin HEAD (feature branches)
#

BASE="/Users/rejaulkarim/Documents/ReZ Full App"

REPOS=(
  "$BASE/rezadmin"
  "$BASE/rezmerchant"
  "$BASE/rezbackend/rez-backend-master"
  "$BASE/rez-app-consumer"
  "$BASE/rez-order-service"
  "$BASE/rez-payment-service"
  "$BASE/rez-catalog-service"
  "$BASE/rez-ads-service"
  "$BASE/rez-api-gateway"
  "$BASE/rez-auth-service"
  "$BASE/rez-finance-service"
  "$BASE/rez-gamification-service"
  "$BASE/rez-marketing-service"
  "$BASE/rez-merchant-service"
  "$BASE/rez-notification-events"
  "$BASE/rez-order-service"
  "$BASE/rez-search-service"
  "$BASE/rez-shared"
  "$BASE/rez-wallet-service"
  "$BASE/rez-web-menu"
  "$BASE/rez-karma-service"
  "$BASE/rez-media-events"
  "$BASE/rez-now"
)

echo "Installing pre-push hooks on $((${#REPOS[@]})) repos..."
echo ""

for repo in "${REPOS[@]}"; do
  hook="$repo/.git/hooks/pre-push"
  if [ -d "$repo/.git" ]; then
    mkdir -p "$repo/.git/hooks"
    cat > "$hook" << 'HOOK'
#!/bin/sh
# BLOCK direct push to main/production/master
# Use: git checkout -b fix/xyz && git push origin HEAD
while read _ _ _ remote_ref _; do
  case "$remote_ref" in
    refs/heads/main|refs/heads/production|refs/heads/master)
      echo ""
      echo "==========================================="
      echo "  BLOCKED: Direct push to $remote_ref"
      echo ""
      echo "  Use feature branch workflow:"
      echo "  1. git checkout -b fix/my-fix"
      echo "  2. git add . && git commit"
      echo "  3. git push origin HEAD"
      echo "  4. Open PR on GitHub → Merge"
      echo "==========================================="
      exit 1 ;;
  esac
done
HOOK
    chmod +x "$hook"
    repo_name=$(basename "$repo" | sed 's/.*\///')
    echo "✓ $repo_name"
  else
    echo "✗ not found: $repo"
  fi
done

echo ""
echo "Done! Direct pushes to main/master/production are now blocked."
echo "Emergency bypass (never use unless critical): git push --no-verify origin HEAD"
