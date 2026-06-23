#!/bin/bash
# Detect enum duplications that should use rez-shared/enums.
# Enum definitions must not duplicate those from rez-shared/enums/.

set -e

SOURCE_DIR="${1:-src}"
# Detect enum definitions for common shared types
# These enums should be imported from rez-shared/enums, not defined locally
COMMON_ENUMS="UserRole|LoyaltyTier|OrderStatus|PaymentStatus|TransactionType|UserType|MerchantStatus|StoreStatus|ProductStatus|CouponStatus|SubscriptionStatus|GamificationEventType|RewardType|CoinType"

COUNT=$(grep -rn --include='*.ts' --include='*.tsx' \
  -E "enum\s+(${COMMON_ENUMS})" \
  "$SOURCE_DIR" 2>/dev/null | \
  grep -v 'node_modules' | \
  grep -v 'rez-shared/enums' | \
  grep -v '@rez/rez-shared' | \
  grep -v '//.*enum' | \
  wc -l | tr -d ' ')

if [ "$COUNT" -gt 0 ]; then
  echo "FAIL: Found $COUNT bespoke enum definition(s) in $SOURCE_DIR"
  grep -rn --include='*.ts' --include='*.tsx' \
    -E "enum\s+(${COMMON_ENUMS})" \
    "$SOURCE_DIR" 2>/dev/null | \
    grep -v 'node_modules' | \
    grep -v 'rez-shared/enums' | \
    grep -v '@rez/rez-shared' | \
    head -20
  echo ""
  echo "To fix: Import enums from rez-shared/enums instead of defining locally"
  echo "Import: import { UserRole, LoyaltyTier } from '@rez/rez-shared/enums'"
  exit 1
fi

echo "PASS: No bespoke enum duplications found in $SOURCE_DIR"
exit 0
