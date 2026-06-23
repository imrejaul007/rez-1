#!/bin/bash

# MongoDB Backup Script
# Creates automated backups with retention policy

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
DATABASE_NAME="${DATABASE_NAME:-rezapp}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DATABASE_NAME}_${TIMESTAMP}.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backup..."
echo "Database: $DATABASE_NAME"
echo "Backup file: $BACKUP_FILE"

# Extract connection details from URI if needed
if [[ $MONGODB_URI == mongodb://* ]]; then
    # Parse MongoDB URI
    HOST_PORT=$(echo $MONGODB_URI | sed 's|mongodb://||' | cut -d'/' -f1)
    HOST=$(echo $HOST_PORT | cut -d':' -f1)
    PORT=$(echo $HOST_PORT | cut -d':' -f2)
    PORT=${PORT:-27017}
    
    # Extract credentials if present
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

# Create backup using mongodump
if command -v mongodump &> /dev/null; then
    echo "📦 Creating MongoDB backup..."
    mongodump \
        --host "$HOST:$PORT" \
        $AUTH_PARAMS \
        --db "$DATABASE_NAME" \
        --out "$BACKUP_DIR/temp_backup_${TIMESTAMP}" \
        --gzip
    
    # Compress backup
    echo "🗜️  Compressing backup..."
    tar -czf "$BACKUP_FILE" -C "$BACKUP_DIR" "temp_backup_${TIMESTAMP}"
    
    # Remove temporary directory
    rm -rf "$BACKUP_DIR/temp_backup_${TIMESTAMP}"
    
    echo "✅ Backup created: $BACKUP_FILE"
else
    echo "❌ Error: mongodump not found. Please install MongoDB tools."
    exit 1
fi

# Verify backup file exists and has content
if [ ! -f "$BACKUP_FILE" ] || [ ! -s "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file is empty or missing!"
    exit 1
fi

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "📊 Backup size: $BACKUP_SIZE"

# Clean up old backups
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "backup_${DATABASE_NAME}_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
echo "✅ Old backups cleaned up"

# List remaining backups
echo "📋 Remaining backups:"
ls -lh "$BACKUP_DIR"/backup_${DATABASE_NAME}_*.tar.gz 2>/dev/null | tail -5 || echo "No backups found"

# Optional: Upload to cloud storage (S3, etc.)
if [ -n "$S3_BUCKET" ]; then
    echo "☁️  Uploading to S3..."
    if command -v aws &> /dev/null; then
        aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/" || echo "⚠️  S3 upload failed, but backup is saved locally"
    else
        echo "⚠️  AWS CLI not found, skipping S3 upload"
    fi
fi

echo "✅ Backup completed successfully!"
echo "📁 Backup location: $BACKUP_FILE"

