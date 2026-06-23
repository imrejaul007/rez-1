# Automated Backups Guide

## Overview

Automated backup system for MongoDB with retention policy and optional cloud storage.

---

## Scripts

### 1. `backup-database.sh`
Creates a compressed backup of the MongoDB database.

**Usage:**
```bash
./scripts/backup-database.sh
```

**Environment Variables:**
- `BACKUP_DIR` - Backup directory (default: `./backups`)
- `RETENTION_DAYS` - Days to keep backups (default: 7)
- `MONGODB_URI` - MongoDB connection URI
- `DATABASE_NAME` - Database name (default: `rezapp`)
- `S3_BUCKET` - Optional S3 bucket for cloud storage

**Features:**
- ✅ Compressed backups (tar.gz)
- ✅ Automatic cleanup of old backups
- ✅ Optional S3 upload
- ✅ Backup verification
- ✅ Timestamped filenames

---

### 2. `restore-database.sh`
Restores database from a backup file.

**Usage:**
```bash
./scripts/restore-database.sh <backup_file.tar.gz> [--drop]
```

**Options:**
- `--drop` - Drop existing collections before restore

**Example:**
```bash
# Restore without dropping existing data
./scripts/restore-database.sh backups/backup_rezapp_20250101_020000.tar.gz

# Restore and replace existing data
./scripts/restore-database.sh backups/backup_rezapp_20250101_020000.tar.gz --drop
```

---

### 3. `schedule-backups.sh`
Sets up automated daily backups using cron (Linux/Mac) or provides instructions for Windows Task Scheduler.

**Usage:**
```bash
./scripts/schedule-backups.sh
```

**Schedule:**
- Daily at 2:00 AM
- Logs to `logs/backup.log`

---

## Setup Instructions

### 1. Make Scripts Executable

```bash
chmod +x scripts/backup-database.sh
chmod +x scripts/restore-database.sh
chmod +x scripts/schedule-backups.sh
```

### 2. Configure Environment Variables

Add to `.env`:
```env
BACKUP_DIR=./backups
RETENTION_DAYS=7
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=rezapp
S3_BUCKET=your-backup-bucket  # Optional
```

### 3. Create Backup Directory

```bash
mkdir -p backups
```

### 4. Schedule Automated Backups

**Linux/Mac:**
```bash
./scripts/schedule-backups.sh
```

**Windows:**
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at 2:00 AM
4. Set action: Start a program
5. Program: `bash` (or Git Bash)
6. Arguments: `scripts/backup-database.sh`
7. Start in: Project root directory

---

## Manual Backup

### Create Backup
```bash
npm run backup
# Or directly:
./scripts/backup-database.sh
```

### List Backups
```bash
ls -lh backups/
```

### Restore Backup
```bash
npm run restore backups/backup_rezapp_20250101_020000.tar.gz
# Or directly:
./scripts/restore-database.sh backups/backup_rezapp_20250101_020000.tar.gz
```

---

## Backup Retention

- Default: 7 days
- Configure via `RETENTION_DAYS` environment variable
- Old backups are automatically deleted
- Cloud backups (S3) are not automatically deleted

---

## Cloud Storage (S3)

### Setup AWS CLI
```bash
aws configure
```

### Configure S3 Bucket
```env
S3_BUCKET=your-backup-bucket
```

Backups will automatically upload to S3 if configured.

---

## Backup Verification

The script automatically verifies:
- ✅ Backup file exists
- ✅ Backup file is not empty
- ✅ Backup size is reasonable

---

## Monitoring

### Check Backup Logs
```bash
tail -f logs/backup.log
```

### Verify Cron Job
```bash
crontab -l
```

### Test Backup Manually
```bash
./scripts/backup-database.sh
ls -lh backups/
```

---

## Troubleshooting

### Backup Fails
1. Check MongoDB connection: `mongosh $MONGODB_URI`
2. Verify `mongodump` is installed
3. Check disk space: `df -h`
4. Review backup logs: `tail logs/backup.log`

### Restore Fails
1. Verify backup file exists and is not corrupted
2. Check MongoDB connection
3. Ensure sufficient disk space
4. Verify `mongorestore` is installed

### Cron Job Not Running
1. Check cron service: `systemctl status cron`
2. Verify cron job: `crontab -l`
3. Check cron logs: `grep CRON /var/log/syslog`
4. Test script manually

---

## Best Practices

1. **Test backups regularly** - Verify restore works
2. **Monitor backup size** - Ensure sufficient storage
3. **Keep multiple backups** - Don't rely on single backup
4. **Store off-site** - Use S3 or similar
5. **Document restore procedures** - Team should know how to restore
6. **Test disaster recovery** - Practice restore regularly

---

## Next Steps

1. ✅ Backup scripts created
2. ⏳ Configure environment variables
3. ⏳ Schedule automated backups
4. ⏳ Test backup and restore
5. ⏳ Set up cloud storage (optional)

---

**Status:** ✅ Automated Backups Configured
**Last Updated:** $(date)

