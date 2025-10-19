#!/bin/bash
# Local Database Backup Script
# Usage: ./scripts/backup-database.sh

set -e

# Configuration
BACKUP_DIR="./database/backups/local"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/trakr-backup-${BACKUP_DATE}.sql"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo -e "${BLUE}🔄 Starting database backup...${NC}"

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}❌ Error: SUPABASE_DB_URL environment variable not set${NC}"
    echo "Please set it in your .env file or export it:"
    echo "export SUPABASE_DB_URL='postgresql://postgres:[password]@[host]:5432/postgres'"
    exit 1
fi

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ Error: pg_dump not found${NC}"
    echo "Please install PostgreSQL client tools:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql-client"
    echo "  Windows: Download from https://www.postgresql.org/download/windows/"
    exit 1
fi

# Create full backup
echo -e "${BLUE}📦 Creating full database backup...${NC}"
pg_dump "${SUPABASE_DB_URL}" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    > "${BACKUP_FILE}"

# Compress backup
echo -e "${BLUE}🗜️  Compressing backup...${NC}"
gzip -f "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Get file size
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo -e "${GREEN}   File: ${BACKUP_FILE}${NC}"
echo -e "${GREEN}   Size: ${BACKUP_SIZE}${NC}"

# Create schema-only backup
SCHEMA_FILE="${BACKUP_DIR}/trakr-schema-${BACKUP_DATE}.sql"
echo -e "${BLUE}📋 Creating schema-only backup...${NC}"
pg_dump "${SUPABASE_DB_URL}" \
    --schema-only \
    --no-owner \
    --no-privileges \
    > "${SCHEMA_FILE}"

echo -e "${GREEN}✅ Schema backup created: ${SCHEMA_FILE}${NC}"

# Cleanup old backups (keep last 30)
echo -e "${BLUE}🧹 Cleaning up old backups (keeping last 30)...${NC}"
cd "${BACKUP_DIR}"
ls -t trakr-backup-*.sql.gz 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true
ls -t trakr-schema-*.sql 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true

echo -e "${GREEN}✨ All done!${NC}"
echo ""
echo "To restore this backup:"
echo "  gunzip -c ${BACKUP_FILE} | psql \$SUPABASE_DB_URL"
