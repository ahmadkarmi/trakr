# Database Schema Backups

This directory stores automated schema backups.

## Purpose

- Track schema changes over time
- Provide reference for database structure
- Enable quick schema comparison
- Git-tracked for version history

## Files

- `latest-schema.sql` - Most recent schema backup (auto-updated daily)
- Historical schemas are tracked via Git commits

## Usage

The `latest-schema.sql` file is automatically updated by:
- GitHub Actions workflow (daily)
- Local backup scripts

View schema changes:
```bash
git log database/backups/schemas/latest-schema.sql
```

Compare with current:
```bash
git diff database/backups/schemas/latest-schema.sql
```
