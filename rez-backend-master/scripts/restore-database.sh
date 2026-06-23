#!/bin/bash

# MongoDB Restore Script
# Restores database from backup file

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
DATABASE_NAME="${DATABASE_NAME:-rezapp}"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "❌ Error: Backup file not specified"
    echo "Usage: $0 <backup_file.tar.gz> [--drop]"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/backup_${DATABASE_NAME}_*.tar.gz 2>/dev/null | tail -10 || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"
DROP_COLLECTIONS="${2:-}"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    # Try to find in backup directory
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    else
        echo "❌ Error: Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

echo "🔄 Starting database restore..."
echo "Database: $DATABASE_NAME"
echo "Backup file: $BACKUP_FILE"

# Extract connection details
if [[ $MONGODB_URI == mongodb://* ]]; then
    HOST_PORT=$(echo $MONGODB_URI | sed 's|mongodb://||' | cut -d'/' -f1)
    HOST=$(echo $HOST_PORT | cut -d':' -f1)
    PORT=$(echo $HOST_PORT | cut -d':' -f2)
    PORT=${PORT:-27017}
    
    if [[ $MONGODB_URI == *"@"* ]]; then
        CREDENTIALS=$(echo $MONGODB_URI | sed 's|mongodb://||' | cut -d'@' -f1)
        USERNAME=$(echo $CREDENTIALS | cut -d':' -f1)
        PASSWORD=$(echo $CREDENTIALS | cut -d':' -f2)
        AUTH_PARAMS="--username $USERNAME --password $PASSWORD --authenticationDatabase admin"
    else
        AUTH_PARAMS=""
    fi
else
    HOST="localhost"
    PORT="27017"
    AUTH_PARAMS=""
fi

# Extract backup
TEMP_DIR=$(mktemp -d)
echo "📦 Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find the extracted backup directory
EXTRACTED_DIR=$(find "$TEMP_DIR" -type d -name "$DATABASE_NAME" | head -1)
if [ -z "$EXTRACTED_DIR" ]; then
    # Try to find any directory
    EXTRACTED_DIR=$(find "$TEMP_DIR" -type d -mindepth 1 -maxdepth 1 | head -1)
fi

if [ -z "$EXTRACTED_DIR" ]; then
    echo "❌ Error: Could not find extracted backup directory"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Confirm restore
echo "⚠️  WARNING: This will restore data to database: $DATABASE_NAME"
if [ "$DROP_COLLECTIONS" != "--drop" ]; then
    echo "⚠️  Existing data will be merged (use --drop to replace)"
fi
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Restore using mongorestore
if command -v mongorestore &> /dev/null; then
    echo "📥 Restoring database..."
    RESTORE_PARAMS="--host $HOST:$PORT $AUTH_PARAMS --db $DATABASE_NAME"
    
    if [ "$DROP_COLLECTIONS" == "--drop" ]; then
        RESTORE_PARAMS="$RESTORE_PARAMS --drop"
    fi
    
    mongorestore $RESTORE_PARAMS "$EXTRACTED_DIR"
    
    echo "✅ Database restored successfully!"
else
    echo "❌ Error: mongorestore not found. Please install MongoDB tools."
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Restore completed!"

