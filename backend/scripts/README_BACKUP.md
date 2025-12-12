# Database Backup Scripts

## Overview

This directory contains scripts for backing up the database before commits and manually.

## Scripts

###`backup_db.py` (Recommended)
Uses `pg_dump` for full database backup including schema, data, and constraints.

**Requirements:**
- PostgreSQL client tools installed (`pg_dump` command)
- Windows: Install PostgreSQL and add to PATH
- Linux: `sudo apt-get install postgresql-client`
- macOS: `brew install postgresql`

**Usage:**
```bash
python scripts/backup_db.py
```



## Pre-commit Hook

The backup script is automatically run before each commit via pre-commit hook.

**Setup:**
```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

## Backup Location

Backups are stored in `backend/backups/` directory:
- Format: `backup_YYYYMMDD_HHMMSS.sql`
- Only last 10 backups are kept (automatic cleanup)

## Manual Backup

To create a manual backup:
```bash
cd backend
python scripts/backup_db.py
```

## Restore from Backup

To restore a backup:
```bash
# Using psql
psql -h localhost -U postgres -d study_space < backups/backup_YYYYMMDD_HHMMSS.sql

# Or using pg_restore for custom format
pg_restore -h localhost -U postgres -d study_space backups/backup_YYYYMMDD_HHMMSS.sql
```

