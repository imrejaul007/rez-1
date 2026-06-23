#!/bin/bash

# ===================================
# MongoDB Restore Script
# ===================================
# This script restores MongoDB database from backup
# Usage: ./restore.sh <backup_file> [database_name]

set -e

# Configuration
BACKUP_FILE="$1"
DATABASE_NAME="${2:-rez}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if backup file provided
if [ -z "$BACKUP_FILE" ]; then
    log_error "Usage: ./restore.sh <backup_file> [database_name]"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check prerequisites
if ! command -v mongorestore &> /dev/null; then
    log_error "mongorestore not found. Please install MongoDB tools."
    exit 1
fi

if [ -z "$MONGODB_URI" ]; then
    log_error "MONGODB_URI environment variable not set."
    exit 1
fi

log_info "==================================="
log_info "MongoDB Restore"
log_info "==================================="
log_info "Backup file: $BACKUP_FILE"
log_info "Database: $DATABASE_NAME"

# Extract backup
TEMP_DIR=$(mktemp -d)
log_info "Extracting backup to: $TEMP_DIR"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find the backup directory
BACKUP_DIR=$(find "$TEMP_DIR" -type d -name "mongodb_*" | head -n 1)

if [ -z "$BACKUP_DIR" ]; then
    log_error "Could not find backup directory in archive"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Confirm restore
log_warn "WARNING: This will replace the current database!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log_info "Restore cancelled"
    rm -rf "$TEMP_DIR"
    exit 0
fi

# Perform restore
log_info "Starting restore..."

mongorestore \
    --uri="$MONGODB_URI" \
    --db="$DATABASE_NAME" \
    --gzip \
    --drop \
    "$BACKUP_DIR/$DATABASE_NAME"

if [ $? -eq 0 ]; then
    log_info "Restore completed successfully"
else
    log_error "Restore failed"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Cleanup
rm -rf "$TEMP_DIR"
log_info "Cleanup completed"

log_info "==================================="
log_info "Restore finished successfully!"
log_info "==================================="
