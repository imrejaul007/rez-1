#!/bin/bash
# ===================================================================
# Pre-commit hook to prevent committing secrets
# ===================================================================
# Install: Copy to .git/hooks/pre-commit and make executable
# Or: ln -s ../../scripts/pre-commit-secrets-check.sh .git/hooks/pre-commit
# ===================================================================

echo "Running secrets check..."

# Patterns that indicate secrets
SECRET_PATTERNS=(
    "mongodb.*://.*:.*@"  # MongoDB connection strings with credentials
    "password\s*="         # password=
    "secret\s*="          # secret=
    "token\s*="           # token=
    "api_key"             # api_key
    "apikey"              # apikey
    "aws_access_key"       # AWS keys
    "BEGIN.*PRIVATE KEY"  # Private keys
)

# Files to check
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(env|json|yaml|yml|js|ts)$')

if [ -z "$FILES" ]; then
    echo "No secrets files to check."
    exit 0
fi

# Check for .env files (never commit these)
ENVS=$(echo "$FILES" | grep -E '^\.env$' | grep -v '.env.example$')
if [ -n "$ENVS" ]; then
    echo "ERROR: Attempting to commit .env file(s):"
    echo "$ENVS"
    echo ""
    echo "If this is intentional, use --no-verify to bypass this check."
    echo "WARNING: This is a security risk!"
    exit 1
fi

# Check for potential secrets in other files
for FILE in $FILES; do
    if [ -f "$FILE" ]; then
        for PATTERN in "${SECRET_PATTERNS[@]}"; do
            # Skip .env.example
            if [[ "$FILE" == *.env.example ]]; then
                continue
            fi

            # Check for the pattern (case insensitive)
            if grep -iE "$PATTERN" "$FILE" 2>/dev/null | grep -vE "(example|placeholder|change-me|todo|fixme)" > /dev/null; then
                echo "WARNING: Possible secret found in $FILE:"
                echo "  Pattern: $PATTERN"
                echo ""
                echo "If this is a false positive, use --no-verify to bypass."
                echo "Review the file and remove any real secrets before committing."
            fi
        done
    fi
done

echo "Secrets check passed."
exit 0
