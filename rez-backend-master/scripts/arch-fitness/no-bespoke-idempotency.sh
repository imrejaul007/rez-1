#!/bin/bash
# Detect bespoke idempotency implementations that should use rez-shared/idempotency.
# Services must use the centralized idempotency utility from rez-shared/idempotency.

set -e

SOURCE_DIR="${1:-src}"
# Detect patterns indicating bespoke idempotency:
# - idempotencyKey variables/parameters
# - setNX / SETNX / SET ... NX patterns
# - custom idempotency table/file checks
COUNT=$(grep -rn --include='*.ts' --include='*.tsx' \
  -e 'idempotencyKey' \
  -e 'setNX' \
  -e 'SETNX' \
  -e 'SET.*NX' \
  "$SOURCE_DIR" 2>/dev/null | \
  grep -v 'node_modules' | \
  grep -v 'rez-shared/idempotency' | \
  grep -v '@rez/rez-shared/idempotency' | \
  grep -v '//.*idempotency' | \
  grep -v 'import.*from.*idempotency' | \
  grep -v 'key.*idempotency' | \
  wc -l | tr -d ' ')

# Also check for inline Redis NX usage which duplicates the shared module
COUNT_NX=$(grep -rn --include='*.ts' --include='*.tsx' \
  -e '\.set.*NX' \
  -e '\.setnx' \
  "$SOURCE_DIR" 2>/dev/null | \
  grep -v 'node_modules' | \
  grep -v 'idempotency' | \
  wc -l | tr -d ' ')

TOTAL=$((COUNT + COUNT_NX))

if [ "$TOTAL" -gt 0 ]; then
  echo "FAIL: Found $TOTAL bespoke idempotency pattern(s) in $SOURCE_DIR"
  echo "Bespoke idempotency implementations detected (idempotencyKey, setNX, etc.)."
  echo "To fix: Use rez-shared/idempotency module instead of custom implementations"
  echo "Import: import { idempotency } from '@rez/rez-shared/idempotency'"
  exit 1
fi

echo "PASS: No bespoke idempotency patterns found in $SOURCE_DIR"
exit 0
