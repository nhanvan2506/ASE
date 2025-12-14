#!/usr/bin/env python3
"""
Database backup script for pre-commit hook.
Creates a SQL dump before committing changes.
"""
import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path

# Add parent directory to path to import app modules
script_dir = Path(__file__).parent
backend_dir = script_dir.parent

# Try to find backend directory (works from both root and backend directory)
if (backend_dir / "app").exists():
    sys.path.insert(0, str(backend_dir))
else:
    # If running from root, try backend/backend
    backend_dir = Path(__file__).parent.parent.parent / "backend"
    if (backend_dir / "app").exists():
        sys.path.insert(0, str(backend_dir))

from app.core.config import settings


def create_backup_directory():
    """Create backup directory if it doesn't exist."""
    script_dir = Path(__file__).parent
    backend_dir = script_dir.parent
    
    # Find backend directory
    if not (backend_dir / "app").exists():
        backend_dir = script_dir.parent.parent / "backend"
    
    backup_dir = backend_dir / "backups"
    backup_dir.mkdir(exist_ok=True)
    return backup_dir


def backup_database():
    """Create a SQL backup of the database."""
    try:
        backup_dir = create_backup_directory()
        
        # Generate backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"backup_{timestamp}.sql"
        
        # Build pg_dump command
        # For asyncpg connection, we need to use psql/pg_dump with sync connection
        db_url = settings.DATABASE_URL.replace("postgresql+psycopg://", "postgresql://")
        
        # Extract connection details
        # Format: postgresql://user:password@host:port/dbname
        import re
        match = re.match(r"postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)", db_url)
        
        if not match:
            # Try without password
            match = re.match(r"postgresql://([^@]+)@([^:]+):(\d+)/(.+)", db_url)
            if match:
                user, host, port, dbname = match.groups()
                password = ""
            else:
                print("Error: Could not parse database URL")
                return False
        else:
            user, password, host, port, dbname = match.groups()
        
        # Set PGPASSWORD environment variable if password exists
        env = os.environ.copy()
        if password:
            env["PGPASSWORD"] = password
        
        # Build pg_dump command
        cmd = [
            "pg_dump",
            "-h", host,
            "-p", port,
            "-U", user,
            "-d", dbname,
            "-F", "c",  # Custom format (compressed)
            "-f", str(backup_file),
            "--no-owner",  # Don't dump ownership
            "--no-acl",    # Don't dump access privileges
        ]
        
        print(f"Creating database backup: {backup_file.name}")
        
        # Run pg_dump
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            file_size = backup_file.stat().st_size / 1024  # Size in KB
            print(f"Backup created successfully: {backup_file.name} ({file_size:.2f} KB)")
            
            # Keep only last 10 backups
            cleanup_old_backups(backup_dir, keep=10)
            
            return True
        else:
            print(f"Backup failed: {result.stderr}")
            return False
            
    except FileNotFoundError:
        print("pg_dump not found. Please install PostgreSQL client tools.")
        print("   On Windows: Install PostgreSQL and add to PATH")
        print("   On Linux: sudo apt-get install postgresql-client")
        print("   On macOS: brew install postgresql")
        return False
    except Exception as e:
        print(f"Error creating backup: {e}")
        return False


def cleanup_old_backups(backup_dir: Path, keep: int = 10):
    """Remove old backup files, keeping only the most recent ones."""
    try:
        backups = sorted(
            backup_dir.glob("backup_*.sql"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )
        
        if len(backups) > keep:
            for old_backup in backups[keep:]:
                old_backup.unlink()
                print(f" Removed old backup: {old_backup.name}")
    except Exception as e:
        print(f"Warning: Could not cleanup old backups: {e}")


if __name__ == "__main__":
    success = backup_database()
    sys.exit(0 if success else 1)

