#!/bin/bash
# Detect Math.random() used for ID/key generation.
# Secure ID generation should use uuid or crypto.randomUUID().

set -e

SOURCE_DIR="${1:-src}"
COUNT=$(grep -rn --include='*.ts' --include='*.tsx' \
  -e 'Math\.random()' \
  "$SOURCE_DIR" 2>/dev/null | \
  grep -v 'node_modules' | \
  grep -v 'keyExtractor' | \
  grep -v '__DEV__' | \
  grep -v '//.*Math\.random' | \
  grep -v 'compareVersions' | \
  wc -l | tr -d ' ')

if [ "$COUNT" -gt 0 ]; then
  echo "FAIL: Found $COUNT Math.random() call(s) in $SOURCE_DIR"
  grep -rn --include='*.ts' --include='*.tsx' \
    -e 'Math\.random()' \
    "$SOURCE_DIR" 2>/dev/null | \
    grep -v 'node_modules' | \
    grep -v 'keyExtractor' | \
    grep -v '__DEV__' | \
    grep -v '//.*Math\.random' | \
    grep -v 'compareVersions' | \
    head -10
  echo ""
  echo "To fix: Use 'uuid' or 'crypto.randomUUID()' for ID generation"
  echo "Install: npm install uuid && npm install -D @types/uuid"
  exit 1
fi

echo "PASS: No Math.random() for ID generation found in $SOURCE_DIR"
exit 0
