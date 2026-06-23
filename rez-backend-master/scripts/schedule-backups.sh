#!/bin/bash

# Schedule Automated Backups
# Sets up cron job for daily backups

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-database.sh"

# Check if running on Windows (Git Bash)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    echo "⚠️  Windows detected. Cron is not available."
    echo "Please use Windows Task Scheduler instead."
    echo ""
    echo "Task Scheduler Configuration:"
    echo "  - Program: $BACKUP_SCRIPT"
    echo "  - Schedule: Daily at 2:00 AM"
    echo "  - Working Directory: $SCRIPT_DIR"
    exit 0
fi

# Check if cron is available
if ! command -v crontab &> /dev/null; then
    echo "❌ Error: crontab not found. Please install cron."
    exit 1
fi

# Create cron job (runs daily at 2:00 AM)
CRON_JOB="0 2 * * * cd $SCRIPT_DIR && $BACKUP_SCRIPT >> $SCRIPT_DIR/../logs/backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo "⚠️  Backup cron job already exists"
    read -p "Do you want to update it? (yes/no): " UPDATE
    if [ "$UPDATE" == "yes" ]; then
        # Remove existing job
        crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
        # Add new job
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        echo "✅ Backup cron job updated"
    else
        echo "❌ Update cancelled"
        exit 0
    fi
else
    # Add new cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Backup cron job scheduled (daily at 2:00 AM)"
fi

# Show current cron jobs
echo ""
echo "📋 Current cron jobs:"
crontab -l | grep -E "(backup|BACKUP)" || echo "No backup jobs found"

echo ""
echo "✅ Backup scheduling complete!"
echo "📝 Backup logs will be written to: $SCRIPT_DIR/../logs/backup.log"

