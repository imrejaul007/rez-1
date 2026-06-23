#!/bin/bash

# ===================================
# MongoDB Backup Script
# ===================================
# This script creates backups of MongoDB database and uploads to S3
# Usage: ./backup.sh [database_name]

set -e  # Exit on error

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DATABASE_NAME="${1:-rez}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-rez-backups}"
S3_PREFIX="${S3_PREFIX:-mongodb}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v mongodump &> /dev/null; then
        log_error "mongodump not found. Please install MongoDB tools."
        exit 1
    fi

    if ! command -v aws &> /dev/null; then
        log_warn "AWS CLI not found. S3 upload will be skipped."
    fi

    if [ -z "$MONGODB_URI" ]; then
        log_error "MONGODB_URI environment variable not set."
        exit 1
    fi
}

# Create backup directory
create_backup_dir() {
    BACKUP_PATH="$BACKUP_DIR/mongodb_${DATABASE_NAME}_$TIMESTAMP"
    mkdir -p "$BACKUP_PATH"
    log_info "Created backup directory: $BACKUP_PATH"
}

# Perform MongoDB dump
perform_backup() {
    log_info "Starting MongoDB backup for database: $DATABASE_NAME"

    mongodump \
        --uri="$MONGODB_URI" \
        --db="$DATABASE_NAME" \
        --out="$BACKUP_PATH" \
        --gzip \
        2>&1 | tee "$BACKUP_PATH/backup.log"

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log_info "MongoDB dump completed successfully"
    else
        log_error "MongoDB dump failed"
        exit 1
    fi
}

# Compress backup
compress_backup() {
    log_info "Compressing backup..."

    ARCHIVE_NAME="mongodb_${DATABASE_NAME}_$TIMESTAMP.tar.gz"
    tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" -C "$BACKUP_DIR" "mongodb_${DATABASE_NAME}_$TIMESTAMP"

    # Remove uncompressed backup
    rm -rf "$BACKUP_PATH"

    log_info "Backup compressed: $ARCHIVE_NAME"
    echo "$BACKUP_DIR/$ARCHIVE_NAME"
}

# Upload to S3
upload_to_s3() {
    local archive_file="$1"

    if command -v aws &> /dev/null; then
        log_info "Uploading backup to S3..."

        aws s3 cp \
            "$archive_file" \
            "s3://$S3_BUCKET/$S3_PREFIX/" \
            --storage-class STANDARD_IA

        if [ $? -eq 0 ]; then
            log_info "Backup uploaded to S3: s3://$S3_BUCKET/$S3_PREFIX/$(basename $archive_file)"
        else
            log_error "Failed to upload backup to S3"
        fi
    else
        log_warn "Skipping S3 upload (AWS CLI not available)"
    fi
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."

    # Clean local backups
    find "$BACKUP_DIR" -name "mongodb_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

    # Clean S3 backups
    if command -v aws &> /dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)

        aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" | \
        while read -r line; do
            create_date=$(echo $line | awk '{print $1}')
            file_name=$(echo $line | awk '{print $4}')

            if [[ "$create_date" < "$cutoff_date" ]]; then
                aws s3 rm "s3://$S3_BUCKET/$S3_PREFIX/$file_name"
                log_info "Deleted old S3 backup: $file_name"
            fi
        done
    fi

    log_info "Cleanup completed"
}

# Calculate backup size
calculate_backup_size() {
    local archive_file="$1"
    local size=$(du -h "$archive_file" | cut -f1)
    log_info "Backup size: $size"
}

# Send notification (optional)
send_notification() {
    local status="$1"
    local message="$2"

    # Add your notification logic here
    # Examples: Slack webhook, email, PagerDuty, etc.

    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"Backup $status: $message\"}"
    fi
}

# Main execution
main() {
    log_info "==================================="
    log_info "MongoDB Backup Started"
    log_info "==================================="
    log_info "Timestamp: $TIMESTAMP"
    log_info "Database: $DATABASE_NAME"

    check_prerequisites
    create_backup_dir
    perform_backup

    ARCHIVE_FILE=$(compress_backup)
    calculate_backup_size "$ARCHIVE_FILE"

    upload_to_s3 "$ARCHIVE_FILE"
    cleanup_old_backups

    log_info "==================================="
    log_info "Backup completed successfully!"
    log_info "==================================="

    send_notification "SUCCESS" "Backup completed for $DATABASE_NAME"
}

# Run main function
main "$@"
